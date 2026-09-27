import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { fetchPublicDoc } from "@/lib/firestoreRest";
import { routing } from "@/i18n/routing";
import { PublicTeamPageClient } from "./PublicTeamPageClient";

type Params = Promise<{ locale: string; publicTeamId: string }>;

function localizedUrl(locale: string, path: string): string {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  return `https://liveclub.app${prefix}${path}`;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, publicTeamId } = await params;
  const team = await fetchPublicDoc("publicTeams", publicTeamId);
  if (!team) return {};

  const t = await getTranslations({ locale, namespace: "publicTeam" });
  const name = team.name as string;
  const clubName = team.clubName as string;
  const title = `${name} (${clubName}) – LiveClub`;
  const description = t("metaDescription", { name, clubName });
  const url = localizedUrl(locale, `/team/${publicTeamId}`);
  const logoUrl = team.clubLogoUrl as string | null;
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = localizedUrl(l, `/team/${publicTeamId}`);

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

// Same reasoning as src/app/[publicClubId]/page.tsx — see that file, incl.
// the SportsTeam structured data below (2026-09-27 SEO pass).
export default async function PublicTeamPage({ params }: { params: Params }) {
  const { locale, publicTeamId } = await params;
  const team = await fetchPublicDoc("publicTeams", publicTeamId);
  if (!team) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: team.name as string,
    sport: team.sport as string | undefined,
    memberOf: (team.clubName as string | undefined)
      ? { "@type": "SportsOrganization", name: team.clubName as string }
      : undefined,
    url: localizedUrl(locale, `/team/${publicTeamId}`),
    logo: (team.clubLogoUrl as string | null) ?? undefined,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PublicTeamPageClient publicTeamId={publicTeamId} />
    </>
  );
}
