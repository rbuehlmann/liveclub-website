import { onSchedule } from "firebase-functions/v2/scheduler";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin";
import { DEMO_POSTS } from "../lib/demoContent";
import { sendTeamInfoPush } from "../lib/teamInfoPush";

const DEMO_OPPONENTS = ["SC Musterhausen", "FC Platzhalter", "SV Test United", "AC Beispiel"];
// Long enough that a human watching the live page sees a realistic-looking
// match, short enough that it doesn't sit "live" for hours unattended.
const GAME_DURATION_MINUTES = 12;

interface DemoClubConfig {
  clubId?: string;
  teamId?: string;
  adminUid?: string;
  enabled?: boolean;
  postIntervalHours?: number;
  pushesPerDay?: number;
  liveGamesPerDay?: number;
  lastPostAt?: Timestamp | null;
  postsToday?: number;
  pushesSentToday?: number;
  dayKey?: string;
  lastGameStartedAt?: Timestamp | null;
  activeGameId?: string | null;
  midGameGoalAdded?: boolean;
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

async function postDemoTeamInfo(config: DemoClubConfig, wantsPush: boolean): Promise<void> {
  const [clubSnap, teamSnap] = await Promise.all([
    db.collection("clubs").doc(config.clubId!).get(),
    db.collection("clubs").doc(config.clubId!).collection("teams").doc(config.teamId!).get(),
  ]);
  const club = clubSnap.data();
  const team = teamSnap.data();
  if (!club || !team) return;

  const post = pickRandom(DEMO_POSTS);
  const infoRef = db.collection("teamInfos").doc();
  await infoRef.set({
    infoId: infoRef.id,
    teamId: config.teamId,
    publicTeamId: team.publicTeamId ?? null,
    clubId: config.clubId,
    publicClubId: club.publicClubId ?? null,
    teamName: team.name,
    clubName: club.name,
    clubLogoUrl: club.logoUrl ?? null,
    title: post.title,
    text: post.text,
    createdAt: FieldValue.serverTimestamp(),
    createdByUid: config.adminUid,
    pushSent: false,
    pushSentAt: null,
    hidden: false,
  });

  if (wantsPush && team.publicTeamId) {
    await sendTeamInfoPush(team.publicTeamId, { title: team.name, body: post.title });
    await infoRef.update({ pushSent: true, pushSentAt: FieldValue.serverTimestamp() });
  }
}

async function startDemoGame(config: DemoClubConfig): Promise<string> {
  const [clubSnap, teamSnap] = await Promise.all([
    db.collection("clubs").doc(config.clubId!).get(),
    db.collection("clubs").doc(config.clubId!).collection("teams").doc(config.teamId!).get(),
  ]);
  const club = clubSnap.data();
  const team = teamSnap.data();
  if (!club || !team) throw new Error("Demo club/team not found");

  const isHomeGame = Math.random() < 0.5;
  const opponentName = pickRandom(DEMO_OPPONENTS);
  const homeTeamName = isHomeGame ? team.name : opponentName;
  const awayTeamName = isHomeGame ? opponentName : team.name;

  const gameRef = db.collection("games").doc();
  await gameRef.set({
    homeTeamName,
    awayTeamName,
    homeClubId: isHomeGame ? config.clubId : null,
    awayClubId: isHomeGame ? null : config.clubId,
    homeClubPublicId: isHomeGame ? (club.publicClubId ?? null) : null,
    awayClubPublicId: isHomeGame ? null : (club.publicClubId ?? null),
    homeTeamId: isHomeGame ? config.teamId : null,
    awayTeamId: isHomeGame ? null : config.teamId,
    createdByClubId: config.clubId,
    scheduledStart: FieldValue.serverTimestamp(),
    status: "scheduled",
    score: { home: 0, away: 0 },
    mainEditorUid: config.adminUid,
    mainEditorClubId: config.clubId,
    mainEditorDisplayName: "LiveDemo",
    eligibleEditorUids: [config.adminUid],
    pendingTransfer: null,
    hasBeenTransferred: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await gameRef.collection("events").add({
    gameId: gameRef.id,
    type: "gameStarted",
    createdByUid: config.adminUid,
    correctionOf: null,
    createdAt: FieldValue.serverTimestamp(),
  });

  return gameRef.id;
}

async function addRandomGoal(gameId: string, adminUid: string): Promise<void> {
  const type = Math.random() < 0.5 ? "goalHome" : "goalAway";
  await db.collection("games").doc(gameId).collection("events").add({
    gameId,
    type,
    createdByUid: adminUid,
    correctionOf: null,
    createdAt: FieldValue.serverTimestamp(),
  });
}

async function finishDemoGame(gameId: string, adminUid: string): Promise<void> {
  await db.collection("games").doc(gameId).collection("events").add({
    gameId,
    type: "gameFinished",
    createdByUid: adminUid,
    correctionOf: null,
    createdAt: FieldValue.serverTimestamp(),
  });
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
export const demoClubTick = onSchedule("every 15 minutes", async () => {
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
    const postsPerDay = Math.max(1, Math.round(24 / (config.postIntervalHours ?? 2)));
    const pushesPerDay = config.pushesPerDay ?? 3;
    const pushEveryNPosts = Math.max(1, Math.round(postsPerDay / Math.max(1, pushesPerDay)));
    const wantsPush = pushesSentToday < pushesPerDay && (postsToday + 1) % pushEveryNPosts === 0;

    await postDemoTeamInfo(config, wantsPush);
    updates.lastPostAt = FieldValue.serverTimestamp();
    updates.postsToday = postsToday + 1;
    if (wantsPush) updates.pushesSentToday = pushesSentToday + 1;
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
