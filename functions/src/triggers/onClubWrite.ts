import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { db } from "../firebaseAdmin";

// createClub.ts writes the initial publicClubs/{publicClubId} mirror once at
// creation time, but nothing kept it in sync afterwards — a clubAdmin
// renaming their club or changing the logo would only ever update the
// private clubs/{clubId} doc. This mirrors every subsequent write too.
export const onClubWrite = onDocumentWritten("clubs/{clubId}", async (event) => {
  const after = event.data?.after;
  const afterData = after?.exists ? after.data() : null;
  if (!afterData) return;

  const publicClubId = afterData.publicClubId;
  if (!publicClubId) return;

  await db.collection("publicClubs").doc(publicClubId).set(
    {
      name: afterData.name,
      sport: afterData.sport,
      country: afterData.country ?? null,
      logoUrl: afterData.logoUrl ?? null,
    },
    { merge: true }
  );
});
