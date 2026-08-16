import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin";
import { computeGameState, GameEventRecord } from "../lib/score";

export const onGameEventCreate = onDocumentCreated(
  "games/{gameId}/events/{eventId}",
  async (event) => {
    const { gameId, eventId } = event.params;
    const snap = event.data;
    if (!snap) return;

    const eventRef = snap.ref;
    const serverTimestamp = Timestamp.now();
    const gameRef = db.collection("games").doc(gameId);
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

    const homeClubPublicId = gameData.homeClubPublicId as string | null | undefined;
    const awayClubPublicId = gameData.awayClubPublicId as string | null | undefined;
    const homeTeamId = gameData.homeTeamId as string | null | undefined;
    const awayTeamId = gameData.awayTeamId as string | null | undefined;
    const isLive = state.status === "live" || state.status === "paused";

    // A fixture is a single shared record now (see createGame.ts) — both
    // clubs' own pages/widgets/apps mirror it symmetrically, not just
    // whichever one happens to be administering it. The administering
    // side (mainEditorClubId) still gets its own clubId/publicClubId/teamId
    // written onto publicGames, purely for backward compatibility with
    // onPublicGameWrite.ts's existing "own vs. opponent" resolution logic.
    const administeringIsHome = gameData.homeClubId === gameData.mainEditorClubId;
    const administeringPublicClubId = administeringIsHome ? homeClubPublicId : awayClubPublicId;
    const administeringTeamId = administeringIsHome ? homeTeamId : awayTeamId;

    const publicGameRef = db.collection("publicGames").doc(gameId);

    async function syncPublicClub(clubPublicId: string, forTeamId: string | undefined | null) {
      const publicClubRef = db.collection("publicClubs").doc(clubPublicId);
      await db.runTransaction(async (tx) => {
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
            ...(forTeamId ? { [`currentLiveGameIdByTeam.${forTeamId}`]: gameId } : {}),
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
        if (forTeamId && currentData?.currentLiveGameIdByTeam?.[forTeamId] === gameId) {
          clubUpdates[`currentLiveGameIdByTeam.${forTeamId}`] = FieldValue.delete();
        }
        if (Object.keys(clubUpdates).length > 0) {
          tx.update(publicClubRef, clubUpdates);
        }
      });
    }

    // These writes each derive purely from `state`/`gameData` above, never
    // from each other, so — same reasoning as the parallel reads earlier —
    // they go out together instead of one round trip at a time.
    await Promise.all([
      gameRef.update(updates),
      publicGameRef.set(
        {
          gameId,
          clubId: gameData.mainEditorClubId ?? null,
          publicClubId: administeringPublicClubId ?? null,
          teamId: administeringTeamId ?? null,
          homeTeamName: gameData.homeTeamName,
          awayTeamName: gameData.awayTeamName,
          homeClubPublicId: homeClubPublicId ?? null,
          awayClubPublicId: awayClubPublicId ?? null,
          homeTeamId: homeTeamId ?? null,
          awayTeamId: awayTeamId ?? null,
          scoreHome: state.scoreHome,
          scoreAway: state.scoreAway,
          status: state.status,
          period: state.period,
          lastEventType: state.lastEventType,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      ),
      homeClubPublicId ? syncPublicClub(homeClubPublicId, homeTeamId) : Promise.resolve(),
      awayClubPublicId ? syncPublicClub(awayClubPublicId, awayTeamId) : Promise.resolve(),
    ]);
  }
);
