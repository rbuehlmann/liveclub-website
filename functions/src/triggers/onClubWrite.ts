import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { db } from "../firebaseAdmin";
import { fetchLogoThumbnail } from "../lib/logoThumbnail";

// createClub.ts writes the initial publicClubs/{publicClubId} mirror once at
// creation time, but nothing kept it in sync afterwards — a clubAdmin
// renaming their club or changing the logo would only ever update the
// private clubs/{clubId} doc. This mirrors every subsequent write too.
export const onClubWrite = onDocumentWritten("clubs/{clubId}", async (event) => {
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
});
