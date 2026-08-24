"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { useClubContext } from "@/components/club/ClubContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Game, GameEventType } from "@/lib/types";

interface RecentEvent {
  id: string;
  type: GameEventType;
  correctionOf?: string | null;
}

export default function LiveControlPage() {
  const t = useTranslations("live");
  const tGames = useTranslations("games");
  const tCommon = useTranslations("common");
  const params = useParams<{ gameId: string }>();
  const { club } = useClubContext();
  const { user } = useAuth();

  const [game, setGame] = useState<Game | null>(null);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [submitting, setSubmitting] = useState(false);
  // True from the moment an event is submitted until the server-recomputed
  // game state (score/status/period) actually reflects it — `submitting`
  // alone only covers the addDoc() write itself, which resolves almost
  // immediately (Firestore's local-cache optimism), well before the
  // onGameEventCreate Cloud Function has recomputed and written the new
  // state back. Without this, a reporter sees no visible change right after
  // clicking, assumes it didn't register, and clicks "Start" again —
  // recording the event twice. Falls back to clearing itself after a few
  // seconds so a slow/failed round trip never leaves the buttons stuck.
  const [pending, setPending] = useState(false);
  const pendingBaselineRef = useRef<string | null>(null);
  // React batches state updates, so two clicks fired in the same tick (a
  // genuine double-click, or a fast double-tap on mobile) can both read
  // `pending` as still false before either setPending(true) commits — a
  // plain state check isn't a reliable re-entrancy guard. A ref updates
  // synchronously and immediately, so it can't race with itself this way.
  const submittingRef = useRef(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!club) return;
    const { db } = getFirebaseClient();
    const gameRef = doc(db, "games", params.gameId);
    const unsubGame = onSnapshot(gameRef, (snap) => {
      const data = snap.data();
      if (!data) return;
      setGame({
        gameId: snap.id,
        homeTeamName: data.homeTeamName,
        awayTeamName: data.awayTeamName,
        homeClubId: data.homeClubId ?? null,
        awayClubId: data.awayClubId ?? null,
        createdByClubId: data.createdByClubId,
        scheduledStart: data.scheduledStart?.toDate?.().toISOString() ?? null,
        status: data.status,
        period: data.period,
        score: data.score ?? { home: 0, away: 0 },
        cards: data.cards,
        mainEditorUid: data.mainEditorUid,
        mainEditorClubId: data.mainEditorClubId,
        eligibleEditorUids: data.eligibleEditorUids ?? [],
      });
    });

    const eventsQuery = query(
      collection(db, "games", params.gameId, "events"),
      orderBy("createdAt", "desc"),
      limit(10)
    );
    const unsubEvents = onSnapshot(eventsQuery, (snap) => {
      setRecentEvents(
        snap.docs.map((d) => ({
          id: d.id,
          type: d.data().type,
          correctionOf: d.data().correctionOf ?? null,
        }))
      );
    });

    return () => {
      unsubGame();
      unsubEvents();
    };
  }, [club, params.gameId]);

  useEffect(() => {
    if (!pending || !game) return;
    const signature = `${game.status}|${game.period}|${game.score.home}|${game.score.away}`;
    if (pendingBaselineRef.current !== null && signature !== pendingBaselineRef.current) {
      setPending(false);
      pendingBaselineRef.current = null;
      submittingRef.current = false;
    }
  }, [game, pending]);

  if (!club || !game) return null;

  // Exactly one uid may ever administer a game at a time (see the
  // 2026-08-15 "Spiel- und Redaktorenlogik" design) — this replaces the old
  // team-membership check entirely. firestore.rules enforces the same
  // check server-side on the actual event writes below, this is only the
  // UI gate.
  const isMainEditor = user?.uid === game.mainEditorUid;
  if (!isMainEditor) {
    return <p className="text-sm text-red-600">{t("noReporterAccess")}</p>;
  }

  async function recordEvent(type: GameEventType, correctionOf: string | null = null) {
    if (!club || !user || !game) return;
    if (submittingRef.current) return; // synchronous guard — see submittingRef above
    submittingRef.current = true;
    pendingBaselineRef.current = `${game.status}|${game.period}|${game.score.home}|${game.score.away}`;
    setPending(true);
    setSubmitting(true);
    try {
      const { db } = getFirebaseClient();
      await addDoc(collection(db, "games", params.gameId, "events"), {
        gameId: params.gameId,
        type,
        createdByUid: user.uid,
        correctionOf,
        createdAt: serverTimestamp(),
      });
      setConfirmationMessage(t("eventRecorded"));
      setTimeout(() => setConfirmationMessage(null), 1500);
    } finally {
      setSubmitting(false);
    }
    setTimeout(() => {
      setPending(false);
      pendingBaselineRef.current = null;
      submittingRef.current = false;
    }, 4000);
  }

  async function handleCorrectLast() {
    const last = recentEvents[0];
    if (!last) return;
    await recordEvent("manualCorrection", last.id);
  }

  async function handleFinish() {
    setConfirmFinish(false);
    await recordEvent("gameFinished");
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">
            {game.homeTeamName} – {game.awayTeamName}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{tGames(`status.${game.status}`)}</p>
        </div>
        <p className="text-3xl font-bold tabular-nums text-gray-900 dark:text-white">
          {game.score.home}:{game.score.away}
        </p>
      </div>

      {confirmationMessage && (
        <div className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-800">
          {confirmationMessage}
        </div>
      )}

      {(game.status === "draft" || game.status === "scheduled") && (
        <Button fullWidth disabled={submitting || pending} onClick={() => recordEvent("gameStarted")}>
          {submitting || pending ? tCommon("loading") : t("startGame")}
        </Button>
      )}

      {(game.status === "live" || game.status === "paused") && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Button
              disabled={submitting || pending || game.status === "paused"}
              onClick={() => recordEvent("goalHome")}
              className="h-24 text-xl"
            >
              {t("goalHome")}
            </Button>
            <Button
              disabled={submitting || pending || game.status === "paused"}
              onClick={() => recordEvent("goalAway")}
              className="h-24 text-xl"
            >
              {t("goalAway")}
            </Button>
          </div>

          {game.status === "live" && game.period === "firstHalf" && (
            <Button variant="secondary" fullWidth disabled={submitting || pending} onClick={() => recordEvent("halfTime")}>
              {t("halfTime")}
            </Button>
          )}
          {game.status === "live" && game.period === "halftime" && (
            <Button fullWidth disabled={submitting || pending} onClick={() => recordEvent("secondHalfStarted")}>
              {t("startSecondHalf")}
            </Button>
          )}

          {game.status === "live" && (
            <Button variant="secondary" fullWidth disabled={submitting || pending} onClick={() => recordEvent("gamePaused")}>
              {t("pauseGame")}
            </Button>
          )}
          {game.status === "paused" && (
            <Button fullWidth disabled={submitting || pending} onClick={() => recordEvent("gameResumed")}>
              {t("resumeGame")}
            </Button>
          )}

          <Button variant="danger" fullWidth disabled={submitting || pending} onClick={() => setConfirmFinish(true)}>
            {t("finishGame")}
          </Button>
        </>
      )}

      {recentEvents.length > 0 && game.status !== "draft" && (
        <Button variant="secondary" fullWidth disabled={submitting || pending} onClick={handleCorrectLast}>
          {t("correctLastEvent")}
        </Button>
      )}

      {(game.status === "finished" || game.status === "cancelled") && (
        <Card>
          <p className="text-center text-lg font-semibold text-gray-900 dark:text-white">
            {game.score.home}:{game.score.away}
          </p>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">{tGames(`status.${game.status}`)}</p>
        </Card>
      )}

      <ConfirmDialog
        open={confirmFinish}
        title={t("confirmFinishTitle")}
        body={t("confirmFinishBody")}
        confirmLabel={t("finishGame")}
        cancelLabel={tCommon("cancel")}
        onConfirm={handleFinish}
        onCancel={() => setConfirmFinish(false)}
      />
    </div>
  );
}
