import { Firestore, Timestamp, FieldValue } from "firebase-admin/firestore";

// Keep in sync with src/lib/types.ts.
export type LicenseType = "trial" | "paid";
export type LicenseStatus = "active" | "expired" | "cancelled" | "suspended";

export interface UpsertLicenseInput {
  clubId: string;
  type: LicenseType;
  status: LicenseStatus;
  validFrom: Timestamp;
  validUntil: Timestamp;
  createdBy: string;
  source: string;
  notes?: string;
}

/**
 * Single write path for granting/changing a club's license, used today by
 * the trial-on-registration flow and the manual platform-admin action, and
 * intended to be reused unchanged by a future Stripe webhook handler.
 *
 * Writes the license as its own immutable-ish record under
 * clubs/{clubId}/licenses/{licenseId} *and* denormalizes the current status
 * onto the club doc, since Firestore security rules (e.g. "can this club
 * start a new game?") cannot afford to query/aggregate the licenses
 * subcollection on every check.
 */
export async function upsertLicense(db: Firestore, input: UpsertLicenseInput) {
  const licenseRef = db
    .collection("clubs")
    .doc(input.clubId)
    .collection("licenses")
    .doc();

  const clubRef = db.collection("clubs").doc(input.clubId);

  await db.runTransaction(async (tx) => {
    tx.set(licenseRef, {
      licenseId: licenseRef.id,
      clubId: input.clubId,
      type: input.type,
      status: input.status,
      validFrom: input.validFrom,
      validUntil: input.validUntil,
      createdBy: input.createdBy,
      source: input.source,
      notes: input.notes ?? "",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    tx.update(clubRef, {
      currentLicenseId: licenseRef.id,
      currentLicenseType: input.type,
      currentLicenseStatus: input.status,
      currentLicenseValidUntil: input.validUntil,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return licenseRef.id;
}
