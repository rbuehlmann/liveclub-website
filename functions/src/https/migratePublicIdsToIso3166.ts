import { onRequest } from "firebase-functions/v2/https";
import { db } from "../firebaseAdmin";
import { generateUniquePublicClubId } from "../lib/publicClubId";
import { generateUniquePublicTeamId } from "../lib/publicTeamId";

// Temporary, one-off migration: rewrites every existing club/team's
// publicClubId/publicTeamId from the old plain 6-digit format to the new
// "<ISO3166-numeric>-<6 digits>" / "<publicClubId>-<3-digit seq>" scheme.
// Gated by a locally-generated secret query param (short-lived, not a
// persisted Secret Manager secret) rather than Firebase Auth, matching the
// pattern used for the earlier currentLiveGameIdByTeam cleanup. Delete this
// file + its export in index.ts once the migration has run in production.
const SECRET = "mig-9f3a7c21b6e4-iso3166";

interface ClubMigrationReport {
  clubId: string;
  name: string;
  oldPublicClubId: string;
  newPublicClubId: string | null;
  skippedReason?: string;
  teams: { teamId: string; oldPublicTeamId: string | null; newPublicTeamId: string }[];
  gamesUpdated: number;
}

export const migratePublicIdsToIso3166 = onRequest(async (req, res) => {
  if (req.query.secret !== SECRET) {
    res.status(403).send("forbidden");
    return;
  }
  const dryRun = req.query.dryRun !== "false";

  const clubsSnap = await db.collection("clubs").get();
  const report: ClubMigrationReport[] = [];

  for (const clubDoc of clubsSnap.docs) {
    const clubData = clubDoc.data();
    const oldPublicClubId: string | undefined = clubData.publicClubId;
    if (!oldPublicClubId) {
      report.push({
        clubId: clubDoc.id,
        name: clubData.name ?? "",
        oldPublicClubId: "",
        newPublicClubId: null,
        skippedReason: "no publicClubId on club doc",
        teams: [],
        gamesUpdated: 0,
      });
      continue;
    }
    if (oldPublicClubId.includes("-")) {
      // Already migrated (idempotent re-run).
      continue;
    }

    let newPublicClubId: string;
    try {
      newPublicClubId = await generateUniquePublicClubId(db, clubData.country);
    } catch (err) {
      report.push({
        clubId: clubDoc.id,
        name: clubData.name ?? "",
        oldPublicClubId,
        newPublicClubId: null,
        skippedReason: (err as Error).message,
        teams: [],
        gamesUpdated: 0,
      });
      continue;
    }

    const teamsSnap = await clubDoc.ref.collection("teams").orderBy("createdAt", "asc").get();
    const teamMigrations: { teamId: string; oldPublicTeamId: string | null; newPublicTeamId: string }[] = [];
    for (let i = 0; i < teamsSnap.docs.length; i++) {
      const teamDoc = teamsSnap.docs[i];
      const newPublicTeamId = await generateUniquePublicTeamId(db, newPublicClubId, i);
      teamMigrations.push({
        teamId: teamDoc.id,
        oldPublicTeamId: teamDoc.data().publicTeamId ?? null,
        newPublicTeamId,
      });
    }

    let gamesUpdated = 0;
    if (!dryRun) {
      // clubs/{clubId} + its teams — publicClubId/publicTeamId fields.
      await clubDoc.ref.update({ publicClubId: newPublicClubId });
      for (const t of teamMigrations) {
        await clubDoc.ref.collection("teams").doc(t.teamId).update({ publicTeamId: t.newPublicTeamId });
      }

      // New publicClubs/{newId} mirror, re-derived fresh (not copied) so it
      // matches exactly what onClubWrite would produce.
      await db.collection("publicClubs").doc(newPublicClubId).set({
        clubId: clubDoc.id,
        publicClubId: newPublicClubId,
        name: clubData.name,
        sport: clubData.sport,
        country: clubData.country ?? null,
        logoUrl: clubData.logoUrl ?? null,
        licenseStatus: clubData.currentLicenseStatus ?? null,
        licenseValidUntil: clubData.currentLicenseValidUntil ?? null,
      });

      // New publicClubs/{newId}/teams/{teamId} + publicTeams/{newTeamId}.
      for (const t of teamMigrations) {
        const teamDoc = teamsSnap.docs.find((d) => d.id === t.teamId)!;
        const teamData = teamDoc.data();
        await db.collection("publicClubs").doc(newPublicClubId).collection("teams").doc(t.teamId).set({
          teamId: t.teamId,
          publicTeamId: t.newPublicTeamId,
          name: teamData.name,
          shortName: teamData.shortName,
        });
        await db.collection("publicTeams").doc(t.newPublicTeamId).set({
          publicTeamId: t.newPublicTeamId,
          teamId: t.teamId,
          clubId: clubDoc.id,
          publicClubId: newPublicClubId,
          clubName: clubData.name,
          clubLogoUrl: clubData.logoUrl ?? null,
          name: teamData.name,
          shortName: teamData.shortName,
          sport: teamData.sport ?? clubData.sport ?? null,
        });
        if (t.oldPublicTeamId) {
          await db.collection("publicTeams").doc(t.oldPublicTeamId).delete();
        }
      }

      // Old publicClubs/{oldId} doc + its teams subcollection.
      await db.recursiveDelete(db.collection("publicClubs").doc(oldPublicClubId));
    }

    // publicGames: queried by the unchanged private clubId, then any field
    // still pointing at the old public id gets rewritten. Counted even in
    // dry-run mode (just not written) so the report is accurate either way.
    const gamesSnap = await db.collection("publicGames").where("clubId", "==", clubDoc.id).get();
    for (const gameDoc of gamesSnap.docs) {
      const g = gameDoc.data();
      const updates: Record<string, string> = {};
      if (g.publicClubId === oldPublicClubId) updates.publicClubId = newPublicClubId;
      if (g.homeClubPublicId === oldPublicClubId) updates.homeClubPublicId = newPublicClubId;
      if (g.awayClubPublicId === oldPublicClubId) updates.awayClubPublicId = newPublicClubId;
      if (Object.keys(updates).length > 0) {
        if (!dryRun) await gameDoc.ref.update(updates);
        gamesUpdated++;
      }
    }

    report.push({
      clubId: clubDoc.id,
      name: clubData.name ?? "",
      oldPublicClubId,
      newPublicClubId,
      teams: teamMigrations,
      gamesUpdated,
    });
  }

  res.json({ dryRun, migratedCount: report.filter((r) => r.newPublicClubId).length, report });
});
