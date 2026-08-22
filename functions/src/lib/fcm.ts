import { getMessaging } from "firebase-admin/messaging";
import { app } from "../firebaseAdmin";
import { attributes, contentState, type DeviceFollow, type GameForActivity } from "./liveActivity";

/**
 * Android's half of `liveActivity.ts` — sends a silent FCM data push (no
 * `notification` block, so the OS never renders anything on its own) to
 * every Android device following this team. The app's own
 * `LiveClubMessagingService.onMessageReceived` parses this and drives
 * `LiveUpdateController`, the exact same code path it already uses when
 * observing the game live via Firestore in the foreground.
 *
 * Unlike iOS' push-to-start/per-activity update tokens, FCM only needs one
 * token per device — a plain data push reaches the app whether or not it's
 * running (as long as it hasn't been force-stopped), so there's no
 * separate "does this device have a running activity for this game"
 * bookkeeping to do here.
 */
function dataPayload(event: "start" | "update" | "end", game: GameForActivity): Record<string, string> {
  const state = contentState(game);
  const attrs = attributes(game);
  return {
    event,
    gameId: attrs.gameId,
    homeTeamName: attrs.homeTeamName,
    awayTeamName: attrs.awayTeamName,
    homeLogoUrl: attrs.homeLogoUrl ?? "",
    awayLogoUrl: attrs.awayLogoUrl ?? "",
    clubName: attrs.clubName,
    scoreHome: String(state.scoreHome),
    scoreAway: String(state.scoreAway),
    status: state.status,
    period: state.period ?? "",
    // Lets the client alert (sound/vibration) specifically on a goal
    // instead of every silent score/status update — mirrors the
    // `isGoal` alert+sound distinction `notifyGameUpdated` already makes
    // for iOS.
    lastEventType: state.lastEventType ?? "",
  };
}

async function sendToAndroidDevices(
  event: "start" | "update" | "end",
  game: GameForActivity,
  devices: DeviceFollow[]
): Promise<void> {
  const tokens = devices
    .filter((d) => d.platform === "android" && d.fcmToken)
    .map((d) => d.fcmToken!);
  if (tokens.length === 0) return;

  const data = dataPayload(event, game);
  const results = await Promise.allSettled(
    tokens.map((token) => getMessaging(app).send({ token, data, android: { priority: "high" } }))
  );
  const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failures.length > 0) {
    console.warn(
      `sendToAndroidDevices(${event}): ${failures.length}/${results.length} push(es) failed`,
      failures.map((f) => String(f.reason))
    );
  }
}

export async function notifyAndroidGameStarted(game: GameForActivity, devices: DeviceFollow[]): Promise<void> {
  await sendToAndroidDevices("start", game, devices);
}

export async function notifyAndroidGameUpdated(game: GameForActivity, devices: DeviceFollow[]): Promise<void> {
  await sendToAndroidDevices("update", game, devices);
}

export async function notifyAndroidGameEnded(game: GameForActivity, devices: DeviceFollow[]): Promise<void> {
  await sendToAndroidDevices("end", game, devices);
}
