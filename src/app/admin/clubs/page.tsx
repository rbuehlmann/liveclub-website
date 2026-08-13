"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { adminDeleteClub, adminListClubs, adminSetLicense, AdminClubListItem } from "@/lib/firebase/functionsApi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDateDe } from "@/lib/date";

type LicenseAction = "trial" | "activeMonthly" | "activeYearly" | "suspend";

export default function AdminClubsPage() {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const [clubs, setClubs] = useState<AdminClubListItem[] | null>(null);
  const [notesByClub, setNotesByClub] = useState<Record<string, string>>({});
  const [busyClubId, setBusyClubId] = useState<string | null>(null);
  const [errorByClub, setErrorByClub] = useState<Record<string, string>>({});
  const [suspendingClub, setSuspendingClub] = useState<AdminClubListItem | null>(null);
  const [deletingClub, setDeletingClub] = useState<AdminClubListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  function reload() {
    adminListClubs().then(setClubs);
  }

  useEffect(() => {
    reload();
  }, []);

  async function runAction(clubId: string, action: LicenseAction) {
    setBusyClubId(clubId);
    setErrorByClub((prev) => ({ ...prev, [clubId]: "" }));
    try {
      await adminSetLicense({ clubId, action, notes: notesByClub[clubId] ?? "" });
      setSuspendingClub(null);
      reload();
    } catch (err) {
      setErrorByClub((prev) => ({
        ...prev,
        [clubId]: (err as { message?: string })?.message ?? "Aktion fehlgeschlagen.",
      }));
    } finally {
      setBusyClubId(null);
    }
  }

  async function handleDelete() {
    if (!deletingClub) return;
    setDeleting(true);
    try {
      await adminDeleteClub(deletingClub.clubId);
      setDeletingClub(null);
      reload();
    } finally {
      setDeleting(false);
    }
  }

  if (!clubs) return <p className="text-gray-500 dark:text-gray-400">Wird geladen …</p>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t("clubs")}</h1>
      <div className="flex flex-col gap-3">
        {clubs.map((club) => {
          const isBusy = busyClubId === club.clubId;
          return (
            <Card key={club.clubId}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {club.name} <span className="text-gray-400 dark:text-gray-500">#{club.publicClubId}</span>
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {club.sport} · {club.country} · {club.contactEmail}
                  </p>
                  <p className="mt-1 text-sm">
                    Lizenz: <strong>{club.currentLicenseType ?? "–"}</strong> ·{" "}
                    {club.currentLicenseStatus ?? "–"} · bis {formatDateDe(club.currentLicenseValidUntil)}
                  </p>
                </div>
                <Button variant="danger" onClick={() => setDeletingClub(club)}>
                  {t("deleteClub")}
                </Button>
              </div>

              <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 dark:border-white/10 pt-4">
                <TextField
                  label={t("notes")}
                  value={notesByClub[club.clubId] ?? ""}
                  onChange={(e) =>
                    setNotesByClub((prev) => ({ ...prev, [club.clubId]: e.target.value }))
                  }
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    disabled={isBusy}
                    onClick={() => runAction(club.clubId, "trial")}
                  >
                    Testphase (30 Tage)
                  </Button>
                  <Button disabled={isBusy} onClick={() => runAction(club.clubId, "activeMonthly")}>
                    Aktiv +1 Monat
                  </Button>
                  <Button disabled={isBusy} onClick={() => runAction(club.clubId, "activeYearly")}>
                    Aktiv +12 Monate
                  </Button>
                  <Button variant="danger" disabled={isBusy} onClick={() => setSuspendingClub(club)}>
                    Manuell deaktivieren
                  </Button>
                </div>
                {errorByClub[club.clubId] && (
                  <p className="text-sm text-red-600">{errorByClub[club.clubId]}</p>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!suspendingClub}
        title={`"${suspendingClub?.name}" manuell deaktivieren?`}
        body="Der Verein wird sofort öffentlich unsichtbar (Suche, Vereins-/Mannschaftsseiten, Embed) und im eigenen Dashboard auf 'bitte Support kontaktieren' verwiesen — unabhängig vom Ablaufdatum. Daten bleiben erhalten."
        confirmLabel={busyClubId === suspendingClub?.clubId ? tCommon("loading") : "Deaktivieren"}
        cancelLabel={tCommon("cancel")}
        onConfirm={() => suspendingClub && runAction(suspendingClub.clubId, "suspend")}
        onCancel={() => setSuspendingClub(null)}
      />

      <ConfirmDialog
        open={!!deletingClub}
        title={`"${deletingClub?.name}" endgültig löschen?`}
        body="Alle Mannschaften, Spiele und Mitgliedschaften dieses Vereins werden unwiderruflich gelöscht. Das kann nicht rückgängig gemacht werden."
        confirmLabel={deleting ? tCommon("loading") : t("deleteClub")}
        cancelLabel={tCommon("cancel")}
        onConfirm={handleDelete}
        onCancel={() => setDeletingClub(null)}
      />
    </div>
  );
}
