import { execSync } from "child_process";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Captured once, at build time, so the deployed admin area can show exactly
// which commit is actually live — Infomaniak's build doesn't always pull
// what you expect (see the currentLiveGameIdByTeam deploy saga), so this is
// a way to check "am I really looking at the latest version?" without
// guessing from memory.
function gitShortSha(): string {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "unknown";
  }
}

// Same motivation as gitShortSha above, one level deeper — /admin/changelog
// (2026-08-26) shows this so "what changed since I last looked" doesn't
// need a separate trip to GitHub. Subject lines only (not full bodies) to
// keep the env value small; %x1f/%x1e are unit/record separators, unlikely
// to collide with anything a commit message would contain, so this doesn't
// need real CSV/JSON quoting.
function gitLog(count: number): { sha: string; date: string; subject: string }[] {
  try {
    const raw = execSync(`git log -${count} --pretty=format:%h%x1f%aI%x1f%s%x1e`).toString();
    return raw
      .split("\x1e")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [sha, date, subject] = line.split("\x1f");
        return { sha, date, subject };
      });
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  // Local browser-automation tooling hits the dev server via 127.0.0.1
  // rather than localhost — without this, Next.js silently blocks the
  // dev-resource requests (HMR etc.) from that origin.
  allowedDevOrigins: ["127.0.0.1"],
  env: {
    NEXT_PUBLIC_BUILD_SHA: gitShortSha(),
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    NEXT_PUBLIC_BUILD_LOG: JSON.stringify(gitLog(30)),
  },
  // /agb and /datenschutz were the routes' original (German) slugs, already
  // live in production — permanent redirects so any bookmark/indexed link
  // to the old URL still lands on the renamed English-slug page.
  //
  // The old standalone /support page (FAQ + contact form) was folded into
  // the docs center (2026-08-28) — that center now lives at /support itself
  // (not /help; "help" reads wrong as a public-facing URL), with a "still
  // need help, email us" fallback on every page. /help redirects to /support
  // for anyone who saw it there briefly. Both locale variants need their own
  // entry since German is unprefixed ("as-needed" locale prefix, see
  // src/i18n/routing.ts) while English is not.
  // Next's default Cache-Control for prerendered pages is
  // `s-maxage=31536000` (1 year) with no stale-while-revalidate — correct
  // only if something automatically purges every intermediary cache on
  // deploy, which is how Vercel's own edge network behaves. Nothing does
  // that here (plain `next start` behind Infomaniak's reverse proxy), so
  // that header lets a stale HTML shell — referencing hashed JS/CSS
  // filenames a later deploy has already deleted — linger in any shared
  // cache along the way (a corporate network, an ISP, Infomaniak's own
  // proxy) long after a redeploy. 2026-08-30: a machine that had *never*
  // visited before still got a broken, unstyled page — consistent with a
  // shared cache serving a stale response, not a per-visitor browser-cache
  // issue. max-age=0 forces revalidation on every request instead — cheap
  // thanks to the ETag Next already sends (a 304 when nothing changed),
  // and guarantees the very next request after a deploy gets current HTML.
  // Scoped to actual page routes only — /_next/* keeps its own correct
  // long-lived immutable caching for content-hashed asset files, and
  // /api/* isn't a page response at all.
  async headers() {
    return [
      {
        source: "/((?!_next|api).*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/agb", destination: "/terms-of-service", permanent: true },
      { source: "/datenschutz", destination: "/privacy-policy", permanent: true },
      { source: "/help", destination: "/support", permanent: true },
      { source: "/help/:path*", destination: "/support/:path*", permanent: true },
      { source: "/en/help", destination: "/en/support", permanent: true },
      { source: "/en/help/:path*", destination: "/en/support/:path*", permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);
