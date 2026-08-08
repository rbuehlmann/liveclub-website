"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";

interface TeamIconProps {
  publicClubId?: string | null;
  teamName: string;
  size?: number;
}

/**
 * Shows a team's real club logo when the opposing side is also a LiveClub
 * club (resolved live from publicClubs/{publicClubId}, no cross-club read
 * permissions needed since that collection is public); otherwise falls
 * back to a neutral initial-letter placeholder.
 */
export function TeamIcon({ publicClubId, teamName, size = 40 }: TeamIconProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

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
