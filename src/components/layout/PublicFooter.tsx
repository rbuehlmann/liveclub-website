import Link from "next/link";

// Swiss legal notice ("Impressum") needs to stay reachable from every
// customer/visitor-facing page — kept as a small, unobtrusive bar rather
// than a full marketing footer since the product is "function over design".
export function PublicFooter() {
  return (
    <footer className="border-t border-brand-silver/30 bg-brand-white py-6 dark:border-white/10 dark:bg-brand-black">
      <div className="mx-auto flex max-w-2xl flex-wrap justify-center gap-x-6 gap-y-2 px-4 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/impressum" className="hover:text-brand-red hover:underline">
          Impressum
        </Link>
        <Link href="/datenschutz" className="hover:text-brand-red hover:underline">
          Datenschutz
        </Link>
        <Link href="/support" className="hover:text-brand-red hover:underline">
          Support
        </Link>
      </div>
    </footer>
  );
}
