import * as http2 from "http2";
import jwt from "jsonwebtoken";
import { apnsAuthKey, apnsEnvironment, apnsKeyId, apnsTeamId } from "./secrets";

// Matches the iOS app's bundle id (LiveClub/project.yml) — the Live
// Activity push topic is always "<bundle-id>.push-type.liveactivity",
// regardless of push event type.
const BUNDLE_ID = "dev.oryno.liveclub";
const APNS_TOPIC = `${BUNDLE_ID}.push-type.liveactivity`;

function apnsHost(): string {
  return apnsEnvironment.value() === "production"
    ? "api.push.apple.com"
    : "api.sandbox.push.apple.com";
}

// Provider tokens are valid for up to an hour; re-signing on every push
// would be wasteful, so this reuses one for 50 minutes.
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

export type LiveActivityPushEvent = "start" | "update" | "end";

export interface LiveActivityPushPayload {
  event: LiveActivityPushEvent;
  contentState: Record<string, unknown>;
  // Required for "start", ignored otherwise.
  attributesType?: string;
  attributes?: Record<string, unknown>;
  alert?: { title: string; body: string };
  // Only takes effect alongside `alert` — this (not `alert` alone) is what
  // makes the system actually play a sound/haptic for the update, the same
  // way a regular notification would. Omit both for a silent content-only
  // update (e.g. a card, half-time — nothing worth buzzing someone's pocket
  // for).
  sound?: string;
  // Unix seconds; only meaningful for "end" (how long the ended activity
  // stays visible before the system removes it).
  dismissalDate?: number;
}

/**
 * Sends one Live Activity push (start/update/end) to a single device token
 * — either a push-to-start token (for "start") or a specific running
 * activity's own update token (for "update"/"end"), both as reported
 * verbatim by ActivityKit on the client (hex-encoded `Data`).
 */
export async function sendLiveActivityPush(
  deviceToken: string,
  payload: LiveActivityPushPayload
): Promise<void> {
  const aps: Record<string, unknown> = {
    timestamp: Math.floor(Date.now() / 1000),
    event: payload.event,
    "content-state": payload.contentState,
  };
  if (payload.event === "start") {
    aps["attributes-type"] = payload.attributesType;
    aps["attributes"] = payload.attributes;
  }
  if (payload.alert) {
    aps.alert = payload.alert;
  }
  if (payload.sound) {
    aps.sound = payload.sound;
  }
  if (payload.dismissalDate) {
    aps["dismissal-date"] = payload.dismissalDate;
  }

  const body = JSON.stringify({ aps });

  await new Promise<void>((resolve, reject) => {
    const client = http2.connect(`https://${apnsHost()}`);
    client.on("error", reject);

    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${deviceToken}`,
      authorization: `bearer ${providerToken()}`,
      "apns-push-type": "liveactivity",
      "apns-topic": APNS_TOPIC,
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
        reject(new Error(`APNs push failed (${status}): ${responseBody}`));
      }
    });
    req.on("error", reject);

    req.write(body);
    req.end();
  });
}
