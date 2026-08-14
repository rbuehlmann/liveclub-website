"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { useClubContext } from "@/components/club/ClubContext";
import { createGame } from "@/lib/firebase/functionsApi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Game, PublicTeamProfile, Team } from "@/lib/types";
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

const MAX_SEARCH_RESULTS = 8;

export default function GamesPage() {
  const t = useTranslations("games");
  const tCommon = useTranslations("common");
  const { club, role, teamIds: myTeamIds } = useClubContext();

  const [games, setGames] = useState<Game[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [allPublicTeams, setAllPublicTeams] = useState<PublicTeamProfile[]>([]);

  const [teamId, setTeamId] = useState("");
  const [isHomeGame, setIsHomeGame] = useState(true);
  const [opponentSearchTerm, setOpponentSearchTerm] = useState("");
  const [selectedOpponent, setSelectedOpponent] = useState<PublicTeamProfile | null>(null);
  const [manualOpponentName, setManualOpponentName] = useState("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
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
    // Flat, complete team index (name/shortName/publicTeamId/publicClubId +
    // denormalized club name/logo) — used for the opponent full-text
    // search below, no per-keystroke queries needed.
    const unsubPublicTeams = onSnapshot(collection(db, "publicTeams"), (snap) => {
      setAllPublicTeams(
        snap.docs.map((d) => ({
          publicTeamId: d.id,
          teamId: d.data().teamId,
          clubId: d.data().clubId,
          publicClubId: d.data().publicClubId,
          clubName: d.data().clubName,
          clubLogoUrl: d.data().clubLogoUrl ?? null,
          name: d.data().name,
          shortName: d.data().shortName,
          sport: d.data().sport,
        }))
      );
    });
    return () => {
      unsubGames();
      unsubTeams();
      unsubPublicTeams();
    };
  }, [club]);

  const opponentSearchResults = useMemo(() => {
    const term = opponentSearchTerm.trim().toLowerCase();
    if (!term || !club) return [];
    return allPublicTeams
      .filter((pt) => pt.publicClubId !== club.publicClubId)
      .filter(
        (pt) =>
          pt.name.toLowerCase().includes(term) ||
          pt.shortName.toLowerCase().includes(term) ||
          pt.clubName.toLowerCase().includes(term) ||
          pt.publicClubId.toLowerCase().includes(term) ||
          pt.publicTeamId.toLowerCase().includes(term)
      )
      .slice(0, MAX_SEARCH_RESULTS);
  }, [allPublicTeams, opponentSearchTerm, club]);

  if (!club) return null;

  const opponentDisplayName = selectedOpponent
    ? selectedOpponent.name
    : manualOpponentName.trim();

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

  function selectOpponent(pt: PublicTeamProfile) {
    setSelectedOpponent(pt);
    setOpponentSearchTerm("");
    setManualOpponentName("");
  }

  function clearOpponent() {
    setSelectedOpponent(null);
    setOpponentSearchTerm("");
  }

  function useSearchTermAsFreeText() {
    setManualOpponentName(opponentSearchTerm.trim());
    setOpponentSearchTerm("");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!club || !teamId || !opponentDisplayName) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createGame({
        clubId: club.clubId,
        teamId,
        isHomeGame,
        opponentPublicClubId: selectedOpponent?.publicClubId,
        opponentTeamId: selectedOpponent?.teamId,
        opponentTeamName: selectedOpponent ? undefined : manualOpponentName.trim(),
        scheduledStart: scheduledStart ? new Date(scheduledStart).toISOString() : undefined,
      });
      clearOpponent();
      setManualOpponentName("");
      setScheduledStart("");
    } catch (err) {
      setCreateError((err as { message?: string })?.message ?? "Anlegen fehlgeschlagen.");
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
              {selectedOpponent ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                  <div className="flex items-center gap-2">
                    {selectedOpponent.clubLogoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedOpponent.clubLogoUrl}
                        alt=""
                        className="h-6 w-6 rounded-full bg-white object-contain"
                      />
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 dark:bg-white/10 text-xs font-semibold text-gray-500 dark:text-gray-400">
                        {selectedOpponent.clubName.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span>
                      {selectedOpponent.name} ({selectedOpponent.clubName})
                    </span>
                  </div>
                  <Button type="button" variant="secondary" onClick={clearOpponent}>
                    Ändern
                  </Button>
                </div>
              ) : (
                <>
                  <TextField
                    label="Gegner suchen (Team, Verein oder ID)"
                    placeholder="z. B. FC Beispiel oder 756-234567"
                    value={opponentSearchTerm}
                    onChange={(e) => setOpponentSearchTerm(e.target.value)}
                  />
                  {opponentSearchTerm.trim() && (
                    <div className="flex flex-col gap-1 rounded-lg border border-gray-200 dark:border-white/10">
                      {opponentSearchResults.length === 0 ? (
                        <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Kein Treffer.</span>
                          <Button type="button" variant="secondary" onClick={useSearchTermAsFreeText}>
                            Als Name ohne Verknüpfung verwenden
                          </Button>
                        </div>
                      ) : (
                        opponentSearchResults.map((pt) => (
                          <button
                            key={pt.publicTeamId}
                            type="button"
                            onClick={() => selectOpponent(pt)}
                            className="flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/5"
                          >
                            {pt.clubLogoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={pt.clubLogoUrl}
                                alt=""
                                className="h-6 w-6 rounded-full bg-white object-contain"
                              />
                            ) : (
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 dark:bg-white/10 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                {pt.clubName.charAt(0).toUpperCase()}
                              </span>
                            )}
                            <span className="text-gray-900 dark:text-white">{pt.name}</span>
                            <span className="text-gray-400 dark:text-gray-500">· {pt.clubName}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  {manualOpponentName && !opponentSearchTerm.trim() && (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-white/10">
                      <span className="text-gray-700 dark:text-gray-300">
                        „{manualOpponentName}“ (ohne Verknüpfung)
                      </span>
                      <Button type="button" variant="secondary" onClick={() => setManualOpponentName("")}>
                        Ändern
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
            <TextField
              label={t("kickoff")}
              type="datetime-local"
              value={scheduledStart}
              onChange={(e) => setScheduledStart(e.target.value)}
            />
            {createError && <p className="text-sm text-red-600">{createError}</p>}
            <Button type="submit" disabled={creating || !opponentDisplayName}>
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
