import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin";
import { sendMail } from "../lib/mailer";
import { smtpPassword } from "../lib/secrets";
import { getTemplate, renderTemplate } from "../lib/emailTemplates";
import { editorDisplayName, eligibleEditorsForTeam, sendToEditorIfOptedIn } from "../lib/gameEditors";

// A "same fixture" match only counts if the two entries are within this many
// hours of each other — wide enough to cover both sides entering slightly
// different kickoff times for the same real match, narrow enough that two
// genuinely separate fixtures between the same two clubs (different
// matchdays) never collide.
const DUPLICATE_WINDOW_HOURS = 18;

interface CreateGameRequest {
  clubId: string;
  teamId: string;
  isHomeGame: boolean;
  opponentPublicClubId?: string;
  opponentTeamId?: string;
  opponentTeamName?: string;
  scheduledStart?: string; // ISO string
}

function assertNonEmptyString(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpsError("invalid-argument", `Feld "${field}" darf nicht leer sein.`);
  }
}

function formatDateDe(date: Date): string {
  return date.toLocaleDateString("de-CH", { year: "numeric", month: "2-digit", day: "2-digit" });
}

/**
 * Creates a game — or, if the same fixture (same two clubs, kickoff within
 * DUPLICATE_WINDOW_HOURS) was already created by the other side, returns
 * that existing record instead. A fixture exists exactly once, ever (see
 * the 2026-08-15 "Spiel- und Redaktorenlogik" design) — this replaces the
 * previous per-club-duplicate-with-cancellation model entirely.
 *
 * The creator becomes mainEditor automatically. When the opponent is a real
 * linked LiveClub club, eligibleEditorUids is computed from *both* clubs'
 * clubAdmin/reporters for the relevant team — either side can eventually
 * administer, subject to requestGameTransfer/acceptGameTransfer. If we're
 * creating as the away side against a real linked home club, every eligible
 * home-side editor is emailed a takeover invite immediately (scenario 4 in
 * the design doc) — they can accept it directly via acceptGameTransfer, no
 * separate request/approval step needed for that specific case.
 */
