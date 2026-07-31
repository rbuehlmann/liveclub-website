"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/auth/AuthProvider";
import { useCurrentClub } from "@/lib/hooks/useCurrentClub";
import { ClubContext } from "@/components/club/ClubContext";
import { logout } from "@/lib/firebase/authApi";

const CLUB_ADMIN_LINKS = [
  { href: "/dashboard", labelKey: "overview" },
  { href: "/dashboard/club", labelKey: "club" },
  { href: "/dashboard/teams", labelKey: "teams" },
  { href: "/dashboard/games", labelKey: "games" },
  { href: "/dashboard/reporters", labelKey: "reporters" },
  { href: "/dashboard/share", labelKey: "share" },
] as const;

const REPORTER_LINKS = [{ href: "/dashboard", labelKey: "overview" }, { href: "/dashboard/games", labelKey: "games" }] as const;

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
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        {t("overview")}…
      </div>
    );
  }

  const links = clubState.role === "clubAdmin" ? CLUB_ADMIN_LINKS : REPORTER_LINKS;

  return (
    <ClubContext.Provider value={clubState}>
      <div className="min-h-screen bg-gray-50">
        <header className="border-b border-gray-200 bg-white">
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
                <p className="font-teko text-xl font-bold text-gray-900">{clubState.club.name}</p>
                <p className="text-xs text-gray-500">LiveClub</p>
              </div>
            </div>
            <button
              onClick={() => logout().then(() => router.push("/login"))}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              {tAuth("logoutButton")}
            </button>
          </div>
          <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
                  pathname === link.href
                    ? "bg-blue-100 text-blue-800"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {t(link.labelKey)}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </div>
    </ClubContext.Provider>
  );
}
