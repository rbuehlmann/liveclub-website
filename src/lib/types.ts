export type ClubRole = "clubAdmin" | "reporter";

export interface Club {
  clubId: string;
  publicClubId: string;
  name: string;
  sport: string;
  country: string;
  language: string;
  contactName: string;
  contactEmail: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  currentLicenseId?: string | null;
  currentLicenseType?: LicenseType | null;
  currentLicenseStatus?: LicenseStatus | null;
  currentLicenseValidUntil?: string | null; // ISO string on the client
}

export interface Member {
  uid: string;
  role: ClubRole;
  email?: string | null;
  displayName?: string | null;
}

export interface Team {
  teamId: string;
  clubId: string;
  publicTeamId?: string | null;
  name: string;
  shortName: string;
  sport: string;
  active: boolean;
}

export type GameStatus =
  | "draft"
  | "scheduled"
  | "live"
  | "paused"
  | "finished"
  | "cancelled";

export type GamePeriod = "notStarted" | "firstHalf" | "halftime" | "secondHalf" | "finished";

export interface Game {
  gameId: string;
  clubId: string;
  publicClubId: string;
  teamId: string;
  homeTeamName: string;
  awayTeamName: string;
  // Set automatically for "our own" side; set optionally by the reporting
  // club for the opponent's side if that club also uses LiveClub — lets the
  // UI show the opponent's real logo instead of a placeholder.
  homeClubPublicId?: string | null;
  awayClubPublicId?: string | null;
  // The scoring team's id within its own club's teams collection — set for
  // "our" side always, and for the opponent's side only if a specific one of
  // their teams was picked (vs. a plain typed name).
  homeTeamId?: string | null;
  awayTeamId?: string | null;
  isHomeGame: boolean;
  venue?: string;
  scheduledStart: string | null;
  actualStart?: string | null;
  actualEnd?: string | null;
  status: GameStatus;
  period?: GamePeriod;
  score: { home: number; away: number };
  cards?: {
    yellowHome: number;
    yellowAway: number;
    redHome: number;
    redAway: number;
  };
  lastEventType?: string | null;
  reporterUids: string[];
}

export type GameEventType =
  | "gameStarted"
  | "goalHome"
  | "goalAway"
  | "goalCorrection"
  | "yellowCardHome"
  | "yellowCardAway"
  | "redCardHome"
  | "redCardAway"
  | "halfTime"
  | "secondHalfStarted"
  | "gamePaused"
  | "gameResumed"
  | "gameFinished"
  | "gameCancelled"
  | "manualCorrection";

export interface GameEvent {
  eventId: string;
  clubId: string;
  gameId: string;
  type: GameEventType;
  createdByUid: string;
  correctionOf?: string | null;
  note?: string;
  createdAt?: string;
}

export type LicenseType =
  | "trial"
  | "paid"
  | "manual"
  | "voucher"
  | "sponsor"
  | "partner";

export type LicenseStatus =
  | "active"
  | "expired"
  | "cancelled"
  | "suspended"
  | "scheduled";

export interface License {
  licenseId: string;
  clubId: string;
  type: LicenseType;
  status: LicenseStatus;
  validFrom: string;
  validUntil: string;
  notes?: string;
}

export type InvitationStatus = "pending" | "accepted" | "cancelled";

export interface Invitation {
  invitationId: string;
  clubId: string;
  role: ClubRole;
  email?: string;
  status: InvitationStatus;
  createdBy: string;
  expiresAt?: string;
}

export interface PublicClub {
  publicClubId: string;
  clubId: string;
  name: string;
  sport: string;
  logoUrl?: string | null;
  currentLiveGameId?: string | null;
  currentLiveGameIdByTeam?: Record<string, string>;
}

export interface PublicGame {
  gameId: string;
  clubId: string;
  publicClubId: string;
  teamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeClubPublicId?: string | null;
  awayClubPublicId?: string | null;
  homeTeamId?: string | null;
  awayTeamId?: string | null;
  scoreHome: number;
  scoreAway: number;
  status: GameStatus;
  period?: GamePeriod;
  lastEventType?: string | null;
}

// Public, read-only mirror of one club's active teams — lets another club
// look up and select a specific opponent team by public club id, without
// exposing the private clubs/{clubId}/teams collection itself.
export interface PublicTeam {
  teamId: string;
  publicTeamId?: string | null;
  name: string;
  shortName: string;
  sport: string;
}

// Global, read-only mirror keyed by a team's own short publicTeamId — lets
// a team's public page/QR code be resolved directly, without knowing its
// club's publicClubId first.
export interface PublicTeamProfile {
  publicTeamId: string;
  teamId: string;
  clubId: string;
  publicClubId: string;
  clubName: string;
  clubLogoUrl?: string | null;
  name: string;
  shortName: string;
  sport: string;
}
