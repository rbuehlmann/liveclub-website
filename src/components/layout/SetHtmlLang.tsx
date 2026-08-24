"use client";

import { useEffect } from "react";

// The root layout's <html lang="de"> is hardcoded/static (see
// src/app/layout.tsx — it can't read the per-request locale without
// forcing every page in the app into dynamic rendering). This corrects the
// attribute client-side for pages actually rendered in another locale;
// nested layouts can't redefine <html> themselves in the App Router.
export function SetHtmlLang({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    return () => {
      document.documentElement.lang = "de";
    };
  }, [locale]);
  return null;
}
