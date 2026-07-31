"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, getDocs, onSnapshot, orderBy, query } from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { buildTeamUrl } from "@/lib/publicRoutes";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";

const COUNTRIES = ["Schweiz", "Deutschland", "Österreich", "Liechtenstein"];

interface ClubResult {
  publicClubId: string;
  name: string;
  sport: string;
  country?: string;
  logoUrl: string | null;
}

interface TeamResult {
  teamId: string;
  publicTeamId: string | null;
  name: string;
  shortName: string;
}

// Matches against the flat, globally-readable `publicTeams` mirror (keyed by
// publicTeamId) — used only to find which club a typed team name belongs to.
// It only covers teams that already have a publicTeamId assigned; the actual
// team list shown after picking a club is fetched from that club's own
// `publicClubs/{id}/teams` subcollection instead, which has no such gap.
interface TeamNameMatch {
  publicClubId: string;
  name: string;
  shortName: string;
}

export default function Home() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [country, setCountry] = useState("");
  const [allClubs, setAllClubs] = useState<ClubResult[]>([]);
  const [teamMatchesByClub, setTeamMatchesByClub] = useState<Record<string, TeamNameMatch[]>>({});
  const [selectedClub, setSelectedClub] = useState<ClubResult | null>(null);
  const [teams, setTeams] = useState<TeamResult[]>([]);

  useEffect(() => {
    const { db } = getFirebaseClient();
    // Two realtime listeners so newly registered clubs/teams show up here
    // without a page reload — both collections are small enough at this
    // stage to hold entirely client-side and filter/sort locally as the
    // user types (a real full-text search across club AND team names).
    const unsubscribeClubs = onSnapshot(query(collection(db, "publicClubs"), orderBy("name")), (snap) => {
      setAllClubs(
        snap.docs.map((d) => ({
          publicClubId: d.id,
          name: d.data().name,
          sport: d.data().sport,
          country: d.data().country ?? undefined,
          logoUrl: d.data().logoUrl ?? null,
        }))
      );
    });
    const unsubscribeTeams = onSnapshot(collection(db, "publicTeams"), (snap) => {
      const byClub: Record<string, TeamNameMatch[]> = {};
      snap.docs.forEach((d) => {
        const publicClubId = d.data().publicClubId;
        if (!publicClubId) return;
        (byClub[publicClubId] ??= []).push({
          publicClubId,
          name: d.data().name,
          shortName: d.data().shortName,
        });
      });
      setTeamMatchesByClub(byClub);
    });
    return () => {
      unsubscribeClubs();
      unsubscribeTeams();
    };
  }, []);

  const visibleClubs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return allClubs
      .map((club) => {
        if (country && club.country !== country) return null;
        if (!term) return { club, matchingTeam: null as TeamNameMatch | null };
        if (club.name.toLowerCase().includes(term)) return { club, matchingTeam: null };
        const matchingTeam = (teamMatchesByClub[club.publicClubId] ?? []).find(
          (t) => t.name.toLowerCase().includes(term) || t.shortName.toLowerCase().includes(term)
        );
        return matchingTeam ? { club, matchingTeam } : null;
      })
      .filter((entry): entry is { club: ClubResult; matchingTeam: TeamNameMatch | null } => entry !== null);
  }, [allClubs, teamMatchesByClub, searchTerm, country]);

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
    <main className="min-h-screen bg-brand-white">
      <PublicHeader />

      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
        <div className="text-center">
          <h1 className="font-teko text-4xl font-bold text-gray-900">Verein oder Mannschaft finden</h1>
          <p className="mt-2 text-gray-600">
            Live-Spielstände für kleine und mittlere Sportvereine.
          </p>
        </div>

        <Card>
          <div className="flex flex-col gap-4">
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
                className="rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
              >
                <option value="">Alle Länder</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {!selectedClub && (
          <div className="flex flex-col gap-2">
            {visibleClubs.map(({ club, matchingTeam }) => (
              <Card
                key={club.publicClubId}
                className="flex cursor-pointer items-center gap-3"
                onClick={() => selectClub(club)}
              >
                {club.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={club.logoUrl} alt="" className="h-10 w-10 rounded object-contain" />
                ) : (
                  <div className="h-10 w-10 shrink-0 rounded bg-gray-200" />
                )}
                <div>
                  <p className="font-medium text-gray-900">{club.name}</p>
                  <p className="text-sm text-gray-500">
                    {matchingTeam ? `Mannschaft: ${matchingTeam.name}` : club.sport}
                  </p>
                </div>
              </Card>
            ))}
            {visibleClubs.length === 0 && (
              <p className="text-center text-sm text-gray-500">Keine Vereine gefunden.</p>
            )}
          </div>
        )}

        {selectedClub && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setSelectedClub(null)}
              className="self-start text-sm text-brand-red hover:underline"
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
          <Link href="/register" className="mt-2 text-sm text-brand-red hover:underline">
            Verein registrieren
          </Link>
        </div>
      </div>
    </main>
  );
}
