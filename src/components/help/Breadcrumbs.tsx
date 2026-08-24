import { Link } from "@/i18n/navigation";

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <span key={item.label} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-gray-300 dark:text-gray-600">/</span>}
          {item.href ? (
            <Link href={item.href} className="hover:text-brand-red hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-900 dark:text-white">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
