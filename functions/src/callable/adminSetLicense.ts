import { onCall, HttpsError } from "firebase-functions/v2/https";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin";
import { upsertLicense } from "../lib/license";

function formatDateDe(date: Date): string {
  return date.toLocaleDateString("de-CH", { year: "numeric", month: "2-digit", day: "2-digit" });
}

type AdminLicenseAction = "trial" | "activeMonthly" | "activeYearly" | "suspend";
const ACTIONS: AdminLicenseAction[] = ["trial", "activeMonthly", "activeYearly", "suspend"];

const TRIAL_DAYS = 30;
const RENEWAL_WINDOW_DAYS = 14;

interface AdminSetLicenseRequest {
  clubId: string;
  action: AdminLicenseAction;
  notes?: string;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Platform-admin-only: grants/changes a club's license through a small,
 * fixed set of actions rather than a freeform type/status/date form — every
 * duration and the 14-day-before-expiry renewal rule (same rule the club's
 * own Stripe purchase flow enforces) is computed here, server-side, so it
 * can't be bypassed or fat-fingered from the client. Routes through the
 * same upsertLicense() helper the trial-on-registration flow and the
 * Stripe webhook use.
 */
export const adminSetLicense = onCall<AdminSetLicenseRequest>(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");
  }
  if (request.auth.token.platformAdmin !== true) {
    throw new HttpsError("permission-denied", "Nur für Plattform-Administratoren.");
  }

  const { clubId, action, notes } = request.data;
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

  if (action === "trial") {
    const validUntil = Timestamp.fromMillis(now.toMillis() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const licenseId = await upsertLicense(db, {
      clubId,
      type: "trial",
      status: "active",
      validFrom: now,
      validUntil,
      createdBy: request.auth.uid,
      source: "platformAdmin",
      notes: notes ?? "",
    });
    return { licenseId };
  }

  if (action === "suspend") {
    const licenseId = await upsertLicense(db, {
      clubId,
      type: (clubData.currentLicenseType as "trial" | "paid") ?? "trial",
      status: "suspended",
      validFrom: now,
      validUntil: clubData.currentLicenseValidUntil ?? now,
      createdBy: request.auth.uid,
      source: "platformAdmin",
      notes: notes ?? "",
    });
    return { licenseId };
  }

  // activeMonthly / activeYearly — same 14-day renewal window as the
  // club's own Stripe purchase, so an admin gift can't stack arbitrarily
  // early on top of an already-active period either.
  const currentValidUntil = clubData.currentLicenseValidUntil as Timestamp | undefined;
  const currentlyActive = clubData.currentLicenseStatus === "active";
  if (currentlyActive && currentValidUntil) {
    const daysLeft = (currentValidUntil.toMillis() - now.toMillis()) / (24 * 60 * 60 * 1000);
    if (daysLeft > RENEWAL_WINDOW_DAYS) {
      throw new HttpsError(
        "failed-precondition",
        `Verlängerung erst ab ${formatDateDe(
          new Date(currentValidUntil.toMillis() - RENEWAL_WINDOW_DAYS * 24 * 60 * 60 * 1000)
        )} möglich (${RENEWAL_WINDOW_DAYS} Tage vor Ablauf).`
      );
    }
  }

  // A still-active period's remaining time is preserved, not discarded —
  // renewing early extends from the current end date, not from today.
  const from =
    currentlyActive && currentValidUntil && currentValidUntil.toMillis() > now.toMillis()
      ? currentValidUntil.toDate()
      : now.toDate();
  const validUntil = Timestamp.fromDate(addMonths(from, action === "activeMonthly" ? 1 : 12));

  const licenseId = await upsertLicense(db, {
    clubId,
    type: "paid",
    status: "active",
    validFrom: now,
    validUntil,
    createdBy: request.auth.uid,
    source: "platformAdmin",
    notes: notes ?? "",
  });
  return { licenseId };
});
