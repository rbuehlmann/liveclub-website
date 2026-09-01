// Anchored time-of-day scheduling for the LiveDemo club (2026-09-01
// redesign) — Post/Push/Live-Spiel each get their own count-per-day
// (6/12/24/48 only) and wall-clock start time, e.g. "Post 9:00, Spiel 9:15,
// Push 9:30", so the admin has real control over when things happen instead
// of a drifting "every N hours since whenever it last fired" cadence. All
// four allowed counts divide 1440 (minutes/day) evenly, so the same start
// time + interval repeats identically every day with no drift.

export const ALLOWED_DAILY_COUNTS = [6, 12, 24, 48] as const;
export type DailyCount = (typeof ALLOWED_DAILY_COUNTS)[number];

export function intervalMinutesForCount(count: number): number {
  return (24 * 60) / count;
}

// Wall-clock offset (in minutes) Europe/Zurich currently has from UTC — +60
// (CET) or +120 (CEST) — derived via Intl rather than pulling in a timezone
// library nothing else in this codebase needs.
function zurichOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Zurich",
    timeZoneName: "shortOffset",
  }).formatToParts(at);
  const raw = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+1";
  const match = raw.match(/GMT([+-]\d+)/);
  return match ? Number(match[1]) * 60 : 60;
}

function zurichDateParts(at: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/**
 * The most recent scheduled occurrence (at or before `now`) of a slot
 * anchored to `startTime` ("HH:MM", Europe/Zurich wall clock) repeating
 * every `intervalMinutes`. Self-correcting the same way the old
 * elapsed-time gating was: a missed tick (function outage, cold start)
 * just means the next tick sees the same "most recent" slot and fires
 * once, rather than backfilling every slot that was missed.
 */
export function mostRecentSlot(now: Date, startTime: string, intervalMinutes: number): Date {
  const [hh, mm] = startTime.split(":").map(Number);
  const { year, month, day } = zurichDateParts(now);
  const offsetMinutes = zurichOffsetMinutes(now);
  const todayAnchorMs = Date.UTC(year, month - 1, day, hh, mm) - offsetMinutes * 60000;
  const intervalMs = intervalMinutes * 60000;
  const stepsSinceAnchor = Math.floor((now.getTime() - todayAnchorMs) / intervalMs);
  return new Date(todayAnchorMs + stepsSinceAnchor * intervalMs);
}
