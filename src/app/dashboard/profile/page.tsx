"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { deleteOwnAccount } from "@/lib/firebase/functionsApi";
import { logout } from "@/lib/firebase/authApi";

// Keep in sync with functions/src/lib/gameEditors.ts's NotificationKey.
const NOTIFICATION_OPTIONS: { key: string; label: string }[] = [
  { key: "gameTakeoverInvite", label: "Einladung zur Spielübernahme" },
  { key: "gameTakenOver", label: "Spiel übernommen (von dir)" },
  { key: "gameHandedOff", label: "Spiel abgegeben (von dir)" },
  { key: "reminders", label: "Erinnerungen" },
  { key: "generalInfo", label: "Allgemeine Informationen" },
];

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [publicDisplayName, setPublicDisplayName] = useState("");
  const [notificationPrefs, setNotificationPrefs] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const { db } = getFirebaseClient();
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      const data = snap.data();
      setPublicDisplayName(data?.publicDisplayName ?? "");
      setNotificationPrefs(data?.notificationPrefs ?? {});
      setLoading(false);
    });
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setMessage(null);
    try {
      const { db } = getFirebaseClient();
      await setDoc(
        doc(db, "users", user.uid),
        { publicDisplayName: publicDisplayName.trim() || null, notificationPrefs },
        { merge: true }
      );
      setMessage("Gespeichert ✓");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteOwnAccount();
      await logout();
      router.push("/");
    } catch (err) {
      setDeleteError((err as { message?: string })?.message ?? "Löschen fehlgeschlagen.");
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  if (!user || loading) return <p className="text-gray-500 dark:text-gray-400">Wird geladen …</p>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Profil</h1>

      <Card>
        <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">Öffentlicher Anzeigename</h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Wird als "Redaktor: {"{Name}"}" bei einem laufenden Spiel angezeigt, das du administrierst —
          z. B. "Max", "GoalHunter" oder dein echter Name. Leer lassen, um nichts anzuzeigen.
        </p>
        <TextField
          label="Anzeigename"
          placeholder="z. B. GoalHunter"
          value={publicDisplayName}
          onChange={(e) => setPublicDisplayName(e.target.value)}
        />
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">E-Mail-Benachrichtigungen</h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Standardmässig sind alle aktiviert, damit du nichts Wichtiges verpasst — hier kannst du
          einzelne abschalten.
        </p>
        <div className="flex flex-col gap-3">
          {NOTIFICATION_OPTIONS.map((opt) => (
            <label key={opt.key} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={notificationPrefs[opt.key] !== false}
                onChange={(e) =>
                  setNotificationPrefs((prev) => ({ ...prev, [opt.key]: e.target.checked }))
                }
              />
              {opt.label}
            </label>
          ))}
        </div>
      </Card>

      {message && <p className="text-sm text-green-700">{message}</p>}
      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Wird gespeichert …" : "Speichern"}
      </Button>

      <Card className="border-red-200 dark:border-red-500/20">
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">Konto löschen</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Dein persönliches Konto wird gelöscht und deine Mitgliedschaft bei allen Vereinen entfernt.
          Vereine selbst bleiben bestehen — sie werden per E-Mail informiert. Dieser Schritt lässt sich
          nicht rückgängig machen.
        </p>
        <Button
          variant="danger"
          className="mt-4"
          onClick={() => {
            setDeleteError(null);
            setConfirmingDelete(true);
          }}
        >
          Konto endgültig löschen
        </Button>
        {deleteError && <p className="mt-2 text-sm text-red-600">{deleteError}</p>}
      </Card>

      <ConfirmDialog
        open={confirmingDelete}
        title="Konto endgültig löschen?"
        body="Deine Mitgliedschaft bei allen Vereinen wird entfernt und dein Konto gelöscht. Das kann nicht rückgängig gemacht werden."
        confirmLabel={deleting ? "Wird gelöscht …" : "Endgültig löschen"}
        cancelLabel="Abbrechen"
        onConfirm={handleDeleteAccount}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}
