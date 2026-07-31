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

    const teamIds: string[] = invitation.teamIds ?? [];
    const memberRef = db
      .collection("clubs")
      .doc(invitation.clubId)
      .collection("members")
      .doc(uid);

    // All reads must happen before any writes in a Firestore transaction.
    const memberSnap = await tx.get(memberRef);

    // A member re-invited to more teams keeps their existing role and just
    // gains the new team assignments — never downgrade an existing role.
    const effectiveRole = memberSnap.exists ? memberSnap.data()!.role : invitation.role;

    if (memberSnap.exists) {
      tx.update(memberRef, {
        ...(teamIds.length > 0 ? { teamIds: FieldValue.arrayUnion(...teamIds) } : {}),
        email: request.auth?.token.email ?? null,
        displayName: request.auth?.token.name ?? null,
      });
    } else {
      tx.set(memberRef, {
        role: invitation.role,
        teamIds,
        email: request.auth?.token.email ?? null,
        displayName: request.auth?.token.name ?? null,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    tx.set(
      db.collection("users").doc(uid),
      {
        clubIds: FieldValue.arrayUnion(invitation.clubId),
        clubRoles: { [invitation.clubId]: effectiveRole },
        ...(teamIds.length > 0
          ? { clubTeamIds: { [invitation.clubId]: FieldValue.arrayUnion(...teamIds) } }
          : {}),
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
