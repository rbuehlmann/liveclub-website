"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { useClubContext } from "@/components/club/ClubContext";
import {
  createGame,
  acceptGameTransfer,
  declineGameTransfer,
  requestGameTransfer,
  nudgeOpenGameInvite,
} from "@/lib/firebase/functionsApi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Game, Member, PublicTeamProfile, Team } from "@/lib/types";
import { formatDateTimeDe } from "@/lib/date";
import { buildClubUrl, buildGameLiveUrl } from "@/lib/publicRoutes";
import { TeamIcon } from "@/components/TeamIcon";

// A fixture is a single shared record now (see functions/src/callable/
// createGame.ts) — a club's own "Spiele" list is everything where it's
// either the home or away side, not a subcollection it owns exclusively.
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
// Keep in sync with functions/src/callable/createGame.ts's MAX_ADVANCE_DAYS.
const MAX_ADVANCE_DAYS = 31;

function maxScheduledStartValue(): string {
  const d = new Date(Date.now() + MAX_ADVANCE_DAYS * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function mapGameDoc(id: string, data: Record<string, unknown>): Game {
  const scheduledStart = data.scheduledStart as { toDate?: () => Date } | undefined;
  return {
    gameId: id,
    homeTeamName: data.homeTeamName as string,
    awayTeamName: data.awayTeamName as string,
    homeClubId: (data.homeClubId as string | null) ?? null,
    awayClubId: (data.awayClubId as string | null) ?? null,
    homeClubPublicId: (data.homeClubPublicId as string | null) ?? null,
    awayClubPublicId: (data.awayClubPublicId as string | null) ?? null,
    homeTeamId: (data.homeTeamId as string | null) ?? null,
    awayTeamId: (data.awayTeamId as string | null) ?? null,
    createdByClubId: data.createdByClubId as string,
    scheduledStart: scheduledStart?.toDate?.().toISOString() ?? null,
    status: data.status as Game["status"],
    score: (data.score as Game["score"]) ?? { home: 0, away: 0 },
    mainEditorUid: (data.mainEditorUid as string | null) ?? null,
    mainEditorClubId: data.mainEditorClubId as string,
    mainEditorDisplayName: (data.mainEditorDisplayName as string | null) ?? null,
    eligibleEditorUids: (data.eligibleEditorUids as string[]) ?? [],
    hasBeenTransferred: (data.hasBeenTransferred as boolean | undefined) ?? false,
    pendingTransfer: (data.pendingTransfer as Game["pendingTransfer"]) ?? null,
  };
}

export default function GamesPage() {
  const t = useTranslations("games");
  const tCommon = useTranslations("common");
  const { user } = useAuth();
  const { club, role, teamIds: myTeamIds } = useClubContext();

  const [homeGames, setHomeGames] = useState<Game[]>([]);
  const [awayGames, setAwayGames] = useState<Game[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [allPublicTeams, setAllPublicTeams] = useState<PublicTeamProfile[]>([]);

  const [teamId, setTeamId] = useState("");
  const [isHomeGame, setIsHomeGame] = useState(true);
  const [opponentSearchTerm, setOpponentSearchTerm] = useState("");
  const [selectedOpponent, setSelectedOpponent] = useState<PublicTeamProfile | null>(null);
  const [manualOpponentName, setManualOpponentName] = useState("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [wantsToBeEditor, setWantsToBeEditor] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createNotice, setCreateNotice] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false);

  useEffect(() => {
    if (!club) return;
    const { db } = getFirebaseClient();
    const unsubHome = onSnapshot(
      query(collection(db, "games"), where("homeClubId", "==", club.clubId)),
      (snap) => setHomeGames(snap.docs.map((d) => mapGameDoc(d.id, d.data())))
    );
    const unsubAway = onSnapshot(
      query(collection(db, "games"), where("awayClubId", "==", club.clubId)),
      (snap) => setAwayGames(snap.docs.map((d) => mapGameDoc(d.id, d.data())))
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
          teamIds: d.data().teamIds ?? [],
          email: d.data().email ?? null,
          displayName: d.data().displayName ?? null,
        }))
      );
    });
    // Flat, complete team index (name/shortName/publicTeamId/publicClubId +
    // denormalized club name/logo) — used for the opponent full-text search
    // below, no per-keystroke queries needed.
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
      unsubHome();
      unsubAway();
      unsubTeams();
      unsubMembers();
      unsubPublicTeams();
    };
  }, [club]);

  const games = useMemo(() => {
    const byId = new Map<string, Game>();
    for (const g of [...homeGames, ...awayGames]) byId.set(g.gameId, g);
    return Array.from(byId.values());
  }, [homeGames, awayGames]);

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

  if (!club || !user) return null;

  const opponentDisplayName = selectedOpponent ? selectedOpponent.name : manualOpponentName.trim();

  // A Redaktor (reporter) only manages the team(s) they're assigned to;
  // clubAdmin manages every team. A game's "own team" depends on which side
  // (home/away) this club is on — there's no single teamId on the game
  // itself anymore now that a fixture is one shared record (see
  // functions/src/callable/createGame.ts).
  const selectableTeams = role === "clubAdmin" ? teams : teams.filter((tm) => myTeamIds.includes(tm.teamId));
  const visibleGames =
    role === "reporter"
      ? games.filter((g) => {
          const ownTeamId = g.homeClubId === club.clubId ? g.homeTeamId : g.awayTeamId;
          return !!ownTeamId && myTeamIds.includes(ownTeamId);
        })
      : games;

  const upcomingGames = [...visibleGames]
    .filter((g) => UPCOMING_STATUSES.has(g.status))
    .sort((a, b) => {
      const aLive = a.status === "live" || a.status === "paused";
      const bLive = b.status === "live" || b.status === "paused";
      if (aLive !== bLive) return aLive ? -1 : 1;
      const aTime = a.scheduledStart ? new Date(a.scheduledStart).getTime() : Infinity;
      const bTime = b.scheduledStart ? new Date(b.scheduledStart).getTime() : Infinity;
      return aTime - bTime;
    });
  const archivedGames = [...visibleGames]
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
    if (!club || !teamId || !opponentDisplayName || !scheduledStart) return;
    setCreating(true);
    setCreateError(null);
    setCreateNotice(null);
    try {
      const result = await createGame({
        clubId: club.clubId,
        teamId,
        isHomeGame,
        opponentPublicClubId: selectedOpponent?.publicClubId,
        opponentTeamId: selectedOpponent?.teamId,
        opponentTeamName: selectedOpponent ? undefined : manualOpponentName.trim(),
        scheduledStart: scheduledStart ? new Date(scheduledStart).toISOString() : undefined,
        selfAsEditor: wantsToBeEditor,
      });
      if (result.alreadyExisted) {
        setCreateNotice(
          "Dieses Spiel wurde bereits von der anderen Seite erfasst — es erscheint unten in eurer Liste."
        );
      }
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
                {selectableTeams.map((tm) => (
                  <option key={tm.teamId} value={tm.teamId}>
                    {tm.name}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={isHomeGame} onChange={(e) => setIsHomeGame(e.target.checked)} />
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
              required
              autoComplete="off"
              max={maxScheduledStartValue()}
              value={scheduledStart}
              onChange={(e) => setScheduledStart(e.target.value)}
            />
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={wantsToBeEditor}
                  onChange={(e) => setWantsToBeEditor(e.target.checked)}
                />
                Ich möchte selbst Redaktor für dieses Spiel sein
              </label>
              {!wantsToBeEditor && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Das Spiel bleibt offen — alle berechtigten Redaktoren erhalten eine Einladungs-Mail, wer
                  zuerst annimmt, übernimmt.
                </p>
              )}
            </div>
            {createError && <p className="text-sm text-red-600">{createError}</p>}
            {createNotice && <p className="text-sm text-blue-700 dark:text-blue-400">{createNotice}</p>}
            <Button type="submit" disabled={creating || !opponentDisplayName || !scheduledStart}>
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
          <GameCard
            key={game.gameId}
            game={game}
            t={t}
            ownClubId={club.clubId}
            ownPublicClubId={club.publicClubId}
            userUid={user.uid}
            members={members}
            isClubAdmin={role === "clubAdmin"}
          />
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
          {showArchive &&
            archivedGames.map((game) => (
              <GameCard
                key={game.gameId}
                game={game}
                t={t}
                ownClubId={club.clubId}
                ownPublicClubId={club.publicClubId}
                userUid={user.uid}
                members={members}
                isClubAdmin={role === "clubAdmin"}
              />
            ))}
        </div>
      )}
    </div>
  );
}

