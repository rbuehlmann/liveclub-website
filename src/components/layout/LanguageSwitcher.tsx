"use client";

import Link from "next/link";
import { useLocale } from "next-intl";

// Deliberately always jumps to `basePath`'s root in the target language
// rather than trying to preserve the exact current page — this component is
// also rendered from PublicHeader, which in turn is shared with pages
// outside app/[locale]/ entirely (login, register, ...) where there's no
// safe way to know if an /en/ equivalent of the current path even exists.
// "Switch language -> land on that language's home" is simple and always
// correct everywhere this renders.
export function LanguageSwitcher({ basePath = "" }: { basePath?: string }) {
  const locale = useLocale();
  return (
    <div className="flex items-center gap-1 text-xs font-medium">
      <Link
        href={basePath || "/"}
        className={locale === "de" ? "text-brand-red" : "text-gray-500 hover:text-brand-red dark:text-gray-400"}
      >
        DE
      </Link>
      <span className="text-gray-300 dark:text-gray-600">/</span>
      <Link
        href={`/en${basePath}`}
        className={locale === "en" ? "text-brand-red" : "text-gray-500 hover:text-brand-red dark:text-gray-400"}
      >
        EN
      </Link>
    </div>
  );
}
