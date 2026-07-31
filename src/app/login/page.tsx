"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { loginWithEmail, resetPassword } from "@/lib/firebase/authApi";
import { toGermanAuthErrorMessage } from "@/lib/firebase/errorMessages";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Card } from "@/components/ui/Card";

function LoginForm() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await loginWithEmail(email, password);
      router.push(redirectTarget);
    } catch (err) {
      setError(toGermanAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotPassword() {
    setError(null);
    setInfo(null);
    if (!email) {
      setError("Bitte gib zuerst deine E-Mail-Adresse ein.");
      return;
    }
    try {
      await resetPassword(email);
      setInfo("E-Mail zum Zurücksetzen des Passworts wurde gesendet.");
    } catch (err) {
      setError(toGermanAuthErrorMessage(err));
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <Card>
        <h1 className="mb-6 text-2xl font-bold text-gray-900">{t("loginTitle")}</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          {info && <p className="text-sm text-green-700">{info}</p>}
          <Button type="submit" fullWidth disabled={submitting}>
            {submitting ? tCommon("loading") : t("loginButton")}
          </Button>
          <button
            type="button"
            onClick={handleForgotPassword}
            className="text-sm text-blue-700 hover:underline"
          >
            {t("forgotPassword")}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          <Link href="/register" className="text-blue-700 hover:underline">
            {t("noAccount")}
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-gray-600">
          <Link href="/suche" className="text-blue-700 hover:underline">
            Verein oder Mannschaft suchen
          </Link>
        </p>
      </Card>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
