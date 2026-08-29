"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { HelpArticleMeta } from "@/lib/help/types";

const MAX_RESULTS = 8;
const SUPPORT_EMAIL = "support@liveclub.app";

// Fully client-side (article list passed in as a prop, loaded server-side
// via getAllArticles) — fine at this content size. Swapping to Algolia
// later only touches this component, not the pages that render it.
export function SearchBar({ articles }: { articles: HelpArticleMeta[] }) {
  const t = useTranslations("help");
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return articles
      .filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          (a.keywords ?? []).some((k) => k.toLowerCase().includes(q))
      )
      .slice(0, MAX_RESULTS);
  }, [articles, query]);

  return (
    <div className="relative mx-auto w-full max-w-xl">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("searchPlaceholder")}
        className="w-full rounded-full border border-gray-200 bg-white px-5 py-3.5 text-base shadow-sm focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-white"
      />
      {results.length > 0 && (
        <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-lg dark:border-white/10 dark:bg-brand-black">
          {results.map((a) => (
            <Link
              key={`${a.category}-${a.slug}`}
              href={`/support/${a.category}/${a.slug}`}
              className="block border-b border-gray-100 px-4 py-3 last:border-0 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/5"
            >
              <p className="font-medium text-gray-900 dark:text-white">{a.title}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{a.summary}</p>
            </Link>
          ))}
        </div>
      )}
      {query.trim().length > 0 && results.length === 0 && (
        <div className="absolute z-10 mt-2 w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-lg dark:border-white/10 dark:bg-brand-black">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("search.noResultsFor", { query: query.trim() })}
          </p>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-2 inline-block text-sm font-medium text-brand-red-link hover:underline">
            {t("search.emailCta")} →
          </a>
        </div>
      )}
    </div>
  );
}
