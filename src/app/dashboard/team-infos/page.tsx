"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, Timestamp, where } from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { useClubContext } from "@/components/club/ClubContext";
import { createTeamInfo } from "@/lib/firebase/functionsApi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TeamIcon } from "@/components/TeamIcon";
import { Team, TeamInfo } from "@/lib/types";
import { formatDateTimeDe } from "@/lib/date";

const MAX_TITLE_LENGTH = 100;
const MAX_TEXT_LENGTH = 500;
// Mirrors functions/src/lib/teamInfo.ts's TEAM_INFO_DEFAULTS — only used
// here for the optimistic "X von Y verfügbar" label before a team is
// selected / before the live count query resolves. The server is always
// the real gate; a stale display number here can never let a request
// through that the backend would reject.
const DEFAULT_INFOS_PER_DAY = 10;
const DEFAULT_PUSHES_PER_DAY = 3;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function mapTeamInfoDoc(id: string, data: Record<string, unknown>): TeamInfo {
  const createdAt = data.createdAt as Timestamp | undefined;
  const pushSentAt = data.pushSentAt as Timestamp | undefined;
  return {
    infoId: id,
    teamId: data.teamId as string,
    publicTeamId: (data.publicTeamId as string | null) ?? null,
    clubId: data.clubId as string,
    publicClubId: (data.publicClubId as string | null) ?? null,
    teamName: data.teamName as string,
    clubName: data.clubName as string,
    clubLogoUrl: (data.clubLogoUrl as string | null) ?? null,
    title: data.title as string,
    text: data.text as string,
    createdAt: createdAt?.toDate?.().toISOString() ?? null,
    createdByUid: data.createdByUid as string,
    pushSent: (data.pushSent as boolean) ?? false,
    pushSentAt: pushSentAt?.toDate?.().toISOString() ?? null,
  };
}

