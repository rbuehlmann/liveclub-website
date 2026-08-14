import { HttpsError } from "firebase-functions/v2/https";
import { recaptchaSecretKey } from "./secrets";

const MIN_SCORE = 0.5;

/**
 * Verifies a reCAPTCHA v3 token server-side against Google's siteverify
 * endpoint. Throws HttpsError on any failure (missing token, network
 * error, low score) so callers can just `await` it and continue — used to
 * gate every unauthenticated write endpoint (currently just
 * submitClubRecommendation; registration is next, see the
 * project-liveclub-club-recommendations memory note).
 */
export async function verifyRecaptcha(token: string | undefined): Promise<void> {
  if (!token) {
    throw new HttpsError("failed-precondition", "Captcha-Prüfung fehlt.");
  }

  const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret: recaptchaSecretKey.value(), response: token }),
  });
  const result = (await response.json()) as { success: boolean; score?: number };

  if (!result.success || (result.score ?? 0) < MIN_SCORE) {
    throw new HttpsError("permission-denied", "Captcha-Prüfung fehlgeschlagen.");
  }
}
