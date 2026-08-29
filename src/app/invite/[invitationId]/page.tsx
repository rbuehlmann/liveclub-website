"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { acceptInvitation } from "@/lib/firebase/functionsApi";
import { logout, registerWithEmail, loginWithEmail } from "@/lib/firebase/authApi";
import { toGermanAuthErrorMessage } from "@/lib/firebase/errorMessages";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

interface InvitationPreview {
  clubId: string;
  clubName: string;
  role: string;
  status: string;
  email: string | null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// See waitForClubMembership in onboarding/create-club: same
// write-then-listener-lag race between the accept callable and the
// dashboard guard's realtime membership check.
async function waitForClubMembership(uid: string, clubId: string) {
  const { db } = getFirebaseClient();
  for (let attempt = 0; attempt < 20; attempt++) {
    const snap = await getDoc(doc(db, "users", uid));
    const clubIds: string[] = snap.data()?.clubIds ?? [];
    if (clubIds.includes(clubId)) return;
    await sleep(150);
  }
}

function roleLabel(role: string) {
  return role === "reporter" ? "Redaktor" : "Vereinsadministrator";
}

export default function InvitePage() {
  const params = useParams<{ invitationId: string }>();
  const router = useRouter();
  const { user, authLoading } = useAuth();
  const [invitation, setInvitation] = useState<InvitationPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [switchingAccount, setSwitchingAccount] = useState(false);

  // For the not-logged-in, email-known path: create a fresh account (default)
  // or switch to logging into an existing one — same email either way, taken
  // straight from the invitation rather than re-typed.
  const [authMode, setAuthMode] = useState<"create" | "login">("create");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [agbAccepted, setAgbAccepted] = useState(false);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Loaded regardless of auth state — the not-logged-in view needs
  // invitation.email to offer a "set your password" form instead of the
  // generic /register page.
  useEffect(() => {
    if (authLoading) return;
    const { db } = getFirebaseClient();
    getDoc(doc(db, "invitations", params.invitationId))
      .then((snap) => {
        const data = snap.data();
        if (!data) {
          setError("Diese Einladung wurde nicht gefunden.");
          return;
        }
        setInvitation({
          clubId: data.clubId,
          clubName: data.clubName,
          role: data.role,
          status: data.status,
          email: data.email ?? null,
        });
      })
      .catch(() => setError("Diese Einladung konnte nicht geladen werden."))
      .finally(() => setLoadingInvite(false));
  }, [authLoading, params.invitationId]);

  const redirectTarget = `/invite/${params.invitationId}`;

  const emailMismatch =
    !!invitation?.email && !!user?.email && invitation.email.toLowerCase() !== user.email.toLowerCase();

  async function handleSwitchAccount() {
    setSwitchingAccount(true);
    try {
      await logout();
    } finally {
      setSwitchingAccount(false);
    }
  }

  async function finishAccepting(uid: string, clubId: string) {
    await acceptInvitation(params.invitationId);
    await waitForClubMembership(uid, clubId);
    router.push("/dashboard");
  }

  async function handleAccept() {
    if (!user || !invitation) return;
    setAccepting(true);
    setError(null);
    try {
      await finishAccepting(user.uid, invitation.clubId);
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Beitritt fehlgeschlagen.");
    } finally {
      setAccepting(false);
    }
  }

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!invitation?.email) return;
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const credentialUser =
        authMode === "create"
          ? await registerWithEmail({ email: invitation.email, password, displayName: name })
          : await loginWithEmail(invitation.email, password);
      await finishAccepting(credentialUser.uid, invitation.clubId);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (authMode === "create" && code === "auth/email-already-in-use") {
        setAuthMode("login");
        setAuthError("Für diese E-Mail-Adresse gibt es bereits ein Konto — bitte melde dich an.");
      } else {
        setAuthError(toGermanAuthErrorMessage(err));
      }
    } finally {
      setAuthSubmitting(false);
    }
  }

  if (authLoading || loadingInvite) {
    return (
      <div className="flex min-h-screen flex-col bg-brand-white dark:bg-brand-black">
        <PublicHeader />
        <main className="flex flex-1 items-center justify-center text-gray-500 dark:text-gray-400">Wird geladen …</main>
        <PublicFooter />
      </div>
    );
  }

  if (!user) {
    if (error) {
      return (
        <div className="flex min-h-screen flex-col bg-brand-white dark:bg-brand-black">
          <PublicHeader />
          <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
            <Card>
              <h1 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Einladung zu LiveClub</h1>
              <p className="text-sm text-red-600">{error}</p>
            </Card>
          </main>
          <PublicFooter />
        </div>
      );
    }

    // Open-link invite (no specific email attached) — we can't presume an
    // account's existence for an unknown address, so fall back to the
    // generic login/register choice.
    if (!invitation?.email) {
      return (
        <div className="flex min-h-screen flex-col bg-brand-white dark:bg-brand-black">
          <PublicHeader />
          <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
            <Card>
              <h1 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Einladung zu LiveClub</h1>
              <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
                Bitte melde dich an oder registriere dich, um die Einladung anzunehmen.
              </p>
              <div className="flex flex-col gap-3">
                <Link href={`/login?redirect=${encodeURIComponent(redirectTarget)}`}>
                  <Button fullWidth>Anmelden</Button>
                </Link>
                <Link href={`/register?redirect=${encodeURIComponent(redirectTarget)}`}>
                  <Button variant="secondary" fullWidth>
                    Registrieren
                  </Button>
                </Link>
              </div>
            </Card>
          </main>
          <PublicFooter />
        </div>
      );
    }

    // Email-addressed invite — the email is already known, so skip the
    // generic "Verein registrieren" page entirely (wrong framing for
    // someone just joining as a reporter/admin, not founding a club) and
    // let them set a password directly, or switch to logging in if an
    // account for that address already exists.
    return (
      <div className="flex min-h-screen flex-col bg-brand-white dark:bg-brand-black">
        <PublicHeader />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
          <Card>
            <h1 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">Einladung zu LiveClub</h1>
            {invitation.status === "pending" ? (
              <>
                <p className="mb-1 text-sm text-gray-700 dark:text-gray-300">
                  Du wurdest eingeladen, <strong>{invitation.clubName}</strong> als{" "}
                  {roleLabel(invitation.role)} beizutreten.
                </p>
                <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                  Für: <strong>{invitation.email}</strong>
                </p>
                <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
                  {authMode === "create" && (
                    <TextField
                      label="Dein Name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  )}
                  <TextField
                    label="Passwort"
                    type="password"
                    required
                    minLength={authMode === "create" ? 6 : undefined}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {authMode === "create" && (
                    <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        required
                        checked={agbAccepted}
                        onChange={(e) => setAgbAccepted(e.target.checked)}
                        className="mt-1"
                      />
                      <span>
                        Ich habe die{" "}
                        <Link href="/terms-of-service" target="_blank" className="text-brand-red-link hover:underline">
                          AGB
                        </Link>{" "}
                        gelesen und akzeptiere sie.
                      </span>
                    </label>
                  )}
                  {authError && <p className="text-sm text-red-600">{authError}</p>}
                  <Button
                    type="submit"
                    fullWidth
                    disabled={authSubmitting || (authMode === "create" && !agbAccepted)}
                  >
                    {authSubmitting
                      ? "Wird verarbeitet …"
                      : authMode === "create"
                        ? "Konto erstellen & Einladung annehmen"
                        : "Anmelden & Einladung annehmen"}
                  </Button>
                </form>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === "create" ? "login" : "create");
                    setAuthError(null);
                  }}
                  className="mt-4 text-center text-sm text-brand-red-link hover:underline"
                >
                  {authMode === "create"
                    ? "Du hast schon ein Konto? Anmelden"
                    : "Noch kein Konto? Konto erstellen"}
                </button>
              </>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">Diese Einladung wurde bereits verwendet.</p>
            )}
          </Card>
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-brand-white dark:bg-brand-black">
      <PublicHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <Card>
          <h1 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Einladung zu LiveClub</h1>
          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
          {invitation && invitation.status === "pending" && emailMismatch && (
            <>
              <p className="mb-6 text-sm text-gray-700 dark:text-gray-300">
                Diese Einladung ist für <strong>{invitation.email}</strong> bestimmt. Du bist aktuell als{" "}
                <strong>{user?.email}</strong> eingeloggt.
              </p>
              <Button fullWidth onClick={handleSwitchAccount} disabled={switchingAccount}>
                {switchingAccount ? "Wird abgemeldet …" : "Abmelden und mit anderem Konto fortfahren"}
              </Button>
            </>
          )}
          {invitation && invitation.status === "pending" && !emailMismatch && (
            <>
              <p className="mb-6 text-sm text-gray-700 dark:text-gray-300">
                Du wurdest eingeladen, <strong>{invitation.clubName}</strong> als{" "}
                {roleLabel(invitation.role)} beizutreten.
              </p>
              <Button fullWidth onClick={handleAccept} disabled={accepting}>
                {accepting ? "Wird verarbeitet …" : "Einladung annehmen"}
              </Button>
            </>
          )}
          {invitation && invitation.status !== "pending" && (
            <p className="text-sm text-gray-600 dark:text-gray-400">Diese Einladung wurde bereits verwendet.</p>
          )}
        </Card>
      </main>
      <PublicFooter />
    </div>
  );
}
