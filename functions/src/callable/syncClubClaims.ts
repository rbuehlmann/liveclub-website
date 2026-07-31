import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, auth } from "../firebaseAdmin";

/**
 * Storage Security Rules can't reliably cross-reference Firestore data for
 * every request (a real production case surfaced `storage/unauthorized` for
 * a genuine clubAdmin whose Firestore membership doc was perfectly correct),
 * so club/role info is mirrored onto the user's own ID token as custom
 * claims instead — Storage rules can then read `request.auth.token.*`
 * directly, no cross-service lookup needed.
 *
 * Called once per sign-in from the client (see AuthProvider) so it also
 * self-heals any account created before this existed, with no manual
 * backfill script needed.
 */
export const syncClubClaims = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");
  }
  const uid = request.auth.uid;
  const userSnap = await db.collection("users").doc(uid).get();
  const data = userSnap.data();
  const clubIds: string[] = data?.clubIds ?? [];
  const clubRoles: Record<string, string> = data?.clubRoles ?? {};
  const primaryClubId = clubIds[0] ?? null;
  const role = primaryClubId ? clubRoles[primaryClubId] ?? null : null;

  await auth.setCustomUserClaims(uid, primaryClubId && role ? { clubId: primaryClubId, role } : {});

  return { clubId: primaryClubId, role };
});
