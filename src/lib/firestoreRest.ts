// Server-side, unauthenticated read of a single public Firestore document via
// the REST API — used only for the SSR existence-check + SEO metadata on
// /[publicClubId] and /team/[publicTeamId] (see the 2026-08-22 Universal
// Links work). Deliberately not the Firebase JS SDK: src/lib/firebase/client.ts
// is "use client", and importing it for a plain function call from a Server
// Component isn't a safe pattern. No credentials needed — this hits the same
// public firestore.rules a browser's onSnapshot would.
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const USE_EMULATORS = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";
// Mirrors src/lib/firebase/client.ts's connectFirestoreEmulator(db,
// "127.0.0.1", 8080) — the emulator serves the same REST surface as
// production on that port, just over plain HTTP. Without this branch,
// `npm run dev` would 404 every club/team page since demo-liveclub isn't a
// real GCP project.
const BASE_URL = USE_EMULATORS
  ? `http://127.0.0.1:8080/v1/projects/${PROJECT_ID}/databases/(default)/documents`
  : `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

type FirestoreFieldValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { timestampValue: string }
  | { mapValue: { fields?: Record<string, FirestoreFieldValue> } };

function parseValue(value: FirestoreFieldValue | undefined): unknown {
  if (!value) return undefined;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("nullValue" in value) return null;
  // ISO 8601 string (RFC 3339) — sitemap.ts is the first caller that needs
  // a Firestore Timestamp field (licenseValidUntil), everything before
  // this only ever read strings.
  if ("timestampValue" in value) return value.timestampValue;
  if ("mapValue" in value) return parseFields(value.mapValue.fields ?? {});
  return undefined;
}

function parseFields(fields: Record<string, FirestoreFieldValue>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, parseValue(value)]));
}

/**
 * Returns the document's fields as a plain object, or null if it doesn't
 * exist OR firestore.rules denies the read (e.g. an expired-license club) —
 * both cases mean "treat as not found" for the pages that call this.
 */
export async function fetchPublicDoc(
  collection: string,
  docId: string
): Promise<Record<string, unknown> | null> {
  if (!PROJECT_ID) return null;
  const res = await fetch(`${BASE_URL}/${collection}/${encodeURIComponent(docId)}`, {
    // The emulator's REST responses aren't cacheable across dev reloads in
    // any useful way, and Next's fetch cache doesn't apply to it anyway —
    // only bother with revalidate against the real project.
    ...(USE_EMULATORS ? { cache: "no-store" as const } : { next: { revalidate: 60 } }),
  });
  if (!res.ok) return null;
  const doc = (await res.json()) as { fields?: Record<string, FirestoreFieldValue> };
  return parseFields(doc.fields ?? {});
}

/**
 * Lists every document in a public collection (paginated internally, since
 * Firestore's REST list endpoint caps pageSize) — used only by sitemap.ts,
 * which is the one place that needs "every publicClub/publicTeam", not just
 * one by id. Same public, unauthenticated REST surface as fetchPublicDoc;
 * firestore.rules already allows `list: if true` on both collections this
 * is called with.
 */
export async function fetchPublicCollection(
  collection: string
): Promise<{ id: string; fields: Record<string, unknown> }[]> {
  if (!PROJECT_ID) return [];
  const results: { id: string; fields: Record<string, unknown> }[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL(`${BASE_URL}/${collection}`);
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url.toString(), {
      ...(USE_EMULATORS ? { cache: "no-store" as const } : { next: { revalidate: 3600 } }),
    });
    if (!res.ok) break;
    const page = (await res.json()) as {
      documents?: { name: string; fields?: Record<string, FirestoreFieldValue> }[];
      nextPageToken?: string;
    };
    for (const doc of page.documents ?? []) {
      const id = doc.name.split("/").pop() ?? "";
      results.push({ id, fields: parseFields(doc.fields ?? {}) });
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
  return results;
}
