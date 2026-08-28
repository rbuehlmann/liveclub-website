import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { localizedPathname } from "@/i18n/routing";
import { getAllArticles } from "@/lib/help/content";
import { HELP_CATEGORIES } from "@/lib/help/categories";
import { SearchBar } from "@/components/help/SearchBar";
import { ArticleCard } from "@/components/help/ArticleCard";

type Params = Promise<{ locale: string }>;

export default async function HelpHomePage({ params }: { params: Params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "help" });
  const articles = getAllArticles(locale);
  // "Zuletzt aktualisiert" only — no separate "created" date is tracked
  // per article yet, and there's no usage data for a real "Beliebte
  // Artikel" ranking, so those two sections from the original spec are
  // deliberately left out here rather than faked with the same ordering.
  const recentlyUpdated = [...articles]
    .filter((a) => a.updated)
    .sort((a, b) => (a.updated! < b.updated! ? 1 : -1))
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-16">
      <div className="flex flex-col items-center gap-6 text-center">
        <h1 className="font-teko text-5xl font-bold text-gray-900 dark:text-white">{t("heroTitle")}</h1>
        <SearchBar articles={articles} />
      </div>

      <div>
        <h2 className="mb-4 text-sm font-semibold tracking-wide text-gray-400 uppercase dark:text-gray-500">
          {t("categoriesTitle")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {HELP_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={localizedPathname(locale, `/support/${cat.slug}`)}
              className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-6 text-center transition hover:border-brand-red/40 hover:shadow-sm dark:border-white/10 dark:bg-white/5"
            >
              <span className="text-3xl" aria-hidden>
                {cat.icon}
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {t(`categories.${cat.slug}`)}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {recentlyUpdated.length > 0 && (
        <div>
          <h2 className="mb-4 text-sm font-semibold tracking-wide text-gray-400 uppercase dark:text-gray-500">
            {t("recentlyUpdatedTitle")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentlyUpdated.map((a) => (
              <ArticleCard key={`${a.category}-${a.slug}`} article={a} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
