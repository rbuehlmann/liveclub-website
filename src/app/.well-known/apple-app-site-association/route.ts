import { NextResponse } from "next/server";

// Same Apple Developer Team ID already used for APNs (see
// functions/.env.liveclub-app's APNS_TEAM_ID / functions/src/lib/secrets.ts's
// apnsTeamId) — Apple issues one Team ID per developer account, so it's the
// same value here as the appID prefix.
const APPLE_TEAM_ID = "TYW4PTG64P";
// Matches the iOS app's bundle id (see functions/src/lib/apns.ts).
const BUNDLE_ID = "dev.oryno.liveclub";

// Universal Links path config (2026-08-22 decision) — evaluated top to
// bottom, first match wins. Every top-level STATIC route under src/app/
// must stay excluded here, or iOS will try (and fail) to hand that link to
// the app instead of Safari — add a "NOT /new-route" line whenever a new
// one is added. Left over after exclusions: "/team/*" (src/app/team/
// [publicTeamId]) and "/*" (src/app/[publicClubId], the club page — a
// single dynamic top-level segment, so it has to be the catch-all).
const PATHS = [
  "NOT /admin/*",
  "NOT /dashboard/*",
  "NOT /embed/*",
  "NOT /impressum",
  "NOT /invite/*",
  "NOT /login",
  "NOT /onboarding/*",
  "NOT /privacy-policy",
  "NOT /register",
  "NOT /suche",
  "NOT /support",
  "NOT /terms-of-service",
  "NOT /verein-empfehlen",
  "NOT /.well-known/*",
  "/team/*",
  "/*",
];

export async function GET() {
  return NextResponse.json(
    {
      applinks: {
        apps: [],
        details: [
          {
            appID: `${APPLE_TEAM_ID}.${BUNDLE_ID}`,
            paths: PATHS,
          },
        ],
      },
    },
    { headers: { "Content-Type": "application/json" } }
  );
}
