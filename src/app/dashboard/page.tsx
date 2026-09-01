"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { collection, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { useClubContext } from "@/components/club/ClubContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TeamIcon } from "@/components/TeamIcon";
import { daysRemaining, formatDateDe, formatDateTimeDe } from "@/lib/date";
import { createCheckoutSession, acceptGameTransfer } from "@/lib/firebase/functionsApi";
import { LICENSE_TIERS } from "@/lib/licenseTiers";
import { LicenseTier, GameStatus } from "@/lib/types";

const RENEWAL_WINDOW_DAYS = 14;
const UPCOMING_STATUSES = new Set<GameStatus>(["draft", "scheduled", "live", "paused"]);

interface DowngradePrompt {
  tier: LicenseTier;
  interval: "monthly" | "yearly";
  maxTeams: number;
  teams: { teamId: string; name: string }[];
}

interface ClaimableGame {
  gameId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeClubPublicId: string | null;
  awayClubPublicId: string | null;
  scheduledStart: string | null;
}

function mapClaimableGame(id: string, data: Record<string, unknown>): ClaimableGame {
  const scheduledStart = data.scheduledStart as { toDate?: () => Date } | undefined;
  return {
    gameId: id,
    homeTeamName: data.homeTeamName as string,
    awayTeamName: data.awayTeamName as string,
    homeClubPublicId: (data.homeClubPublicId as string | null) ?? null,
    awayClubPublicId: (data.awayClubPublicId as string | null) ?? null,
    scheduledStart: scheduledStart?.toDate?.().toISOString() ?? null,
  };
}

