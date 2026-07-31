"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  endAt,
  getDocs,
  orderBy,
  query,
  startAt,
} from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { buildTeamUrl } from "@/lib/publicRoutes";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";

interface ClubResult {
  publicClubId: string;
  name: string;
  sport: string;
  logoUrl: string | null;
}

interface TeamResult {
  teamId: string;
  publicTeamId: string | null;
  name: string;
  shortName: string;
}

export default function SearchPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [clubs, setClubs] = useState<ClubResult[]>([]);
  const [selectedClub, setSelectedClub] = useState<ClubResult | null>(null);
  const [teams, setTeams] = useState<TeamResult[]>([]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = searchTerm.trim();
    if (!term) return;
    setSearching(true);
    setSelectedClub(null);
    setTeams([]);
    try {
      const { db } = getFirebaseClient();
      // Firestore has no full-text search — this is a plain, case-sensitive
      // prefix match on the club name, good enough at the current scale.
      const snap = await getDocs(
        query(
          collection(db, "publicClubs"),
          orderBy("name"),
          startAt(term),
          endAt(term + "")
        )
      );
      setClubs(
        snap.docs.map((d) => ({
          publicClubId: d.id,
          name: d.data().name,
          sport: d.data().sport,
          logoUrl: d.data().logoUrl ?? null,
        }))
      );
    } finally {
      setSearching(false);
    }
  }

  async function selectClub(club: ClubResult) {
    setSelectedClub(club);
    setTeams([]);
    const { db } = getFirebaseClient();
    const snap = await getDocs(collection(db, "publicClubs", club.publicClubId, "teams"));
    setTeams(
      snap.docs.map((d) => ({
        teamId: d.id,
        publicTeamId: d.data().publicTeamId ?? null,
        name: d.data().name,
        shortName: d.data().shortName,
      }))
    );
  }

  function selectTeam(team: TeamResult) {
    if (!team.publicTeamId) return;
    router.push(buildTeamUrl(team.publicTeamId));
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-4 py-12">
      <h1 className="font-teko text-4xl font-bold text-gray-900">Verein suchen</h1>
      <form onSubmit={handleSearch} className="flex flex-col gap-4">
        <TextField
          label="Vereinsname"
          placeholder="z. B. FC Musterhausen"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-5 py-3 text-base font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
          disabled={searching}
        >
          {searching ? "Suche läuft…" : "Suchen"}
        </button>
      </form>

      {!selectedClub && clubs.length > 0 && (
        <div className="flex flex-col gap-2">
          {clubs.map((club) => (
            <Card
              key={club.publicClubId}
              className="flex cursor-pointer items-center gap-3"
              onClick={() => selectClub(club)}
            >
              {club.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={club.logoUrl} alt="" className="h-10 w-10 rounded object-contain" />
              )}
              <div>
                <p className="font-medium text-gray-900">{club.name}</p>
                <p className="text-sm text-gray-500">{club.sport}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!selectedClub && clubs.length === 0 && searchTerm && !searching && (
        <p className="text-sm text-gray-500">Keine Vereine gefunden.</p>
      )}

      {selectedClub && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setSelectedClub(null)}
            className="self-start text-sm text-blue-700 hover:underline"
          >
            ← Zurück zur Suche
          </button>
          <p className="text-sm font-medium text-gray-700">Mannschaft von {selectedClub.name}</p>
          {teams.length === 0 && (
            <p className="text-sm text-gray-500">Noch keine Mannschaften vorhanden.</p>
          )}
          {teams.map((team) => (
            <Card
              key={team.teamId}
              className="cursor-pointer"
              onClick={() => selectTeam(team)}
            >
              <p className="font-medium text-gray-900">{team.name}</p>
              <p className="text-sm text-gray-500">{team.shortName}</p>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
