"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getIdTokenResult } from "firebase/auth";
import { useAuth } from "@/components/auth/AuthProvider";
import { logout } from "@/lib/firebase/authApi";
import { devGrantPlatformAdmin, grantPlatformAdmin } from "@/lib/firebase/functionsApi";
import { Button } from "@/components/ui/Button";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { formatDateTimeDe } from "@/lib/date";

const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";
// Set at build time (see next.config.ts) — lets you check whether the live
// site is really running the commit you just pushed, without guessing.
const buildSha = process.env.NEXT_PUBLIC_BUILD_SHA ?? "unknown";
const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME ?? null;

const LINKS = [
  { href: "/admin", label: "Übersicht" },
  { href: "/admin/clubs", label: "Vereine" },
  { href: "/admin/team-infos", label: "Team-Infos" },
  { href: "/admin/demo", label: "Demo-Verein" },
  { href: "/admin/mail-templates", label: "Mail Vorlagen" },
  { href: "/admin/settings", label: "Einstellungen" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [grantingDevAccess, setGrantingDevAccess] = useState(false);
  const [grantingAccess, setGrantingAccess] = useState(false);
  const [grantError, setGrantError] = useState<string | null>(null);

  async function checkClaims() {
    if (!user) return;
    const token = await getIdTokenResult(user);
    setIsPlatformAdmin(token.claims.platformAdmin === true);
    setChecking(false);
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?redirect=/admin");
      return;
    }
    checkClaims();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, router]);

  async function handleDevGrant() {
    setGrantingDevAccess(true);
    try {
      await devGrantPlatformAdmin();
      await user?.getIdToken(true);
      await checkClaims();
    } finally {
      setGrantingDevAccess(false);
    }
  }

  async function handleGrant() {
    setGrantingAccess(true);
    setGrantError(null);
    try {
      await grantPlatformAdmin();
      await user?.getIdToken(true);
      await checkClaims();
    } catch (err) {
      setGrantError((err as { message?: string })?.message ?? "Zugriff verweigert.");
    } finally {
      setGrantingAccess(false);
    }
  }

  if (authLoading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-white text-gray-500 dark:bg-brand-black dark:text-gray-400">
        Wird geladen …
      </div>
    );
  }

  if (!isPlatformAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-brand-white text-gray-500 dark:bg-brand-black dark:text-gray-400">
        <p>Kein Zugriff auf die Plattform-Administration.</p>
        <Button onClick={handleGrant} disabled={grantingAccess}>
          {grantingAccess ? "Wird geprüft …" : "Admin-Zugriff anfordern"}
        </Button>
        {grantError && <p className="text-sm text-red-600">{grantError}</p>}
        {useEmulators && (
          <Button onClick={handleDevGrant} disabled={grantingDevAccess}>
            {grantingDevAccess
              ? "Wird gewährt …"
              : "Dev: Mir Plattform-Admin-Rechte geben"}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-black">
      <header className="border-b border-brand-silver/30 bg-brand-white dark:border-white/10 dark:bg-brand-black">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <p className="text-lg font-bold text-gray-900 dark:text-white">LiveClub Plattform-Administration</p>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => logout().then(() => router.push("/login"))}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              Abmelden
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 px-4 pb-2">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                pathname === link.href
                  ? "bg-brand-red/10 text-brand-red"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      <p className="mx-auto max-w-5xl px-4 pb-4 text-xs text-gray-400 dark:text-gray-500">
        Version {buildSha}
        {buildTime && ` · gebaut am ${formatDateTimeDe(buildTime)}`}
      </p>
      <PublicFooter />
    </div>
  );
}
