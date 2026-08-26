import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { db } from "../firebaseAdmin";
import { apnsAuthKey } from "../lib/secrets";
import {
  devicesFollowing,
  notifyGameEnded,
  notifyGameStarted,
  notifyGameUpdated,
  wantsLiveActivityStart,
  type DeviceFollow,
} from "../lib/liveActivity";
import { notifyAndroidGameEnded, notifyAndroidGameStarted, notifyAndroidGameUpdated } from "../lib/fcm";
import { fetchLogoThumbnail } from "../lib/logoThumbnail";

const LIVE_STATUSES = new Set(["live", "paused"]);
const ENDED_STATUSES = new Set(["finished", "cancelled"]);

// `publicTeamId` (not `teamId`) is what `deviceFollows.followedTeamIds` is
// keyed by — same id the iOS/Android apps follow a team by.
async function resolvePublicTeamId(
  publicClubId: string | null | undefined,
  teamId: string | null | undefined
): Promise<string | undefined> {
  if (!publicClubId || !teamId) return undefined;
  const teamSnap = await db
    .collection("publicClubs")
    .doc(publicClubId)
    .collection("teams")
    .doc(teamId)
    .get();
  return teamSnap.data()?.publicTeamId as string | undefined;
}

/**
 * Dispatches the iOS Live Activity push (start/update/end) whenever a
 * `publicGames/{gameId}` doc changes — that doc is itself kept live by
 * `onGameEventCreate`, so this trigger fires right after it on every
 * reported game event. Kept as its own trigger (rather than folded into
 * onGameEventCreate) for the same reason onClubWrite/onTeamWrite are their
 * own single-purpose sync triggers: one thing per trigger.
 */
