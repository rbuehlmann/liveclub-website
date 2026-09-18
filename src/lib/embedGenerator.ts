import QRCode from "qrcode";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/storeLinks";

// Shared by the "Follow us" HTML badge (Module 2, embedded live on a club's
// own site) and the downloadable flyer image (Module 3, same visual,
// rendered onto a <canvas> instead) — see dashboard/share/page.tsx. Kept as
// its own file since both the HTML string builder and the canvas renderer
// below need the exact same layout/color decisions and shouldn't drift.

// A fixed, on-brand set rather than a free color picker (see globals.css's
// "Match Vision" palette) — "ink" is the one dark option, needing the
// light-colored logo/text variant; the other three are bright fills.
export type NeonBackground = "lime" | "orange" | "emerald" | "ink";

export const NEON_BACKGROUNDS: { id: NeonBackground; label: string; hex: string; useLightText: boolean }[] = [
  { id: "lime", label: "Lime", hex: "#c6ff00", useLightText: false },
  { id: "orange", label: "Orange", hex: "#ff8128", useLightText: false },
  { id: "emerald", label: "Emerald", hex: "#00aa68", useLightText: false },
  { id: "ink", label: "Ink", hex: "#10140c", useLightText: true },
];

export interface BadgeSpec {
  targetUrl: string;
  targetName: string;
  clubIconUrl: string | null;
  background: NeonBackground;
  followText: string;
}

// Same badge image files the homepage/MobileAppPrompt already use
// (public/badges/) — absolute URLs so the exported HTML/canvas still
// resolves them correctly wherever it ends up pasted (a third-party site,
// not liveclub.app itself). Android is still internal-testing-only (see
// APP_STORE_URL/PLAY_STORE_URL in storeLinks.ts) but shown here anyway —
// same convention the homepage already follows.
const APP_STORE_BADGE_URL = "https://liveclub.app/badges/app-store-badge.svg";
const PLAY_STORE_BADGE_URL = "https://liveclub.app/badges/google-play-badge.svg";

