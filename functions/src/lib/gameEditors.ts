import { db } from "../firebaseAdmin";
import { sendMail } from "./mailer";

// Everyone who could ever administer a given team: clubAdmin (unscoped) or
// a reporter whose teamIds includes this team. Reads the whole members
// subcollection and filters in memory rather than an array-contains query —
// clubs are small (tens of members, not thousands), so this avoids needing
// a composite index for a query used nowhere else.
export async function eligibleEditorsForTeam(clubId: string, teamId: string): Promise<string[]> {
  const snap = await db.collection("clubs").doc(clubId).collection("members").get();
  return snap.docs
    .filter((d) => {
      const data = d.data();
      if (data.role === "clubAdmin") return true;
      if (data.role === "reporter") return (data.teamIds as string[] | undefined)?.includes(teamId) ?? false;
      return false;
    })
    .map((d) => d.id);
}

// Which of a game's two clubs a given eligible-editor uid actually belongs
// to — needed because eligibleEditorUids merges both sides into one flat
// list. Checks membership directly rather than trusting a stored value, so
// it stays correct even if someone's club membership changes after a game
// was created.
export async function resolveEditorClubId(
  game: { homeClubId?: string | null; awayClubId?: string | null },
  uid: string
): Promise<string | null> {
  const candidates = [game.homeClubId, game.awayClubId].filter((id): id is string => !!id);
  const snaps = await Promise.all(
    candidates.map((clubId) => db.collection("clubs").doc(clubId).collection("members").doc(uid).get())
  );
  const found = snaps.findIndex((s) => s.exists);
  return found === -1 ? null : candidates[found];
}

// The game doc's own mainEditorDisplayName field is a snapshot of this,
// refreshed whenever mainEditorUid changes — the client can't read another
// user's users/{uid} doc directly (self-read only, see firestore.rules), so
// this has to be denormalized onto something both clubs can already read.
export async function editorDisplayName(uid: string): Promise<string | null> {
  const snap = await db.collection("users").doc(uid).get();
  return (snap.data()?.publicDisplayName as string | undefined) ?? null;
}

export type NotificationKey = "gameTakenOver" | "gameHandedOff" | "gameTakeoverInvite" | "reminders" | "generalInfo";

// All notification categories default to on — an operationally important
// mail (e.g. "you were just handed a game to administer") should never be
// silently missed because of an unset preference. users/{uid} can override
// individual keys off; unset or missing keys stay opted-in. Extensible by
// construction — a new key just needs a UI toggle later, not a schema
// change or a new function.
export async function sendToEditorIfOptedIn(
  uid: string,
  key: NotificationKey,
  subject: string,
  html: string
): Promise<void> {
  const userSnap = await db.collection("users").doc(uid).get();
  const userData = userSnap.data();
  const email = userData?.email as string | undefined;
  if (!email) return;
  const prefs = userData?.notificationPrefs as Record<string, boolean> | undefined;
  if (prefs?.[key] === false) return;
  await sendMail({ to: email, subject, html }).catch(() => undefined);
}
