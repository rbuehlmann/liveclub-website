"use client";

import { useEffect, useMemo, useState } from "react";
import NextLink from "next/link";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { collection, getDocs, onSnapshot, orderBy, query, Timestamp } from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { buildTeamUrl } from "@/lib/publicRoutes";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { HeroPhoneMockup, type HeroPhoneGame } from "@/components/home/HeroPhoneMockup";
import { SearchMapDecoration } from "@/components/home/SearchMapDecoration";
import { LICENSE_TIERS } from "@/lib/licenseTiers";
import { useMobilePlatform } from "@/lib/useMobilePlatform";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/storeLinks";

// Values match clubs' stored `country` field exactly (always German —
// registration itself isn't translated yet, see the 2026-08-24 i18n
// scope decision) — only the *displayed* label is translated, via
// home.countries in messages/{locale}.json, keyed by these same strings.
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

interface HeroGame {
  gameId: string;
  publicClubId: string;
  status: string;
  homeTeamName: string;
  awayTeamName: string;
  homeClubPublicId: string | null;
  awayClubPublicId: string | null;
  scoreHome: number;
  scoreAway: number;
}

// Small, thin-stroke icons for the hero's feature row — no icon library in
// this project, and three one-off inline SVGs are cheaper than adding one.
function BoltIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" />
      <circle cx="10" cy="7" r="4" />
      <path d="M22 20v-1a4 4 0 0 0-3-3.87" />
      <path d="M17 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