function GameCard({
  game,
  t,
  ownClubId,
  ownPublicClubId,
  userUid,
  members,
  isClubAdmin,
}: {
  game: Game;
  t: ReturnType<typeof useTranslations>;
  ownClubId: string;
  ownPublicClubId: string;
  userUid: string;
  members: Member[];
  isClubAdmin: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showTransferPicker, setShowTransferPicker] = useState(false);
  const [transferTargetUid, setTransferTargetUid] = useState("");
  const [nudging, setNudging] = useState(false);
  const [nudgeMessage, setNudgeMessage] = useState<string | null>(null);

  const isMainEditor = game.mainEditorUid === userUid;
  const pendingTransferTargetsMe = game.pendingTransfer?.kind === "direct" && game.pendingTransfer.toUid === userUid;
  // Free, no-invitation-needed self-claim is only available while nobody's
  // ever taken administration away from the club that created the fixture
  // — once a transfer has happened once, the other side can no longer just
  // click it back; only the current editor can hand it over again (see
  // acceptGameTransfer.ts). The "clubBroadcast" case covers the current
  // editor explicitly asking to hand back to the opponent club (any of
  // their eligible editors may accept it).
  const crossClubClaimable =
    !!game.mainEditorUid &&
    !isMainEditor &&
    game.eligibleEditorUids.includes(userUid) &&
    ownClubId !== game.mainEditorClubId &&
    ((!game.pendingTransfer && !game.hasBeenTransferred) || game.pendingTransfer?.kind === "clubBroadcast");
  // "Offen" (2026-08-22 decision) — nobody was assigned at creation time
  // (see createGame.ts's selfAsEditor:false). Same first-click-wins claim
  // as crossClubClaimable, just without requiring a different club — see
  // acceptGameTransfer.ts's path 4.
  const openClaimable = !game.mainEditorUid && game.eligibleEditorUids.includes(userUid);
  // Only own-club colleagues can be named as a direct handoff target — the
  // opposing club's members aren't readable client-side (privacy, see
  // firestore.rules), so a handback to the opponent club is a broadcast to
  // "whoever's eligible over there" instead (see the button below).
  const ownColleagues = members.filter(
    (m) => game.eligibleEditorUids.includes(m.uid) && m.uid !== userUid
  );
  const opponentClubLinked = !!game.homeClubId && !!game.awayClubId;
  const opponentTeamName = ownClubId === game.homeClubId ? game.awayTeamName : game.homeTeamName;
  const clubBroadcastPending = game.pendingTransfer?.kind === "clubBroadcast";

  async function runAction(fn: () => Promise<unknown>) {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      setActionError((err as { message?: string })?.message ?? "Aktion fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
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
          {UPCOMING_STATUSES.has(game.status) &&
            (game.mainEditorUid ? (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Hauptredaktor: {game.mainEditorDisplayName ?? (isMainEditor ? "Du" : "—")}
              </p>
            ) : (
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                Offen — noch kein Redaktor zugeteilt
              </p>
            ))}
        </div>
        {isMainEditor ? (
          <Link href={buildGameLiveUrl(game.gameId)}>
            <Button variant="secondary">{t("openLiveControl")}</Button>
          </Link>
        ) : (
          <Link href={buildClubUrl(ownPublicClubId)} target="_blank">
            <Button variant="secondary">Live mitverfolgen</Button>
          </Link>
        )}
      </div>

      {pendingTransferTargetsMe && (
        <div className="flex flex-col gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:bg-blue-500/10 dark:text-blue-300">
          <p>Du wurdest eingeladen, dieses Spiel zu übernehmen.</p>
          <div className="flex gap-2">
            <Button
              type="button"
              disabled={busy}
              onClick={() => runAction(() => acceptGameTransfer(game.gameId))}
            >
              Übernehmen
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => runAction(() => declineGameTransfer(game.gameId))}
            >
              Ablehnen
            </Button>
          </div>
        </div>
      )}

      {openClaimable && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          <span>Noch niemand administriert dieses Spiel — du bist berechtigt zu übernehmen.</span>
          <Button
            type="button"
            disabled={busy}
            onClick={() => runAction(() => acceptGameTransfer(game.gameId))}
          >
            Übernehmen
          </Button>
        </div>
      )}

      {!game.mainEditorUid && isClubAdmin && UPCOMING_STATUSES.has(game.status) && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={nudging}
            onClick={async () => {
              setNudging(true);
              setNudgeMessage(null);
              try {
                const result = await nudgeOpenGameInvite(game.gameId);
                setNudgeMessage(
                  result.sentCount > 0
                    ? `Erinnerung an ${result.sentCount} Redaktor(en) gesendet.`
                    : "Keine berechtigten Redaktoren gefunden."
                );
              } catch (err) {
                setNudgeMessage((err as { message?: string })?.message ?? "Senden fehlgeschlagen.");
              } finally {
                setNudging(false);
              }
            }}
          >
            {nudging ? "Wird gesendet …" : "Erinnerung erneut senden"}
          </Button>
          {nudgeMessage && <span className="text-xs text-gray-500 dark:text-gray-400">{nudgeMessage}</span>}
        </div>
      )}

      {crossClubClaimable && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:bg-blue-500/10 dark:text-blue-300">
          <span>Aktuell administriert die andere Seite — du bist berechtigt zu übernehmen.</span>
          <Button
            type="button"
            disabled={busy}
            onClick={() => runAction(() => acceptGameTransfer(game.gameId))}
          >
            Übernehmen
          </Button>
        </div>
      )}

      {isMainEditor && clubBroadcastPending && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Warte auf Rückmeldung von {opponentTeamName} …
        </p>
      )}

      {isMainEditor && !game.pendingTransfer && UPCOMING_STATUSES.has(game.status) && (
        <div className="flex flex-col gap-2">
          {ownColleagues.length > 0 && (
            <>
              {showTransferPicker ? (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={transferTargetUid}
                    onChange={(e) => setTransferTargetUid(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
                  >
                    <option value="">Person wählen …</option>
                    {ownColleagues.map((m) => (
                      <option key={m.uid} value={m.uid}>
                        {m.displayName ?? m.email ?? m.uid}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy || !transferTargetUid}
                    onClick={() =>
                      runAction(async () => {
                        await requestGameTransfer({ gameId: game.gameId, toUid: transferTargetUid });
                        setShowTransferPicker(false);
                        setTransferTargetUid("");
                      })
                    }
                  >
                    Anfragen
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowTransferPicker(true)}
                  className="self-start text-sm text-brand-red hover:underline"
                >
                  Verantwortung übertragen …
                </button>
              )}
            </>
          )}
          {opponentClubLinked && (
            <button
              type="button"
              disabled={busy}
              onClick={() => runAction(() => requestGameTransfer({ gameId: game.gameId, toOpponentClub: true }))}
              className="self-start text-sm text-brand-red hover:underline"
            >
              An {opponentTeamName} zurückgeben …
            </button>
          )}
        </div>
      )}

      {actionError && <p className="text-sm text-red-600">{actionError}</p>}
    </Card>
  );
}
