import type { MetadataRoute } from "next";

// Was entirely missing before (2026-09-27 SEO pass) — every route, private
// or not, was technically crawlable. Disallowed paths are account/admin
// areas (never meant to be indexed — login required to see anything real
// there anyway, this is about crawl budget and index hygiene, not access
// control), the third-party embed widget (meant to render inside someone
// else's page, not to rank on its own), and internal API routes.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // dashboard/admin/login/register/onboarding never get an /en/ prefix
      // at all (see src/proxy.ts's matcher — they're outside app/[locale]/,
      // language is a localStorage toggle there, not a URL segment), so
      // there's no separate /en/... variant of these to list.
      disallow: [
        "/dashboard",
        "/dashboard/",
        "/admin",
        "/admin/",
        "/login",
        "/register",
        "/onboarding",
        "/onboarding/",
        "/invite/",
        "/embed/",
        "/api/",
      ],
    },
    sitemap: "https://liveclub.app/sitemap.xml",
  };
}
