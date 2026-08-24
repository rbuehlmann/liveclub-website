import { Link } from "@/i18n/navigation";
import { getCategory } from "@/lib/help/categories";
import { HelpArticleMeta } from "@/lib/help/types";

export function ArticleCard({ article }: { article: HelpArticleMeta }) {
  const category = getCategory(article.category);
  return (
    <Link
      href={`/help/${article.category}/${article.slug}`}
      className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-5 transition hover:border-brand-red/40 hover:shadow-sm dark:border-white/10 dark:bg-white/5"
    >
      <span className="text-2xl" aria-hidden>
        {category?.icon}
      </span>
      <h3 className="font-semibold text-gray-900 dark:text-white">{article.title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">{article.summary}</p>
    </Link>
  );
}
