"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { useClubContext } from "@/components/club/ClubContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Game, Member, Team } from "@/lib/types";
import { formatDateTimeDe } from "@/lib/date";
import { buildGameLiveUrl } from "@/lib/publicRoutes";

export default function GamesPage() {
  const t = useTranslations("games");
  const tCommon = useTranslations("common");
  const { club, role } = useClubContext();
  const { user } = useAuth();

  const [games, setGames] = useState<Game[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const [teamId, setTeamId] = useState("");
  const [homeTeamName, setHomeTeamName] = useState("");
  const [awayTeamName, setAwayTeamName] = useState("");
  const [isHomeGame, setIsHomeGame] = useState(true);
  const [scheduledStart, setScheduledStart] = useState("");
  const [reporterUids, setReporterUids] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

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
              isHomeGame: data.isHomeGame,
              scheduledStart: data.scheduledStart?.toDate?.().toISOString() ?? null,
              status: data.status,
              score: data.score ?? { home: 0, away: 0 },
              reporterUids: data.reporterUids ?? [],
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
    const unsubMembers = onSnapshot(collection(db, "clubs", club.clubId, "members"), (snap) => {
      setMembers(
        snap.docs.map((d) => ({
          uid: d.id,
          role: d.data().role,
          email: d.data().email,
          displayName: d.data().displayName,
        }))
      );
    });
    return () => {
      unsubGames();
      unsubTeams();
      unsubMembers();
    };
  }, [club]);

  if (!club) return null;

  const visibleGames =
    role === "reporter" ? games.filter((g) => g.reporterUids.includes(user?.uid ?? "")) : games;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!club || !teamId || !homeTeamName || !awayTeamName) return;
    setCreating(true);
    try {
      const { db } = getFirebaseClient();
      await addDoc(collection(db, "clubs", club.clubId, "games"), {
        clubId: club.clubId,
        publicClubId: club.publicClubId,
        teamId,
        homeTeamName,
        awayTeamName,
        isHomeGame,
        scheduledStart: scheduledStart ? Timestamp.fromDate(new Date(scheduledStart)) : null,
        status: "scheduled",
        score: { home: 0, away: 0 },
        reporterUids,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setHomeTeamName("");
      setAwayTeamName("");
      setScheduledStart("");
      setReporterUids([]);
    } finally {
      setCreating(false);
    }
  }

  function toggleReporter(uid: string) {
    setReporterUids((prev) => (prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid]));
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">{t("title")}</h1>

      {role === "clubAdmin" && (
        <Card>
          <h2 className="mb-4 font-semibold text-gray-900">{t("newGame")}</h2>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">{t("team")}</label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                required
                className="rounded-lg border border-gray-300 px-4 py-3 text-base"
              >
                <option value="" disabled>
                  –
                </option>
                {teams.map((team) => (
                  <option key={team.teamId} value={team.teamId}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label={t("homeTeam")}
                value={homeTeamName}
                onChange={(e) => setHomeTeamName(e.target.value)}
                required
              />
              <TextField
                label={t("awayTeam")}
                value={awayTeamName}
                onChange={(e) => setAwayTeamName(e.target.value)}
                required
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={isHomeGame}
                onChange={(e) => setIsHomeGame(e.target.checked)}
              />
              Heimspiel
            </label>
            <TextField
              label={t("kickoff")}
              type="datetime-local"
              value={scheduledStart}
              onChange={(e) => setScheduledStart(e.target.value)}
            />
            {members.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">Reporter zuweisen</p>
                <div className="flex flex-col gap-1">
                  {members.map((m) => (
                    <label key={m.uid} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={reporterUids.includes(m.uid)}
                        onChange={() => toggleReporter(m.uid)}
                      />
                      {m.displayName ?? m.email ?? m.uid} ({m.role})
                    </label>
                  ))}
                </div>
              </div>
            )}
            <Button type="submit" disabled={creating}>
              {creating ? tCommon("loading") : t("create")}
            </Button>
          </form>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {visibleGames.length === 0 && <p className="text-sm text-gray-500">{t("empty")}</p>}
        {visibleGames.map((game) => (
          <Card key={game.gameId} className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-gray-900">
                {game.homeTeamName} – {game.awayTeamName}
              </p>
              <p className="text-sm text-gray-500">
                {formatDateTimeDe(game.scheduledStart)} · {t(`status.${game.status}`)}
                {game.status !== "draft" && game.status !== "scheduled"
                  ? ` · ${game.score.home}:${game.score.away}`
                  : ""}
              </p>
            </div>
            <Link href={buildGameLiveUrl(game.gameId)}>
              <Button variant="secondary">{t("openLiveControl")}</Button>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
