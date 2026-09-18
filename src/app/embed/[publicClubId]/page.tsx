"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { collection, doc, limit as fbLimit, onSnapshot, query, where } from "firebase/firestore";
import { Timestamp } from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { TeamIcon } from "@/components/TeamIcon";
import { useBranding } from "@/components/layout/BrandingProvider";
import { formatDateDe } from "@/lib/date";
import { PublicClub, PublicGame } from "@/lib/types";

// mode=single (default, no param needed) is the original, unchanged embed —
// existing third-party embeds never send `mode` at all, so this branch must
// keep behaving exactly as before forever. mode=feed is new (see
// dashboard/share/page.tsx's generator).
function SingleGameEmbed({ publicClubId, teamId }: { publicClubId: string; teamId: string | null }) {
  const [club, setClub] = useState<PublicClub | null>(null);
  const [game, setGame] = useState<PublicGame | null>(null);

  useEffect(() => {
    const { db } = getFirebaseClient();
    return onSnapshot(
      doc(db, "publicClubs", publicClubId),
      (snap) => {
        const data = snap.data();
        if (!data) {
          setClub(null);
          return;
        }
        setClub({
          publicClubId: snap.id,
          clubId: data.clubId,
          name: data.name,
          sport: data.sport,
          logoUrl: data.logoUrl ?? null,
          currentLiveGameId: data.currentLiveGameId ?? null,
          currentLiveGameIdByTeam: data.currentLiveGameIdByTeam ?? {},
        });
      },
      // A club with an expired/cancelled license is denied by
      // firestore.rules — the widget just renders blank, same as "not
      // found", so a third-party site embedding it degrades quietly.
      () => setClub(null)
    );
  }, [publicClubId]);

  const liveGameId = teamId ? club?.currentLiveGameIdByTeam?.[teamId] : club?.currentLiveGameId;

  useEffect(() => {
    if (!liveGameId) {
      setGame(null);
      return;
    }
    const { db } = getFirebaseClient();
    return onSnapshot(doc(db, "publicGames", liveGameId), (snap) => {
      const data = snap.data();
      if (!data) return;
      setGame({
        gameId: snap.id,
        clubId: data.clubId,
        publicClubId: data.publicClubId,
        teamId: data.teamId,
        homeTeamName: data.homeTeamName,
        awayTeamName: data.awayTeamName,
        homeClubPublicId: data.homeClubPublicId ?? null,
        awayClubPublicId: data.awayClubPublicId ?? null,
        scoreHome: data.scoreHome ?? 0,
        scoreAway: data.scoreAway ?? 0,
        status: data.status,
        period: data.period,
        lastEventType: data.lastEventType,
      });
    });
  }, [liveGameId]);

  if (!club) {
    return <div style={{ fontFamily: "system-ui, sans-serif", padding: 16, background: "#ffffff" }} />;
  }

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        alignItems: "center",
        textAlign: "center",
        color: "#111827",
        background: "#ffffff",
        // The widget is embedded on arbitrary third-party club sites, so it
        // must not depend on this app's own dark-mode body styling (see
        // globals.css) — always render on a fixed white background.
        minHeight: "100vh",
      }}
    >
      <strong>{club.name}</strong>
      {game ? (
        <>
          {(game.status === "live" || game.status === "paused") && (
            <span
              style={{
                background: "#dc2626",
                color: "white",
                borderRadius: 9999,
                padding: "2px 10px",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 1,
              }}
            >
              LIVE
            </span>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            <TeamIcon publicClubId={game.homeClubPublicId} teamName={game.homeTeamName} size={24} />
            <span style={{ fontFamily: "var(--font-teko-display), system-ui, sans-serif" }}>
              {game.homeTeamName} {game.scoreHome}:{game.scoreAway} {game.awayTeamName}
            </span>
            <TeamIcon publicClubId={game.awayClubPublicId} teamName={game.awayTeamName} size={24} />
          </div>
        </>
      ) : (
        <p style={{ color: "#6b7280", fontSize: 14 }}>Momentan läuft kein Spiel.</p>
      )}
    </div>
  );
}

// ============================================================================
// Feed embed (mode=feed) — a short list of recent results for a club (scope=
// all) or one specific team (scope=team&team=<publicTeamId>), with the
// club's/team's current live game (if any) pinned above the list. Entirely
// new, additive — never touches the single-game branch above.
// ============================================================================
type EmbedTheme = "light" | "dark";

const FEED_THEME = {
  light: {
    background: "#ffffff",
    text: "#111827",
    subtext: "#6b7280",
    rowBackground: "#f9fafb",
    border: "#e5e7eb",
    live: "#dc2626",
  },
  dark: {
    background: "#10140c",
    text: "#f5f7ef",
    subtext: "#a7adb2",
    rowBackground: "rgba(255,255,255,0.06)",
    border: "rgba(255,255,255,0.12)",
    live: "#ff6b00",
  },
} satisfies Record<EmbedTheme, Record<string, string>>;

