import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../firebaseAdmin";
import { getStripeClient } from "../lib/stripeClient";
import {
  stripeSecretKey,
  stripePriceIdTeam5Monthly,
  stripePriceIdTeam5Yearly,
  stripePriceIdTeam15Monthly,
  stripePriceIdTeam15Yearly,
  stripePriceIdUnlimitedMonthly,
  stripePriceIdUnlimitedYearly,
} from "../lib/secrets";
import { LicenseTier, TIER_MAX_TEAMS } from "../lib/license";

const SITE_ORIGIN = "https://liveclub.app";
const RENEWAL_WINDOW_DAYS = 14;

function formatDateDe(date: Date): string {
  return date.toLocaleDateString("de-CH", { year: "numeric", month: "2-digit", day: "2-digit" });
}

interface CreateCheckoutSessionRequest {
  clubId: string;
  tier: LicenseTier;
  interval: "monthly" | "yearly";
  // Required only for a downgrade (the chosen tier's cap is below the
  // club's current active team count) — the teams the admin picked to keep
  // in dashboard/page.tsx's team-picker (2026-09-01). Validated below and
  // parked on the club doc for onStripeWebhook.ts to act on once payment
  // actually succeeds — not sent through Stripe metadata, which has a
  // 500-char-per-value limit a club with many teams could exceed.
  keepTeamIds?: string[];
}

/**
 * clubAdmin-only: starts a Stripe Checkout for the club's own purchase.
 * One-time payment, not a subscription — clubs periodically change
 * treasurer/board, so an auto-renewing subscription silently charging a
 * card nobody's watching anymore is exactly what this avoids. A club buys
 * a fixed block of time (1 or 12 months) at a chosen team-count tier and
 * repurchases manually once it runs out. The actual license change happens
 * later, via onStripeWebhook once payment succeeds — never here. Reuses (or
 * creates once) a Stripe Customer per club, stored as
 * clubs/{clubId}.stripeCustomerId, purely for Stripe's own receipt/customer
 * records — there's no subscription or billing portal tied to it.
 */
export const createCheckoutSession = onCall<CreateCheckoutSessionRequest>(
  { secrets: [stripeSecretKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");
    }
    const { clubId, tier, interval, keepTeamIds } = request.data;
    if (typeof clubId !== "string" || !clubId) {
      throw new HttpsError("invalid-argument", "clubId fehlt.");
    }
    if (tier !== "team5" && tier !== "team15" && tier !== "unlimited") {
      throw new HttpsError("invalid-argument", "Ungültige Stufe.");
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

    // Downgrade check: if the chosen tier's cap is below the club's current
    // active (non-archived) team count, the admin must have already picked
    // exactly `maxTeams` teams to keep — enforced here server-side, not
    // just as a UI gate, since a downgrade is a real, mostly-irreversible
    // action (the rest get archived once payment succeeds).
    const newMaxTeams = TIER_MAX_TEAMS[tier];
    if (typeof newMaxTeams === "number") {
      const teamsSnap = await clubRef.collection("teams").get();
      const activeTeamIds = teamsSnap.docs.filter((d) => d.data().archived !== true).map((d) => d.id);
      if (activeTeamIds.length > newMaxTeams) {
        if (!Array.isArray(keepTeamIds) || keepTeamIds.length !== newMaxTeams) {
          throw new HttpsError(
            "invalid-argument",
            `Diese Stufe erlaubt ${newMaxTeams} Teams — bitte genau ${newMaxTeams} Team(s) zum Behalten auswählen.`
          );
        }
        const activeTeamIdSet = new Set(activeTeamIds);
        if (!keepTeamIds.every((id) => activeTeamIdSet.has(id))) {
          throw new HttpsError("invalid-argument", "Ungültige Team-Auswahl.");
        }
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
    const PRICE_IDS: Record<LicenseTier, { monthly: string; yearly: string }> = {
      team5: { monthly: stripePriceIdTeam5Monthly.value(), yearly: stripePriceIdTeam5Yearly.value() },
      team15: { monthly: stripePriceIdTeam15Monthly.value(), yearly: stripePriceIdTeam15Yearly.value() },
      unlimited: {
        monthly: stripePriceIdUnlimitedMonthly.value(),
        yearly: stripePriceIdUnlimitedYearly.value(),
      },
    };
    const priceId = PRICE_IDS[tier][interval];

    // Parked on the club doc (not Stripe metadata, see the interface
    // comment above) so onStripeWebhook.ts can archive the excess teams
    // the moment this purchase actually succeeds. Always written (even as
    // null) so a stale selection from an earlier abandoned downgrade
    // attempt can never leak into a later, unrelated purchase.
    await clubRef.update({ pendingDowngradeKeepTeamIds: keepTeamIds ?? null });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: clubId,
      metadata: { clubId, tier, interval },
      success_url: `${SITE_ORIGIN}/dashboard?checkout=success`,
      cancel_url: `${SITE_ORIGIN}/dashboard?checkout=cancelled`,
      // Shows a "Rabattcode" field on the hosted Checkout page — manual
      // entry only for now (no auto-applied referral code yet, see the
      // project-liveclub-club-recommendations memory note for that).
      allow_promotion_codes: true,
    });

    if (!session.url) {
      throw new HttpsError("internal", "Checkout-Session konnte nicht erstellt werden.");
    }

    return { url: session.url };
  }
);
