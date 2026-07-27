import { onCall, HttpsError } from "firebase-functions/v2/https";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin";
import { upsertLicense, LicenseType, LicenseStatus } from "../lib/license";

const LICENSE_TYPES: LicenseType[] = [
  "trial",
  "paid",
  "manual",
  "voucher",
  "sponsor",
  "partner",
];
const LICENSE_STATUSES: LicenseStatus[] = [
  "active",
  "expired",
  "cancelled",
  "suspended",
  "scheduled",
];

interface AdminSetLicenseRequest {
  clubId: string;
  type: LicenseType;
  status: LicenseStatus;
  validFrom: string; // ISO date
  validUntil: string; // ISO date
  notes?: string;
}

/**
 * Platform-admin-only: create/replace a club's license by hand (pilot club,
 * goodwill extension, manual reactivation after trial expiry, ...). Routes
 * through the same upsertLicense() helper a future Stripe webhook will use,
 * so "how a license gets applied" stays in exactly one place.
 */
export const adminSetLicense = onCall<AdminSetLicenseRequest>(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");
  }
  if (request.auth.token.platformAdmin !== true) {
    throw new HttpsError("permission-denied", "Nur für Plattform-Administratoren.");
  }

  const { clubId, type, status, validFrom, validUntil, notes } = request.data;

  if (typeof clubId !== "string" || !clubId) {
    throw new HttpsError("invalid-argument", "clubId fehlt.");
  }
  if (!LICENSE_TYPES.includes(type)) {
    throw new HttpsError("invalid-argument", "Ungültiger Lizenztyp.");
  }
  if (!LICENSE_STATUSES.includes(status)) {
    throw new HttpsError("invalid-argument", "Ungültiger Lizenzstatus.");
  }

  const validFromDate = new Date(validFrom);
  const validUntilDate = new Date(validUntil);
  if (Number.isNaN(validFromDate.getTime()) || Number.isNaN(validUntilDate.getTime())) {
    throw new HttpsError("invalid-argument", "Ungültiges Datum.");
  }

  const clubSnap = await db.collection("clubs").doc(clubId).get();
  if (!clubSnap.exists) {
    throw new HttpsError("not-found", "Verein wurde nicht gefunden.");
  }

  const licenseId = await upsertLicense(db, {
    clubId,
    type,
    status,
    validFrom: Timestamp.fromDate(validFromDate),
    validUntil: Timestamp.fromDate(validUntilDate),
    createdBy: request.auth.uid,
    source: "platformAdmin",
    notes: notes ?? "",
  });

  return { licenseId };
});
