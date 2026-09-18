"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { collection, onSnapshot } from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { useClubContext } from "@/components/club/ClubContext";
import { useBranding } from "@/components/layout/BrandingProvider";
import { buildClubUrl, buildEmbedUrl, buildTeamUrl } from "@/lib/publicRoutes";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Team } from "@/lib/types";
import {
  buildBadgeHtml,
  renderBadgeToCanvas,
  NEON_BACKGROUNDS,
  NeonBackground,
  BadgeSpec,
} from "@/lib/embedGenerator";

// Literal brand copy, deliberately not translated (the user asked for this
// exact English uppercase phrase regardless of site language).
const FOLLOW_US_TEXT = "FOLLOW US ON LIVECLUB";

type Tab = "feed" | "badge" | "flyer";
type FeedScope = "all" | "team";
type FeedTheme = "light" | "dark";
type Target = "club" | "team";

export default function SharePage() {
  const t = useTranslations("share");
  const tCommon = useTranslations("common");
  const { club } = useClubContext();
  const branding = useBranding();

  const [origin, setOrigin] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [tab, setTab] = useState<Tab>("feed");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [feedScope, setFeedScope] = useState<FeedScope>("all");
  const [feedTeamId, setFeedTeamId] = useState("");
  const [feedTheme, setFeedTheme] = useState<FeedTheme>("light");

  const [target, setTarget] = useState<Target>("club");
  const [targetTeamId, setTargetTeamId] = useState("");
  const [background, setBackground] = useState<NeonBackground>("lime");

  const [badgeHtml, setBadgeHtml] = useState<string | null>(null);
  const [badgeLoading, setBadgeLoading] = useState(false);
  const flyerCanvasContainerRef = useRef<HTMLDivElement>(null);
  const [flyerDataUrl, setFlyerDataUrl] = useState<string | null>(null);
  const [flyerGenerating, setFlyerGenerating] = useState(false);
  const [flyerError, setFlyerError] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!club) return;
    const { db } = getFirebaseClient();
    return onSnapshot(collection(db, "clubs", club.clubId, "teams"), (snap) => {
      setTeams(
        snap.docs.map((d) => ({
          teamId: d.id,
          clubId: club.clubId,
          publicTeamId: d.data().publicTeamId ?? null,
          name: d.data().name,
          shortName: d.data().shortName,
          sport: d.data().sport,
          active: d.data().active ?? true,
        }))
      );
    });
  }, [club]);

  const publicTeams = useMemo(() => teams.filter((tm) => tm.publicTeamId), [teams]);

  // Default both team pickers to the first available public team once
  // teams have loaded — otherwise "einzelnes Team" would start out pointing
  // at nothing.
  useEffect(() => {
    if (!feedTeamId && publicTeams[0]?.publicTeamId) setFeedTeamId(publicTeams[0].publicTeamId);
  }, [publicTeams, feedTeamId]);
  useEffect(() => {
    if (!targetTeamId && publicTeams[0]?.publicTeamId) setTargetTeamId(publicTeams[0].publicTeamId);
  }, [publicTeams, targetTeamId]);

  const targetTeam = publicTeams.find((tm) => tm.publicTeamId === targetTeamId) ?? null;
  const clubIconUrl = club?.logoUrl ?? branding.clubFallbackIconUrl ?? null;

  const targetUrl =
    club && origin
      ? target === "team" && targetTeam?.publicTeamId
        ? `${origin}${buildTeamUrl(targetTeam.publicTeamId)}`
        : `${origin}${buildClubUrl(club.publicClubId)}`
      : "";
  const targetName = target === "team" && targetTeam ? targetTeam.name : club?.name ?? "";

  const badgeSpec: BadgeSpec | null =
    club && targetUrl
      ? {
          targetUrl,
          targetName,
          clubIconUrl,
          background,
          followText: FOLLOW_US_TEXT,
        }
      : null;

  // Re-generate the badge HTML whenever its inputs change — QRCode.toDataURL
  // is async, so this can't just be a useMemo.
  useEffect(() => {
    if (!badgeSpec) {
      setBadgeHtml(null);
      return;
    }
    let cancelled = false;
    setBadgeLoading(true);
    buildBadgeHtml(badgeSpec)
      .then((html) => {
        if (!cancelled) setBadgeHtml(html);
      })
      .finally(() => {
        if (!cancelled) setBadgeLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // badgeSpec is a fresh object every render; compare its actual fields.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [badgeSpec?.targetUrl, badgeSpec?.targetName, badgeSpec?.clubIconUrl, badgeSpec?.background]);

  async function generateFlyer() {
    if (!badgeSpec) return;
    setFlyerGenerating(true);
    setFlyerError(null);
    try {
      const canvas = await renderBadgeToCanvas(badgeSpec);
      setFlyerDataUrl(canvas.toDataURL("image/png"));
    } catch (err) {
      setFlyerError((err as Error)?.message ?? t("flyerError"));
    } finally {
      setFlyerGenerating(false);
    }
  }

  // Auto-(re)generate the flyer preview whenever the tab is opened or its
  // inputs change — same reasoning as the badge HTML effect above.
  useEffect(() => {
    if (tab !== "flyer" || !badgeSpec) return;
    generateFlyer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, badgeSpec?.targetUrl, badgeSpec?.targetName, badgeSpec?.clubIconUrl, badgeSpec?.background]);

  async function copy(key: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  if (!club || !origin) return null;

  const feedEmbedSrc = `${origin}${buildEmbedUrl(club.publicClubId, {
    mode: "feed",
    scope: feedScope,
    teamId: feedScope === "team" ? feedTeamId : undefined,
    theme: feedTheme,
  })}`;
  const feedWidgetCode = `<div\n  class="liveclub-widget"\n  data-club-id="${club.publicClubId}"\n  data-mode="feed"\n  data-scope="${feedScope}"${
    feedScope === "team" ? `\n  data-team-id="${feedTeamId}"` : ""
  }\n  data-theme="${feedTheme}">\n</div>\n\n<script async src="${origin}/widget.js"></script>`;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t("title")}</h1>

      <div className="flex gap-1 rounded-lg bg-brand-silver/10 p-1 dark:bg-white/5">
        {(["feed", "badge", "flyer"] as Tab[]).map((tabId) => (
          <button
            key={tabId}
            type="button"
            onClick={() => setTab(tabId)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === tabId
                ? "bg-white text-gray-900 shadow-sm dark:bg-white/10 dark:text-white"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            {t(`tab.${tabId}`)}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {tab === "feed" && (
            <Card>
              <h2 className="mb-4 font-semibold text-gray-900 dark:text-white">{t("tab.feed")}</h2>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("feedScopeLabel")}
                  </label>
                  <select
                    value={feedScope}
                    onChange={(e) => setFeedScope(e.target.value as FeedScope)}
                    className="rounded-lg border border-gray-300 px-4 py-3 text-base dark:border-white/15 dark:bg-white/5 dark:text-white"
                  >
                    <option value="all">{t("feedScopeAll")}</option>
                    <option value="team" disabled={publicTeams.length === 0}>
                      {t("feedScopeTeam")}
                    </option>
                  </select>
                </div>
                {feedScope === "team" && (
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("feedTeamLabel")}
                    </label>
                    <select
                      value={feedTeamId}
                      onChange={(e) => setFeedTeamId(e.target.value)}
                      className="rounded-lg border border-gray-300 px-4 py-3 text-base dark:border-white/15 dark:bg-white/5 dark:text-white"
                    >
                      {publicTeams.map((tm) => (
                        <option key={tm.teamId} value={tm.publicTeamId as string}>
                          {tm.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("feedThemeLabel")}
                  </label>
                  <div className="flex gap-2">
                    {(["light", "dark"] as FeedTheme[]).map((themeId) => (
                      <button
                        key={themeId}
                        type="button"
                        onClick={() => setFeedTheme(themeId)}
                        className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium ${
                          feedTheme === themeId
                            ? "border-brand-red bg-brand-red/10 text-brand-red-link"
                            : "border-gray-300 text-gray-600 dark:border-white/15 dark:text-gray-300"
                        }`}
                      >
                        {t(themeId === "light" ? "feedThemeLight" : "feedThemeDark")}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <h3 className="mt-6 mb-2 font-semibold text-gray-900 dark:text-white">{t("widgetCode")}</h3>
              <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-100">
                {feedWidgetCode}
              </pre>
              <Button variant="secondary" className="mt-3" onClick={() => copy("feedWidget", feedWidgetCode)}>
                {copiedKey === "feedWidget" ? tCommon("linkCopied") : tCommon("copyLink")}
              </Button>
            </Card>
          )}

          {(tab === "badge" || tab === "flyer") && (
            <Card>
              <h2 className="mb-4 font-semibold text-gray-900 dark:text-white">{t(`tab.${tab}`)}</h2>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("targetLabel")}
                  </label>
                  <select
                    value={target}
                    onChange={(e) => setTarget(e.target.value as Target)}
                    className="rounded-lg border border-gray-300 px-4 py-3 text-base dark:border-white/15 dark:bg-white/5 dark:text-white"
                  >
                    <option value="club">{t("targetClub")}</option>
                    <option value="team" disabled={publicTeams.length === 0}>
                      {t("targetTeam")}
                    </option>
                  </select>
                </div>
                {target === "team" && (
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("feedTeamLabel")}
                    </label>
                    <select
                      value={targetTeamId}
                      onChange={(e) => setTargetTeamId(e.target.value)}
                      className="rounded-lg border border-gray-300 px-4 py-3 text-base dark:border-white/15 dark:bg-white/5 dark:text-white"
                    >
                      {publicTeams.map((tm) => (
                        <option key={tm.teamId} value={tm.publicTeamId as string}>
                          {tm.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("backgroundLabel")}
                  </label>
                  <div className="flex gap-2">
                    {NEON_BACKGROUNDS.map((bg) => (
                      <button
                        key={bg.id}
                        type="button"
                        aria-label={bg.label}
                        onClick={() => setBackground(bg.id)}
                        style={{ background: bg.hex }}
                        className={`h-10 w-10 rounded-full ring-offset-2 ${
                          background === bg.id ? "ring-2 ring-brand-red" : "ring-1 ring-gray-300 dark:ring-white/20"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {tab === "badge" && (
                <>
                  <h3 className="mt-6 mb-2 font-semibold text-gray-900 dark:text-white">{t("widgetCode")}</h3>
                  {badgeLoading || !badgeHtml ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{tCommon("loading")}</p>
                  ) : (
                    <>
                      <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-100">
                        {badgeHtml}
                      </pre>
                      <Button variant="secondary" className="mt-3" onClick={() => copy("badge", badgeHtml)}>
                        {copiedKey === "badge" ? tCommon("linkCopied") : tCommon("copyLink")}
                      </Button>
                    </>
                  )}
                </>
              )}

              {tab === "flyer" && (
                <div className="mt-6 flex flex-col gap-3">
                  {flyerError && <p className="text-sm text-red-600">{flyerError}</p>}
                  <Button onClick={generateFlyer} disabled={flyerGenerating}>
                    {flyerGenerating ? tCommon("loading") : t("regenerateFlyer")}
                  </Button>
                  {flyerDataUrl && (
                    <a href={flyerDataUrl} download="liveclub-follow-us.png">
                      <Button variant="secondary" fullWidth>
                        {t("downloadFlyer")}
                      </Button>
                    </a>
                  )}
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <Card>
            <h2 className="mb-4 font-semibold text-gray-900 dark:text-white">{t("previewLabel")}</h2>
            {tab === "feed" && (
              <iframe
                key={feedEmbedSrc}
                src={feedEmbedSrc}
                title="LiveClub"
                className="w-full rounded-lg border border-gray-200 dark:border-white/10"
                style={{ height: 340 }}
              />
            )}
            {tab === "badge" &&
              (badgeHtml ? (
                <div className="flex justify-center" dangerouslySetInnerHTML={{ __html: badgeHtml }} />
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">{tCommon("loading")}</p>
              ))}
            {tab === "flyer" && (
              <div ref={flyerCanvasContainerRef} className="flex justify-center">
                {flyerDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={flyerDataUrl} alt={t("downloadFlyer")} className="w-full max-w-[280px] rounded-lg" />
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{tCommon("loading")}</p>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
