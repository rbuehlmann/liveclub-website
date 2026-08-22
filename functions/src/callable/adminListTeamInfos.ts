import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../firebaseAdmin";

interface AdminListTeamInfosRequest {
  teamId?: string;
  teamNameQuery?: string;
}

const RECENT_BATCH_SIZE = 300;
const RESULT_LIMIT = 100;

/**
 * Platform-admin-only search for the moderation panel. Two lookup modes:
 * an exact teamId match (indexed, cheap, finds everything for that team
 * regardless of age), or a free-text team-name search — Firestore has no
 * substring search, so this pulls the most recent RECENT_BATCH_SIZE docs
 * and filters in memory. That means a name search can miss a very old
 * match once a team has posted more than RECENT_BATCH_SIZE times — fine
 * for an early-stage admin tool, not something to build real search
 * infrastructure for yet.
 */
export const adminListTeamInfos = onCall<AdminListTeamInfosRequest>(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");
  }
  if (request.auth.token.platformAdmin !== true) {
    throw new HttpsError("permission-denied", "Nur für Plattform-Administratoren.");
  }

  const { teamId, teamNameQuery } = request.data;

  let query = db.collection("teamInfos").orderBy("createdAt", "desc").limit(RECENT_BATCH_SIZE);
  if (typeof teamId === "string" && teamId.trim()) {
    query = db
      .collection("teamInfos")
      .where("teamId", "==", teamId.trim())
      .orderBy("createdAt", "desc")
      .limit(RESULT_LIMIT);
  }

  const snap = await query.get();
  let docs = snap.docs;

  const nameQuery = teamNameQuery?.trim().toLowerCase();
  if (nameQuery) {
    docs = docs.filter((d) => {
      const data = d.data();
      return (
        (data.teamName as string | undefined)?.toLowerCase().includes(nameQuery) ||
        (data.clubName as string | undefined)?.toLowerCase().includes(nameQuery)
      );
    });
  }

  const infos = docs.slice(0, RESULT_LIMIT).map((d) => {
    const data = d.data();
    return {
      infoId: d.id,
      teamId: data.teamId ?? null,
      teamName: data.teamName ?? null,
      clubName: data.clubName ?? null,
      title: data.title ?? null,
      text: data.text ?? null,
      createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
      createdByUid: data.createdByUid ?? null,
      hidden: data.hidden ?? false,
      hiddenAt: data.hiddenAt?.toDate?.().toISOString() ?? null,
      hiddenByRole: data.hiddenByRole ?? null,
    };
  });

  return { infos };
});
