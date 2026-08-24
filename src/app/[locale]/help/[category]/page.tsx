import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getAllArticles } from "@/lib/help/content";
import { getCategory, HELP_CATEGORIES } from "@/lib/help/categories";
import { Breadcrumbs } from "@/components/help/Breadcrumbs";
import { HelpSidebar } from "@/components/help/HelpSidebar";
import { ArticleCard } from "@/components/help/ArticleCard";

type Params = Promise<{ locale: string; category: string }>;

export function generateStaticParams() {
  return HELP_CATEGORIES.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, category: categorySlug } = await params;
  const category = getCategory(categorySlug);
  if (!category) return {};
  const t = await getTranslations({ locale, namespace: "help.categories" });
  return { title: t(categorySlug) };
}

export default async function HelpCategoryPage({ params }: { params: Params }) {
  const { locale, category: categorySlug } = await params;
  const category = getCategory(categorySlug);
  if (!category) notFound();

  const t = await getTranslations({ locale, namespace: "help" });
  const categoryLabel = t(`categories.${categorySlug}`);
  const articles = getAllArticles(locale).filter((a) => a.category === categorySlug);

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-10">
      <aside className="md:w-56 md:flex-shrink-0">
        <HelpSidebar />
      </aside>
      <div className="min-w-0 flex-1">
        <Breadcrumbs items={[{ label: t("breadcrumbDocs"), href: "/help" }, { label: categoryLabel }]} />
        <h1 className="mt-2 mb-6 flex items-center gap-3 font-teko text-4xl font-bold text-gray-900 dark:text-white">
          <span aria-hidden>{category.icon}</span>
          {categoryLabel}
        </h1>
        {articles.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">{t("noArticlesInCategory")}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {articles.map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
