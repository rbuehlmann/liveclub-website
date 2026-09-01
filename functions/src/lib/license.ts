import { Firestore, Timestamp, FieldValue } from "firebase-admin/firestore";

// Keep in sync with src/lib/types.ts.
export type LicenseType = "trial" | "paid";
export type LicenseStatus = "active" | "expired" | "cancelled" | "suspended";

// Team-count tiers. "team5" is also the implicit default for every trial —
// same limit as the cheapest paid tier, so buying it doesn't change
// anything numerically, just extends access past the trial.
export type LicenseTier = "team5" | "team15" | "unlimited";

// "unlimited" keeps its id (Stripe Price IDs/data are keyed on it, and the
// user manages the Stripe-side display name separately) but is no longer
// actually unlimited — capped at 99 teams (2026-09-01 pricing change).
export const TIER_MAX_TEAMS: Record<LicenseTier, number | null> = {
  team5: 5,
  team15: 15,
  unlimited: 99,
};

export interface UpsertLicenseInput {
  clubId: string;
  type: LicenseType;
  status: LicenseStatus;
  tier: LicenseTier;
  validFrom: Timestamp;
  validUntil: Timestamp;
  createdBy: string;
  source: string;
  notes?: string;
}

/**
 * Single write path for granting/changing a club's license, used today by
 * the trial-on-registration flow, the manual platform-admin action, and the
 * Stripe webhook.
 *
 * Writes the license as its own immutable-ish record under
 * clubs/{clubId}/licenses/{licenseId} *and* denormalizes the current status
 * onto the club doc, since Firestore security rules (e.g. "can this club
 * start a new game?") cannot afford to query/aggregate the licenses
 * subcollection on every check. maxTeams is derived from tier via
 * TIER_MAX_TEAMS rather than passed separately, so the two can never drift.
 */
export async function upsertLicense(db: Firestore, input: UpsertLicenseInput) {
  const licenseRef = db
    .collection("clubs")
    .doc(input.clubId)
    .collection("licenses")
    .doc();

  const clubRef = db.collection("clubs").doc(input.clubId);
  const maxTeams = TIER_MAX_TEAMS[input.tier];

  await db.runTransaction(async (tx) => {
    tx.set(licenseRef, {
      licenseId: licenseRef.id,
      clubId: input.clubId,
      type: input.type,
      status: input.status,
      tier: input.tier,
      maxTeams,
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
      currentLicenseTier: input.tier,
      currentMaxTeams: maxTeams,
      currentLicenseValidUntil: input.validUntil,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return licenseRef.id;
}
