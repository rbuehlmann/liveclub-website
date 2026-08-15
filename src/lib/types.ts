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
  currentLicenseTier?: LicenseTier | null;
  currentMaxTeams?: number | null; // null = unlimited
  currentLicenseValidUntil?: string | null; // ISO string on the client
  stripeCustomerId?: string | null;
}

export interface Member {
  uid: string;
  role: ClubRole;
  // Only meaningful for role "reporter" (displayed as "Redaktor"): the
  // team(s) this member may manage games for. Ignored for clubAdmin, who
  // isn't scoped by team.
  teamIds?: string[];
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
  // Set when createGame.ts marks this club's own entry "cancelled" because
  // the opponent (a real linked club) already registered the same fixture
  // as home — NOT a real cancellation, the match is still happening, just
  // administered via the home club's entry instead. Surfaced distinctly in
  // the UI (see games/page.tsx's isSupersededCancellation) rather than as
  // an ordinary cancellation.
  supersededReason?: string | null;
  period?: GamePeriod;
  score: { home: number; away: number };
  cards?: {
    yellowHome: number;
    yellowAway: number;
    redHome: number;
    redAway: number;
  };
  lastEventType?: string | null;
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

// "paid" covers both a real Stripe purchase and an admin-granted free
// period (see `source` on the license record for which one) — sponsoring/
// vouchers/partner deals no longer get their own manual admin type, they'd
// go through Stripe (e.g. a discount code) like any other purchase.
export type LicenseType = "trial" | "paid";

// "suspended" is the platform-admin "manually deactivated" action (misuse,
// see the AGB clause) — distinct from "expired"/"cancelled" so the club's
// own dashboard can tell a reporter "contact support" instead of "please
// pay", since paying wouldn't fix it.
export type LicenseStatus = "active" | "expired" | "cancelled" | "suspended";

// Team-count tiers. "team5" is also every trial's implicit default — same
// limit as the cheapest paid tier, so buying it doesn't change anything
// numerically, just extends access past the trial. Keep in sync with
// functions/src/lib/license.ts's TIER_MAX_TEAMS.
export type LicenseTier = "team5" | "team15" | "unlimited";

export interface License {
  licenseId: string;
  clubId: string;
  type: LicenseType;
  status: LicenseStatus;
  tier: LicenseTier;
  maxTeams: number | null;
  validFrom: string;
  validUntil: string;
  notes?: string;
}

export type InvitationStatus = "pending" | "accepted" | "cancelled";

export interface Invitation {
  invitationId: string;
  clubId: string;
  role: ClubRole;
  teamIds?: string[];
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
  country?: string;
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

// clubRecommendations/{id} — "tell us about a club we're missing", from
// either the public /verein-empfehlen form or the game-creation opponent
// flow. Write-only from the client (via the submitClubRecommendation
// callable, reCAPTCHA-gated); read is platform-admin only. referralCode
// doubles as a Stripe promotion code once a Stripe coupon mechanic is
// wired in (see project-liveclub-club-recommendations memory).
export type ClubRecommendationSource = "publicSearch" | "gameOpponent";
export type ClubRecommendationStatus = "new" | "converted";

export interface ClubRecommendation {
  id: string;
  clubName: string;
  country?: string | null;
  note?: string | null;
  recommenderName?: string | null;
  recommenderEmail?: string | null;
  source: ClubRecommendationSource;
  referringClubId?: string | null;
  referralCode: string;
  status: ClubRecommendationStatus;
  createdAt: string;
}

// settings/branding — publicly readable, platform-admin writable (see
// firestore.rules). All fields optional: an unset field just falls back to
// the static default in globals.css/favicon.ico. iconLight/iconDark are
// stored for future use but not yet consumed anywhere; favicon IS applied
// live (see BrandingProvider.tsx's applyFavicon), best-effort only since
// browsers cache favicons aggressively.
export interface BrandingSettings {
  logoLight?: string | null;
  logoDark?: string | null;
  iconLight?: string | null;
  iconDark?: string | null;
  favicon?: string | null;
  backgroundColorLight?: string | null;
  backgroundColorDark?: string | null;
  accentColorLight?: string | null;
  accentColorDark?: string | null;
}
