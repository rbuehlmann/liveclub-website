/**
 * Single source of truth for how a public LiveClub URL is built, so QR
 * codes, the share page, the widget script, and in-app links can't drift
 * out of sync with each other.
 */

export function buildClubUrl(publicClubId: string): string {
  return `/${publicClubId}`;
}

export function buildGameUrl(publicClubId: string, gameId: string): string {
  return `/${publicClubId}/live/${gameId}`;
}

export function buildTeamUrl(publicTeamId: string): string {
  return `/team/${publicTeamId}`;
}

// Never had another caller yet (the share page always built this string
// itself) — options object rather than positional params so the feed mode's
// extra query params (see src/app/embed/[publicClubId]/page.tsx) could be
// added without an awkward growing argument list.
export function buildEmbedUrl(
  publicClubId: string,
  options?: {
    teamId?: string;
    mode?: "feed";
    scope?: "all" | "team";
    theme?: "light" | "dark";
    limit?: number;
  }
): string {
  const params = new URLSearchParams();
  if (options?.teamId) params.set("team", options.teamId);
  if (options?.mode) params.set("mode", options.mode);
  if (options?.scope) params.set("scope", options.scope);
  if (options?.theme) params.set("theme", options.theme);
  if (options?.limit) params.set("limit", String(options.limit));
  const query = params.toString();
  return `/embed/${publicClubId}${query ? `?${query}` : ""}`;
}

export function buildInviteUrl(invitationId: string): string {
  return `/invite/${invitationId}`;
}

export function buildGameLiveUrl(gameId: string): string {
  return `/dashboard/games/${gameId}/live`;
}
