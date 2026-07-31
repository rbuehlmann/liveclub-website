import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { db } from "../firebaseAdmin";

// Only one domain in production; simplest to hardcode rather than plumb an
// env var through for a single constant.
const SITE_ORIGIN = "https://liveclub.app";

const ROLE_LABELS: Record<string, string> = {
  clubAdmin: "Vereinsadmin",
  reporter: "Redaktor",
};

/**
 * Sends an invite email via the Firebase "Trigger Email" extension, which
 * watches the `mail` collection for new documents and sends them through
 * the configured SMTP connection. Only fires when the invite has an email
 * address — a "just copy this link" invite never had one.
 */
export const onInvitationCreate = onDocumentCreated(
  "invitations/{invitationId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const invitation = snap.data();
    const email = invitation.email as string | undefined;
    if (!email) return;

    const inviteUrl = `${SITE_ORIGIN}/invite/${event.params.invitationId}`;
    const roleLabel = ROLE_LABELS[invitation.role] ?? invitation.role;
    const clubName = invitation.clubName ?? "einem Verein";

    await db.collection("mail").add({
      to: [email],
      message: {
        subject: `Einladung zu ${clubName} auf LiveClub`,
        html: `
          <p>Hallo,</p>
          <p>Du wurdest als <strong>${roleLabel}</strong> zu <strong>${clubName}</strong> auf LiveClub eingeladen.</p>
          <p><a href="${inviteUrl}">Einladung annehmen</a></p>
          <p>Falls der Link nicht funktioniert, kopiere diese Adresse in deinen Browser:<br>${inviteUrl}</p>
        `,
      },
    });
  }
);
