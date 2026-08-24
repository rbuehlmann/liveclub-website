"use client";

import { useTranslations } from "next-intl";
import { HelpHeading } from "@/lib/help/types";

export function TableOfContents({ headings }: { headings: HelpHeading[] }) {
  const t = useTranslations("help");
  if (headings.length === 0) return null;
  return (
    <nav className="sticky top-8 flex flex-col gap-1.5 text-sm">
      <p className="mb-1 font-semibold text-gray-900 dark:text-white">{t("onThisPage")}</p>
      {headings.map((h) => (
        <a
          key={h.id}
          href={`#${h.id}`}
          className={`text-gray-500 hover:text-brand-red dark:text-gray-400 ${h.depth === 3 ? "pl-3" : ""}`}
        >
          {h.text}
        </a>
      ))}
    </nav>
  );
}
