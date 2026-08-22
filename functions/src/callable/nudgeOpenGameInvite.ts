import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin";
import { smtpPassword } from "../lib/secrets";
import { eligibleEditorsForTeam, sendToEditorIfOptedIn } from "../lib/gameEditors";
import { getTemplate, renderTemplate } from "../lib/emailTemplates";

interface NudgeOpenGameInviteRequest {
  gameId: string;
}

function formatDateDe(date: Date): string {
  return date.toLocaleDateString("de-CH", { year: "numeric", month: "2-digit", day: "2-digit" });
}

/**
 * Manual re-send of the open-game invite (see createGame.ts's "offen"
 * branch, 2026-08-22 decision) — a reminder for a game nobody has claimed
 * yet. Callable by a clubAdmin of either involved club, not just the
 * creator's — either side may want to nudge, especially the away-game case
 * where both sides were invited.
 */
export const nudgeOpenGameInvite = onCall<NudgeOpenGameInviteRequest>(
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

    const gameSnap = await db.collection("games").doc(gameId).get();
    if (!gameSnap.exists) {
      throw new HttpsError("not-found", "Spiel nicht gefunden.");
    }
    const game = gameSnap.data()!;
    if (game.mainEditorUid) {
      throw new HttpsError("failed-precondition", "Für dieses Spiel ist bereits ein Redaktor zugeteilt.");
    }

    const partyClubIds = [game.homeClubId, game.awayClubId].filter((id): id is string => !!id);
    const memberSnaps = await Promise.all(
      partyClubIds.map((clubId) => db.collection("clubs").doc(clubId).collection("members").doc(uid).get())
    );
    const isPartyClubAdmin = memberSnaps.some((s) => s.exists && s.data()?.role === "clubAdmin");
    if (!isPartyClubAdmin) {
      throw new HttpsError("permission-denied", "Keine Berechtigung für dieses Spiel.");
    }

    const ownClubId = game.createdByClubId as string;
    const wasHomeGame = game.homeClubId === ownClubId;
    const ownTeamId = wasHomeGame ? game.homeTeamId : game.awayTeamId;
    const otherClubId: string | null = wasHomeGame ? game.awayClubId : game.homeClubId;
    const otherTeamId: string | null = wasHomeGame ? game.awayTeamId : game.homeTeamId;

    const ownEligible = ownTeamId ? await eligibleEditorsForTeam(ownClubId, ownTeamId) : [];
    const opponentEligible =
      !wasHomeGame && otherClubId && otherTeamId ? await eligibleEditorsForTeam(otherClubId, otherTeamId) : [];
    const recipients = new Set([...ownEligible, ...opponentEligible]);

    if (recipients.size === 0) {
      return { ok: true, sentCount: 0 };
    }

    const ownClubSnap = await db.collection("clubs").doc(ownClubId).get();
    const template = await getTemplate(db, "gameTakeoverInvite");
    const vars = {
      clubName: ownClubSnap.data()?.name ?? "",
      opponentClubName: wasHomeGame ? game.awayTeamName : game.homeTeamName,
      gameDate: game.scheduledStart?.toDate ? formatDateDe(game.scheduledStart.toDate()) : "",
      homeTeamName: game.homeTeamName ?? "",
      awayTeamName: game.awayTeamName ?? "",
    };
    const subject = renderTemplate(template.subject, vars);
    const html = renderTemplate(template.html, vars);
    await Promise.all(
      Array.from(recipients).map((editorUid) =>
        sendToEditorIfOptedIn(editorUid, "gameTakeoverInvite", subject, html)
      )
    );
    await gameSnap.ref.collection("editorHistory").add({
      action: "takeoverInviteSent",
      byUid: uid,
      timestamp: FieldValue.serverTimestamp(),
    });

    return { ok: true, sentCount: recipients.size };
  }
);
