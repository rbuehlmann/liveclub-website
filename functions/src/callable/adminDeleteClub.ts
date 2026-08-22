import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { db, auth, app } from "../firebaseAdmin";
import { sendMail, LIVECLUB_TEAM_EMAIL } from "../lib/mailer";
import { smtpPassword } from "../lib/secrets";
import { getTemplate, renderTemplate } from "../lib/emailTemplates";
import { buildAndUploadClubArchive, getArchiveDownloadUrl } from "../lib/clubArchive";

interface AdminDeleteClubRequest {
  clubId: string;
  reason?: string;
}

/**
 * Permanently wipes a club and everything that references it. Callable by a
 * platform admin for any club (cleaning up bad/duplicate/spam registrations
 * before the registration flow has captcha + ToS gating — real, licensed
 * clubs are otherwise handled by adminSetLicense's "cancelled" status
 * instead, which only revokes discoverability, never deletes data), or by a
 * clubAdmin for their own club (self-service "I don't want this club
 * anymore" deletion). This one has no undo.
 *
 * Firestore alone doesn't cascade-delete: clubs/{clubId} and its
 * subcollections come off via recursiveDelete, but games/teamInfos
 * (top-level, queried by clubId), publicClubs (a separate top-level doc),
 * publicGames/publicTeams (top-level mirrors keyed by their own ids),
 * invitations (queried by clubId), each member's cached users/{uid} club
 * fields, the Storage logo, and Auth custom claims all need their own
 * explicit cleanup or they'd orphan silently.
 *
 * Deliberately does not touch Stripe (no auto-cancelling a real
 * subscription) or deviceFollows (stale publicTeamId entries in a device's
 * followedTeamIds array are harmless dead weight, not worth an unindexed
 * full-collection scan here).
 *
 * Sends a confirmation email to the club's contact address via
 * emailTemplates/clubDeleted, an internal notification (with the archive
 * download link, the reason, and who triggered it) to LIVECLUB_TEAM_EMAIL,
 * and a plain "you're no longer part of this club" email to every
 * individual member — fires for both callers (platform-admin and
 * self-service).
 *
 * Before any of that, silently snapshots everything about the club to
 * Storage (see lib/clubArchive.ts) — evidence retention for LiveClub's own
 * protection if a club abuses the platform and deletes itself to dodge
 * accountability, never a restore/backup feature for the club itself (see
 * the 2026-08-22 "Sicherheits-Archiv" design). This has to happen
 * unconditionally here, not as a separate manual step someone remembers to
 * click first — a self-deleting clubAdmin gives nobody the chance to do
 * that.
 */
