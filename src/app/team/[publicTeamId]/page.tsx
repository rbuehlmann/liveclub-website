import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchPublicDoc } from "@/lib/firestoreRest";
import { PublicTeamPageClient } from "./PublicTeamPageClient";

type Params = Promise<{ publicTeamId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { publicTeamId } = await params;
  const team = await fetchPublicDoc("publicTeams", publicTeamId);
  if (!team) return {};

  const name = team.name as string;
  const clubName = team.clubName as string;
  const title = `${name} (${clubName}) – LiveClub`;
  const description = `Live-Spielstände und Infos zu ${name} von ${clubName} auf LiveClub.`;
  const url = `https://liveclub.app/team/${publicTeamId}`;
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
