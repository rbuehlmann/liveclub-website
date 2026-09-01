"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from "firebase/firestore";
import Link from "next/link";
import { getFirebaseClient } from "@/lib/firebase/client";
import { useClubContext } from "@/components/club/ClubContext";
import { createTeam } from "@/lib/firebase/functionsApi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Team } from "@/lib/types";

export default function TeamsPage() {
  const t = useTranslations("teams");
  const tCommon = useTranslations("common");
  const { club, role } = useClubContext();
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editShortName, setEditShortName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!club) return;
    const { db } = getFirebaseClient();
    const q = query(
      collection(db, "clubs", club.clubId, "teams"),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snap) => {
      setTeams(
        snap.docs.map((d) => ({
          teamId: d.id,
          clubId: club.clubId,
          publicTeamId: d.data().publicTeamId ?? null,
          name: d.data().name,
          shortName: d.data().shortName,
          sport: d.data().sport,
          active: d.data().active ?? true,
          archived: d.data().archived ?? false,
        }))
      );
    });
  }, [club]);

  if (!club) return null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!club || !name.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createTeam({ clubId: club.clubId, name: name.trim(), shortName: shortName.trim() });
      setName("");
      setShortName("");
    } catch (err) {
      setCreateError((err as { message?: string })?.message ?? t("createFailed"));
    } finally {
      setCreating(false);
    }
  }

  function startEdit(team: Team) {
    setEditingTeamId(team.teamId);
    setEditName(team.name);
    setEditShortName(team.shortName);
  }

  function cancelEdit() {
    setEditingTeamId(null);
  }

  async function handleSave(teamId: string) {
    if (!club || !editName.trim()) return;
    setSaving(true);
    try {
      const { db } = getFirebaseClient();
      await updateDoc(doc(db, "clubs", club.clubId, "teams", teamId), {
        name: editName.trim(),
        shortName: editShortName.trim(),
      });
      setEditingTeamId(null);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(team: Team) {
    if (!club) return;
    const { db } = getFirebaseClient();
    await updateDoc(doc(db, "clubs", club.clubId, "teams", team.teamId), {
      active: !team.active,
    });
  }

  // A downgrade-archived team (2026-09-01, see createCheckoutSession.ts/
  // onStripeWebhook.ts) is distinct from a plain deactivation — it doesn't
  // count against the license cap while archived, so un-archiving it must
  // respect the cap again, same as creating a brand-new team would.
  async function reactivateArchivedTeam(team: Team) {
    if (!club || activeTeams.length >= (maxTeams ?? Infinity)) return;
    const { db } = getFirebaseClient();
    await updateDoc(doc(db, "clubs", club.clubId, "teams", team.teamId), {
      active: true,
      archived: false,
    });
  }

  const activeTeams = teams.filter((team) => !team.archived);
  const archivedTeams = teams.filter((team) => team.archived);
  const maxTeams = club.currentMaxTeams ?? null;
  const atLimit = maxTeams !== null && activeTeams.length >= maxTeams;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t("title")}</h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {t("teamCount", { count: activeTeams.length, max: maxTeams ?? t("unlimited") })}
        </span>
      </div>

      {role === "clubAdmin" && atLimit && (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            {t("limitReached", { max: maxTeams })}
          </p>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
            {t.rich("limitReachedUpgradeHint", {
              link: (chunks) => (
                <Link href="/dashboard" className="underline">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </Card>
      )}

      {role === "clubAdmin" && !atLimit && (
        <Card>
          <h2 className="mb-4 font-semibold text-gray-900 dark:text-white">{t("newTeam")}</h2>
          <form onSubmit={handleCreate} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <TextField label={t("name")} value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="w-32">
              <TextField
                label={t("shortName")}
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                maxLength={6}
              />
            </div>
            <Button type="submit" disabled={creating}>
              {creating ? tCommon("loading") : t("create")}
            </Button>
          </form>
          {createError && <p className="mt-2 text-sm text-red-600">{createError}</p>}
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {activeTeams.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">{t("empty")}</p>}
        {activeTeams.map((team) => {
          const isEditing = editingTeamId === team.teamId;
          return (
            <Card key={team.teamId} className={team.active ? "" : "opacity-60"}>
              {isEditing ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <TextField label={t("name")} value={editName} onChange={(e) => setEditName(e.target.value)} required />
                  </div>
                  <div className="w-32">
                    <TextField
                      label={t("shortName")}
                      value={editShortName}
                      onChange={(e) => setEditShortName(e.target.value)}
                      maxLength={6}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleSave(team.teamId)} disabled={saving}>
                      {saving ? tCommon("loading") : tCommon("save")}
                    </Button>
                    <Button variant="secondary" onClick={cancelEdit} disabled={saving}>
                      {tCommon("cancel")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {team.name}
                      {!team.active && (
                        <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">({t("inactive")})</span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{team.shortName}</p>
                  </div>
                  {role === "clubAdmin" && (
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => startEdit(team)}>
                        {t("edit")}
                      </Button>
                      <Button
                        variant={team.active ? "danger" : "secondary"}
                        onClick={() => toggleActive(team)}
                      >
                        {team.active ? t("deactivate") : t("reactivate")}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {archivedTeams.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">{t("archivedTitle")}</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500">{t("archivedBody")}</p>
          {archivedTeams.map((team) => (
            <Card key={team.teamId} className="opacity-60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{team.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{team.shortName}</p>
                </div>
                {role === "clubAdmin" && (
                  <Button
                    variant="secondary"
                    disabled={maxTeams !== null && activeTeams.length >= maxTeams}
                    onClick={() => reactivateArchivedTeam(team)}
                  >
                    {t("reactivate")}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
