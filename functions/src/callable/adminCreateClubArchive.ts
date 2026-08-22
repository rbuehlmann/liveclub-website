import { onCall, HttpsError } from "firebase-functions/v2/https";
import { buildAndUploadClubArchive, getArchiveDownloadUrl } from "../lib/clubArchive";

/**
 * On-demand archive snapshot without deleting anything — for testing the
 * archive format during build, and removable later (see the 2026-08-22
 * "Sicherheits-Archiv" design notes). The real safety-net path is the
 * automatic snapshot inside adminDeleteClub.ts, not this.
 */
export const adminCreateClubArchive = onCall<{ clubId: string }>(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");
  }
  if (request.auth.token.platformAdmin !== true) {
    throw new HttpsError("permission-denied", "Nur für Plattform-Administratoren.");
  }
  const { clubId } = request.data;
  if (typeof clubId !== "string" || !clubId) {
    throw new HttpsError("invalid-argument", "clubId fehlt.");
  }

  const { path, sizeBytes } = await buildAndUploadClubArchive(clubId);
  const url = await getArchiveDownloadUrl(path);
  return { url, sizeBytes };
});
