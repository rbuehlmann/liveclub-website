import { HelpCategory } from "./types";

// Order here is the display order everywhere (homepage grid, sidebar).
export const HELP_CATEGORIES: HelpCategory[] = [
  { slug: "erste-schritte", icon: "🚀", label: "Erste Schritte" },
  { slug: "spiele", icon: "⚽", label: "Spiele" },
  { slug: "vereine", icon: "👥", label: "Vereine" },
  { slug: "redaktoren", icon: "🛡", label: "Redaktoren" },
  { slug: "apps", icon: "📱", label: "Apps" },
  { slug: "push", icon: "🔔", label: "Push" },
  { slug: "abo", icon: "💳", label: "Abonnement" },
  { slug: "einstellungen", icon: "⚙", label: "Einstellungen" },
  { slug: "fehlerbehebung", icon: "❓", label: "Fehlerbehebung" },
  { slug: "neuigkeiten", icon: "📣", label: "Neuigkeiten" },
];

export function getCategory(slug: string): HelpCategory | undefined {
  return HELP_CATEGORIES.find((c) => c.slug === slug);
}
