"use client";

import { Link } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { AppLanguageSwitcher } from "@/components/layout/AppLanguageSwitcher";
import { GoLiveButton } from "@/components/layout/GoLiveButton";
import { useBranding } from "@/components/layout/BrandingProvider";

// Shared top bar for every public-facing page (homepage/search, login,
// register, public club/team/game pages, onboarding, invite) so LiveClub
// branding, the theme switcher, and a way back to "Anmelden" are always
// present — not used on /dashboard/* or /admin/* (their own layouts already
// carry a club/platform-specific header) nor on /embed/* (runs inside a
// third-party page and must stay unbranded).
//
// variant="url" (default): the URL-based LanguageSwitcher, for pages under
// app/[locale]/ where the locale-aware Link below correctly resolves
// against the real page locale.
// variant="app": the localStorage-based AppLanguageSwitcher, for
// login/register/onboarding — outside app/[locale]/, no /en/ URL exists
// there. The logo Link is locale-aware either way: inside app/[locale]/ it
// follows the current page's locale; outside it, it resolves against
// whichever NextIntlClientProvider is nearest (AppLocaleProvider for
// login/register/onboarding, or the root's static "de" one for untouched
// pages like /invite), so it never regresses to always-German like a plain
// next/link would.
//
// maxWidth: the header's own inner container width — max-w-6xl everywhere
// by default so the logo/GO LIVE button sit at the exact same position on
// every page (2026-08-29 report: switching from the wide homepage to a
// narrower max-w-2xl page like login visibly shifted them, "sieht beim
// wechseln scheisse aus"). Pages below the header are still free to use
// whatever width fits their own content — only the header itself needs to
// stay consistent. Override only if a page genuinely needs a different
// header width.
export function PublicHeader({
  variant = "url",
  maxWidth = "max-w-6xl",
}: {
  variant?: "url" | "app";
  maxWidth?: string;
}) {
  const branding = useBranding();
  const logoLight = branding.logoLight;
  const logoDark = branding.logoDark ?? branding.logoLight;

  return (
    <header className="border-b border-brand-silver/30 bg-brand-white dark:border-white/10 dark:bg-brand-black">
      <div className={`mx-auto flex ${maxWidth} items-center justify-between px-4 py-4`}>
        <Link href="/" className="flex items-center">
          {logoLight ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoLight} alt="LiveClub" className="h-9 dark:hidden" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoDark ?? logoLight} alt="LiveClub" className="hidden h-9 dark:block" />
            </>
          ) : (
            <span className="font-teko text-3xl font-bold text-brand-red-link">LiveClub</span>
          )}
        </Link>
        <div className="flex items-center gap-3">
          {variant === "app" ? <AppLanguageSwitcher /> : <LanguageSwitcher />}
          <ThemeToggle />
          <GoLiveButton />
        </div>
      </div>
    </header>
  );
}
