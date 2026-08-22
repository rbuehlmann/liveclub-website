import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../firebaseAdmin";

interface UpdateMemberTeamsRequest {
  clubId: string;
  memberId: string;
  teamIds: string[];
}

/**
 * Lets a clubAdmin change which teams an existing reporter is assigned to —
 * firestore.rules disallows a direct client update on members/{memberId}
 * (only create-via-Cloud-Function and admin-delete are allowed there), so
 * this is the only way to change teamIds after the initial invite/accept
 * (2026-08-22 "mehr Rechte-Verwaltung" request).
 */
export const updateMemberTeams = onCall<UpdateMemberTeamsRequest>(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");
  }
  const uid = request.auth.uid;
  const { clubId, memberId, teamIds } = request.data;
  if (typeof clubId !== "string" || !clubId) {
    throw new HttpsError("invalid-argument", "clubId fehlt.");
  }
  if (typeof memberId !== "string" || !memberId) {
    throw new HttpsError("invalid-argument", "memberId fehlt.");
  }
  if (!Array.isArray(teamIds) || teamIds.some((id) => typeof id !== "string")) {
    throw new HttpsError("invalid-argument", "teamIds ungültig.");
  }

  const clubRef = db.collection("clubs").doc(clubId);
  const [callerSnap, memberSnap] = await Promise.all([
    clubRef.collection("members").doc(uid).get(),
    clubRef.collection("members").doc(memberId).get(),
  ]);
  if (callerSnap.data()?.role !== "clubAdmin") {
    throw new HttpsError("permission-denied", "Nur für Vereinsadmins.");
  }
  if (!memberSnap.exists) {
    throw new HttpsError("not-found", "Mitglied nicht gefunden.");
  }
  if (memberSnap.data()?.role !== "reporter") {
    throw new HttpsError("invalid-argument", "Nur Redaktoren haben Team-Zuweisungen.");
  }

  // Also refresh the users/{uid}.clubTeamIds denormalization (see
  // acceptInvitation.ts) — that's what the member's own dashboard actually
  // reads (useCurrentClub.ts), so skipping it would leave their team
  // dropdown/eligibility stale until they left and rejoined the club.
  await Promise.all([
    clubRef.collection("members").doc(memberId).update({ teamIds }),
    db.collection("users").doc(memberId).set({ clubTeamIds: { [clubId]: teamIds } }, { merge: true }),
  ]);
  return { ok: true };
});
