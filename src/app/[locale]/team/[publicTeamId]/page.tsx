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

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: logoUrl ? [{ url: logoUrl }] : undefined,
    },
  };
}

// Same reasoning as src/app/[publicClubId]/page.tsx — see that file.
export default async function PublicTeamPage({ params }: { params: Params }) {
  const { publicTeamId } = await params;
  const team = await fetchPublicDoc("publicTeams", publicTeamId);
  if (!team) notFound();

  return <PublicTeamPageClient publicTeamId={publicTeamId} />;
}
