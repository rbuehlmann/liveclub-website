import type { MetadataRoute } from "next";
import { fetchPublicCollection } from "@/lib/firestoreRest";
import { buildClubUrl, buildTeamUrl } from "@/lib/publicRoutes";
import { routing } from "@/i18n/routing";

// Was entirely missing before (2026-09-27 SEO pass). Only ever includes
// clubs with an active license — same rule the homepage's own search
// already applies client-side (see isClubLicenseOk in [locale]/page.tsx
// and clubLicenseOk in firestore.rules) — an expired/cancelled club's
// pages degrade to "not found" for a visitor, so there's no reason to ask
// Google to crawl/index them.
function isLicenseActive(fields: Record<string, unknown>): boolean {
  if (fields.licenseStatus !== "active") return false;
  const validUntil = fields.licenseValidUntil as string | undefined;
  if (!validUntil) return true;
  return new Date(validUntil).getTime() > Date.now();
}

// "as-needed": German is unprefixed, English gets /en (see routing.ts) —
// same helper shape already used in [publicClubId]/page.tsx and
// team/[publicTeamId]/page.tsx's own generateMetadata.
function localizedUrl(locale: string, path: string): string {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  return `https://liveclub.app${prefix}${path}`;
}

function bothLocales(path: string): { url: string; alternates: { languages: Record<string, string> } } {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = localizedUrl(locale, path);
  }
  return { url: localizedUrl(routing.defaultLocale, path), alternates: { languages } };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPaths = [
    { path: "/", priority: 1, changeFrequency: "daily" as const },
    { path: "/suche", priority: 0.6, changeFrequency: "weekly" as const },
    { path: "/verein-empfehlen", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/terms-of-service", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/privacy-policy", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/impressum", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/support", priority: 0.4, changeFrequency: "monthly" as const },
  ];

  const entries: MetadataRoute.Sitemap = staticPaths.map(({ path, priority, changeFrequency }) => ({
    ...bothLocales(path),
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));

  const [clubs, teams] = await Promise.all([
    fetchPublicCollection("publicClubs"),
    fetchPublicCollection("publicTeams"),
  ]);

  const licensedClubIds = new Set(clubs.filter((c) => isLicenseActive(c.fields)).map((c) => c.id));

  for (const clubId of licensedClubIds) {
    entries.push({
      ...bothLocales(buildClubUrl(clubId)),
      changeFrequency: "daily",
      priority: 0.8,
    });
  }

  // publicTeams docs don't carry their own license fields — only the
  // parent club does (see onClubWrite.ts) — so a team's page is only
  // sitemap-worthy when its own club is licensed, same reasoning as above
  // (firestore.rules gates the team page's own read the same way, via a
  // cross-reference to the parent club).
  for (const team of teams) {
    const publicClubId = team.fields.publicClubId as string | undefined;
    if (!publicClubId || !licensedClubIds.has(publicClubId)) continue;
    entries.push({
      ...bothLocales(buildTeamUrl(team.id)),
      changeFrequency: "daily",
      priority: 0.7,
    });
  }

  return entries;
}
