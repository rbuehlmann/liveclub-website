import { notFound } from "next/navigation";
import { fetchPublicDoc } from "@/lib/firestoreRest";

// Server-rendered favicon reflecting the admin-configured branding icon
// (settings/branding.favicon, see /admin/settings) — the client-side
// swap in BrandingProvider.tsx (a <link> tag patched in after hydration)
// is a best-effort fallback for already-open tabs, but browsers fetch the
// favicon from the *initial* HTML on first visit, before any JS runs, so
// that alone was never reliably picking up a custom favicon. This "icon"
// file convention renders straight into the first response's <head>
// instead. `favicon.ico` in this same directory stays as the static
// fallback for whenever no custom favicon is set — Next.js can't
// dynamically override favicon.ico itself, only add additional <link
// rel="icon"> entries via this convention, which browsers prefer when
// present.
//
// Reuses fetchPublicDoc (src/lib/firestoreRest.ts) rather than a raw
// fetch — settings/branding is publicly readable (firestore.rules), and
// this already handles the emulator-vs-production REST base URL switch
// (a hardcoded firestore.googleapis.com URL would 500 against the local
// emulator in dev).
export const dynamic = "force-dynamic";
export const contentType = "image/png";

export default async function Icon() {
  const branding = await fetchPublicDoc("settings", "branding");
  const faviconUrl = (branding?.favicon as string | undefined) ?? null;
  if (!faviconUrl) notFound();

  const imageRes = await fetch(faviconUrl, { cache: "no-store" });
  if (!imageRes.ok) notFound();

  const bytes = await imageRes.arrayBuffer();
  return new Response(bytes, {
    headers: {
      "content-type": imageRes.headers.get("content-type") ?? "image/png",
      // Short cache — the whole point is a re-skin should show up without
      // a deploy, so this shouldn't sit stale for long, but every request
      // re-fetching Storage would be wasteful.
      "cache-control": "public, max-age=300",
    },
  });
}
