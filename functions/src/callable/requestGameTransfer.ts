import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin";
import { smtpPassword } from "../lib/secrets";
import { sendToEditorIfOptedIn } from "../lib/gameEditors";
import { getTemplate, renderTemplate } from "../lib/emailTemplates";

function formatDateDe(date: Date): string {
  return date.toLocaleDateString("de-CH", { year: "numeric", month: "2-digit", day: "2-digit" });
}

interface RequestGameTransferRequest {
  gameId: string;
  toUid: string;
}

/**
 * The current mainEditor proposes handing administration to a specific,
 * eligible person (own club or the opponent's, if that club is a real
 * linked LiveClub club) — that person must then call acceptGameTransfer
 * (or declineGameTransfer) themselves; this alone never changes
 * mainEditorUid. See createGame.ts's scenario-4 broadcast invite for the
 * one case where a target can claim administration *without* a prior
 * request from the current editor.
 */
export const requestGameTransfer = onCall<RequestGameTransferRequest>(
  { secrets: [smtpPassword] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");
    }
    const { gameId, toUid } = request.data;
    if (typeof gameId !== "string" || !gameId) {
      throw new HttpsError("invalid-argument", "gameId fehlt.");
    }
    if (typeof toUid !== "string" || !toUid) {
      throw new HttpsError("invalid-argument", "Zielperson fehlt.");
    }

    const gameRef = db.collection("games").doc(gameId);
    const gameSnap = await gameRef.get();
    if (!gameSnap.exists) {
      throw new HttpsError("not-found", "Spiel nicht gefunden.");
    }
    const game = gameSnap.data()!;

    if (game.mainEditorUid !== request.auth.uid) {
      throw new HttpsError("permission-denied", "Nur der aktuelle Hauptredaktor kann übertragen.");
    }
    const eligible: string[] = game.eligibleEditorUids ?? [];
    if (!eligible.includes(toUid)) {
      throw new HttpsError("invalid-argument", "Diese Person ist für dieses Spiel nicht berechtigt.");
    }
    if (toUid === request.auth.uid) {
      throw new HttpsError("invalid-argument", "Du bist bereits Hauptredaktor.");
    }

    await gameRef.update({
      pendingTransfer: {
        toUid,
        requestedByUid: request.auth.uid,
        requestedAt: FieldValue.serverTimestamp(),
        kind: "direct",
      },
      updatedAt: FieldValue.serverTimestamp(),
    });

    const template = await getTemplate(db, "gameTakeoverInvite");
    const scheduledStart = game.scheduledStart as Timestamp | undefined;
    const vars = {
      homeTeamName: game.homeTeamName ?? "",
      awayTeamName: game.awayTeamName ?? "",
      gameDate: scheduledStart ? formatDateDe(scheduledStart.toDate()) : "–",
    };
    await sendToEditorIfOptedIn(
      toUid,
      "gameTakeoverInvite",
      renderTemplate(template.subject, vars),
      renderTemplate(template.html, vars)
    );

    return { ok: true };
  }
);
