"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebaseClient } from "@/lib/firebase/client";
import { useClubContext } from "@/components/club/ClubContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { adminDeleteClub } from "@/lib/firebase/functionsApi";
import { logout } from "@/lib/firebase/authApi";

export default function EditClubPage() {
  const t = useTranslations("clubSetup");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { club, role } = useClubContext();

  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [secondaryColor, setSecondaryColor] = useState("#1e293b");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!club) return;
    setName(club.name);
    setContactName(club.contactName);
    setContactEmail(club.contactEmail);
    setPrimaryColor(club.primaryColor ?? "#2563eb");
    setSecondaryColor(club.secondaryColor ?? "#1e293b");
  }, [club]);

  if (!club) return null;
  const readOnly = role !== "clubAdmin";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!club) return;
    setSaving(true);
    setMessage(null);
    try {
      const { db } = getFirebaseClient();
      await updateDoc(doc(db, "clubs", club.clubId), {
        name,
        contactName,
        contactEmail,
        primaryColor,
        secondaryColor,
      });
      setMessage(tCommon("save") + " ✓");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !club) return;
    setUploading(true);
    setLogoError(null);
    try {
      const { db, storage } = getFirebaseClient();
      const logoRef = ref(storage, `clubs/${club.clubId}/logo/${file.name}`);
      await uploadBytes(logoRef, file);
      const url = await getDownloadURL(logoRef);
      await updateDoc(doc(db, "clubs", club.clubId), { logoUrl: url });
    } catch (err) {
      setLogoError((err as { code?: string; message?: string })?.code ?? (err as Error)?.message ?? "Logo-Upload fehlgeschlagen.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleLogoRemove() {
    if (!club) return;
    setUploading(true);
    setLogoError(null);
    try {
      const { db } = getFirebaseClient();
      await updateDoc(doc(db, "clubs", club.clubId), { logoUrl: null });
    } catch (err) {
      setLogoError((err as { code?: string; message?: string })?.code ?? (err as Error)?.message ?? "Entfernen fehlgeschlagen.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteClub() {
    if (!club) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await adminDeleteClub(club.clubId);
      await logout();
      router.push("/");
    } catch (err) {
      setDeleteError((err as { message?: string })?.message ?? "Löschen fehlgeschlagen.");
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <div className="flex max-w-lg flex-col gap-6">
    <Card>
      <h1 className="mb-6 text-xl font-bold text-gray-900 dark:text-white">{t("title")}</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          label={t("clubName")}
          value={name}
          disabled={readOnly}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          label={t("contactName")}
          value={contactName}
          disabled={readOnly}
          onChange={(e) => setContactName(e.target.value)}
        />
        <TextField
          label={t("contactEmail")}
          type="email"
          value={contactEmail}
          disabled={readOnly}
          onChange={(e) => setContactEmail(e.target.value)}
        />
        <div className="flex flex-col gap-1">
          <TextField label={t("sport")} value={club.sport} disabled readOnly />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Sportart kann nach dem Erstellen nicht mehr geändert werden.
          </p>
        </div>
        {!readOnly && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Vereinslogo</label>
            {club.logoUrl && (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={club.logoUrl} alt="" className="h-16 w-16 rounded object-contain" />
                <Button type="button" variant="secondary" onClick={handleLogoRemove} disabled={uploading}>
                  Logo entfernen
                </Button>
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleLogoChange} disabled={uploading} />
            <p className="text-xs text-gray-500 dark:text-gray-400">Empfehlung: 500×500 px, transparentes PNG.</p>
            {uploading && <p className="text-xs text-gray-500 dark:text-gray-400">Wird hochgeladen …</p>}
            {logoError && <p className="text-xs text-red-600">Fehler: {logoError}</p>}
          </div>
        )}
        {!readOnly && (
          <div className="flex gap-6">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Heimfarbe</label>
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-16 rounded border border-gray-300"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Auswärtsfarbe</label>
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="h-10 w-16 rounded border border-gray-300"
              />
            </div>
          </div>
        )}
        {message && <p className="text-sm text-green-700">{message}</p>}
        {!readOnly && (
          <Button type="submit" disabled={saving}>
            {saving ? tCommon("loading") : tCommon("save")}
          </Button>
        )}
      </form>
    </Card>

    {!readOnly && (
      <Card className="border-red-200 dark:border-red-500/20">
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">Verein löschen</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Damit werden {club.name} und alle zugehörigen Daten — Mannschaften, Spiele, Mitgliedschaften
          und Einladungen — unwiderruflich gelöscht. Eine laufende Lizenz wird sofort beendet, ohne
          Rückerstattung bereits bezahlter Zeit. Dieser Schritt lässt sich nicht rückgängig machen.
        </p>
        <Button
          variant="danger"
          className="mt-4"
          onClick={() => {
            setDeleteError(null);
            setConfirmingDelete(true);
          }}
        >
          Verein endgültig löschen
        </Button>
        {deleteError && <p className="mt-2 text-sm text-red-600">{deleteError}</p>}
      </Card>
    )}

    <ConfirmDialog
      open={confirmingDelete}
      title={`"${club.name}" endgültig löschen?`}
      body="Alle Mannschaften, Spiele, Mitgliedschaften und Einladungen dieses Vereins werden unwiderruflich gelöscht. Eine laufende Lizenz wird sofort beendet, ohne Rückerstattung. Das kann nicht rückgängig gemacht werden."
      confirmLabel={deleting ? tCommon("loading") : "Endgültig löschen"}
      cancelLabel={tCommon("cancel")}
      onConfirm={handleDeleteClub}
      onCancel={() => setConfirmingDelete(false)}
    />
    </div>
  );
}
