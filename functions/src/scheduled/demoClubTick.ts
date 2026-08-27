import { onSchedule } from "firebase-functions/v2/scheduler";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin";
import { apnsAuthKey } from "../lib/secrets";
import {
  DemoClubConfig as BaseDemoClubConfig,
  addRandomGoal,
  finishDemoGame,
  postDemoTeamInfo,
  startDemoGame,
} from "../lib/demoGame";

// Long enough that a human watching the live page sees a realistic-looking
// match, short enough that it doesn't sit "live" for hours unattended.
const GAME_DURATION_MINUTES = 12;

interface DemoClubConfig extends BaseDemoClubConfig {
  enabled?: boolean;
  postIntervalHours?: number;
  pushesPerDay?: number;
  liveGamesPerDay?: number;
  lastPostAt?: Timestamp | null;
  lastPushSentAt?: Timestamp | null;
  postsToday?: number;
  pushesSentToday?: number;
  dayKey?: string;
  lastGameStartedAt?: Timestamp | null;
  lastGameEndedAt?: Timestamp | null;
  activeGameId?: string | null;
  midGameGoalAdded?: boolean;
}

/**
 * Drives the always-on "LiveDemo" club (App-Store-review / test-customer
 * demos, 2026-08-23 decision) — posts a random Team-Info roughly every
 * `postIntervalHours`, sends a push on a fraction of those posts to hit
 * `pushesPerDay`, and starts+ends a short live game `liveGamesPerDay`
 * times/day. All state (counters, timestamps) lives on settings/demoClub
 * so this can safely run on a fixed 15-minute tick without any other
 * scheduling infrastructure. No-ops entirely while `enabled` is false.
 */
export const demoClubTick = onSchedule({ schedule: "every 15 minutes", secrets: [apnsAuthKey] }, async () => {
  const configRef = db.collection("settings").doc("demoClub");
  const configSnap = await configRef.get();
  const config = (configSnap.data() ?? {}) as DemoClubConfig;

  if (!config.enabled || !config.clubId || !config.teamId || !config.adminUid) return;

  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const isNewDay = config.dayKey !== todayKey;
  let postsToday = isNewDay ? 0 : (config.postsToday ?? 0);
  let pushesSentToday = isNewDay ? 0 : (config.pushesSentToday ?? 0);

  const updates: Record<string, unknown> = { dayKey: todayKey };

  // 1. End (or nudge) an in-progress demo game.
  let activeGameId = config.activeGameId ?? null;
  if (activeGameId && config.lastGameStartedAt) {
    const minutesRunning = (now.getTime() - config.lastGameStartedAt.toDate().getTime()) / 60000;
    if (minutesRunning >= GAME_DURATION_MINUTES) {
      await finishDemoGame(activeGameId, config.adminUid);
      activeGameId = null;
      updates.activeGameId = null;
      updates.lastGameEndedAt = FieldValue.serverTimestamp();
    } else if (minutesRunning >= GAME_DURATION_MINUTES / 2 && !config.midGameGoalAdded) {
      await addRandomGoal(activeGameId, config.adminUid);
      updates.midGameGoalAdded = true;
    }
  }

  // 2. Maybe post a Team-Info.
  const postIntervalMs = (config.postIntervalHours ?? 2) * 60 * 60 * 1000;
  const shouldPost =
    !config.lastPostAt || now.getTime() - config.lastPostAt.toDate().getTime() >= postIntervalMs;
  if (shouldPost) {
    const pushesPerDay = config.pushesPerDay ?? 3;
    // Time-based, mirroring shouldStartGame below — self-correcting off
    // lastPushSentAt every tick, unlike a "every Nth post" counter check
    // (the previous approach), which permanently misfires for the rest of
    // the day if postsToday ever drifts (e.g. stale/manual test data) since
    // it depends on hitting an exact multiple.
    const pushIntervalMs = pushesPerDay > 0 ? (24 / pushesPerDay) * 60 * 60 * 1000 : Infinity;
    const wantsPush =
      pushesPerDay > 0 &&
      pushesSentToday < pushesPerDay &&
      (!config.lastPushSentAt || now.getTime() - config.lastPushSentAt.toDate().getTime() >= pushIntervalMs);

    await postDemoTeamInfo(config, wantsPush);
    updates.lastPostAt = FieldValue.serverTimestamp();
    updates.postsToday = postsToday + 1;
    if (wantsPush) {
      updates.pushesSentToday = pushesSentToday + 1;
      updates.lastPushSentAt = FieldValue.serverTimestamp();
    }
  }

  // 3. Maybe start a new demo live game (only if none is currently running).
  const liveGamesPerDay = Math.max(1, config.liveGamesPerDay ?? 1);
  const gameIntervalMs = (24 / liveGamesPerDay) * 60 * 60 * 1000;
  const shouldStartGame =
    !activeGameId &&
    (!config.lastGameStartedAt || now.getTime() - config.lastGameStartedAt.toDate().getTime() >= gameIntervalMs);
  if (shouldStartGame) {
    const newGameId = await startDemoGame(config);
    updates.activeGameId = newGameId;
    updates.lastGameStartedAt = FieldValue.serverTimestamp();
    updates.midGameGoalAdded = false;
  }

  await configRef.set(updates, { merge: true });
});
