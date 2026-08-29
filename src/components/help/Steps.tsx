// CSS counters (not a manually-passed number prop) so inserting/removing a
// Step in MDX content never requires renumbering the others by hand.
export function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="my-6 flex flex-col gap-6 [counter-reset:step]">{children}</ol>;
}

export function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="relative list-none pl-10 [counter-increment:step] before:absolute before:top-0 before:left-0 before:flex before:h-7 before:w-7 before:items-center before:justify-center before:rounded-full before:bg-brand-red before:text-sm before:font-bold before:text-brand-red-text before:content-[counter(step)]">
      <p className="font-semibold text-gray-900 dark:text-white">{title}</p>
      <div className="mt-1 text-sm text-gray-600 dark:text-gray-400 [&>p]:m-0">{children}</div>
    </li>
  );
}
