import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin";

interface AcceptInvitationRequest {
  invitationId: string;
}

export const acceptInvitation = onCall<AcceptInvitationRequest>(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");
  }
  const uid = request.auth.uid;
  const { invitationId } = request.data;
  if (typeof invitationId !== "string" || !invitationId) {
    throw new HttpsError("invalid-argument", "invitationId fehlt.");
  }

  const invitationRef = db.collection("invitations").doc(invitationId);

  await db.runTransaction(async (tx) => {
    const invitationSnap = await tx.get(invitationRef);
    if (!invitationSnap.exists) {
      throw new HttpsError("not-found", "Einladung wurde nicht gefunden.");
    }
    const invitation = invitationSnap.data()!;

    if (invitation.status !== "pending") {
      throw new HttpsError("failed-precondition", "Diese Einladung wurde bereits verwendet.");
    }
    const expiresAt = invitation.expiresAt as Timestamp | undefined;
    if (expiresAt && expiresAt.toMillis() < Date.now()) {
      throw new HttpsError("failed-precondition", "Diese Einladung ist abgelaufen.");
    }
    const targetEmail = (invitation.email as string | undefined)?.toLowerCase();
    const authEmail = request.auth?.token.email?.toLowerCase();
    if (targetEmail && authEmail && targetEmail !== authEmail) {
      throw new HttpsError(
        "permission-denied",
        "Diese Einladung ist für eine andere E-Mail-Adresse bestimmt."
      );
    }

    const memberRef = db
      .collection("clubs")
      .doc(invitation.clubId)
      .collection("members")
      .doc(uid);

    tx.set(memberRef, {
      role: invitation.role,
      email: request.auth?.token.email ?? null,
      displayName: request.auth?.token.name ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });

    tx.set(
      db.collection("users").doc(uid),
      {
        clubIds: FieldValue.arrayUnion(invitation.clubId),
        clubRoles: { [invitation.clubId]: invitation.role },
      },
      { merge: true }
    );

    tx.update(invitationRef, {
      status: "accepted",
      acceptedBy: uid,
      acceptedAt: FieldValue.serverTimestamp(),
    });
  });

  return { ok: true };
});
