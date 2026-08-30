"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { getFirebaseClient } from "@/lib/firebase/client";
import { BrandingSettings } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

// Match the "Match Vision" palette's actual globals.css defaults (2026-08-29)
// — purely cosmetic here (pre-fills the <input type="color"> swatch when
// nothing's overridden yet), the real default color always comes straight
// from globals.css regardless of what's shown here.
const DEFAULT_ACCENT = "#c6ff00";
const DEFAULT_BACKGROUND_LIGHT = "#f3f6ec";
const DEFAULT_BACKGROUND_DARK = "#10140c";
// Dark-mode-only additions (2026-08-30) — no Light-mode counterpart on
// purpose, see BrandingSettings.foregroundColorDark's own comment for why.
const DEFAULT_FOREGROUND_DARK = "#f5f7ef";
const DEFAULT_SILVER_DARK = "#a7adb2";
const DEFAULT_ORANGE_DARK = "#ff6b00";
const DEFAULT_EMERALD_DARK = "#00e58b";
// Matches GoLiveButton.tsx's own fallback — kept as separate constants
// (not shared) since the color-picker default and the component's
// no-branding-loaded-yet default only need to agree in value, not in code.
const DEFAULT_GO_LIVE_ICON_LIGHT = "#f3f6ec";
const DEFAULT_GO_LIVE_ICON_DARK = "#10140c";
const DEFAULT_GO_LIVE_BACKGROUND_LIGHT = "#10140c";
const DEFAULT_GO_LIVE_BACKGROUND_DARK = "#f5f7ef";

// Hardcoded fallback if settings/teamInfo doesn't exist yet — kept in sync
// with functions/src/lib/teamInfo.ts's TEAM_INFO_DEFAULTS.
const TEAM_INFO_HARDCODED_DEFAULTS = {
  teamInfosEnabled: true,
  infoPushEnabled: true,
  infosPerDay: 10,
  pushesPerDay: 3,
};

interface TeamInfoGlobalSettings {
  teamInfosEnabled: boolean;
  infoPushEnabled: boolean;
  infosPerDay: number;
  pushesPerDay: number;
}

