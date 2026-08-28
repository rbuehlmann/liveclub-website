"use client";

import { useEffect, useState } from "react";

export type MobilePlatform = "ios" | "android" | null;

// Real device detection (User-Agent), not a viewport-width breakpoint — a
// narrow desktop browser window should still get the full site, only an
// actual phone gets the app-first view. Starts `null` (desktop-shaped) on
// the server/first paint to avoid a hydration mismatch, then flips after
// mount — same "brief flash, deliberately accepted" trade-off already used
// by ThemeToggle's dark-mode class / AppLocaleProvider's locale.
export function useMobilePlatform(): MobilePlatform {
  const [platform, setPlatform] = useState<MobilePlatform>(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) {
      setPlatform("ios");
    } else if (/Android/.test(ua)) {
      setPlatform("android");
    }
  }, []);

  return platform;
}
