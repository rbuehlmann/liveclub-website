import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../firebaseAdmin";
import { getStripeClient } from "../lib/stripeClient";
import { stripeSecretKey, stripePriceIdMonthly, stripePriceIdYearly } from "../lib/secrets";

const SITE_ORIGIN = "https://liveclub.app";

interface CreateCheckoutSessionRequest {
  clubId: string;
  interval: "monthly" | "yearly";
}

/**
 * clubAdmin-only: starts a Stripe Checkout subscription for the club's own
 * upgrade. Reuses (or creates once) a Stripe Customer per club, stored as
 * clubs/{clubId}.stripeCustomerId. The actual license change happens later,
 * via onStripeWebhook once payment succeeds — never here.
 */
export const createCheckoutSession = onCall<CreateCheckoutSessionRequest>(
  { secrets: [stripeSecretKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");
    }
    const { clubId, interval } = request.data;
    if (typeof clubId !== "string" || !clubId) {
      throw new HttpsError("invalid-argument", "clubId fehlt.");
    }
    if (interval !== "monthly" && interval !== "yearly") {
      throw new HttpsError("invalid-argument", "Ungültiges Intervall.");
    }

    const clubRef = db.collection("clubs").doc(clubId);
    const clubSnap = await clubRef.get();
    if (!clubSnap.exists) {
      throw new HttpsError("not-found", "Verein nicht gefunden.");
    }

    const memberSnap = await clubRef.collection("members").doc(request.auth.uid).get();
    if (memberSnap.data()?.role !== "clubAdmin") {
      throw new HttpsError("permission-denied", "Nur Vereinsadmins dürfen ein Abo abschliessen.");
    }

    const club = clubSnap.data()!;
    const stripe = getStripeClient();

    let customerId = club.stripeCustomerId as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: club.contactEmail,
        name: club.name,
        metadata: { clubId },
      });
      customerId = customer.id;
      await clubRef.update({ stripeCustomerId: customerId });
    }

    const priceId =
      interval === "monthly" ? stripePriceIdMonthly.value() : stripePriceIdYearly.value();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: clubId,
      // Copied onto the created Subscription object itself, so later
      // customer.subscription.updated/deleted webhook events (which carry
      // the Subscription, not the Checkout Session) can still be traced
      // back to a club without an extra Firestore lookup by customer id.
      subscription_data: {
        metadata: { clubId },
      },
      success_url: `${SITE_ORIGIN}/dashboard?checkout=success`,
      cancel_url: `${SITE_ORIGIN}/dashboard?checkout=cancelled`,
    });

    if (!session.url) {
      throw new HttpsError("internal", "Checkout-Session konnte nicht erstellt werden.");
    }

    return { url: session.url };
  }
);
