"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { acceptInvitation } from "@/lib/firebase/functionsApi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

interface InvitationPreview {
  clubId: string;
  clubName: string;
  role: string;
  status: string;
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

export default function InvitePage() {
  const params = useParams<{ invitationId: string }>();
  const router = useRouter();
  const { user, authLoading } = useAuth();
  const [invitation, setInvitation] = useState<InvitationPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [loadingInvite, setLoadingInvite] = useState(true);

  useEffect(() => {
    if (authLoading || !user) {
      setLoadingInvite(false);
      return;
    }
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
        });
      })
      .catch(() => setError("Diese Einladung konnte nicht geladen werden."))
      .finally(() => setLoadingInvite(false));
  }, [authLoading, user, params.invitationId]);

  const redirectTarget = `/invite/${params.invitationId}`;

  async function handleAccept() {
    setAccepting(true);
    setError(null);
    try {
      await acceptInvitation(params.invitationId);
      if (user && invitation) {
        await waitForClubMembership(user.uid, invitation.clubId);
      }
      router.push("/dashboard");
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Beitritt fehlgeschlagen.");
    } finally {
      setAccepting(false);
    }
  }

  if (authLoading || loadingInvite) {
    return (
      <div className="flex min-h-screen flex-col bg-brand-white">
        <PublicHeader />
        <main className="flex flex-1 items-center justify-center text-gray-500">Wird geladen …</main>
        <PublicFooter />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col bg-brand-white">
        <PublicHeader />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
          <Card>
            <h1 className="mb-4 text-xl font-bold text-gray-900">Einladung zu LiveClub</h1>
            <p className="mb-6 text-sm text-gray-600">
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

  return (
    <div className="flex min-h-screen flex-col bg-brand-white">
      <PublicHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <Card>
          <h1 className="mb-4 text-xl font-bold text-gray-900">Einladung zu LiveClub</h1>
          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
          {invitation && invitation.status === "pending" && (
            <>
              <p className="mb-6 text-sm text-gray-700">
                Du wurdest eingeladen, <strong>{invitation.clubName}</strong> als{" "}
                {invitation.role === "reporter" ? "Redaktor" : "Vereinsadministrator"} beizutreten.
              </p>
              <Button fullWidth onClick={handleAccept} disabled={accepting}>
                {accepting ? "Wird verarbeitet …" : "Einladung annehmen"}
              </Button>
            </>
          )}
          {invitation && invitation.status !== "pending" && (
            <p className="text-sm text-gray-600">Diese Einladung wurde bereits verwendet.</p>
          )}
        </Card>
      </main>
      <PublicFooter />
    </div>
  );
}
