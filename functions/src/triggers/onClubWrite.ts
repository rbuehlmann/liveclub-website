import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { db } from "../firebaseAdmin";
import { fetchLogoThumbnail } from "../lib/logoThumbnail";

// createClub.ts writes the initial publicClubs/{publicClubId} mirror once at
// creation time, but nothing kept it in sync afterwards — a clubAdmin
// renaming their club or changing the logo would only ever update the
// private clubs/{clubId} doc. This mirrors every subsequent write too.
export const onClubWrite = onDocumentWritten("clubs/{clubId}", async (event) => {
  const { clubId } = event.params;
  const after = event.data?.after;
  const afterData = after?.exists ? after.data() : null;
  if (!afterData) return;

  const publicClubId = afterData.publicClubId;
  if (!publicClubId) return;

  const logoUrl: string | null = afterData.logoUrl ?? null;
  const publicClubRef = db.collection("publicClubs").doc(publicClubId);

  // Re-fetching + re-resizing on every unrelated club field write (name,
  // license, ...) would be wasteful — only do it when the logo itself
  // actually changed since the last mirror.
  const existing = await publicClubRef.get();
  const logoChanged = existing.data()?.logoUrl !== logoUrl;
  const nameChanged = existing.data()?.name !== afterData.name;
  const logoThumbnailBase64 = logoChanged
    ? logoUrl
      ? await fetchLogoThumbnail(logoUrl)
      : null
    : (existing.data()?.logoThumbnailBase64 as string | null | undefined) ?? null;

  await publicClubRef.set(
    {
      name: afterData.name,
      sport: afterData.sport,
      country: afterData.country ?? null,
      logoUrl,
      // Small embedded JPEG thumbnail (see lib/logoThumbnail.ts) — lets the
      // Live Activity's iOS Attributes payload carry the badge image
      // itself instead of just a URL, since the Apple Watch mirror can't
      // fetch/cache from a URL the way the iPhone app can.
      logoThumbnailBase64,
      // Mirrored so firestore.rules can gate every public read (search,
      // club/team/live-game pages, embed widget) on license state without
      // an extra cross-collection lookup — the club's own data stays
      // intact either way, it just stops being publicly visible (permission
      // revocation, not deletion, matching the license model elsewhere).
      licenseStatus: afterData.currentLicenseStatus ?? null,
      licenseValidUntil: afterData.currentLicenseValidUntil ?? null,
    },
    { merge: true }
  );

  // publicTeams/{publicTeamId}.clubLogoUrl/clubName (what the iOS/Android
  // apps actually read for a followed team, see onTeamWrite.ts) are
  // denormalized copies written only when the TEAM doc itself is written —
  // so changing the club's logo/name here previously left every existing
  // team showing the old one until each team happened to get edited for an
  // unrelated reason (2026-09-01 bug report: "Bild ändert sich nicht bei
  // jedem Team"). Cascaded here instead, but only when logo/name actually
  // changed — querying by clubId (not going through clubs/{clubId}/teams)
  // so this only ever touches teams that already have a live publicTeams
  // doc, never resurrects one for an inactive/deleted team.
  if (logoChanged || nameChanged) {
    const teamsSnap = await db.collection("publicTeams").where("clubId", "==", clubId).get();
    if (!teamsSnap.empty) {
      const batch = db.batch();
      for (const teamDoc of teamsSnap.docs) {
        batch.set(teamDoc.ref, { clubLogoUrl: logoUrl, clubName: afterData.name }, { merge: true });
      }
      await batch.commit();
    }
  }
});
