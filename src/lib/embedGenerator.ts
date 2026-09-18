import QRCode from "qrcode";

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
  // logoLight = readable on a bright fill, logoDark = readable on the dark
  // "ink" fill (same convention as PublicHeader.tsx's own light/dark swap).
  liveClubLogoLight: string | null;
  liveClubLogoDark: string | null;
  background: NeonBackground;
  followText: string;
}

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
 * styles only, one <a> wrapping everything) with no script/iframe, since it
 * needs no live data: a QR code (inlined as a data URI, no extra request),
 * the LiveClub logo, the club's own icon, and a short call-to-action.
 */
export async function buildBadgeHtml(spec: BadgeSpec): Promise<string> {
  const bg = resolveBackground(spec.background);
  const textColor = bg.useLightText ? "#f5f7ef" : "#10140c";
  const logoUrl = bg.useLightText ? spec.liveClubLogoDark ?? spec.liveClubLogoLight : spec.liveClubLogoLight;
  const qrDataUrl = await QRCode.toDataURL(spec.targetUrl, { width: 200, margin: 1 });
  const name = escapeHtml(spec.targetName);
  const text = escapeHtml(spec.followText);
  // No branding.logoLight/logoDark uploaded yet (see /admin/settings) —
  // most installs won't have one on day one, and a bare sentence with no
  // wordmark at all reads as unbranded. A bold, letter-spaced "LiveClub" in
  // the swatch's own text color stands in until a real logo image exists;
  // switches to the real <img> automatically the moment one is set, no
  // further change needed here.
  const wordmark = logoUrl
    ? `  <img src="${logoUrl}" alt="LiveClub" style="height:22px;width:auto;" />\n`
    : `  <strong style="font-size:18px;font-weight:800;letter-spacing:0.5px;">LiveClub</strong>\n`;

  return `<a href="${spec.targetUrl}" target="_blank" rel="noopener noreferrer" style="display:flex;flex-direction:column;align-items:center;gap:10px;width:260px;padding:24px 20px;border-radius:20px;background:${bg.hex};color:${textColor};text-decoration:none;font-family:system-ui,sans-serif;text-align:center;">
${wordmark}  <strong style="font-size:14px;letter-spacing:0.5px;">${text}</strong>
  <img src="${qrDataUrl}" alt="QR-Code" width="140" height="140" style="border-radius:10px;background:#fff;padding:6px;" />
  <span style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;">
${spec.clubIconUrl ? `    <img src="${spec.clubIconUrl}" alt="" width="20" height="20" style="border-radius:9999px;object-fit:contain;background:#fff;" />\n` : ""}    ${name}
  </span>
</a>`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
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
  const logoUrl = bg.useLightText ? spec.liveClubLogoDark ?? spec.liveClubLogoLight : spec.liveClubLogoLight;

  ctx.fillStyle = bg.hex;
  ctx.fillRect(0, 0, size, size);

  let cursorY = size * 0.12;

  if (logoUrl) {
    try {
      const logo = await loadImage(logoUrl);
      const logoH = size * 0.06;
      const logoW = logoH * (logo.width / logo.height);
      ctx.drawImage(logo, (size - logoW) / 2, cursorY, logoW, logoH);
      cursorY += logoH + size * 0.05;
    } catch {
      // Skip silently — see doc comment above.
    }
  } else {
    // Same reasoning as buildBadgeHtml's `wordmark` — no logo uploaded yet,
    // draw a bold text wordmark instead of leaving the slot empty.
    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.font = `800 ${Math.round(size * 0.05)}px system-ui, sans-serif`;
    ctx.fillText("LiveClub", size / 2, cursorY + size * 0.045);
    cursorY += size * 0.05 + size * 0.05;
  }

  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.font = `700 ${Math.round(size * 0.042)}px system-ui, sans-serif`;
  ctx.fillText(spec.followText, size / 2, cursorY);
  cursorY += size * 0.06;

  const qrSize = size * 0.4;
  const qrPad = size * 0.025;
  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, spec.targetUrl, { width: qrSize, margin: 0 });
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, (size - qrSize) / 2 - qrPad, cursorY, qrSize + qrPad * 2, qrSize + qrPad * 2, size * 0.02);
  ctx.fill();
  ctx.drawImage(qrCanvas, (size - qrSize) / 2, cursorY + qrPad, qrSize, qrSize);
  cursorY += qrSize + qrPad * 2 + size * 0.06;

  if (spec.clubIconUrl) {
    try {
      const icon = await loadImage(spec.clubIconUrl);
      const iconSize = size * 0.08;
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, cursorY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.clip();
      ctx.drawImage(icon, size / 2 - iconSize / 2, cursorY, iconSize, iconSize);
      ctx.restore();
      cursorY += iconSize + size * 0.03;
    } catch {
      // Skip silently — see doc comment above.
    }
  }

  ctx.fillStyle = textColor;
  ctx.font = `600 ${Math.round(size * 0.032)}px system-ui, sans-serif`;
  ctx.fillText(spec.targetName, size / 2, cursorY + size * 0.02);

  return canvas;
}
