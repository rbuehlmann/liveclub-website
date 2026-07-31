import Link from "next/link";
import { Button } from "@/components/ui/Button";

// Shared top bar for every public-facing page (homepage/search, login,
// register) so LiveClub branding and a way back to "Anmelden" are always
// present — not used on /dashboard/* or /admin/* (their own layouts already
// carry a club/platform-specific header) nor on /embed/* (runs inside a
// third-party page and must stay unbranded).
export function PublicHeader() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
        <Link href="/" className="font-teko text-3xl font-bold text-gray-900">
          LiveClub
        </Link>
        <Link href="/login">
          <Button variant="secondary">Anmelden</Button>
        </Link>
      </div>
    </header>
  );
}
