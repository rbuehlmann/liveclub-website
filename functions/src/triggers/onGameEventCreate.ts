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
    const gameRef = db.collection("clubs").doc(clubId).collection("games").doc(gameId);
    // The three reads/writes below don't depend on each other's *results* —
    // only on `serverTimestamp`, which is already known locally — so they
    // can all go out over the wire at once instead of one round trip at a
    // time. This is what made the live-control buttons feel sluggish
    // (reporters sometimes clicking "Start" twice before the first click's
    // effect was visible): each awaited Firestore round trip in this
    // function adds latency before the client's onSnapshot listener sees
    // anything change.
    const [, eventsSnap, gameSnap] = await Promise.all([
      // The client can only ever set an approximate clock value; the
      // authoritative ordering timestamp is always assigned here,
      // server-side. `records` below substitutes it in-memory regardless of
      // when this write actually lands, so it doesn't need to be awaited
      // before the query.
      eventRef.update({ serverTimestamp }),
      gameRef.collection("events").get(),
      gameRef.get(),
    ]);

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

    const publicClubId = gameData.publicClubId;
    const publicGameRef = db.collection("publicGames").doc(gameId);
    const teamId = gameData.teamId as string | undefined;

    // These three writes each derive purely from `state`/`gameData` above,
    // never from each other, so — same reasoning as the parallel reads —
    // they go out together instead of one round trip at a time.
    await Promise.all([
      gameRef.update(updates),
      publicGameRef.set(
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
      ),
      publicClubId
        ? db.runTransaction(async (tx) => {
            const publicClubRef = db.collection("publicClubs").doc(publicClubId);
            const isLive = state.status === "live" || state.status === "paused";
            if (isLive) {
              // Dotted keys are only interpreted as nested paths by
              // update(), never by set(..., {merge:true}) — that would
              // instead create a literal field named e.g.
              // "currentLiveGameIdByTeam.abc123" and the delete branch
              // below could never find it again. publicClubRef always
              // exists by this point (created alongside the club itself in
              // createClub.ts), so update() is safe to use unconditionally.
              tx.update(publicClubRef, {
                currentLiveGameId: gameId,
                // Keyed by team so the widget's optional data-team-id
                // filter never needs its own Firestore query/index.
                ...(teamId ? { [`currentLiveGameIdByTeam.${teamId}`]: gameId } : {}),
              });
              return;
            }
            const current = await tx.get(publicClubRef);
            const currentData = current.data();
            const clubUpdates: Record<string, unknown> = {};
            // Don't clobber a different game that's currently live for this
            // club (e.g. a youth team match still running while this one
            // finishes).
            if (currentData?.currentLiveGameId === gameId) {
              clubUpdates.currentLiveGameId = FieldValue.delete();
            }
            if (teamId && currentData?.currentLiveGameIdByTeam?.[teamId] === gameId) {
              clubUpdates[`currentLiveGameIdByTeam.${teamId}`] = FieldValue.delete();
            }
            if (Object.keys(clubUpdates).length > 0) {
              tx.update(publicClubRef, clubUpdates);
            }
          })
        : Promise.resolve(),
    ]);
  }
);
