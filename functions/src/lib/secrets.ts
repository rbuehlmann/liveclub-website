import { defineSecret, defineString } from "firebase-functions/params";

// Set via `firebase functions:secrets:set SMTP_PASSWORD` (run interactively
// by whoever owns the mailbox — never pass the value through a script).
export const smtpPassword = defineSecret("SMTP_PASSWORD");

// Set via `firebase functions:secrets:set STRIPE_SECRET_KEY` /
// `STRIPE_WEBHOOK_SECRET` — same reasoning as SMTP_PASSWORD, run
// interactively by whoever owns the Stripe account.
export const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
export const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

// Set via `firebase functions:secrets:set RECAPTCHA_SECRET_KEY` — the
// server-side key from a reCAPTCHA v3 site
// (https://www.google.com/recaptcha/admin), used to verify tokens the
// client widget produces (see lib/recaptcha.ts). The matching site key
// isn't needed here — it's embedded directly in client JS via
// NEXT_PUBLIC_RECAPTCHA_SITE_KEY (frontend env, not a functions param).
export const recaptchaSecretKey = defineSecret("RECAPTCHA_SECRET_KEY");

// Price IDs aren't sensitive (they're visible in Stripe Checkout URLs
// anyway), so they're plain params rather than secrets — set per
// environment via functions/.env.<project-id> (see Firebase's dotenv
// convention for 2nd-gen functions params), test-mode IDs for the emulator
// go in functions/.env.local. One pair per team-count tier (see
// LicenseTier in lib/license.ts) — team5's pair are the two prices that
// existed before the tier system, unchanged.
export const stripePriceIdTeam5Monthly = defineString("STRIPE_PRICE_ID_TEAM5_MONTHLY");
export const stripePriceIdTeam5Yearly = defineString("STRIPE_PRICE_ID_TEAM5_YEARLY");
export const stripePriceIdTeam15Monthly = defineString("STRIPE_PRICE_ID_TEAM15_MONTHLY");
export const stripePriceIdTeam15Yearly = defineString("STRIPE_PRICE_ID_TEAM15_YEARLY");
export const stripePriceIdUnlimitedMonthly = defineString("STRIPE_PRICE_ID_UNLIMITED_MONTHLY");
export const stripePriceIdUnlimitedYearly = defineString("STRIPE_PRICE_ID_UNLIMITED_YEARLY");

// Set via `firebase functions:secrets:set BACKFILL_LOGO_SECRET` — a
// throwaway random string only you know, gating the one-off
// adminBackfillLogoCacheControl HTTP endpoint (plain `onRequest`, not
// `onCall`, specifically so it's triggerable with a single `curl` command
// instead of needing a mocked auth context — see that file for why).
export const backfillLogoSecret = defineSecret("BACKFILL_LOGO_SECRET");

// Set via `firebase functions:secrets:set APNS_AUTH_KEY` — the .p8 private
// key content from an Apple Developer "Apple Push Notifications service
// (APNs)" key, used to sign Live Activity push-to-start/update/end
// requests (see lib/apns.ts). Never pass the value through a script.
export const apnsAuthKey = defineSecret("APNS_AUTH_KEY");

// Not sensitive on their own (they only matter paired with the private key
// above), so plain params — set per environment via functions/.env.<project-id>.
export const apnsKeyId = defineString("APNS_KEY_ID");
export const apnsTeamId = defineString("APNS_TEAM_ID");
// An APNs auth key is permanently locked to one environment when created in
// the Apple Developer portal — "sandbox" matches an app built with the
// `development` aps-environment entitlement (Xcode Debug builds run from
// source), "production" matches TestFlight/App Store builds. Switching
// requires a second key + a new APNS_KEY_ID/APNS_AUTH_KEY, not just this flag.
export const apnsEnvironment = defineString("APNS_ENVIRONMENT", { default: "sandbox" });
