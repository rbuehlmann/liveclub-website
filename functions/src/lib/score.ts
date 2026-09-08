import { Timestamp } from "firebase-admin/firestore";

export type GameStatus =
  | "draft"
  | "scheduled"
  | "live"
  | "paused"
  | "finished"
  | "cancelled";

// Football keeps its own explicit two-half vocabulary, untouched. Basketball
// (4 quarters) and ice hockey (3 periods) share a generic numbered
// "periodN" / "periodBreakN" vocabulary instead — see periodEnded/
// periodStarted below — since their break-between-segments semantics are
// identical, unlike football's asymmetric halfTime/secondHalfStarted pair.
export type GamePeriod =
  | "notStarted"
  | "firstHalf"
  | "halftime"
  | "secondHalf"
  | "finished"
  | "period1"
  | "periodBreak1"
  | "period2"
  | "periodBreak2"
  | "period3"
  | "periodBreak3"
  | "period4";

// 2026-09-08: one club = one sport, fixed at club creation (see
// src/app/onboarding/create-club/page.tsx's SPORTS list) — a game's sport is
// always its creating club's sport, denormalized once onto the game doc by
// createGame.ts. "football" is the default/legacy value: every club/game
// created before this existed has no `sport` field at all, and must keep
// behaving exactly as before.
export type Sport = "football" | "basketball" | "iceHockey";

// SPORTS in create-club/page.tsx stores German literals ("Fussball" etc.,
// matching existing production data — see that file's own comment on why),
// so this is the one place that turns those into the stable id used for all
// branching below. Anything unrecognized (including undefined/legacy
// fields) falls back to "football" — never let a bad/missing value pick a
// sport's rules for it.
export function normalizeSport(raw: string | null | undefined): Sport {
  if (raw === "Basketball" || raw === "basketball") return "basketball";
  if (raw === "Eishockey" || raw === "iceHockey") return "iceHockey";
  return "football";
}

export interface GameEventRecord {
  id: string;
  type: string;
  correctionOf?: string | null;
  serverTimestamp?: Timestamp | null;
  createdAt?: Timestamp | null;
}

export interface ComputedGameState {
  scoreHome: number;
  scoreAway: number;
  status: GameStatus;
  period: GamePeriod;
  yellowCardsHome: number;
  yellowCardsAway: number;
  redCardsHome: number;
  redCardsAway: number;
  // Basketball-only (always 0 for other sports) — personal fouls, not a
  // scoring event.
  foulsHome: number;
  foulsAway: number;
  // Ice-hockey-only (always 0 for other sports) — a simple count, no
  // penalty-box time tracking (deliberately deferred, see the 2026-09-08
  // planning discussion — a countdown clock is meaningfully more complex
  // and wasn't asked for yet).
  penaltiesHome: number;
  penaltiesAway: number;
  lastEventType: string | null;
  statusBeforePause: GameStatus | null;
}

function emptyState(): ComputedGameState {
  return {
    scoreHome: 0,
    scoreAway: 0,
    status: "scheduled",
    period: "notStarted",
    yellowCardsHome: 0,
    yellowCardsAway: 0,
    redCardsHome: 0,
    redCardsAway: 0,
    foulsHome: 0,
    foulsAway: 0,
    penaltiesHome: 0,
    penaltiesAway: 0,
    lastEventType: null,
    statusBeforePause: null,
  };
}

// Shared across every sport's reducer — event bookkeeping (void a
// corrected event, drop the correction markers themselves, sort into
// chronological order) has no sport-specific variation at all. Extracted
// here so all three reducers can't drift out of sync with each other on
// this; behavior is unchanged from before this was pulled out of
// computeGameState directly.
function relevantEvents(events: GameEventRecord[]): GameEventRecord[] {
  const voidedIds = new Set<string>();
  for (const event of events) {
    if (event.correctionOf) {
      voidedIds.add(event.correctionOf);
    }
  }

  const correctionTypes = new Set(["manualCorrection", "goalCorrection"]);

  return events
    .filter((e) => !voidedIds.has(e.id) && !correctionTypes.has(e.type))
    .sort((a, b) => {
      const ta = (a.serverTimestamp ?? a.createdAt)?.toMillis() ?? 0;
      const tb = (b.serverTimestamp ?? b.createdAt)?.toMillis() ?? 0;
      return ta - tb;
    });
}

/**
 * The score/status shown everywhere (reporter UI, club dashboard, public
 * page, widget) is always this function's output over the game's *valid*
 * events — never something a client wrote directly. Correction events
 * (`manualCorrection` / `goalCorrection`) never carry scoring weight
 * themselves; they only void the event they reference via `correctionOf`,
 * so the original stays in the audit trail but stops counting.
 *
 * Dispatches by sport (2026-09-08) — football's own branch is the exact
 * pre-existing logic, unchanged, so every game created before multi-sport
 * support keeps behaving identically. `sport` defaults to "football" so an
 * omitted argument (any caller not yet updated) is also safe.
 */
