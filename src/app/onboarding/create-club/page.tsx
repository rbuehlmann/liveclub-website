"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/components/auth/AuthProvider";
import { createClub } from "@/lib/firebase/functionsApi";
import { getFirebaseClient } from "@/lib/firebase/client";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Card } from "@/components/ui/Card";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The dashboard guard redirects away as soon as it sees a user with no
 * club yet. createClub() commits server-side before returning, but the
 * client's realtime listener for users/{uid} can lag a beat behind that
 * write — without this wait, navigating straight to /dashboard could race
 * the listener and bounce back here. Polling a plain getDoc (rather than
 * onSnapshot) primes the SDK's local cache so the dashboard's own listener
 * sees the update immediately once we do navigate.
 */
async function waitForClubMembership(uid: string, clubId: string) {
  const { db } = getFirebaseClient();
  for (let attempt = 0; attempt < 20; attempt++) {
    const snap = await getDoc(doc(db, "users", uid));
    const clubIds: string[] = snap.data()?.clubIds ?? [];
    if (clubIds.includes(clubId)) return;
    await sleep(150);
  }
}

// Nur Fussball für den Start — weitere Sportarten folgen später.
const SPORTS = ["Fussball"];

// Fixe Liste statt Freitext, damit die spätere Länder-Filterung in der
// öffentlichen Suche konsistente Werte hat.
const COUNTRIES = ["Schweiz", "Deutschland", "Österreich", "Liechtenstein"];

export default function CreateClubPage() {
  const t = useTranslations("clubSetup");
  const tCommon = useTranslations("common");
  const { user, authLoading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [sport, setSport] = useState(SPORTS[0]);
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [contactName, setContactName] = useState(user?.displayName ?? "");
  const [contactEmail, setContactEmail] = useState(user?.email ?? "");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [secondaryColor, setSecondaryColor] = useState("#1e293b");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Set once createClub() succeeds — switches the page to the optional
  // logo-upload step. Logo can't be collected in step 1: Storage rules
  // gate clubs/{clubId}/logo/ writes on the clubId/role custom claims,
  // which only exist once createClub has run and the token is refreshed.
  const [createdClubId, setCreatedClubId] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  if (!authLoading && !user) {
    router.replace("/login");
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { clubId } = await createClub({
        name,
        sport,
        country,
        language: "de",
        contactName,
        contactEmail,
        primaryColor,
        secondaryColor,
      });
      if (user) {
        await waitForClubMembership(user.uid, clubId);
        await user.getIdToken(true);
      }
      setCreatedClubId(clubId);
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Etwas ist schiefgelaufen.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !createdClubId) return;
    setUploadingLogo(true);
    setLogoError(null);
    try {
      const { db, storage } = getFirebaseClient();
      const logoRef = ref(storage, `clubs/${createdClubId}/logo/${file.name}`);
      await uploadBytes(logoRef, file);
      const url = await getDownloadURL(logoRef);
      await updateDoc(doc(db, "clubs", createdClubId), { logoUrl: url });
      setLogoUrl(url);
    } catch (err) {
      setLogoError(
        (err as { code?: string; message?: string })?.code ?? (err as Error)?.message ?? "Logo-Upload fehlgeschlagen."
      );
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  }

  function finishOnboarding() {
    router.push("/dashboard");
  }

  if (createdClubId) {
    return (
      <div className="flex min-h-screen flex-col bg-brand-white dark:bg-brand-black">
        <PublicHeader />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
          <Card>
            <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Vereinslogo (optional)</h1>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
              Kannst du auch später jederzeit in den Vereinseinstellungen hinzufügen.
            </p>
            <div className="flex flex-col gap-4">
              {logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="h-20 w-20 rounded object-contain" />
              )}
              <input type="file" accept="image/*" onChange={handleLogoChange} disabled={uploadingLogo} />
              <p className="text-xs text-gray-500 dark:text-gray-400">Empfehlung: 500×500 px, transparentes PNG.</p>
              {uploadingLogo && <p className="text-xs text-gray-500 dark:text-gray-400">Wird hochgeladen …</p>}
              {logoError && <p className="text-xs text-red-600">Fehler: {logoError}</p>}
              <Button onClick={finishOnboarding} fullWidth disabled={uploadingLogo}>
                {logoUrl ? "Fertig" : "Überspringen"}
              </Button>
            </div>
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
        <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">{t("title")}</h1>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">{t("trialNotice")}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField
            label={t("clubName")}
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="sport" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("sport")}
            </label>
            <select
              id="sport"
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
            >
              {SPORTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400">Weitere Sportarten folgen bald.</p>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="country" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("country")}
            </label>
            <select
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
            >
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <TextField
            label={t("contactName")}
            name="contactName"
            required
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
          />
          <TextField
            label={t("contactEmail")}
            name="contactEmail"
            type="email"
            required
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
          <div className="flex gap-6">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Heimfarbe</label>
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-16 rounded border border-gray-300"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Auswärtsfarbe</label>
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="h-10 w-16 rounded border border-gray-300"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" fullWidth disabled={submitting}>
            {submitting ? tCommon("loading") : t("submit")}
          </Button>
        </form>
        </Card>
      </main>
      <PublicFooter />
    </div>
  );
}
