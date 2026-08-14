"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { adminDeleteClub, adminListClubs, adminSetLicense, AdminClubListItem } from "@/lib/firebase/functionsApi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDateDe } from "@/lib/date";
import { LICENSE_TIERS } from "@/lib/licenseTiers";
import { LicenseTier } from "@/lib/types";

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export default function AdminClubsPage() {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const [clubs, setClubs] = useState<AdminClubListItem[] | null>(null);
  const [notesByClub, setNotesByClub] = useState<Record<string, string>>({});
  const [validUntilByClub, setValidUntilByClub] = useState<Record<string, string>>({});
  const [tierByClub, setTierByClub] = useState<Record<string, LicenseTier>>({});
  const [busyClubId, setBusyClubId] = useState<string | null>(null);
  const [errorByClub, setErrorByClub] = useState<Record<string, string>>({});
  const [suspendingClub, setSuspendingClub] = useState<AdminClubListItem | null>(null);
  const [deletingClub, setDeletingClub] = useState<AdminClubListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  function reload() {
    adminListClubs().then((loaded) => {
      setClubs(loaded);
      setValidUntilByClub((prev) => {
        const next = { ...prev };
        for (const club of loaded) {
          if (next[club.clubId] === undefined) {
            next[club.clubId] = toDateInputValue(club.currentLicenseValidUntil);
          }
        }
        return next;
      });
      setTierByClub((prev) => {
        const next = { ...prev };
        for (const club of loaded) {
          if (next[club.clubId] === undefined) {
            next[club.clubId] = club.currentLicenseTier ?? "team5";
          }
        }
        return next;
      });
    });
  }

  useEffect(() => {
    reload();
  }, []);

  async function runSetValidUntil(clubId: string) {
    const validUntil = validUntilByClub[clubId];
    if (!validUntil) return;
    setBusyClubId(clubId);
    setErrorByClub((prev) => ({ ...prev, [clubId]: "" }));
    try {
      await adminSetLicense({
        clubId,
        action: "setValidUntil",
        validUntil,
        tier: tierByClub[clubId],
        notes: notesByClub[clubId] ?? "",
      });
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

  async function runSuspend(clubId: string) {
    setBusyClubId(clubId);
    setErrorByClub((prev) => ({ ...prev, [clubId]: "" }));
    try {
      await adminSetLicense({ clubId, action: "suspend", notes: notesByClub[clubId] ?? "" });
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
      await adminDeleteClub(deletingClub.clubId, notesByClub[deletingClub.clubId] ?? "");
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
                  {" · "}
                  Teams: <strong>{club.teamCount}/{club.currentMaxTeams ?? "Unlimited"}</strong>
                </p>
              </div>

              <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 dark:border-white/10 pt-4">
                <TextField
                  label="Notiz / Grund (fliesst als Begründung in die Deaktivierungs-/Lösch-Mail ein)"
                  value={notesByClub[club.clubId] ?? ""}
                  onChange={(e) =>
                    setNotesByClub((prev) => ({ ...prev, [club.clubId]: e.target.value }))
                  }
                />
                <div className="flex flex-wrap items-end gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Stufe</label>
                    <select
                      value={tierByClub[club.clubId] ?? "team5"}
                      onChange={(e) =>
                        setTierByClub((prev) => ({
                          ...prev,
                          [club.clubId]: e.target.value as LicenseTier,
                        }))
                      }
                      className="rounded-lg border border-gray-300 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
                    >
                      {LICENSE_TIERS.map((tierInfo) => (
                        <option key={tierInfo.id} value={tierInfo.id}>
                          {tierInfo.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Lizenz gültig bis
                    </label>
                    <input
                      type="date"
                      value={validUntilByClub[club.clubId] ?? ""}
                      onChange={(e) =>
                        setValidUntilByClub((prev) => ({ ...prev, [club.clubId]: e.target.value }))
                      }
                      className="rounded-lg border border-gray-300 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                  </div>
                  <Button
                    disabled={isBusy || !validUntilByClub[club.clubId]}
                    onClick={() => runSetValidUntil(club.clubId)}
                  >
                    Datum setzen
                  </Button>
                  <Button variant="danger" disabled={isBusy} onClick={() => setSuspendingClub(club)}>
                    Deaktivieren
                  </Button>
                  <Button variant="danger" disabled={isBusy} onClick={() => setDeletingClub(club)}>
                    {t("deleteClub")}
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
        title={`"${suspendingClub?.name}" deaktivieren?`}
        body="Der Verein wird sofort öffentlich unsichtbar (Suche, Vereins-/Mannschaftsseiten, Embed) und im eigenen Dashboard auf 'bitte Support kontaktieren' verwiesen — unabhängig vom Ablaufdatum. Daten bleiben erhalten. Der Vereinsadmin erhält eine Benachrichtigungs-Mail mit dem oben eingetragenen Grund."
        confirmLabel={busyClubId === suspendingClub?.clubId ? tCommon("loading") : "Deaktivieren"}
        cancelLabel={tCommon("cancel")}
        onConfirm={() => suspendingClub && runSuspend(suspendingClub.clubId)}
        onCancel={() => setSuspendingClub(null)}
      />

      <ConfirmDialog
        open={!!deletingClub}
        title={`"${deletingClub?.name}" endgültig löschen?`}
        body="Alle Mannschaften, Spiele und Mitgliedschaften dieses Vereins werden unwiderruflich gelöscht. Das kann nicht rückgängig gemacht werden. Der Vereinsadmin erhält eine Bestätigungs-Mail mit dem oben eingetragenen Grund."
        confirmLabel={deleting ? tCommon("loading") : t("deleteClub")}
        cancelLabel={tCommon("cancel")}
        onConfirm={handleDelete}
        onCancel={() => setDeletingClub(null)}
      />
    </div>
  );
}
