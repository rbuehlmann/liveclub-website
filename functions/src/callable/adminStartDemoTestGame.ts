import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin";
import { startDemoGame } from "../lib/demoGame";

/**
 * platformAdmin-only "test now" trigger — starts a short (~5 min,
 * demoTestGameTick.ts) demo game on demand instead of waiting for
 * demoClubTick's real once/day-ish cadence, so someone testing the Live
 * Activity/Dynamic Island flow (2026-08-25 — the auto-finish not firing
 * reliably) can reproduce it in minutes and repeatedly, without touching
 * the production-cadence fields (activeGameId/lastGameStartedAt) that
 * demoClubTick itself owns. Purely additive: demoClubTick and its normal
 * schedule are completely unaffected by this.
 */
export const adminStartDemoTestGame = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");
  }
  if (request.auth.token.platformAdmin !== true) {
    throw new HttpsError("permission-denied", "Nur für Plattform-Administratoren.");
  }

  const configRef = db.collection("settings").doc("demoClub");
  const configSnap = await configRef.get();
  const config = configSnap.data();
  if (!config?.clubId || !config?.teamId || !config?.adminUid) {
    throw new HttpsError("failed-precondition", "Demo-Verein ist noch nicht eingerichtet.");
  }
  if (config.testGameId) {
    throw new HttpsError("failed-precondition", "Es läuft bereits ein Testspiel.");
  }

  const gameId = await startDemoGame({
    clubId: config.clubId,
    teamId: config.teamId,
    adminUid: config.adminUid,
  });

  await configRef.set(
    {
      testGameId: gameId,
      testGameStartedAt: FieldValue.serverTimestamp(),
      testGameGoalsAdded: 0,
    },
    { merge: true }
  );

  return { ok: true, gameId };
});
