import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../firebaseAdmin";
import { getStripeClient } from "../lib/stripeClient";
import { stripeSecretKey } from "../lib/secrets";

const SITE_ORIGIN = "https://liveclub.app";

interface CreateBillingPortalSessionRequest {
  clubId: string;
}

/**
 * clubAdmin-only: opens Stripe's hosted Billing Portal for the club's
 * existing Stripe Customer — cancelling, updating the payment method, etc.
 * all happen there, no custom UI needed for it.
 */
export const createBillingPortalSession = onCall<CreateBillingPortalSessionRequest>(
  { secrets: [stripeSecretKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");
    }
    const { clubId } = request.data;
    if (typeof clubId !== "string" || !clubId) {
      throw new HttpsError("invalid-argument", "clubId fehlt.");
    }

    const clubRef = db.collection("clubs").doc(clubId);
    const memberSnap = await clubRef.collection("members").doc(request.auth.uid).get();
    if (memberSnap.data()?.role !== "clubAdmin") {
      throw new HttpsError("permission-denied", "Nur Vereinsadmins dürfen das Abo verwalten.");
    }

    const clubSnap = await clubRef.get();
    const customerId = clubSnap.data()?.stripeCustomerId as string | undefined;
    if (!customerId) {
      throw new HttpsError("failed-precondition", "Noch kein Stripe-Kundenkonto vorhanden.");
    }

    const stripe = getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${SITE_ORIGIN}/dashboard`,
    });

    return { url: session.url };
  }
);
