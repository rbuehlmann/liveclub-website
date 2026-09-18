import { NextRequest, NextResponse } from "next/server";

// Firebase Storage doesn't send Access-Control-Allow-Origin by default (no
// bucket CORS config exists for this project, and setting one needs gsutil/
// gcloud — not available in this deploy pipeline). Plain <img> tags don't
// care, but src/lib/embedGenerator.ts's renderBadgeToCanvas() draws images
// onto a <canvas> and then reads it back out via toDataURL() for the PNG
// export — that needs crossOrigin="anonymous" on the <img>, which in turn
// needs the *server* to send CORS headers, or the canvas is "tainted" and
// toDataURL() throws. Proxying through our own origin sidesteps the whole
// problem: the browser sees a same-origin request, no CORS header needed at
// all (see loadImage() in embedGenerator.ts, the only caller of this route).
//
// Strictly allow-listed to Firebase Storage's own host — this must never
// become a general-purpose open proxy (SSRF risk: fetching arbitrary
// attacker-supplied URLs server-side, e.g. internal/cloud-metadata
// addresses).
const ALLOWED_HOST = "firebasestorage.googleapis.com";

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("url");
  if (!target) {
    return NextResponse.json({ error: "Missing url parameter." }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: "Invalid url parameter." }, { status: 400 });
  }
  if (parsed.protocol !== "https:" || parsed.hostname !== ALLOWED_HOST) {
    return NextResponse.json({ error: "URL host not allowed." }, { status: 400 });
  }

  const upstream = await fetch(parsed.toString());
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Upstream fetch failed." }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/octet-stream",
      // Storage download URLs are already unique-per-upload (see the
      // timestamp-prefixed filenames club logo uploads use) — safe to cache
      // for a while rather than re-fetching on every flyer regeneration.
      "Cache-Control": "public, max-age=3600",
    },
  });
}