export function computeGameState(events: GameEventRecord[], sport: Sport = "football"): ComputedGameState {
  if (sport === "basketball") return computeBasketballState(events);
  if (sport === "iceHockey") return computeIceHockeyState(events);
  return computeFootballState(events);
}

function computeFootballState(events: GameEventRecord[]): ComputedGameState {
  const state = emptyState();

  for (const event of relevantEvents(events)) {
    switch (event.type) {
      case "gameStarted":
        state.status = "live";
        state.period = "firstHalf";
        break;
      case "goalHome":
        state.scoreHome += 1;
        break;
      case "goalAway":
        state.scoreAway += 1;
        break;
      case "halfTime":
        state.period = "halftime";
        break;
      case "secondHalfStarted":
        state.period = "secondHalf";
        break;
      case "gamePaused":
        state.statusBeforePause = state.status;
        state.status = "paused";
        break;
      case "gameResumed":
        state.status = state.statusBeforePause ?? "live";
        state.statusBeforePause = null;
        break;
      case "gameFinished":
        state.status = "finished";
        state.period = "finished";
        break;
      case "gameCancelled":
        state.status = "cancelled";
        break;
      case "yellowCardHome":
        state.yellowCardsHome += 1;
        break;
      case "yellowCardAway":
        state.yellowCardsAway += 1;
        break;
      case "redCardHome":
        state.redCardsHome += 1;
        break;
      case "redCardAway":
        state.redCardsAway += 1;
        break;
      default:
        break;
    }
    state.lastEventType = event.type;
  }

  return state;
}

// Quarters/periods only ever advance forward (periodEnded → break,
// periodStarted → next segment) — a reporter can always fall back to
// "Letztes Ereignis korrigieren" (manualCorrection) if they misclick, same
// as every other event, rather than this needing its own undo path.
function computeSegmentedState(
  events: GameEventRecord[],
  totalSegments: number,
  scoreEvents: Record<string, { home?: number; away?: number }>,
  secondaryEvents: Record<string, "foulHome" | "foulAway" | "penaltyHome" | "penaltyAway">
): ComputedGameState {
  const state = emptyState();
  let segmentIndex = 0; // 0-based; segment 1 == index 0

  for (const event of relevantEvents(events)) {
    const scoreDelta = scoreEvents[event.type];
    if (scoreDelta) {
      state.scoreHome += scoreDelta.home ?? 0;
      state.scoreAway += scoreDelta.away ?? 0;
      state.lastEventType = event.type;
      continue;
    }
    const secondary = secondaryEvents[event.type];
    if (secondary === "foulHome") state.foulsHome += 1;
    else if (secondary === "foulAway") state.foulsAway += 1;
    else if (secondary === "penaltyHome") state.penaltiesHome += 1;
    else if (secondary === "penaltyAway") state.penaltiesAway += 1;
    if (secondary) {
      state.lastEventType = event.type;
      continue;
    }

    switch (event.type) {
      case "gameStarted":
        state.status = "live";
        segmentIndex = 0;
        state.period = "period1";
        break;
      case "periodEnded":
        if (segmentIndex < totalSegments - 1) {
          segmentIndex += 1;
          state.period = `periodBreak${segmentIndex}` as GamePeriod;
        }
        break;
      case "periodStarted":
        if (segmentIndex > 0) {
          state.period = `period${segmentIndex + 1}` as GamePeriod;
        }
        break;
      case "gamePaused":
        state.statusBeforePause = state.status;
        state.status = "paused";
        break;
      case "gameResumed":
        state.status = state.statusBeforePause ?? "live";
        state.statusBeforePause = null;
        break;
      case "gameFinished":
        state.status = "finished";
        state.period = "finished";
        break;
      case "gameCancelled":
        state.status = "cancelled";
        break;
      default:
        break;
    }
    state.lastEventType = event.type;
  }

  return state;
}

function computeBasketballState(events: GameEventRecord[]): ComputedGameState {
  return computeSegmentedState(
    events,
    4,
    {
      shot1Home: { home: 1 },
      shot1Away: { away: 1 },
      shot2Home: { home: 2 },
      shot2Away: { away: 2 },
      shot3Home: { home: 3 },
      shot3Away: { away: 3 },
    },
    { foulHome: "foulHome", foulAway: "foulAway" }
  );
}

function computeIceHockeyState(events: GameEventRecord[]): ComputedGameState {
  return computeSegmentedState(
    events,
    3,
    {
      goalHomeHockey: { home: 1 },
      goalAwayHockey: { away: 1 },
    },
    { penaltyHome: "penaltyHome", penaltyAway: "penaltyAway" }
  );
}
