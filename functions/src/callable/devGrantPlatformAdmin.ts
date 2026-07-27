import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";

/**
 * Local-development-only bootstrap: lets the currently signed-in user grant
 * themselves the platformAdmin custom claim, so the admin area can be
 * reached without a manual `firebase auth:import`/Admin SDK script. Refuses
 * to run anywhere the Functions emulator isn't detected.
 */
export const devGrantPlatformAdmin = onCall(async (request) => {
  if (process.env.FUNCTIONS_EMULATOR !== "true") {
    throw new HttpsError(
      "failed-precondition",
      "Nur in der lokalen Emulator-Umgebung verfügbar."
    );
  }
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");
  }

  await getAuth().setCustomUserClaims(request.auth.uid, { platformAdmin: true });

  return { ok: true };
});
