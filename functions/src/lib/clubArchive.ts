import { getStorage } from "firebase-admin/storage";
import { db, app } from "../firebaseAdmin";

// Not a backup/restore feature — deliberately never read back into the app
// (see the 2026-08-22 "Sicherheits-Archiv" design). Pure evidence retention
// for LiveClub's own protection if a club abuses the platform and then
// deletes itself (self-service delete is available to any clubAdmin) to
// dodge accountability. Lives under its own prefix so a Storage bucket
// lifecycle rule (configured once, out-of-band — see scratchpad script from
// the 2026-08-22 session, not part of the deployed app) can auto-expire
// entries after 30 days without a custom cron job.
const ARCHIVE_PREFIX = "archives";

/**
 * Gathers everything about a club — the same data adminDeleteClub.ts is
 * about to permanently remove — and uploads it as a single JSON snapshot to
 * Storage, *before* any deletion happens. Also used standalone (no
 * deletion) by adminCreateClubArchive.ts for on-demand/testing snapshots.
 */
export async function buildAndUploadClubArchive(
  clubId: string
): Promise<{ path: string; sizeBytes: number }> {
  const clubRef = db.collection("clubs").doc(clubId);
  const clubSnap = await clubRef.get();
  if (!clubSnap.exists) {
    throw new Error(`Club ${clubId} not found`);
  }
  const club = clubSnap.data()!;

  const [membersSnap, teamsSnap, licensesSnap, homeGamesSnap, awayGamesSnap, teamInfosSnap] =
    await Promise.all([
      clubRef.collection("members").get(),
      clubRef.collection("teams").get(),
      clubRef.collection("licenses").get(),
      db.collection("games").where("homeClubId", "==", clubId).get(),
      db.collection("games").where("awayClubId", "==", clubId).get(),
      db.collection("teamInfos").where("clubId", "==", clubId).get(),
    ]);
  const gameDocs = [...homeGamesSnap.docs, ...awayGamesSnap.docs].filter(
    (doc, i, all) => all.findIndex((d) => d.id === doc.id) === i
  );

  const games = await Promise.all(
    gameDocs.map(async (gameDoc) => {
      const [eventsSnap, historySnap] = await Promise.all([
        gameDoc.ref.collection("events").get(),
        gameDoc.ref.collection("editorHistory").get(),
      ]);
      return {
        gameId: gameDoc.id,
        data: gameDoc.data(),
        events: eventsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        editorHistory: historySnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      };
    })
  );

  const teamInfos = await Promise.all(
    teamInfosSnap.docs.map(async (infoDoc) => {
      const pushLogSnap = await infoDoc.ref.collection("pushLog").get();
      return {
        infoId: infoDoc.id,
        data: infoDoc.data(),
        pushLog: pushLogSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      };
    })
  );

  const archive = {
    archivedAt: new Date().toISOString(),
    clubId,
    club,
    members: membersSnap.docs.map((d) => ({ uid: d.id, ...d.data() })),
    teams: teamsSnap.docs.map((d) => ({ teamId: d.id, ...d.data() })),
    licenses: licensesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    games,
    teamInfos,
  };

  const json = JSON.stringify(archive, jsonSafeReplacer, 2);
  const fileName = `${ARCHIVE_PREFIX}/${clubId}-${Date.now()}.json`;
  const file = getStorage(app).bucket().file(fileName);
  await file.save(json, { contentType: "application/json" });

  return { path: fileName, sizeBytes: Buffer.byteLength(json) };
}

// Firestore Timestamps don't serialize to anything readable via plain
// JSON.stringify (they'd become an empty object) — convert to ISO strings.
function jsonSafeReplacer(_key: string, value: unknown): unknown {
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return value;
}

/** A signed, time-limited download URL for a previously-created archive. */
export async function getArchiveDownloadUrl(path: string, expiresInMs: number): Promise<string> {
  const file = getStorage(app).bucket().file(path);
  const [url] = await file.getSignedUrl({ action: "read", expires: Date.now() + expiresInMs });
  return url;
}
