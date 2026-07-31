"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { TeamIcon } from "@/components/TeamIcon";
import { PublicClub, PublicGame } from "@/lib/types";

function EmbedContent() {
  const params = useParams<{ publicClubId: string }>();
  const searchParams = useSearchParams();
  const teamId = searchParams.get("team");

  const [club, setClub] = useState<PublicClub | null>(null);
  const [game, setGame] = useState<PublicGame | null>(null);

  useEffect(() => {
    const { db } = getFirebaseClient();
    return onSnapshot(doc(db, "publicClubs", params.publicClubId), (snap) => {
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
    });
  }, [params.publicClubId]);

  const liveGameId = teamId
    ? club?.currentLiveGameIdByTeam?.[teamId]
    : club?.currentLiveGameId;

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
    return (
      <div style={{ fontFamily: "system-ui, sans-serif", padding: 16, background: "#ffffff" }} />
    );
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

export default function EmbedPage() {
  return (
    <Suspense fallback={null}>
      <EmbedContent />
    </Suspense>
  );
}
