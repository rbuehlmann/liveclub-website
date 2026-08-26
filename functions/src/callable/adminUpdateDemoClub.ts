import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin";

interface AdminUpdateDemoClubRequest {
  enabled: boolean;
  postIntervalHours: number;
  pushesPerDay: number;
  liveGamesPerDay: number;
  logoUrl?: string | null;
  clubName?: string;
  teamName?: string;
}

/**
 * The one write path for /admin/demo — a regular platformAdmin can't write
 * clubs/{clubId} directly (firestore.rules only allows that club's own
 * clubAdmin), so mirroring a new logo onto the actual club/publicClubs docs
 * needs the Admin SDK, same as every other admin-on-a-club action in this
 * app. Bundled with the settings/demoClub config fields (which technically
 * could be written directly, platformAdmin already has settings/{docId}
 * access) so the admin page only needs one save button/call.
 */
export const adminUpdateDemoClub = onCall<AdminUpdateDemoClubRequest>(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");
  }
  if (request.auth.token.platformAdmin !== true) {
    throw new HttpsError("permission-denied", "Nur für Plattform-Administratoren.");
  }

  const { enabled, postIntervalHours, pushesPerDay, liveGamesPerDay, logoUrl, clubName, teamName } = request.data;

  const configRef = db.collection("settings").doc("demoClub");
  const configSnap = await configRef.get();
  const config = configSnap.data();
  if (!config?.clubId || !config?.teamId) {
    throw new HttpsError("failed-precondition", "Demo-Verein ist noch nicht eingerichtet.");
  }

  const clubRef = db.collection("clubs").doc(config.clubId as string);
  const teamRef = clubRef.collection("teams").doc(config.teamId as string);
  const [clubSnap, teamSnap] = await Promise.all([clubRef.get(), teamRef.get()]);
  const publicClubId = clubSnap.data()?.publicClubId as string | undefined;
  const resolvedClubName = clubName?.trim() || (clubSnap.data()?.name as string | undefined);
  const resolvedTeamName = teamName?.trim() || (teamSnap.data()?.name as string | undefined);

  // Denormalized onto settings/demoClub so the admin page (a regular
  // client-side read, gated on isPlatformAdmin() in firestore.rules) never
  // needs a second read of clubs/{clubId} itself — that collection's own
  // read rule is isClubMember(clubId) only, which a platformAdmin doesn't
  // automatically satisfy for a club they're not a member of. Refreshed on
  // every save as a self-healing safeguard rather than a one-off backfill.
  await configRef.set(
    {
      enabled: !!enabled,
      postIntervalHours: Math.max(1, Number(postIntervalHours) || 2),
      pushesPerDay: Math.max(0, Number(pushesPerDay) || 0),
      liveGamesPerDay: Math.max(0, Number(liveGamesPerDay) || 0),
      ...(publicClubId ? { publicClubId } : {}),
      ...(logoUrl !== undefined ? { logoUrl } : {}),
      ...(resolvedClubName ? { clubName: resolvedClubName } : {}),
      ...(resolvedTeamName ? { teamName: resolvedTeamName } : {}),
    },
    { merge: true }
  );

  if (logoUrl !== undefined) {
    await Promise.all([
      clubRef.update({ logoUrl, updatedAt: FieldValue.serverTimestamp() }),
      publicClubId
        ? db.collection("publicClubs").doc(publicClubId).set({ logoUrl }, { merge: true })
        : Promise.resolve(),
    ]);
  }

  // Name changes go through the same club/team docs a real clubAdmin would
  // edit (dashboard/club, dashboard/teams) — onClubWrite/onTeamWrite
  // already mirror those onto publicClubs/publicTeams, so nothing extra to
  // sync here.
  if (clubName?.trim()) {
    await clubRef.update({ name: clubName.trim(), updatedAt: FieldValue.serverTimestamp() });
  }
  if (teamName?.trim()) {
    await clubRef
      .collection("teams")
      .doc(config.teamId as string)
      .update({ name: teamName.trim() });
  }

  return { ok: true };
});
