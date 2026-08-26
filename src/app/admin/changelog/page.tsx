import { Card } from "@/components/ui/Card";
import { formatDateTimeDe } from "@/lib/date";

interface CommitEntry {
  sha: string;
  date: string;
  subject: string;
}

// Captured once, at build time, by next.config.ts's gitLog() — same
// mechanism as the "Version {sha}" footer already in admin/layout.tsx, one
// level deeper. Purely build-time data (no Firestore/callable involved),
// so this page needs no client-side loading state at all.
function buildLog(): CommitEntry[] {
  try {
    return JSON.parse(process.env.NEXT_PUBLIC_BUILD_LOG ?? "[]") as CommitEntry[];
  } catch {
    return [];
  }
}

export default function AdminChangelogPage() {
  const commits = buildLog();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Versionsverlauf</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Die letzten {commits.length} Commits, Stand des aktuell laufenden Builds — siehe „Version“ unten in
        der Navigation für den genauen Build-Zeitpunkt.
      </p>

      <Card>
        {commits.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Kein Versionsverlauf verfügbar.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-gray-100 dark:divide-white/10">
            {commits.map((c) => (
              <li key={c.sha} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <span className="text-sm text-gray-900 dark:text-white">{c.subject}</span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                  <code className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-white/10">{c.sha}</code>
                  {formatDateTimeDe(c.date)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
