export function Card({
  children,
  className = "",
  onClick,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={`rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
