import { Timestamp } from "firebase-admin/firestore";

export type GameStatus =
  | "draft"
  | "scheduled"
  | "live"
  | "paused"
  | "finished"
  | "cancelled";

export type GamePeriod = "notStarted" | "firstHalf" | "halftime" | "secondHalf" | "finished";

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
  lastEventType: string | null;
  statusBeforePause: GameStatus | null;
}

/**
 * The score/status shown everywhere (reporter UI, club dashboard, public
 * page, widget) is always this function's output over the game's *valid*
 * events — never something a client wrote directly. Correction events
 * (`manualCorrection` / `goalCorrection`) never carry scoring weight
 * themselves; they only void the event they reference via `correctionOf`,
 * so the original stays in the audit trail but stops counting.
 */
export function computeGameState(events: GameEventRecord[]): ComputedGameState {
  const voidedIds = new Set<string>();
  for (const event of events) {
    if (event.correctionOf) {
      voidedIds.add(event.correctionOf);
    }
  }

  const correctionTypes = new Set(["manualCorrection", "goalCorrection"]);

  const relevantEvents = events
    .filter((e) => !voidedIds.has(e.id) && !correctionTypes.has(e.type))
    .sort((a, b) => {
      const ta = (a.serverTimestamp ?? a.createdAt)?.toMillis() ?? 0;
      const tb = (b.serverTimestamp ?? b.createdAt)?.toMillis() ?? 0;
      return ta - tb;
    });

  const state: ComputedGameState = {
    scoreHome: 0,
    scoreAway: 0,
    status: "scheduled",
    period: "notStarted",
    yellowCardsHome: 0,
    yellowCardsAway: 0,
    redCardsHome: 0,
    redCardsAway: 0,
    lastEventType: null,
    statusBeforePause: null,
  };

  for (const event of relevantEvents) {
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
