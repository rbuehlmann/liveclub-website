import { Timestamp } from "firebase-admin/firestore";

export type GameStatus =
  | "draft"
  | "scheduled"
  | "live"
  | "paused"
  | "finished"
  | "cancelled";

// Football keeps its own explicit two-half vocabulary, untouched. Basketball
// (4 quarters), ice hockey (3 periods), and handball (2 halves) share a
// generic numbered "periodN" / "periodBreakN" vocabulary instead — see
// periodEnded/periodStarted below — since their break-between-segments
// semantics are identical, unlike football's asymmetric
// halfTime/secondHalfStarted pair.
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
  | "period4"
  // Volleyball's 5th (deciding) set — no periodBreak4, since volleyball
  // never pauses between sets the way the tick-driven sports do (see
  // computeVolleyballState below).
  | "period5";

// 2026-09-08: one club = one sport, fixed at club creation (see
// src/app/onboarding/create-club/page.tsx's SPORTS list) — a game's sport is
// always its creating club's sport, denormalized once onto the game doc by
// createGame.ts. "football" is the default/legacy value: every club/game
// created before this existed has no `sport` field at all, and must keep
// behaving exactly as before.
export type Sport = "football" | "basketball" | "iceHockey" | "handball" | "americanFootball" | "volleyball";