export default function DashboardOverviewPage() {
  const t = useTranslations("dashboard");
  const locale = useLocale() as "de" | "en";
  const { club, role } = useClubContext();
  const { user } = useAuth();
  const [redirecting, setRedirecting] = useState<`${LicenseTier}-monthly` | `${LicenseTier}-yearly` | null>(
    null
  );
  const [billingError, setBillingError] = useState<string | null>(null);
  const [claimableGames, setClaimableGames] = useState<ClaimableGame[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [downgradePrompt, setDowngradePrompt] = useState<DowngradePrompt | null>(null);
  const [keepTeamIds, setKeepTeamIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!club || !user) return;
    const { db } = getFirebaseClient();
    // Only games this specific user is actually allowed to claim — open
    // (mainEditorUid null) and their uid in eligibleEditorUids — so they
    // can accept with one click on login instead of hunting through the
    // full games list (2026-08-22 "sofort sichtbar" decision).
    const filterClaimable = (docs: { id: string; data: () => Record<string, unknown> }[]) =>
      docs
        .filter(
          (d) =>
            !d.data().mainEditorUid &&
            UPCOMING_STATUSES.has(d.data().status as GameStatus) &&
            ((d.data().eligibleEditorUids as string[] | undefined) ?? []).includes(user.uid)
        )
        .map((d) => mapClaimableGame(d.id, d.data()));
    let fromHome: ClaimableGame[] = [];
    let fromAway: ClaimableGame[] = [];
    const merge = () => {
      const byId = new Map<string, ClaimableGame>();
      for (const g of [...fromHome, ...fromAway]) byId.set(g.gameId, g);
      setClaimableGames(Array.from(byId.values()));
    };
    const unsubHome = onSnapshot(
      query(collection(db, "games"), where("homeClubId", "==", club.clubId)),
      (snap) => {
        fromHome = filterClaimable(snap.docs);
        merge();
      }
    );
    const unsubAway = onSnapshot(
      query(collection(db, "games"), where("awayClubId", "==", club.clubId)),
      (snap) => {
        fromAway = filterClaimable(snap.docs);
        merge();
      }
    );
    return () => {
      unsubHome();
      unsubAway();
    };
  }, [club, user]);

  async function handleClaim(gameId: string) {
    setClaimingId(gameId);
    setClaimError(null);
    try {
      await acceptGameTransfer(gameId);
    } catch (err) {
      setClaimError((err as { message?: string })?.message ?? t("claimFailed"));
    } finally {
      setClaimingId(null);
    }
  }

  if (!club) return null;

  const remaining = daysRemaining(club.currentLicenseValidUntil);
  const isTrial = club.currentLicenseType === "trial";
  const isSuspended = club.currentLicenseStatus === "suspended";
  const isActive = club.currentLicenseStatus === "active";
  const isExpired = !isSuspended && (!isActive || (remaining !== null && remaining < 0));
  // Same 14-day-before-expiry rule the server enforces (createCheckoutSession)
  // — shown here purely so the buttons don't appear only to then fail.
  const canBuy = !isSuspended && (isExpired || (remaining !== null && remaining <= RENEWAL_WINDOW_DAYS));

  async function startCheckout(tier: LicenseTier, interval: "monthly" | "yearly", keep?: string[]) {
    if (!club) return;
    setRedirecting(`${tier}-${interval}`);
    setBillingError(null);
    try {
      const { url } = await createCheckoutSession({ clubId: club.clubId, tier, interval, keepTeamIds: keep });
      window.location.href = url;
    } catch (err) {
      setBillingError((err as { message?: string })?.message ?? t("checkoutFailed"));
      setRedirecting(null);
    }
  }

  async function handleUpgrade(tier: LicenseTier, interval: "monthly" | "yearly") {
    if (!club) return;
    const tierInfo = LICENSE_TIERS.find((tt) => tt.id === tier);
    if (!tierInfo || tierInfo.maxTeams === null) {
      await startCheckout(tier, interval);
      return;
    }
    // A downgrade — the chosen tier's cap is below the club's current
    // active team count — needs the admin to pick which teams to keep
    // *before* checkout even opens, so ask first instead of finding out
    // server-side only after they've already been sent to Stripe
    // (2026-09-01).
    setBillingError(null);
    const { db } = getFirebaseClient();
    const snap = await getDocs(collection(db, "clubs", club.clubId, "teams"));
    const activeTeams = snap.docs
      .filter((d) => d.data().archived !== true)
      .map((d) => ({ teamId: d.id, name: d.data().name as string }));
    if (activeTeams.length <= tierInfo.maxTeams) {
      await startCheckout(tier, interval);
      return;
    }
    setKeepTeamIds(new Set());
    setDowngradePrompt({ tier, interval, maxTeams: tierInfo.maxTeams, teams: activeTeams });
  }

  function toggleKeepTeam(teamId: string) {
    if (!downgradePrompt) return;
    setKeepTeamIds((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else if (next.size < downgradePrompt.maxTeams) {
        next.add(teamId);
      }
      return next;
    });
  }

  async function handleConfirmDowngrade() {
    if (!downgradePrompt || keepTeamIds.size !== downgradePrompt.maxTeams) return;
    const { tier, interval } = downgradePrompt;
    setDowngradePrompt(null);
    await startCheckout(tier, interval, Array.from(keepTeamIds));
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{club.name}</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">{club.sport}</p>

        {isSuspended ? (
          <div className="mt-4 rounded-lg bg-red-50 p-4 dark:bg-red-500/10">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">{t("suspendedNotice")}</p>
            <p className="mt-1 text-sm text-red-700 dark:text-red-400">
              {t.rich("suspendedContact", {
                link: (chunks) => (
                  <Link href="/support" className="underline">
                    {chunks}
                  </Link>
                ),
              })}
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
                    : `${t("licenseStatusActive")} · ${
                        t.has(`licenseTiers.${club.currentLicenseTier}`)
                          ? t(`licenseTiers.${club.currentLicenseTier}`)
                          : "–"
                      }`}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t("validUntil", { date: formatDateDe(club.currentLicenseValidUntil, locale) })}
              </p>
            </div>

            {role === "clubAdmin" && canBuy && (
              <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 dark:border-white/10 pt-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {isExpired ? t("buyNow") : t("renewNow")}
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {LICENSE_TIERS.map((tierInfo) => (
                    <div
                      key={tierInfo.id}
                      className="flex flex-col gap-2 rounded-lg border border-gray-200 p-4 dark:border-white/10"
                    >
                      <p className="font-semibold text-gray-900 dark:text-white">{t(`licenseTiers.${tierInfo.id}`)}</p>
                      <Button
                        onClick={() => handleUpgrade(tierInfo.id, "monthly")}
                        disabled={redirecting !== null}
                      >
                        {redirecting === `${tierInfo.id}-monthly`
                          ? t("opening")
                          : t("priceMonthly", { price: tierInfo.monthlyPrice })}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handleUpgrade(tierInfo.id, "yearly")}
                        disabled={redirecting !== null}
                      >
                        {redirecting === `${tierInfo.id}-yearly`
                          ? t("opening")
                          : t("priceYearly", { price: tierInfo.yearlyPrice })}
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">{t("oneTimePaymentNotice")}</p>
                {billingError && <p className="text-sm text-red-600">{billingError}</p>}
              </div>
            )}

            {role === "clubAdmin" && !canBuy && isActive && remaining !== null && (
              <p className="mt-4 border-t border-gray-100 dark:border-white/10 pt-4 text-xs text-gray-400 dark:text-gray-500">
                {t("renewalAvailableFrom", {
                  date: formatDateDe(
                    new Date(Date.now() + (remaining - RENEWAL_WINDOW_DAYS) * 24 * 60 * 60 * 1000).toISOString(),
                    locale
                  ),
                  days: RENEWAL_WINDOW_DAYS,
                })}
              </p>
            )}
          </>
        )}
      </Card>

      {claimableGames.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-500/20">
          <p className="font-medium text-amber-800 dark:text-amber-300">
            {t("claimableGamesBanner", { count: claimableGames.length })}
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {claimableGames.map((game) => (
              <div
                key={game.gameId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-500/10"
              >
                <div className="flex items-center gap-2 text-sm text-amber-900 dark:text-amber-200">
                  <TeamIcon publicClubId={game.homeClubPublicId} teamName={game.homeTeamName} size={20} />
                  <span>
                    {game.homeTeamName} – {game.awayTeamName}
                  </span>
                  <TeamIcon publicClubId={game.awayClubPublicId} teamName={game.awayTeamName} size={20} />
                  <span className="text-amber-700/70 dark:text-amber-400/70">
                    · {formatDateTimeDe(game.scheduledStart, locale)}
                  </span>
                </div>
                <Button
                  type="button"
                  disabled={claimingId === game.gameId}
                  onClick={() => handleClaim(game.gameId)}
                >
                  {claimingId === game.gameId ? t("claiming") : t("claim")}
                </Button>
              </div>
            ))}
          </div>
          {claimError && <p className="mt-2 text-sm text-red-600">{claimError}</p>}
        </Card>
      )}

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

      {downgradePrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex max-h-[90vh] w-full max-w-sm flex-col rounded-xl bg-white p-6 shadow-lg dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("downgradeTitle")}</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {t("downgradeBody", { max: downgradePrompt.maxTeams })}
            </p>
            <div className="mt-4 flex flex-col gap-1 overflow-y-auto">
              {downgradePrompt.teams.map((team) => (
                <label
                  key={team.teamId}
                  className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
                >
                  <input
                    type="checkbox"
                    checked={keepTeamIds.has(team.teamId)}
                    onChange={() => toggleKeepTeam(team.teamId)}
                    disabled={!keepTeamIds.has(team.teamId) && keepTeamIds.size >= downgradePrompt.maxTeams}
                  />
                  {team.name}
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs font-medium text-gray-500 dark:text-gray-400">
              {t("downgradeSelectedCount", { count: keepTeamIds.size, max: downgradePrompt.maxTeams })}
            </p>
            {billingError && <p className="mt-2 text-sm text-red-600">{billingError}</p>}
            <div className="mt-4 flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setDowngradePrompt(null)}>
                {t("downgradeCancel")}
              </Button>
              <Button
                fullWidth
                onClick={handleConfirmDowngrade}
                disabled={keepTeamIds.size !== downgradePrompt.maxTeams || redirecting !== null}
              >
                {redirecting !== null ? t("opening") : t("downgradeConfirm")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
