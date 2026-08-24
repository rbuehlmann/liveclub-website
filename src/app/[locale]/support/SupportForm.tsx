"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { submitSupportRequest } from "@/lib/firebase/functionsApi";
import { getRecaptchaToken } from "@/lib/recaptcha";

const PLATFORM_VALUES = ["website", "ios", "android"] as const;
const TOPIC_VALUES = ["bug", "question", "feature", "feedback"] as const;
const TOPIC_ICONS: Record<(typeof TOPIC_VALUES)[number], string> = {
  bug: "🐛",
  question: "❓",
  feature: "💡",
  feedback: "💬",
};

export function SupportForm() {
  const t = useTranslations("support.form");
  const [platform, setPlatform] = useState<(typeof PLATFORM_VALUES)[number]>("website");
  const [topic, setTopic] = useState<(typeof TOPIC_VALUES)[number]>("question");
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
      setError((err as { message?: string })?.message ?? t("sendFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-2 font-semibold text-gray-900 dark:text-white">{t("title")}</h2>
      {done ? (
        <p className="text-sm text-green-700 dark:text-green-400">{t("doneMessage")}</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("platformLabel")}</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as typeof platform)}
              required
              className="rounded-lg border border-gray-300 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              {PLATFORM_VALUES.map((p) => (
                <option key={p} value={p}>
                  {t(`platforms.${p}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("topicLabel")}</label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value as typeof topic)}
              required
              className="rounded-lg border border-gray-300 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              {TOPIC_VALUES.map((topicValue) => (
                <option key={topicValue} value={topicValue}>
                  {TOPIC_ICONS[topicValue]} {t(`topics.${topicValue}`)}
                </option>
              ))}
            </select>
          </div>
          <TextField label={t("nameLabel")} required value={name} onChange={(e) => setName(e.target.value)} />
          <TextField
            label={t("emailLabel")}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("messageLabel")}</label>
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
            {submitting ? t("sending") : t("send")}
          </Button>
          <p className="text-center text-xs text-gray-400 dark:text-gray-500">{t("recaptchaNotice")}</p>
        </form>
      )}
    </Card>
  );
}
