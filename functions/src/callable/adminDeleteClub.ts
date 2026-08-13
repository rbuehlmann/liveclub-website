import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { db, auth, app } from "../firebaseAdmin";

interface AdminDeleteClubRequest {
  clubId: string;
}

/**
 * Platform-admin-only: permanently wipes a club and everything that
 * references it. Meant for cleaning up bad/duplicate/spam registrations
 * before the registration flow has captcha + ToS gating — real, licensed
 * clubs are handled by adminSetLicense's "cancelled" status instead (which
 * only revokes discoverability, never deletes data). This one has no undo.
 *
 * Firestore alone doesn't cascade-delete: clubs/{clubId} and its
 * subcollections come off via recursiveDelete, but publicClubs (a separate
 * top-level doc), publicGames/publicTeams (top-level mirrors keyed by their
 * own ids), invitations (queried by clubId), each member's cached
 * users/{uid} club fields, the Storage logo, and Auth custom claims all
 * need their own explicit cleanup or they'd orphan silently.
 *
 * Deliberately does not touch Stripe (no auto-cancelling a real
 * subscription) or deviceFollows (stale publicTeamId entries in a device's
 * followedTeamIds array are harmless dead weight, not worth an unindexed
 * full-collection scan here).
 */
export const adminDeleteClub = onCall<AdminDeleteClubRequest>(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");
  }
  if (request.auth.token.platformAdmin !== true) {
    throw new HttpsError("permission-denied", "Nur für Plattform-Administratoren.");
  }

  const { clubId } = request.data;
  if (typeof clubId !== "string" || !clubId) {
    throw new HttpsError("invalid-argument", "clubId fehlt.");
  }

  const clubRef = db.collection("clubs").doc(clubId);
  const clubSnap = await clubRef.get();
  if (!clubSnap.exists) {
    throw new HttpsError("not-found", "Verein wurde nicht gefunden.");
  }
  const clubData = clubSnap.data()!;
  const publicClubId: string | undefined = clubData.publicClubId;

  const [membersSnap, teamsSnap, gamesSnap, invitationsSnap] = await Promise.all([
    clubRef.collection("members").get(),
    clubRef.collection("teams").get(),
    clubRef.collection("games").get(),
    db.collection("invitations").where("clubId", "==", clubId).get(),
  ]);

  // Storage logo — filename is whatever the clubAdmin originally uploaded,
  // so list the prefix rather than assume a fixed object name.
  const bucket = getStorage(app).bucket();
  const [logoFiles] = await bucket.getFiles({ prefix: `clubs/${clubId}/logo/` });
  await Promise.all(logoFiles.map((file) => file.delete().catch(() => undefined)));

  // Top-level mirrors keyed by ids only known from the club's own
  // subcollections (games share their id with publicGames; teams carry
  // their own publicTeamId for the publicTeams mirror).
  const batch = db.batch();
  gamesSnap.docs.forEach((gameDoc) => {
    batch.delete(db.collection("publicGames").doc(gameDoc.id));
  });
  teamsSnap.docs.forEach((teamDoc) => {
    const publicTeamId = teamDoc.data().publicTeamId;
    if (publicTeamId) batch.delete(db.collection("publicTeams").doc(publicTeamId));
  });
  invitationsSnap.docs.forEach((invDoc) => batch.delete(invDoc.ref));
  await batch.commit();

  if (publicClubId) {
    await db.recursiveDelete(db.collection("publicClubs").doc(publicClubId));
  }

  // Every member: drop this club from their cached users/{uid} fields, then
  // immediately resync their claim (same derivation as syncClubClaims)
  // rather than waiting for their next sign-in/token refresh to self-heal.
  await Promise.all(
    membersSnap.docs.map(async (memberDoc) => {
      const uid = memberDoc.id;
      const userRef = db.collection("users").doc(uid);
      await userRef.set(
        {
          clubIds: FieldValue.arrayRemove(clubId),
          clubRoles: { [clubId]: FieldValue.delete() },
          clubTeamIds: { [clubId]: FieldValue.delete() },
        },
        { merge: true }
      );
      const userSnap = await userRef.get();
      const data = userSnap.data();
      const remainingClubIds: string[] = data?.clubIds ?? [];
      const clubRoles: Record<string, string> = data?.clubRoles ?? {};
      const nextClubId = remainingClubIds[0] ?? null;
      const nextRole = nextClubId ? clubRoles[nextClubId] ?? null : null;
      await auth
        .setCustomUserClaims(uid, nextClubId && nextRole ? { clubId: nextClubId, role: nextRole } : {})
        .catch(() => undefined);
    })
  );

  // clubs/{clubId} + members/teams/games/games-events/licenses subcollections.
  await db.recursiveDelete(clubRef);

  return { ok: true };
});
