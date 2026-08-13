import { Firestore } from "firebase-admin/firestore";
import { iso3166NumericForCountry } from "./iso3166";

const MIN_ID = 100000;
const MAX_ID = 999999;
const MAX_ATTEMPTS = 10;

function randomSixDigits(): string {
  return String(Math.floor(Math.random() * (MAX_ID - MIN_ID + 1)) + MIN_ID);
}

/**
 * Generates a public club id in `<ISO3166-numeric>-<6 digits>` form (e.g.
 * "756-234567" for a Swiss club) — the country prefix makes the id
 * self-describing and rules out cross-country collisions by construction.
 * Guaranteed unique against publicClubs/{id}.
 */
export async function generateUniquePublicClubId(db: Firestore, country: string): Promise<string> {
  const countryCode = iso3166NumericForCountry(country);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = `${countryCode}-${randomSixDigits()}`;
    const existing = await db.collection("publicClubs").doc(candidate).get();
    if (!existing.exists) {
      return candidate;
    }
  }
  throw new Error("Could not generate a unique public club id after several attempts.");
}
