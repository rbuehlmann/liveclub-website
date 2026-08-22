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

// A fixture exists exactly once, at the top level (games/{gameId}) — not
// nested under either club — so both the home and away club (when both use
// LiveClub) read and administer the very same document instead of each
// keeping their own copy. See project_liveclub_game_editor_model memory /
// the 2026-08-15 "Überarbeitung der Spiel- und Redaktorenlogik" design for
// the full reasoning.
export interface Game {
  gameId: string;
  homeTeamName: string;
  awayTeamName: string;
  // clubId is set only when that side is a real LiveClub club (vs. a plain
  // typed opponent name); publicClubId/teamId follow the same rule.
  homeClubId?: string | null;
  awayClubId?: string | null;
  homeClubPublicId?: string | null;
  awayClubPublicId?: string | null;
  homeTeamId?: string | null;
  awayTeamId?: string | null;
  // Which club actually created this record — informational (e.g. for
  // "already exists" messaging), not an access-control field.
  createdByClubId: string;
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
  // Exactly one uid may administer (start/score/etc.) this game at a time —
  // enforced in firestore.rules on the events subcollection, not just in
  // the UI. See requestGameTransfer/acceptGameTransfer.
  mainEditorUid: string;
  mainEditorClubId: string;
  // Snapshot of users/{mainEditorUid}.publicDisplayName — denormalized here
  // because the client can only ever read its own users/{uid} doc, never
  // another user's (see firestore.rules), so this can't be looked up
  // directly by whoever's viewing the game.
  mainEditorDisplayName?: string | null;
  // Anyone eligible to become mainEditor: clubAdmin/reporter (scoped to the
  // relevant team) of either involved club, recomputed at creation time.
  eligibleEditorUids: string[];
  // Once true, the free one-time cross-club self-claim in
  // acceptGameTransfer is closed forever for this game — every further
  // transfer needs an explicit requestGameTransfer from the current editor.
  // Missing on games created before this field existed = false (safe: they
  // simply still allow the free first claim, same as before).
  hasBeenTransferred?: boolean;
  // "direct" targets one specific person (own club or the opponent's, if
  // known by uid); "clubBroadcast" targets *any* eligible editor of the
  // opponent club (toUid null) — used when the current mainEditor wants to
  // hand back to "whoever's available over there" without being able to
  // see individual names on the other side (see firestore.rules: a club's
  // members subcollection is only readable by its own members).
  pendingTransfer?: {
    toUid: string | null;
    requestedByUid: string;
    requestedAt: string;
    kind: "direct" | "clubBroadcast";
  } | null;
}

export interface GameEditorHistoryEntry {
  id: string;
  action: "created" | "takeoverInviteSent" | "accepted" | "declined" | "handedOff";
  byUid?: string | null;
  atUid?: string | null;
  timestamp: string | null;
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
  // The public id a device follows a team by (deviceFollows.followedTeamIds)
  // — distinct from homeTeamId/awayTeamId above, which are a club's
  // *private* team ids. Needed to query "past games for teams I follow"
  // directly against publicGames.
  homePublicTeamId?: string | null;
  awayPublicTeamId?: string | null;
  scoreHome: number;
  scoreAway: number;
  status: GameStatus;
  period?: GamePeriod;
  lastEventType?: string | null;
}

// A short, manually-authored team announcement, mixed chronologically into
// the same feed as games in the iOS/Android apps (2026-08-21 "Team-Infos"
// design) — always live immediately on creation, no draft state. Public
// read like PublicGame, since the spectator apps have no login.
export interface TeamInfo {
  infoId: string;
  teamId: string;
  publicTeamId?: string | null;
  clubId: string;
  publicClubId?: string | null;
  teamName: string;
  clubName: string;
  clubLogoUrl?: string | null;
  title: string;
  text: string;
  createdAt: string | null;
  createdByUid: string;
  pushSent: boolean;
  pushSentAt: string | null;
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
