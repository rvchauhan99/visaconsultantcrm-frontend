"use client";

import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseAuthConfigured() {
  return Boolean(
    firebaseConfig.apiKey
    && firebaseConfig.authDomain
    && firebaseConfig.projectId
    && firebaseConfig.appId,
  );
}

function getFirebaseAuth() {
  if (!isFirebaseAuthConfigured()) {
    throw new Error("Google sign-in is not configured");
  }
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return getAuth(app);
}

/**
 * Opens Google sign-in via Firebase popup and returns a Firebase ID token
 * for POST /api/auth/customer/google.
 */
export async function signInWithGoogle() {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken();
  return idToken;
}

/** Best-effort Firebase sign-out; no-op when Google auth is not configured. */
export async function signOutCustomer() {
  if (!isFirebaseAuthConfigured()) return;
  try {
    await signOut(getFirebaseAuth());
  } catch {
    /* ignore — local session clear still proceeds */
  }
}
