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
  const [userSnap, userRecord] = await Promise.all([
    db.collection("users").doc(uid).get(),
    auth.getUser(uid),
  ]);
  const data = userSnap.data();
  const clubIds: string[] = data?.clubIds ?? [];
  const clubRoles: Record<string, string> = data?.clubRoles ?? {};
  const primaryClubId = clubIds[0] ?? null;
  const role = primaryClubId ? clubRoles[primaryClubId] ?? null : null;

  // setCustomUserClaims always REPLACES the whole claims object, never
  // merges — this function only ever owns clubId/role, so every *other*
  // claim (platformAdmin being the one that matters in practice) must be
  // read fresh from the Admin SDK and carried forward, or it gets silently
  // wiped the next time this runs (every sign-in, see AuthProvider) — 2026-
  // 09-11 bug report: granting platformAdmin via /admin, then reloading
  // (which re-triggers this before the grant's own token refresh has
  // propagated) erased it again. Reading `auth.getUser(uid)` here rather
  // than `request.auth.token` deliberately avoids trusting whatever ID
  // token the client happened to send, which can itself be stale.
  const existingClaims = userRecord.customClaims ?? {};
  const preservedClaims = Object.fromEntries(
    Object.entries(existingClaims).filter(([key]) => key !== "clubId" && key !== "role")
  );

  await auth.setCustomUserClaims(uid, {
    ...preservedClaims,
    ...(primaryClubId && role ? { clubId: primaryClubId, role } : {}),
  });

  return { clubId: primaryClubId, role };
});
