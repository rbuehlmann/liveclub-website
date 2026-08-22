import { Timestamp } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin";

// Bump whenever the AGB's Team-Info clause (terms-of-service, section 5)
// changes materially — recorded on every push-send log entry (see
// createTeamInfo.ts) so it's provable which version of the rules an editor
// agreed to at send time.
export const TEAM_INFO_TERMS_VERSION = "2026-08-21";

export const TEAM_INFO_DEFAULTS = {
  teamInfosEnabled: true,
  infoPushEnabled: true,
  infosPerDay: 10,
  pushesPerDay: 3,
};

export interface TeamInfoSettings {
  teamInfosEnabled: boolean;
  infoPushEnabled: boolean;
  infosPerDay: number;
  pushesPerDay: number;
}

/**
 * Three-tier fallback, same shape as license/branding defaults elsewhere:
 * a club's own override (clubs/{clubId}.teamInfosEnabled etc., settable
 * only via adminSetTeamInfoSettings — this is how a single abusive club
 * loses Team-Info/push rights without touching anything else) wins over
 * the platform-wide default (settings/teamInfo, editable in /admin/settings
 * like branding is), which itself falls back to the hardcoded defaults
 * above if the settings doc doesn't exist yet.
 */
export async function resolveTeamInfoSettings(
  clubData: Record<string, unknown>
): Promise<TeamInfoSettings> {
  const globalSnap = await db.collection("settings").doc("teamInfo").get();
  const g = globalSnap.data() ?? {};
  function pick<K extends keyof TeamInfoSettings>(key: K): TeamInfoSettings[K] {
    const clubValue = clubData[key];
    if (clubValue !== undefined && clubValue !== null) return clubValue as TeamInfoSettings[K];
    const globalValue = g[key];
    if (globalValue !== undefined && globalValue !== null) return globalValue as TeamInfoSettings[K];
    return TEAM_INFO_DEFAULTS[key];
  }
  return {
    teamInfosEnabled: pick("teamInfosEnabled"),
    infoPushEnabled: pick("infoPushEnabled"),
    infosPerDay: pick("infosPerDay"),
    pushesPerDay: pick("pushesPerDay"),
  };
}

function startOfTodayTimestamp(): Timestamp {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Timestamp.fromDate(now);
}

// Limits are per TEAM, not per editor — a team with three reporters still
// shares one daily budget between them (see createTeamInfo.ts's spec).
// count() aggregation queries so this never needs to load full docs just
// to count them.
export async function countTodayInfos(teamId: string): Promise<number> {
  const snap = await db
    .collection("teamInfos")
    .where("teamId", "==", teamId)
    .where("createdAt", ">=", startOfTodayTimestamp())
    .count()
    .get();
  return snap.data().count;
}

export async function countTodayPushes(teamId: string): Promise<number> {
  const snap = await db
    .collection("teamInfos")
    .where("teamId", "==", teamId)
    .where("pushSentAt", ">=", startOfTodayTimestamp())
    .count()
    .get();
  return snap.data().count;
}
