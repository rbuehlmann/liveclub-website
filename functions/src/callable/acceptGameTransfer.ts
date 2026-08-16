import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin";
import { smtpPassword } from "../lib/secrets";
import { editorDisplayName, resolveEditorClubId, sendToEditorIfOptedIn } from "../lib/gameEditors";
import { getTemplate, renderTemplate } from "../lib/emailTemplates";

interface AcceptGameTransferRequest {
  gameId: string;
}

/**
 * Two ways this succeeds:
 * 1. A direct requestGameTransfer targeted the caller (pendingTransfer.toUid
 *    === caller) — the normal "current editor proposed, target confirms" path.
 * 2. No pendingTransfer exists, but the caller is eligible AND belongs to a
 *    *different* club than the current mainEditor — the scenario-4 broadcast
 *    case (createGame.ts already emailed every eligible opponent-side editor
 *    a takeover invite; whoever clicks first here just claims it, no
 *    separate approval step). This never applies within the same club —
 *    same-club handoff always goes through the direct request/accept path,
 *    so a bystander can never unilaterally kick out a colleague who's
 *    actively administering.
 *
 * Either way this is a Firestore transaction: reads mainEditorUid fresh and
 * writes atomically, so two people racing to accept the same broadcast
 * invite can't both "win".
 */
export const acceptGameTransfer = onCall<AcceptGameTransferRequest>(
  { secrets: [smtpPassword] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");
    }
    const uid = request.auth.uid;
    const { gameId } = request.data;
    if (typeof gameId !== "string" || !gameId) {
      throw new HttpsError("invalid-argument", "gameId fehlt.");
    }

    const gameRef = db.collection("games").doc(gameId);
    const newEditorDisplayName = await editorDisplayName(uid);

    const result = await db.runTransaction(async (tx) => {
      const gameSnap = await tx.get(gameRef);
      if (!gameSnap.exists) {
        throw new HttpsError("not-found", "Spiel nicht gefunden.");
      }
      const game = gameSnap.data()!;
      const previousEditorUid = game.mainEditorUid as string;
      const pendingTransfer = game.pendingTransfer as { toUid: string } | null | undefined;

      const isDirectTarget = pendingTransfer?.toUid === uid;
      const eligible: string[] = game.eligibleEditorUids ?? [];
      const newEditorClubId = await resolveEditorClubId(game, uid);
      const isBroadcastClaim =
        !pendingTransfer && eligible.includes(uid) && newEditorClubId !== game.mainEditorClubId;

      if (!isDirectTarget && !isBroadcastClaim) {
        throw new HttpsError(
          "failed-precondition",
          "Es liegt keine Übernahme-Einladung für dich vor."
        );
      }
      if (!newEditorClubId) {
        throw new HttpsError("permission-denied", "Du bist keinem der beiden Vereine zugeordnet.");
      }

      tx.update(gameRef, {
        mainEditorUid: uid,
        mainEditorClubId: newEditorClubId,
        mainEditorDisplayName: newEditorDisplayName,
        pendingTransfer: null,
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.set(gameRef.collection("editorHistory").doc(), {
        action: "accepted",
        byUid: uid,
        atUid: previousEditorUid,
        timestamp: FieldValue.serverTimestamp(),
      });

      return { previousEditorUid, homeTeamName: game.homeTeamName, awayTeamName: game.awayTeamName };
    });

    const vars = { homeTeamName: result.homeTeamName ?? "", awayTeamName: result.awayTeamName ?? "" };

    // Two distinct, separately opt-out-able notifications (see the
    // 2026-08-15 design's Mail-Einstellungen): "abgegeben" to whoever just
    // lost administration, "übernommen" to whoever just gained it — not the
    // same event from each side's point of view.
    const handedOffTemplate = await getTemplate(db, "gameHandedOff");
    const takenOverTemplate = await getTemplate(db, "gameTakenOver");
    await Promise.all([
      sendToEditorIfOptedIn(
        result.previousEditorUid,
        "gameHandedOff",
        renderTemplate(handedOffTemplate.subject, vars),
        renderTemplate(handedOffTemplate.html, vars)
      ),
      sendToEditorIfOptedIn(
        uid,
        "gameTakenOver",
        renderTemplate(takenOverTemplate.subject, vars),
        renderTemplate(takenOverTemplate.html, vars)
      ),
    ]);

    return { ok: true };
  }
);
