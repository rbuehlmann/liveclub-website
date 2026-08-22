import { getMessaging } from "firebase-admin/messaging";
import { app } from "../firebaseAdmin";
import { devicesFollowing, DeviceFollow } from "./liveActivity";
import { sendAlertPush } from "./apnsAlert";

// deviceFollows.apnsAlertToken (a device's standard APNs token, registered
// for regular push notifications) isn't on the shared DeviceFollow
// interface in liveActivity.ts — that type only covers the Live-Activity
// tokens, and this file avoids touching that in-progress file. The field
// is still present at runtime (devicesFollowing() spreads the raw
// Firestore doc), just not declared there — read it via this local
// extension instead of widening someone else's shared type.
type DeviceFollowWithAlertToken = DeviceFollow & { apnsAlertToken?: string };

/**
 * A Team-Info push is a plain, visible notification ("FC Muri: Spiel
 * verschoben") — a fundamentally different thing from the Live Activity
 * pushes in apns.ts/fcm.ts (those carry a `data`-only ActivityKit
 * content-state payload, never a visible `notification` block). Kept in
 * its own file rather than extending those so this never risks colliding
 * with that in-progress work; it only imports what's genuinely shared,
 * `devicesFollowing`.
 */
export async function sendTeamInfoPush(
  publicTeamId: string,
  notification: { title: string; body: string }
): Promise<{ sent: number; failed: number }> {
  const devices = (await devicesFollowing(publicTeamId)) as DeviceFollowWithAlertToken[];
  const androidTokens = devices.filter((d) => d.platform === "android" && d.fcmToken).map((d) => d.fcmToken!);
  const iosTokens = devices.filter((d) => d.platform === "ios" && d.apnsAlertToken).map((d) => d.apnsAlertToken!);
  if (androidTokens.length === 0 && iosTokens.length === 0) return { sent: 0, failed: 0 };

  const results = await Promise.allSettled([
    ...androidTokens.map((token) =>
      getMessaging(app).send({
        token,
        notification,
        android: { priority: "high" },
      })
    ),
    ...iosTokens.map((token) => sendAlertPush(token, notification)),
  ]);
  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed > 0) {
    console.warn(`sendTeamInfoPush: ${failed}/${results.length} push(es) failed`);
  }
  return { sent: results.length - failed, failed };
}
