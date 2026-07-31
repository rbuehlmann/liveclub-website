import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Local browser-automation tooling hits the dev server via 127.0.0.1
  // rather than localhost — without this, Next.js silently blocks the
  // dev-resource requests (HMR etc.) from that origin.
  allowedDevOrigins: ["127.0.0.1"],
};

export default withNextIntl(nextConfig);
