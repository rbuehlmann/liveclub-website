import { Firestore } from "firebase-admin/firestore";

const MIN_ID = 100000;
const MAX_ID = 999999;
const MAX_ATTEMPTS = 10;

function randomSixDigits(): string {
  return String(Math.floor(Math.random() * (MAX_ID - MIN_ID + 1)) + MIN_ID);
}

/** Generates a short public team number, guaranteed unique against publicTeams/{id}. */
export async function generateUniquePublicTeamId(db: Firestore): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = randomSixDigits();
    const existing = await db.collection("publicTeams").doc(candidate).get();
    if (!existing.exists) {
      return candidate;
    }
  }
  throw new Error("Could not generate a unique public team id after several attempts.");
}