interface FeedGame {
  gameId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeClubPublicId: string | null;
  awayClubPublicId: string | null;
  homePublicTeamId: string | null;
  awayPublicTeamId: string | null;
  scoreHome: number;
  scoreAway: number;
  status: PublicGame["status"];
  updatedAtMs: number;
}

function mapFeedGame(id: string, data: Record<string, unknown>): FeedGame {
  const updatedAt = data.updatedAt as Timestamp | undefined;
  return {
    gameId: id,
    homeTeamName: data.homeTeamName as string,
    awayTeamName: data.awayTeamName as string,
    homeClubPublicId: (data.homeClubPublicId as string | null) ?? null,
    awayClubPublicId: (data.awayClubPublicId as string | null) ?? null,
    homePublicTeamId: (data.homePublicTeamId as string | null) ?? null,
    awayPublicTeamId: (data.awayPublicTeamId as string | null) ?? null,
    scoreHome: (data.scoreHome as number) ?? 0,
    scoreAway: (data.scoreAway as number) ?? 0,
    status: data.status as PublicGame["status"],
    updatedAtMs: updatedAt?.toMillis?.() ?? 0,
  };
}

function FeedRow({
  home,
  away,
  scoreHome,
  scoreAway,
  isLive,
  dateLabel,
  theme,
}: {
  home: { publicClubId: string | null; name: string };
  away: { publicClubId: string | null; name: string };
  scoreHome: number;
  scoreAway: number;
  isLive: boolean;
  dateLabel: string | null;
  theme: EmbedTheme;
}) {
  const colors = FEED_THEME[theme];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        borderRadius: 10,
        background: colors.rowBackground,
        border: `1px solid ${colors.border}`,
      }}
    >
      <TeamIcon publicClubId={home.publicClubId} teamName={home.name} size={22} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{home.name}</span>
        <strong style={{ flexShrink: 0, fontFamily: "var(--font-teko-display), system-ui, sans-serif" }}>
          {scoreHome}:{scoreAway}
        </strong>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{away.name}</span>
      </div>
      <TeamIcon publicClubId={away.publicClubId} teamName={away.name} size={22} />
      {isLive ? (
        <span
          style={{
            flexShrink: 0,
            background: colors.live,
            color: "white",
            borderRadius: 9999,
            padding: "2px 8px",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.5,
          }}
        >
          LIVE
        </span>
      ) : (
        dateLabel && (
          <span style={{ flexShrink: 0, fontSize: 11, color: colors.subtext }}>{dateLabel}</span>
        )
      )}
    </div>
  );
}

// Small "powered by LiveClub" mark shown instead of repeating the club's
// own name — this widget only ever gets embedded on that same club's own
// site, so the name is already redundant context, but the platform still
// needs its own attribution somewhere (2026-09-18 feedback). Falls back to
// bold text the same way src/lib/embedGenerator.ts's badge wordmark does,
// for installs with no branding.logoLight/logoDark uploaded yet.
function EmbedBrandMark({ theme }: { theme: EmbedTheme }) {
  const branding = useBranding();
  const colors = FEED_THEME[theme];
  const logoUrl = theme === "dark" ? branding.logoDark ?? branding.logoLight : branding.logoLight;
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt="LiveClub" style={{ height: 16, width: "auto" }} />;
  }
  return (
    <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.4, color: colors.subtext }}>LiveClub</span>
  );
}

