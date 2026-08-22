import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin";
import { smtpPassword } from "../lib/secrets";
import { editorDisplayName, resolveEditorClubId, sendToEditorIfOptedIn } from "../lib/gameEditors";
import { getTemplate, renderTemplate } from "../lib/emailTemplates";
import { sendMail } from "../lib/mailer";

interface AcceptGameTransferRequest {
  gameId: string;
}

function formatDateDe(date: Date): string {
  return date.toLocaleDateString("de-CH", { year: "numeric", month: "2-digit", day: "2-digit" });
}

/**
 * Four ways this succeeds:
 * 1. A direct requestGameTransfer targeted the caller
 *    (pendingTransfer.kind === "direct" && pendingTransfer.toUid === caller)
 *    — the normal "current editor proposed, target confirms" path.
 * 2. A requestGameTransfer({toOpponentClub: true}) is pending
 *    (pendingTransfer.kind === "clubBroadcast") and the caller is an
 *    eligible editor of a club other than the current mainEditor's — the
 *    current editor explicitly asked to hand back to "whoever's available
 *    over there," first click wins.
 * 3. No pendingTransfer exists at all, AND the game has never had a
 *    completed transfer before (game.hasBeenTransferred !== true) — the
 *    one-time, no-invitation-needed claim that mirrors createGame.ts's
 *    scenario-4 auto-invite (created as away against a real linked home
 *    club) and also covers the symmetric case (home creates, away claims
 *    first). This closes itself the moment ANY transfer completes, for
 *    good — not just "while control sits with the creator", since control
 *    can cycle back to the creator's club later via paths 1/2 below, and
 *    the free claim must NOT reopen when that happens (a naive check like
 *    "mainEditorClubId === createdByClubId" would incorrectly reopen it —
 *    hence the separate boolean instead of re-deriving it from club ids).
 *    After the first transfer, only paths 1 and 2 above can move
 *    administration to the other club, so a side that lost control can
 *    never just click it back; only the current editor can initiate
 *    handing it over again. Within the SAME club this path never applies
 *    either way — same-club handoff always goes through the direct
 *    request/accept path, so a bystander can never unilaterally kick out a
 *    colleague who's actively administering.
 * 4. game.mainEditorUid is null (see createGame.ts's selfAsEditor:false —
 *    "kein Redaktor"/"offen" games, 2026-08-22 decision) and the caller is
 *    in eligibleEditorUids — same first-click-wins claim, just for a game
 *    that was never assigned in the first place rather than handed off.
 *
 * Either way this is a Firestore transaction: reads mainEditorUid fresh and
 * writes atomically, so two people racing to accept the same invite can't
 * both "win".
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
      const previousEditorUid = (game.mainEditorUid ?? null) as string | null;
      const pendingTransfer = game.pendingTransfer as
        | { toUid: string | null; kind: "direct" | "clubBroadcast" }
        | null
        | undefined;

      const eligible: string[] = game.eligibleEditorUids ?? [];
      const newEditorClubId = await resolveEditorClubId(game, uid);
      const isDifferentClub = newEditorClubId !== game.mainEditorClubId;

      const isDirectTarget = pendingTransfer?.kind === "direct" && pendingTransfer.toUid === uid;
      const isClubBroadcastClaim =
        pendingTransfer?.kind === "clubBroadcast" && eligible.includes(uid) && isDifferentClub;
      const isFirstEverCrossClubClaim =
        !pendingTransfer && eligible.includes(uid) && isDifferentClub && game.hasBeenTransferred !== true;
      const isOpenClaim = !previousEditorUid && eligible.includes(uid);

      if (!isDirectTarget && !isClubBroadcastClaim && !isFirstEverCrossClubClaim && !isOpenClaim) {
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
        hasBeenTransferred: true,
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.set(gameRef.collection("editorHistory").doc(), {
        action: "accepted",
        byUid: uid,
        atUid: previousEditorUid,
        timestamp: FieldValue.serverTimestamp(),
      });

      return {
        previousEditorUid,
        homeTeamName: game.homeTeamName,
        awayTeamName: game.awayTeamName,
        isOpenClaim,
        createdByClubId: game.createdByClubId as string | undefined,
        scheduledStart: game.scheduledStart as Timestamp | undefined,
      };
    });

    const vars = { homeTeamName: result.homeTeamName ?? "", awayTeamName: result.awayTeamName ?? "" };

    // Two distinct, separately opt-out-able notifications (see the
    // 2026-08-15 design's Mail-Einstellungen): "abgegeben" to whoever just
    // lost administration, "übernommen" to whoever just gained it — not the
    // same event from each side's point of view.
    const takenOverTemplate = await getTemplate(db, "gameTakenOver");
    const notifications = [
      sendToEditorIfOptedIn(
        uid,
        "gameTakenOver",
        renderTemplate(takenOverTemplate.subject, vars),
        renderTemplate(takenOverTemplate.html, vars)
      ),
    ];
    // No previous editor to notify for an open-claim (game.mainEditorUid
    // was null — see path 4 above).
    if (result.previousEditorUid) {
      const handedOffTemplate = await getTemplate(db, "gameHandedOff");
      notifications.push(
        sendToEditorIfOptedIn(
          result.previousEditorUid,
          "gameHandedOff",
          renderTemplate(handedOffTemplate.subject, vars),
          renderTemplate(handedOffTemplate.html, vars)
        )
      );
    }
    // Redaktor(en) already get their own gameTakenOver/gameHandedOff mail
    // above — but nobody told the admin who left the game open that it's
    // now taken care of (see the 2026-08-22 "sofort sichtbar" decision).
    if (result.isOpenClaim && result.createdByClubId) {
      const creatingClubSnap = await db.collection("clubs").doc(result.createdByClubId).get();
      const contactEmail = creatingClubSnap.data()?.contactEmail as string | undefined;
      if (contactEmail) {
        const adminTemplate = await getTemplate(db, "gameOpenClaimed");
        const adminVars = {
          ...vars,
          editorName: newEditorDisplayName ?? "Ein Redaktor",
          gameDate: result.scheduledStart ? formatDateDe(result.scheduledStart.toDate()) : "",
        };
        notifications.push(
          sendMail({
            to: contactEmail,
            subject: renderTemplate(adminTemplate.subject, adminVars),
            html: renderTemplate(adminTemplate.html, adminVars),
          }).catch(() => undefined)
        );
      }
    }
    await Promise.all(notifications);

    return { ok: true };
  }
);
