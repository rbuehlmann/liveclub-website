import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin";

interface DeclineGameTransferRequest {
  gameId: string;
}

/** Only clears a direct (targeted) pendingTransfer — a broadcast invite
 * (scenario 4) has no single target to decline, whoever doesn't want it
 * simply doesn't accept. */
export const declineGameTransfer = onCall<DeclineGameTransferRequest>(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");
  }
  const { gameId } = request.data;
  if (typeof gameId !== "string" || !gameId) {
    throw new HttpsError("invalid-argument", "gameId fehlt.");
  }

  const gameRef = db.collection("games").doc(gameId);
  const gameSnap = await gameRef.get();
  if (!gameSnap.exists) {
    throw new HttpsError("not-found", "Spiel nicht gefunden.");
  }
  const game = gameSnap.data()!;
  const pendingTransfer = game.pendingTransfer as { toUid: string } | null | undefined;
  if (pendingTransfer?.toUid !== request.auth.uid) {
    throw new HttpsError("failed-precondition", "Es liegt keine Übernahme-Einladung für dich vor.");
  }

  await gameRef.update({ pendingTransfer: null, updatedAt: FieldValue.serverTimestamp() });
  await gameRef.collection("editorHistory").add({
    action: "declined",
    byUid: request.auth.uid,
    timestamp: FieldValue.serverTimestamp(),
  });

  return { ok: true };
});
