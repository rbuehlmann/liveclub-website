import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, auth } from "../firebaseAdmin";
import { sendMail } from "../lib/mailer";
import { smtpPassword } from "../lib/secrets";
import { getTemplate, renderTemplate } from "../lib/emailTemplates";

const SITE_ORIGIN = "https://liveclub.app";

/**
 * Sends the "confirm your email" message via our own SMTP (see
 * lib/mailer.ts) instead of Firebase Auth's built-in sendEmailVerification,
 * which sends from Firebase's own domain with a generic English template —
 * inconsistent with every other transactional email in the app, which all
 * go through no-reply@liveclub.app. Called by the client right after
 * registerWithEmail() creates the account.
 *
 * The verification *link* itself still opens Firebase's own hosted action
 * page (building a fully custom /verify-email page is a separate, bigger
 * scope) — only the *email* is now ours. continueUrl brings the user back
 * to our own login page once Firebase's page finishes.
 */
export const sendVerificationEmail = onCall(
  { secrets: [smtpPassword] },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");
    }
    const email = request.auth.token.email;
    if (!email) {
      throw new HttpsError("failed-precondition", "Kein E-Mail-Adresse am Konto.");
    }

    const verificationUrl = await auth.generateEmailVerificationLink(email, {
      url: `${SITE_ORIGIN}/login`,
    });

    const displayName = request.auth.token.name ?? "";
    const vars = { displayName, verificationUrl };
    const template = await getTemplate(db, "emailVerification");
    await sendMail({
      to: email,
      subject: renderTemplate(template.subject, vars),
      html: renderTemplate(template.html, vars),
    });

    return { ok: true };
  }
);
