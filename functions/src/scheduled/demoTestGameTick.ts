import { onSchedule } from "firebase-functions/v2/scheduler";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin";
import { addRandomGoal, finishDemoGame } from "../lib/demoGame";

// Short enough to watch end-to-end in one sitting (the whole point of the
// admin "Jetzt Testspiel starten" button — 2026-08-25, testing the
// Live-Activity-doesn't-auto-finish report faster/repeatedly than
// demoClubTick's real ~12-minute/once-a-day cadence allows), but still
// realistic-looking football scoring.
const TEST_GAME_DURATION_MINUTES = 5;
const MAX_TEST_GAME_GOALS = 5;
// Per-tick odds of adding a goal (only while under the cap) — at one tick
// per minute for ~5 minutes, this averages a couple of goals without
// guaranteeing the cap is hit every time.
const GOAL_CHANCE_PER_TICK = 0.35;

interface DemoTestState {
  adminUid?: string;
  testGameId?: string | null;
  testGameStartedAt?: Timestamp | null;
  testGameGoalsAdded?: number;
}

/**
 * Companion to demoClubTick, but only ever touches testGameId/
 * testGameStartedAt/testGameGoalsAdded — fields demoClubTick itself never
 * reads or writes — so the two schedules can't step on each other. No-ops
 * (near-instantly) whenever no test game is active, which is almost
 * always; this only does real work in the few minutes after someone clicks
 * "Jetzt Testspiel starten" on /admin/demo.
 */
export const demoTestGameTick = onSchedule("every 1 minutes", async () => {
  const configRef = db.collection("settings").doc("demoClub");
  const configSnap = await configRef.get();
  const config = (configSnap.data() ?? {}) as DemoTestState;

  if (!config.testGameId || !config.testGameStartedAt || !config.adminUid) return;

  const minutesRunning = (Date.now() - config.testGameStartedAt.toDate().getTime()) / 60000;

  if (minutesRunning >= TEST_GAME_DURATION_MINUTES) {
    await finishDemoGame(config.testGameId, config.adminUid);
    await configRef.set(
      { testGameId: null, testGameStartedAt: null, testGameGoalsAdded: 0 },
      { merge: true }
    );
    return;
  }

  const goalsSoFar = config.testGameGoalsAdded ?? 0;
  if (goalsSoFar < MAX_TEST_GAME_GOALS && Math.random() < GOAL_CHANCE_PER_TICK) {
    await addRandomGoal(config.testGameId, config.adminUid);
    await configRef.set({ testGameGoalsAdded: FieldValue.increment(1) }, { merge: true });
  }
});
