import Link from "next/link";
import { useTranslations } from "next-intl";

// Swiss legal notice ("Impressum") needs to stay reachable from every
// customer/visitor-facing page — kept as a small, unobtrusive bar rather
// than a full marketing footer since the product is "function over design".
//
// Plain next/link, not the locale-aware one — this component is also
// rendered from pages entirely outside app/[locale]/ (dashboard, admin,
// login, register, ...). The tradeoff: these 4 links always go to the
// German legal/support pages even from an /en/... page, rather than
// following to their /en/ counterparts. Acceptable for now — useTranslations()
// for the *labels* still correctly shows English there (it reads from
// whichever NextIntlClientProvider is nearest, and [locale]/layout.tsx
// nests an English one for pages under /en/...).
export function PublicFooter() {
  const t = useTranslations("footer");
  return (
    <footer className="border-t border-brand-silver/30 bg-brand-white py-6 dark:border-white/10 dark:bg-brand-black">
      <div className="mx-auto flex max-w-2xl flex-wrap justify-center gap-x-6 gap-y-2 px-4 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/impressum" className="hover:text-brand-red hover:underline">
          {t("legalNotice")}
        </Link>
        <Link href="/privacy-policy" className="hover:text-brand-red hover:underline">
          {t("privacyPolicy")}
        </Link>
        <Link href="/terms-of-service" className="hover:text-brand-red hover:underline">
          {t("termsOfService")}
        </Link>
        <Link href="/support" className="hover:text-brand-red hover:underline">
          {t("support")}
        </Link>
      </div>
    </footer>
  );
}
