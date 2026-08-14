import { LicenseTier } from "./types";

export interface LicenseTierInfo {
  id: LicenseTier;
  label: string;
  maxTeams: number | null;
  monthlyPrice: string;
  yearlyPrice: string;
}

// Display metadata for the 3 team-count tiers, shared by the dashboard buy
// UI and the admin tier selector. Keep prices in sync with the actual
// Stripe Price objects (functions/.env.<project-id>) — this is display
// text only, the real amount is whatever Stripe charges.
export const LICENSE_TIERS: LicenseTierInfo[] = [
  { id: "team5", label: "Bis 5 Teams", maxTeams: 5, monthlyPrice: "CHF 9.–", yearlyPrice: "CHF 99.–" },
  { id: "team15", label: "Bis 15 Teams", maxTeams: 15, monthlyPrice: "CHF 19.–", yearlyPrice: "CHF 199.–" },
  { id: "unlimited", label: "Unlimited", maxTeams: null, monthlyPrice: "CHF 29.–", yearlyPrice: "CHF 299.–" },
];

export function tierLabel(tier: LicenseTier | null | undefined): string {
  return LICENSE_TIERS.find((t) => t.id === tier)?.label ?? "–";
}
