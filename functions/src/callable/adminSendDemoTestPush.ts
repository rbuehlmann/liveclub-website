import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin";
import { postDemoTeamInfo } from "../lib/demoGame";

/**
 * platformAdmin-only "test now" trigger for the push half of the demo club
 * — posts a Team-Info with a push forced on, immediately, bypassing
 * demoClubTick's postIntervalHours/pushesPerDay quota math entirely (that
 * math alone can put a real gap of many hours between pushes, per the
 * 2026-08-25 report that none had arrived yet). Deliberately doesn't touch
 * settings/demoClub's postsToday/pushesSentToday counters — this is a
 * manual test action, not a real cadence event, so it shouldn't eat into
 * the daily quota those track.
 */
export const adminSendDemoTestPush = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");
  }
  if (request.auth.token.platformAdmin !== true) {
    throw new HttpsError("permission-denied", "Nur für Plattform-Administratoren.");
  }

  const configSnap = await db.collection("settings").doc("demoClub").get();
  const config = configSnap.data();
  if (!config?.clubId || !config?.teamId || !config?.adminUid) {
    throw new HttpsError("failed-precondition", "Demo-Verein ist noch nicht eingerichtet.");
  }

  await postDemoTeamInfo({ clubId: config.clubId, teamId: config.teamId, adminUid: config.adminUid }, true);
  await db
    .collection("settings")
    .doc("demoClub")
    .set({ lastTestPushSentAt: FieldValue.serverTimestamp() }, { merge: true });

  return { ok: true };
});
