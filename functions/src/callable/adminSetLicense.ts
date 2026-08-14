import { onCall, HttpsError } from "firebase-functions/v2/https";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin";
import { upsertLicense, LicenseType, LicenseTier } from "../lib/license";
import { sendMail, LIVECLUB_TEAM_EMAIL } from "../lib/mailer";
import { smtpPassword } from "../lib/secrets";
import { getTemplate, renderTemplate } from "../lib/emailTemplates";

type AdminLicenseAction = "setValidUntil" | "suspend";
const ACTIONS: AdminLicenseAction[] = ["setValidUntil", "suspend"];

interface AdminSetLicenseRequest {
  clubId: string;
  action: AdminLicenseAction;
  validUntil?: string; // "YYYY-MM-DD", required for setValidUntil
  tier?: LicenseTier; // defaults to the club's current tier (or "team5") if omitted
  notes?: string; // internal note; also used as the {{reason}} in the deactivation email
}

function resolveTier(requested: LicenseTier | undefined, currentTier: unknown): LicenseTier {
  if (requested === "team5" || requested === "team15" || requested === "unlimited") {
    return requested;
  }
  if (currentTier === "team5" || currentTier === "team15" || currentTier === "unlimited") {
    return currentTier;
  }
  return "team5";
}

/**
 * Platform-admin-only: two actions on a club's license.
 *
 * "setValidUntil" is a free-form admin override of the expiry date — no
 * +1/+12-month presets, no 14-day renewal window (that rule exists to
 * protect the club's own Stripe purchase flow, not to constrain us testing
 * or comping access). Forces status to "active"; tier defaults to the
 * club's current tier if not explicitly changed.
 *
 * "suspend" is unchanged in effect (denormalized status flips to
 * "suspended", same as before) but also emails the club's contact
 * address — and an internal copy — using the emailTemplates/clubDeactivated
 * template, with `notes` rendered as {{reason}}.
 */
export const adminSetLicense = onCall<AdminSetLicenseRequest>(
  { secrets: [smtpPassword] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");
    }
    if (request.auth.token.platformAdmin !== true) {
      throw new HttpsError("permission-denied", "Nur für Plattform-Administratoren.");
    }

    const { clubId, action, validUntil, tier, notes } = request.data;
    if (typeof clubId !== "string" || !clubId) {
      throw new HttpsError("invalid-argument", "clubId fehlt.");
    }
    if (!ACTIONS.includes(action)) {
      throw new HttpsError("invalid-argument", "Ungültige Aktion.");
    }

    const clubSnap = await db.collection("clubs").doc(clubId).get();
    if (!clubSnap.exists) {
      throw new HttpsError("not-found", "Verein wurde nicht gefunden.");
    }
    const clubData = clubSnap.data()!;
    const now = Timestamp.now();
    const resolvedTier = resolveTier(tier, clubData.currentLicenseTier);

    if (action === "setValidUntil") {
      if (typeof validUntil !== "string" || !validUntil) {
        throw new HttpsError("invalid-argument", "validUntil fehlt.");
      }
      // Anchored at noon UTC, not end-of-day: an implicit-timezone parse
      // ("T23:59:59" with no offset) is ambiguous across environments (this
      // function always runs in UTC on Cloud Functions, but display uses the
      // viewer's local zone), and 23:59 UTC displays as the *next* calendar
      // day for every CET/CEST viewer this app has. Noon UTC stays within
      // the chosen date for any realistic timezone.
      const parsed = new Date(`${validUntil}T12:00:00Z`);
      if (Number.isNaN(parsed.getTime())) {
        throw new HttpsError("invalid-argument", "Ungültiges Datum.");
      }
      const licenseId = await upsertLicense(db, {
        clubId,
        type: (clubData.currentLicenseType as LicenseType) ?? "trial",
        status: "active",
        tier: resolvedTier,
        validFrom: now,
        validUntil: Timestamp.fromDate(parsed),
        createdBy: request.auth.uid,
        source: "platformAdmin",
        notes: notes ?? "",
      });
      return { licenseId };
    }

    // suspend
    const reason = notes?.trim() || "Nicht angegeben.";
    const licenseId = await upsertLicense(db, {
      clubId,
      type: (clubData.currentLicenseType as LicenseType) ?? "trial",
      status: "suspended",
      tier: resolvedTier,
      validFrom: now,
      validUntil: clubData.currentLicenseValidUntil ?? now,
      createdBy: request.auth.uid,
      source: "platformAdmin",
      notes: notes ?? "",
    });

    const contactEmail = clubData.contactEmail as string | undefined;
    if (contactEmail) {
      const vars = { clubName: clubData.name ?? "", reason };
      const template = await getTemplate(db, "clubDeactivated");
      const subject = renderTemplate(template.subject, vars);
      const html = renderTemplate(template.html, vars);
      await sendMail({ to: contactEmail, subject, html }).catch(() => undefined);
      await sendMail({ to: LIVECLUB_TEAM_EMAIL, subject: `[Kopie] ${subject}`, html }).catch(() => undefined);
    }

    return { licenseId };
  }
);
