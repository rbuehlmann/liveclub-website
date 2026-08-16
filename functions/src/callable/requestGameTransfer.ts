import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin";
import { smtpPassword } from "../lib/secrets";
import { resolveEditorClubId, sendToEditorIfOptedIn } from "../lib/gameEditors";
import { getTemplate, renderTemplate } from "../lib/emailTemplates";

function formatDateDe(date: Date): string {
  return date.toLocaleDateString("de-CH", { year: "numeric", month: "2-digit", day: "2-digit" });
}

interface RequestGameTransferRequest {
  gameId: string;
  toUid?: string;
  toOpponentClub?: boolean;
}

/**
 * The current mainEditor initiates a transfer — either to one specific,
 * eligible person (own club or the opponent's, if a uid is known), or,
 * via toOpponentClub, to "whoever's eligible over there" without naming
 * anyone (the opposing club's members aren't readable client-side, see
 * firestore.rules, so the UI can't offer a by-name picker for them). Either
 * way this alone never changes mainEditorUid — the target(s) must still
 * call acceptGameTransfer themselves.
 *
 * This is now the ONLY way to move administration to the opposing club
 * once someone has already claimed it — see acceptGameTransfer.ts for the
 * one-time-only free claim that's available before that (mirrors
 * createGame.ts's scenario-4 auto-invite). Without this gate, whichever
 * side didn't currently hold administration could reclaim it at will,
 * which would let two sides fight over control mid-game.
 */
export const requestGameTransfer = onCall<RequestGameTransferRequest>(
  { secrets: [smtpPassword] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");
    }
    const { gameId, toUid, toOpponentClub } = request.data;
    if (typeof gameId !== "string" || !gameId) {
      throw new HttpsError("invalid-argument", "gameId fehlt.");
    }
    const wantsDirect = typeof toUid === "string" && toUid.length > 0;
    if (wantsDirect === !!toOpponentClub) {
      throw new HttpsError("invalid-argument", "Entweder toUid oder toOpponentClub angeben.");
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

    let targetUids: string[];
    let kind: "direct" | "clubBroadcast";
    if (wantsDirect) {
      if (!eligible.includes(toUid!)) {
        throw new HttpsError("invalid-argument", "Diese Person ist für dieses Spiel nicht berechtigt.");
      }
      if (toUid === request.auth.uid) {
        throw new HttpsError("invalid-argument", "Du bist bereits Hauptredaktor.");
      }
      targetUids = [toUid!];
      kind = "direct";
    } else {
      const clubIds = await Promise.all(
        eligible.map(async (uid) => [uid, await resolveEditorClubId(game, uid)] as const)
      );
      targetUids = clubIds
        .filter(([, clubId]) => clubId && clubId !== game.mainEditorClubId)
        .map(([uid]) => uid);
      if (targetUids.length === 0) {
        throw new HttpsError(
          "failed-precondition",
          "Der andere Verein hat aktuell keine berechtigte Person für dieses Spiel."
        );
      }
      kind = "clubBroadcast";
    }

    await gameRef.update({
      pendingTransfer: {
        toUid: wantsDirect ? toUid : null,
        requestedByUid: request.auth.uid,
        requestedAt: FieldValue.serverTimestamp(),
        kind,
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
    await Promise.all(
      targetUids.map((uid) =>
        sendToEditorIfOptedIn(
          uid,
          "gameTakeoverInvite",
          renderTemplate(template.subject, vars),
          renderTemplate(template.html, vars)
        )
      )
    );

    return { ok: true };
  }
);
