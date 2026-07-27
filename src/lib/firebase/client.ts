"use client";

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, Firestore } from "firebase/firestore";
import { getStorage, connectStorageEmulator, FirebaseStorage } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator, Functions } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";

function createFirebaseClient() {
  const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth: Auth = getAuth(app);
  const db: Firestore = getFirestore(app);
  const storage: FirebaseStorage = getStorage(app);
  const functions: Functions = getFunctions(app, "us-central1");

  if (useEmulators) {
    // Guarded so hot-reload in dev doesn't try to reconnect repeatedly.
    const globalWithFlag = globalThis as typeof globalThis & {
      __liveclubEmulatorsConnected?: boolean;
    };
    if (!globalWithFlag.__liveclubEmulatorsConnected) {
      connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
      connectFirestoreEmulator(db, "127.0.0.1", 8080);
      connectStorageEmulator(storage, "127.0.0.1", 9199);
      connectFunctionsEmulator(functions, "127.0.0.1", 5001);
      globalWithFlag.__liveclubEmulatorsConnected = true;
    }
  }

  return { app, auth, db, storage, functions };
}

let client: ReturnType<typeof createFirebaseClient> | null = null;

export function getFirebaseClient() {
  if (!client) {
    client = createFirebaseClient();
  }
  return client;
}
