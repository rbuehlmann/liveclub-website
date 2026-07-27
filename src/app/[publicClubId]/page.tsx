"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { buildGameUrl } from "@/lib/publicRoutes";
import { PublicClub } from "@/lib/types";

export default function PublicClubPage() {
  const params = useParams<{ publicClubId: string }>();
  const [club, setClub] = useState<PublicClub | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const { db } = getFirebaseClient();
    return onSnapshot(doc(db, "publicClubs", params.publicClubId), (snap) => {
      if (!snap.exists()) {
        setNotFound(true);
        return;
      }
      const data = snap.data();
      setClub({
        publicClubId: snap.id,
        clubId: data.clubId,
        name: data.name,
        sport: data.sport,
        logoUrl: data.logoUrl ?? null,
        currentLiveGameId: data.currentLiveGameId ?? null,
      });
    });
  }, [params.publicClubId]);

  if (notFound) {
    return (
      <main className="flex min-h-screen items-center justify-center text-gray-500">
        Verein wurde nicht gefunden.
      </main>
    );
  }

  if (!club) return null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 px-4 text-center">
      {club.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={club.logoUrl} alt="" className="h-24 w-24 rounded-full object-contain" />
      )}
      <h1 className="text-3xl font-bold text-gray-900">{club.name}</h1>
      <p className="text-sm text-gray-500">{club.sport}</p>

      {club.currentLiveGameId ? (
        <Link
          href={buildGameUrl(club.publicClubId, club.currentLiveGameId)}
          className="rounded-lg bg-red-600 px-6 py-3 text-lg font-semibold text-white hover:bg-red-700"
        >
          ● Zum laufenden Spiel
        </Link>
      ) : (
        <p className="text-lg text-gray-600">Momentan läuft kein Spiel.</p>
      )}

      <p className="mt-8 text-xs text-gray-400">Bald verfügbar: die LiveClub-App für Fans</p>
    </main>
  );
}
