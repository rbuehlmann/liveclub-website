"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { useClubContext } from "@/components/club/ClubContext";
import { buildInviteUrl } from "@/lib/publicRoutes";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Member } from "@/lib/types";

interface InvitationRow {
  invitationId: string;
  email?: string;
  status: string;
}

const INVITE_EXPIRY_DAYS = 14;

export default function ReportersPage() {
  const t = useTranslations("reporters");
  const tCommon = useTranslations("common");
  const { club, role } = useClubContext();
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!club) return;
    const { db } = getFirebaseClient();
    const unsubMembers = onSnapshot(collection(db, "clubs", club.clubId, "members"), (snap) => {
      setMembers(
        snap.docs.map((d) => ({
          uid: d.id,
          role: d.data().role,
          email: d.data().email,
          displayName: d.data().displayName,
        }))
      );
    });
    const invitesQuery = query(
      collection(db, "invitations"),
      where("clubId", "==", club.clubId),
      where("status", "==", "pending")
    );
    const unsubInvites = onSnapshot(invitesQuery, (snap) => {
      setInvitations(
        snap.docs.map((d) => ({
          invitationId: d.id,
          email: d.data().email,
          status: d.data().status,
        }))
      );
    });
    return () => {
      unsubMembers();
      unsubInvites();
    };
  }, [club]);

  if (!club || role !== "clubAdmin") return null;

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!club) return;
    setInviting(true);
    setLastInviteLink(null);
    try {
      const { db } = getFirebaseClient();
      const expiresAt = Timestamp.fromMillis(
        Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
      );
      const inviteRef = await addDoc(collection(db, "invitations"), {
        clubId: club.clubId,
        clubName: club.name,
        role: "reporter",
        email: email.trim() || null,
        status: "pending",
        createdBy: user?.uid,
        createdAt: serverTimestamp(),
        expiresAt,
      });
      setLastInviteLink(`${window.location.origin}${buildInviteUrl(inviteRef.id)}`);
      setEmail("");
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(uid: string) {
    if (!club) return;
    const { db } = getFirebaseClient();
    await deleteDoc(doc(db, "clubs", club.clubId, "members", uid));
  }

  async function handleCancelInvite(invitationId: string) {
    const { db } = getFirebaseClient();
    await deleteDoc(doc(db, "invitations", invitationId));
  }

  async function copyLink(link: string) {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">{t("title")}</h1>

      <Card>
        <h2 className="mb-4 font-semibold text-gray-900">{t("invite")}</h2>
        <form onSubmit={handleInvite} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <TextField
              label={t("inviteEmail")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={inviting}>
            {inviting ? tCommon("loading") : t("generateLink")}
          </Button>
        </form>
        {lastInviteLink && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-gray-50 p-3">
            <code className="flex-1 truncate text-sm">{lastInviteLink}</code>
            <Button variant="secondary" onClick={() => copyLink(lastInviteLink)}>
              {copied ? tCommon("linkCopied") : tCommon("copyLink")}
            </Button>
          </div>
        )}
      </Card>

      {invitations.length > 0 && (
        <Card>
          <h2 className="mb-4 font-semibold text-gray-900">{t("pendingInvites")}</h2>
          <div className="flex flex-col gap-2">
            {invitations.map((inv) => (
              <div key={inv.invitationId} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{inv.email ?? "Offener Link"}</span>
                <Button variant="ghost" onClick={() => handleCancelInvite(inv.invitationId)}>
                  {t("remove")}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {members
          .filter((m) => m.role === "reporter")
          .map((member) => (
            <Card key={member.uid} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{member.displayName ?? member.email}</p>
                <p className="text-sm text-gray-500">{member.email}</p>
              </div>
              <Button variant="danger" onClick={() => handleRemove(member.uid)}>
                {t("remove")}
              </Button>
            </Card>
          ))}
      </div>
    </div>
  );
}
