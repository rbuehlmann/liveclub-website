import { getMessaging } from "firebase-admin/messaging";
import { app } from "../firebaseAdmin";
import { devicesFollowing } from "./liveActivity";

/**
 * A Team-Info push is a plain, visible notification ("FC Muri: Spiel
 * verschoben") — a fundamentally different thing from the Live Activity
 * pushes in apns.ts/fcm.ts (those carry a `data`-only ActivityKit
 * content-state payload, never a visible `notification` block, and iOS'
 * side needs a push-to-start/update token that Team-Info has no use for).
 * Kept in its own file rather than extending those so this Phase-1 (Android
 * only — see the "iOS needs a separate alert-push token" note in the
 * project plan) push never risks colliding with that in-progress work; it
 * only imports the one thing genuinely shared, `devicesFollowing`.
 *
 * iOS is intentionally not sent here yet: a Live Activity's push-to-start
 * token cannot receive a regular alert notification (different APNs push
 * type/topic entirely) — that needs the app to separately register for
 * normal push notifications first, which doesn't exist yet.
 */
export async function sendTeamInfoPush(
  publicTeamId: string,
  notification: { title: string; body: string }
): Promise<{ sent: number; failed: number }> {
  const devices = await devicesFollowing(publicTeamId);
  const tokens = devices.filter((d) => d.platform === "android" && d.fcmToken).map((d) => d.fcmToken!);
  if (tokens.length === 0) return { sent: 0, failed: 0 };

  const results = await Promise.allSettled(
    tokens.map((token) =>
      getMessaging(app).send({
        token,
        notification,
        android: { priority: "high" },
      })
    )
  );
  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed > 0) {
    console.warn(`sendTeamInfoPush: ${failed}/${results.length} push(es) failed`);
  }
  return { sent: results.length - failed, failed };
}
