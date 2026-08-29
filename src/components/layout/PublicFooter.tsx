"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// Swiss legal notice ("Impressum") needs to stay reachable from every
// customer/visitor-facing page — kept as a small, unobtrusive bar rather
// than a full marketing footer since the product is "function over design".
//
// Locale-aware Link: this component is also rendered from pages entirely
// outside app/[locale]/ (dashboard, admin, login, register, ...). There it
// resolves against the root layout's static German-only provider, so it
// still renders the plain unprefixed hrefs ("/impressum" etc.) exactly as
// before. Inside app/[locale]/ it correctly follows to the current page's
// locale (e.g. /en/impressum from an /en/... page) instead of always
// dropping back to German.
//
// "use client" is required for that to actually work: when this component
// is rendered from an async Server Component page (support/page.tsx,
// impressum/page.tsx, the help section, ...) without it, both the
// translated labels and the Link's locale resolution fall back to the
// default locale ("de") instead of the route's real [locale] segment —
// next-intl's ambient server-side resolution doesn't pick up the locale
// set via setRequestLocale() in [locale]/layout.tsx the way the
// NextIntlClientProvider context reliably does. Forcing this to always be
// a Client Component sidesteps that (already proven correct on every page
// that happens to have a Client Component in its own tree, e.g. the
// homepage, login, dashboard).
export function PublicFooter() {
  const t = useTranslations("footer");
  return (
    <footer className="border-t border-brand-silver/30 bg-brand-white py-6 dark:border-white/10 dark:bg-brand-black">
      <div className="mx-auto flex max-w-2xl flex-wrap justify-center gap-x-6 gap-y-2 px-4 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/impressum" className="hover:text-brand-red-link hover:underline">
          {t("legalNotice")}
        </Link>
        <Link href="/privacy-policy" className="hover:text-brand-red-link hover:underline">
          {t("privacyPolicy")}
        </Link>
        <Link href="/terms-of-service" className="hover:text-brand-red-link hover:underline">
          {t("termsOfService")}
        </Link>
        <Link href="/support" className="hover:text-brand-red-link hover:underline">
          {t("support")}
        </Link>
      </div>
    </footer>
  );
}
