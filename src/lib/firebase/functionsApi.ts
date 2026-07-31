"use client";

import { httpsCallable } from "firebase/functions";
import { getFirebaseClient } from "./client";
import { LicenseStatus, LicenseType } from "@/lib/types";

export async function createClub(input: {
  name: string;
  sport: string;
  country: string;
  language: string;
  contactName: string;
  contactEmail: string;
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
  type: LicenseType;
  status: LicenseStatus;
  validFrom: string;
  validUntil: string;
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
  currentLicenseValidUntil: string | null;
  createdAt: string | null;
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
