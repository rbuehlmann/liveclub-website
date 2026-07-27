export function daysRemaining(isoDate: string | null | undefined): number | null {
  if (!isoDate) return null;
  const diffMs = new Date(isoDate).getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function formatDateDe(isoDate: string | null | undefined): string {
  if (!isoDate) return "–";
  return new Date(isoDate).toLocaleDateString("de-CH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatDateTimeDe(isoDate: string | null | undefined): string {
  if (!isoDate) return "–";
  return new Date(isoDate).toLocaleString("de-CH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
