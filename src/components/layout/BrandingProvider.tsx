"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { BrandingSettings } from "@/lib/types";

const BrandingContext = createContext<BrandingSettings>({});

export function useBranding() {
  return useContext(BrandingContext);
}

// Small hex color helpers — just enough to derive the two colors
// deliberately NOT exposed as their own admin fields (see types.ts):
// the accent's hover shade and its on-fill text color. Both need to track
// whatever custom accentColorDark an admin picks, or a bright custom
// accent could end up with illegible (e.g. dark-on-dark) auto-generated
// text/hover instead of the values globals.css's own defaults happen to
// suit.
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const value = parseInt(clean.length === 3 ? clean.replace(/(.)/g, "$1$1") : clean, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function toHexByte(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
}

// WCAG relative luminance — cheap enough for a one-off UI decision (pick
// dark or light text for a given fill), no need for full contrast-ratio
// math against both candidates.
function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Matches globals.css's own Club Ink / Moon White pair — the same two
// colors every other on-fill text in this palette already uses.
function textColorFor(fillHex: string): string {
  return relativeLuminance(hexToRgb(fillHex)) > 0.5 ? "#10140c" : "#f5f7ef";
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const factor = 1 - amount;
  return `#${toHexByte(r * factor)}${toHexByte(g * factor)}${toHexByte(b * factor)}`;
}

// A style tag appended after globals.css wins the cascade for
// same-specificity :root/.dark rules, so this can override --brand-red
// etc. without touching the compiled stylesheet — the whole point being a
// re-skin (e.g. Halloween orange) needs no deploy, just a Firestore write.
//
// The light-mode block is scoped to :root:not(.dark) rather than plain
// :root — with equal specificity, a later same-specificity rule always
// wins regardless of "light vs dark" semantics, so a bare :root override
// would leak into dark mode too whenever only the light color was set.
// :not(.dark) makes the two states mutually exclusive by selector instead
// of relying on source order.
function applyOverrides(branding: BrandingSettings) {
  const lines: string[] = [];
  if (branding.accentColorLight) lines.push(`--brand-red: ${branding.accentColorLight};`);
  if (branding.backgroundColorLight) {
    lines.push(`--background: ${branding.backgroundColorLight};`);
    lines.push(`--brand-white: ${branding.backgroundColorLight};`);
  }
  const rootCss = lines.length ? `:root:not(.dark) { ${lines.join(" ")} }` : "";

  const darkLines: string[] = [];
  if (branding.accentColorDark) {
    darkLines.push(`--brand-red: ${branding.accentColorDark};`);
    // Derived, not admin-editable — see the helpers above.
    darkLines.push(`--brand-red-hover: ${darken(branding.accentColorDark, 0.12)};`);
    darkLines.push(`--brand-red-text: ${textColorFor(branding.accentColorDark)};`);
    darkLines.push(`--brand-red-link: ${branding.accentColorDark};`);
  }
  if (branding.backgroundColorDark) {
    darkLines.push(`--background: ${branding.backgroundColorDark};`);
    darkLines.push(`--brand-black: ${branding.backgroundColorDark};`);
  }
  if (branding.foregroundColorDark) darkLines.push(`--foreground: ${branding.foregroundColorDark};`);
  if (branding.silverColorDark) darkLines.push(`--brand-silver: ${branding.silverColorDark};`);
  if (branding.orangeColorDark) darkLines.push(`--brand-orange: ${branding.orangeColorDark};`);
  if (branding.emeraldColorDark) darkLines.push(`--brand-emerald: ${branding.emeraldColorDark};`);
  const darkCss = darkLines.length ? `.dark { ${darkLines.join(" ")} }` : "";

  let styleTag = document.getElementById("branding-overrides") as HTMLStyleElement | null;
  if (!styleTag) {
    styleTag = document.createElement("style");
    styleTag.id = "branding-overrides";
    document.head.appendChild(styleTag);
  }
  styleTag.textContent = `${rootCss} ${darkCss}`;

  applyFavicon(branding.favicon);
}

// Next.js's own app/favicon.ico convention already renders a <link
// rel="icon"> for the static default — this tag is appended after it, so
// it wins as the last (and only override-time) icon link in <head>.
// Browsers still cache favicons aggressively regardless of DOM order, so
// this is a best-effort swap, not a guaranteed one (see the note in
// /admin/settings) — already-open tabs or repeat visitors may not see the
// change until a hard reload or some time passes.
function applyFavicon(url: string | null | undefined) {
  let link = document.getElementById("branding-favicon") as HTMLLinkElement | null;
  if (!url) {
    link?.remove();
    return;
  }
  if (!link) {
    link = document.createElement("link");
    link.id = "branding-favicon";
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = url;
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<BrandingSettings>({});

  useEffect(() => {
    const { db } = getFirebaseClient();
    const unsubscribe = onSnapshot(doc(db, "settings", "branding"), (snap) => {
      const data = (snap.data() as BrandingSettings | undefined) ?? {};
      setBranding(data);
      applyOverrides(data);
    });
    return unsubscribe;
  }, []);

  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>;
}
