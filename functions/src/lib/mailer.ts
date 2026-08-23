import nodemailer from "nodemailer";
import { db } from "../firebaseAdmin";
import { smtpPassword } from "./secrets";

const SMTP_HOST = "mail.infomaniak.com";
const SMTP_PORT = 587;
const SMTP_USER = "no-reply@liveclub.app";
const FROM_ADDRESS = "LiveClub <no-reply@liveclub.app>";

// Where internal copies of club-deactivated/club-deleted notifications go.
// Placeholder single address for now — will move to a real team inbox later.
export const LIVECLUB_TEAM_EMAIL = "raffael.buehlmann@gmail.com";

// The public /support form's destination — a real inbox distinct from
// LIVECLUB_TEAM_EMAIL above (that one's for internal ops notifications,
// this one's the address users are told to expect a reply from).
export const LIVECLUB_SUPPORT_EMAIL = "support@liveclub.app";

// Read fresh on every send rather than cached — an admin editing Header &
// Footer in /admin/mail-templates expects it to apply immediately, not
// after the next cold start. Volume here is low (transactional emails, not
// bulk), so the extra read per send is negligible.
async function fetchEmailLayout(): Promise<{ headerHtml: string; footerHtml: string }> {
  const snap = await db.collection("settings").doc("emailLayout").get();
  const data = snap.data();
  return {
    headerHtml: (data?.headerHtml as string | undefined) ?? "",
    footerHtml: (data?.footerHtml as string | undefined) ?? "",
  };
}

export async function sendMail(input: { to: string; subject: string; html: string }) {
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false, // STARTTLS on 587, not implicit TLS
    auth: {
      user: SMTP_USER,
      pass: smtpPassword.value(),
    },
  });

  const { headerHtml, footerHtml } = await fetchEmailLayout();

  await transporter.sendMail({
    from: FROM_ADDRESS,
    to: input.to,
    subject: input.subject,
    html: `${headerHtml}${input.html}${footerHtml}`,
  });
}