export default function TeamInfosPage() {
  const { club, role, teamIds: myTeamIds } = useClubContext();

  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [sendPush, setSendPush] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [confirmingPush, setConfirmingPush] = useState(false);

  const [recentInfos, setRecentInfos] = useState<TeamInfo[]>([]);
  const [infosToday, setInfosToday] = useState<TeamInfo[]>([]);

  useEffect(() => {
    if (!club) return;
    const { db } = getFirebaseClient();
    return onSnapshot(collection(db, "clubs", club.clubId, "teams"), (snap) => {
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
  }, [club]);

  const selectableTeams = role === "clubAdmin" ? teams : teams.filter((t) => myTeamIds.includes(t.teamId));

  useEffect(() => {
    if (!teamId) {
      setRecentInfos([]);
      setInfosToday([]);
      return;
    }
    const { db } = getFirebaseClient();
    const unsubRecent = onSnapshot(
      query(collection(db, "teamInfos"), where("teamId", "==", teamId), orderBy("createdAt", "desc")),
      (snap) => setRecentInfos(snap.docs.slice(0, 20).map((d) => mapTeamInfoDoc(d.id, d.data())))
    );
    const unsubToday = onSnapshot(
      query(
        collection(db, "teamInfos"),
        where("teamId", "==", teamId),
        where("createdAt", ">=", Timestamp.fromDate(startOfToday()))
      ),
      (snap) => setInfosToday(snap.docs.map((d) => mapTeamInfoDoc(d.id, d.data())))
    );
    return () => {
      unsubRecent();
      unsubToday();
    };
  }, [teamId]);

  if (!club) return null;

  const infosUsedToday = infosToday.length;
  const pushesUsedToday = infosToday.filter((i) => i.pushSent).length;
  const infosRemaining = Math.max(0, DEFAULT_INFOS_PER_DAY - infosUsedToday);
  const pushesRemaining = Math.max(0, DEFAULT_PUSHES_PER_DAY - pushesUsedToday);

  function resetForm() {
    setTitle("");
    setText("");
    setSendPush(false);
  }

  async function submit() {
    if (!teamId || !title.trim() || !text.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createTeamInfo({ clubId: club!.clubId, teamId, title: title.trim(), text: text.trim(), sendPush });
      resetForm();
    } catch (err) {
      setCreateError((err as { message?: string })?.message ?? "Erstellen fehlgeschlagen.");
    } finally {
      setCreating(false);
      setConfirmingPush(false);
    }
  }

  function handleSubmitClick() {
    if (!teamId || !title.trim() || !text.trim()) return;
    if (sendPush) {
      setConfirmingPush(true);
    } else {
      submit();
    }
  }

  const canSubmit = !!teamId && !!title.trim() && !!text.trim() && infosRemaining > 0 && !creating;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Team-Infos</h1>

      {(role === "clubAdmin" || role === "reporter") && (
        <Card>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">Neue Team-Info</h2>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Kurze Mitteilung deines Teams — erscheint sofort im Feed der App, zwischen den Spielen.
            Kein Entwurf, keine Bilder, keine Kommentare — nur ein kurzer Titel und Text.
          </p>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mannschaft</label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="rounded-lg border border-gray-300 px-4 py-3 text-base dark:border-white/10 dark:bg-white/5 dark:text-white"
              >
                <option value="" disabled>
                  –
                </option>
                {selectableTeams.map((t) => (
                  <option key={t.teamId} value={t.teamId}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {teamId && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Heute noch verfügbar: {infosRemaining} von {DEFAULT_INFOS_PER_DAY} Team-Infos,{" "}
                {pushesRemaining} von {DEFAULT_PUSHES_PER_DAY} Pushs.
              </p>
            )}

            <TextField
              label={`Titel (max. ${MAX_TITLE_LENGTH} Zeichen)`}
              value={title}
              maxLength={MAX_TITLE_LENGTH}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z. B. Spiel verschoben"
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Text (max. {MAX_TEXT_LENGTH} Zeichen)
              </label>
              <textarea
                value={text}
                maxLength={MAX_TEXT_LENGTH}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                placeholder="Kurze, relevante Info für deine Follower."
                className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20 dark:border-white/15 dark:bg-white/5 dark:text-white"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={sendPush}
                disabled={pushesRemaining <= 0}
                onChange={(e) => setSendPush(e.target.checked)}
              />
              Als Push-Mitteilung senden
              {pushesRemaining <= 0 && (
                <span className="text-xs text-gray-400 dark:text-gray-500">(Tageslimit erreicht)</span>
              )}
            </label>

            {createError && <p className="text-sm text-red-600">{createError}</p>}
            {infosRemaining <= 0 && teamId && (
              <p className="text-sm text-red-600">Tageslimit für Team-Infos erreicht.</p>
            )}

            <Button disabled={!canSubmit} onClick={handleSubmitClick}>
              {creating ? "Wird gesendet …" : sendPush ? "Veröffentlichen & senden" : "Veröffentlichen"}
            </Button>
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {teamId && recentInfos.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Noch keine Team-Infos für diese Mannschaft.</p>
        )}
        {recentInfos.map((info) => (
          <Card key={info.infoId} className="flex items-start gap-3">
            <TeamIcon publicClubId={info.publicClubId} teamName={info.teamName} size={36} />
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-white">
                {info.teamName} <span className="font-normal text-gray-500 dark:text-gray-400">· {info.title}</span>
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{info.text}</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                {formatDateTimeDe(info.createdAt)}
                {info.pushSent ? " · Push gesendet" : ""}
              </p>
            </div>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={confirmingPush}
        title="Push-Mitteilung senden?"
        body={
          <>
            Du bist für den Inhalt dieser Mitteilung verantwortlich. Sende nur relevante Informationen zu
            deinem Team.
            <br />
            <br />
            Nicht erlaubt: Werbung/Spam, rechtswidrige oder beleidigende Inhalte sowie Inhalte, die Rechte
            Dritter verletzen.
            <br />
            <br />
            Mit dem Senden bestätigst du, dass die Mitteilung den{" "}
            <a href="/terms-of-service" target="_blank" className="text-brand-red underline">
              LiveClub-Nutzungsbedingungen
            </a>{" "}
            entspricht.
            <br />
            <br />
            Noch {Math.max(0, pushesRemaining - 1) + 1} von {DEFAULT_PUSHES_PER_DAY} Pushs heute verfügbar.
          </>
        }
        confirmLabel={creating ? "Wird gesendet …" : "Veröffentlichen & senden"}
        cancelLabel="Abbrechen"
        onConfirm={submit}
        onCancel={() => setConfirmingPush(false)}
      />
    </div>
  );
}