function TeamInfoSettingsCard() {
  const [settings, setSettings] = useState<TeamInfoGlobalSettings>(TEAM_INFO_HARDCODED_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const { db } = getFirebaseClient();
    getDoc(doc(db, "settings", "teamInfo"))
      .then((snap) => {
        const data = snap.data();
        setSettings({
          teamInfosEnabled: data?.teamInfosEnabled ?? TEAM_INFO_HARDCODED_DEFAULTS.teamInfosEnabled,
          infoPushEnabled: data?.infoPushEnabled ?? TEAM_INFO_HARDCODED_DEFAULTS.infoPushEnabled,
          infosPerDay: data?.infosPerDay ?? TEAM_INFO_HARDCODED_DEFAULTS.infosPerDay,
          pushesPerDay: data?.pushesPerDay ?? TEAM_INFO_HARDCODED_DEFAULTS.pushesPerDay,
        });
      })
      .catch((err) => setLoadError((err as { message?: string })?.message ?? "Laden fehlgeschlagen."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const { db } = getFirebaseClient();
      await setDoc(doc(db, "settings", "teamInfo"), settings);
      setMessage("Gespeichert ✓ — gilt sofort für alle Vereine ohne eigenes Override.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;
  if (loadError) {
    return (
      <Card>
        <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">Team-Infos (global)</h2>
        <p className="text-sm text-red-600">{loadError}</p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">Team-Infos (global)</h2>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Platform-weite Standardwerte. Ein einzelner Verein kann davon per Override (Vereinsliste) abweichen
        — z. B. bei Missbrauch nur den Push deaktivieren, ohne Team-Infos selbst zu sperren.
      </p>
      <div className="flex flex-col gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={settings.teamInfosEnabled}
            onChange={(e) => setSettings((s) => ({ ...s, teamInfosEnabled: e.target.checked }))}
          />
          Team-Infos aktiviert
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={settings.infoPushEnabled}
            onChange={(e) => setSettings((s) => ({ ...s, infoPushEnabled: e.target.checked }))}
          />
          Info-Push aktiviert
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Team-Infos pro Tag</label>
            <input
              type="number"
              min={0}
              value={settings.infosPerDay}
              onChange={(e) => setSettings((s) => ({ ...s, infosPerDay: Number(e.target.value) }))}
              className="rounded-lg border border-gray-300 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Info-Pushs pro Tag</label>
            <input
              type="number"
              min={0}
              value={settings.pushesPerDay}
              onChange={(e) => setSettings((s) => ({ ...s, pushesPerDay: Number(e.target.value) }))}
              className="rounded-lg border border-gray-300 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
        </div>
        {message && <p className="text-sm text-green-700">{message}</p>}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Wird gespeichert …" : "Speichern"}
        </Button>
      </div>
    </Card>
  );
}

interface ImageFieldProps {
  label: string;
  fieldKey: keyof BrandingSettings;
  value: string | null | undefined;
  onChange: (key: keyof BrandingSettings, url: string | null) => void;
}

function ImageField({ label, fieldKey, value, onChange }: ImageFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { storage } = getFirebaseClient();
      const fileRef = ref(storage, `branding/${fieldKey}-${Date.now()}-${file.name}`);
      await uploadBytes(fileRef, file, { cacheControl: "public, max-age=2592000" });
      const url = await getDownloadURL(fileRef);
      onChange(fieldKey, url);
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Upload fehlgeschlagen.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleRemove() {
    if (!value) return;
    try {
      await deleteObject(ref(getFirebaseClient().storage, value)).catch(() => undefined);
    } finally {
      onChange(fieldKey, null);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      {value && (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-10 rounded bg-gray-100 object-contain px-2 dark:bg-white/10" />
          <Button type="button" variant="secondary" onClick={handleRemove}>
            Entfernen
          </Button>
        </div>
      )}
      <input type="file" accept="image/*" onChange={handleChange} disabled={uploading} />
      {uploading && <p className="text-xs text-gray-500 dark:text-gray-400">Wird hochgeladen …</p>}
      {error && <p className="text-xs text-red-600">Fehler: {error}</p>}
    </div>
  );
}

// Deliberately its own component with its own load/save (merge: true),
// completely decoupled from AdminSettingsPage's `branding` state and its
// "Alles auf Standard zurücksetzen" button below — that reset is scoped to
// the (explicitly website-only) Branding card's re-skin fields, and
// clubFallbackIconUrl living in the same settings/branding doc shouldn't
// get silently wiped by a click meant for that unrelated feature. Same
// pattern as TeamInfoSettingsCard above.
function ClubFallbackIconCard() {
  const [iconUrl, setIconUrl] = useState<string | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const { db } = getFirebaseClient();
    getDoc(doc(db, "settings", "branding")).then((snap) => {
      setIconUrl((snap.data() as BrandingSettings | undefined)?.clubFallbackIconUrl ?? null);
      setLoading(false);
    });
  }, []);

  async function persist(url: string | null) {
    setMessage(null);
    const { db } = getFirebaseClient();
    await setDoc(doc(db, "settings", "branding"), { clubFallbackIconUrl: url }, { merge: true });
    setIconUrl(url);
    setMessage("Gespeichert ✓ — wirkt sofort, ohne Deploy.");
  }

  if (loading) return null;

  return (
    <Card>
      <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">Fallback-Icon für Vereine & Mannschaften</h2>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Wird gezeigt, wenn ein Verein oder eine Mannschaft kein eigenes Logo hochgeladen hat — auf
        der Website (TeamIcon) und in Live-Activity-/Push-Benachrichtigungen der iOS/Android-Apps.
        Speichert sofort beim Hochladen/Entfernen, unabhängig vom Branding oben. Leer lassen =
        neutrales Kürzel-Icon (Anfangsbuchstabe) als Fallback.
      </p>
      <ImageField
        label="Fallback-Icon"
        fieldKey="clubFallbackIconUrl"
        value={iconUrl}
        onChange={(_key, url) => {
          persist(url);
        }}
      />
      {message && <p className="mt-2 text-sm text-green-700">{message}</p>}
    </Card>
  );
}

export default function AdminSettingsPage() {
  const [branding, setBranding] = useState<BrandingSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const { db } = getFirebaseClient();
    getDoc(doc(db, "settings", "branding")).then((snap) => {
      setBranding((snap.data() as BrandingSettings | undefined) ?? {});
      setLoading(false);
    });
  }, []);

  function update<K extends keyof BrandingSettings>(key: K, value: BrandingSettings[K]) {
    setBranding((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const { db } = getFirebaseClient();
      await setDoc(doc(db, "settings", "branding"), branding, { merge: false });
      setMessage("Gespeichert ✓ — wirkt sofort, ohne Deploy.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    setMessage(null);
    try {
      const { db } = getFirebaseClient();
      await setDoc(doc(db, "settings", "branding"), {});
      setBranding({});
      setMessage("Zurückgesetzt ✓");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-gray-500 dark:text-gray-400">Wird geladen …</p>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Einstellungen</h1>

      <Card>
        <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">Branding</h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Überschreibt Logo und Farben der Website live, ohne Deploy — z. B. für einen
          kurzfristigen Auftritt (Halloween-Orange o. ä.). Leer lassen = Standard-Branding.
          Betrifft nur die Website, nicht die iOS/Android-Apps.
        </p>
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <ImageField label="Logo (Light Mode)" fieldKey="logoLight" value={branding.logoLight} onChange={update} />
            <ImageField label="Logo (Dark Mode)" fieldKey="logoDark" value={branding.logoDark} onChange={update} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ImageField label="Icon (Light Mode)" fieldKey="iconLight" value={branding.iconLight} onChange={update} />
            <ImageField label="Icon (Dark Mode)" fieldKey="iconDark" value={branding.iconDark} onChange={update} />
          </div>
          <p className="-mt-4 text-xs text-gray-400 dark:text-gray-500">
            Icon wird gespeichert, aber aktuell nirgends verwendet — reserviert für später.
          </p>

          <ImageField label="Favicon (Browser-Tab-Icon)" fieldKey="favicon" value={branding.favicon} onChange={update} />
          <p className="-mt-4 text-xs text-gray-400 dark:text-gray-500">
            Wird als Browser-Tab-Icon eingebunden. Browser cachen Favicons teils sehr aggressiv —
            ein bereits offener Tab oder ein wiederkehrender Besucher sieht die Änderung
            eventuell erst nach einem harten Reload oder etwas Zeit.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Akzentfarbe (Light Mode)
              </label>
              <input
                type="color"
                value={branding.accentColorLight ?? DEFAULT_ACCENT}
                onChange={(e) => update("accentColorLight", e.target.value)}
                className="h-10 w-16 rounded border border-gray-300"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Akzentfarbe (Dark Mode)
              </label>
              <input
                type="color"
                value={branding.accentColorDark ?? DEFAULT_ACCENT}
                onChange={(e) => update("accentColorDark", e.target.value)}
                className="h-10 w-16 rounded border border-gray-300"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Hintergrundfarbe (Light Mode)
              </label>
              <input
                type="color"
                value={branding.backgroundColorLight ?? DEFAULT_BACKGROUND_LIGHT}
                onChange={(e) => update("backgroundColorLight", e.target.value)}
                className="h-10 w-16 rounded border border-gray-300"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Hintergrundfarbe (Dark Mode)
              </label>
              <input
                type="color"
                value={branding.backgroundColorDark ?? DEFAULT_BACKGROUND_DARK}
                onChange={(e) => update("backgroundColorDark", e.target.value)}
                className="h-10 w-16 rounded border border-gray-300"
              />
            </div>
          </div>

          <div>
            <h3 className="mb-1 font-medium text-gray-900 dark:text-white">
              Weitere Markenfarben (nur Dark Mode)
            </h3>
            <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
              Kein Light-Mode-Gegenstück, solange der Umschalter ausgeblendet ist. Textfarbe und
              Hover-/Text-auf-Akzent-Farbe werden automatisch aus der Akzentfarbe oben berechnet,
              nicht separat gesetzt.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Textfarbe
                </label>
                <input
                  type="color"
                  value={branding.foregroundColorDark ?? DEFAULT_FOREGROUND_DARK}
                  onChange={(e) => update("foregroundColorDark", e.target.value)}
                  className="h-10 w-16 rounded border border-gray-300"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Rahmen-/Sekundärfarbe
                </label>
                <input
                  type="color"
                  value={branding.silverColorDark ?? DEFAULT_SILVER_DARK}
                  onChange={(e) => update("silverColorDark", e.target.value)}
                  className="h-10 w-16 rounded border border-gray-300"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Live-Anzeige (Match Orange)
                </label>
                <input
                  type="color"
                  value={branding.orangeColorDark ?? DEFAULT_ORANGE_DARK}
                  onChange={(e) => update("orangeColorDark", e.target.value)}
                  className="h-10 w-16 rounded border border-gray-300"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Spielstand (Match Emerald)
                </label>
                <input
                  type="color"
                  value={branding.emeraldColorDark ?? DEFAULT_EMERALD_DARK}
                  onChange={(e) => update("emeraldColorDark", e.target.value)}
                  className="h-10 w-16 rounded border border-gray-300"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-1 font-medium text-gray-900 dark:text-white">GO LIVE Button</h3>
            <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
              Das Logo/Icon oben rechts im Header (verlinkt zu /login) — ein Farbton für alles im
              SVG (Rahmen, Icon und „LIVE“-Schriftzug), plus eine separate Hintergrundfarbe für die
              Button-Fläche dahinter.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Icon/Text (Light Mode)
                </label>
                <input
                  type="color"
                  value={branding.goLiveIconLight ?? DEFAULT_GO_LIVE_ICON_LIGHT}
                  onChange={(e) => update("goLiveIconLight", e.target.value)}
                  className="h-10 w-16 rounded border border-gray-300"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Icon/Text (Dark Mode)
                </label>
                <input
                  type="color"
                  value={branding.goLiveIconDark ?? DEFAULT_GO_LIVE_ICON_DARK}
                  onChange={(e) => update("goLiveIconDark", e.target.value)}
                  className="h-10 w-16 rounded border border-gray-300"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Hintergrund (Light Mode)
                </label>
                <input
                  type="color"
                  value={branding.goLiveBackgroundLight ?? DEFAULT_GO_LIVE_BACKGROUND_LIGHT}
                  onChange={(e) => update("goLiveBackgroundLight", e.target.value)}
                  className="h-10 w-16 rounded border border-gray-300"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Hintergrund (Dark Mode)
                </label>
                <input
                  type="color"
                  value={branding.goLiveBackgroundDark ?? DEFAULT_GO_LIVE_BACKGROUND_DARK}
                  onChange={(e) => update("goLiveBackgroundDark", e.target.value)}
                  className="h-10 w-16 rounded border border-gray-300"
                />
              </div>
            </div>
          </div>

          {message && <p className="text-sm text-green-700">{message}</p>}
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Wird gespeichert …" : "Speichern"}
            </Button>
            <Button type="button" variant="secondary" onClick={handleReset} disabled={saving}>
              Alles auf Standard zurücksetzen
            </Button>
          </div>
        </div>
      </Card>

      <ClubFallbackIconCard />

      <TeamInfoSettingsCard />
    </div>
  );
}
