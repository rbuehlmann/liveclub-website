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

export function buildEmbedUrl(publicClubId: string, teamId?: string): string {
  const base = `/embed/${publicClubId}`;
  return teamId ? `${base}?team=${encodeURIComponent(teamId)}` : base;
}

export function buildInviteUrl(invitationId: string): string {
  return `/invite/${invitationId}`;
}

export function buildGameLiveUrl(gameId: string): string {
  return `/dashboard/games/${gameId}/live`;
}
