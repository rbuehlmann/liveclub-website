import { onRequest } from "firebase-functions/v2/https";
import { getStorage } from "firebase-admin/storage";
import { db, app } from "../firebaseAdmin";
import { backfillLogoSecret } from "../lib/secrets";

const CACHE_CONTROL = "public, max-age=2592000";

function storagePathFromDownloadUrl(url: string): string | null {
  const match = url.match(/\/o\/([^?]+)/);
  if (!match) return null;
  return decodeURIComponent(match[1]);
}

/**
 * One-off migration, plain `onRequest` (not `onCall`) so it's triggerable
 * with a single `curl ...?secret=...` instead of needing a mocked auth
 * context — `firebase functions:shell` doesn't reliably support mocking
 * `request.auth` for v2 `onCall` functions, which made an admin-gated
 * callable version of this impractical to actually invoke by hand.
 *
 * Sets a long-lived Cache-Control on every club's existing logo object in
 * Storage. New uploads already get this at upload time
 * (dashboard/club/page.tsx, onboarding/create-club/page.tsx) — but that
 * only affects uploads made *after* that fix landed. Storage's default
 * (effectively uncached) metadata on everything uploaded before doesn't
 * change on its own, which is why every club logo from before this fix
 * keeps re-fetching over the network on every app open regardless of how
 * well the client itself caches.
 */
export const adminBackfillLogoCacheControl = onRequest(
  { secrets: [backfillLogoSecret] },
  async (req, res) => {
    if (req.query.secret !== backfillLogoSecret.value()) {
      res.status(403).send("forbidden");
      return;
    }

    const bucket = getStorage(app).bucket();
    const clubsSnap = await db.collection("clubs").get();

    let updated = 0;
    let skipped = 0;
    const failed: string[] = [];

    for (const doc of clubsSnap.docs) {
      const logoUrl = doc.data().logoUrl as string | undefined;
      if (!logoUrl) {
        skipped++;
        continue;
      }
      const path = storagePathFromDownloadUrl(logoUrl);
      if (!path) {
        skipped++;
        continue;
      }
      try {
        await bucket.file(path).setMetadata({ cacheControl: CACHE_CONTROL });
        updated++;
      } catch (err) {
        failed.push(`${doc.id}: ${String(err)}`);
      }
    }

    res.json({ updated, skipped, failed });
  }
);
