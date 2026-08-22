import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin";
import { sendMail, LIVECLUB_TEAM_EMAIL } from "../lib/mailer";
import { smtpPassword } from "../lib/secrets";
import { getTemplate, renderTemplate } from "../lib/emailTemplates";

interface HideTeamInfoRequest {
  infoId: string;
}

function formatDateDe(date: Date): string {
  return date.toLocaleString("de-CH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * A redaktor can hide (never truly delete) any Team-Info belonging to a
 * team they're assigned to — not just their own posts (see the 2026-08-22
 * "Moderation" design). One-way from the redaktor's side: they can't
 * un-hide it themselves once flagged, only a platform admin can (via
 * adminModerateTeamInfo.ts's "restore" action) — this is a deliberate
 * accountability event, not a casual toggle, so it must not be gameable by
 * hiding-then-unhiding around a review.
 *
 * Always emails LiveClub + the club's own contactEmail + the original
 * author, with the full post content, so severity can be judged without
 * anyone logging in anywhere.
 */
export const hideTeamInfo = onCall<HideTeamInfoRequest>(
  { secrets: [smtpPassword] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");
    }
    const uid = request.auth.uid;
    const { infoId } = request.data;
    if (typeof infoId !== "string" || !infoId) {
      throw new HttpsError("invalid-argument", "infoId fehlt.");
    }

    const infoRef = db.collection("teamInfos").doc(infoId);
    const infoSnap = await infoRef.get();
    if (!infoSnap.exists) {
      throw new HttpsError("not-found", "Team-Info nicht gefunden.");
    }
    const info = infoSnap.data()!;
    if (info.hidden === true) {
      throw new HttpsError("failed-precondition", "Diese Team-Info ist bereits ausgeblendet.");
    }

    const clubId = info.clubId as string;
    const teamId = info.teamId as string;
    const memberSnap = await db.collection("clubs").doc(clubId).collection("members").doc(uid).get();
    const memberData = memberSnap.data();
    const memberRole = memberData?.role;
    const memberTeamIds: string[] = memberData?.teamIds ?? [];
    const isAssigned = memberRole === "clubAdmin" || (memberRole === "reporter" && memberTeamIds.includes(teamId));
    if (!isAssigned) {
      throw new HttpsError("permission-denied", "Keine Berechtigung für diese Mannschaft.");
    }

    await infoRef.update({
      hidden: true,
      hiddenAt: FieldValue.serverTimestamp(),
      hiddenByUid: uid,
      hiddenByRole: "redaktor",
    });

    const clubSnap = await db.collection("clubs").doc(clubId).get();
    const authorSnap = await db.collection("users").doc(info.createdByUid as string).get();
    const redaktorSnap = await db.collection("users").doc(uid).get();

    const vars = {
      redaktorName: (redaktorSnap.data()?.publicDisplayName as string | undefined) ?? uid,
      redaktorEmail: (redaktorSnap.data()?.email as string | undefined) ?? "",
      teamName: (info.teamName as string) ?? "",
      clubName: (info.clubName as string) ?? "",
      postTitle: (info.title as string) ?? "",
      postText: (info.text as string) ?? "",
      hiddenAt: formatDateDe(new Date()),
    };
    const template = await getTemplate(db, "teamInfoHidden");
    const subject = renderTemplate(template.subject, vars);
    const html = renderTemplate(template.html, vars);

    const recipients = new Set<string>([LIVECLUB_TEAM_EMAIL]);
    const contactEmail = clubSnap.data()?.contactEmail as string | undefined;
    if (contactEmail) recipients.add(contactEmail);
    const authorEmail = authorSnap.data()?.email as string | undefined;
    if (authorEmail) recipients.add(authorEmail);

    await Promise.all(
      Array.from(recipients).map((to) => sendMail({ to, subject, html }).catch(() => undefined))
    );

    return { ok: true };
  }
);
