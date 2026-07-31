import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { sendMail } from "../lib/mailer";
import { smtpPassword } from "../lib/secrets";
import { getInviteTemplate, renderTemplate } from "../lib/emailTemplates";

const SITE_ORIGIN = "https://liveclub.app";

const ROLE_LABELS: Record<string, string> = {
  clubAdmin: "Vereinsadmin",
  reporter: "Redaktor",
};

/**
 * Sends an invite email directly via SMTP (see lib/mailer.ts) — not the
 * Firebase "Trigger Email" extension, since Firebase Extensions as a whole
 * are being sunset (no new installs after March 2027). Only fires when the
 * invite has an email address — a "just copy this link" invite never had
 * one. Subject/HTML come from settings/emailTemplates (editable in
 * /admin/settings), falling back to a built-in default.
 */
export const onInvitationCreate = onDocumentCreated(
  { document: "invitations/{invitationId}", secrets: [smtpPassword] },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const invitation = snap.data();
    const email = invitation.email as string | undefined;
    if (!email) return;

    const vars = {
      inviteUrl: `${SITE_ORIGIN}/invite/${event.params.invitationId}`,
      roleLabel: ROLE_LABELS[invitation.role] ?? invitation.role,
      clubName: invitation.clubName ?? "einem Verein",
    };

    const template = await getInviteTemplate();
    await sendMail({
      to: email,
      subject: renderTemplate(template.subject, vars),
      html: renderTemplate(template.html, vars),
    });
  }
);
