"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { buildClubUrl, buildGameUrl } from "@/lib/publicRoutes";
import { TeamIcon } from "@/components/TeamIcon";
import { PublicClub, PublicGame, PublicTeamProfile } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  draft: "Entwurf",
  scheduled: "Geplant",
  live: "Live",
  paused: "Pausiert",
  finished: "Beendet",
  cancelled: "Abgesagt",
};

export default function PublicTeamPage() {
  const params = useParams<{ publicTeamId: string }>();
  const [team, setTeam] = useState<PublicTeamProfile | null>(null);
  const [club, setClub] = useState<PublicClub | null>(null);
  const [game, setGame] = useState<PublicGame | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const { db } = getFirebaseClient();
    return onSnapshot(doc(db, "publicTeams", params.publicTeamId), (snap) => {
      if (!snap.exists()) {
        setNotFound(true);
        return;
      }
      const data = snap.data();
      setTeam({
        publicTeamId: snap.id,
        teamId: data.teamId,
        clubId: data.clubId,
        publicClubId: data.publicClubId,
        clubName: data.clubName,
        clubLogoUrl: data.clubLogoUrl ?? null,
        name: data.name,
        shortName: data.shortName,
        sport: data.sport,
      });
    });
  }, [params.publicTeamId]);

  useEffect(() => {
    if (!team) return;
    const { db } = getFirebaseClient();
    return onSnapshot(doc(db, "publicClubs", team.publicClubId), (snap) => {
      const data = snap.data();
      if (!data) return;
      setClub({
        publicClubId: snap.id,
        clubId: data.clubId,
        name: data.name,
        sport: data.sport,
        logoUrl: data.logoUrl ?? null,
        currentLiveGameId: data.currentLiveGameId ?? null,
        currentLiveGameIdByTeam: data.currentLiveGameIdByTeam ?? {},
      });
    });
  }, [team]);

  const liveGameId = team ? club?.currentLiveGameIdByTeam?.[team.teamId] : undefined;

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
        Mannschaft wurde nicht gefunden.
      </main>
    );
  }

  if (!team) return null;

  const isLive = game && (game.status === "live" || game.status === "paused");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 px-4 text-center">
      {team.clubLogoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.clubLogoUrl} alt="" className="h-24 w-24 rounded-full object-contain" />
      )}
      <h1 className="font-teko text-4xl font-bold text-gray-900">{team.name}</h1>
      <p className="text-sm text-gray-500">
        {team.clubName} · {team.sport}
      </p>

      {game ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white px-8 py-6">
          {isLive && (
            <span className="animate-pulse rounded-full bg-red-600 px-4 py-1 text-sm font-bold uppercase tracking-wide text-white">
              LIVE
            </span>
          )}
          <div className="flex items-center gap-4">
            <TeamIcon publicClubId={game.homeClubPublicId} teamName={game.homeTeamName} size={40} />
            <span className="text-lg font-semibold text-gray-900">{game.homeTeamName}</span>
            <span className="font-teko text-4xl font-bold tabular-nums text-gray-900">
              {game.scoreHome}:{game.scoreAway}
            </span>
            <span className="text-lg font-semibold text-gray-900">{game.awayTeamName}</span>
            <TeamIcon publicClubId={game.awayClubPublicId} teamName={game.awayTeamName} size={40} />
          </div>
          <p className="text-sm text-gray-500">{STATUS_LABELS[game.status] ?? game.status}</p>
          <Link
            href={buildGameUrl(team.publicClubId, game.gameId)}
            className="text-xs text-blue-600 hover:underline"
          >
            Details öffnen
          </Link>
        </div>
      ) : (
        <p className="text-lg text-gray-600">Momentan läuft kein Spiel.</p>
      )}

      <p className="mt-8 text-xs text-gray-400">
        Diese Seite bookmarken, um dieser Mannschaft zu folgen.
      </p>
      <Link href={buildClubUrl(team.publicClubId)} className="text-xs text-blue-600 hover:underline">
        Zum ganzen Verein
      </Link>
    </main>
  );
}
