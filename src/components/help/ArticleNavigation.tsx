import Link from "next/link";
import { HelpArticleMeta } from "@/lib/help/types";

export function ArticleNavigation({ prev, next }: { prev?: HelpArticleMeta; next?: HelpArticleMeta }) {
  if (!prev && !next) return null;
  return (
    <div className="mt-10 grid gap-4 border-t border-gray-100 pt-6 dark:border-white/10 sm:grid-cols-2">
      {prev ? (
        <Link
          href={`/help/${prev.category}/${prev.slug}`}
          className="rounded-lg border border-gray-200 p-4 hover:border-brand-red/40 dark:border-white/10"
        >
          <p className="text-xs text-gray-400 dark:text-gray-500">← Zurück</p>
          <p className="font-medium text-gray-900 dark:text-white">{prev.title}</p>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          href={`/help/${next.category}/${next.slug}`}
          className="rounded-lg border border-gray-200 p-4 text-right hover:border-brand-red/40 dark:border-white/10"
        >
          <p className="text-xs text-gray-400 dark:text-gray-500">Weiter →</p>
          <p className="font-medium text-gray-900 dark:text-white">{next.title}</p>
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
}
