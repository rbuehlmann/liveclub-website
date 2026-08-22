"use client";

import { useEffect, useState } from "react";
import { collection, doc, getDoc, onSnapshot, orderBy, query, Timestamp, where } from "firebase/firestore";
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
// Hardcoded fallback only — mirrors functions/src/lib/teamInfo.ts's
// TEAM_INFO_DEFAULTS, used only if neither settings/teamInfo (platform
// default) nor the club's own override provide a value. The server is
// always the real gate; a stale display number here can never let a
// request through that the backend would reject.
const FALLBACK_INFOS_PER_DAY = 10;
const FALLBACK_PUSHES_PER_DAY = 3;
const FALLBACK_TEAM_INFOS_ENABLED = true;
const FALLBACK_INFO_PUSH_ENABLED = true;

interface TeamInfoSettings {
  teamInfosEnabled: boolean;
  infoPushEnabled: boolean;
  infosPerDay: number;
  pushesPerDay: number;
}

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

  // Resolved the same way as the server (functions/src/lib/teamInfo.ts's
  // resolveTeamInfoSettings): club override, falling back to the
  // platform-wide default, falling back to the hardcoded constants above.
  // Previously this page ignored both and always showed/enforced the
  // hardcoded numbers — a superadmin raising the limit had no visible
  // effect on the dashboard even though the backend already honored it.
  const [globalSettings, setGlobalSettings] = useState<Partial<TeamInfoSettings> | null>(null);
  const [clubOverrides, setClubOverrides] = useState<Partial<TeamInfoSettings> | null>(null);

  useEffect(() => {
    const { db } = getFirebaseClient();
    getDoc(doc(db, "settings", "teamInfo"))
      .then((snap) => {
        setGlobalSettings((snap.data() as Partial<TeamInfoSettings> | undefined) ?? {});
      })
      // Falls back to the hardcoded constants (via pickSetting) rather than
      // leaving globalSettings stuck at null forever — a permission or
      // network hiccup here should never silently freeze the displayed
      // limit at "still loading".
      .catch(() => setGlobalSettings({}));
  }, []);

  useEffect(() => {
    if (!club) return;
    const { db } = getFirebaseClient();
    return onSnapshot(doc(db, "clubs", club.clubId), (snap) => {
      const data = snap.data();
      setClubOverrides({
        teamInfosEnabled: data?.teamInfosEnabled ?? undefined,
        infoPushEnabled: data?.infoPushEnabled ?? undefined,
        infosPerDay: data?.infosPerDay ?? undefined,
        pushesPerDay: data?.pushesPerDay ?? undefined,
      });
    });
  }, [club]);

  function pickSetting<K extends keyof TeamInfoSettings>(key: K, fallback: TeamInfoSettings[K]): TeamInfoSettings[K] {
    const clubValue = clubOverrides?.[key];
    if (clubValue !== undefined && clubValue !== null) return clubValue as TeamInfoSettings[K];
    const globalValue = globalSettings?.[key];
    if (globalValue !== undefined && globalValue !== null) return globalValue as TeamInfoSettings[K];
    return fallback;
  }

  const effectiveInfosPerDay = pickSetting("infosPerDay", FALLBACK_INFOS_PER_DAY);
  const effectivePushesPerDay = pickSetting("pushesPerDay", FALLBACK_PUSHES_PER_DAY);
  const teamInfosEnabled = pickSetting("teamInfosEnabled", FALLBACK_TEAM_INFOS_ENABLED);
  const infoPushEnabled = pickSetting("infoPushEnabled", FALLBACK_INFO_PUSH_ENABLED);

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
  const infosRemaining = Math.max(0, effectiveInfosPerDay - infosUsedToday);
  const pushesRemaining = Math.max(0, effectivePushesPerDay - pushesUsedToday);

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

  const canSubmit =
    teamInfosEnabled && !!teamId && !!title.trim() && !!text.trim() && infosRemaining > 0 && !creating;

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

            {!teamInfosEnabled && (
              <p className="text-sm text-red-600">
                Team-Infos sind für euren Verein aktuell deaktiviert. Kontaktiere den Support, falls das
                unerwartet ist.
              </p>
            )}

            {teamId && teamInfosEnabled && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Heute noch verfügbar: {infosRemaining} von {effectiveInfosPerDay} Team-Infos,{" "}
                {infoPushEnabled ? `${pushesRemaining} von ${effectivePushesPerDay} Pushs.` : "Push deaktiviert."}
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

            {infoPushEnabled && (
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
            )}

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
            Noch {Math.max(0, pushesRemaining - 1) + 1} von {effectivePushesPerDay} Pushs heute verfügbar.
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
