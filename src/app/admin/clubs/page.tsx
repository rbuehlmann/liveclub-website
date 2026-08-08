"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { adminListClubs, adminSetLicense, AdminClubListItem } from "@/lib/firebase/functionsApi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { formatDateDe } from "@/lib/date";
import { LicenseStatus, LicenseType } from "@/lib/types";

const LICENSE_TYPES: LicenseType[] = ["trial", "paid", "manual", "voucher", "sponsor", "partner"];
const LICENSE_STATUSES: LicenseStatus[] = [
  "active",
  "expired",
  "cancelled",
  "suspended",
  "scheduled",
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function inDaysIso(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default function AdminClubsPage() {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const [clubs, setClubs] = useState<AdminClubListItem[] | null>(null);
  const [editingClubId, setEditingClubId] = useState<string | null>(null);
  const [type, setType] = useState<LicenseType>("manual");
  const [status, setStatus] = useState<LicenseStatus>("active");
  const [validFrom, setValidFrom] = useState(todayIso());
  const [validUntil, setValidUntil] = useState(inDaysIso(365));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  function reload() {
    adminListClubs().then(setClubs);
  }

  useEffect(() => {
    reload();
  }, []);

  function startEdit(club: AdminClubListItem) {
    setEditingClubId(club.clubId);
    setType("manual");
    setStatus("active");
    setValidFrom(todayIso());
    setValidUntil(inDaysIso(365));
    setNotes("");
  }

  async function handleApply(clubId: string) {
    setSaving(true);
    try {
      await adminSetLicense({
        clubId,
        type,
        status,
        validFrom,
        validUntil,
        notes,
      });
      setEditingClubId(null);
      reload();
    } finally {
      setSaving(false);
    }
  }

  if (!clubs) return <p className="text-gray-500 dark:text-gray-400">Wird geladen …</p>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t("clubs")}</h1>
      <div className="flex flex-col gap-3">
        {clubs.map((club) => (
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
              <Button variant="secondary" onClick={() => startEdit(club)}>
                {t("setLicense")}
              </Button>
            </div>

            {editingClubId === club.clubId && (
              <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 dark:border-white/10 pt-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("licenseType")}</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as LicenseType)}
                      className="rounded-lg border border-gray-300 px-4 py-3 text-base"
                    >
                      {LICENSE_TYPES.map((lt) => (
                        <option key={lt} value={lt}>
                          {lt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as LicenseStatus)}
                      className="rounded-lg border border-gray-300 px-4 py-3 text-base"
                    >
                      {LICENSE_STATUSES.map((ls) => (
                        <option key={ls} value={ls}>
                          {ls}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField
                    label="Gültig ab"
                    type="date"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                  />
                  <TextField
                    label={t("validUntil")}
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                  />
                </div>
                <TextField
                  label={t("notes")}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <div className="flex gap-3">
                  <Button disabled={saving} onClick={() => handleApply(club.clubId)}>
                    {saving ? tCommon("loading") : t("apply")}
                  </Button>
                  <Button variant="secondary" onClick={() => setEditingClubId(null)}>
                    {tCommon("cancel")}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
