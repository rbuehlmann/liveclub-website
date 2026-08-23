import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import { Callout } from "./Callout";
import { Steps, Step } from "./Steps";
import { Video } from "./Video";
import { ImageGallery } from "./ImageGallery";
import { PlatformBadge, RoleBadge } from "./Badges";

// Passed to MDXRemote's `components` prop — plain markdown elements get
// LiveClub's own typographic scale (no @tailwindcss/typography dependency,
// see the /help build notes) plus the custom blocks (Callout, Steps, ...)
// every article can use directly as JSX inside its .mdx file.
export const mdxComponents: MDXComponents = {
  h2: (props) => (
    <h2 {...props} className="mt-10 mb-3 text-2xl font-bold text-gray-900 first:mt-0 dark:text-white" />
  ),
  h3: (props) => <h3 {...props} className="mt-8 mb-2 text-lg font-semibold text-gray-900 dark:text-white" />,
  p: (props) => <p {...props} className="mb-4 leading-relaxed text-gray-700 dark:text-gray-300" />,
  ul: (props) => <ul {...props} className="mb-4 ml-5 list-disc space-y-1 text-gray-700 dark:text-gray-300" />,
  ol: (props) => <ol {...props} className="mb-4 ml-5 list-decimal space-y-1 text-gray-700 dark:text-gray-300" />,
  li: (props) => <li {...props} className="pl-1" />,
  a: ({ href, ...props }) =>
    href?.startsWith("/") ? (
      <Link href={href} {...props} className="text-brand-red hover:underline" />
    ) : (
      <a href={href} {...props} target="_blank" rel="noopener noreferrer" className="text-brand-red hover:underline" />
    ),
  strong: (props) => <strong {...props} className="font-semibold text-gray-900 dark:text-white" />,
  code: (props) => (
    <code
      {...props}
      className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm text-gray-800 dark:bg-white/10 dark:text-gray-200"
    />
  ),
  pre: (props) => (
    <pre
      {...props}
      className="mb-4 overflow-x-auto rounded-lg bg-gray-900 p-4 font-mono text-sm text-gray-100 dark:bg-black"
    />
  ),
  table: (props) => (
    <div className="mb-4 overflow-x-auto">
      <table {...props} className="w-full border-collapse text-left text-sm" />
    </div>
  ),
  th: (props) => (
    <th {...props} className="border-b border-gray-200 px-3 py-2 font-semibold text-gray-900 dark:border-white/10 dark:text-white" />
  ),
  td: (props) => <td {...props} className="border-b border-gray-100 px-3 py-2 text-gray-700 dark:border-white/5 dark:text-gray-300" />,
  hr: (props) => <hr {...props} className="my-8 border-gray-200 dark:border-white/10" />,
  Callout,
  Steps,
  Step,
  Video,
  ImageGallery,
  PlatformBadge,
  RoleBadge,
};