function FeedEmbed({
  publicClubId,
  scope,
  teamId,
  theme,
  limitCount,
}: {
  publicClubId: string;
  scope: "all" | "team";
  teamId: string | null;
  theme: EmbedTheme;
  limitCount: number;
}) {
  const [club, setClub] = useState<PublicClub | null>(null);
  const [liveGame, setLiveGame] = useState<FeedGame | null>(null);
  const [homeGames, setHomeGames] = useState<FeedGame[]>([]);
  const [awayGames, setAwayGames] = useState<FeedGame[]>([]);

  useEffect(() => {
    const { db } = getFirebaseClient();
    return onSnapshot(
      doc(db, "publicClubs", publicClubId),
      (snap) => {
        const data = snap.data();
        if (!data) {
          setClub(null);
          return;
        }
        setClub({
          publicClubId: snap.id,
          clubId: data.clubId,
          name: data.name,
          sport: data.sport,
          logoUrl: data.logoUrl ?? null,
          currentLiveGameId: data.currentLiveGameId ?? null,
          currentLiveGameIdByTeam: data.currentLiveGameIdByTeam ?? {},
        });
      },
      () => setClub(null)
    );
  }, [publicClubId]);

  // scope=all: the club's own currentLiveGameId is unambiguous. scope=team:
  // currentLiveGameIdByTeam is keyed by the club's *private* team id (see
  // onGameEventCreate.ts), which this embed never has — so instead the
  // candidate live game is fetched and only kept if it actually belongs to
  // the selected *public* team.
  useEffect(() => {
    const candidateId = club?.currentLiveGameId;
    if (!candidateId) {
      setLiveGame(null);
      return;
    }
    const { db } = getFirebaseClient();
    return onSnapshot(doc(db, "publicGames", candidateId), (snap) => {
      const data = snap.data();
      if (!data) {
        setLiveGame(null);
        return;
      }
      const game = mapFeedGame(snap.id, data);
      const belongsToScope =
        scope === "all" || game.homePublicTeamId === teamId || game.awayPublicTeamId === teamId;
      setLiveGame(belongsToScope ? game : null);
    });
  }, [club?.currentLiveGameId, scope, teamId]);

  useEffect(() => {
    const id = scope === "team" ? teamId : publicClubId;
    if (!id) {
      setHomeGames([]);
      setAwayGames([]);
      return;
    }
    const { db } = getFirebaseClient();
    const homeField = scope === "team" ? "homePublicTeamId" : "homeClubPublicId";
    const awayField = scope === "team" ? "awayPublicTeamId" : "awayClubPublicId";
    const unsubHome = onSnapshot(
      query(collection(db, "publicGames"), where("status", "==", "finished"), where(homeField, "==", id), fbLimit(limitCount)),
      (snap) => setHomeGames(snap.docs.map((d) => mapFeedGame(d.id, d.data())))
    );
    const unsubAway = onSnapshot(
      query(collection(db, "publicGames"), where("status", "==", "finished"), where(awayField, "==", id), fbLimit(limitCount)),
      (snap) => setAwayGames(snap.docs.map((d) => mapFeedGame(d.id, d.data())))
    );
    return () => {
      unsubHome();
      unsubAway();
    };
  }, [scope, teamId, publicClubId, limitCount]);

  const pastGames = useMemo(() => {
    const byId = new Map<string, FeedGame>();
    for (const g of [...homeGames, ...awayGames]) byId.set(g.gameId, g);
    return Array.from(byId.values())
      .sort((a, b) => b.updatedAtMs - a.updatedAtMs)
      .slice(0, limitCount);
  }, [homeGames, awayGames, limitCount]);

  const colors = FEED_THEME[theme];

  if (!club) {
    return <div style={{ background: colors.background, minHeight: "100vh" }} />;
  }

  const hasAnything = liveGame || pastGames.length > 0;

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        color: colors.text,
        background: colors.background,
        minHeight: "100vh",
      }}
    >
      <div style={{ marginBottom: 4 }}>
        <EmbedBrandMark theme={theme} />
      </div>
      {!hasAnything && <p style={{ color: colors.subtext, fontSize: 13 }}>Noch keine Spiele.</p>}
      {liveGame && (
        <FeedRow
          home={{ publicClubId: liveGame.homeClubPublicId, name: liveGame.homeTeamName }}
          away={{ publicClubId: liveGame.awayClubPublicId, name: liveGame.awayTeamName }}
          scoreHome={liveGame.scoreHome}
          scoreAway={liveGame.scoreAway}
          isLive
          dateLabel={null}
          theme={theme}
        />
      )}
      {pastGames.map((g) => (
        <FeedRow
          key={g.gameId}
          home={{ publicClubId: g.homeClubPublicId, name: g.homeTeamName }}
          away={{ publicClubId: g.awayClubPublicId, name: g.awayTeamName }}
          scoreHome={g.scoreHome}
          scoreAway={g.scoreAway}
          isLive={false}
          dateLabel={g.updatedAtMs ? formatDateDe(new Date(g.updatedAtMs).toISOString()) : null}
          theme={theme}
        />
      ))}
    </div>
  );
}

function EmbedContent() {
  const params = useParams<{ publicClubId: string }>();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "feed" ? "feed" : "single";

  if (mode === "feed") {
    const scope = searchParams.get("scope") === "team" ? "team" : "all";
    const teamId = searchParams.get("team");
    const theme: EmbedTheme = searchParams.get("theme") === "dark" ? "dark" : "light";
    const parsedLimit = Number(searchParams.get("limit"));
    const limitCount = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 20) : 8;
    return (
      <FeedEmbed
        publicClubId={params.publicClubId}
        scope={scope}
        teamId={teamId}
        theme={theme}
        limitCount={limitCount}
      />
    );
  }

  return <SingleGameEmbed publicClubId={params.publicClubId} teamId={searchParams.get("team")} />;
}

export default function EmbedPage() {
  return (
    <Suspense fallback={null}>
      <EmbedContent />
    </Suspense>
  );
}
