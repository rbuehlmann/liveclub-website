import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db, auth } from "../firebaseAdmin";
import { generateUniquePublicClubId } from "../lib/publicClubId";
import { upsertLicense } from "../lib/license";

const TRIAL_DAYS = 30;

interface CreateClubRequest {
  name: string;
  sport: string;
  country: string;
  language: string;
  contactName: string;
  contactEmail: string;
  primaryColor?: string;
  secondaryColor?: string;
}

function assertNonEmptyString(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpsError("invalid-argument", `Feld "${field}" darf nicht leer sein.`);
  }
}

/**
 * Creates a club, its clubAdmin membership, the public mirror doc and the
 * 30-day trial license as one flow. Done server-side (rather than several
 * client-side Firestore writes) so the publicClubId can be generated
 * uniquely and the trial license can never be forged by the client.
 */
export const createClub = onCall<CreateClubRequest>(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");
  }
  const uid = request.auth.uid;
  const { name, sport, country, language, contactName, contactEmail, primaryColor, secondaryColor } =
    request.data;

  assertNonEmptyString(name, "name");
  assertNonEmptyString(sport, "sport");
  assertNonEmptyString(country, "country");
  assertNonEmptyString(language, "language");
  assertNonEmptyString(contactName, "contactName");
  assertNonEmptyString(contactEmail, "contactEmail");

  const clubRef = db.collection("clubs").doc();
  const publicClubId = await generateUniquePublicClubId(db, country);

  const batch = db.batch();

  batch.set(clubRef, {
    clubId: clubRef.id,
    publicClubId,
    name,
    sport,
    country,
    language,
    contactName,
    contactEmail,
    primaryColor: primaryColor || null,
    secondaryColor: secondaryColor || null,
    createdBy: uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  batch.set(clubRef.collection("members").doc(uid), {
    role: "clubAdmin",
    email: request.auth.token.email ?? null,
    displayName: request.auth.token.name ?? null,
    createdAt: FieldValue.serverTimestamp(),
  });

  batch.set(
    db.collection("users").doc(uid),
    {
      clubIds: FieldValue.arrayUnion(clubRef.id),
      clubRoles: { [clubRef.id]: "clubAdmin" },
    },
    { merge: true }
  );

  batch.set(db.collection("publicClubs").doc(publicClubId), {
    publicClubId,
    clubId: clubRef.id,
    name,
    sport,
    country,
    logoUrl: null,
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  // Storage Security Rules read clubId/role off the ID token directly
  // (see syncClubClaims.ts for why) — the client forces a token refresh
  // right after this call returns so the new claims take effect immediately.
  await auth.setCustomUserClaims(uid, { clubId: clubRef.id, role: "clubAdmin" });

  const now = Timestamp.now();
  const validUntil = Timestamp.fromMillis(now.toMillis() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  await upsertLicense(db, {
    clubId: clubRef.id,
    type: "trial",
    status: "active",
    tier: "team5",
    validFrom: now,
    validUntil,
    createdBy: uid,
    source: "registration",
    notes: "Automatische 30-tägige Testphase bei Vereinsregistrierung.",
  });

  return { clubId: clubRef.id, publicClubId };
});
