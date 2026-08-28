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
