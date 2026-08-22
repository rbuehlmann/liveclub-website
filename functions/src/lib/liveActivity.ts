import { db } from "../firebaseAdmin";
import { sendLiveActivityPush } from "./apns";

// Field-for-field mirror of the iOS app's `LiveClubGameAttributes` /
// `ContentState` (iOS/Shared/Models/LiveClubGameAttributes.swift) — keep
// both in sync if either changes. Exported so `fcm.ts` (Android) can reuse
// the same shape instead of duplicating it.
export interface GameForActivity {
  gameId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeClubPublicId?: string | null;
  awayClubPublicId?: string | null;
  // Each side's own logo, resolved by the caller from whichever club that
  // side's `ClubPublicId` actually points at (the reporting club for one
  // side, potentially a *different* real LiveClub club for the other) —
  // never assume only the reporting side has a logo.
  homeClubLogoUrl?: string | null;
  awayClubLogoUrl?: string | null;
  // Small base64-encoded JPEG (lib/logoThumbnail.ts) — embedded directly in
  // the Activity's static Attributes (see `attributes()` below) so the
  // badge image is available even where a URL alone wouldn't reach: the
  // Apple Watch mirror of a Live Activity runs on its own hardware, with no
  // access to the iPhone app's local disk cache or, generally, the network
  // fetch AsyncImage would need.
  homeClubLogoThumbnail?: string | null;
  awayClubLogoThumbnail?: string | null;
  publicClubId: string;
  clubName: string;
  scoreHome: number;
  scoreAway: number;
  status: string;
  period?: string | null;
  lastEventType?: string | null;
}

export function contentState(game: GameForActivity) {
  return {
    scoreHome: game.scoreHome,
    scoreAway: game.scoreAway,
    status: game.status,
    period: game.period ?? null,
    lastEventType: game.lastEventType ?? null,
  };
}

export function attributes(game: GameForActivity) {
  return {
    gameId: game.gameId,
    homeTeamName: game.homeTeamName,
    awayTeamName: game.awayTeamName,
    homeLogoUrl: game.homeClubLogoUrl ?? null,
    awayLogoUrl: game.awayClubLogoUrl ?? null,
    // Plain base64 strings — Swift's `Data` decodes a JSON string field as
    // base64 automatically, no extra wrapping needed on the client side.
    homeLogoData: game.homeClubLogoThumbnail ?? null,
    awayLogoData: game.awayClubLogoThumbnail ?? null,
    clubName: game.clubName,
  };
}

// Exported so `fcm.ts` (Android) can filter the same query result by
// `platform` instead of running a second `deviceFollows` query per event.
export interface DeviceFollow {
  id: string;
  platform?: string;
  pushToStartToken?: string;
  activityUpdateTokens?: Record<string, string>;
  fcmToken?: string;
  followedTeamIds?: string[];
  // The "Live Activity immer starten" toggle, per followed team — an
  // exception list (most devices leave everything enabled, so most docs
  // never write this field at all) written by `DeviceFollowSync`.
  liveActivityDisabledTeamIds?: string[];
  // The "Push Notification" toggle, per followed team — same exception-list
  // shape as above, but gates Team-Info pushes (teamInfoPush.ts) instead of
  // Live Activity starts.
  pushNotificationsDisabledTeamIds?: string[];
}

export async function devicesFollowing(publicTeamId: string): Promise<DeviceFollow[]> {
  const snap = await db
    .collection("deviceFollows")
    .where("followedTeamIds", "array-contains", publicTeamId)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DeviceFollow, "id">) }));
}

/** A device only ever follows a game through one or both of the two teams
 * playing it — `relevantTeamIds` is whichever of those this specific device
 * actually follows. Only suppress the push-to-start for this device if
 * *every* team that makes this game relevant to it has the toggle off; if
 * it follows both sides and only disabled one, it still wants the push for
 * the other. */
export function wantsLiveActivityStart(device: DeviceFollow, relevantTeamIds: string[]): boolean {
  const followed = new Set(device.followedTeamIds ?? []);
  const disabled = new Set(device.liveActivityDisabledTeamIds ?? []);
  const relevantFollowed = relevantTeamIds.filter((id) => followed.has(id));
  if (relevantFollowed.length === 0) return true;
  return relevantFollowed.some((id) => !disabled.has(id));
}

