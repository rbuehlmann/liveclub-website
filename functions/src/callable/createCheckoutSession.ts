import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../firebaseAdmin";
import { getStripeClient } from "../lib/stripeClient";
import { stripeSecretKey, stripePriceIdMonthly, stripePriceIdYearly } from "../lib/secrets";

const SITE_ORIGIN = "https://liveclub.app";
const RENEWAL_WINDOW_DAYS = 14;

function formatDateDe(date: Date): string {
  return date.toLocaleDateString("de-CH", { year: "numeric", month: "2-digit", day: "2-digit" });
}

interface CreateCheckoutSessionRequest {
  clubId: string;
  interval: "monthly" | "yearly";
}

/**
 * clubAdmin-only: starts a Stripe Checkout for the club's own purchase.
 * One-time payment, not a subscription — clubs periodically change
 * treasurer/board, so an auto-renewing subscription silently charging a
 * card nobody's watching anymore is exactly what this avoids. A club buys
 * a fixed block of time (1 or 12 months) and repurchases manually once it
 * runs out. The actual license change happens later, via onStripeWebhook
 * once payment succeeds — never here. Reuses (or creates once) a Stripe
 * Customer per club, stored as clubs/{clubId}.stripeCustomerId, purely for
 * Stripe's own receipt/customer records — there's no subscription or
 * billing portal tied to it.
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
      throw new HttpsError("permission-denied", "Nur Vereinsadmins dürfen kaufen.");
    }

    const club = clubSnap.data()!;

    // Same 14-day-before-expiry rule as the admin's manual grant — can't
    // buy a new period while the current one still has more than that
    // much time left.
    if (club.currentLicenseStatus === "active" && club.currentLicenseValidUntil) {
      const validUntilMs = (club.currentLicenseValidUntil as { toMillis: () => number }).toMillis();
      const daysLeft = (validUntilMs - Date.now()) / (24 * 60 * 60 * 1000);
      if (daysLeft > RENEWAL_WINDOW_DAYS) {
        throw new HttpsError(
          "failed-precondition",
          `Verlängerung erst ab ${formatDateDe(
            new Date(validUntilMs - RENEWAL_WINDOW_DAYS * 24 * 60 * 60 * 1000)
          )} möglich (${RENEWAL_WINDOW_DAYS} Tage vor Ablauf).`
        );
      }
    }

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

    // These must be one-time (non-recurring) Stripe Price objects — a
    // recurring Price can't be used in Checkout's "payment" mode.
    const priceId =
      interval === "monthly" ? stripePriceIdMonthly.value() : stripePriceIdYearly.value();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: clubId,
      metadata: { clubId, interval },
      success_url: `${SITE_ORIGIN}/dashboard?checkout=success`,
      cancel_url: `${SITE_ORIGIN}/dashboard?checkout=cancelled`,
    });

    if (!session.url) {
      throw new HttpsError("internal", "Checkout-Session konnte nicht erstellt werden.");
    }

    return { url: session.url };
  }
);
