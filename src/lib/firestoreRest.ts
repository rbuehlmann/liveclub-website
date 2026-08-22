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
  | { mapValue: { fields?: Record<string, FirestoreFieldValue> } };

function parseValue(value: FirestoreFieldValue | undefined): unknown {
  if (!value) return undefined;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("nullValue" in value) return null;
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
