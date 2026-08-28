"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { buildClubUrl, buildGameUrl } from "@/lib/publicRoutes";
import { TeamIcon } from "@/components/TeamIcon";
import { MobileAppPrompt } from "@/components/MobileAppPrompt";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicClub, PublicGame, PublicTeamProfile } from "@/lib/types";
import { useMobilePlatform } from "@/lib/useMobilePlatform";

export function PublicTeamPageClient({ publicTeamId }: { publicTeamId: string }) {
  const t = useTranslations("publicTeam");
  // Same wording as the club page for the shared bits (status labels,
  // "no live game", "open details") — one namespace, not duplicated.
  const tClub = useTranslations("publicClub");
  const platform = useMobilePlatform();
  const [team, setTeam] = useState<PublicTeamProfile | null>(null);
  const [club, setClub] = useState<PublicClub | null>(null);
  const [game, setGame] = useState<PublicGame | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const { db } = getFirebaseClient();
    return onSnapshot(
      doc(db, "publicTeams", publicTeamId),
      (snap) => {
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
      },
      // A club with an expired/cancelled license is denied by
      // firestore.rules rather than simply missing. (The server-rendered
      // wrapper already 404s the common case — this is just the rare race
      // where a team gets deleted between that check and hydration.)
      () => setNotFound(true)
    );
  }, [publicTeamId]);

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
      <div className="flex min-h-screen flex-col bg-brand-white dark:bg-brand-black">
        <PublicHeader />
        <main className="flex flex-1 items-center justify-center text-gray-500 dark:text-gray-400">
          {t("notFound")}
        </main>
        <PublicFooter />
      </div>
    );
  }

  if (!team) return null;

  if (platform) {
    return (
      <div className="flex min-h-screen flex-col bg-brand-white dark:bg-brand-black">
        <PublicHeader />
        <MobileAppPrompt
          platform={platform}
          logoUrl={team.clubLogoUrl}
          name={team.name}
          message={t("mobileAppMessage", { name: team.name })}
        />
        <PublicFooter />
      </div>
    );
  }

  const isLive = game && (game.status === "live" || game.status === "paused");

  return (
    <div className="flex min-h-screen flex-col bg-brand-white dark:bg-brand-black">
      <PublicHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      {team.clubLogoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.clubLogoUrl} alt="" className="h-24 w-24 rounded-full object-contain" />
      )}
      <h1 className="font-teko text-4xl font-bold text-gray-900 dark:text-white">{team.name}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {team.clubName} · {team.sport}
      </p>

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
            <span className="font-teko text-4xl font-bold tabular-nums text-gray-900 dark:text-white">
              {game.scoreHome}:{game.scoreAway}
            </span>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">{game.awayTeamName}</span>
            <TeamIcon publicClubId={game.awayClubPublicId} teamName={game.awayTeamName} size={40} />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {tClub.has(`status.${game.status}`) ? tClub(`status.${game.status}`) : game.status}
          </p>
          <Link
            href={buildGameUrl(team.publicClubId, game.gameId)}
            className="text-xs text-brand-red hover:underline"
          >
            {tClub("openDetails")}
          </Link>
        </div>
      ) : (
        <p className="text-lg text-gray-600 dark:text-gray-400">{tClub("noLiveGame")}</p>
      )}

      <p className="mt-8 text-xs text-gray-400 dark:text-gray-500">{t("bookmarkHint")}</p>
      <Link href={buildClubUrl(team.publicClubId)} className="text-xs text-brand-red hover:underline">
        {t("backToClub")}
      </Link>
      </main>
      <PublicFooter />
    </div>
  );
}
