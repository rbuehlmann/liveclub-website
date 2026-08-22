"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { submitSupportRequest } from "@/lib/firebase/functionsApi";
import { getRecaptchaToken } from "@/lib/recaptcha";

const PLATFORMS: { value: "website" | "ios" | "android"; label: string }[] = [
  { value: "website", label: "Website" },
  { value: "ios", label: "iOS" },
  { value: "android", label: "Android" },
];

const TOPICS: { value: "bug" | "question" | "feature" | "feedback"; label: string }[] = [
  { value: "bug", label: "🐛 Bug melden" },
  { value: "question", label: "❓ Frage zur App" },
  { value: "feature", label: "💡 Feature-Idee" },
  { value: "feedback", label: "💬 Allgemeines Feedback" },
];

export function SupportForm() {
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]["value"]>("website");
  const [topic, setTopic] = useState<(typeof TOPICS)[number]["value"]>("question");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !!name.trim() && !!email.trim() && !!message.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const recaptchaToken = await getRecaptchaToken("support_request");
      await submitSupportRequest({
        platform,
        topic,
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
        recaptchaToken,
      });
      setDone(true);
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Senden fehlgeschlagen.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-2 font-semibold text-gray-900 dark:text-white">Noch offene Fragen?</h2>
      {done ? (
        <p className="text-sm text-green-700 dark:text-green-400">
          Danke! Wir haben deine Anfrage erhalten und melden uns bei dir.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Plattform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as typeof platform)}
              required
              className="rounded-lg border border-gray-300 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Anliegen</label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value as typeof topic)}
              required
              className="rounded-lg border border-gray-300 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              {TOPICS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <TextField label="Name" required value={name} onChange={(e) => setName(e.target.value)} />
          <TextField
            label="E-Mail"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nachricht</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={4}
              className="rounded-lg border border-gray-300 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" fullWidth disabled={submitting || !canSubmit}>
            {submitting ? "Wird gesendet …" : "Nachricht senden"}
          </Button>
          <p className="text-center text-xs text-gray-400 dark:text-gray-500">
            Diese Seite ist durch reCAPTCHA geschützt.
          </p>
        </form>
      )}
    </Card>
  );
}
