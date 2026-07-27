"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getIdTokenResult } from "firebase/auth";
import { useAuth } from "@/components/auth/AuthProvider";
import { logout } from "@/lib/firebase/authApi";
import { devGrantPlatformAdmin } from "@/lib/firebase/functionsApi";
import { Button } from "@/components/ui/Button";

const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";

const LINKS = [
  { href: "/admin", label: "Übersicht" },
  { href: "/admin/clubs", label: "Vereine" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [grantingDevAccess, setGrantingDevAccess] = useState(false);

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

  if (authLoading || checking) {
    return <div className="flex min-h-screen items-center justify-center text-gray-500">Wird geladen …</div>;
  }

  if (!isPlatformAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-gray-500">
        <p>Kein Zugriff auf die Plattform-Administration.</p>
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
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <p className="text-lg font-bold text-gray-900">LiveClub Plattform-Administration</p>
          <button
            onClick={() => logout().then(() => router.push("/login"))}
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Abmelden
          </button>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 px-4 pb-2">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                pathname === link.href ? "bg-blue-100 text-blue-800" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
