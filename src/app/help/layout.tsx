import Link from "next/link";
import type { Metadata } from "next";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { PublicFooter } from "@/components/layout/PublicFooter";

export const metadata: Metadata = {
  title: { default: "LiveClub Docs", template: "%s – LiveClub Docs" },
  description: "Dokumentation und Anleitungen für LiveClub — Vereine, Spiele, Redaktoren, Apps.",
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-brand-white dark:bg-brand-black">
      <header className="sticky top-0 z-20 border-b border-gray-100 bg-brand-white/80 backdrop-blur dark:border-white/10 dark:bg-brand-black/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/help" className="font-teko text-2xl font-bold text-gray-900 dark:text-white">
            LiveClub <span className="text-brand-red">Docs</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-gray-500 hover:text-brand-red dark:text-gray-400">
              Zurück zu liveclub.app
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">{children}</main>
      <PublicFooter />
    </div>
  );
}
