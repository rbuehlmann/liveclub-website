"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { PublicGame } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  draft: "Entwurf",
  scheduled: "Geplant",
  live: "Live",
  paused: "Pausiert",
  finished: "Beendet",
  cancelled: "Abgesagt",
};

export default function PublicLiveGamePage() {
  const params = useParams<{ publicClubId: string; gameId: string }>();
  const [game, setGame] = useState<PublicGame | null>(null);

  useEffect(() => {
    const { db } = getFirebaseClient();
    return onSnapshot(doc(db, "publicGames", params.gameId), (snap) => {
      const data = snap.data();
      if (!data) return;
      setGame({
        gameId: snap.id,
        clubId: data.clubId,
        publicClubId: data.publicClubId,
        teamId: data.teamId,
        homeTeamName: data.homeTeamName,
        awayTeamName: data.awayTeamName,
        scoreHome: data.scoreHome ?? 0,
        scoreAway: data.scoreAway ?? 0,
        status: data.status,
        period: data.period,
        lastEventType: data.lastEventType,
      });
    });
  }, [params.gameId]);

  if (!game) {
    return (
      <main className="flex min-h-screen items-center justify-center text-gray-500">
        Wird geladen …
      </main>
    );
  }

  const isLive = game.status === "live" || game.status === "paused";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 px-4 text-center">
      {isLive && (
        <span className="animate-pulse rounded-full bg-red-600 px-4 py-1 text-sm font-bold uppercase tracking-wide text-white">
          LIVE
        </span>
      )}
      <div className="flex items-center gap-6 text-2xl font-semibold text-gray-900">
        <span>{game.homeTeamName}</span>
        <span className="text-5xl font-bold tabular-nums">
          {game.scoreHome}:{game.scoreAway}
        </span>
        <span>{game.awayTeamName}</span>
      </div>
      <p className="text-sm text-gray-500">
        {STATUS_LABELS[game.status] ?? game.status}
        {game.status === "paused" ? " (pausiert)" : ""}
      </p>
    </main>
  );
}
