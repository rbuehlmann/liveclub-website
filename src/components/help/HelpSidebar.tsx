"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { HELP_CATEGORIES } from "@/lib/help/categories";

export function HelpSidebar() {
  const t = useTranslations("help.categories");
  // The locale-aware usePathname() strips the /en prefix, so comparing
  // against a plain "/support/{slug}" href works the same for both locales.
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 text-sm">
      {HELP_CATEGORIES.map((cat) => {
        const href = `/support/${cat.slug}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={cat.slug}
            href={href}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
              active
                ? "bg-brand-red/10 font-medium text-brand-red"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
            }`}
          >
            <span aria-hidden>{cat.icon}</span>
            {t(cat.slug)}
          </Link>
        );
      })}
    </nav>
  );
}
