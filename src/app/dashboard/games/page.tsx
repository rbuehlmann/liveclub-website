"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { useClubContext } from "@/components/club/ClubContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Game, PublicTeam, Team } from "@/lib/types";
import { formatDateTimeDe } from "@/lib/date";
import { buildGameLiveUrl } from "@/lib/publicRoutes";
import { TeamIcon } from "@/components/TeamIcon";

// Games still to be played (or being played) always sort above the
// archive — a finished/cancelled game is done and shouldn't compete with
// "what's next" for attention.
const UPCOMING_STATUSES = new Set<Game["status"]>(["draft", "scheduled", "live", "paused"]);

const STATUS_BADGE_CLASSES: Record<Game["status"], string> = {
  draft: "bg-gray-200 text-gray-700 dark:bg-white/10 dark:text-gray-300",
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
  live: "animate-pulse bg-brand-red text-white",
  paused: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  finished: "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400",
  cancelled: "bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-500",
};

export default function GamesPage() {
  const t = useTranslations("games");
  const tCommon = useTranslations("common");
  const { club, role, teamIds: myTeamIds } = useClubContext();

  const [games, setGames] = useState<Game[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [teamId, setTeamId] = useState("");
  const [isHomeGame, setIsHomeGame] = useState(true);
  const [opponentPublicClubId, setOpponentPublicClubId] = useState("");
  const [opponentClub, setOpponentClub] = useState<{ name: string; logoUrl: string | null } | null>(
    null
  );
  const [opponentTeams, setOpponentTeams] = useState<PublicTeam[]>([]);
  const [opponentTeamId, setOpponentTeamId] = useState("");
  const [opponentTeamName, setOpponentTeamName] = useState("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [creating, setCreating] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  useEffect(() => {
    if (!club) return;
    const { db } = getFirebaseClient();
    const unsubGames = onSnapshot(
      query(collection(db, "clubs", club.clubId, "games"), orderBy("scheduledStart", "desc")),
      (snap) => {
        setGames(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              gameId: d.id,
              clubId: club.clubId,
              publicClubId: club.publicClubId,
              teamId: data.teamId,
              homeTeamName: data.homeTeamName,
              awayTeamName: data.awayTeamName,
              homeClubPublicId: data.homeClubPublicId ?? null,
              awayClubPublicId: data.awayClubPublicId ?? null,
              isHomeGame: data.isHomeGame,
              scheduledStart: data.scheduledStart?.toDate?.().toISOString() ?? null,
              status: data.status,
              score: data.score ?? { home: 0, away: 0 },
            } as Game;
          })
        );
      }
    );
    const unsubTeams = onSnapshot(collection(db, "clubs", club.clubId, "teams"), (snap) => {
      setTeams(
        snap.docs.map((d) => ({
          teamId: d.id,
          clubId: club.clubId,
          name: d.data().name,
          shortName: d.data().shortName,
          sport: d.data().sport,
          active: d.data().active ?? true,
        }))
      );
    });
    return () => {
      unsubGames();
      unsubTeams();
    };
  }, [club]);

  const trimmedOpponentId = opponentPublicClubId.trim();

  useEffect(() => {
    setOpponentTeamId("");
    if (!trimmedOpponentId) {
      setOpponentClub(null);
      setOpponentTeams([]);
      return;
    }
    const { db } = getFirebaseClient();
    const unsubClub = onSnapshot(doc(db, "publicClubs", trimmedOpponentId), (snap) => {
      if (!snap.exists()) {
        setOpponentClub(null);
        return;
      }
      const data = snap.data();
      setOpponentClub({ name: data.name, logoUrl: data.logoUrl ?? null });
    });
    const unsubTeams = onSnapshot(
      collection(db, "publicClubs", trimmedOpponentId, "teams"),
      (snap) => {
        setOpponentTeams(
          snap.docs.map((d) => ({
            teamId: d.id,
            name: d.data().name,
            shortName: d.data().shortName,
            sport: d.data().sport,
          }))
        );
      }
    );
    return () => {
      unsubClub();
      unsubTeams();
    };
  }, [trimmedOpponentId]);

  if (!club) return null;

  const opponentRequiresTeamPick = !!opponentClub && opponentTeams.length > 0;
  const opponentDisplayName = opponentRequiresTeamPick
    ? opponentTeams.find((t) => t.teamId === opponentTeamId)?.name ?? ""
    : opponentTeamName.trim();

  // A Redaktor (reporter) only manages the team(s) they're assigned to;
  // clubAdmin manages every team.
  const selectableTeams = role === "clubAdmin" ? teams : teams.filter((t) => myTeamIds.includes(t.teamId));
  const visibleGames =
    role === "reporter" ? games.filter((g) => myTeamIds.includes(g.teamId)) : games;

  // Soonest game next; live/paused games jump to the very top since
  // they need attention right now, ahead of anything merely scheduled.
  const upcomingGames = visibleGames
    .filter((g) => UPCOMING_STATUSES.has(g.status))
    .sort((a, b) => {
      const aLive = a.status === "live" || a.status === "paused";
      const bLive = b.status === "live" || b.status === "paused";
      if (aLive !== bLive) return aLive ? -1 : 1;
      const aTime = a.scheduledStart ? new Date(a.scheduledStart).getTime() : Infinity;
      const bTime = b.scheduledStart ? new Date(b.scheduledStart).getTime() : Infinity;
      return aTime - bTime;
    });
  // Archive: most recently finished first.
  const archivedGames = visibleGames
    .filter((g) => !UPCOMING_STATUSES.has(g.status))
    .sort((a, b) => {
      const aTime = a.scheduledStart ? new Date(a.scheduledStart).getTime() : 0;
      const bTime = b.scheduledStart ? new Date(b.scheduledStart).getTime() : 0;
      return bTime - aTime;
    });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const ownTeamName = teams.find((team) => team.teamId === teamId)?.name ?? "";
    if (!club || !teamId || !ownTeamName || !opponentDisplayName) return;
    setCreating(true);
    try {
      const { db } = getFirebaseClient();
      // "Our" side always gets our own club/team id; the opponent's ids are
      // only known/set if the clubAdmin's entered id matched a real
      // LiveClub-using club — otherwise their side just stays a plain name.
      const opponentClubPublicId = opponentClub ? trimmedOpponentId : null;
      const opponentTeamIdToStore = opponentRequiresTeamPick ? opponentTeamId : null;
      await addDoc(collection(db, "clubs", club.clubId, "games"), {
        clubId: club.clubId,
        publicClubId: club.publicClubId,
        teamId,
        homeTeamName: isHomeGame ? ownTeamName : opponentDisplayName,
        awayTeamName: isHomeGame ? opponentDisplayName : ownTeamName,
        homeClubPublicId: isHomeGame ? club.publicClubId : opponentClubPublicId,
        awayClubPublicId: isHomeGame ? opponentClubPublicId : club.publicClubId,
        homeTeamId: isHomeGame ? teamId : opponentTeamIdToStore,
        awayTeamId: isHomeGame ? opponentTeamIdToStore : teamId,
        isHomeGame,
        scheduledStart: scheduledStart ? Timestamp.fromDate(new Date(scheduledStart)) : null,
        status: "scheduled",
        score: { home: 0, away: 0 },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setOpponentPublicClubId("");
      setOpponentTeamId("");
      setOpponentTeamName("");
      setScheduledStart("");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t("title")}</h1>

      {(role === "clubAdmin" || role === "reporter") && (
        <Card>
          <h2 className="mb-4 font-semibold text-gray-900 dark:text-white">{t("newGame")}</h2>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("team")}</label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                required
                className="rounded-lg border border-gray-300 px-4 py-3 text-base"
              >
                <option value="" disabled>
                  –
                </option>
                {selectableTeams.map((team) => (
                  <option key={team.teamId} value={team.teamId}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={isHomeGame}
                onChange={(e) => setIsHomeGame(e.target.checked)}
              />
              Heimspiel
            </label>
            <div className="flex flex-col gap-2">
              <TextField
                label="Öffentliche Vereins-ID des Gegners (optional)"
                placeholder="z. B. 563001 — nur falls der Gegner auch LiveClub nutzt"
                value={opponentPublicClubId}
                onChange={(e) => setOpponentPublicClubId(e.target.value)}
              />
              {trimmedOpponentId && opponentClub && (
                <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                  {opponentClub.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={opponentClub.logoUrl}
                      alt=""
                      className="h-6 w-6 rounded-full bg-white object-contain"
                    />
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 dark:bg-white/10 text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {opponentClub.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span>{opponentClub.name} gefunden</span>
                </div>
              )}
              {trimmedOpponentId && !opponentClub && (
                <p className="text-xs text-amber-600">
                  Kein Verein mit dieser ID gefunden — Gegner wird als Freitext gespeichert.
                </p>
              )}
              {opponentRequiresTeamPick ? (
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mannschaft des Gegners</label>
                  <select
                    value={opponentTeamId}
                    onChange={(e) => setOpponentTeamId(e.target.value)}
                    required
                    className="rounded-lg border border-gray-300 px-4 py-3 text-base"
                  >
                    <option value="" disabled>
                      –
                    </option>
                    {opponentTeams.map((team) => (
                      <option key={team.teamId} value={team.teamId}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <TextField
                  label={
                    opponentClub ? `Mannschaft von ${opponentClub.name}` : "Name der gegnerischen Mannschaft"
                  }
                  value={opponentTeamName}
                  onChange={(e) => setOpponentTeamName(e.target.value)}
                  required
                />
              )}
            </div>
            <TextField
              label={t("kickoff")}
              type="datetime-local"
              value={scheduledStart}
              onChange={(e) => setScheduledStart(e.target.value)}
            />
            <Button type="submit" disabled={creating}>
              {creating ? tCommon("loading") : t("create")}
            </Button>
          </form>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {visibleGames.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">{t("empty")}</p>}
        {visibleGames.length > 0 && upcomingGames.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("noUpcoming")}</p>
        )}
        {upcomingGames.map((game) => (
          <GameCard key={game.gameId} game={game} t={t} />
        ))}
      </div>

      {archivedGames.length > 0 && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setShowArchive((v) => !v)}
            className="flex items-center gap-2 self-start text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
          >
            {t("archiveTitle")} ({archivedGames.length})
            <span>{showArchive ? "▲" : "▼"}</span>
          </button>
          {showArchive && archivedGames.map((game) => <GameCard key={game.gameId} game={game} t={t} />)}
        </div>
      )}
    </div>
  );
}

function GameCard({
  game,
  t,
}: {
  game: Game;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <Card className="flex items-center justify-between gap-4">
      <div>
        <div className="mb-1">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${STATUS_BADGE_CLASSES[game.status]}`}
          >
            {t(`status.${game.status}`)}
          </span>
        </div>
        <p className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
          <TeamIcon publicClubId={game.homeClubPublicId} teamName={game.homeTeamName} size={24} />
          {game.homeTeamName} – {game.awayTeamName}
          <TeamIcon publicClubId={game.awayClubPublicId} teamName={game.awayTeamName} size={24} />
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {formatDateTimeDe(game.scheduledStart)}
          {game.status !== "draft" && game.status !== "scheduled"
            ? ` · ${game.score.home}:${game.score.away}`
            : ""}
        </p>
      </div>
      <Link href={buildGameLiveUrl(game.gameId)}>
        <Button variant="secondary">{t("openLiveControl")}</Button>
      </Link>
    </Card>
  );
}
