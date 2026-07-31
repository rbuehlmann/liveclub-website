"use client";

import { createContext, useContext } from "react";
import { Club, ClubRole } from "@/lib/types";

export interface ClubContextValue {
  loading: boolean;
  club: Club | null;
  role: ClubRole | null;
  teamIds: string[];
}

export const ClubContext = createContext<ClubContextValue>({
  loading: true,
  club: null,
  role: null,
  teamIds: [],
});

export function useClubContext() {
  return useContext(ClubContext);
}
