import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypeSlug from "rehype-slug";
import { getAllArticles, getArticleSource, extractHeadings, DEFAULT_LOCALE } from "@/lib/help/content";
import { getCategory } from "@/lib/help/categories";
import { Breadcrumbs } from "@/components/help/Breadcrumbs";
import { HelpSidebar } from "@/components/help/HelpSidebar";
import { TableOfContents } from "@/components/help/TableOfContents";
import { ArticleNavigation } from "@/components/help/ArticleNavigation";
import { RoleBadge, PlatformBadge } from "@/components/help/Badges";
import { mdxComponents } from "@/components/help/mdxComponents";

type Params = Promise<{ category: string; slug: string }>;

export function generateStaticParams() {
  return getAllArticles().map((a) => ({ category: a.category, slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { category, slug } = await params;
  const article = getArticleSource(DEFAULT_LOCALE, category, slug);
  if (!article) return {};
  const url = `https://liveclub.app/help/${category}/${slug}`;
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
  const { category: categorySlug, slug } = await params;
  const category = getCategory(categorySlug);
  const article = getArticleSource(DEFAULT_LOCALE, categorySlug, slug);
  if (!category || !article) notFound();

  const headings = extractHeadings(article.content);

  const siblings = getAllArticles()
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
            { label: "Docs", href: "/help" },
            { label: category.label, href: `/help/${category.slug}` },
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
              Zuletzt aktualisiert: {article.frontmatter.updated}
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
