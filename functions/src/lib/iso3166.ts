// ISO 3166-1 numeric country codes for the fixed country list this app
// offers at registration (src/app/onboarding/create-club/page.tsx's
// COUNTRIES). Public club/team ids are prefixed with this code (e.g.
// "756-234567" for a Swiss club) so an id alone tells you the country
// without a lookup, and two clubs in different countries can never collide.
const ISO3166_NUMERIC_BY_COUNTRY: Record<string, string> = {
  Schweiz: "756",
  Deutschland: "276",
  Österreich: "040",
  Liechtenstein: "438",
};

export function iso3166NumericForCountry(country: string): string {
  const code = ISO3166_NUMERIC_BY_COUNTRY[country];
  if (!code) {
    throw new Error(`No ISO 3166-1 numeric code configured for country "${country}".`);
  }
  return code;
}
