import * as http2 from "http2";
import jwt from "jsonwebtoken";
import { apnsAuthKey, apnsEnvironment, apnsKeyId, apnsTeamId } from "./secrets";

// Regular visible push notifications (Team-Infos) — deliberately a sibling
// of apns.ts rather than an extension of it: that file is 100%
// Live-Activity-specific (apns-push-type "liveactivity", topic
// "<bundle-id>.push-type.liveactivity", a content-state/attributes
// payload). A plain alert notification needs a different push type, a
// different topic (no ".push-type.liveactivity" suffix), and the standard
// {aps:{alert,sound}} payload shape — different enough that bolting it
// onto the Live Activity file would just confuse the two. Provider-token
// signing is duplicated (not imported) for the same reason: this file
// should never need to change in lockstep with the Live Activity one.
const BUNDLE_ID = "dev.oryno.liveclub";

function apnsHost(): string {
  return apnsEnvironment.value() === "production"
    ? "api.push.apple.com"
    : "api.sandbox.push.apple.com";
}

let cachedToken: { value: string; issuedAt: number } | null = null;

function providerToken(): string {
  if (cachedToken && Date.now() - cachedToken.issuedAt < 50 * 60 * 1000) {
    return cachedToken.value;
  }
  const value = jwt.sign({}, apnsAuthKey.value(), {
    algorithm: "ES256",
    issuer: apnsTeamId.value(),
    keyid: apnsKeyId.value(),
    expiresIn: "55m",
  });
  cachedToken = { value, issuedAt: Date.now() };
  return value;
}

/**
 * Sends one regular (visible) push notification to a device's standard
 * APNs token — registered via UNUserNotificationCenter, distinct from the
 * ActivityKit push-to-start/update tokens in deviceFollows.
 * pushToStartToken/activityUpdateTokens. Used for Team-Info pushes; see
 * lib/teamInfoPush.ts.
 */
export async function sendAlertPush(
  deviceToken: string,
  notification: { title: string; body: string }
): Promise<void> {
  const body = JSON.stringify({
    aps: {
      alert: { title: notification.title, body: notification.body },
      sound: "default",
    },
  });

  await new Promise<void>((resolve, reject) => {
    const client = http2.connect(`https://${apnsHost()}`);
    client.on("error", reject);

    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${deviceToken}`,
      authorization: `bearer ${providerToken()}`,
      "apns-push-type": "alert",
      "apns-topic": BUNDLE_ID,
      "apns-priority": "10",
      "content-type": "application/json",
    });

    let status = 0;
    let responseBody = "";
    req.on("response", (headers) => {
      status = Number(headers[":status"]);
    });
    req.setEncoding("utf8");
    req.on("data", (chunk) => (responseBody += chunk));
    req.on("end", () => {
      client.close();
      if (status >= 200 && status < 300) {
        resolve();
      } else {
        reject(new Error(`APNs alert push failed (${status}): ${responseBody}`));
      }
    });
    req.on("error", reject);

    req.write(body);
    req.end();
  });
}
