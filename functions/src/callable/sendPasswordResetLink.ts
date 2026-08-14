import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, auth } from "../firebaseAdmin";
import { sendMail } from "../lib/mailer";
import { smtpPassword } from "../lib/secrets";
import { getTemplate, renderTemplate } from "../lib/emailTemplates";

const SITE_ORIGIN = "https://liveclub.app";

interface SendPasswordResetLinkRequest {
  email: string;
}

/**
 * Sends the password-reset message via our own SMTP instead of Firebase
 * Auth's built-in sendPasswordResetEmail — same reasoning as
 * sendVerificationEmail.ts. Unauthenticated by nature (the whole point is
 * the user is locked out) — always returns { ok: true } regardless of
 * whether the address matches an account, so this can't be used to probe
 * which emails are registered (matches Firebase's own client-side
 * behavior, which never reveals that either).
 */
export const sendPasswordResetLink = onCall<SendPasswordResetLinkRequest>(
  { secrets: [smtpPassword] },
  async (request) => {
    const email = request.data?.email?.trim();
    if (!email) {
      throw new HttpsError("invalid-argument", "E-Mail-Adresse fehlt.");
    }

    try {
      const resetUrl = await auth.generatePasswordResetLink(email, {
        url: `${SITE_ORIGIN}/login`,
      });
      const template = await getTemplate(db, "passwordReset");
      const vars = { resetUrl };
      await sendMail({
        to: email,
        subject: renderTemplate(template.subject, vars),
        html: renderTemplate(template.html, vars),
      });
    } catch {
      // No such user, or link generation failed — swallow silently so the
      // response never differs based on whether the address exists.
    }

    return { ok: true };
  }
);
