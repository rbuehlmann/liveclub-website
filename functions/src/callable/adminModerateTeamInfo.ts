import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin";

type ModerationAction = "delete" | "restore" | "edit";

interface AdminModerateTeamInfoRequest {
  infoId: string;
  action: ModerationAction;
  title?: string;
  text?: string;
}

const MAX_TITLE_LENGTH = 100;
const MAX_TEXT_LENGTH = 500;

/**
 * Platform-admin-only moderation of a Team-Info. "delete" is still a soft
 * hide under the hood (hidden:true, hiddenByRole:"admin") — see the
 * 2026-08-22 design's resolution of the "muss löschbar sein, aber im
 * Worst-Case nachschaubar bleiben" tension: nothing here is ever a real
 * Firestore delete, so it's always still there for platformAdmin to look
 * up later, only "restore" (also admin-only) reverses the public-facing
 * hide. "edit" keeps the previous title/text in an editHistory
 * subcollection rather than silently overwriting it, same accountability
 * reasoning.
 */
export const adminModerateTeamInfo = onCall<AdminModerateTeamInfoRequest>(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");
  }
  if (request.auth.token.platformAdmin !== true) {
    throw new HttpsError("permission-denied", "Nur für Plattform-Administratoren.");
  }

  const { infoId, action, title, text } = request.data;
  if (typeof infoId !== "string" || !infoId) {
    throw new HttpsError("invalid-argument", "infoId fehlt.");
  }

  const infoRef = db.collection("teamInfos").doc(infoId);
  const infoSnap = await infoRef.get();
  if (!infoSnap.exists) {
    throw new HttpsError("not-found", "Team-Info nicht gefunden.");
  }
  const info = infoSnap.data()!;

  if (action === "delete") {
    await infoRef.update({
      hidden: true,
      hiddenAt: FieldValue.serverTimestamp(),
      hiddenByUid: request.auth.uid,
      hiddenByRole: "admin",
    });
    return { ok: true };
  }

  if (action === "restore") {
    await infoRef.update({
      hidden: false,
      hiddenAt: null,
      hiddenByUid: null,
      hiddenByRole: null,
    });
    return { ok: true };
  }

  if (action === "edit") {
    if (typeof title !== "string" || !title.trim() || title.trim().length > MAX_TITLE_LENGTH) {
      throw new HttpsError("invalid-argument", `Titel fehlt oder ist zu lang (max. ${MAX_TITLE_LENGTH}).`);
    }
    if (typeof text !== "string" || !text.trim() || text.trim().length > MAX_TEXT_LENGTH) {
      throw new HttpsError("invalid-argument", `Text fehlt oder ist zu lang (max. ${MAX_TEXT_LENGTH}).`);
    }
    await infoRef.collection("editHistory").add({
      previousTitle: info.title ?? "",
      previousText: info.text ?? "",
      editedByUid: request.auth.uid,
      editedAt: FieldValue.serverTimestamp(),
    });
    await infoRef.update({ title: title.trim(), text: text.trim() });
    return { ok: true };
  }

  throw new HttpsError("invalid-argument", "Unbekannte Aktion.");
});