/** A Team-Info post only ever belongs to one team (unlike a game, which can
 * be relevant through either side), so this is just a single-id membership
 * check against the exception list. */
export function wantsTeamInfoPush(device: DeviceFollow, publicTeamId: string): boolean {
  const disabled = new Set(device.pushNotificationsDisabledTeamIds ?? []);
  return !disabled.has(publicTeamId);
}

/** Push-to-start: fires once, to every device following either side, the
 * moment their game goes live — this is what makes the Live Activity
 * appear even if the app isn't running (the "Apple Sports" behavior).
 * `devices` must already be deduplicated by the caller (a device following
 * *both* teams in a head-to-head match must still only get one push, or it
 * ends up with two separate Live Activities for the same game). */
export async function notifyGameStarted(game: GameForActivity, devices: DeviceFollow[]): Promise<void> {
  const payload = {
    event: "start" as const,
    contentState: contentState(game),
    attributesType: "LiveClubGameAttributes",
    attributes: attributes(game),
    alert: {
      title: game.clubName,
      body: `${game.homeTeamName} – ${game.awayTeamName} hat begonnen`,
    },
  };
  const results = await Promise.allSettled(
    devices
      .filter((d) => d.pushToStartToken)
      .map((d) => sendLiveActivityPush(d.pushToStartToken!, payload))
  );
  logFailures("notifyGameStarted", results);
}

/** Update: fires on every score/status change while the game is live, to
 * whichever devices currently have a running activity for this exact game
 * (i.e. already received a "start" push earlier). A goal additionally gets
 * an alert+sound, so the system plays the same soft haptic/chime a regular
 * notification would — everything else (cards, half-time) updates the
 * Activity's content silently. `devices` must already be deduplicated by
 * the caller — see `notifyGameStarted`. */
export async function notifyGameUpdated(game: GameForActivity, devices: DeviceFollow[]): Promise<void> {
  const isGoal = game.lastEventType === "goalHome" || game.lastEventType === "goalAway";
  const payload = {
    event: "update" as const,
    contentState: contentState(game),
    ...(isGoal
      ? {
          alert: {
            title: game.clubName,
            body: `Tor! ${game.homeTeamName} ${game.scoreHome}:${game.scoreAway} ${game.awayTeamName}`,
          },
          sound: "default",
        }
      : {}),
  };
  const results = await Promise.allSettled(
    devices
      .map((d) => d.activityUpdateTokens?.[game.gameId])
      .filter((token): token is string => Boolean(token))
      .map((token) => sendLiveActivityPush(token, payload))
  );
  logFailures("notifyGameUpdated", results);
}

/** End: fires once when the game finishes/is cancelled, so the Live
 * Activity resolves instead of sitting there stale forever. `devices` must
 * already be deduplicated by the caller — see `notifyGameStarted`. */
export async function notifyGameEnded(game: GameForActivity, devices: DeviceFollow[]): Promise<void> {
  const payload = {
    event: "end" as const,
    contentState: contentState(game),
    // Leaves the final score visible for 30 minutes before the system
    // removes it, instead of dismissing it instantly.
    dismissalDate: Math.floor(Date.now() / 1000) + 30 * 60,
  };
  const results = await Promise.allSettled(
    devices
      .map((d) => d.activityUpdateTokens?.[game.gameId])
      .filter((token): token is string => Boolean(token))
      .map((token) => sendLiveActivityPush(token, payload))
  );
  logFailures("notifyGameEnded", results);
}

// A single stale/expired device token shouldn't fail the whole batch
// (Promise.allSettled already ensures that) — just log which ones failed
// so a persistently-failing token is visible without crashing the trigger.
function logFailures(context: string, results: PromiseSettledResult<void>[]): void {
  const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failures.length > 0) {
    console.warn(
      `${context}: ${failures.length}/${results.length} push(es) failed`,
      failures.map((f) => String(f.reason))
    );
  }
}
