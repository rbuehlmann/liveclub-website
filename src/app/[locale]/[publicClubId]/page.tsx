import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { fetchPublicDoc } from "@/lib/firestoreRest";
import { routing } from "@/i18n/routing";
import { PublicClubPageClient } from "./PublicClubPageClient";

type Params = Promise<{ locale: string; publicClubId: string }>;

// "as-needed": only a non-default locale gets a URL prefix (see routing.ts).
function localizedUrl(locale: string, path: string): string {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  return `https://liveclub.app${prefix}${path}`;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, publicClubId } = await params;
  const club = await fetchPublicDoc("publicClubs", publicClubId);
  if (!club) return {};

  const t = await getTranslations({ locale, namespace: "publicClub" });
  const name = club.name as string;
  const title = `${name} – LiveClub`;
  const description = t("metaDescription", { name });
  const url = localizedUrl(locale, `/${publicClubId}`);
  const logoUrl = club.logoUrl as string | null;
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = localizedUrl(l, `/${publicClubId}`);

  return {
    title,
    description,
    alternates: { canonical: url, languages },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: logoUrl ? [{ url: logoUrl }] : undefined,
    },
    twitter: { card: "summary", title, description },
  };
}

// Server Component wrapper around the actual (client-rendered, live-updating)
// page — needed for two things a "use client" page can never provide on its
// own: a real HTTP 404 for an unknown clubId (see the 2026-08-22 Universal
// Links work — iOS/Android/crawlers all need this, not just a nicer-looking
// 200), and per-club SEO metadata above. The live scoreboard itself is
// unchanged, just moved into PublicClubPageClient.
export default async function PublicClubPage({ params }: { params: Params }) {
  const { locale, publicClubId } = await params;
  const club = await fetchPublicDoc("publicClubs", publicClubId);
  if (!club) notFound();

  // SportsTeam structured data — only fields actually on the club doc, no
  // invented ratings/addresses (2026-09-27 SEO pass).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: club.name as string,
    sport: club.sport as string | undefined,
    url: localizedUrl(locale, `/${publicClubId}`),
    logo: (club.logoUrl as string | null) ?? undefined,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PublicClubPageClient publicClubId={publicClubId} />
    </>
  );
}
