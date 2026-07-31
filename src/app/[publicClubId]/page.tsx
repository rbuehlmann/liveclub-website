"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { buildGameUrl } from "@/lib/publicRoutes";
import { TeamIcon } from "@/components/TeamIcon";
import { PublicClub, PublicGame } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  draft: "Entwurf",
  scheduled: "Geplant",
  live: "Live",
  paused: "Pausiert",
  finished: "Beendet",
  cancelled: "Abgesagt",
};

export default function PublicClubPage() {
  const params = useParams<{ publicClubId: string }>();
  const [club, setClub] = useState<PublicClub | null>(null);
  const [game, setGame] = useState<PublicGame | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const { db } = getFirebaseClient();
    return onSnapshot(doc(db, "publicClubs", params.publicClubId), (snap) => {
      if (!snap.exists()) {
        setNotFound(true);
        return;
      }
      const data = snap.data();
      setClub({
        publicClubId: snap.id,
        clubId: data.clubId,
        name: data.name,
        sport: data.sport,
        logoUrl: data.logoUrl ?? null,
        currentLiveGameId: data.currentLiveGameId ?? null,
      });
    });
  }, [params.publicClubId]);

  const liveGameId = club?.currentLiveGameId;

  useEffect(() => {
    if (!liveGameId) {
      setGame(null);
      return;
    }
    const { db } = getFirebaseClient();
    return onSnapshot(doc(db, "publicGames", liveGameId), (snap) => {
      const data = snap.data();
      if (!data) return;
      setGame({
        gameId: snap.id,
        clubId: data.clubId,
        publicClubId: data.publicClubId,
        teamId: data.teamId,
        homeTeamName: data.homeTeamName,
        awayTeamName: data.awayTeamName,
        homeClubPublicId: data.homeClubPublicId ?? null,
        awayClubPublicId: data.awayClubPublicId ?? null,
        scoreHome: data.scoreHome ?? 0,
        scoreAway: data.scoreAway ?? 0,
        status: data.status,
        period: data.period,
        lastEventType: data.lastEventType,
      });
    });
  }, [liveGameId]);

  if (notFound) {
    return (
      <main className="flex min-h-screen items-center justify-center text-gray-500">
        Verein wurde nicht gefunden.
      </main>
    );
  }

  if (!club) return null;

  const isLive = game && (game.status === "live" || game.status === "paused");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-brand-white px-4 text-center">
      {club.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={club.logoUrl} alt="" className="h-24 w-24 rounded-full object-contain" />
      )}
      <h1 className="font-teko text-4xl font-bold text-gray-900">{club.name}</h1>
      <p className="text-sm text-gray-500">{club.sport}</p>

      {game ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white px-8 py-6">
          {isLive && (
            <span className="animate-pulse rounded-full bg-brand-red px-4 py-1 text-sm font-bold uppercase tracking-wide text-white">
              LIVE
            </span>
          )}
          <div className="flex items-center gap-4">
            <TeamIcon publicClubId={game.homeClubPublicId} teamName={game.homeTeamName} size={40} />
            <span className="text-lg font-semibold text-gray-900">{game.homeTeamName}</span>
            <span className="font-teko text-5xl font-bold tabular-nums text-gray-900">
              {game.scoreHome}:{game.scoreAway}
            </span>
            <span className="text-lg font-semibold text-gray-900">{game.awayTeamName}</span>
            <TeamIcon publicClubId={game.awayClubPublicId} teamName={game.awayTeamName} size={40} />
          </div>
          <p className="text-sm text-gray-500">{STATUS_LABELS[game.status] ?? game.status}</p>
          <Link href={buildGameUrl(club.publicClubId, game.gameId)} className="text-xs text-brand-red hover:underline">
            Details öffnen
          </Link>
        </div>
      ) : (
        <p className="text-lg text-gray-600">Momentan läuft kein Spiel.</p>
      )}

      <p className="mt-8 text-xs text-gray-400">
        Diese Seite bookmarken, um deinen Verein zu folgen — beim Aktualisieren siehst du immer den
        neuesten Stand.
      </p>
      <p className="text-xs text-gray-400">Bald verfügbar: die LiveClub-App für Fans</p>
    </main>
  );
}
