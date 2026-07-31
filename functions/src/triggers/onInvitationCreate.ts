import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { sendMail } from "../lib/mailer";
import { smtpPassword } from "../lib/secrets";

// Only one domain in production; simplest to hardcode rather than plumb an
// env var through for a single constant.
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
 * one.
 */
export const onInvitationCreate = onDocumentCreated(
  { document: "invitations/{invitationId}", secrets: [smtpPassword] },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const invitation = snap.data();
    const email = invitation.email as string | undefined;
    if (!email) return;

    const inviteUrl = `${SITE_ORIGIN}/invite/${event.params.invitationId}`;
    const roleLabel = ROLE_LABELS[invitation.role] ?? invitation.role;
    const clubName = invitation.clubName ?? "einem Verein";

    await sendMail({
      to: email,
      subject: `Einladung zu ${clubName} auf LiveClub`,
      html: `
        <p>Hallo,</p>
        <p>Du wurdest als <strong>${roleLabel}</strong> zu <strong>${clubName}</strong> auf LiveClub eingeladen.</p>
        <p><a href="${inviteUrl}">Einladung annehmen</a></p>
        <p>Falls der Link nicht funktioniert, kopiere diese Adresse in deinen Browser:<br>${inviteUrl}</p>
      `,
    });
  }
);
