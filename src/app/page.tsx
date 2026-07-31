"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  collection,
  endAt,
  getDocs,
  orderBy,
  query,
  startAt,
  where,
} from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { buildTeamUrl } from "@/lib/publicRoutes";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";

const COUNTRIES = ["Schweiz", "Deutschland", "Österreich", "Liechtenstein"];

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

export default function Home() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [country, setCountry] = useState("");
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [clubs, setClubs] = useState<ClubResult[]>([]);
  const [selectedClub, setSelectedClub] = useState<ClubResult | null>(null);
  const [teams, setTeams] = useState<TeamResult[]>([]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = searchTerm.trim();
    if (!term) return;
    setSearching(true);
    setSearched(true);
    setSelectedClub(null);
    setTeams([]);
    try {
      const { db } = getFirebaseClient();
      // Firestore has no full-text search — this is a plain, case-sensitive
      // prefix match on the club name, good enough at the current scale.
      const constraints = country
        ? [where("country", "==", country), orderBy("name"), startAt(term), endAt(term + "")]
        : [orderBy("name"), startAt(term), endAt(term + "")];
      const snap = await getDocs(query(collection(db, "publicClubs"), ...constraints));
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
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <span className="font-teko text-3xl font-bold text-gray-900">LiveClub</span>
          <Link href="/login">
            <Button variant="secondary">Anmelden</Button>
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
        <div className="text-center">
          <h1 className="font-teko text-4xl font-bold text-gray-900">Verein oder Mannschaft finden</h1>
          <p className="mt-2 text-gray-600">
            Live-Spielstände für kleine und mittlere Sportvereine.
          </p>
        </div>

        <Card>
          <form onSubmit={handleSearch} className="flex flex-col gap-4">
            <TextField
              label="Vereinsname"
              placeholder="z. B. FC Musterhausen"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Land</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="rounded-lg border border-gray-300 px-4 py-3 text-base"
              >
                <option value="">Alle Länder</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-3 text-base font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
              disabled={searching}
            >
              {searching ? "Suche läuft…" : "Suchen"}
            </button>
          </form>
        </Card>

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

        {!selectedClub && searched && clubs.length === 0 && !searching && (
          <p className="text-center text-sm text-gray-500">Keine Vereine gefunden.</p>
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
              <Card key={team.teamId} className="cursor-pointer" onClick={() => selectTeam(team)}>
                <p className="font-medium text-gray-900">{team.name}</p>
                <p className="text-sm text-gray-500">{team.shortName}</p>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-col items-center gap-3 border-t border-gray-200 pt-8">
          <p className="text-xs text-gray-400">Bald verfügbar: die LiveClub-App für Fans</p>
          <div className="flex gap-3">
            <Button variant="secondary" disabled>
              App Store
            </Button>
            <Button variant="secondary" disabled>
              Play Store
            </Button>
          </div>
          <Link href="/register" className="mt-2 text-sm text-blue-700 hover:underline">
            Verein registrieren
          </Link>
        </div>
      </div>
    </main>
  );
}
