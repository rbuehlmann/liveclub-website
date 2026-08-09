import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

// Shared top bar for every public-facing page (homepage/search, login,
// register, public club/team/game pages, onboarding, invite) so LiveClub
// branding, the theme switcher, and a way back to "Anmelden" are always
// present — not used on /dashboard/* or /admin/* (their own layouts already
// carry a club/platform-specific header) nor on /embed/* (runs inside a
// third-party page and must stay unbranded).
export function PublicHeader() {
  return (
    <header className="border-b border-brand-silver/30 bg-brand-white dark:border-white/10 dark:bg-brand-black">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
        <Link href="/" className="font-teko text-3xl font-bold text-gray-900 dark:text-brand-white">
          LiveClub
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login">
            <Button>GO LIVE</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
