"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { registerWithEmail } from "@/lib/firebase/authApi";
import { toGermanAuthErrorMessage } from "@/lib/firebase/errorMessages";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Card } from "@/components/ui/Card";

function RegisterForm() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await registerWithEmail({ email, password, displayName });
      router.push(redirectTarget || "/onboarding/create-club");
    } catch (err) {
      setError(toGermanAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-brand-white">
      <PublicHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <Card>
          <h1 className="mb-6 text-2xl font-bold text-gray-900">{t("registerTitle")}</h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <TextField
              label={t("displayName")}
              name="displayName"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <TextField
              label={t("email")}
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              label={t("password")}
              name="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" fullWidth disabled={submitting}>
              {submitting ? tCommon("loading") : t("registerButton")}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-600">
            <Link
              href={redirectTarget ? `/login?redirect=${encodeURIComponent(redirectTarget)}` : "/login"}
              className="text-brand-red hover:underline"
            >
              {t("alreadyHaveAccount")}
            </Link>
          </p>
        </Card>
      </main>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
