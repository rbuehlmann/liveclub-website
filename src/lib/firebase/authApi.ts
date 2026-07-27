"use client";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseClient } from "./client";

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

  await sendEmailVerification(credential.user);
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
  const { auth } = getFirebaseClient();
  await sendPasswordResetEmail(auth, email);
}
