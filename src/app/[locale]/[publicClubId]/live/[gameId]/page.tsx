"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { TeamIcon } from "@/components/TeamIcon";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicGame } from "@/lib/types";

export default function PublicLiveGamePage() {
  const t = useTranslations("publicGame");
  const params = useParams<{ publicClubId: string; gameId: string }>();
  const [game, setGame] = useState<PublicGame | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const { db } = getFirebaseClient();
    return onSnapshot(
      doc(db, "publicGames", params.gameId),
      (snap) => {
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
      },
      // A club with an expired/cancelled license is denied by
      // firestore.rules rather than simply missing.
      () => setUnavailable(true)
    );
  }, [params.gameId]);

  if (unavailable) {
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

  if (!game) {
    return (
      <div className="flex min-h-screen flex-col bg-brand-white dark:bg-brand-black">
        <PublicHeader />
        <main className="flex flex-1 items-center justify-center text-gray-500 dark:text-gray-400">
          {t("loading")}
        </main>
        <PublicFooter />
      </div>
    );
  }

  const isLive = game.status === "live" || game.status === "paused";

  return (
    <div className="flex min-h-screen flex-col bg-brand-white dark:bg-brand-black">
      <PublicHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
        {isLive && (
          <span className="animate-pulse rounded-full bg-brand-orange px-4 py-1 text-sm font-bold uppercase tracking-wide text-white">
            LIVE
          </span>
        )}
        {/* grid, not a plain flex row: "SV Test United" vs. "FC Haase" are
            very different lengths, and a flex row centers the *row as a
            whole* rather than keeping the score itself at the true visual
            center — two equal-width 1fr side columns pin the score in the
            middle regardless of how long either name is (2026-08-29
            report). */}
        <div className="grid w-full max-w-2xl grid-cols-[1fr_auto_1fr] items-center gap-4 text-2xl font-semibold text-gray-900 dark:text-white">
          <div className="flex items-center justify-end gap-3 overflow-hidden">
            <span className="truncate">{game.homeTeamName}</span>
            <TeamIcon publicClubId={game.homeClubPublicId} teamName={game.homeTeamName} size={48} />
          </div>
          <span className="px-2 font-teko text-6xl font-bold tabular-nums text-brand-emerald">
            {game.scoreHome}:{game.scoreAway}
          </span>
          <div className="flex items-center justify-start gap-3 overflow-hidden">
            <TeamIcon publicClubId={game.awayClubPublicId} teamName={game.awayTeamName} size={48} />
            <span className="truncate">{game.awayTeamName}</span>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t.has(`status.${game.status}`) ? t(`status.${game.status}`) : game.status}
          {game.status === "paused" ? ` (${t("pausedSuffix")})` : ""}
        </p>
      </main>
      <PublicFooter />
    </div>
  );
}
