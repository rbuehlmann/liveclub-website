"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { getFirebaseClient } from "@/lib/firebase/client";
import { BrandingSettings } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const DEFAULT_ACCENT = "#f02b22";
const DEFAULT_BACKGROUND_LIGHT = "#f3efe5";
const DEFAULT_BACKGROUND_DARK = "#080808";

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
      const fileRef = ref(storage, `branding/${fieldKey}-${file.name}`);
      await uploadBytes(fileRef, file);
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
    </div>
  );
}
