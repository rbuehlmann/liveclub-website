import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, auth } from "../firebaseAdmin";
import { sendMail } from "../lib/mailer";
import { smtpPassword } from "../lib/secrets";
import { getTemplate, renderTemplate } from "../lib/emailTemplates";

/**
 * Lets a signed-in user delete their own personal account and data —
 * distinct from adminDeleteClub.ts, which deletes a whole club. Didn't
 * exist at all before the 2026-08-22 "Moderation" design surfaced the gap:
 * a redaktor might belong to several unrelated clubs, so a club being
 * deleted must never auto-delete *their* account (see redaktorRemoved in
 * adminDeleteClub.ts) — conversely, deleting your own account must never
 * touch any club itself, only your own membership in each one.
 *
 * Notifies each affected club's contactEmail ("this person left"), but
 * deliberately does NOT notify LiveClub — that's specific to the
 * club-deletion/abuse scenario (adminDeleteClub's internal mail), not
 * ordinary individual account churn ("wir von LiveClub müssen das nicht
 * wissen").
 */
export const deleteOwnAccount = onCall({ secrets: [smtpPassword] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");
  }
  const uid = request.auth.uid;

  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  const userData = userSnap.data();
  const clubIds: string[] = userData?.clubIds ?? [];
  const memberName = (userData?.publicDisplayName as string | undefined) || request.auth.token.email || uid;
  const memberEmail = (userData?.email as string | undefined) || request.auth.token.email || "";

  const template = await getTemplate(db, "clubMemberLeft");

  await Promise.all(
    clubIds.map(async (clubId) => {
      const clubRef = db.collection("clubs").doc(clubId);
      await clubRef.collection("members").doc(uid).delete();
      const clubSnap = await clubRef.get();
      const clubData = clubSnap.data();
      const contactEmail = clubData?.contactEmail as string | undefined;
      if (contactEmail) {
        const vars = { memberName, memberEmail, clubName: clubData?.name ?? "" };
        await sendMail({
          to: contactEmail,
          subject: renderTemplate(template.subject, vars),
          html: renderTemplate(template.html, vars),
        }).catch(() => undefined);
      }
    })
  );

  await userRef.delete().catch(() => undefined);
  await auth.deleteUser(uid).catch(() => undefined);

  return { ok: true };
});
