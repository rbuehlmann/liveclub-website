import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin";
import { sendMail } from "../lib/mailer";
import { smtpPassword } from "../lib/secrets";
import { getTemplate, renderTemplate } from "../lib/emailTemplates";

// A "duplicate" only counts if the two clubs' games are within this many
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
  scheduledStart?: string; // ISO string, optional
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
 * Creates a game, replacing the previous direct client-side `addDoc` — that
 * write path is now blocked in firestore.rules (`allow create: if false`)
 * because a trustworthy duplicate check needs a server-side cross-club
 * read, which Firestore rules can't do (a club can't read another club's
 * private games subcollection, by design).
 *
 * When the opponent is a *linked* real LiveClub club (not just a typed
 * name), checks whether that club already has a matching game against us
 * within DUPLICATE_WINDOW_HOURS. If so: the home club's entry always wins
 * (they're the one with the actual stadium announcer running the live
 * score) — the away side's create is rejected if the home side already
 * exists, or the away side's earlier entry gets auto-cancelled (with a
 * notification email) if the home side creates afterwards.
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
    let opponentClubName = opponentDisplayName;
    let opponentClubPublicId: string | null = null;
    let opponentClubRealId: string | null = null;
    let opponentTeamIdToStore: string | null = null;

    if (opponentPublicClubId?.trim()) {
      const publicClubSnap = await db.collection("publicClubs").doc(opponentPublicClubId.trim()).get();
      if (publicClubSnap.exists) {
        const publicClubData = publicClubSnap.data()!;
        opponentClubPublicId = opponentPublicClubId.trim();
        opponentClubRealId = publicClubData.clubId;
        opponentClubName = publicClubData.name;
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
    // duplicate check below silently no-ops without a scheduledStart on
    // both sides, so a client bug (or a bypassed/stale form) must never be
    // able to slip a game through without one.
    if (!scheduledStart) {
      throw new HttpsError("invalid-argument", "Anstoss fehlt.");
    }

    const scheduledStartTs = Timestamp.fromDate(new Date(scheduledStart));

    const homeTeamName = isHomeGame ? ownTeamName : opponentDisplayName;
    const awayTeamName = isHomeGame ? opponentDisplayName : ownTeamName;
    const homeClubPublicId = isHomeGame ? club.publicClubId : opponentClubPublicId;
    const awayClubPublicId = isHomeGame ? opponentClubPublicId : club.publicClubId;
    const homeTeamIdField = isHomeGame ? teamId : opponentTeamIdToStore;
    const awayTeamIdField = isHomeGame ? opponentTeamIdToStore : teamId;

    // Duplicate check — only possible when the opponent is a real linked
    // club, since that's the only case where we know which club's games
    // subcollection to look in.
    if (opponentClubRealId && homeClubPublicId && awayClubPublicId) {
      const opponentGamesSnap = await db
        .collection("clubs")
        .doc(opponentClubRealId)
        .collection("games")
        .where("homeClubPublicId", "==", homeClubPublicId)
        .where("awayClubPublicId", "==", awayClubPublicId)
        .get();

      const windowMs = DUPLICATE_WINDOW_HOURS * 60 * 60 * 1000;
      const match = opponentGamesSnap.docs.find((d) => {
        const data = d.data();
        if (data.status === "cancelled") return false;
        if (!data.scheduledStart) return false;
        const diff = Math.abs(
          (data.scheduledStart as Timestamp).toMillis() - scheduledStartTs.toMillis()
        );
        return diff <= windowMs;
      });

      if (match) {
        if (!isHomeGame) {
          // We're away, home already has it — home wins, we don't create.
          throw new HttpsError(
            "already-exists",
            `Der Heimverein ${opponentClubName} hat dieses Spiel bereits erfasst.`
          );
        }
        // We're home — proceed, and cancel the away club's earlier entry.
        await match.ref.update({
          status: "cancelled",
          cancelledReason: "Automatisch storniert — der Heimverein hat dieses Spiel bereits erfasst.",
          updatedAt: FieldValue.serverTimestamp(),
        });
        const awayClubSnap = await db.collection("clubs").doc(opponentClubRealId).get();
        const awayClubContactEmail = awayClubSnap.data()?.contactEmail as string | undefined;
        if (awayClubContactEmail) {
          const vars = {
            clubName: awayClubSnap.data()?.name ?? "",
            opponentClubName: club.name,
            gameDate: formatDateDe(scheduledStartTs.toDate()),
          };
          const template = await getTemplate(db, "gameSuperseded");
          await sendMail({
            to: awayClubContactEmail,
            subject: renderTemplate(template.subject, vars),
            html: renderTemplate(template.html, vars),
          }).catch(() => undefined);
        }
      }
    }

    const gameRef = clubRef.collection("games").doc();
    await gameRef.set({
      clubId,
      publicClubId: club.publicClubId,
      teamId,
      homeTeamName,
      awayTeamName,
      homeClubPublicId,
      awayClubPublicId,
      homeTeamId: homeTeamIdField,
      awayTeamId: awayTeamIdField,
      isHomeGame,
      scheduledStart: scheduledStartTs,
      status: "scheduled",
      score: { home: 0, away: 0 },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { gameId: gameRef.id };
  }
);
