import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { SetHtmlLang } from "@/components/layout/SetHtmlLang";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Nests its own NextIntlClientProvider (with this segment's real locale's
// messages) inside the root layout's static/German-only one — see
// src/app/layout.tsx and src/i18n/request.ts for why the root one can't
// dynamically resolve requestLocale (it forces every route in the app,
// including ones with nothing to do with i18n, into dynamic rendering).
// The nearest provider wins for useTranslations()/t() lookups, so pages
// under this segment correctly get German or English regardless of what
// the root provider carries.
//
// Messages are loaded via a plain dynamic import keyed by the *route
// param* `locale` (statically known per generateStaticParams above), not
// via getMessages()/i18n/request.ts's requestLocale — same reasoning.
// setRequestLocale is still called for next-intl's own static-rendering
// bookkeeping (server-only translators like getTranslations({locale})
// elsewhere in this tree rely on it), but nothing here awaits requestLocale.
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = (await import(`../../../messages/${locale}.json`)).default;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <SetHtmlLang locale={locale} />
      {children}
    </NextIntlClientProvider>
  );
}
