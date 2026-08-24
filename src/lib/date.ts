export function daysRemaining(isoDate: string | null | undefined): number | null {
  if (!isoDate) return null;
  const diffMs = new Date(isoDate).getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

// "locale" here means the app's DE/EN toggle (AppLocaleProvider), not a
// full Intl locale tag — mapped to a concrete tag internally so callers
// don't need to know the difference.
function toIntlLocale(locale: "de" | "en" = "de"): string {
  return locale === "en" ? "en-GB" : "de-CH";
}

export function formatDateDe(isoDate: string | null | undefined, locale: "de" | "en" = "de"): string {
  if (!isoDate) return "–";
  return new Date(isoDate).toLocaleDateString(toIntlLocale(locale), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatDateTimeDe(isoDate: string | null | undefined, locale: "de" | "en" = "de"): string {
  if (!isoDate) return "–";
  return new Date(isoDate).toLocaleString(toIntlLocale(locale), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
