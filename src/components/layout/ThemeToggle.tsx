"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

// Kept in sync with the inline script in layout.tsx, which applies the
// saved/default theme before hydration to avoid a flash of the wrong theme.
const STORAGE_KEY = "liveclub-theme";

export function ThemeToggle() {
  const t = useTranslations("common");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? t("switchToLightMode") : t("switchToDarkMode")}
      className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-brand-silver/20 dark:text-gray-300 dark:hover:bg-white/10"
    >
      {isDark ? (
        // Sun icon (click to go light)
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
          <circle cx="12" cy="12" r="4" />
          <path
            strokeLinecap="round"
            d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
          />
        </svg>
      ) : (
        // Moon icon (click to go dark)
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
