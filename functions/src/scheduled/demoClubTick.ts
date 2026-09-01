import { onSchedule } from "firebase-functions/v2/scheduler";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin";
import { apnsAuthKey } from "../lib/secrets";
import {
  DemoClubConfig as BaseDemoClubConfig,
  addRandomGoal,
  finishDemoGame,
  postDemoTeamInfo,
  sendDemoPush,
  startDemoGame,
} from "../lib/demoGame";
import { intervalMinutesForCount, mostRecentSlot } from "../lib/demoSchedule";

// Short enough to fit comfortably inside even the tightest slot spacing
// (48/day = every 30 minutes) with room to spare, and to match the "Jetzt
// Testspiel starten" quick-test's own 5-minute run time (2026-09-01,
// previously 12 minutes — combined with this tick's 15-minute granularity,
// that made the mid-game goal window narrower than the tick period, so it
// got skipped almost every time; see the independent if/if below).
const GAME_DURATION_MINUTES = 5;

interface DemoClubConfig extends BaseDemoClubConfig {
  enabled?: boolean;
  postsPerDay?: number;
  pushesPerDay?: number;
  liveGamesPerDay?: number;
  postStartTime?: string;
  pushStartTime?: string;
  liveGameStartTime?: string;
  lastPostSlotAt?: Timestamp | null;
  lastPushSlotAt?: Timestamp | null;
  lastGameSlotAt?: Timestamp | null;
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
 * demos, 2026-08-23 decision). Post/Push/Live-Spiel each have their own
 * count-per-day (6/12/24/48 only, see demoSchedule.ts) and wall-clock start
 * time — e.g. "Post 9:00, Spiel 9:15, Push 9:30" — instead of drifting off
 * "elapsed time since whenever it last happened". All state (the slot
 * markers, counters) lives on settings/demoClub so this can safely run on a
 * fixed 15-minute tick with no other scheduling infrastructure. No-ops
 * entirely while `enabled` is false.
 */
export const demoClubTick = onSchedule({ schedule: "every 15 minutes", secrets: [apnsAuthKey] }, async () => {
  const configRef = db.collection("settings").doc("demoClub");
  const configSnap = await configRef.get();
  const config = (configSnap.data() ?? {}) as DemoClubConfig;

  if (!config.enabled || !config.clubId || !config.teamId || !config.adminUid) return;

  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const isNewDay = config.dayKey !== todayKey;

  const updates: Record<string, unknown> = { dayKey: todayKey };
  // Persisted unconditionally (2026-09-01 fix) — previously this reset only
  // happened inside the "did we post this tick" branch, so if the very
  // first tick of a new day wasn't also a post tick, dayKey flipped to
  // "today" in Firestore while postsToday/pushesSentToday stayed at
  // yesterday's (often already-exhausted) values, and every later tick that
  // day read isNewDay as false and kept the stale numbers. These counters
  // are display-only now (the anchored slots below gate the real
  // behaviour), but /admin/demo's "heute gepostet/gepusht" stats should
  // still be correct.
  if (isNewDay) {
    updates.postsToday = 0;
    updates.pushesSentToday = 0;
  }
  const postsToday = isNewDay ? 0 : (config.postsToday ?? 0);
  const pushesSentToday = isNewDay ? 0 : (config.pushesSentToday ?? 0);

  // 1. End (or nudge) an in-progress demo game.
  let activeGameId = config.activeGameId ?? null;
  if (activeGameId && config.lastGameStartedAt) {
    const minutesRunning = (now.getTime() - config.lastGameStartedAt.toDate().getTime()) / 60000;
    // Independent checks (2026-09-01 fix, was `if` / `else if`) — with a
    // 15-minute tick and a game shorter than that, the first tick to ever
    // observe a running game is often already past the finish threshold, so
    // the old else-if skipped the goal branch entirely and every demo game
    // ended 0:0. Both can now fire on the same tick.
    if (minutesRunning >= GAME_DURATION_MINUTES / 2 && !config.midGameGoalAdded) {
      await addRandomGoal(activeGameId, config.adminUid);
      updates.midGameGoalAdded = true;
    }
    if (minutesRunning >= GAME_DURATION_MINUTES) {
      await finishDemoGame(activeGameId, config.adminUid);
      activeGameId = null;
      updates.activeGameId = null;
      updates.lastGameEndedAt = FieldValue.serverTimestamp();
    }
  }

  // 2. Maybe post a Team-Info, anchored to postStartTime.
  const postIntervalMinutes = intervalMinutesForCount(config.postsPerDay ?? 24);
  const postSlot = mostRecentSlot(now, config.postStartTime ?? "09:00", postIntervalMinutes);
  const shouldPost = !config.lastPostSlotAt || config.lastPostSlotAt.toDate().getTime() < postSlot.getTime();
  if (shouldPost) {
    await postDemoTeamInfo(config, false);
    updates.lastPostAt = FieldValue.serverTimestamp();
    updates.lastPostSlotAt = Timestamp.fromDate(postSlot);
    updates.postsToday = postsToday + 1;
  }

  // 3. Maybe send a push, anchored to pushStartTime — fully decoupled from
  //    step 2 now (2026-09-01 redesign), so it no longer depends on a fresh
  //    post happening on the very same tick.
  const pushIntervalMinutes = intervalMinutesForCount(config.pushesPerDay ?? 12);
  const pushSlot = mostRecentSlot(now, config.pushStartTime ?? "09:30", pushIntervalMinutes);
  const shouldPush = !config.lastPushSlotAt || config.lastPushSlotAt.toDate().getTime() < pushSlot.getTime();
  if (shouldPush) {
    const sent = await sendDemoPush(config);
    if (sent) {
      updates.lastPushSentAt = FieldValue.serverTimestamp();
      updates.pushesSentToday = pushesSentToday + 1;
    }
    updates.lastPushSlotAt = Timestamp.fromDate(pushSlot);
  }

  // 4. Maybe start a new demo live game, anchored to liveGameStartTime
  //    (only if none is currently running).
  const gameIntervalMinutes = intervalMinutesForCount(config.liveGamesPerDay ?? 12);
  const gameSlot = mostRecentSlot(now, config.liveGameStartTime ?? "09:15", gameIntervalMinutes);
  const shouldStartGame =
    !activeGameId && (!config.lastGameSlotAt || config.lastGameSlotAt.toDate().getTime() < gameSlot.getTime());
  if (shouldStartGame) {
    const newGameId = await startDemoGame(config);
    updates.activeGameId = newGameId;
    updates.lastGameStartedAt = FieldValue.serverTimestamp();
    updates.lastGameSlotAt = Timestamp.fromDate(gameSlot);
    updates.midGameGoalAdded = false;
  }

  await configRef.set(updates, { merge: true });
});
