import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin";
import { generateUniquePublicTeamId } from "../lib/publicTeamId";

interface CreateTeamRequest {
  clubId: string;
  name: string;
  shortName?: string;
}

function assertNonEmptyString(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpsError("invalid-argument", `Feld "${field}" darf nicht leer sein.`);
  }
}

/**
 * Creates a team with a unique publicTeamId, analogous to createClub.ts —
 * done server-side so the id can be generated collision-free (the client
 * can no longer write clubs/{clubId}/teams directly, see firestore.rules).
 */
export const createTeam = onCall<CreateTeamRequest>(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");
  }
  const uid = request.auth.uid;
  const { clubId, name, shortName } = request.data;

  assertNonEmptyString(clubId, "clubId");
  assertNonEmptyString(name, "name");

  const clubRef = db.collection("clubs").doc(clubId);
  const clubSnap = await clubRef.get();
  if (!clubSnap.exists) {
    throw new HttpsError("not-found", "Verein nicht gefunden.");
  }

  const memberSnap = await clubRef.collection("members").doc(uid).get();
  if (memberSnap.data()?.role !== "clubAdmin") {
    throw new HttpsError("permission-denied", "Nur Vereinsadmins dürfen Mannschaften erstellen.");
  }

  const clubPublicClubId = clubSnap.data()?.publicClubId;
  if (typeof clubPublicClubId !== "string") {
    throw new HttpsError("failed-precondition", "Verein hat keine öffentliche ID.");
  }
  const existingTeamsSnap = await clubRef.collection("teams").get();
  const existingTeamsCount = existingTeamsSnap.size;

  // null = unlimited. Missing field (pre-tier-system licenses) also means
  // unlimited — never retroactively blocks a club that predates this limit.
  // Archived teams (2026-09-01 downgrade flow, see onStripeWebhook.ts) don't
  // count against the cap — they were deliberately dropped to fit a lower
  // tier, so the freed-up slot must actually be usable — but a plain
  // manual deactivation still does, same as before.
  const activeTeamsCount = existingTeamsSnap.docs.filter((d) => d.data().archived !== true).length;
  const maxTeams = clubSnap.data()?.currentMaxTeams as number | null | undefined;
  if (typeof maxTeams === "number" && activeTeamsCount >= maxTeams) {
    throw new HttpsError(
      "resource-exhausted",
      `Limit von ${maxTeams} Mannschaften erreicht. Für mehr Mannschaften ist ein Abo der Stufe "15 Teams" oder "99 Teams" nötig.`
    );
  }

  // Deliberately the *total* count (including archived/inactive), not
  // activeTeamsCount — a deactivated or archived team's number must never
  // be reused (see publicTeamId.ts's own comment); it also has its own
  // collision-retry loop as a second safety net regardless.
  const publicTeamId = await generateUniquePublicTeamId(db, clubPublicClubId, existingTeamsCount);
  const teamRef = clubRef.collection("teams").doc();

  await teamRef.set({
    teamId: teamRef.id,
    clubId,
    publicTeamId,
    name: name.trim(),
    shortName: shortName?.trim() || name.trim().slice(0, 3).toUpperCase(),
    sport: clubSnap.data()?.sport ?? "Fussball",
    active: true,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { teamId: teamRef.id, publicTeamId };
});
