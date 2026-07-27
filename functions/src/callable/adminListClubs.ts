import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../firebaseAdmin";

/**
 * Platform-admin-only club listing. Goes through the Admin SDK (not client
 * Firestore reads) because opening broad "read any club" Firestore rules
 * just for this one screen would widen the attack surface for no benefit.
 */
export const adminListClubs = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");
  }
  if (request.auth.token.platformAdmin !== true) {
    throw new HttpsError("permission-denied", "Nur für Plattform-Administratoren.");
  }

  const snap = await db.collection("clubs").orderBy("createdAt", "desc").get();

  return {
    clubs: snap.docs.map((doc) => {
      const data = doc.data();
      return {
        clubId: doc.id,
        publicClubId: data.publicClubId,
        name: data.name,
        sport: data.sport,
        country: data.country,
        contactEmail: data.contactEmail,
        currentLicenseType: data.currentLicenseType ?? null,
        currentLicenseStatus: data.currentLicenseStatus ?? null,
        currentLicenseValidUntil: data.currentLicenseValidUntil?.toDate?.().toISOString() ?? null,
        createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
      };
    }),
  };
});
