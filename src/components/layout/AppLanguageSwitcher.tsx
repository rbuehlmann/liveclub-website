"use client";

import { useAppLocale } from "@/components/layout/AppLocaleProvider";

// Same visual style as LanguageSwitcher (the URL-based one for public
// pages), but buttons instead of links — switches instantly via
// AppLocaleProvider's localStorage-backed state, no navigation/reload.
export function AppLanguageSwitcher() {
  const { locale, setLocale } = useAppLocale();
  return (
    <div className="flex items-center gap-1 text-xs font-medium">
      <button
        type="button"
        onClick={() => setLocale("de")}
        className={locale === "de" ? "text-brand-red-link" : "text-gray-500 hover:text-brand-red-link dark:text-gray-400"}
      >
        DE
      </button>
      <span className="text-gray-300 dark:text-gray-600">/</span>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={locale === "en" ? "text-brand-red-link" : "text-gray-500 hover:text-brand-red-link dark:text-gray-400"}
      >
        EN
      </button>
    </div>
  );
}
