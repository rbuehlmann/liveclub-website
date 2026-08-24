"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { submitClubRecommendation } from "@/lib/firebase/functionsApi";
import { getRecaptchaToken } from "@/lib/recaptcha";

const COUNTRIES = ["Schweiz", "Deutschland", "Österreich", "Liechtenstein"];

export default function RecommendClubPage() {
  const t = useTranslations("recommendClub");
  const [clubName, setClubName] = useState("");
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [note, setNote] = useState("");
  const [recommenderName, setRecommenderName] = useState("");
  const [recommenderEmail, setRecommenderEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const recaptchaToken = await getRecaptchaToken("recommend_club");
      await submitClubRecommendation({
        clubName,
        country,
        note: note || undefined,
        recommenderName: recommenderName || undefined,
        recommenderEmail: recommenderEmail || undefined,
        source: "publicSearch",
        recaptchaToken,
      });
      setDone(true);
    } catch (err) {
      setError((err as { message?: string })?.message ?? t("sendFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-brand-white dark:bg-brand-black">
      <PublicHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <Card>
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">{t("title")}</h1>
          <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">{t("subtitle")}</p>

          {done ? (
            <p className="text-sm text-green-700 dark:text-green-400">{t("doneMessage")}</p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <TextField
                label={t("clubNameLabel")}
                required
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("countryLabel")}
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="rounded-lg border border-gray-300 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {t(`countries.${c}`)}
                    </option>
                  ))}
                </select>
              </div>
              <TextField
                label={t("nameLabel")}
                value={recommenderName}
                onChange={(e) => setRecommenderName(e.target.value)}
              />
              <TextField
                label={t("emailLabel")}
                type="email"
                value={recommenderEmail}
                onChange={(e) => setRecommenderEmail(e.target.value)}
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("noteLabel")}</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="rounded-lg border border-gray-300 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" fullWidth disabled={submitting || !clubName.trim()}>
                {submitting ? t("sending") : t("submit")}
              </Button>
              <p className="text-center text-xs text-gray-400 dark:text-gray-500">{t("recaptchaNotice")}</p>
            </form>
          )}
        </Card>
      </main>
      <PublicFooter />
    </div>
  );
}
