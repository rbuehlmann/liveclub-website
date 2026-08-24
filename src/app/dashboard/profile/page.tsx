"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
const NOTIFICATION_OPTION_KEYS = [
  "gameTakeoverInvite",
  "gameTakenOver",
  "gameHandedOff",
  "reminders",
  "generalInfo",
] as const;

export default function ProfilePage() {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
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
      setMessage(t("saved"));
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
      setDeleteError((err as { message?: string })?.message ?? t("deleteFailed"));
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  if (!user || loading) return <p className="text-gray-500 dark:text-gray-400">{tCommon("loading")}</p>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t("pageTitle")}</h1>

      <Card>
        <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">{t("displayNameTitle")}</h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          {t("displayNameExplanationPrefix")}
          {"{Name}"}
          {t("displayNameExplanationSuffix")}
        </p>
        <TextField
          label={t("displayNameLabel")}
          placeholder={t("displayNamePlaceholder")}
          value={publicDisplayName}
          onChange={(e) => setPublicDisplayName(e.target.value)}
        />
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">{t("notificationsTitle")}</h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">{t("notificationsSubtitle")}</p>
        <div className="flex flex-col gap-3">
          {NOTIFICATION_OPTION_KEYS.map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={notificationPrefs[key] !== false}
                onChange={(e) => setNotificationPrefs((prev) => ({ ...prev, [key]: e.target.checked }))}
              />
              {t(`notificationOptions.${key}`)}
            </label>
          ))}
        </div>
      </Card>

      {message && <p className="text-sm text-green-700">{message}</p>}
      <Button onClick={handleSave} disabled={saving}>
        {saving ? t("saving") : tCommon("save")}
      </Button>

      <Card className="border-red-200 dark:border-red-500/20">
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">{t("deleteAccountTitle")}</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t("deleteAccountWarning")}</p>
        <Button
          variant="danger"
          className="mt-4"
          onClick={() => {
            setDeleteError(null);
            setConfirmingDelete(true);
          }}
        >
          {t("deleteAccountButton")}
        </Button>
        {deleteError && <p className="mt-2 text-sm text-red-600">{deleteError}</p>}
      </Card>

      <ConfirmDialog
        open={confirmingDelete}
        title={t("deleteAccountConfirmTitle")}
        body={t("deleteAccountConfirmBody")}
        confirmLabel={deleting ? t("deleting") : t("deleteAccountConfirmButton")}
        cancelLabel={tCommon("cancel")}
        onConfirm={handleDeleteAccount}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}
