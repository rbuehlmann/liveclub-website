"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebaseClient } from "@/lib/firebase/client";
import { adminSendDemoTestPush, adminStartDemoTestGame, adminUpdateDemoClub } from "@/lib/firebase/functionsApi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatDateTimeDe } from "@/lib/date";

interface DemoClubStatus {
  clubId?: string;
  publicClubId?: string;
  clubName: string;
  teamName: string;
  enabled: boolean;
  postIntervalHours: number;
  pushesPerDay: number;
  liveGamesPerDay: number;
  logoUrl: string | null;
  lastPostAt: string | null;
  lastPushSentAt: string | null;
  postsToday: number;
  pushesSentToday: number;
  activeGameId: string | null;
  lastGameStartedAt: string | null;
  lastGameEndedAt: string | null;
  testGameId: string | null;
  testGameStartedAt: string | null;
  lastTestGameStartedAt: string | null;
  lastTestGameEndedAt: string | null;
  lastTestPushSentAt: string | null;
}

function toIso(value: Timestamp | undefined | null): string | null {
  return value?.toDate?.().toISOString() ?? null;
}

export default function AdminDemoClubPage() {
  const [status, setStatus] = useState<DemoClubStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startingTestGame, setStartingTestGame] = useState(false);
  const [sendingTestPush, setSendingTestPush] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  async function reload() {
    setLoadError(null);
    try {
      const { db } = getFirebaseClient();
      const snap = await getDoc(doc(db, "settings", "demoClub"));
      const data = snap.data();
      // publicClubId is denormalized onto this doc by adminUpdateDemoClub
      // (Admin SDK) rather than read here directly from clubs/{clubId} —
      // that collection's read rule is member-only, which a platformAdmin
      // browsing this page doesn't automatically satisfy.
      setStatus({
        clubId: data?.clubId,
        publicClubId: data?.publicClubId,
        clubName: data?.clubName ?? "",
        teamName: data?.teamName ?? "",
        enabled: data?.enabled ?? false,
        postIntervalHours: data?.postIntervalHours ?? 2,
        pushesPerDay: data?.pushesPerDay ?? 3,
        liveGamesPerDay: data?.liveGamesPerDay ?? 1,
        logoUrl: data?.logoUrl ?? null,
        lastPostAt: toIso(data?.lastPostAt),
        lastPushSentAt: toIso(data?.lastPushSentAt),
        postsToday: data?.postsToday ?? 0,
        pushesSentToday: data?.pushesSentToday ?? 0,
        activeGameId: data?.activeGameId ?? null,
        lastGameStartedAt: toIso(data?.lastGameStartedAt),
        lastGameEndedAt: toIso(data?.lastGameEndedAt),
        testGameId: data?.testGameId ?? null,
        testGameStartedAt: toIso(data?.testGameStartedAt),
        lastTestGameStartedAt: toIso(data?.lastTestGameStartedAt),
        lastTestGameEndedAt: toIso(data?.lastTestGameEndedAt),
        lastTestPushSentAt: toIso(data?.lastTestPushSentAt),
      });
    } catch (err) {
      setLoadError((err as { message?: string })?.message ?? "Laden fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleSave() {
    if (!status) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await adminUpdateDemoClub({
        enabled: status.enabled,
        postIntervalHours: status.postIntervalHours,
        pushesPerDay: status.pushesPerDay,
        liveGamesPerDay: status.liveGamesPerDay,
        clubName: status.clubName,
        teamName: status.teamName,
      });
      setMessage("Gespeichert ✓");
      await reload();
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { storage } = getFirebaseClient();
      const fileRef = ref(storage, `branding/demoLogo-${Date.now()}-${file.name}`);
      await uploadBytes(fileRef, file, { cacheControl: "public, max-age=2592000" });
      const logoUrl = await getDownloadURL(fileRef);
      await adminUpdateDemoClub({
        enabled: status?.enabled ?? false,
        postIntervalHours: status?.postIntervalHours ?? 2,
        pushesPerDay: status?.pushesPerDay ?? 3,
        liveGamesPerDay: status?.liveGamesPerDay ?? 1,
        logoUrl,
        clubName: status?.clubName,
        teamName: status?.teamName,
      });
      await reload();
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Logo-Upload fehlgeschlagen.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleStartTestGame() {
    setStartingTestGame(true);
    setTestMessage(null);
    setTestError(null);
    try {
      await adminStartDemoTestGame();
      setTestMessage("Testspiel gestartet — läuft ca. 5 Minuten.");
      await reload();
    } catch (err) {
      setTestError((err as { message?: string })?.message ?? "Testspiel konnte nicht gestartet werden.");
    } finally {
      setStartingTestGame(false);
    }
  }

  async function handleSendTestPush() {
    setSendingTestPush(true);
    setTestMessage(null);
    setTestError(null);
    try {
      await adminSendDemoTestPush();
      setTestMessage("Test-Push gesendet ✓");
    } catch (err) {
      setTestError((err as { message?: string })?.message ?? "Test-Push fehlgeschlagen.");
    } finally {
      setSendingTestPush(false);
    }
  }

  if (loading) return <p className="text-gray-500 dark:text-gray-400">Wird geladen …</p>;

  if (loadError || !status) {
    return <p className="text-sm text-red-600">{loadError ?? "Fehler."}</p>;
  }

  if (!status.clubId) {
    return (
      <Card>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Der Demo-Verein wurde noch nicht eingerichtet (einmaliges Setup-Skript nicht ausgeführt).
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Demo-Verein</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        „LiveDemo“ — ein dauerhaft eingerichteter Verein für App-Store-Reviews und Testkunden. Postet
        automatisch, sendet Test-Pushs und startet/beendet regelmässig ein kurzes Live-Spiel, solange
        aktiviert.
      </p>

      <Card className="border-blue-200 dark:border-blue-500/20">
        <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">Schnelltest</h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Löst sofort ein kurzes (~5 Min.) Testspiel bzw. einen Push aus — unabhängig vom
          normalen Intervall oben, beliebig oft wiederholbar. Nur zum schnelleren Testen.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleStartTestGame} disabled={startingTestGame || !!status.testGameId}>
            {status.testGameId
              ? "Testspiel läuft …"
              : startingTestGame
                ? "Wird gestartet …"
                : "Jetzt Testspiel starten (5 Min.)"}
          </Button>
          <Button variant="secondary" onClick={handleSendTestPush} disabled={sendingTestPush}>
            {sendingTestPush ? "Wird gesendet …" : "Jetzt Test-Push senden"}
          </Button>
        </div>
        {status.testGameId && status.testGameStartedAt && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Gestartet um {formatDateTimeDe(status.testGameStartedAt)}, endet automatisch nach ~5 Minuten.
          </p>
        )}
        {testError && <p className="mt-2 text-sm text-red-600">{testError}</p>}
        {testMessage && <p className="mt-2 text-sm text-green-700">{testMessage}</p>}
      </Card>

      <Card>
        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={status.enabled}
              onChange={(e) => setStatus({ ...status, enabled: e.target.checked })}
            />
            Demo-Modus aktiv
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Vereinsname</label>
              <input
                type="text"
                value={status.clubName}
                onChange={(e) => setStatus({ ...status, clubName: e.target.value })}
                className="rounded-lg border border-gray-300 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Teamname</label>
              <input
                type="text"
                value={status.teamName}
                onChange={(e) => setStatus({ ...status, teamName: e.target.value })}
                className="rounded-lg border border-gray-300 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Post-Intervall (Stunden)
              </label>
              <input
                type="number"
                min={1}
                value={status.postIntervalHours}
                onChange={(e) => setStatus({ ...status, postIntervalHours: Number(e.target.value) })}
                className="rounded-lg border border-gray-300 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Pushs pro Tag</label>
              <input
                type="number"
                min={0}
                value={status.pushesPerDay}
                onChange={(e) => setStatus({ ...status, pushesPerDay: Number(e.target.value) })}
                className="rounded-lg border border-gray-300 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Live-Spiele pro Tag
              </label>
              <input
                type="number"
                min={0}
                value={status.liveGamesPerDay}
                onChange={(e) => setStatus({ ...status, liveGamesPerDay: Number(e.target.value) })}
                className="rounded-lg border border-gray-300 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-700">{message}</p>}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Wird gespeichert …" : "Speichern"}
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold text-gray-900 dark:text-white">Logo</h2>
        <div className="flex items-center gap-4">
          {status.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={status.logoUrl} alt="" className="h-16 w-16 rounded object-contain" />
          )}
          <input type="file" accept="image/*" onChange={handleLogoChange} disabled={uploading} />
        </div>
        {uploading && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Wird hochgeladen …</p>}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-gray-900 dark:text-white">Status (automatisch)</h2>
        <div className="flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-400">
          <p>
            Öffentliche Seite:{" "}
            {status.publicClubId ? (
              <a
                href={`/${status.publicClubId}`}
                target="_blank"
                rel="noreferrer"
                className="text-brand-red hover:underline"
              >
                /{status.publicClubId}
              </a>
            ) : (
              "–"
            )}
          </p>
          <p>Heute gepostet: {status.postsToday}</p>
          <p>Heute Pushs gesendet: {status.pushesSentToday}</p>
          <p>Letzter Post: {status.lastPostAt ? formatDateTimeDe(status.lastPostAt) : "noch keiner"}</p>
          <p>Letzter Push: {status.lastPushSentAt ? formatDateTimeDe(status.lastPushSentAt) : "noch keiner"}</p>
          <p>
            Aktives Live-Spiel: {status.activeGameId ? "ja" : "nein"}
            {status.lastGameStartedAt && ` · zuletzt gestartet ${formatDateTimeDe(status.lastGameStartedAt)}`}
            {status.lastGameEndedAt && ` · zuletzt beendet ${formatDateTimeDe(status.lastGameEndedAt)}`}
          </p>
        </div>
      </Card>

      <Card className="border-blue-200 dark:border-blue-500/20">
        <h2 className="mb-3 font-semibold text-gray-900 dark:text-white">Status (manuell/Schnelltest)</h2>
        <div className="flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-400">
          <p>
            Testspiel:{" "}
            {status.testGameId
              ? `läuft — gestartet ${status.testGameStartedAt ? formatDateTimeDe(status.testGameStartedAt) : "–"}`
              : "läuft nicht"}
            {!status.testGameId &&
              status.lastTestGameStartedAt &&
              ` · zuletzt gestartet ${formatDateTimeDe(status.lastTestGameStartedAt)}`}
            {!status.testGameId &&
              status.lastTestGameEndedAt &&
              ` · beendet ${formatDateTimeDe(status.lastTestGameEndedAt)}`}
          </p>
          <p>
            Test-Push:{" "}
            {status.lastTestPushSentAt ? `zuletzt gesendet ${formatDateTimeDe(status.lastTestPushSentAt)}` : "noch keiner"}
          </p>
        </div>
      </Card>
    </div>
  );
}
