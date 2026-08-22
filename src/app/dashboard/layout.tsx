"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/auth/AuthProvider";
import { useCurrentClub } from "@/lib/hooks/useCurrentClub";
import { ClubContext } from "@/components/club/ClubContext";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { logout } from "@/lib/firebase/authApi";

const CLUB_ADMIN_LINKS = [
  { href: "/dashboard", labelKey: "overview" },
  { href: "/dashboard/club", labelKey: "club" },
  { href: "/dashboard/teams", labelKey: "teams" },
  { href: "/dashboard/games", labelKey: "games" },
  { href: "/dashboard/team-infos", labelKey: "teamInfos" },
  { href: "/dashboard/reporters", labelKey: "reporters" },
  { href: "/dashboard/share", labelKey: "share" },
  { href: "/dashboard/profile", labelKey: "profile" },
] as const;

const REPORTER_LINKS = [
  { href: "/dashboard", labelKey: "overview" },
  { href: "/dashboard/games", labelKey: "games" },
  { href: "/dashboard/team-infos", labelKey: "teamInfos" },
  { href: "/dashboard/profile", labelKey: "profile" },
] as const;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("dashboard");
  const tAuth = useTranslations("auth");
  const { user, authLoading } = useAuth();
  const clubState = useCurrentClub();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!clubState.loading && !clubState.club) {
      router.replace("/onboarding/create-club");
    }
  }, [authLoading, user, clubState.loading, clubState.club, router]);

  if (authLoading || clubState.loading || !user || !clubState.club) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-white text-gray-500 dark:bg-brand-black dark:text-gray-400">
        {t("overview")}…
      </div>
    );
  }

  const links = clubState.role === "clubAdmin" ? CLUB_ADMIN_LINKS : REPORTER_LINKS;

  return (
    <ClubContext.Provider value={clubState}>
      <div className="min-h-screen bg-brand-white dark:bg-brand-black">
        <header className="border-b border-brand-silver/30 bg-brand-white dark:border-white/10 dark:bg-brand-black">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              {clubState.club.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={clubState.club.logoUrl}
                  alt=""
                  className="h-10 w-10 rounded object-contain"
                />
              )}
              <div>
                <p className="font-teko text-xl font-bold text-gray-900 dark:text-white">{clubState.club.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">LiveClub</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={() => logout().then(() => router.push("/login"))}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                {tAuth("logoutButton")}
              </button>
            </div>
          </div>
          <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
                  pathname === link.href
                    ? "bg-brand-red/10 text-brand-red"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
                }`}
              >
                {t(link.labelKey)}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <PublicFooter />
      </div>
    </ClubContext.Provider>
  );
}
