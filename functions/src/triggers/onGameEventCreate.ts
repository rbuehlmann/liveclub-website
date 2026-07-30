import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin";
import { computeGameState, GameEventRecord } from "../lib/score";

export const onGameEventCreate = onDocumentCreated(
  "clubs/{clubId}/games/{gameId}/events/{eventId}",
  async (event) => {
    const { clubId, gameId, eventId } = event.params;
    const snap = event.data;
    if (!snap) return;

    const eventRef = snap.ref;
    const serverTimestamp = Timestamp.now();
    // The client can only ever set an approximate clock value; the
    // authoritative ordering timestamp is always assigned here, server-side.
    await eventRef.update({ serverTimestamp });

    const gameRef = db.collection("clubs").doc(clubId).collection("games").doc(gameId);
    const eventsSnap = await gameRef.collection("events").get();

    const records: GameEventRecord[] = eventsSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        type: data.type,
        correctionOf: data.correctionOf ?? null,
        serverTimestamp: d.id === eventId ? serverTimestamp : data.serverTimestamp ?? null,
        createdAt: data.createdAt ?? null,
      };
    });

    const state = computeGameState(records);

    const gameSnap = await gameRef.get();
    const gameData = gameSnap.data();
    if (!gameData) return;

    const updates: Record<string, unknown> = {
      score: { home: state.scoreHome, away: state.scoreAway },
      status: state.status,
      period: state.period,
      cards: {
        yellowHome: state.yellowCardsHome,
        yellowAway: state.yellowCardsAway,
        redHome: state.redCardsHome,
        redAway: state.redCardsAway,
      },
      lastEventType: state.lastEventType,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (state.status === "live" && !gameData.actualStart) {
      updates.actualStart = FieldValue.serverTimestamp();
    }
    if ((state.status === "finished" || state.status === "cancelled") && !gameData.actualEnd) {
      updates.actualEnd = FieldValue.serverTimestamp();
    }

    await gameRef.update(updates);

    const publicClubId = gameData.publicClubId;
    const publicGameRef = db.collection("publicGames").doc(gameId);
    await publicGameRef.set(
      {
        gameId,
        clubId,
        publicClubId,
        teamId: gameData.teamId,
        homeTeamName: gameData.homeTeamName,
        awayTeamName: gameData.awayTeamName,
        homeClubPublicId: gameData.homeClubPublicId ?? null,
        awayClubPublicId: gameData.awayClubPublicId ?? null,
        homeTeamId: gameData.homeTeamId ?? null,
        awayTeamId: gameData.awayTeamId ?? null,
        scoreHome: state.scoreHome,
        scoreAway: state.scoreAway,
        status: state.status,
        period: state.period,
        lastEventType: state.lastEventType,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    if (publicClubId) {
      const publicClubRef = db.collection("publicClubs").doc(publicClubId);
      const isLive = state.status === "live" || state.status === "paused";
      const teamId = gameData.teamId as string | undefined;
      await db.runTransaction(async (tx) => {
        if (isLive) {
          tx.set(
            publicClubRef,
            {
              currentLiveGameId: gameId,
              // Keyed by team so the widget's optional data-team-id filter
              // never needs its own Firestore query/index.
              ...(teamId ? { [`currentLiveGameIdByTeam.${teamId}`]: gameId } : {}),
            },
            { merge: true }
          );
          return;
        }
        const current = await tx.get(publicClubRef);
        const currentData = current.data();
        const updates: Record<string, unknown> = {};
        // Don't clobber a different game that's currently live for this club
        // (e.g. a youth team match still running while this one finishes).
        if (currentData?.currentLiveGameId === gameId) {
          updates.currentLiveGameId = FieldValue.delete();
        }
        if (teamId && currentData?.currentLiveGameIdByTeam?.[teamId] === gameId) {
          updates[`currentLiveGameIdByTeam.${teamId}`] = FieldValue.delete();
        }
        if (Object.keys(updates).length > 0) {
          tx.set(publicClubRef, updates, { merge: true });
        }
      });
    }
  }
);
