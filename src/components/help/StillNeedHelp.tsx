import { getTranslations } from "next-intl/server";

const SUPPORT_EMAIL = "support@liveclub.app";

// The single fallback every Help-center page (home, category, article)
// bottoms out to once search/browsing doesn't answer the question — this
// is what replaced the old standalone /support page and its contact form;
// see next.config.ts's /help → /support redirect. A plain mailto: link
// rather than a form: no backend round trip, no reCAPTCHA, just the
// address people are already told to expect a reply from.
export async function StillNeedHelp({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "help.stillNeedHelp" });

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white px-6 py-8 text-center shadow-sm dark:border-white/10 dark:bg-white/5">
      <span className="text-3xl" aria-hidden>
        ✉️
      </span>
      <h2 className="font-teko text-2xl font-bold text-gray-900 dark:text-white">{t("title")}</h2>
      <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">{t("body")}</p>
      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        className="mt-1 inline-flex items-center justify-center rounded-lg bg-brand-red px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-red-hover"
      >
        {t("button")}
      </a>
    </div>
  );
}
