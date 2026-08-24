"use client";

import { useTranslations } from "next-intl";
import { HelpPlatform, HelpRole } from "@/lib/help/types";

const ROLE_CLASSES: Record<HelpRole, string> = {
  fan: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
  redaktor: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  admin: "bg-brand-red/10 text-brand-red dark:bg-brand-red/20",
};

export function RoleBadge({ role }: { role: HelpRole }) {
  const t = useTranslations("help.roles");
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_CLASSES[role]}`}>{t(role)}</span>
  );
}

const PLATFORM_LABELS: Record<HelpPlatform, string> = { web: "Web", ios: "iOS", android: "Android" };

export function PlatformBadge({ platform }: { platform: HelpPlatform }) {
  return (
    <span className="rounded-full border border-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:border-white/15 dark:text-gray-300">
      {PLATFORM_LABELS[platform]}
    </span>
  );
}
