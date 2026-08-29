"use client";

import { useEffect, useRef, useState } from "react";
import { TeamIcon } from "@/components/TeamIcon";

// ============================================================================
// Data contract — deliberately just what a real LiveClub Live Activity would
// ever show (home/away team, score, status). No ticker/timeline/lineup
// fields exist here on purpose: the app doesn't have those yet, so this
// mockup must not imply it does (2026-08-29 request). The caller (the
// homepage) decides whether this is a real live game or a once-per-load
// random example — this component only renders whatever it's given.
// ============================================================================
export interface HeroPhoneGame {
  homeTeamName: string;
  awayTeamName: string;
  homeClubPublicId: string | null;
  awayClubPublicId: string | null;
  scoreHome: number;
  scoreAway: number;
  statusLabel: string;
  // Only true for a real live/paused game — gates the pulsing dot and the
  // orange "live" styling, so the once-per-load illustrative example
  // (no real game running right now) never claims to be live.
  isLive: boolean;
}

// ----------------------------------------------------------------------------
// JS concern #1: the status bar / lock screen clock — genuinely live, ticks
// off the visitor's own system clock (not a fake/looping animation). Once a
// minute is plenty for a clock display; no need to re-render every second.
// ----------------------------------------------------------------------------
function useLiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// ----------------------------------------------------------------------------
// JS concern #2: a subtle, bounded mouse-tracked tilt — "optional" per the
// request, kept intentionally small (±6°) so it reads as a product-photo
// sheen rather than a gimmick. Pure CSS custom properties, no layout thrash.
// ----------------------------------------------------------------------------
function usePointerTilt() {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -6, y: px * 6 });
  }

  function handleMouseLeave() {
    setTilt({ x: 0, y: 0 });
  }

  return { ref, tilt, handleMouseMove, handleMouseLeave };
}

function StatusBarIcons() {
  // Minimal hand-drawn iOS-style glyphs (cellular bars, wifi, battery) — no
  // icon library in this project, and three tiny one-off SVGs are cheaper
  // than adding one for a purely decorative status bar.
  return (
    <div className="flex items-center gap-[3px]">
      <svg width="17" height="11" viewBox="0 0 17 11" fill="none">
        <rect x="0" y="7" width="3" height="4" rx="0.5" fill="white" />
        <rect x="4.5" y="5" width="3" height="6" rx="0.5" fill="white" />
        <rect x="9" y="3" width="3" height="8" rx="0.5" fill="white" />
        <rect x="13.5" y="0" width="3" height="11" rx="0.5" fill="white" />
      </svg>
      <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
        <path
          d="M7.5 9.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm-3-3.2a4.3 4.3 0 0 1 6 0l-1.1 1.1a2.7 2.7 0 0 0-3.8 0L4.5 6.3Zm-2.7-2.7a8 8 0 0 1 11.4 0L14 4.7a6.4 6.4 0 0 0-9 0L3.8 3.4Z"
          fill="white"
        />
      </svg>
      <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
        <rect x="0.5" y="0.5" width="21" height="11" rx="2.5" stroke="white" strokeOpacity="0.4" />
        <rect x="2" y="2" width="18" height="8" rx="1.5" fill="white" />
        <rect x="22.5" y="4" width="1.5" height="4" rx="0.75" fill="white" fillOpacity="0.4" />
      </svg>
    </div>
  );
}

function TeamSlot({
  publicClubId,
  teamName,
  align,
}: {
  publicClubId: string | null;
  teamName: string;
  align: "start" | "end";
}) {
  return (
    <div className={`flex min-w-0 flex-1 flex-col items-center gap-1.5 ${align === "end" ? "items-end" : "items-start"}`}>
      <TeamIcon publicClubId={publicClubId} teamName={teamName} size={30} />
      <span className="max-w-full truncate text-[10px] font-medium text-white/80">{teamName}</span>
    </div>
  );
}