function resolveBackground(background: NeonBackground) {
  return NEON_BACKGROUNDS.find((b) => b.id === background) ?? NEON_BACKGROUNDS[0];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Builds the pasteable HTML for Module 2 — a self-contained card (inline
 * styles only) with no script/iframe, since it needs no live data: a QR
 * code (inlined as a data URI, no extra request), a "LiveClub" wordmark,
 * the club's own icon, a short call-to-action, and — since a visitor scanning
 * this has no way to know a mobile app even exists otherwise — App Store/
 * Play Store badges at the bottom (2026-09-18 feedback). The QR/follow-text
 * portion is its own inner <a> (to the club/team page) rather than one
 * giant link wrapping everything, since the store badges need their own,
 * different hrefs — nested <a> tags aren't valid HTML.
 */
export async function buildBadgeHtml(spec: BadgeSpec): Promise<string> {
  const bg = resolveBackground(spec.background);
  const textColor = bg.useLightText ? "#f5f7ef" : "#10140c";
  const qrDataUrl = await QRCode.toDataURL(spec.targetUrl, { width: 200, margin: 1 });
  const name = escapeHtml(spec.targetName);
  const text = escapeHtml(spec.followText);

  return `<style>@import url('https://fonts.googleapis.com/css2?family=Teko:wght@700&display=swap');</style>
<div style="display:flex;flex-direction:column;align-items:center;gap:14px;width:260px;padding:24px 20px;border-radius:20px;background:${bg.hex};color:${textColor};font-family:system-ui,sans-serif;text-align:center;">
  <a href="${spec.targetUrl}" target="_blank" rel="noopener noreferrer" style="display:flex;flex-direction:column;align-items:center;gap:10px;color:${textColor};text-decoration:none;">
    <strong style="font-family:'Teko',system-ui,sans-serif;font-size:30px;font-weight:700;line-height:1;color:#10140c;">LiveClub</strong>
    <strong style="font-size:14px;letter-spacing:0.5px;">${text}</strong>
    <img src="${qrDataUrl}" alt="QR-Code" width="140" height="140" style="border-radius:10px;background:#fff;padding:6px;" />
    <span style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;">
${spec.clubIconUrl ? `      <img src="${spec.clubIconUrl}" alt="" width="20" height="20" style="border-radius:9999px;object-fit:contain;background:#fff;" />\n` : ""}      ${name}
    </span>
  </a>
  <div style="display:flex;gap:8px;">
    <a href="${APP_STORE_URL}" target="_blank" rel="noopener noreferrer">
      <img src="${APP_STORE_BADGE_URL}" alt="App Store" style="height:32px;width:auto;" />
    </a>
    <a href="${PLAY_STORE_URL}" target="_blank" rel="noopener noreferrer">
      <img src="${PLAY_STORE_BADGE_URL}" alt="Google Play" style="height:32px;width:auto;" />
    </a>
  </div>
</div>`;
}

// Routed through our own /api/image-proxy — Firebase Storage sends no
// Access-Control-Allow-Origin header, so a direct crossOrigin="anonymous"
// load of a club icon/LiveClub logo either fails outright or taints the
// canvas (breaking toDataURL() at export time) without ever throwing an
// error you'd notice; see that route's doc comment for the full reasoning.
// buildBadgeHtml's plain <img> tags don't go through this — a displayed
// <img> never triggers CORS/tainting, only a canvas read-back does.
// Only Firebase Storage needs the proxy (see the route's own doc comment)
// — the store badge SVGs are already same-origin static files on
// liveclub.app itself, and /api/image-proxy's allow-list would reject them
// anyway (see its ALLOWED_HOST check).
function needsProxy(src: string): boolean {
  try {
    return new URL(src).hostname === "firebasestorage.googleapis.com";
  } catch {
    return false;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = needsProxy(src) ? `/api/image-proxy?url=${encodeURIComponent(src)}` : src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Renders the same visual as buildBadgeHtml onto a square <canvas> for
 * Module 3's PNG export — the two share layout decisions (see NEON_
 * BACKGROUNDS/resolveBackground above) but not markup, since a canvas has
 * no flexbox: every element is centered manually via explicit coordinates.
 * Failed image loads (club icon/LiveClub logo) are skipped rather than
 * rejecting the whole render — a flyer with a missing logo is still useful,
 * an export that throws isn't.
 */
export async function renderBadgeToCanvas(spec: BadgeSpec, size = 1080): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D-Canvas-Kontext nicht verfügbar.");

  const bg = resolveBackground(spec.background);
  const textColor = bg.useLightText ? "#f5f7ef" : "#10140c";

  ctx.fillStyle = bg.hex;
  ctx.fillRect(0, 0, size, size);

  // Layout budget got tighter over two rounds of feedback (2026-09-18): a
  // store-badges row was added at the bottom, then the badges themselves
  // needed to be noticeably bigger — every earlier gap shrank to keep it
  // all fitting a fixed square 1080x1080 canvas.
  let cursorY = size * 0.07;

  // "LiveClub" wordmark, in the same Teko font as PublicHeader.tsx's own
  // fallback (2026-09-18: reads as "the logo" to the user even though it's
  // actually just styled text there too — see that component). This page
  // is part of the LiveClub app itself, so next/font has already loaded
  // Teko; document.fonts.load() is just a cheap guard against drawing text
  // before it's ready, which canvas (unlike DOM text) never recovers from
  // on its own. Always solid black regardless of the chosen background
  // swatch (2026-09-18 request), same as buildBadgeHtml.
  const wordmarkFont = `700 ${Math.round(size * 0.06)}px Teko, system-ui, sans-serif`;
  await document.fonts.load(wordmarkFont).catch(() => undefined);
  ctx.fillStyle = "#10140c";
  ctx.textAlign = "center";
  ctx.font = wordmarkFont;
  ctx.fillText("LiveClub", size / 2, cursorY + size * 0.05);
  cursorY += size * 0.05 + size * 0.035;

  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.font = `700 ${Math.round(size * 0.036)}px system-ui, sans-serif`;
  ctx.fillText(spec.followText, size / 2, cursorY);
  cursorY += size * 0.045;

  const qrSize = size * 0.32;
  const qrPad = size * 0.02;
  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, spec.targetUrl, { width: qrSize, margin: 0 });
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, (size - qrSize) / 2 - qrPad, cursorY, qrSize + qrPad * 2, qrSize + qrPad * 2, size * 0.02);
  ctx.fill();
  ctx.drawImage(qrCanvas, (size - qrSize) / 2, cursorY + qrPad, qrSize, qrSize);
  cursorY += qrSize + qrPad * 2 + size * 0.04;

  if (spec.clubIconUrl) {
    try {
      const icon = await loadImage(spec.clubIconUrl);
      const iconSize = size * 0.065;
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, cursorY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.clip();
      ctx.drawImage(icon, size / 2 - iconSize / 2, cursorY, iconSize, iconSize);
      ctx.restore();
      cursorY += iconSize + size * 0.02;
    } catch {
      // Skip silently — see doc comment above.
    }
  }

  ctx.fillStyle = textColor;
  ctx.font = `600 ${Math.round(size * 0.028)}px system-ui, sans-serif`;
  ctx.fillText(spec.targetName, size / 2, cursorY + size * 0.018);
  cursorY += size * 0.06;

  // Store badges, side by side, centered — same reasoning as buildBadgeHtml.
  try {
    const [appStore, playStore] = await Promise.all([
      loadImage(APP_STORE_BADGE_URL),
      loadImage(PLAY_STORE_BADGE_URL),
    ]);
    // Bumped up (2026-09-18 feedback: too small, should read more like the
    // HTML badge's own proportions — see buildBadgeHtml, roughly
    // badgeHeight/cardWidth ≈ 0.12 there).
    const badgeH = size * 0.1;
    const appW = badgeH * (appStore.width / appStore.height);
    const playW = badgeH * (playStore.width / playStore.height);
    const gap = size * 0.02;
    const totalW = appW + gap + playW;
    const startX = (size - totalW) / 2;
    ctx.drawImage(appStore, startX, cursorY, appW, badgeH);
    ctx.drawImage(playStore, startX + appW + gap, cursorY, playW, badgeH);
  } catch {
    // Skip silently — see doc comment above.
  }

  return canvas;
}