export default function Home() {
  const t = useTranslations("home");
  // Reused for the hero mockup's game-status label — same wording as every
  // other live-score view, not a duplicated copy of it.
  const tPublicClub = useTranslations("publicClub");
  const router = useRouter();
  const platform = useMobilePlatform();
  const [searchTerm, setSearchTerm] = useState("");
  const [country, setCountry] = useState("");
  const [allClubs, setAllClubs] = useState<ClubResult[]>([]);
  const [teamMatchesByClub, setTeamMatchesByClub] = useState<Record<string, TeamNameMatch[]>>({});
  const [selectedClub, setSelectedClub] = useState<ClubResult | null>(null);
  const [teams, setTeams] = useState<TeamResult[]>([]);
  const [rawGames, setRawGames] = useState<HeroGame[]>([]);

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
    // Powers the homepage's "Live jetzt" / "Gespielte Spiele" stats AND the
    // hero's phone mockup (one real live game, if any exist) — full game
    // shape kept for that, not just the counts the stats strip needs.
    const unsubscribeGames = onSnapshot(collection(db, "publicGames"), (snap) => {
      setRawGames(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            gameId: d.id,
            publicClubId: data.publicClubId,
            status: data.status,
            homeTeamName: data.homeTeamName,
            awayTeamName: data.awayTeamName,
            homeClubPublicId: data.homeClubPublicId ?? null,
            awayClubPublicId: data.awayClubPublicId ?? null,
            scoreHome: data.scoreHome ?? 0,
            scoreAway: data.scoreAway ?? 0,
          };
        })
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

  const registeredTeamsCount = useMemo(() => {
    let count = 0;
    for (const [publicClubId, teams] of Object.entries(teamMatchesByClub)) {
      if (licensedClubIds.has(publicClubId)) count += teams.length;
    }
    return count;
  }, [teamMatchesByClub, licensedClubIds]);

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

  // The hero's phone mockup shows one real live game when there is one —
  // falls back to an honestly-labeled illustrative example (see
  // t("exampleLabel")) rather than fabricating a fake "live" game.
  const exampleGame = useMemo(
    () =>
      rawGames.find(
        (g) => licensedClubIds.has(g.publicClubId) && (g.status === "live" || g.status === "paused")
      ) ?? null,
    [rawGames, licensedClubIds]
  );

  // Two random real clubs for the phone mockup's fallback state (no live
  // game right now) — picked once per page load, not on every Firestore
  // tick, so it doesn't reshuffle under the visitor; a fresh reload picks
  // again (2026-08-29 "random ein Clubicon" request).
  const [exampleClubs, setExampleClubs] = useState<[ClubResult, ClubResult] | null>(null);
  useEffect(() => {
    if (exampleClubs) return;
    const pool = allClubs.filter(isClubLicenseOk);
    if (pool.length < 2) return;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    setExampleClubs([shuffled[0], shuffled[1]]);
  }, [allClubs, exampleClubs]);

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

  // What the hero's iPhone mockup shows — a real live game when one exists
  // (isLive: true, drives the pulsing "LIVE" dot), otherwise the same
  // once-per-load random example the mockup already picked (isLive: false,
  // labeled "Beispielansicht" instead of claiming to be live). Shared by
  // both the desktop hero and the mobile app-first view below.
  const heroPhoneGame: HeroPhoneGame = exampleGame
    ? {
        homeTeamName: exampleGame.homeTeamName,
        awayTeamName: exampleGame.awayTeamName,
        homeClubPublicId: exampleGame.homeClubPublicId,
        awayClubPublicId: exampleGame.awayClubPublicId,
        scoreHome: exampleGame.scoreHome,
        scoreAway: exampleGame.scoreAway,
        statusLabel: tPublicClub.has(`status.${exampleGame.status}`)
          ? tPublicClub(`status.${exampleGame.status}`)
          : exampleGame.status,
        isLive: true,
      }
    : {
        homeTeamName: exampleClubs?.[0].name ?? "FC Musterhausen",
        awayTeamName: exampleClubs?.[1].name ?? "SV Beispiel",
        homeClubPublicId: exampleClubs?.[0].publicClubId ?? null,
        awayClubPublicId: exampleClubs?.[1].publicClubId ?? null,
        scoreHome: 2,
        scoreAway: 1,
        statusLabel: t("exampleLabel"),
        isLive: false,
      };

  if (platform) {
    // Phone, app not installed (an install has it already open via
    // Universal/App Links before this ever renders) — the desktop hero/
    // search below is built for picking a club to administer, not for a
    // fan on their phone, so this is its own fan-first hero instead
    // (2026-08-28 decision, redesigned 2026-08-30 — reuses the same
    // HeroPhoneMockup and heroPhoneGame data as the desktop hero, just a
    // different surrounding layout). PublicHeader itself is untouched —
    // shared with desktop, not a mobile-specific concern.
    return (
      <main className="min-h-screen bg-brand-white dark:bg-brand-black">
        <PublicHeader />
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 hidden dark:block">
            <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-brand-emerald/10 blur-3xl" />
            <div className="absolute top-1/3 left-0 h-64 w-64 rounded-full bg-brand-red/10 blur-3xl" />
          </div>
          <div className="relative mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-10 text-center">
            {heroPhoneGame.isLive && (
              <span className="flex items-center gap-1.5 rounded-full border border-brand-orange/30 bg-brand-orange/10 px-3 py-1 text-xs font-bold text-brand-orange">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-orange" />
                LIVE
              </span>
            )}
            <h1 className="font-teko text-5xl leading-[0.95] font-bold uppercase text-gray-900 dark:text-white">
              {t("heroTitleLine1")}
              <br />
              <span className="text-brand-red">{t("heroTitleLine2")}</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-300">{t("mobileHeroSubtitle")}</p>
            <p className="font-teko text-2xl font-bold text-brand-red">{t("freeForeverTitle")}</p>

            {/* Scrolls to the real store badges below instead of opening a
                store URL directly — one identical page/flow for iOS and
                Android alike (2026-08-30 report), rather than trusting UA
                sniffing to pick the right store. Plain <a>, not the i18n
                Link: Next's client router doesn't scroll to a hash when
                the pathname itself isn't changing, a real anchor always
                does. "Verein registrieren" removed — this page is for
                fans, not club admins (still reachable from the desktop
                hero/footer). */}
            <a
              href="#store-badges"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-red px-6 py-4 text-base font-bold text-brand-red-text uppercase"
            >
              {t("mobileAppCta")} →
            </a>

            <div className="py-2">
              <HeroPhoneMockup game={heroPhoneGame} />
            </div>

            <div className="grid w-full grid-cols-3 gap-3">
              <div className="flex flex-col items-center gap-1">
                <BoltIcon className="h-6 w-6 text-brand-red" />
                <span className="text-xs font-bold text-gray-900 uppercase dark:text-white">
                  {t("mobileFeatureLiveTitle")}
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  {t("mobileFeatureLiveBody")}
                </span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <BellIcon className="h-6 w-6 text-brand-red" />
                <span className="text-xs font-bold text-gray-900 uppercase dark:text-white">
                  {t("mobileFeaturePushTitle")}
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  {t("mobileFeaturePushBody")}
                </span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <HeartIcon className="h-6 w-6 text-brand-red" />
                <span className="text-xs font-bold text-gray-900 uppercase dark:text-white">
                  {t("mobileFeatureClubTitle")}
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  {t("mobileFeatureClubBody")}
                </span>
              </div>
            </div>

            <div id="store-badges" className="flex scroll-mt-6 gap-3">
              <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/badges/app-store-badge.svg" alt="App Store" className="h-10" />
              </a>
              <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/badges/google-play-badge.svg" alt="Google Play" className="h-10" />
              </a>
            </div>
          </div>
        </div>
        <PublicFooter />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-white dark:bg-brand-black">
      <PublicHeader />

      {/* Hero — dark-mode-first (see 2026-08-29 "dark mode first" decision);
          the glow/gradient backdrop below only renders in dark mode, light
          mode keeps the plain page background. */}
      <section id="funktionen" className="relative overflow-hidden scroll-mt-6">
        <div className="pointer-events-none absolute inset-0 hidden dark:block">
          <div className="absolute -top-40 right-0 h-[34rem] w-[34rem] rounded-full bg-brand-emerald/10 blur-3xl" />
          <div className="absolute top-1/2 left-0 h-[26rem] w-[26rem] -translate-y-1/2 rounded-full bg-brand-red/10 blur-3xl" />
        </div>
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <h1 className="font-teko text-6xl leading-[0.95] font-bold text-gray-900 sm:text-7xl dark:text-white">
              {t("heroTitleLine1")}
              <br />
              <span className="text-brand-red">{t("heroTitleLine2")}</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-gray-600 dark:text-gray-300">{t("subtitle")}</p>

            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                <BoltIcon className="h-5 w-5 text-brand-red" />
                {t("heroFeatureLive")}
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                <BellIcon className="h-5 w-5 text-brand-red" />
                {t("heroFeaturePush")}
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                <UsersIcon className="h-5 w-5 text-brand-red" />
                {t("heroFeatureTeam")}
              </div>
            </div>

            <div className="mt-9 flex flex-wrap gap-3">
              {/* /register lives outside the [locale] tree (2026-08-24 scope
                  decision) — plain next/link, not the locale-aware one. */}
              <NextLink href="/register">
                <Button className="px-6 py-3.5 text-base">{t("registerClub")}</Button>
              </NextLink>
              {/* Deliberately NOT another route to /register: someone who
                  only wants to follow their club as a fan shouldn't ever
                  end up creating a club-admin account just to do that
                  (2026-08-29 report) — this goes straight to the app
                  download instead. Plain <a>, not the i18n Link: Next's
                  client router doesn't scroll to a hash when the pathname
                  itself isn't changing (already on the homepage), a real
                  anchor always does. Not <Button variant="secondary">
                  either — that variant's bg-brand-silver/25 is nearly
                  invisible against the hero's own light-mode background, a
                  visible border reads in both themes instead. */}
              <a
                href="#app-download"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3.5 text-base font-semibold text-gray-900 transition-colors hover:bg-gray-50 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
              >
                <BellIcon className="h-4 w-4" />
                {t("followClub")}
              </a>
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <CheckIcon className="h-4 w-4 text-brand-emerald" />
              {t("trialNotice")}
            </p>
          </div>

          {/* Phone mockup — hidden below lg, no room for it next to the
              headline at narrower widths. Desktop-only by construction. */}
          <div className="relative hidden items-center justify-center lg:flex">
            <HeroPhoneMockup game={heroPhoneGame} />
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-16">
        {/* Stats strip */}
        <div className="grid grid-cols-4 divide-x divide-gray-200 rounded-xl border border-gray-200 bg-white py-5 dark:divide-white/10 dark:border-white/10 dark:bg-white/5">
          <div className="flex flex-col items-center gap-1">
            <p className="font-teko text-3xl font-bold text-gray-900 dark:text-white">{registeredTeamsCount}</p>
            <p className="text-center text-xs text-gray-500 dark:text-gray-400">{t("statsTeams")}</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="font-teko text-3xl font-bold text-gray-900 dark:text-white">{licensedClubIds.size}</p>
            <p className="text-center text-xs text-gray-500 dark:text-gray-400">{t("statsClubs")}</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="font-teko text-3xl font-bold text-gray-900 dark:text-white">
              {gameStatusCounts.finished}
            </p>
            <p className="text-center text-xs text-gray-500 dark:text-gray-400">{t("statsFinished")}</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <p
              className={`font-teko text-3xl font-bold ${
                gameStatusCounts.live > 0 ? "text-brand-orange" : "text-gray-900 dark:text-white"
              }`}
            >
              {gameStatusCounts.live}
            </p>
            <p className="text-center text-xs text-gray-500 dark:text-gray-400">{t("statsLive")}</p>
          </div>
        </div>

        {/* Search — full-width card (matches the stats strip above), with a
            decorative map alongside the fields on large screens. The
            results/selected-club lists below stay in their own narrower
            column — a list of clubs stretched edge-to-edge would be harder
            to scan, not easier. */}
        <Card>
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="mb-4 font-teko text-2xl font-bold text-gray-900 dark:text-white">
                {t("searchHeading")}
              </h2>
              <div className="flex flex-col gap-4">
                <TextField
                  label={t("clubNameLabel")}
                  placeholder={t("clubNamePlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("countryLabel")}
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20 dark:border-white/15 dark:bg-white/5 dark:text-white"
                  >
                    <option value="">{t("allCountries")}</option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {t(`countries.${c}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="hidden lg:block">
              <SearchMapDecoration />
            </div>
          </div>
        </Card>

        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
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
                      {matchingTeam ? t("matchingTeam", { name: matchingTeam.name }) : club.sport}
                    </p>
                  </div>
                </Card>
              ))}
              {searchTerm.trim() && visibleClubs.length === 0 && (
                <div className="flex flex-col items-center gap-1 py-2 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t("noClubsFound")}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t("missingClub")}{" "}
                    <Link href="/verein-empfehlen" className="text-brand-red-link hover:underline">
                      {t("tellUs")}
                    </Link>
                  </p>
                </div>
              )}
            </div>
          )}

          {selectedClub && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setSelectedClub(null)}
                className="self-start text-sm text-brand-red-link hover:underline"
              >
                {t("backToSearch")}
              </button>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("teamOf", { name: selectedClub.name })}
              </p>
              {teams.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{t("noTeamsYet")}</p>
              )}
              {teams.map((team) => (
                <Card key={team.teamId} className="cursor-pointer" onClick={() => selectTeam(team)}>
                  <p className="font-medium text-gray-900 dark:text-white">{team.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{team.shortName}</p>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Pricing — real tiers/prices from licenseTiers.ts (the same file
            the dashboard billing page uses), tier *labels* re-translated
            here rather than pulled from that file's hardcoded German
            strings, same as the dashboard's own pricingTiers keys do. */}
        <div id="preise" className="scroll-mt-6 text-center">
          <h2 className="font-teko text-3xl font-bold text-gray-900 dark:text-white">
            {t("pricingHeading")}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-600 dark:text-gray-400">
            {t("pricingSubtitle")}
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {LICENSE_TIERS.map((tier) => (
              <Card key={tier.id} className="flex flex-col items-center gap-4 text-center">
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                  {t(`pricingTiers.${tier.id}`)}
                </p>
                <div>
                  <span className="font-teko text-4xl font-bold text-gray-900 dark:text-white">
                    {tier.monthlyPrice}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400"> {t("pricingPerMonth")}</span>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {t("pricingOrYearly", { price: tier.yearlyPrice })}
                </p>
                {/* /register lives outside the [locale] tree (2026-08-24
                    scope decision) — plain next/link, not the locale-aware
                    one. */}
                <NextLink href="/register" className="mt-2 w-full">
                  <Button variant="secondary" fullWidth>
                    {t("pricingCta")}
                  </Button>
                </NextLink>
              </Card>
            ))}
          </div>
        </div>

        {/* Bottom CTA cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card id="app-download" className="flex scroll-mt-6 flex-col justify-between gap-4">
            <div>
              <h3 className="font-teko text-2xl font-bold text-brand-red">{t("appCardTitle")}</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("appCardBody")}</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{t("betaNotice")}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/badges/app-store-badge.svg" alt="App Store" className="h-10" />
              </a>
              <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/badges/google-play-badge.svg" alt="Google Play" className="h-10" />
              </a>
            </div>
          </Card>

          <Card className="flex flex-col justify-between gap-4">
            <div>
              <h3 className="font-teko text-2xl font-bold text-gray-900 dark:text-white">
                {t("clubCardTitle")}
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("clubCardBody")}</p>
            </div>
            {/* /register lives outside the [locale] tree (2026-08-24 scope
                decision) — plain next/link, not the locale-aware one. */}
            <NextLink href="/register" className="self-start">
              <Button>{t("registerClub")}</Button>
            </NextLink>
          </Card>
        </div>
      </div>

      <PublicFooter />
    </main>
  );
}
