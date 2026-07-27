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
  scoreHome: number;
  scoreAway: number;
  status: GameStatus;
  period?: GamePeriod;
  lastEventType?: string | null;
}
