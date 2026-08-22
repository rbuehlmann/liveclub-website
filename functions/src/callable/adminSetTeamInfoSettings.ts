import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../firebaseAdmin";

interface AdminSetTeamInfoSettingsRequest {
  clubId: string;
  teamInfosEnabled?: boolean | null;
  infoPushEnabled?: boolean | null;
  infosPerDay?: number | null;
  pushesPerDay?: number | null;
}

/**
 * Platform-admin-only per-club override of the Team-Info feature — this is
 * the abuse-response lever from the 2026-08-21 design ("ein Verein kann
 * weiterhin LiveClub nutzen, auch wenn ihm nur das Recht zum Versand von
 * Info-Pushs entzogen wurde"). A field left `null`/undefined clears that
 * club's override and falls back to the platform-wide default in
 * settings/teamInfo (see lib/teamInfo.ts's resolveTeamInfoSettings).
 *
 * Global defaults are edited directly by the client at settings/teamInfo
 * (firestore.rules already allows any settings/{docId} write for a
 * platformAdmin, same as settings/branding) — only the per-club override
 * needs a callable, since clubs/{clubId} writes are otherwise restricted
 * to that club's own admin.
 */
export const adminSetTeamInfoSettings = onCall<AdminSetTeamInfoSettingsRequest>(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");
  }
  if (request.auth.token.platformAdmin !== true) {
    throw new HttpsError("permission-denied", "Nur für Plattform-Administratoren.");
  }

  const { clubId, teamInfosEnabled, infoPushEnabled, infosPerDay, pushesPerDay } = request.data;
  if (typeof clubId !== "string" || !clubId) {
    throw new HttpsError("invalid-argument", "clubId fehlt.");
  }

  const clubRef = db.collection("clubs").doc(clubId);
  const clubSnap = await clubRef.get();
  if (!clubSnap.exists) {
    throw new HttpsError("not-found", "Verein nicht gefunden.");
  }

  await clubRef.update({
    teamInfosEnabled: teamInfosEnabled ?? null,
    infoPushEnabled: infoPushEnabled ?? null,
    infosPerDay: infosPerDay ?? null,
    pushesPerDay: pushesPerDay ?? null,
  });

  return { ok: true };
});
