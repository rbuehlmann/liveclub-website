import { onRequest } from "firebase-functions/v2/https";
import { Timestamp } from "firebase-admin/firestore";
import type Stripe from "stripe";
import { db } from "../firebaseAdmin";
import { getStripeClient } from "../lib/stripeClient";
import { stripeSecretKey, stripeWebhookSecret } from "../lib/secrets";
import { upsertLicense, LicenseTier } from "../lib/license";

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

async function applyOneTimePurchase(clubId: string, tier: LicenseTier, interval: "monthly" | "yearly") {
  const clubRef = db.collection("clubs").doc(clubId);
  const clubSnap = await clubRef.get();
  const club = clubSnap.data();
  const now = Timestamp.now();

  // A still-active period's remaining time is preserved — buying early
  // (within the 14-day window createCheckoutSession enforces) extends from
  // the current end date, not from today.
  const currentValidUntil = club?.currentLicenseValidUntil as Timestamp | undefined;
  const from =
    club?.currentLicenseStatus === "active" && currentValidUntil && currentValidUntil.toMillis() > now.toMillis()
      ? currentValidUntil.toDate()
      : now.toDate();
  const validUntil = Timestamp.fromDate(addMonths(from, interval === "monthly" ? 1 : 12));

  await upsertLicense(db, {
    clubId,
    type: "paid",
    status: "active",
    tier,
    validFrom: now,
    validUntil,
    createdBy: "stripe-webhook",
    source: "stripe",
  });
}

/**
 * Stripe posts here directly (not through the Callable protocol), signed
 * with STRIPE_WEBHOOK_SECRET. One-time payments only (see
 * createCheckoutSession) — no subscription lifecycle events to handle.
 */
export const onStripeWebhook = onRequest(
  { secrets: [stripeSecretKey, stripeWebhookSecret] },
  async (request, response) => {
    const stripe = getStripeClient();
    const signature = request.headers["stripe-signature"];

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        request.rawBody,
        signature as string,
        stripeWebhookSecret.value()
      );
    } catch (err) {
      response.status(400).send(`Webhook signature verification failed: ${(err as Error).message}`);
      return;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const clubId = session.client_reference_id;
      const tier = session.metadata?.tier;
      const interval = session.metadata?.interval;
      const validTier = tier === "team5" || tier === "team15" || tier === "unlimited";
      if (
        session.payment_status === "paid" &&
        clubId &&
        validTier &&
        (interval === "monthly" || interval === "yearly")
      ) {
        await applyOneTimePurchase(clubId, tier as LicenseTier, interval);
      }
    }

    response.status(200).send({ received: true });
  }
);