export const createGame = onCall<CreateGameRequest>(
  { secrets: [smtpPassword] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");
    }
    const uid = request.auth.uid;
    const {
      clubId,
      teamId,
      isHomeGame,
      opponentPublicClubId,
      opponentTeamId,
      opponentTeamName,
      scheduledStart,
    } = request.data;

    assertNonEmptyString(clubId, "clubId");
    assertNonEmptyString(teamId, "teamId");

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

    // Same gate as every other license-active check in this app (see
    // firestore.rules' isClubLicenseActive) — replicated here since this
    // write no longer goes through a Firestore rule at all.
    const licenseValidUntil = club.currentLicenseValidUntil as Timestamp | undefined;
    const licenseActive =
      club.currentLicenseStatus === "active" &&
      !!licenseValidUntil &&
      licenseValidUntil.toMillis() > Date.now();
    if (!licenseActive) {
      throw new HttpsError("failed-precondition", "Lizenz des Vereins ist nicht aktiv.");
    }

    const ownTeamName = teamSnap.data()!.name as string;

    // Resolve the opponent — a real linked club+team, or just a plain name.
    let opponentDisplayName = opponentTeamName?.trim() || "";
    let opponentClubPublicId: string | null = null;
    let opponentClubRealId: string | null = null;
    let opponentTeamIdToStore: string | null = null;

    if (opponentPublicClubId?.trim()) {
      const publicClubSnap = await db.collection("publicClubs").doc(opponentPublicClubId.trim()).get();
      if (publicClubSnap.exists) {
        const publicClubData = publicClubSnap.data()!;
        opponentClubPublicId = opponentPublicClubId.trim();
        opponentClubRealId = publicClubData.clubId;
        if (opponentTeamId?.trim()) {
          const publicTeamSnap = await publicClubSnap.ref.collection("teams").doc(opponentTeamId.trim()).get();
          if (publicTeamSnap.exists) {
            opponentTeamIdToStore = opponentTeamId.trim();
            opponentDisplayName = publicTeamSnap.data()!.name;
          }
        }
      }
    }
    if (!opponentDisplayName) {
      throw new HttpsError("invalid-argument", "Gegner fehlt.");
    }
    // Enforced here too, not just as a `required` field client-side — the
    // "same fixture" check below silently no-ops without a scheduledStart,
    // so a client bug (or a bypassed/stale form) must never be able to slip
    // a game through without one.
    if (!scheduledStart) {
      throw new HttpsError("invalid-argument", "Anstoss fehlt.");
    }

    const scheduledStartTs = Timestamp.fromDate(new Date(scheduledStart));

    const homeTeamName = isHomeGame ? ownTeamName : opponentDisplayName;
    const awayTeamName = isHomeGame ? opponentDisplayName : ownTeamName;
    const homeClubId = isHomeGame ? clubId : opponentClubRealId;
    const awayClubId = isHomeGame ? opponentClubRealId : clubId;
    const homeClubPublicId = isHomeGame ? club.publicClubId : opponentClubPublicId;
    const awayClubPublicId = isHomeGame ? opponentClubPublicId : club.publicClubId;
    const homeTeamIdField = isHomeGame ? teamId : opponentTeamIdToStore;
    const awayTeamIdField = isHomeGame ? opponentTeamIdToStore : teamId;

    // A fixture exists exactly once — only possible to detect when the
    // opponent is a real linked club, since that's the only case where both
    // sides could ever have created the same record independently.
    if (opponentClubRealId && homeClubPublicId && awayClubPublicId) {
      const existingSnap = await db
        .collection("games")
        .where("homeClubPublicId", "==", homeClubPublicId)
        .where("awayClubPublicId", "==", awayClubPublicId)
        .get();

      const windowMs = DUPLICATE_WINDOW_HOURS * 60 * 60 * 1000;
      const match = existingSnap.docs.find((d) => {
        const data = d.data();
        if (!data.scheduledStart) return false;
        const diff = Math.abs((data.scheduledStart as Timestamp).toMillis() - scheduledStartTs.toMillis());
        return diff <= windowMs;
      });
      if (match) {
        return { gameId: match.id, alreadyExisted: true };
      }
    }

    // eligibleEditorUids: our own club's clubAdmin/reporters for this team,
    // plus (if the opponent is a real linked club) theirs too.
    const ownEligible = await eligibleEditorsForTeam(clubId, teamId);
    const opponentEligible =
      opponentClubRealId && opponentTeamIdToStore
        ? await eligibleEditorsForTeam(opponentClubRealId, opponentTeamIdToStore)
        : [];
    const eligibleEditorUids = Array.from(new Set([...ownEligible, ...opponentEligible]));
    const mainEditorDisplayName = await editorDisplayName(uid);

    const gameRef = db.collection("games").doc();
    await gameRef.set({
      homeTeamName,
      awayTeamName,
      homeClubId: homeClubId ?? null,
      awayClubId: awayClubId ?? null,
      homeClubPublicId: homeClubPublicId ?? null,
      awayClubPublicId: awayClubPublicId ?? null,
      homeTeamId: homeTeamIdField,
      awayTeamId: awayTeamIdField,
      createdByClubId: clubId,
      scheduledStart: scheduledStartTs,
      status: "scheduled",
      score: { home: 0, away: 0 },
      mainEditorUid: uid,
      mainEditorClubId: clubId,
      mainEditorDisplayName,
      eligibleEditorUids,
      pendingTransfer: null,
      hasBeenTransferred: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await gameRef.collection("editorHistory").add({
      action: "created",
      byUid: uid,
      timestamp: FieldValue.serverTimestamp(),
    });

    // Scenario 4: creating as the away side against a real linked home club
    // — proactively invite every eligible home-side editor to take over,
    // since the home club usually runs the actual live coverage.
    if (!isHomeGame && opponentClubRealId && opponentEligible.length > 0) {
      const opponentClubSnap = await db.collection("clubs").doc(opponentClubRealId).get();
      const template = await getTemplate(db, "gameTakeoverInvite");
      const vars = {
        clubName: opponentClubSnap.data()?.name ?? "",
        opponentClubName: club.name,
        gameDate: formatDateDe(scheduledStartTs.toDate()),
        homeTeamName,
        awayTeamName,
      };
      const subject = renderTemplate(template.subject, vars);
      const html = renderTemplate(template.html, vars);
      await Promise.all(
        opponentEligible.map((editorUid) =>
          sendToEditorIfOptedIn(editorUid, "gameTakeoverInvite", subject, html)
        )
      );
      await gameRef.collection("editorHistory").add({
        action: "takeoverInviteSent",
        timestamp: FieldValue.serverTimestamp(),
      });
    }

    return { gameId: gameRef.id, alreadyExisted: false };
  }
);
