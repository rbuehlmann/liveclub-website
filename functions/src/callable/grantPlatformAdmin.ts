import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";

// Bootstrap for the one real platform operator account — everyone else is
// refused, in every environment including production. Unlike
// devGrantPlatformAdmin (emulator-only, unrestricted, for testing arbitrary
// accounts locally), this is the real production path to reach /admin the
// very first time, before any other admin exists to invite you.
const ALLOWED_EMAILS = ["raffael.buehlmann@gmail.com"];

export const grantPlatformAdmin = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");
  }
  const email = request.auth.token.email?.toLowerCase();
  if (!email || !ALLOWED_EMAILS.includes(email)) {
    throw new HttpsError("permission-denied", "Kein Zugriff.");
  }

  await getAuth().setCustomUserClaims(request.auth.uid, { platformAdmin: true });
  return { ok: true };
});