// ============================================================================
// The mockup itself. Desktop-only by construction — the caller keeps it
// inside its existing `hidden lg:flex` wrapper, this component doesn't
// duplicate that concern.
// ============================================================================
export function HeroPhoneMockup({ game }: { game: HeroPhoneGame }) {
  const now = useLiveClock();
  const { ref, tilt, handleMouseMove, handleMouseLeave } = usePointerTilt();

  const timeLabel = now ? now.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" }) : "";
  const dateLabel = now
    ? now.toLocaleDateString("de-CH", { weekday: "long", day: "numeric", month: "long" })
    : "";

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: "1600px" }}
      className="flex items-center justify-center"
    >
      {/* --- iPhone frame: titanium bezel via a layered gradient border --- */}
      <div
        style={{
          transform: `rotateY(${-8 + tilt.y}deg) rotateX(${4 + tilt.x}deg)`,
          transformStyle: "preserve-3d",
          transition: "transform 300ms ease-out",
          background: "linear-gradient(135deg, #4b4b4d 0%, #1c1c1e 35%, #0a0a0a 55%, #3a3a3c 100%)",
          boxShadow:
            "0 50px 100px -30px rgba(0,0,0,0.65), 0 15px 40px -15px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.15)",
        }}
        className="relative w-[280px] rounded-[3.1rem] p-[3px]"
      >
        {/* Side buttons — small raised strips on the titanium edge. */}
        <span className="absolute top-[108px] -left-[3px] h-6 w-[3px] rounded-l-sm bg-gradient-to-b from-gray-500 to-gray-800" />
        <span className="absolute top-[150px] -left-[3px] h-10 w-[3px] rounded-l-sm bg-gradient-to-b from-gray-500 to-gray-800" />
        <span className="absolute top-[198px] -left-[3px] h-10 w-[3px] rounded-l-sm bg-gradient-to-b from-gray-500 to-gray-800" />
        <span className="absolute top-[165px] -right-[3px] h-16 w-[3px] rounded-r-sm bg-gradient-to-b from-gray-500 to-gray-800" />

        {/* --- Screen --- */}
        <div
          style={{
            background:
              "radial-gradient(circle at 28% 18%, rgba(198,255,0,0.22), transparent 45%)," +
              "radial-gradient(circle at 75% 82%, rgba(0,170,104,0.22), transparent 50%)," +
              "linear-gradient(175deg, #0b0f0a 0%, #05070a 65%, #050605 100%)",
          }}
          className="relative aspect-[9/19.5] overflow-hidden rounded-[2.9rem]"
        >
          {/* Glass reflection sheen, top-left to bottom-right. */}
          <div
            style={{
              background: "linear-gradient(115deg, rgba(255,255,255,0.10) 0%, transparent 28%)",
            }}
            className="pointer-events-none absolute inset-0 z-30"
          />

          {/* Dynamic Island */}
          <div className="absolute top-[14px] left-1/2 z-20 h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-black" />

          {/* Status bar */}
          <div className="relative z-10 flex items-center justify-between px-7 pt-4">
            <span className="text-[13px] font-semibold text-white">{timeLabel}</span>
            <StatusBarIcons />
          </div>

          {/* Lock screen clock */}
          <div className="relative z-10 mt-8 flex flex-col items-center text-white">
            <span className="font-teko text-6xl leading-none font-medium">{timeLabel}</span>
            <span className="mt-1 text-[11px] text-white/70 capitalize">{dateLabel}</span>
          </div>

          {/* Live Activity — the actual point of this whole mockup. */}
          <div className="relative z-10 mx-4 mt-8 rounded-[1.6rem] border border-white/10 bg-white/10 p-3.5 shadow-lg backdrop-blur-md">
            <div className="mb-2.5 flex items-center gap-1.5 px-0.5">
              {game.isLive && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-orange" />}
              <span
                className={`text-[10px] font-bold tracking-wide uppercase ${
                  game.isLive ? "text-brand-orange" : "text-white/50"
                }`}
              >
                {game.statusLabel}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <TeamSlot publicClubId={game.homeClubPublicId} teamName={game.homeTeamName} align="start" />
              <span className="font-teko shrink-0 px-1 text-4xl font-bold tabular-nums text-white">
                {game.scoreHome}:{game.scoreAway}
              </span>
              <TeamSlot publicClubId={game.awayClubPublicId} teamName={game.awayTeamName} align="end" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
