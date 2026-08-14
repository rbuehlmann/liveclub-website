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
