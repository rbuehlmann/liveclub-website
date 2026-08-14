import { onCall, HttpsError } from "firebase-functions/v2/https";
import { sendMail } from "../lib/mailer";
import { smtpPassword } from "../lib/secrets";
import { renderTemplate } from "../lib/emailTemplates";

interface SendTestEmailRequest {
  to: string;
  subject: string;
  html: string;
}

// Sample values so a test send renders the same placeholders a real invite
// would use, without needing a real invitation/club to exist.
const SAMPLE_VARS = {
  clubName: "FC Beispiel",
  roleLabel: "Redaktor",
  inviteUrl: "https://liveclub.app/invite/beispiel-id",
  reason: "Testgrund (Beispieltext)",
  country: "Schweiz",
  note: "Testnotiz (Beispieltext)",
  source: "Öffentliches Formular",
  referralCode: "ABCD1234",
  opponentClubName: "FC Gegenbeispiel",
  gameDate: "31.12.2026",
  displayName: "Max Muster",
  verificationUrl: "https://liveclub-app.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=beispiel",
  resetUrl: "https://liveclub-app.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=beispiel",
};

export const sendTestEmail = onCall<SendTestEmailRequest>(
  { secrets: [smtpPassword] },
  async (request) => {
    if (!request.auth || request.auth.token.platformAdmin !== true) {
      throw new HttpsError("permission-denied", "Nur für Plattform-Admins.");
    }
    const { to, subject, html } = request.data;
    if (!to || !subject || !html) {
      throw new HttpsError("invalid-argument", "to/subject/html erforderlich.");
    }

    await sendMail({
      to,
      subject: renderTemplate(subject, SAMPLE_VARS),
      html: renderTemplate(html, SAMPLE_VARS),
    });

    return { ok: true };
  }
);
