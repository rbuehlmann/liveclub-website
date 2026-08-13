"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, getDocs, onSnapshot, orderBy, query, Timestamp } from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { buildTeamUrl } from "@/lib/publicRoutes";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
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
  licenseStatus: string | null;
  licenseValidUntil: Timestamp | null;
}

// Mirrors firestore.rules' clubLicenseOk — Firestore can't gate an
// unfiltered `list` query per-document (it would deny the whole query the
// moment any one club is expired, not just hide that club — see the rules
// file for why), so the homepage instead reads everything and filters here.
function isClubLicenseOk(club: Pick<ClubResult, "licenseStatus" | "licenseValidUntil">): boolean {
  if (club.licenseStatus !== "active") return false;
  if (!club.licenseValidUntil) return true;
  return club.licenseValidUntil.toMillis() > Date.now();
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
  const [rawGames, setRawGames] = useState<{ publicClubId: string; status: string }[]>([]);

  useEffect(() => {
    const { db } = getFirebaseClient();
    // Realtime listeners so newly registered clubs/teams/games show up here
    // without a page reload — all three collections are small enough at this
    // stage to hold entirely client-side and filter/sort locally as the
    // user types (a real full-text search across club AND team names).
    // Unrestricted reads (firestore.rules can't gate a `list` per-document —
    // see clubLicenseOk there) — expired/cancelled clubs are filtered out
    // below instead, once for search and once for the stats strip.
    const unsubscribeClubs = onSnapshot(query(collection(db, "publicClubs"), orderBy("name")), (snap) => {
      setAllClubs(
        snap.docs.map((d) => ({
          publicClubId: d.id,
          name: d.data().name,
          sport: d.data().sport,
          country: d.data().country ?? undefined,
          logoUrl: d.data().logoUrl ?? null,
          licenseStatus: d.data().licenseStatus ?? null,
          licenseValidUntil: d.data().licenseValidUntil ?? null,
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
    // Powers the homepage's "Live jetzt" / "Gespielte Spiele" stats — counts
    // only, cross-referenced against licensed clubs below.
    const unsubscribeGames = onSnapshot(collection(db, "publicGames"), (snap) => {
      setRawGames(
        snap.docs.map((d) => ({ publicClubId: d.data().publicClubId, status: d.data().status }))
      );
    });
    return () => {
      unsubscribeClubs();
      unsubscribeTeams();
      unsubscribeGames();
    };
  }, []);

  const licensedClubIds = useMemo(
    () => new Set(allClubs.filter(isClubLicenseOk).map((c) => c.publicClubId)),
    [allClubs]
  );

  const gameStatusCounts = useMemo(() => {
    let finished = 0;
    let live = 0;
    rawGames.forEach((g) => {
      if (!licensedClubIds.has(g.publicClubId)) return;
      if (g.status === "finished") finished += 1;
      else if (g.status === "live" || g.status === "paused") live += 1;
    });
    return { finished, live };
  }, [rawGames, licensedClubIds]);

  const visibleClubs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    // No search term yet -> show nothing (the homepage is search-first, it
    // never dumps the full club list up front).
    if (!term) return [];
    return allClubs
      .map((club) => {
        if (!licensedClubIds.has(club.publicClubId)) return null;
        if (country && club.country !== country) return null;
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
    <main className="min-h-screen bg-brand-white dark:bg-brand-black">
      <PublicHeader />

      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
        <div className="text-center">
          <h1 className="font-teko text-5xl font-bold text-gray-900 dark:text-white">LiveClub</h1>
          <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-brand-red">
            Dein Verein. Direkt dabei.
          </p>
          <p className="mt-3 text-gray-600 dark:text-gray-400">
            Live-Spielstände für kleine und mittlere Sportvereine.
          </p>
        </div>

        <div className="grid grid-cols-3 divide-x divide-gray-200 rounded-xl border border-gray-200 bg-white py-4 dark:divide-white/10 dark:border-white/10 dark:bg-white/5">
          <div className="flex flex-col items-center gap-1">
            <p className="font-teko text-3xl font-bold text-gray-900 dark:text-white">{licensedClubIds.size}</p>
            <p className="text-center text-xs text-gray-500 dark:text-gray-400">Registrierte Vereine</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="font-teko text-3xl font-bold text-gray-900 dark:text-white">
              {gameStatusCounts.finished}
            </p>
            <p className="text-center text-xs text-gray-500 dark:text-gray-400">Gespielte Spiele</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <p
              className={`font-teko text-3xl font-bold ${
                gameStatusCounts.live > 0 ? "text-brand-red" : "text-gray-900 dark:text-white"
              }`}
            >
              {gameStatusCounts.live}
            </p>
            <p className="text-center text-xs text-gray-500 dark:text-gray-400">Live jetzt</p>
          </div>
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
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Land</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20 dark:border-white/15 dark:bg-white/5 dark:text-white"
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
                  <div className="h-10 w-10 shrink-0 rounded bg-gray-200 dark:bg-white/10" />
                )}
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{club.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {matchingTeam ? `Mannschaft: ${matchingTeam.name}` : club.sport}
                  </p>
                </div>
              </Card>
            ))}
            {searchTerm.trim() && visibleClubs.length === 0 && (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">Keine Vereine gefunden.</p>
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
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Mannschaft von {selectedClub.name}</p>
            {teams.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">Noch keine Mannschaften vorhanden.</p>
            )}
            {teams.map((team) => (
              <Card key={team.teamId} className="cursor-pointer" onClick={() => selectTeam(team)}>
                <p className="font-medium text-gray-900 dark:text-white">{team.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{team.shortName}</p>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-col items-center gap-3 border-t border-gray-200 pt-8 dark:border-white/10">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            LiveClub-App für Fans — jetzt am Beta-Test teilnehmen
          </p>
          <div className="flex gap-3">
            <a href="https://testflight.apple.com/join/VB8bURxn" target="_blank" rel="noopener noreferrer">
              <Button variant="secondary">App Store</Button>
            </a>
            <a href="https://play.google.com/apps/internaltest/4700742118610871712" target="_blank" rel="noopener noreferrer">
              <Button variant="secondary">Play Store</Button>
            </a>
          </div>
          <Link href="/register" className="mt-2 text-sm text-brand-red hover:underline">
            Verein registrieren
          </Link>
        </div>
      </div>
      <PublicFooter />
    </main>
  );
}
