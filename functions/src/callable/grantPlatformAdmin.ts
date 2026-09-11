import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";

// Bootstrap for the one real platform operator account — everyone else is
// refused, in every environment including production. Unlike
// devGrantPlatformAdmin (emulator-only, unrestricted, for testing arbitrary
// accounts locally), this is the real production path to reach /admin the
// very first time, before any other admin exists to invite you.
const ALLOWED_EMAILS = ["raffael.buehlmann@gmail.com"];

// Gmail (and most providers) ignore a "+anything" suffix on the local part
// for delivery — raffael.buehlmann+basketballtest@gmail.com still lands in
// the same inbox as the base address. Stripping it before comparing lets
// the one real admin register throwaway test accounts (2026-09-11 — e.g.
// one per sport, to test the new multi-sport onboarding gate without
// needing a fresh real mailbox each time) that still self-grant admin
// access, without opening this up to anyone else's email address.
function stripPlusAlias(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return `${local.split("+")[0]}@${domain}`;
}

export const grantPlatformAdmin = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");
  }
  const email = request.auth.token.email?.toLowerCase();
  if (!email || !ALLOWED_EMAILS.includes(stripPlusAlias(email))) {
    throw new HttpsError("permission-denied", "Kein Zugriff.");
  }

  await getAuth().setCustomUserClaims(request.auth.uid, { platformAdmin: true });
  return { ok: true };
});
