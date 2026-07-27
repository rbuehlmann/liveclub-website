"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { useClubContext } from "@/components/club/ClubContext";
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
          name: d.data().name,
          shortName: d.data().shortName,
          sport: d.data().sport,
          active: d.data().active ?? true,
        }))
      );
    });
  }, [club]);

  if (!club) return null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!club || !name.trim()) return;
    setCreating(true);
    try {
      const { db } = getFirebaseClient();
      await addDoc(collection(db, "clubs", club.clubId, "teams"), {
        clubId: club.clubId,
        name: name.trim(),
        shortName: shortName.trim() || name.trim().slice(0, 3).toUpperCase(),
        sport: club.sport,
        active: true,
        createdAt: serverTimestamp(),
      });
      setName("");
      setShortName("");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">{t("title")}</h1>

      {role === "clubAdmin" && (
        <Card>
          <h2 className="mb-4 font-semibold text-gray-900">{t("newTeam")}</h2>
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
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {teams.length === 0 && <p className="text-sm text-gray-500">{t("empty")}</p>}
        {teams.map((team) => (
          <Card key={team.teamId} className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">{team.name}</p>
              <p className="text-sm text-gray-500">{team.shortName}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
