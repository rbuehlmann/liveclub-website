"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useClubContext } from "@/components/club/ClubContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { daysRemaining, formatDateDe } from "@/lib/date";
import { createCheckoutSession, createBillingPortalSession } from "@/lib/firebase/functionsApi";

export default function DashboardOverviewPage() {
  const t = useTranslations("dashboard");
  const { club, role } = useClubContext();
  const [redirecting, setRedirecting] = useState<"monthly" | "yearly" | "portal" | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);

  if (!club) return null;

  const remaining = daysRemaining(club.currentLicenseValidUntil);
  const isTrial = club.currentLicenseType === "trial";
  const isPaid = club.currentLicenseType === "paid";
  const isExpired = club.currentLicenseStatus !== "active" || (remaining !== null && remaining < 0);

  async function handleUpgrade(interval: "monthly" | "yearly") {
    if (!club) return;
    setRedirecting(interval);
    setBillingError(null);
    try {
      const { url } = await createCheckoutSession({ clubId: club.clubId, interval });
      window.location.href = url;
    } catch (err) {
      setBillingError((err as { message?: string })?.message ?? "Checkout fehlgeschlagen.");
      setRedirecting(null);
    }
  }

  async function handleManageSubscription() {
    if (!club) return;
    setRedirecting("portal");
    setBillingError(null);
    try {
      const { url } = await createBillingPortalSession({ clubId: club.clubId });
      window.location.href = url;
    } catch (err) {
      setBillingError((err as { message?: string })?.message ?? "Konnte nicht geöffnet werden.");
      setRedirecting(null);
    }
  }

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

        {role === "clubAdmin" && isExpired && (
          <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-4">
            <p className="text-sm font-medium text-gray-700">Jetzt upgraden</p>
            <div className="flex gap-3">
              <Button onClick={() => handleUpgrade("monthly")} disabled={redirecting !== null}>
                {redirecting === "monthly" ? "Wird geöffnet …" : "CHF 9.–/Monat"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleUpgrade("yearly")}
                disabled={redirecting !== null}
              >
                {redirecting === "yearly" ? "Wird geöffnet …" : "CHF 99.–/Jahr"}
              </Button>
            </div>
            {billingError && <p className="text-sm text-red-600">{billingError}</p>}
          </div>
        )}

        {role === "clubAdmin" && isPaid && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <Button
              variant="secondary"
              onClick={handleManageSubscription}
              disabled={redirecting !== null}
            >
              {redirecting === "portal" ? "Wird geöffnet …" : "Abo verwalten"}
            </Button>
            {billingError && <p className="mt-2 text-sm text-red-600">{billingError}</p>}
          </div>
        )}
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
