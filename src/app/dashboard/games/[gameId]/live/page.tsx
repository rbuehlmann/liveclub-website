"use client";

import { useEffect, useState } from "react";
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
  const params = useParams<{ gameId: string }>();
  const { club, role, teamIds } = useClubContext();
  const { user } = useAuth();

  const [game, setGame] = useState<Game | null>(null);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!club) return;
    const { db } = getFirebaseClient();
    const gameRef = doc(db, "clubs", club.clubId, "games", params.gameId);
    const unsubGame = onSnapshot(gameRef, (snap) => {
      const data = snap.data();
      if (!data) return;
      setGame({
        gameId: snap.id,
        clubId: club.clubId,
        publicClubId: club.publicClubId,
        teamId: data.teamId,
        homeTeamName: data.homeTeamName,
        awayTeamName: data.awayTeamName,
        isHomeGame: data.isHomeGame,
        scheduledStart: data.scheduledStart?.toDate?.().toISOString() ?? null,
        status: data.status,
        period: data.period,
        score: data.score ?? { home: 0, away: 0 },
        cards: data.cards,
      });
    });

    const eventsQuery = query(
      collection(db, "clubs", club.clubId, "games", params.gameId, "events"),
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

  if (!club || !game) return null;

  const isAssigned = role === "clubAdmin" || teamIds.includes(game.teamId);
  if (!isAssigned) {
    return <p className="text-sm text-red-600">{t("noReporterAccess")}</p>;
  }

  async function recordEvent(type: GameEventType, correctionOf: string | null = null) {
    if (!club || !user) return;
    setSubmitting(true);
    try {
      const { db } = getFirebaseClient();
      await addDoc(collection(db, "clubs", club.clubId, "games", params.gameId, "events"), {
        clubId: club.clubId,
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
          <h1 className="text-lg font-bold text-gray-900">
            {game.homeTeamName} – {game.awayTeamName}
          </h1>
          <p className="text-sm text-gray-500">{tGames(`status.${game.status}`)}</p>
        </div>
        <p className="text-3xl font-bold tabular-nums text-gray-900">
          {game.score.home}:{game.score.away}
        </p>
      </div>

      {confirmationMessage && (
        <div className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-800">
          {confirmationMessage}
        </div>
      )}

      {(game.status === "draft" || game.status === "scheduled") && (
        <Button fullWidth disabled={submitting} onClick={() => recordEvent("gameStarted")}>
          {t("startGame")}
        </Button>
      )}

      {(game.status === "live" || game.status === "paused") && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Button
              disabled={submitting || game.status === "paused"}
              onClick={() => recordEvent("goalHome")}
              className="h-24 text-xl"
            >
              {t("goalHome")}
            </Button>
            <Button
              disabled={submitting || game.status === "paused"}
              onClick={() => recordEvent("goalAway")}
              className="h-24 text-xl"
            >
              {t("goalAway")}
            </Button>
          </div>

          {game.status === "live" && game.period === "firstHalf" && (
            <Button variant="secondary" fullWidth disabled={submitting} onClick={() => recordEvent("halfTime")}>
              {t("halfTime")}
            </Button>
          )}
          {game.status === "live" && game.period === "halftime" && (
            <Button fullWidth disabled={submitting} onClick={() => recordEvent("secondHalfStarted")}>
              {t("startSecondHalf")}
            </Button>
          )}

          {game.status === "live" && (
            <Button variant="secondary" fullWidth disabled={submitting} onClick={() => recordEvent("gamePaused")}>
              {t("pauseGame")}
            </Button>
          )}
          {game.status === "paused" && (
            <Button fullWidth disabled={submitting} onClick={() => recordEvent("gameResumed")}>
              {t("resumeGame")}
            </Button>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex gap-2">
              <Button
                variant="ghost"
                disabled={submitting}
                onClick={() => recordEvent("yellowCardHome")}
              >
                🟨 Heim
              </Button>
              <Button
                variant="ghost"
                disabled={submitting}
                onClick={() => recordEvent("redCardHome")}
              >
                🟥 Heim
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                disabled={submitting}
                onClick={() => recordEvent("yellowCardAway")}
              >
                🟨 Gast
              </Button>
              <Button
                variant="ghost"
                disabled={submitting}
                onClick={() => recordEvent("redCardAway")}
              >
                🟥 Gast
              </Button>
            </div>
          </div>

          <Button variant="danger" fullWidth disabled={submitting} onClick={() => setConfirmFinish(true)}>
            {t("finishGame")}
          </Button>
        </>
      )}

      {recentEvents.length > 0 && game.status !== "draft" && (
        <Button variant="secondary" fullWidth disabled={submitting} onClick={handleCorrectLast}>
          {t("correctLastEvent")}
        </Button>
      )}

      {(game.status === "finished" || game.status === "cancelled") && (
        <Card>
          <p className="text-center text-lg font-semibold text-gray-900">
            {game.score.home}:{game.score.away}
          </p>
          <p className="text-center text-sm text-gray-500">{tGames(`status.${game.status}`)}</p>
        </Card>
      )}

      <ConfirmDialog
        open={confirmFinish}
        title={t("confirmFinishTitle")}
        body={t("confirmFinishBody")}
        confirmLabel={t("finishGame")}
        cancelLabel="Abbrechen"
        onConfirm={handleFinish}
        onCancel={() => setConfirmFinish(false)}
      />
    </div>
  );
}
