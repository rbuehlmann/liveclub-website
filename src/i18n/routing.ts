import { defineRouting } from "next-intl/routing";

// German stays exactly at today's URLs (no /de/ prefix) — printed club QR
// codes, iOS/Android Universal Links (see the apple-app-site-association
// route), and any already-shared link must keep working unchanged. Only
// English gets an /en/ prefix ("as-needed"). Scope is public pages only
// (see src/proxy.ts's matcher) — /dashboard, /admin, /login, /register,
// /onboarding stay outside this entirely and are unaffected.
//
// localeDetection: false — without this, next-intl's middleware redirects
// unprefixed requests to /en based on the visitor's Accept-Language header
// or a previously-set cookie (e.g. after clicking the language switcher
// once). That would silently turn already-printed/shared unprefixed German
// URLs into /en/... redirects for anyone with an English browser/device
// locale, which breaks the fixed-URL guarantee above. Unprefixed paths must
// always render German; English is only reached by explicitly visiting /en
// or using the language switcher.
export const routing = defineRouting({
  locales: ["de", "en"],
  defaultLocale: "de",
  localePrefix: "as-needed",
  localeDetection: false,
});
