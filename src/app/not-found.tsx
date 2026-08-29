import Link from "next/link";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

// Renders for any unmatched route AND for any notFound() call anywhere in
// the app (see src/app/[publicClubId]/page.tsx, src/app/team/[publicTeamId]/
// page.tsx) — genuinely returns HTTP 404, not a 200 with a "not found" label
// (2026-08-22 Universal Links work needed a real one for crawlers/App Links).
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-brand-white dark:bg-brand-black">
      <PublicHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="font-teko text-4xl font-bold text-gray-900 dark:text-white">Nicht gefunden</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Diese Seite gibt es nicht (mehr) — vielleicht wurde der Link falsch kopiert.
        </p>
        <Link href="/" className="mt-2 text-sm text-brand-red-link hover:underline">
          Zur Startseite
        </Link>
      </main>
      <PublicFooter />
    </div>
  );
}
