import QRCode from "qrcode";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/storeLinks";
import { LIVECLUB_LOGO_PATH, LIVECLUB_LOGO_VIEWBOX } from "@/components/LiveClubLogo";

// Real logo now (2026-09-18, see LiveClubLogo.tsx) — an inline <svg> (not an
// <img src="...">) so it can take an explicit, always-black fill directly
// in the markup, same reasoning buildBadgeHtml/renderBadgeToCanvas already
// use for every other "must stay black regardless of the swatch" choice.
// The viewBox's own aspect ratio (≈4.8:1) sets the width once a height is
// picked — no separate width math needed.
function liveClubLogoSvg(heightPx: number): string {
  return `<svg viewBox="${LIVECLUB_LOGO_VIEWBOX}" xmlns="http://www.w3.org/2000/svg" style="height:${heightPx}px;width:auto;display:block;"><path fill="#10140c" transform="matrix(0.457618,0,0,0.243627,-68.4928,-27.2334)" d="${LIVECLUB_LOGO_PATH}"/></svg>`;
}

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

  return `<div style="display:flex;flex-direction:column;align-items:center;gap:14px;width:260px;padding:24px 20px;border-radius:20px;background:${bg.hex};color:${textColor};font-family:system-ui,sans-serif;text-align:center;">
  <a href="${spec.targetUrl}" target="_blank" rel="noopener noreferrer" style="display:flex;flex-direction:column;align-items:center;gap:10px;color:${textColor};text-decoration:none;">
    ${liveClubLogoSvg(28)}
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

// Exact pixel values from buildBadgeHtml's own markup (its 260px-wide
// card) — not independently chosen. Module 3 is meant to be a straight
// image export of that same card ("wirklich so wie das Teilen-HTML...
// dass die Verhältnisse gleich sind", 2026-09-18), so every dimension below
// is that file's real number, scaled up together by one factor rather than
// re-derived as a fraction of some fixed canvas size — the previous square-
// canvas version needed constant rebalancing precisely because forcing a
// free-form card into a fixed square never matches its actual proportions.
const FLYER_BASE = {
  cardWidth: 260,
  padX: 20,
  padTop: 24,
  padBottom: 24,
  innerGap: 10, // between logo / follow-text / QR / name-row inside the <a>
  outerGap: 14, // between that <a> and the store-badges row
  logoHeight: 28,
  followFontSize: 14,
  followLineHeight: 17,
  qrImageSize: 140,
  qrPadding: 6,
  iconSize: 20,
  nameFontSize: 13,
  badgeHeight: 32,
  badgeGap: 8,
};

const FLYER_CARD_HEIGHT =
  FLYER_BASE.padTop +
  FLYER_BASE.logoHeight +
  FLYER_BASE.innerGap +
  FLYER_BASE.followLineHeight +
  FLYER_BASE.innerGap +
  (FLYER_BASE.qrImageSize + FLYER_BASE.qrPadding * 2) +
  FLYER_BASE.innerGap +
  FLYER_BASE.iconSize +
  FLYER_BASE.outerGap +
  FLYER_BASE.badgeHeight +
  FLYER_BASE.padBottom;

/**
 * Renders the same visual as buildBadgeHtml onto a <canvas> for Module 3's
 * PNG export — free-form (matching that card's real aspect ratio, not a
 * fixed square), scaled up from its exact pixel values so the proportions
 * are identical, not just similar. `targetWidth` picks the export
 * resolution; height follows from FLYER_CARD_HEIGHT automatically. Every
 * element is positioned manually (no flexbox on a canvas). Failed image
 * loads (club icon/logo) are skipped rather than rejecting the whole
 * render — a flyer with a missing logo is still useful, an export that
 * throws isn't.
 */
export async function renderBadgeToCanvas(spec: BadgeSpec, targetWidth = 1080): Promise<HTMLCanvasElement> {
  const scale = targetWidth / FLYER_BASE.cardWidth;
  const s = (basePx: number) => basePx * scale;
  const width = Math.round(s(FLYER_BASE.cardWidth));
  const height = Math.round(s(FLYER_CARD_HEIGHT));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D-Canvas-Kontext nicht verfügbar.");

  const bg = resolveBackground(spec.background);
  const textColor = bg.useLightText ? "#f5f7ef" : "#10140c";

  ctx.fillStyle = bg.hex;
  ctx.fillRect(0, 0, width, height);

  let cursorY = s(FLYER_BASE.padTop);

  // Real logo (2026-09-18, see LiveClubLogo.tsx) — rasterized via a
  // data-URI <img> so it can be drawn onto the canvas. Always solid black
  // regardless of the chosen background swatch, same as buildBadgeHtml.
  try {
    const logoUrl = `data:image/svg+xml;utf8,${encodeURIComponent(liveClubLogoSvg(200))}`;
    const logo = await loadImage(logoUrl);
    const logoH = s(FLYER_BASE.logoHeight);
    const logoW = logoH * (logo.width / logo.height);
    ctx.drawImage(logo, (width - logoW) / 2, cursorY, logoW, logoH);
  } catch {
    // Skip silently — see doc comment above.
  }
  cursorY += s(FLYER_BASE.logoHeight) + s(FLYER_BASE.innerGap);

  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.font = `700 ${Math.round(s(FLYER_BASE.followFontSize))}px system-ui, sans-serif`;
  ctx.fillText(spec.followText, width / 2, cursorY + s(FLYER_BASE.followLineHeight) * 0.78);
  cursorY += s(FLYER_BASE.followLineHeight) + s(FLYER_BASE.innerGap);

  const qrSize = s(FLYER_BASE.qrImageSize);
  const qrPad = s(FLYER_BASE.qrPadding);
  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, spec.targetUrl, { width: qrSize, margin: 0 });
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, (width - qrSize) / 2 - qrPad, cursorY, qrSize + qrPad * 2, qrSize + qrPad * 2, s(10));
  ctx.fill();
  ctx.drawImage(qrCanvas, (width - qrSize) / 2, cursorY + qrPad, qrSize, qrSize);
  cursorY += qrSize + qrPad * 2 + s(FLYER_BASE.innerGap);

  // Icon + name sit side by side as one row (like buildBadgeHtml's
  // `<span style="display:flex;align-items:center;gap:6px;">`), the row as
  // a whole centered — not each element independently centered on its own,
  // which is what drew them stacked on top of each other before
  // (2026-09-18 bug report).
  const iconSize = s(FLYER_BASE.iconSize);
  const nameGap = s(6);
  ctx.font = `600 ${Math.round(s(FLYER_BASE.nameFontSize))}px system-ui, sans-serif`;
  const nameWidth = ctx.measureText(spec.targetName).width;
  const rowWidth = (spec.clubIconUrl ? iconSize + nameGap : 0) + nameWidth;
  const rowStartX = (width - rowWidth) / 2;

  if (spec.clubIconUrl) {
    try {
      const icon = await loadImage(spec.clubIconUrl);
      ctx.save();
      ctx.beginPath();
      ctx.arc(rowStartX + iconSize / 2, cursorY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.clip();
      ctx.drawImage(icon, rowStartX, cursorY, iconSize, iconSize);
      ctx.restore();
    } catch {
      // Skip silently — see doc comment above.
    }
  }

  ctx.fillStyle = textColor;
  ctx.textAlign = "left";
  ctx.font = `600 ${Math.round(s(FLYER_BASE.nameFontSize))}px system-ui, sans-serif`;
  ctx.fillText(
    spec.targetName,
    rowStartX + (spec.clubIconUrl ? iconSize + nameGap : 0),
    cursorY + iconSize / 2 + s(FLYER_BASE.nameFontSize) * 0.35
  );
  cursorY += iconSize + s(FLYER_BASE.outerGap);

  // Store badges, side by side, centered — same reasoning as buildBadgeHtml.
  try {
    const [appStore, playStore] = await Promise.all([
      loadImage(APP_STORE_BADGE_URL),
      loadImage(PLAY_STORE_BADGE_URL),
    ]);
    const badgeH = s(FLYER_BASE.badgeHeight);
    const appW = badgeH * (appStore.width / appStore.height);
    const playW = badgeH * (playStore.width / playStore.height);
    const gap = s(FLYER_BASE.badgeGap);
    const totalW = appW + gap + playW;
    const startX = (width - totalW) / 2;
    ctx.drawImage(appStore, startX, cursorY, appW, badgeH);
    ctx.drawImage(playStore, startX + appW + gap, cursorY, playW, badgeH);
  } catch {
    // Skip silently — see doc comment above.
  }

  return canvas;
}
