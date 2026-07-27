"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebaseClient } from "@/lib/firebase/client";
import { useClubContext } from "@/components/club/ClubContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";

export default function EditClubPage() {
  const t = useTranslations("clubSetup");
  const tCommon = useTranslations("common");
  const { club, role } = useClubContext();

  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!club) return;
    setName(club.name);
    setContactName(club.contactName);
    setContactEmail(club.contactEmail);
  }, [club]);

  if (!club) return null;
  const readOnly = role !== "clubAdmin";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!club) return;
    setSaving(true);
    setMessage(null);
    try {
      const { db } = getFirebaseClient();
      await updateDoc(doc(db, "clubs", club.clubId), {
        name,
        contactName,
        contactEmail,
      });
      setMessage(tCommon("save") + " ✓");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !club) return;
    setUploading(true);
    try {
      const { db, storage } = getFirebaseClient();
      const logoRef = ref(storage, `clubs/${club.clubId}/logo/${file.name}`);
      await uploadBytes(logoRef, file);
      const url = await getDownloadURL(logoRef);
      await updateDoc(doc(db, "clubs", club.clubId), { logoUrl: url });
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card className="max-w-lg">
      <h1 className="mb-6 text-xl font-bold text-gray-900">{t("title")}</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          label={t("clubName")}
          value={name}
          disabled={readOnly}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          label={t("contactName")}
          value={contactName}
          disabled={readOnly}
          onChange={(e) => setContactName(e.target.value)}
        />
        <TextField
          label={t("contactEmail")}
          type="email"
          value={contactEmail}
          disabled={readOnly}
          onChange={(e) => setContactEmail(e.target.value)}
        />
        {!readOnly && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Vereinslogo</label>
            {club.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={club.logoUrl} alt="" className="h-16 w-16 rounded object-contain" />
            )}
            <input type="file" accept="image/*" onChange={handleLogoChange} disabled={uploading} />
          </div>
        )}
        {message && <p className="text-sm text-green-700">{message}</p>}
        {!readOnly && (
          <Button type="submit" disabled={saving}>
            {saving ? tCommon("loading") : tCommon("save")}
          </Button>
        )}
      </form>
    </Card>
  );
}
