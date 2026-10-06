"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export function LicenseExpiredNotice() {
  const t = useTranslations("dashboard");
  return (
    <div className="rounded-lg bg-red-50 p-4 dark:bg-red-500/10">
      <p className="text-sm font-medium text-red-800 dark:text-red-300">{t("licenseBlockedTitle")}</p>
      <p className="mt-1 text-sm text-red-700 dark:text-red-400">
        {t.rich("licenseBlockedBody", {
          link: (chunks) => (
            <Link href="/dashboard" className="underline">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}
