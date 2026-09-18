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

// Same vector as GoLiveButton.tsx's GoLiveSvg (source: go_live_button.svg,
// 2026-08-29) — the only actual LiveClub brand mark that exists as a
// reusable asset anywhere in this codebase (branding.logoLight/Dark is an
// admin-configurable *override*, unset by default; this is the real thing).
// Deliberately always solid black here regardless of the chosen background
// swatch (2026-09-18 request) — unlike its colored/theme-aware use in the
// header, the badge/flyer wordmark never varies.
const LIVECLUB_MARK_VIEWBOX = "0 0 1146 387";
const LIVECLUB_MARK_PATHS = `<g fill="#10140c"><g transform="matrix(1,0,0,1,-3432.15,-1293.13)"><path d="M3452.15,1659.18L4557.97,1659.18L4557.97,1313.13L3452.15,1313.13L3452.15,1659.18ZM4577.97,1679.18L3432.15,1679.18L3432.15,1293.13L4577.97,1293.13L4577.97,1679.18Z" style="fill-rule:nonzero"/></g><g transform="matrix(0.664931,0,0,0.664931,-462.473,-174.142)"><g transform="matrix(0.704298,0,0,0.704298,-1072.88,-1317.45)"><path d="M3242.65,2654.6C3242.65,2631.03 3238.18,2608.03 3229.34,2586.26C3220.19,2563.72 3206.75,2543.5 3189.41,2526.15C3182.31,2519.05 3170.81,2519.05 3163.71,2526.15C3156.61,2533.24 3156.61,2544.75 3163.71,2551.84C3177.61,2565.74 3188.36,2581.91 3195.67,2599.93C3202.73,2617.33 3206.31,2635.73 3206.31,2654.6C3206.31,2673.48 3202.73,2691.87 3195.67,2709.28C3188.36,2727.3 3177.61,2743.48 3163.71,2757.37C3156.61,2764.47 3156.61,2775.97 3163.71,2783.07C3167.26,2786.62 3171.91,2788.39 3176.56,2788.39C3181.21,2788.39 3185.86,2786.62 3189.41,2783.07C3206.76,2765.72 3220.19,2745.49 3229.34,2722.95C3238.18,2701.18 3242.65,2678.19 3242.65,2654.6Z" style="fill-rule:nonzero"/></g><g transform="matrix(0.704298,0,0,0.704298,-1072.88,-1317.45)"><path d="M3304.14,2557.47C3291.14,2525.43 3272.04,2496.68 3247.38,2472.02C3240.28,2464.93 3228.78,2464.93 3221.68,2472.02C3214.59,2479.12 3214.59,2490.62 3221.68,2497.72C3242.9,2518.92 3259.31,2543.62 3270.47,2571.13C3281.26,2597.71 3286.73,2625.79 3286.73,2654.6C3286.73,2683.42 3281.26,2711.5 3270.47,2738.08C3259.31,2765.59 3242.9,2790.29 3221.68,2811.49C3214.59,2818.59 3214.59,2830.1 3221.68,2837.19C3225.23,2840.74 3229.89,2842.52 3234.54,2842.52C3239.19,2842.52 3243.83,2840.74 3247.38,2837.19C3272.04,2812.53 3291.14,2783.78 3304.15,2751.75C3316.7,2720.81 3323.07,2688.12 3323.07,2654.6C3323.07,2621.09 3316.7,2588.41 3304.14,2557.47Z" style="fill-rule:nonzero"/></g><g transform="matrix(0.704298,0,0,0.704298,-1072.88,-1317.45)"><path d="M2810.14,2654.61C2810.14,2678.19 2814.62,2701.18 2823.46,2722.95C2832.61,2745.49 2846.04,2765.72 2863.39,2783.07C2870.48,2790.17 2881.99,2790.17 2889.09,2783.07C2896.18,2775.98 2896.18,2764.47 2889.09,2757.37C2875.19,2743.48 2864.44,2727.3 2857.12,2709.29C2850.06,2691.88 2846.48,2673.48 2846.48,2654.61C2846.48,2635.74 2850.06,2617.34 2857.12,2599.93C2864.44,2581.92 2875.19,2565.74 2889.09,2551.84C2896.18,2544.75 2896.18,2533.25 2889.09,2526.15C2885.54,2522.6 2880.89,2520.83 2876.24,2520.83C2871.59,2520.83 2866.94,2522.6 2863.39,2526.15C2846.04,2543.5 2832.6,2563.72 2823.46,2586.27C2814.62,2608.04 2810.14,2631.03 2810.14,2654.61Z" style="fill-rule:nonzero"/></g><g transform="matrix(0.704298,0,0,0.704298,-1072.88,-1317.45)"><path d="M2748.65,2751.75C2761.65,2783.78 2780.75,2812.53 2805.41,2837.2C2812.51,2844.29 2824.01,2844.29 2831.11,2837.2C2838.2,2830.1 2838.2,2818.6 2831.11,2811.5C2809.9,2790.29 2793.49,2765.59 2782.33,2738.08C2771.53,2711.51 2766.06,2683.42 2766.06,2654.61C2766.06,2625.8 2771.53,2597.72 2782.33,2571.13C2793.49,2543.62 2809.9,2518.92 2831.11,2497.72C2838.2,2490.63 2838.2,2479.12 2831.11,2472.02C2827.56,2468.47 2822.91,2466.7 2818.26,2466.7C2813.61,2466.7 2808.96,2468.47 2805.41,2472.02C2780.75,2496.69 2761.65,2525.43 2748.65,2557.47C2736.09,2588.41 2729.73,2621.09 2729.73,2654.61C2729.73,2688.13 2736.09,2720.81 2748.65,2751.75Z" style="fill-rule:nonzero"/></g><g transform="matrix(0.704298,0,0,0.704298,-1072.88,-1317.45)"><path d="M3117.07,2654.61C3117.07,2704.32 3076.77,2744.62 3027.06,2744.62C2977.35,2744.62 2937.05,2704.32 2937.05,2654.61C2937.05,2604.9 2977.35,2564.6 3027.06,2564.6C3076.77,2564.6 3117.07,2604.9 3117.07,2654.61Z" style="fill-rule:nonzero"/></g></g><g transform="matrix(0.88783,0,0,0.88783,-2928.06,-810.384)"><path d="M3910.31,1231.68L3819.34,1231.68L3819.34,1028.68L3856.36,1028.68L3856.36,1203.35L3910.31,1203.35L3910.31,1231.68ZM4009.51,1028.68L4046.54,1028.68L4046.54,1231.68L4009.51,1231.68L4009.51,1028.68ZM4236.7,1028.68L4274.9,1028.68L4234.51,1231.68L4186.13,1231.68L4145.74,1028.68L4183.94,1028.68L4210.16,1192.88L4236.7,1028.68ZM4473.13,1231.68L4374.1,1231.68L4374.1,1028.68L4470.59,1028.68L4470.59,1057.01L4411.31,1057.01L4411.31,1113.41L4461.08,1113.41L4461.08,1141.74L4411.31,1141.74L4411.31,1203.35L4473.13,1203.35L4473.13,1231.68Z"/></g></g>`;

