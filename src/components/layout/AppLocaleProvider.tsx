"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import deMessages from "../../../messages/de.json";
import enMessages from "../../../messages/en.json";

export type AppLocale = "de" | "en";

const STORAGE_KEY = "liveclub-app-locale";

const AppLocaleContext = createContext<{ locale: AppLocale; setLocale: (locale: AppLocale) => void } | null>(null);

export function useAppLocale() {
  const ctx = useContext(AppLocaleContext);
  if (!ctx) throw new Error("useAppLocale must be used within AppLocaleProvider");
  return ctx;
}

function readStoredLocale(): AppLocale {
  if (typeof window === "undefined") return "de";
  return window.localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "de";
}

// Manual switcher only, no Accept-Language/browser detection — the user
// explicitly asked for this to make testing easier. Purely client-side
// (localStorage, same pattern as ThemeToggle's "liveclub-theme" key) and
// deliberately never touches cookies()/headers() from next/headers or
// next-intl's server routing — that's what caused the whole-app
// dynamic-rendering regression documented in src/i18n/request.ts. This
// area (login/register/onboarding/dashboard) has no URL locale prefix at
// all, unlike the public pages under src/app/[locale]/.
//
// First render always uses the "de" default (matching SSR); the stored
// value is applied after mount, so a brief German flash before switching
// to English is an accepted trade-off — same as ThemeToggle would have
// without its pre-hydration inline script, which doesn't translate to
// swapping full text content.
export function AppLocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>("de");

  useEffect(() => {
    setLocaleState(readStoredLocale());
  }, []);

  function setLocale(next: AppLocale) {
    window.localStorage.setItem(STORAGE_KEY, next);
    setLocaleState(next);
  }

  const messages = locale === "en" ? enMessages : deMessages;

  return (
    <AppLocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </AppLocaleContext.Provider>
  );
}
