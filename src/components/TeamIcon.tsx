"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { useBranding } from "@/components/layout/BrandingProvider";

interface TeamIconProps {
  publicClubId?: string | null;
  teamName: string;
  size?: number;
}

/**
 * Shows a team's real club logo when the opposing side is also a LiveClub
 * club (resolved live from publicClubs/{publicClubId}, no cross-club read
 * permissions needed since that collection is public); otherwise the
 * platform-wide fallback icon (settings/branding.iconLight/iconDark, see
 * /admin/settings — same fields the Live Activity push falls back to, see
 * functions/src/triggers/onPublicGameWrite.ts), and only a neutral
 * initial-letter placeholder if that isn't configured either.
 */
export function TeamIcon({ publicClubId, teamName, size = 40 }: TeamIconProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const branding = useBranding();

  useEffect(() => {
    if (!publicClubId) {
      setLogoUrl(null);
      return;
    }
    const { db } = getFirebaseClient();
    return onSnapshot(doc(db, "publicClubs", publicClubId), (snap) => {
      setLogoUrl(snap.data()?.logoUrl ?? null);
    });
  }, [publicClubId]);

  const style = { width: size, height: size };

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        style={style}
        className="rounded-full object-contain bg-white ring-1 ring-gray-200 dark:ring-white/10"
      />
    );
  }

  if (branding.iconLight || branding.iconDark) {
    return (
      <>
        {branding.iconLight && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={branding.iconLight}
            alt=""
            style={style}
            className={`rounded-full object-contain bg-white ring-1 ring-gray-200 dark:ring-white/10 ${branding.iconDark ? "dark:hidden" : ""}`}
          />
        )}
        {branding.iconDark && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={branding.iconDark}
            alt=""
            style={style}
            className={`rounded-full object-contain bg-white ring-1 ring-gray-200 dark:ring-white/10 ${branding.iconLight ? "hidden dark:block" : ""}`}
          />
        )}
      </>
    );
  }

  const initial = teamName.trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      style={style}
      className="flex items-center justify-center rounded-full bg-gray-200 font-semibold text-gray-500 dark:bg-white/10 dark:text-gray-400"
    >
      {initial}
    </span>
  );
}