function liveClubMarkSvg(heightPx: number): string {
  return `<svg viewBox="${LIVECLUB_MARK_VIEWBOX}" xmlns="http://www.w3.org/2000/svg" style="height:${heightPx}px;width:auto;display:block;">${LIVECLUB_MARK_PATHS}</svg>`;
}

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
 * code (inlined as a data URI, no extra request), the LiveClub logo, the
 * club's own icon, a short call-to-action, and — since a visitor scanning
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

  return `<div style="display:flex;flex-direction:column;align-items:center;gap:14px;width:260px;padding:24px 20px;border-radius:20px;background:${bg.hex};color:${textColor};font-family:system-ui,sans-serif;text-align:center;">
  <a href="${spec.targetUrl}" target="_blank" rel="noopener noreferrer" style="display:flex;flex-direction:column;align-items:center;gap:10px;color:${textColor};text-decoration:none;">
    ${liveClubMarkSvg(20)}
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

  try {
    // Same mark as buildBadgeHtml, rasterized via a data-URI <img> so it can
    // be drawn onto the canvas — always solid black regardless of the
    // chosen background swatch (2026-09-18 request), unlike its color-
    // matched use in PublicHeader/GoLiveButton.
    const markSvg = liveClubMarkSvg(200);
    const markUrl = `data:image/svg+xml;utf8,${encodeURIComponent(markSvg)}`;
    const mark = await loadImage(markUrl);
    const markH = size * 0.045;
    const markW = markH * (mark.width / mark.height);
    ctx.drawImage(mark, (size - markW) / 2, cursorY, markW, markH);
    cursorY += markH + size * 0.035;
  } catch {
    // Skip silently — see doc comment above.
  }

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
