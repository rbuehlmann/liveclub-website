"use client";

import { useTranslations } from "next-intl";

type CalloutType = "info" | "tip" | "warning" | "important" | "best-practice";

const CALLOUT_META: Record<CalloutType, { icon: string; labelKey: string; classes: string }> = {
  info: {
    icon: "ℹ️",
    labelKey: "info",
    classes: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200",
  },
  tip: {
    icon: "💡",
    labelKey: "tip",
    classes:
      "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200",
  },
  warning: {
    icon: "⚠️",
    labelKey: "warning",
    classes:
      "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200",
  },
  important: {
    icon: "❗",
    labelKey: "important",
    classes: "border-red-200 bg-red-50 text-red-900 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200",
  },
  "best-practice": {
    icon: "✅",
    labelKey: "bestPractice",
    classes:
      "border-green-200 bg-green-50 text-green-900 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-200",
  },
};

// Most MDX articles pass an explicit `title`, but not all — the fallback
// label (shown when they don't) still needs to follow the article's own
// locale rather than always showing German, so this needs useTranslations()
// like everything else under app/[locale]/, not a hardcoded string.
export function Callout({
  type = "info",
  title,
  children,
}: {
  type?: CalloutType;
  title?: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("help.calloutTypes");
  const meta = CALLOUT_META[type];
  return (
    <div className={`my-4 rounded-lg border px-4 py-3 text-sm ${meta.classes}`}>
      <p className="mb-1 flex items-center gap-2 font-semibold">
        <span aria-hidden>{meta.icon}</span>
        {title ?? t(meta.labelKey)}
      </p>
      <div className="[&>p]:m-0 [&>p+p]:mt-2">{children}</div>
    </div>
  );
}
