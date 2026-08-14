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

const nextConfig: NextConfig = {
  // Local browser-automation tooling hits the dev server via 127.0.0.1
  // rather than localhost — without this, Next.js silently blocks the
  // dev-resource requests (HMR etc.) from that origin.
  allowedDevOrigins: ["127.0.0.1"],
  env: {
    NEXT_PUBLIC_BUILD_SHA: gitShortSha(),
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  // /agb and /datenschutz were the routes' original (German) slugs, already
  // live in production — permanent redirects so any bookmark/indexed link
  // to the old URL still lands on the renamed English-slug page.
  async redirects() {
    return [
      { source: "/agb", destination: "/terms-of-service", permanent: true },
      { source: "/datenschutz", destination: "/privacy-policy", permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);
