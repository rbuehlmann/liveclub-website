"use client";

import { useState } from "react";
import {
  adminListTeamInfos,
  adminModerateTeamInfo,
  AdminTeamInfoListItem,
} from "@/lib/firebase/functionsApi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDateTimeDe } from "@/lib/date";

export default function AdminTeamInfosPage() {
  const [teamId, setTeamId] = useState("");
  const [teamNameQuery, setTeamNameQuery] = useState("");
  const [infos, setInfos] = useState<AdminTeamInfoListItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingInfo, setDeletingInfo] = useState<AdminTeamInfoListItem | null>(null);
  const [editingInfo, setEditingInfo] = useState<AdminTeamInfoListItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editText, setEditText] = useState("");

  async function runSearch() {
    setLoading(true);
    setSearchError(null);
    try {
      const results = await adminListTeamInfos({
        teamId: teamId.trim() || undefined,
        teamNameQuery: teamNameQuery.trim() || undefined,
      });
      setInfos(results);
    } catch (err) {
      setSearchError((err as { message?: string })?.message ?? "Suche fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  function updateInfo(infoId: string, patch: Partial<AdminTeamInfoListItem>) {
    setInfos((prev) => (prev ? prev.map((i) => (i.infoId === infoId ? { ...i, ...patch } : i)) : prev));
  }

  async function handleDelete() {
    if (!deletingInfo) return;
    setBusyId(deletingInfo.infoId);
    setActionError(null);
    try {
      await adminModerateTeamInfo({ infoId: deletingInfo.infoId, action: "delete" });
      updateInfo(deletingInfo.infoId, { hidden: true, hiddenByRole: "admin" });
      setDeletingInfo(null);
    } catch (err) {
      setActionError((err as { message?: string })?.message ?? "Aktion fehlgeschlagen.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRestore(info: AdminTeamInfoListItem) {
    setBusyId(info.infoId);
    setActionError(null);
    try {
      await adminModerateTeamInfo({ infoId: info.infoId, action: "restore" });
      updateInfo(info.infoId, { hidden: false, hiddenByRole: null });
    } catch (err) {
      setActionError((err as { message?: string })?.message ?? "Aktion fehlgeschlagen.");
    } finally {
      setBusyId(null);
    }
  }

  function openEdit(info: AdminTeamInfoListItem) {
    setEditingInfo(info);
    setEditTitle(info.title ?? "");
    setEditText(info.text ?? "");
  }

  async function handleEditSave() {
    if (!editingInfo) return;
    setBusyId(editingInfo.infoId);
    setActionError(null);
    try {
      await adminModerateTeamInfo({
        infoId: editingInfo.infoId,
        action: "edit",
        title: editTitle.trim(),
        text: editText.trim(),
      });
      updateInfo(editingInfo.infoId, { title: editTitle.trim(), text: editText.trim() });
      setEditingInfo(null);
    } catch (err) {
      setActionError((err as { message?: string })?.message ?? "Aktion fehlgeschlagen.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Team-Infos</h1>

      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <TextField label="Team-ID" value={teamId} onChange={(e) => setTeamId(e.target.value)} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <TextField
              label="Team-/Vereinsname"
              value={teamNameQuery}
              onChange={(e) => setTeamNameQuery(e.target.value)}
            />
          </div>
          <Button onClick={runSearch} disabled={loading}>
            {loading ? "Wird gesucht …" : "Suchen"}
          </Button>
        </div>
        {searchError && <p className="mt-2 text-sm text-red-600">{searchError}</p>}
      </Card>

      {actionError && <p className="text-sm text-red-600">{actionError}</p>}

      {infos && infos.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">Keine Treffer.</p>
      )}

      <div className="flex flex-col gap-3">
        {infos?.map((info) => (
          <Card key={info.infoId} className={info.hidden ? "opacity-60" : ""}>
            <p className="font-medium text-gray-900 dark:text-white">
              {info.teamName ?? "–"}{" "}
              <span className="font-normal text-gray-500 dark:text-gray-400">
                · {info.clubName ?? "–"} · {info.teamId}
              </span>
            </p>
            <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">{info.title}</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{info.text}</p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              {formatDateTimeDe(info.createdAt)}
              {info.hidden ? ` · Ausgeblendet (${info.hiddenByRole ?? "?"})` : ""}
            </p>
            <div className="mt-3 flex gap-2">
              {info.hidden ? (
                <Button
                  variant="secondary"
                  disabled={busyId === info.infoId}
                  onClick={() => handleRestore(info)}
                >
                  Wiederherstellen
                </Button>
              ) : (
                <Button
                  variant="danger"
                  disabled={busyId === info.infoId}
                  onClick={() => setDeletingInfo(info)}
                >
                  Löschen
                </Button>
              )}
              <Button
                variant="secondary"
                disabled={busyId === info.infoId}
                onClick={() => openEdit(info)}
              >
                Bearbeiten
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={!!deletingInfo}
        title="Team-Info löschen?"
        body="Die Mitteilung wird ausgeblendet (nicht endgültig gelöscht) und verschwindet sofort aus dem Feed der App. Über 'Wiederherstellen' lässt sich das rückgängig machen."
        confirmLabel={busyId === deletingInfo?.infoId ? "Wird gelöscht …" : "Löschen"}
        cancelLabel="Abbrechen"
        onConfirm={handleDelete}
        onCancel={() => setDeletingInfo(null)}
      />

      {editingInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Team-Info bearbeiten</h2>
            <div className="mt-4 flex flex-col gap-4">
              <TextField label="Titel" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Text</label>
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={4}
                  className="rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 dark:border-white/15 dark:bg-white/5 dark:text-white"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setEditingInfo(null)}>
                Abbrechen
              </Button>
              <Button
                fullWidth
                disabled={busyId === editingInfo.infoId || !editTitle.trim() || !editText.trim()}
                onClick={handleEditSave}
              >
                {busyId === editingInfo.infoId ? "Wird gespeichert …" : "Speichern"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
