import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin";

export const onTeamWrite = onDocumentWritten(
  "clubs/{clubId}/teams/{teamId}",
  async (event) => {
    const { clubId, teamId } = event.params;
    const after = event.data?.after;
    const before = event.data?.before;
    const afterData = after?.exists ? after.data() : null;
    const beforeData = before?.exists ? before.data() : null;

    const clubSnap = await db.collection("clubs").doc(clubId).get();
    const clubData = clubSnap.data();
    const publicClubId = clubData?.publicClubId;
    if (!publicClubId) return;

    const nestedMirrorRef = db
      .collection("publicClubs")
      .doc(publicClubId)
      .collection("teams")
      .doc(teamId);

    // publicTeamId is assigned once at team creation (createTeam.ts) and
    // never changes; read it from whichever snapshot has it.
    const publicTeamId: string | undefined = afterData?.publicTeamId ?? beforeData?.publicTeamId;
    const globalMirrorRef = publicTeamId ? db.collection("publicTeams").doc(publicTeamId) : null;

    if (!afterData || afterData.active === false) {
      await nestedMirrorRef.delete();
      if (globalMirrorRef) await globalMirrorRef.delete();
      return;
    }

    await nestedMirrorRef.set({
      teamId,
      publicTeamId: publicTeamId ?? null,
      name: afterData.name,
      shortName: afterData.shortName,
      sport: afterData.sport,
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (globalMirrorRef) {
      await globalMirrorRef.set({
        publicTeamId,
        teamId,
        clubId,
        publicClubId,
        clubName: clubData?.name ?? null,
        clubLogoUrl: clubData?.logoUrl ?? null,
        name: afterData.name,
        shortName: afterData.shortName,
        sport: afterData.sport,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }
);
