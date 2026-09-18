"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { collection, doc, limit as fbLimit, onSnapshot, query, where } from "firebase/firestore";
import { Timestamp } from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { TeamIcon } from "@/components/TeamIcon";
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

// Team-Info announcements (see functions/src/callable/createTeamInfo.ts) —
// the native app's own feed already mixes these chronologically alongside
// games (see firestore.rules' comment on the teamInfos collection); the
// embed widget was missing this entirely until now (2026-09-18 feedback).
interface NewsItem {
  infoId: string;
  publicClubId: string | null;
  clubName: string;
  title: string;
  text: string;
  createdAtMs: number;
}

function mapNewsItem(id: string, data: Record<string, unknown>): NewsItem {
  const createdAt = data.createdAt as Timestamp | undefined;
  return {
    infoId: id,
    publicClubId: (data.publicClubId as string | null) ?? null,
    clubName: (data.clubName as string) ?? "",
    title: (data.title as string) ?? "",
    text: (data.text as string) ?? "",
    createdAtMs: createdAt?.toMillis?.() ?? 0,
  };
}

// A merged, chronologically-sorted feed entry — either a game result or a
// news item, discriminated so FeedEmbed can render the right row for each
// without the two shapes leaking into each other.
type FeedListItem = ({ kind: "game" } & FeedGame) | ({ kind: "news" } & NewsItem);

function NewsRow({ item, theme }: { item: NewsItem; theme: EmbedTheme }) {
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
      <TeamIcon publicClubId={item.publicClubId} teamName={item.clubName} size={22} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.title}
        </div>
        {item.text && (
          <div
            style={{
              fontSize: 11,
              color: colors.subtext,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.text}
          </div>
        )}
      </div>
      {item.createdAtMs > 0 && (
        <span style={{ flexShrink: 0, fontSize: 11, color: colors.subtext }}>
          {formatDateDe(new Date(item.createdAtMs).toISOString())}
        </span>
      )}
    </div>
  );
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
// needs its own attribution somewhere (2026-09-18 feedback). Styled text in
// Teko, same as PublicHeader.tsx's own no-logo fallback and src/lib/
// embedGenerator.ts's badge wordmark — kept consistent across all three
// rather than conditional on branding.logoLight/logoDark (unset by
// default; the Teko treatment is the real, always-available mark). No
// separate font loading needed here unlike that file's HTML snippet — this
// page is served from our own domain inside the widget's <iframe>, so it
// already gets next/font's Teko the same as any other page on the site.
function EmbedBrandMark({ theme }: { theme: EmbedTheme }) {
  const colors = FEED_THEME[theme];
  return (
    <span
      style={{
        fontFamily: "var(--font-teko-display), system-ui, sans-serif",
        fontSize: 20,
        fontWeight: 700,
        letterSpacing: 0.3,
        color: colors.subtext,
      }}
    >
      LiveClub
    </span>
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
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);

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

  // A teamInfo belongs to exactly one team/club (unlike a game, which has a
  // home and away side) — a single equality query, no composite index
  // needed. Hidden ones (redaktor/admin moderation, see hideTeamInfo.ts)
  // are filtered client-side rather than in the query, same reasoning as
  // not filtering finished-games by anything beyond `status` server-side.
  useEffect(() => {
    const id = scope === "team" ? teamId : publicClubId;
    const field = scope === "team" ? "publicTeamId" : "publicClubId";
    if (!id) {
      setNewsItems([]);
      return;
    }
    const { db } = getFirebaseClient();
    return onSnapshot(
      query(collection(db, "teamInfos"), where(field, "==", id), fbLimit(limitCount)),
      (snap) =>
        setNewsItems(
          snap.docs
            .filter((d) => d.data().hidden !== true)
            .map((d) => mapNewsItem(d.id, d.data()))
        )
    );
  }, [scope, teamId, publicClubId, limitCount]);

  const feedItems = useMemo(() => {
    const gamesById = new Map<string, FeedGame>();
    for (const g of [...homeGames, ...awayGames]) gamesById.set(g.gameId, g);
    const items: FeedListItem[] = [
      ...Array.from(gamesById.values()).map((g): FeedListItem => ({ kind: "game", ...g })),
      ...newsItems.map((n): FeedListItem => ({ kind: "news", ...n })),
    ];
    return items
      .sort((a, b) => {
        const bMs = b.kind === "game" ? b.updatedAtMs : b.createdAtMs;
        const aMs = a.kind === "game" ? a.updatedAtMs : a.createdAtMs;
        return bMs - aMs;
      })
      .slice(0, limitCount);
  }, [homeGames, awayGames, newsItems, limitCount]);

  const colors = FEED_THEME[theme];

  if (!club) {
    return <div style={{ background: colors.background, minHeight: "100vh" }} />;
  }

  const hasAnything = liveGame || feedItems.length > 0;

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
      {feedItems.map((item) =>
        item.kind === "game" ? (
          <FeedRow
            key={item.gameId}
            home={{ publicClubId: item.homeClubPublicId, name: item.homeTeamName }}
            away={{ publicClubId: item.awayClubPublicId, name: item.awayTeamName }}
            scoreHome={item.scoreHome}
            scoreAway={item.scoreAway}
            isLive={false}
            dateLabel={item.updatedAtMs ? formatDateDe(new Date(item.updatedAtMs).toISOString()) : null}
            theme={theme}
          />
        ) : (
          <NewsRow key={item.infoId} item={item} theme={theme} />
        )
      )}
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