export const adminDeleteClub = onCall<AdminDeleteClubRequest>(
  { secrets: [smtpPassword] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");
    }

    const { clubId, reason } = request.data;
    if (typeof clubId !== "string" || !clubId) {
      throw new HttpsError("invalid-argument", "clubId fehlt.");
    }

    const isPlatformAdmin = request.auth.token.platformAdmin === true;
    const isOwnClubAdmin =
      request.auth.token.clubId === clubId && request.auth.token.role === "clubAdmin";
    if (!isPlatformAdmin && !isOwnClubAdmin) {
      throw new HttpsError(
        "permission-denied",
        "Nur Plattform-Administratoren oder der Vereins-Admin dieses Vereins."
      );
    }

    const clubRef = db.collection("clubs").doc(clubId);
    const clubSnap = await clubRef.get();
    if (!clubSnap.exists) {
      throw new HttpsError("not-found", "Verein wurde nicht gefunden.");
    }
    const clubData = clubSnap.data()!;
    const publicClubId: string | undefined = clubData.publicClubId;

    // Must run before anything below deletes a single byte — see the class
    // doc comment above.
    const archive = await buildAndUploadClubArchive(clubId);

    const [membersSnap, teamsSnap, homeGamesSnap, awayGamesSnap, invitationsSnap, teamInfosSnap] =
      await Promise.all([
        clubRef.collection("members").get(),
        clubRef.collection("teams").get(),
        // Games are a single top-level collection now (see createGame.ts) — a
        // club can appear as either side, never nested under it.
        db.collection("games").where("homeClubId", "==", clubId).get(),
        db.collection("games").where("awayClubId", "==", clubId).get(),
        db.collection("invitations").where("clubId", "==", clubId).get(),
        // Team-Infos are also a top-level collection (public read, see
        // createTeamInfo.ts) — same orphaning risk as games above.
        db.collection("teamInfos").where("clubId", "==", clubId).get(),
      ]);
    const gameDocs = [...homeGamesSnap.docs, ...awayGamesSnap.docs].filter(
      (doc, i, all) => all.findIndex((d) => d.id === doc.id) === i
    );

    // Storage logo — filename is whatever the clubAdmin originally uploaded,
    // so list the prefix rather than assume a fixed object name.
    const bucket = getStorage(app).bucket();
    const [logoFiles] = await bucket.getFiles({ prefix: `clubs/${clubId}/logo/` });
    await Promise.all(logoFiles.map((file) => file.delete().catch(() => undefined)));

    // Top-level mirrors keyed by ids only known from the club's own
    // subcollections (games share their id with publicGames; teams carry
    // their own publicTeamId for the publicTeams mirror).
    const batch = db.batch();
    gameDocs.forEach((gameDoc) => {
      batch.delete(db.collection("publicGames").doc(gameDoc.id));
    });
    teamsSnap.docs.forEach((teamDoc) => {
      const publicTeamId = teamDoc.data().publicTeamId;
      if (publicTeamId) batch.delete(db.collection("publicTeams").doc(publicTeamId));
    });
    invitationsSnap.docs.forEach((invDoc) => batch.delete(invDoc.ref));
    await batch.commit();

    // Each game doc has its own events/editorHistory subcollections, so a
    // plain batch delete would orphan them — needs recursiveDelete per doc,
    // same reasoning as publicClubs/clubRef below. A deleted club is gone
    // either way, and the fixture can no longer be administered by anyone
    // once one of its two sides no longer exists, so the whole record goes
    // rather than trying to keep a half-orphaned game around.
    await Promise.all(gameDocs.map((gameDoc) => db.recursiveDelete(gameDoc.ref)));

    // Each Team-Info has its own pushLog subcollection, same reasoning as
    // games above — recursiveDelete per doc, not a plain batch delete.
    await Promise.all(teamInfosSnap.docs.map((infoDoc) => db.recursiveDelete(infoDoc.ref)));

    if (publicClubId) {
      await db.recursiveDelete(db.collection("publicClubs").doc(publicClubId));
    }

    // Every member: drop this club from their cached users/{uid} fields, then
    // immediately resync their claim (same derivation as syncClubClaims)
    // rather than waiting for their next sign-in/token refresh to self-heal.
    // Also email each of them individually — contactEmail below only covers
    // the club's own inbox, which may not even be a real login.
    const redaktorRemovedTemplate = await getTemplate(db, "redaktorRemoved");
    const redaktorRemovedVars = { clubName: clubData.name ?? "" };
    const redaktorRemovedSubject = renderTemplate(redaktorRemovedTemplate.subject, redaktorRemovedVars);
    const redaktorRemovedHtml = renderTemplate(redaktorRemovedTemplate.html, redaktorRemovedVars);
    await Promise.all(
      membersSnap.docs.map(async (memberDoc) => {
        const uid = memberDoc.id;
        const memberEmail = memberDoc.data()?.email as string | undefined;
        const userRef = db.collection("users").doc(uid);
        await userRef.set(
          {
            clubIds: FieldValue.arrayRemove(clubId),
            clubRoles: { [clubId]: FieldValue.delete() },
            clubTeamIds: { [clubId]: FieldValue.delete() },
          },
          { merge: true }
        );
        const userSnap = await userRef.get();
        const data = userSnap.data();
        const remainingClubIds: string[] = data?.clubIds ?? [];
        const clubRoles: Record<string, string> = data?.clubRoles ?? {};
        const nextClubId = remainingClubIds[0] ?? null;
        const nextRole = nextClubId ? clubRoles[nextClubId] ?? null : null;
        await auth
          .setCustomUserClaims(uid, nextClubId && nextRole ? { clubId: nextClubId, role: nextRole } : {})
          .catch(() => undefined);
        if (memberEmail) {
          await sendMail({ to: memberEmail, subject: redaktorRemovedSubject, html: redaktorRemovedHtml }).catch(
            () => undefined
          );
        }
      })
    );

    const deletionReason = reason?.trim() || "Nicht angegeben.";
    const contactEmail = clubData.contactEmail as string | undefined;
    if (contactEmail) {
      const vars = { clubName: clubData.name ?? "", reason: deletionReason };
      const template = await getTemplate(db, "clubDeleted");
      const subject = renderTemplate(template.subject, vars);
      const html = renderTemplate(template.html, vars);
      await sendMail({ to: contactEmail, subject, html }).catch(() => undefined);
    }

    // Internal-only notification with the archive link — see the class doc
    // comment for why this is a separate template from clubDeleted rather
    // than a "[Kopie]" of it (the club must never see the archive URL or
    // who triggered the deletion).
    {
      const archiveUrl = await getArchiveDownloadUrl(archive.path);
      const triggeredBy = isPlatformAdmin
        ? `Plattform-Administrator (${request.auth.token.email ?? request.auth.uid})`
        : `Vereins-Admin, Selbstlöschung (${request.auth.token.email ?? request.auth.uid})`;
      const template = await getTemplate(db, "clubDeletedInternal");
      const vars = { clubName: clubData.name ?? "", reason: deletionReason, triggeredBy, archiveUrl };
      await sendMail({
        to: LIVECLUB_TEAM_EMAIL,
        subject: renderTemplate(template.subject, vars),
        html: renderTemplate(template.html, vars),
      }).catch(() => undefined);
    }

    // clubs/{clubId} + members/teams/licenses subcollections (games are
    // handled separately above, being top-level now).
    await db.recursiveDelete(clubRef);

    return { ok: true };
  }
);
