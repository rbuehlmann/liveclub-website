import sharp from "sharp";

// Small enough that two of these plus the rest of a Live Activity push
// payload comfortably stay under APNs' ~4KB limit for the whole payload —
// see lib/liveActivity.ts. This exists specifically so a club's logo can
// ride along *inside* the Live Activity's static Attributes (sent once, at
// push-to-start) instead of being fetched separately — the Apple Watch
// mirrors a Live Activity on its own hardware and has no access to the
// iPhone app's local disk cache, so a URL alone doesn't reach it.
const THUMBNAIL_SIZE = 48;
const MAX_BASE64_LENGTH = 3000;

/**
 * Downloads a club logo and returns a small base64-encoded JPEG thumbnail,
 * or `null` if the fetch/resize fails or the result is unexpectedly large
 * (fails soft — a missing thumbnail just means the badge falls back to
 * initials, never worth failing a whole trigger over).
 */
export async function fetchLogoThumbnail(logoUrl: string): Promise<string | null> {
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    const resized = await sharp(buffer)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: "cover" })
      .jpeg({ quality: 60 })
      .toBuffer();
    const base64 = resized.toString("base64");
    return base64.length <= MAX_BASE64_LENGTH ? base64 : null;
  } catch (error) {
    console.warn(`fetchLogoThumbnail: failed for ${logoUrl}`, error);
    return null;
  }
}
