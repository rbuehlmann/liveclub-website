"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useClubContext } from "@/components/club/ClubContext";
import { Card } from "@/components/ui/Card";
import { daysRemaining, formatDateDe } from "@/lib/date";

export default function DashboardOverviewPage() {
  const t = useTranslations("dashboard");
  const { club, role } = useClubContext();

  if (!club) return null;

  const remaining = daysRemaining(club.currentLicenseValidUntil);
  const isTrial = club.currentLicenseType === "trial";
  const isExpired = club.currentLicenseStatus !== "active" || (remaining !== null && remaining < 0);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <h1 className="text-xl font-bold text-gray-900">{club.name}</h1>
        <p className="text-sm text-gray-600">{club.sport}</p>
        <div className="mt-4 rounded-lg bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-700">
            {isExpired
              ? t("trialExpired")
              : isTrial
                ? t("trialEndsIn", { days: remaining ?? 0 })
                : `${t("licenseStatusActive")} · ${club.currentLicenseType}`}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Gültig bis {formatDateDe(club.currentLicenseValidUntil)}
          </p>
        </div>
      </Card>

      {role === "clubAdmin" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/dashboard/teams">
            <Card className="hover:border-blue-300">
              <h2 className="font-semibold text-gray-900">{t("teams")}</h2>
            </Card>
          </Link>
          <Link href="/dashboard/games">
            <Card className="hover:border-blue-300">
              <h2 className="font-semibold text-gray-900">{t("games")}</h2>
            </Card>
          </Link>
          <Link href="/dashboard/reporters">
            <Card className="hover:border-blue-300">
              <h2 className="font-semibold text-gray-900">{t("reporters")}</h2>
            </Card>
          </Link>
          <Link href="/dashboard/share">
            <Card className="hover:border-blue-300">
              <h2 className="font-semibold text-gray-900">{t("share")}</h2>
            </Card>
          </Link>
        </div>
      )}

      {role === "reporter" && (
        <Link href="/dashboard/games">
          <Card className="hover:border-blue-300">
            <h2 className="font-semibold text-gray-900">{t("games")}</h2>
          </Card>
        </Link>
      )}
    </div>
  );
}
