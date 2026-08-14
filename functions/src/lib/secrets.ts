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
// go in functions/.env.local.
export const stripePriceIdMonthly = defineString("STRIPE_PRICE_ID_MONTHLY");
export const stripePriceIdYearly = defineString("STRIPE_PRICE_ID_YEARLY");
