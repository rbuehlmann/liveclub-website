"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useClubContext } from "@/components/club/ClubContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { daysRemaining, formatDateDe } from "@/lib/date";
import { createCheckoutSession } from "@/lib/firebase/functionsApi";
import { LICENSE_TIERS, tierLabel } from "@/lib/licenseTiers";
import { LicenseTier } from "@/lib/types";

const RENEWAL_WINDOW_DAYS = 14;

export default function DashboardOverviewPage() {
  const t = useTranslations("dashboard");
  const { club, role } = useClubContext();
  const [redirecting, setRedirecting] = useState<`${LicenseTier}-monthly` | `${LicenseTier}-yearly` | null>(
    null
  );
  const [billingError, setBillingError] = useState<string | null>(null);

  if (!club) return null;

  const remaining = daysRemaining(club.currentLicenseValidUntil);
  const isTrial = club.currentLicenseType === "trial";
  const isSuspended = club.currentLicenseStatus === "suspended";
  const isActive = club.currentLicenseStatus === "active";
  const isExpired = !isSuspended && (!isActive || (remaining !== null && remaining < 0));
  // Same 14-day-before-expiry rule the server enforces (createCheckoutSession)
  // — shown here purely so the buttons don't appear only to then fail.
  const canBuy = !isSuspended && (isExpired || (remaining !== null && remaining <= RENEWAL_WINDOW_DAYS));

  async function handleUpgrade(tier: LicenseTier, interval: "monthly" | "yearly") {
    if (!club) return;
    setRedirecting(`${tier}-${interval}`);
    setBillingError(null);
    try {
      const { url } = await createCheckoutSession({ clubId: club.clubId, tier, interval });
      window.location.href = url;
    } catch (err) {
      setBillingError((err as { message?: string })?.message ?? "Checkout fehlgeschlagen.");
      setRedirecting(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{club.name}</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">{club.sport}</p>

        {isSuspended ? (
          <div className="mt-4 rounded-lg bg-red-50 p-4 dark:bg-red-500/10">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              Dieser Verein wurde manuell deaktiviert.
            </p>
            <p className="mt-1 text-sm text-red-700 dark:text-red-400">
              Bitte{" "}
              <Link href="/support" className="underline">
                kontaktiere den Support
              </Link>
              , um das zu klären.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-4 rounded-lg bg-brand-white p-4 dark:bg-white/5">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {isExpired
                  ? t("trialExpired")
                  : isTrial
                    ? t("trialEndsIn", { days: remaining ?? 0 })
                    : `${t("licenseStatusActive")} · ${tierLabel(club.currentLicenseTier)}`}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Gültig bis {formatDateDe(club.currentLicenseValidUntil)}
              </p>
            </div>

            {role === "clubAdmin" && canBuy && (
              <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 dark:border-white/10 pt-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {isExpired ? "Jetzt kaufen" : "Jetzt verlängern"}
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {LICENSE_TIERS.map((tierInfo) => (
                    <div
                      key={tierInfo.id}
                      className="flex flex-col gap-2 rounded-lg border border-gray-200 p-4 dark:border-white/10"
                    >
                      <p className="font-semibold text-gray-900 dark:text-white">{tierInfo.label}</p>
                      <Button
                        onClick={() => handleUpgrade(tierInfo.id, "monthly")}
                        disabled={redirecting !== null}
                      >
                        {redirecting === `${tierInfo.id}-monthly`
                          ? "Wird geöffnet …"
                          : `${tierInfo.monthlyPrice}/Monat`}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handleUpgrade(tierInfo.id, "yearly")}
                        disabled={redirecting !== null}
                      >
                        {redirecting === `${tierInfo.id}-yearly`
                          ? "Wird geöffnet …"
                          : `${tierInfo.yearlyPrice}/Jahr`}
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Einmalzahlung für die gewählte Laufzeit — kein Abo, keine automatische
                  Verlängerung.
                </p>
                {billingError && <p className="text-sm text-red-600">{billingError}</p>}
              </div>
            )}

            {role === "clubAdmin" && !canBuy && isActive && remaining !== null && (
              <p className="mt-4 border-t border-gray-100 dark:border-white/10 pt-4 text-xs text-gray-400 dark:text-gray-500">
                Verlängerung ab {formatDateDe(
                  new Date(
                    Date.now() + (remaining - RENEWAL_WINDOW_DAYS) * 24 * 60 * 60 * 1000
                  ).toISOString()
                )}{" "}
                möglich ({RENEWAL_WINDOW_DAYS} Tage vor Ablauf).
              </p>
            )}
          </>
        )}
      </Card>

      {role === "clubAdmin" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/dashboard/teams">
            <Card className="hover:border-brand-red/50">
              <h2 className="font-semibold text-gray-900 dark:text-white">{t("teams")}</h2>
            </Card>
          </Link>
          <Link href="/dashboard/games">
            <Card className="hover:border-brand-red/50">
              <h2 className="font-semibold text-gray-900 dark:text-white">{t("games")}</h2>
            </Card>
          </Link>
          <Link href="/dashboard/reporters">
            <Card className="hover:border-brand-red/50">
              <h2 className="font-semibold text-gray-900 dark:text-white">{t("reporters")}</h2>
            </Card>
          </Link>
          <Link href="/dashboard/share">
            <Card className="hover:border-brand-red/50">
              <h2 className="font-semibold text-gray-900 dark:text-white">{t("share")}</h2>
            </Card>
          </Link>
        </div>
      )}

      {role === "reporter" && (
        <Link href="/dashboard/games">
          <Card className="hover:border-brand-red/50">
            <h2 className="font-semibold text-gray-900 dark:text-white">{t("games")}</h2>
          </Card>
        </Link>
      )}
    </div>
  );
}
