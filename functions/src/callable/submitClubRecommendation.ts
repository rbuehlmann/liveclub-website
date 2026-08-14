import { onCall, HttpsError } from "firebase-functions/v2/https";
import { randomBytes } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin";
import { verifyRecaptcha } from "../lib/recaptcha";
import { sendMail, LIVECLUB_TEAM_EMAIL } from "../lib/mailer";
import { smtpPassword, recaptchaSecretKey } from "../lib/secrets";
import { getTemplate, renderTemplate } from "../lib/emailTemplates";

type RecommendationSource = "publicSearch" | "gameOpponent";

interface SubmitClubRecommendationRequest {
  clubName: string;
  country?: string;
  note?: string;
  recommenderName?: string;
  recommenderEmail?: string;
  source: RecommendationSource;
  referringClubId?: string;
  recaptchaToken: string;
}

function generateReferralCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

/**
 * Public-ish entry point for "tell us about a club we're missing" — either
 * from the unauthenticated /verein-empfehlen page (source: publicSearch) or
 * from a clubAdmin's game-creation flow when the opponent isn't found
 * (source: gameOpponent, requires auth as that exact club's admin so one
 * club can't spam recommendations "as" another). reCAPTCHA-gated either
 * way since the public path has no auth at all to rate-limit it.
 *
 * Writes a lead doc + emails the internal team so it's seen without
 * checking Firestore directly — see clubRecommendations in firestore.rules
 * (platform-admin read-only, no client write path at all, only this
 * callable via the Admin SDK).
 */
export const submitClubRecommendation = onCall<SubmitClubRecommendationRequest>(
  { secrets: [smtpPassword, recaptchaSecretKey] },
  async (request) => {
    const {
      clubName,
      country,
      note,
      recommenderName,
      recommenderEmail,
      source,
      referringClubId,
      recaptchaToken,
    } = request.data;

    await verifyRecaptcha(recaptchaToken);

    if (typeof clubName !== "string" || !clubName.trim()) {
      throw new HttpsError("invalid-argument", "Vereinsname fehlt.");
    }
    if (source !== "publicSearch" && source !== "gameOpponent") {
      throw new HttpsError("invalid-argument", "Ungültige Quelle.");
    }
    if (source === "gameOpponent") {
      if (
        !request.auth ||
        request.auth.token.role !== "clubAdmin" ||
        request.auth.token.clubId !== referringClubId
      ) {
        throw new HttpsError(
          "permission-denied",
          "Nur der eigene Vereinsadmin kann von hier aus empfehlen."
        );
      }
    }

    const referralCode = generateReferralCode();
    const docRef = db.collection("clubRecommendations").doc();
    await docRef.set({
      id: docRef.id,
      clubName: clubName.trim(),
      country: country ?? null,
      note: note ?? null,
      recommenderName: recommenderName ?? null,
      recommenderEmail: recommenderEmail ?? null,
      source,
      referringClubId: referringClubId ?? null,
      referralCode,
      status: "new",
      createdAt: FieldValue.serverTimestamp(),
    });

    const vars = {
      clubName: clubName.trim(),
      country: country?.trim() || "–",
      note: note?.trim() || "–",
      source: source === "publicSearch" ? "Öffentliches Formular" : "Spiel-erstellen (Gegner)",
      referralCode,
    };
    const template = await getTemplate(db, "clubRecommendation");
    await sendMail({
      to: LIVECLUB_TEAM_EMAIL,
      subject: renderTemplate(template.subject, vars),
      html: renderTemplate(template.html, vars),
    }).catch(() => undefined);

    return { referralCode };
  }
);