export const onPublicGameWrite = onDocumentWritten(
  { document: "publicGames/{gameId}", secrets: [apnsAuthKey] },
  async (event) => {
    const after = event.data?.after;
    const afterData = after?.exists ? after.data() : null;
    if (!afterData) return;

    const before = event.data?.before;
    const beforeData = before?.exists ? before.data() : null;

    const publicClubId = afterData.publicClubId as string | undefined;
    const teamId = afterData.teamId as string | undefined;
    if (!publicClubId || !teamId) return;

    // Followers of BOTH sides get notified — the game is fully visible on
    // either club's own page/widget/app (onGameEventCreate.ts mirrors
    // currentLiveGameId to the opponent's publicClubs doc too) — only
    // *administration* (the actual goal clicks etc.) stays exclusive to
    // whichever club's `events` subcollection this game actually is.
    const ownIsHome = afterData.homeClubPublicId === publicClubId;
    const opponentClubPublicId = (ownIsHome ? afterData.awayClubPublicId : afterData.homeClubPublicId) as
      | string
      | null
      | undefined;
    const opponentTeamId = (ownIsHome ? afterData.awayTeamId : afterData.homeTeamId) as string | null | undefined;

    const [ownPublicTeamId, opponentPublicTeamId] = await Promise.all([
      resolvePublicTeamId(publicClubId, teamId),
      opponentClubPublicId && opponentClubPublicId !== publicClubId
        ? resolvePublicTeamId(opponentClubPublicId, opponentTeamId)
        : Promise.resolve(undefined),
    ]);
    const publicTeamIds = [ownPublicTeamId, opponentPublicTeamId].filter((id): id is string => Boolean(id));
    if (publicTeamIds.length === 0) return;

    const homeClubPublicId = (afterData.homeClubPublicId as string | null) ?? null;
    const awayClubPublicId = (afterData.awayClubPublicId as string | null) ?? null;

    // Fetch every distinct real club referenced by either side — usually
    // just the reporter, but a second lookup when the opponent is *also* a
    // LiveClub club, so its followers see their own club's logo too instead
    // of it always resolving to null.
    const clubIdsToFetch = Array.from(new Set([publicClubId, homeClubPublicId, awayClubPublicId].filter(
      (id): id is string => Boolean(id)
    )));
    const [clubSnaps, brandingSnap] = await Promise.all([
      Promise.all(clubIdsToFetch.map((id) => db.collection("publicClubs").doc(id).get())),
      db.collection("settings").doc("branding").get(),
    ]);
    const logoByPublicClubId = new Map<string, string | null>(
      clubSnaps.map((snap) => [snap.id, (snap.data()?.logoUrl as string | null | undefined) ?? null])
    );
    // Precomputed by onClubWrite.ts whenever a club's logoUrl changes — see
    // lib/logoThumbnail.ts for why this rides along instead of a URL.
    const thumbnailByPublicClubId = new Map<string, string | null>(
      clubSnaps.map((snap) => [snap.id, (snap.data()?.logoThumbnailBase64 as string | null | undefined) ?? null])
    );
    const clubData = clubSnaps.find((snap) => snap.id === publicClubId)?.data();

    // A side with no logo of its own (no real LiveClub club on that side at
    // all, or a club that never uploaded one — the LiveDemo club's fake
    // opponents are the common case) otherwise leaves the Watch mirror with
    // nothing to show, since it has no access to the phone's own asset
    // cache/initials fallback. settings/branding.iconLight (see
    // /admin/settings) is the same platform-wide fallback TeamIcon.tsx uses
    // on the web — resolved lazily and only once per invocation, since most
    // games have real logos on both sides and this is the exception path.
    const fallbackIconUrl = (brandingSnap.data()?.iconLight as string | undefined) ?? null;
    let fallbackThumbnail: string | null | undefined;
    async function resolveFallbackThumbnail(): Promise<string | null> {
      if (fallbackThumbnail === undefined) {
        fallbackThumbnail = fallbackIconUrl ? await fetchLogoThumbnail(fallbackIconUrl) : null;
      }
      return fallbackThumbnail;
    }
    const homeLogoUrl = homeClubPublicId ? (logoByPublicClubId.get(homeClubPublicId) ?? null) : null;
    const awayLogoUrl = awayClubPublicId ? (logoByPublicClubId.get(awayClubPublicId) ?? null) : null;

    const game = {
      gameId: event.params.gameId,
      homeTeamName: afterData.homeTeamName as string,
      awayTeamName: afterData.awayTeamName as string,
      homeClubPublicId,
      awayClubPublicId,
      homeClubLogoUrl: homeLogoUrl ?? fallbackIconUrl,
      awayClubLogoUrl: awayLogoUrl ?? fallbackIconUrl,
      homeClubLogoThumbnail: homeClubPublicId
        ? (thumbnailByPublicClubId.get(homeClubPublicId) ?? (await resolveFallbackThumbnail()))
        : await resolveFallbackThumbnail(),
      awayClubLogoThumbnail: awayClubPublicId
        ? (thumbnailByPublicClubId.get(awayClubPublicId) ?? (await resolveFallbackThumbnail()))
        : await resolveFallbackThumbnail(),
      publicClubId,
      clubName: (clubData?.name as string | undefined) ?? "",
      scoreHome: (afterData.scoreHome as number) ?? 0,
      scoreAway: (afterData.scoreAway as number) ?? 0,
      status: afterData.status as string,
      period: (afterData.period as string | null | undefined) ?? null,
      lastEventType: (afterData.lastEventType as string | null | undefined) ?? null,
    };

    const wasLive = LIVE_STATUSES.has(beforeData?.status);
    const isLive = LIVE_STATUSES.has(game.status);
    const isEnded = ENDED_STATUSES.has(game.status);
    if (!((isLive && !wasLive) || (isLive && wasLive) || (isEnded && wasLive))) return;

    // Union of every device following *either* side, deduplicated by device
    // doc id. A device following both teams in a head-to-head match (not a
    // rare case in testing, apparently) would otherwise show up in both
    // teams' `devicesFollowing` results and get pushed to twice — two
    // separate Live Activities for the same game.
    const deviceById = new Map<string, DeviceFollow>();
    for (const publicTeamId of publicTeamIds) {
      for (const device of await devicesFollowing(publicTeamId)) {
        deviceById.set(device.id, device);
      }
    }
    const devices = Array.from(deviceById.values());

    if (isLive && !wasLive) {
      // "Live Activity immer starten" — same exception-list check for both
      // platforms; neither iOS' ActivityKit push-to-start nor Android's FCM
      // start push does any filtering of its own, so this is the only place
      // that opt-out is ever enforced.
      const devicesForLiveActivityStart = devices.filter((d) => wantsLiveActivityStart(d, publicTeamIds));
      await notifyGameStarted(game, devicesForLiveActivityStart);
      await notifyAndroidGameStarted(game, devicesForLiveActivityStart);
    } else if (isLive && wasLive) {
      await notifyGameUpdated(game, devices);
      await notifyAndroidGameUpdated(game, devices);
    } else if (isEnded && wasLive) {
      await notifyGameEnded(game, devices);
      await notifyAndroidGameEnded(game, devices);
    }
  }
);
