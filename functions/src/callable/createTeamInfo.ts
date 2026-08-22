import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin";
import {
  TEAM_INFO_TERMS_VERSION,
  countTodayInfos,
  countTodayPushes,
  resolveTeamInfoSettings,
} from "../lib/teamInfo";
import { sendTeamInfoPush } from "../lib/teamInfoPush";
import { apnsAuthKey } from "../lib/secrets";

const MAX_TITLE_LENGTH = 100;
const MAX_TEXT_LENGTH = 500;

interface CreateTeamInfoRequest {
  clubId: string;
  teamId: string;
  title: string;
  text: string;
  sendPush: boolean;
}

function assertNonEmptyString(value: unknown, field: string, maxLength: number): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpsError("invalid-argument", `Feld "${field}" darf nicht leer sein.`);
  }
  if (value.trim().length > maxLength) {
    throw new HttpsError("invalid-argument", `Feld "${field}" ist zu lang (max. ${maxLength} Zeichen).`);
  }
}

/**
 * Creates a Team-Info — always immediately live in the feed, no draft
 * state (see the 2026-08-21 "Team-Infos" design: deliberately minimal,
 * "Veröffentlichen" IS the create action). Limits are per TEAM, not per
 * editor, so a team with several reporters shares one daily budget —
 * that's why the count queries below filter by teamId alone, never uid.
 */
export const createTeamInfo = onCall<CreateTeamInfoRequest>({ secrets: [apnsAuthKey] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");
  }
  const uid = request.auth.uid;
  const { clubId, teamId, title, text, sendPush } = request.data;

  if (typeof clubId !== "string" || !clubId) {
    throw new HttpsError("invalid-argument", "clubId fehlt.");
  }
  if (typeof teamId !== "string" || !teamId) {
    throw new HttpsError("invalid-argument", "teamId fehlt.");
  }
  assertNonEmptyString(title, "Titel", MAX_TITLE_LENGTH);
  assertNonEmptyString(text, "Text", MAX_TEXT_LENGTH);

  const clubRef = db.collection("clubs").doc(clubId);
  const [clubSnap, teamSnap, memberSnap] = await Promise.all([
    clubRef.get(),
    clubRef.collection("teams").doc(teamId).get(),
    clubRef.collection("members").doc(uid).get(),
  ]);
  if (!clubSnap.exists) {
    throw new HttpsError("not-found", "Verein nicht gefunden.");
  }
  if (!teamSnap.exists) {
    throw new HttpsError("not-found", "Mannschaft nicht gefunden.");
  }
  const memberData = memberSnap.data();
  const memberRole = memberData?.role;
  const memberTeamIds: string[] = memberData?.teamIds ?? [];
  const isTeamRedaktor =
    memberRole === "clubAdmin" || (memberRole === "reporter" && memberTeamIds.includes(teamId));
  if (!isTeamRedaktor) {
    throw new HttpsError("permission-denied", "Keine Berechtigung für diese Mannschaft.");
  }

  const club = clubSnap.data()!;
  const team = teamSnap.data()!;

  // Same license-active gate as game creation — a club without an active
  // license shouldn't be posting Team-Infos either.
  const licenseValidUntil = club.currentLicenseValidUntil;
  const licenseActive =
    club.currentLicenseStatus === "active" &&
    !!licenseValidUntil &&
    licenseValidUntil.toMillis() > Date.now();
  if (!licenseActive) {
    throw new HttpsError("failed-precondition", "Lizenz des Vereins ist nicht aktiv.");
  }

  const settings = await resolveTeamInfoSettings(club);
  if (!settings.teamInfosEnabled) {
    throw new HttpsError("failed-precondition", "Team-Infos sind für diesen Verein deaktiviert.");
  }

  const infoCountToday = await countTodayInfos(teamId);
  if (infoCountToday >= settings.infosPerDay) {
    throw new HttpsError(
      "resource-exhausted",
      `Tageslimit erreicht: maximal ${settings.infosPerDay} Team-Infos pro Tag.`
    );
  }

  const wantsPush = sendPush === true;
  if (wantsPush) {
    if (!settings.infoPushEnabled) {
      throw new HttpsError("failed-precondition", "Info-Push ist für diesen Verein deaktiviert.");
    }
    const pushCountToday = await countTodayPushes(teamId);
    if (pushCountToday >= settings.pushesPerDay) {
      throw new HttpsError(
        "resource-exhausted",
        `Tageslimit erreicht: maximal ${settings.pushesPerDay} Info-Pushs pro Tag.`
      );
    }
  }

  const publicTeamId = team.publicTeamId as string | undefined;
  const infoRef = db.collection("teamInfos").doc();
  const now = FieldValue.serverTimestamp();

  await infoRef.set({
    infoId: infoRef.id,
    teamId,
    publicTeamId: publicTeamId ?? null,
    clubId,
    publicClubId: club.publicClubId ?? null,
    teamName: team.name,
    clubName: club.name,
    clubLogoUrl: club.logoUrl ?? null,
    title: title.trim(),
    text: text.trim(),
    createdAt: now,
    createdByUid: uid,
    pushSent: false,
    pushSentAt: null,
  });

  if (wantsPush && publicTeamId) {
    await sendTeamInfoPush(publicTeamId, { title: team.name, body: title.trim() });
    await infoRef.update({ pushSent: true, pushSentAt: FieldValue.serverTimestamp() });
    await infoRef.collection("pushLog").add({
      infoId: infoRef.id,
      teamId,
      editorId: uid,
      sentAt: FieldValue.serverTimestamp(),
      termsVersion: TEAM_INFO_TERMS_VERSION,
    });
  }

  return { infoId: infoRef.id };
});
