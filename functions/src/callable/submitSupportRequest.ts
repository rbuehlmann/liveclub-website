import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin";
import { verifyRecaptcha } from "../lib/recaptcha";
import { sendMail, LIVECLUB_SUPPORT_EMAIL } from "../lib/mailer";
import { smtpPassword, recaptchaSecretKey } from "../lib/secrets";
import { getTemplate, renderTemplate } from "../lib/emailTemplates";

type SupportPlatform = "website" | "ios" | "android";
type SupportTopic = "bug" | "question" | "feature" | "feedback";

interface SubmitSupportRequestRequest {
  platform: SupportPlatform;
  topic: SupportTopic;
  name: string;
  email: string;
  message: string;
  recaptchaToken: string;
}

const TOPIC_LABELS: Record<SupportTopic, string> = {
  bug: "🐛 Bug melden",
  question: "❓ Frage zur App",
  feature: "💡 Feature-Idee",
  feedback: "💬 Allgemeines Feedback",
};

const PLATFORM_LABELS: Record<SupportPlatform, string> = {
  website: "Website",
  ios: "iOS",
  android: "Android",
};

function assertNonEmptyString(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpsError("invalid-argument", `Feld "${field}" darf nicht leer sein.`);
  }
}

/**
 * Public, unauthenticated /support form — reCAPTCHA-gated like
 * submitClubRecommendation.ts, same reasoning (no auth to rate-limit it
 * otherwise). All 5 fields required (2026-08-22 decision — the oryno.dev
 * reference form this is modeled on has Name optional, LiveClub's doesn't).
 */
export const submitSupportRequest = onCall<SubmitSupportRequestRequest>(
  { secrets: [smtpPassword, recaptchaSecretKey] },
  async (request) => {
    const { platform, topic, name, email, message, recaptchaToken } = request.data;

    await verifyRecaptcha(recaptchaToken);

    if (platform !== "website" && platform !== "ios" && platform !== "android") {
      throw new HttpsError("invalid-argument", "Ungültige Plattform.");
    }
    if (!(topic in TOPIC_LABELS)) {
      throw new HttpsError("invalid-argument", "Ungültiges Anliegen.");
    }
    assertNonEmptyString(name, "Name");
    assertNonEmptyString(email, "E-Mail");
    assertNonEmptyString(message, "Nachricht");

    const docRef = db.collection("supportRequests").doc();
    await docRef.set({
      id: docRef.id,
      platform,
      topic,
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      createdAt: FieldValue.serverTimestamp(),
    });

    const vars = {
      platform: PLATFORM_LABELS[platform],
      topicLabel: TOPIC_LABELS[topic],
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
    };
    const template = await getTemplate(db, "supportRequest");
    await sendMail({
      to: LIVECLUB_SUPPORT_EMAIL,
      subject: renderTemplate(template.subject, vars),
      html: renderTemplate(template.html, vars),
    }).catch(() => undefined);

    return { ok: true };
  }
);
