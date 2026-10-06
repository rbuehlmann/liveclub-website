import type { Club } from "@/lib/types";

// Mirrors the server gate in createGame/createTeamInfo and firestore.rules'
// isClubLicenseActive — UI-only, the server remains the source of truth.
export function isClubLicenseActive(
  club: Pick<Club, "currentLicenseStatus" | "currentLicenseValidUntil"> | null | undefined
): boolean {
  if (!club) return false;
  if (club.currentLicenseStatus !== "active") return false;
  if (!club.currentLicenseValidUntil) return false;
  return new Date(club.currentLicenseValidUntil).getTime() > Date.now();
}

export function isLicenseBlockedError(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  return !!e && e.code === "functions/failed-precondition" && /Lizenz/.test(e.message ?? "");
}
