"use client";

import { httpsCallable } from "firebase/functions";
import { getFirebaseClient } from "./client";
import { LicenseStatus, LicenseType, LicenseTier } from "@/lib/types";

export async function createClub(input: {
  name: string;
  sport: string;
  country: string;
  language: string;
  contactName: string;
  contactEmail: string;
  primaryColor?: string;
  secondaryColor?: string;
}) {
  const { functions } = getFirebaseClient();
  const call = httpsCallable<typeof input, { clubId: string; publicClubId: string }>(
    functions,
    "createClub"
  );
  const result = await call(input);
  return result.data;
}

export async function createTeam(input: { clubId: string; name: string; shortName?: string }) {
  const { functions } = getFirebaseClient();
  const call = httpsCallable<typeof input, { teamId: string; publicTeamId: string }>(
    functions,
    "createTeam"
  );
  const result = await call(input);
  return result.data;
}

export async function createGame(input: {
  clubId: string;
  teamId: string;
  isHomeGame: boolean;
  opponentPublicClubId?: string;
  opponentTeamId?: string;
  opponentTeamName?: string;
  scheduledStart?: string;
}) {
  const { functions } = getFirebaseClient();
  const call = httpsCallable<typeof input, { gameId: string }>(functions, "createGame");
  const result = await call(input);
  return result.data;
}

export async function syncClubClaims() {
  const { functions } = getFirebaseClient();
  const call = httpsCallable<Record<string, never>, { clubId: string | null; role: string | null }>(
    functions,
    "syncClubClaims"
  );
  const result = await call({});
  return result.data;
}

export async function acceptInvitation(invitationId: string) {
  const { functions } = getFirebaseClient();
  const call = httpsCallable<{ invitationId: string }, { ok: true }>(
    functions,
    "acceptInvitation"
  );
  const result = await call({ invitationId });
  return result.data;
}

export async function adminSetLicense(input: {
  clubId: string;
  action: "setValidUntil" | "suspend";
  validUntil?: string;
  tier?: LicenseTier;
  notes?: string;
}) {
  const { functions } = getFirebaseClient();
  const call = httpsCallable<typeof input, { licenseId: string }>(
    functions,
    "adminSetLicense"
  );
  const result = await call(input);
  return result.data;
}

export interface AdminClubListItem {
  clubId: string;
  publicClubId: string;
  name: string;
  sport: string;
  country: string;
  contactEmail: string;
  currentLicenseType: LicenseType | null;
  currentLicenseStatus: LicenseStatus | null;
  currentLicenseTier: LicenseTier | null;
  currentMaxTeams: number | null;
  currentLicenseValidUntil: string | null;
  createdAt: string | null;
  teamCount: number;
}

export async function adminListClubs() {
  const { functions } = getFirebaseClient();
  const call = httpsCallable<Record<string, never>, { clubs: AdminClubListItem[] }>(
    functions,
    "adminListClubs"
  );
  const result = await call({});
  return result.data.clubs;
}

export async function adminDeleteClub(clubId: string, reason?: string) {
  const { functions } = getFirebaseClient();
  const call = httpsCallable<{ clubId: string; reason?: string }, { ok: true }>(
    functions,
    "adminDeleteClub"
  );
  const result = await call({ clubId, reason });
  return result.data;
}

export async function devGrantPlatformAdmin() {
  const { functions } = getFirebaseClient();
  const call = httpsCallable(functions, "devGrantPlatformAdmin");
  await call({});
}

export async function grantPlatformAdmin() {
  const { functions } = getFirebaseClient();
  const call = httpsCallable(functions, "grantPlatformAdmin");
  await call({});
}

export async function sendTestEmail(input: { to: string; subject: string; html: string }) {
  const { functions } = getFirebaseClient();
  const call = httpsCallable<typeof input, { ok: true }>(functions, "sendTestEmail");
  await call(input);
}

export async function sendVerificationEmail() {
  const { functions } = getFirebaseClient();
  const call = httpsCallable<Record<string, never>, { ok: true }>(functions, "sendVerificationEmail");
  await call({});
}

export async function sendPasswordResetLink(email: string) {
  const { functions } = getFirebaseClient();
  const call = httpsCallable<{ email: string }, { ok: true }>(functions, "sendPasswordResetLink");
  await call({ email });
}

export async function createCheckoutSession(input: {
  clubId: string;
  tier: LicenseTier;
  interval: "monthly" | "yearly";
}) {
  const { functions } = getFirebaseClient();
  const call = httpsCallable<typeof input, { url: string }>(functions, "createCheckoutSession");
  const result = await call(input);
  return result.data;
}

export async function submitClubRecommendation(input: {
  clubName: string;
  country?: string;
  note?: string;
  recommenderName?: string;
  recommenderEmail?: string;
  source: "publicSearch" | "gameOpponent";
  referringClubId?: string;
  recaptchaToken: string;
}) {
  const { functions } = getFirebaseClient();
  const call = httpsCallable<typeof input, { referralCode: string }>(
    functions,
    "submitClubRecommendation"
  );
  const result = await call(input);
  return result.data;
}
