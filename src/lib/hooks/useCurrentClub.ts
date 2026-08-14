"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Club, ClubRole } from "@/lib/types";

interface CurrentClubState {
  loading: boolean;
  club: Club | null;
  role: ClubRole | null;
  // Only meaningful when role is "reporter" (displayed as "Redaktor") — the
  // team(s) this member may manage games for.
  teamIds: string[];
}

function toIsoOrNull(value: unknown): string | null {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  return null;
}

/**
 * V1 assumes one active club per user (the spec's roles model doesn't
 * require multi-club support yet). Resolves via users/{uid}.clubIds, which
 * the createClub/acceptInvitation Cloud Functions keep up to date.
 */
export function useCurrentClub(): CurrentClubState {
  const { user, authLoading } = useAuth();
  const [state, setState] = useState<CurrentClubState>({
    loading: true,
    club: null,
    role: null,
    teamIds: [],
  });

  useEffect(() => {
    // Firebase Auth resolves asynchronously after a hard reload. Treating
    // "no user yet" the same as "confirmed logged out" here would flip
    // loading to false a beat before the real session (and its club) comes
    // in, which is enough for a consumer like the dashboard guard to bounce
    // to onboarding on every page refresh.
    if (authLoading) {
      return;
    }
    if (!user) {
      setState({ loading: false, club: null, role: null, teamIds: [] });
      return;
    }

    const { db } = getFirebaseClient();
    const userRef = doc(db, "users", user.uid);

    let unsubscribeClub: (() => void) | null = null;

    const unsubscribeUser = onSnapshot(userRef, (userSnap) => {
      unsubscribeClub?.();
      unsubscribeClub = null;

      const data = userSnap.data();
      const clubIds: string[] = data?.clubIds ?? [];
      const clubRoles: Record<string, ClubRole> = data?.clubRoles ?? {};
      const clubTeamIds: Record<string, string[]> = data?.clubTeamIds ?? {};
      const primaryClubId = clubIds[0];

      if (!primaryClubId) {
        setState({ loading: false, club: null, role: null, teamIds: [] });
        return;
      }

      const clubRef = doc(db, "clubs", primaryClubId);
      unsubscribeClub = onSnapshot(clubRef, (clubSnap) => {
        const clubData = clubSnap.data();
        if (!clubData) {
          setState({ loading: false, club: null, role: null, teamIds: [] });
          return;
        }
        setState({
          loading: false,
          role: clubRoles[primaryClubId] ?? null,
          teamIds: clubTeamIds[primaryClubId] ?? [],
          club: {
            clubId: clubSnap.id,
            publicClubId: clubData.publicClubId,
            name: clubData.name,
            sport: clubData.sport,
            country: clubData.country,
            language: clubData.language,
            contactName: clubData.contactName,
            contactEmail: clubData.contactEmail,
            logoUrl: clubData.logoUrl ?? null,
            primaryColor: clubData.primaryColor ?? null,
            secondaryColor: clubData.secondaryColor ?? null,
            currentLicenseId: clubData.currentLicenseId ?? null,
            currentLicenseType: clubData.currentLicenseType ?? null,
            currentLicenseStatus: clubData.currentLicenseStatus ?? null,
            currentLicenseTier: clubData.currentLicenseTier ?? null,
            currentMaxTeams: clubData.currentMaxTeams ?? null,
            currentLicenseValidUntil: toIsoOrNull(clubData.currentLicenseValidUntil),
          },
        });
      });
    });

    return () => {
      unsubscribeClub?.();
      unsubscribeUser();
    };
  }, [user, authLoading]);

  return state;
}
