"use client";

import { createContext, useContext } from "react";
import { Club, ClubRole } from "@/lib/types";

export interface ClubContextValue {
  loading: boolean;
  club: Club | null;
  role: ClubRole | null;
}

export const ClubContext = createContext<ClubContextValue>({
  loading: true,
  club: null,
  role: null,
});

export function useClubContext() {
  return useContext(ClubContext);
}
