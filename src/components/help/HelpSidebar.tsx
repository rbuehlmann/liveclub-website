"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HELP_CATEGORIES } from "@/lib/help/categories";

export function HelpSidebar() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 text-sm">
      {HELP_CATEGORIES.map((cat) => {
        const href = `/help/${cat.slug}`;
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
            {cat.label}
          </Link>
        );
      })}
    </nav>
  );
}
