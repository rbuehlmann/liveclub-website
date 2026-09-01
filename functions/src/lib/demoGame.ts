import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin";
import { DEMO_POSTS } from "./demoContent";
import { sendTeamInfoPush } from "./teamInfoPush";

// Shared between the always-on demoClubTick (real cadence, for App
// Store review / test-customer demos) and the admin-only "test now"
// callables/tick (functions/src/callable/adminStartDemoTestGame.ts,
// functions/src/scheduled/demoTestGameTick.ts) — both drive the exact same
// "LiveDemo" club/team, just on different timers, so the actual
// game/post-creation logic must not drift between the two.
export const DEMO_OPPONENTS = ["SC Musterhausen", "FC Platzhalter", "SV Test United", "AC Beispiel"];

export interface DemoClubConfig {
  clubId?: string;
  teamId?: string;
  adminUid?: string;
}

export function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export async function postDemoTeamInfo(config: DemoClubConfig, wantsPush: boolean): Promise<void> {
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
    const { sent } = await sendTeamInfoPush(team.publicTeamId, { title: team.name, body: post.title });
    if (sent > 0) {
      await infoRef.update({ pushSent: true, pushSentAt: FieldValue.serverTimestamp() });
    }
  }
}

/**
 * The 2026-09-01 redesign gives Push its own anchored schedule, independent
 * of Post — so unlike the old wantsPush flag riding along a fresh
 * postDemoTeamInfo call, this can fire on a tick where no new post was
 * created at all. Re-notifies about the most recent Team-Info post for the
 * demo team (never fabricates content); a no-op (returns false) only in the
 * unlikely case no post exists yet at all.
 */
export async function sendDemoPush(config: DemoClubConfig): Promise<boolean> {
  const teamSnap = await db.collection("clubs").doc(config.clubId!).collection("teams").doc(config.teamId!).get();
  const team = teamSnap.data();
  if (!team?.publicTeamId) return false;

  const latest = await db
    .collection("teamInfos")
    .where("teamId", "==", config.teamId)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();
  if (latest.empty) return false;

  const infoDoc = latest.docs[0];
  const info = infoDoc.data();
  const { sent } = await sendTeamInfoPush(team.publicTeamId, { title: team.name, body: info.title });
  if (sent > 0 && !info.pushSent) {
    await infoDoc.ref.update({ pushSent: true, pushSentAt: FieldValue.serverTimestamp() });
  }
  return sent > 0;
}

export async function startDemoGame(config: DemoClubConfig): Promise<string> {
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

export async function addRandomGoal(gameId: string, adminUid: string): Promise<void> {
  const type = Math.random() < 0.5 ? "goalHome" : "goalAway";
  await db.collection("games").doc(gameId).collection("events").add({
    gameId,
    type,
    createdByUid: adminUid,
    correctionOf: null,
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function finishDemoGame(gameId: string, adminUid: string): Promise<void> {
  await db.collection("games").doc(gameId).collection("events").add({
    gameId,
    type: "gameFinished",
    createdByUid: adminUid,
    correctionOf: null,
    createdAt: FieldValue.serverTimestamp(),
  });
}

// Re-exported purely so callers don't need a second import line for a type
// that's only ever used alongside the functions above.
export type { Timestamp };