// SPORTS in create-club/page.tsx stores German literals ("Fussball" etc.,
// matching existing production data — see that file's own comment on why),
// so this is the one place that turns those into the stable id used for all
// branching below. Anything unrecognized (including undefined/legacy
// fields) falls back to "football" — never let a bad/missing value pick a
// sport's rules for it.
export function normalizeSport(raw: string | null | undefined): Sport {
  if (raw === "Basketball" || raw === "basketball") return "basketball";
  if (raw === "Eishockey" || raw === "iceHockey") return "iceHockey";
  if (raw === "Handball" || raw === "handball") return "handball";
  if (raw === "American Football" || raw === "americanFootball") return "americanFootball";
  if (raw === "Volleyball" || raw === "volleyball") return "volleyball";
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
  // Volleyball-only (always 0/[] for other sports). scoreHome/scoreAway
  // stay "the top instance" (sets won) for volleyball, consistent with
  // what score means for every other sport — these two carry the *live*
  // point count within the current set, which resets every set, alongside
  // it rather than replacing it. Keeping this convention (score = the
  // single top-level result, sport-specific detail lives in its own
  // fields) is what would let a future sport with even deeper nesting
  // (e.g. tennis: sets > games > points) slot in the same way, without
  // needing to touch how score itself works for anyone else.
  currentSetScoreHome: number;
  currentSetScoreAway: number;
  setsHistory: { home: number; away: number }[];
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
    currentSetScoreHome: 0,
    currentSetScoreAway: 0,
    setsHistory: [],
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
  if (sport === "handball") return computeHandballState(events);
  if (sport === "americanFootball") return computeAmericanFootballState(events);
  if (sport === "volleyball") return computeVolleyballState(events);
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
type SecondaryEventCategory =
  | "foulHome"
  | "foulAway"
  | "penaltyHome"
  | "penaltyAway"
  | "yellowCardHome"
  | "yellowCardAway"
  | "redCardHome"
  | "redCardAway";

function computeSegmentedState(
  events: GameEventRecord[],
  totalSegments: number,
  scoreEvents: Record<string, { home?: number; away?: number }>,
  secondaryEvents: Record<string, SecondaryEventCategory>
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
    else if (secondary === "yellowCardHome") state.yellowCardsHome += 1;
    else if (secondary === "yellowCardAway") state.yellowCardsAway += 1;
    else if (secondary === "redCardHome") state.redCardsHome += 1;
    else if (secondary === "redCardAway") state.redCardsAway += 1;
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

// Two halves, like football — but isolated (own event vocabulary, own
// reducer call), not sharing football's actual function or event types.
// Reuses the generic segmented-state model (totalSegments: 2) rather than
// football's explicit firstHalf/halftime/secondHalf, since the underlying
// "end this segment, start the next" mechanic is identical to what
// basketball/ice hockey already use — the reporter UI still shows
// football-style "Halbzeit"/"2. Halbzeit starten" labels for it (same
// German words), it's just wired to the generic periodEnded/periodStarted
// events under the hood instead of football's own halfTime/
// secondHalfStarted.
function computeHandballState(events: GameEventRecord[]): ComputedGameState {
  return computeSegmentedState(
    events,
    2,
    {
      goalHomeHandball: { home: 1 },
      goalAwayHandball: { away: 1 },
    },
    {
      yellowCardHomeHandball: "yellowCardHome",
      yellowCardAwayHandball: "yellowCardAway",
      redCardHomeHandball: "redCardHome",
      redCardAwayHandball: "redCardAway",
    }
  );
}

// 4 quarters, same generic segmented model as basketball. Five flat,
// independent scoring buttons per team (2026-09-08 decision) rather than a
// guided "touchdown, then ask for the PAT result" flow — a touchdown and
// its extra-point/2-point attempt are just two separate taps, same
// reliability model as every other sport here (misclick → "Letztes
// Ereignis korrigieren", not a dedicated undo). No penalty/foul tracking —
// yard-level penalty detail is deliberately out of scope for a simple live
// scoreboard.
function computeAmericanFootballState(events: GameEventRecord[]): ComputedGameState {
  return computeSegmentedState(
    events,
    4,
    {
      touchdownHome: { home: 6 },
      touchdownAway: { away: 6 },
      extraPointHome: { home: 1 },
      extraPointAway: { away: 1 },
      twoPointHome: { home: 2 },
      twoPointAway: { away: 2 },
      fieldGoalHome: { home: 3 },
      fieldGoalAway: { away: 3 },
      safetyHome: { home: 2 },
      safetyAway: { away: 2 },
    },
    {}
  );
}

const VOLLEYBALL_TOTAL_SETS = 5;
const VOLLEYBALL_REGULAR_SET_TARGET = 25;
const VOLLEYBALL_DECIDING_SET_TARGET = 15;

// A set ends the instant either side crosses the win threshold with a
// 2-point lead — data-driven, unlike every other sport here, where a human
// always clicks an explicit "end this segment" button. No fouls/violations
// tracking (matches the same "skip granular secondary detail" call made for
// American football's penalties).
function volleyballSetWinner(home: number, away: number, target: number): "home" | "away" | null {
  if (home >= target && home - away >= 2) return "home";
  if (away >= target && away - home >= 2) return "away";
  return null;
}

function computeVolleyballState(events: GameEventRecord[]): ComputedGameState {
  const state = emptyState();
  let setNumber = 1; // 1-based; set 5 is the deciding set (target 15, not 25)

  for (const event of relevantEvents(events)) {
    switch (event.type) {
      case "gameStarted":
        state.status = "live";
        state.period = "period1";
        setNumber = 1;
        break;
      case "pointHomeVolleyball":
      case "pointAwayVolleyball": {
        if (event.type === "pointHomeVolleyball") state.currentSetScoreHome += 1;
        else state.currentSetScoreAway += 1;

        const target = setNumber >= VOLLEYBALL_TOTAL_SETS ? VOLLEYBALL_DECIDING_SET_TARGET : VOLLEYBALL_REGULAR_SET_TARGET;
        const winner = volleyballSetWinner(state.currentSetScoreHome, state.currentSetScoreAway, target);
        if (winner) {
          state.setsHistory.push({ home: state.currentSetScoreHome, away: state.currentSetScoreAway });
          if (winner === "home") state.scoreHome += 1;
          else state.scoreAway += 1;
          state.currentSetScoreHome = 0;
          state.currentSetScoreAway = 0;
          if (setNumber < VOLLEYBALL_TOTAL_SETS) {
            setNumber += 1;
            state.period = `period${setNumber}` as GamePeriod;
          }
        }
        break;
      }
      case "gamePaused":
        state.statusBeforePause = state.status;
        state.status = "paused";
        break;
      case "gameResumed":
        state.status = state.statusBeforePause ?? "live";
        state.statusBeforePause = null;
        break;
      case "gameFinished":
        // Always an explicit reporter action, same as every other sport —
        // never auto-finished just because one side reached 3 sets, so a
        // human always confirms the actual finish.
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
