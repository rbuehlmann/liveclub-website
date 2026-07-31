"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { getFirebaseClient } from "@/lib/firebase/client";
import { syncClubClaims } from "@/lib/firebase/functionsApi";

interface AuthContextValue {
  user: User | null;
  authLoading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, authLoading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const { auth } = getFirebaseClient();
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
      if (nextUser) {
        // Custom claims (clubId/role) back Storage Security Rules — sync
        // them on every sign-in so they never drift from Firestore, then
        // force a token refresh so newly-set claims take effect immediately
        // instead of waiting out the ID token's normal ~1h refresh cycle.
        syncClubClaims()
          .then(() => nextUser.getIdToken(true))
          .catch(() => {});
      }
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, authLoading }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
