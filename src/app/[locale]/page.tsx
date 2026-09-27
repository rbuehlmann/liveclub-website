import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import HomeClient from "./HomeClient";

type Params = Promise<{ locale: string }>;

// Same helper shape as [publicClubId]/page.tsx and team/[publicTeamId]/
// page.tsx's own generateMetadata — "as-needed": German is unprefixed,
// English gets /en (see routing.ts).
function localizedUrl(locale: string, path: string): string {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  return `https://liveclub.app${prefix}${path}`;
}

// The homepage (HomeClient) is a Client Component (needs live Firestore
// listeners for the search/stats), which can never export its own
// metadata — before this file existed it silently inherited the root
// layout's single, generic "LiveClub" title for every locale (2026-09-27
// SEO pass). Same server-wrapper pattern already used for the club/team
// pages: this file owns metadata + structured data, HomeClient owns
// everything visual/interactive, unchanged.
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  const title = t("metaTitle");
  const description = t("metaDescription");
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = localizedUrl(l, "/");

  return {
    title,
    description,
    alternates: { canonical: localizedUrl(locale, "/"), languages },
    openGraph: {
      title,
      description,
      url: localizedUrl(locale, "/"),
      type: "website",
      siteName: "LiveClub",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default function HomePage() {
  return (
    <>
      {/* Organization + WebSite structured data — only fields that are
          actually true (no invented ratings/reviews/social profiles, per
          the 2026-09-27 SEO brief's explicit rule against that). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                name: "LiveClub",
                url: "https://liveclub.app",
                logo: "https://liveclub.app/logo/liveclub-wordmark.svg",
              },
              {
                "@type": "WebSite",
                name: "LiveClub",
                url: "https://liveclub.app",
              },
            ],
          }),
        }}
      />
      <HomeClient />
    </>
  );
}
