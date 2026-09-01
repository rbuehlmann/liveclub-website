import { onRequest } from "firebase-functions/v2/https";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
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

  await archivePendingDowngradeTeams(clubId);
}

/**
 * Downgrade team-selection (2026-09-01): createCheckoutSession.ts parks the
 * admin's "which teams to keep" choice on the club doc before payment,
 * since a downgrade only actually takes effect once payment succeeds here
 * — never at checkout-creation time, same as every other license change in
 * this file. Archives (active:false + archived:true) every team not on the
 * keep-list; onTeamWrite.ts already removes an inactive team's public
 * mirrors, so this alone is what makes them "nicht mehr auffindbar". A
 * no-op whenever nothing was parked (the common case — no downgrade, or
 * the club was already at/under the new cap).
 */
async function archivePendingDowngradeTeams(clubId: string) {
  const clubRef = db.collection("clubs").doc(clubId);
  const clubSnap = await clubRef.get();
  const keepTeamIds = clubSnap.data()?.pendingDowngradeKeepTeamIds as string[] | null | undefined;
  if (!Array.isArray(keepTeamIds) || keepTeamIds.length === 0) return;

  const keepSet = new Set(keepTeamIds);
  const teamsSnap = await clubRef.collection("teams").get();
  const batch = db.batch();
  let archivedAny = false;
  for (const teamDoc of teamsSnap.docs) {
    const data = teamDoc.data();
    if (data.archived === true || keepSet.has(teamDoc.id)) continue;
    batch.update(teamDoc.ref, { active: false, archived: true });
    archivedAny = true;
  }
  if (archivedAny) await batch.commit();

  await clubRef.update({ pendingDowngradeKeepTeamIds: FieldValue.delete() });
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
