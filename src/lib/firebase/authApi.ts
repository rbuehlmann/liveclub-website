"use client";

import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseClient } from "./client";
import { sendVerificationEmail, sendPasswordResetLink } from "./functionsApi";

export async function registerWithEmail(input: {
  email: string;
  password: string;
  displayName: string;
}) {
  const { auth, db } = getFirebaseClient();
  const credential = await createUserWithEmailAndPassword(auth, input.email, input.password);
  await updateProfile(credential.user, { displayName: input.displayName });

  await setDoc(doc(db, "users", credential.user.uid), {
    uid: credential.user.uid,
    email: input.email,
    displayName: input.displayName,
    createdAt: serverTimestamp(),
  });

  // Sent via our own no-reply@liveclub.app SMTP (see
  // functions/src/callable/sendVerificationEmail.ts) instead of Firebase
  // Auth's built-in sendEmailVerification, which sends from Firebase's own
  // domain with a generic English template.
  await sendVerificationEmail();
  return credential.user;
}

export async function loginWithEmail(email: string, password: string) {
  const { auth } = getFirebaseClient();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function logout() {
  const { auth } = getFirebaseClient();
  await signOut(auth);
}

export async function resetPassword(email: string) {
  // Same reasoning as registerWithEmail — routed through our own SMTP
  // instead of Firebase Auth's built-in sendPasswordResetEmail.
  await sendPasswordResetLink(email);
}
