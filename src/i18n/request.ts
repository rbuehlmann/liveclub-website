import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

// Deliberately never awaits `requestLocale` — doing so forced *every* route
// in the app into dynamic (non-prerendered) rendering, including pages
// entirely outside app/[locale]/ that don't meaningfully use next-intl at
// all (dashboard, admin, login, register, onboarding — see the 2026-08-24
// build-output investigation: `npm run build`'s route table went from
// mostly ○ Static to 100% ƒ Dynamic the moment this file touched
// `requestLocale`, even with every consumer using otherwise-static props).
//
// Pages under app/[locale]/ instead always pass an explicit `locale` (the
// already-known, static [locale] route param) to getTranslations/
// getMessages — see that layout — which arrives here via the plain
// `locale` argument below, never via `requestLocale`'s dynamic resolution.
// Anything that doesn't pass one (i.e. everything outside app/[locale]/)
// gets the fixed default locale, reproducing today's fixed-German
// behavior there, unchanged and fully static.
export default getRequestConfig(async ({ locale }) => {
  const resolved =
    locale && routing.locales.includes(locale as (typeof routing.locales)[number]) ? locale : routing.defaultLocale;

  return {
    locale: resolved,
    messages: (await import(`../../messages/${resolved}.json`)).default,
  };
});
