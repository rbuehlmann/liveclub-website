import { onRequest } from "firebase-functions/v2/https";
import { Timestamp } from "firebase-admin/firestore";
import type Stripe from "stripe";
import { db } from "../firebaseAdmin";
import { getStripeClient } from "../lib/stripeClient";
import { stripeSecretKey, stripeWebhookSecret } from "../lib/secrets";
import { upsertLicense, LicenseStatus } from "../lib/license";

function mapStatus(stripeStatus: Stripe.Subscription.Status): LicenseStatus {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "cancelled";
    default:
      // past_due, incomplete, paused — not confirmed cancelled, but not
      // paid up either; isClubLicenseActive() should say no either way.
      return "expired";
  }
}

async function applySubscriptionLicense(clubId: string, subscription: Stripe.Subscription) {
  // Newer Stripe API versions moved current_period_end from the
  // subscription itself down to each subscription item.
  const periodEndSeconds = subscription.items.data[0]?.current_period_end;
  const validUntil = periodEndSeconds
    ? Timestamp.fromMillis(periodEndSeconds * 1000)
    : Timestamp.now();

  await upsertLicense(db, {
    clubId,
    type: "paid",
    status: mapStatus(subscription.status),
    validFrom: Timestamp.now(),
    validUntil,
    createdBy: "stripe-webhook",
    source: "stripe",
  });
}

/**
 * Stripe posts here directly (not through the Callable protocol), signed
 * with STRIPE_WEBHOOK_SECRET. Every license change funnels through the same
 * upsertLicense() helper the trial and manual-admin flows already use.
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

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const clubId = session.client_reference_id;
        if (clubId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          await applySubscriptionLicense(clubId, subscription);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const clubId = subscription.metadata?.clubId;
        if (clubId) {
          await applySubscriptionLicense(clubId, subscription);
        }
        break;
      }
      default:
        break;
    }

    response.status(200).send({ received: true });
  }
);
