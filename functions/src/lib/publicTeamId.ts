import { Firestore } from "firebase-admin/firestore";

const MAX_ATTEMPTS = 20;

/**
 * Generates a public team id as `<publicClubId>-<3-digit sequence>` (e.g.
 * "756-234567-003" for a club's 3rd team) — nested under the club's own id
 * so a glance at the id tells you country + club + which team, per the
 * ISO3166-234567-XXX scheme. `existingTeamCount` is the club's current
 * number of teams (including inactive ones, so a deactivated team's number
 * is never reused); sequence starts at existingTeamCount + 1 and only
 * advances further if that exact id is somehow already taken.
 */
export async function generateUniquePublicTeamId(
  db: Firestore,
  publicClubId: string,
  existingTeamCount: number
): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const sequence = String(existingTeamCount + 1 + attempt).padStart(3, "0");
    const candidate = `${publicClubId}-${sequence}`;
    const existing = await db.collection("publicTeams").doc(candidate).get();
    if (!existing.exists) {
      return candidate;
    }
  }
  throw new Error("Could not generate a unique public team id after several attempts.");
}
