"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { BrandingSettings } from "@/lib/types";

const BrandingContext = createContext<BrandingSettings>({});

export function useBranding() {
  return useContext(BrandingContext);
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
  if (branding.accentColorDark) darkLines.push(`--brand-red: ${branding.accentColorDark};`);
  if (branding.backgroundColorDark) {
    darkLines.push(`--background: ${branding.backgroundColorDark};`);
    darkLines.push(`--brand-black: ${branding.backgroundColorDark};`);
  }
  const darkCss = darkLines.length ? `.dark { ${darkLines.join(" ")} }` : "";

  let styleTag = document.getElementById("branding-overrides") as HTMLStyleElement | null;
  if (!styleTag) {
    styleTag = document.createElement("style");
    styleTag.id = "branding-overrides";
    document.head.appendChild(styleTag);
  }
  styleTag.textContent = `${rootCss} ${darkCss}`;
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
