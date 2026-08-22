"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { buildGameUrl } from "@/lib/publicRoutes";
import { TeamIcon } from "@/components/TeamIcon";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicClub, PublicGame } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  draft: "Entwurf",
  scheduled: "Geplant",
  live: "Live",
  paused: "Pausiert",
  finished: "Beendet",
  cancelled: "Abgesagt",
};

export function PublicClubPageClient({ publicClubId }: { publicClubId: string }) {
  const [club, setClub] = useState<PublicClub | null>(null);
  const [game, setGame] = useState<PublicGame | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const { db } = getFirebaseClient();
    return onSnapshot(
      doc(db, "publicClubs", publicClubId),
      (snap) => {
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
      },
      // A club with an expired/cancelled license is denied by firestore.rules
      // rather than simply missing, so it needs its own error path here.
      // (The server-rendered wrapper already 404s the common case — this is
      // just the rare race where a club gets deleted between that check and
      // hydration.)
      () => setNotFound(true)
    );
  }, [publicClubId]);

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
      <div className="flex min-h-screen flex-col bg-brand-white dark:bg-brand-black">
        <PublicHeader />
        <main className="flex flex-1 items-center justify-center text-gray-500 dark:text-gray-400">
          Verein wurde nicht gefunden.
        </main>
        <PublicFooter />
      </div>
    );
  }

  if (!club) return null;

  const isLive = game && (game.status === "live" || game.status === "paused");

  return (
    <div className="flex min-h-screen flex-col bg-brand-white dark:bg-brand-black">
      <PublicHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      {club.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={club.logoUrl} alt="" className="h-24 w-24 rounded-full object-contain" />
      )}
      <h1 className="font-teko text-4xl font-bold text-gray-900 dark:text-white">{club.name}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">{club.sport}</p>

      {game ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5 px-8 py-6">
          {isLive && (
            <span className="animate-pulse rounded-full bg-brand-red px-4 py-1 text-sm font-bold uppercase tracking-wide text-white">
              LIVE
            </span>
          )}
          <div className="flex items-center gap-4">
            <TeamIcon publicClubId={game.homeClubPublicId} teamName={game.homeTeamName} size={40} />
            <span className="text-lg font-semibold text-gray-900 dark:text-white">{game.homeTeamName}</span>
            <span className="font-teko text-5xl font-bold tabular-nums text-gray-900 dark:text-white">
              {game.scoreHome}:{game.scoreAway}
            </span>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">{game.awayTeamName}</span>
            <TeamIcon publicClubId={game.awayClubPublicId} teamName={game.awayTeamName} size={40} />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{STATUS_LABELS[game.status] ?? game.status}</p>
          <Link href={buildGameUrl(club.publicClubId, game.gameId)} className="text-xs text-brand-red hover:underline">
            Details öffnen
          </Link>
        </div>
      ) : (
        <p className="text-lg text-gray-600 dark:text-gray-400">Momentan läuft kein Spiel.</p>
      )}

      <p className="mt-8 text-xs text-gray-400 dark:text-gray-500">
        Diese Seite bookmarken, um deinen Verein zu folgen — beim Aktualisieren siehst du immer den
        neuesten Stand.
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500">Bald verfügbar: die LiveClub-App für Fans</p>
      </main>
      <PublicFooter />
    </div>
  );
}
