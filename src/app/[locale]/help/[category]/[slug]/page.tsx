import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypeSlug from "rehype-slug";
import { getTranslations } from "next-intl/server";
import { getAllArticles, getArticleSource, extractHeadings } from "@/lib/help/content";
import { getCategory } from "@/lib/help/categories";
import { routing } from "@/i18n/routing";
import { Breadcrumbs } from "@/components/help/Breadcrumbs";
import { HelpSidebar } from "@/components/help/HelpSidebar";
import { TableOfContents } from "@/components/help/TableOfContents";
import { ArticleNavigation } from "@/components/help/ArticleNavigation";
import { RoleBadge, PlatformBadge } from "@/components/help/Badges";
import { mdxComponents } from "@/components/help/mdxComponents";

type Params = Promise<{ locale: string; category: string; slug: string }>;

// Every locale must define the exact same {category, slug} pairs — see
// content/en/.../*.mdx counterparts of the German articles. If a locale
// is ever missing one, that specific /xx/help/.../slug just 404s rather
// than silently falling back to the wrong language.
export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    getAllArticles(locale).map((a) => ({ locale, category: a.category, slug: a.slug }))
  );
}

function localizedUrl(locale: string, path: string): string {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  return `https://liveclub.app${prefix}${path}`;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, category, slug } = await params;
  const article = getArticleSource(locale, category, slug);
  if (!article) return {};
  const url = localizedUrl(locale, `/help/${category}/${slug}`);
  return {
    title: article.frontmatter.title,
    description: article.frontmatter.summary,
    alternates: { canonical: url },
    openGraph: {
      title: article.frontmatter.title,
      description: article.frontmatter.summary,
      url,
      type: "article",
    },
  };
}

export default async function HelpArticlePage({ params }: { params: Params }) {
  const { locale, category: categorySlug, slug } = await params;
  const category = getCategory(categorySlug);
  const article = getArticleSource(locale, categorySlug, slug);
  if (!category || !article) notFound();

  const t = await getTranslations({ locale, namespace: "help" });
  const categoryLabel = t(`categories.${categorySlug}`);
  const headings = extractHeadings(article.content);

  const siblings = getAllArticles(locale)
    .filter((a) => a.category === categorySlug)
    .sort((a, b) => a.title.localeCompare(b.title));
  const currentIndex = siblings.findIndex((a) => a.slug === slug);
  const prev = currentIndex > 0 ? siblings[currentIndex - 1] : undefined;
  const next = currentIndex >= 0 && currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : undefined;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
      <aside className="lg:w-56 lg:flex-shrink-0">
        <HelpSidebar />
      </aside>

      <div className="min-w-0 flex-1">
        <Breadcrumbs
          items={[
            { label: t("breadcrumbDocs"), href: "/help" },
            { label: categoryLabel, href: `/help/${category.slug}` },
            { label: article.frontmatter.title },
          ]}
        />

        <h1 className="mt-2 mb-2 font-teko text-4xl font-bold text-gray-900 dark:text-white">
          {article.frontmatter.title}
        </h1>
        <p className="mb-4 text-lg text-gray-500 dark:text-gray-400">{article.frontmatter.summary}</p>

        <div className="mb-8 flex flex-wrap items-center gap-2">
          {article.frontmatter.roles?.map((role) => <RoleBadge key={role} role={role} />)}
          {article.frontmatter.platforms?.map((platform) => <PlatformBadge key={platform} platform={platform} />)}
          {article.frontmatter.updated && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {t("lastUpdated")}: {article.frontmatter.updated}
            </span>
          )}
        </div>

        <article>
          <MDXRemote
            source={article.content}
            components={mdxComponents}
            options={{ mdxOptions: { rehypePlugins: [rehypeSlug] } }}
          />
        </article>

        <ArticleNavigation prev={prev} next={next} />
      </div>

      <aside className="hidden xl:block xl:w-56 xl:flex-shrink-0">
        <TableOfContents headings={headings} />
      </aside>
    </div>
  );
}
