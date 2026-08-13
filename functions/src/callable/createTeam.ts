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
  const existingTeamsCount = (await clubRef.collection("teams").count().get()).data().count;
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
