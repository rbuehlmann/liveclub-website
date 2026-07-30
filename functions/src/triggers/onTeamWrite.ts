import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin";

export const onTeamWrite = onDocumentWritten(
  "clubs/{clubId}/teams/{teamId}",
  async (event) => {
    const { clubId, teamId } = event.params;
    const after = event.data?.after;
    const afterData = after?.exists ? after.data() : null;

    const clubSnap = await db.collection("clubs").doc(clubId).get();
    const publicClubId = clubSnap.data()?.publicClubId;
    if (!publicClubId) return;

    const mirrorRef = db
      .collection("publicClubs")
      .doc(publicClubId)
      .collection("teams")
      .doc(teamId);

    if (!afterData || afterData.active === false) {
      await mirrorRef.delete();
      return;
    }

    await mirrorRef.set({
      teamId,
      name: afterData.name,
      shortName: afterData.shortName,
      sport: afterData.sport,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
);
