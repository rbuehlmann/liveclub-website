"use client";

import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { sendTestEmail } from "@/lib/firebase/functionsApi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";

// Kept in sync with functions/src/lib/emailTemplates.ts's DEFAULT_TEMPLATES —
// these are the templates the app sends automatically on some trigger/action,
// so they always show up here (with sensible starting content) even before
// anyone has ever opened this page.
const KNOWN_TEMPLATES: { id: string; label: string; hint: string }[] = [
  { id: "emailVerification", label: "E-Mail-Bestätigung", hint: "{{displayName}}, {{verificationUrl}}" },
  { id: "passwordReset", label: "Passwort zurücksetzen", hint: "{{resetUrl}}" },
  { id: "invite", label: "Einladung", hint: "{{clubName}}, {{roleLabel}}, {{inviteUrl}}" },
  { id: "clubDeactivated", label: "Verein deaktiviert", hint: "{{clubName}}, {{reason}}" },
  { id: "clubDeleted", label: "Verein gelöscht", hint: "{{clubName}}, {{reason}}" },
  {
    id: "clubRecommendation",
    label: "Vereins-Empfehlung eingegangen",
    hint: "{{clubName}}, {{country}}, {{note}}, {{source}}, {{referralCode}}",
  },
  {
    id: "gameSuperseded",
    label: "Spiel durch Heimverein überholt",
    hint: "{{clubName}}, {{opponentClubName}}, {{gameDate}}",
  },
];

const DEFAULT_CONTENT: Record<string, { subject: string; html: string }> = {
  emailVerification: {
    subject: "Bitte bestätige deine E-Mail-Adresse",
    html: `<p>Hallo {{displayName}},</p>
<p>Willkommen bei LiveClub! Bitte bestätige deine E-Mail-Adresse, damit dein Konto vollständig aktiv ist.</p>
<p><a href="{{verificationUrl}}">E-Mail-Adresse bestätigen</a></p>
<p>Falls der Link nicht funktioniert, kopiere diese Adresse in deinen Browser:<br>{{verificationUrl}}</p>`,
  },
  passwordReset: {
    subject: "Passwort zurücksetzen",
    html: `<p>Hallo,</p>
<p>Du hast angefordert, dein LiveClub-Passwort zurückzusetzen. Klicke auf den folgenden Link, um ein neues Passwort zu vergeben:</p>
<p><a href="{{resetUrl}}">Passwort zurücksetzen</a></p>
<p>Falls du das nicht warst, kannst du diese Mail einfach ignorieren — dein Passwort bleibt unverändert.</p>`,
  },
  invite: {
    subject: "Einladung zu {{clubName}} auf LiveClub",
    html: `<p>Hallo,</p>
<p>Du wurdest als <strong>{{roleLabel}}</strong> zu <strong>{{clubName}}</strong> auf LiveClub eingeladen.</p>
<p><a href="{{inviteUrl}}">Einladung annehmen</a></p>
<p>Falls der Link nicht funktioniert, kopiere diese Adresse in deinen Browser:<br>{{inviteUrl}}</p>`,
  },
  clubDeactivated: {
    subject: "Dein Verein {{clubName}} wurde deaktiviert",
    html: `<p>Hallo,</p>
<p>Der Verein <strong>{{clubName}}</strong> wurde soeben von der LiveClub-Administration deaktiviert und ist bis auf Weiteres nicht mehr öffentlich sichtbar.</p>
<p><strong>Grund:</strong> {{reason}}</p>
<p>Bitte kontaktiere unseren <a href="https://liveclub.app/support">Support</a>, falls du das klären möchtest.</p>`,
  },
  clubDeleted: {
    subject: "Dein Verein {{clubName}} wurde gelöscht",
    html: `<p>Hallo,</p>
<p>Der Verein <strong>{{clubName}}</strong> wurde soeben unwiderruflich gelöscht — alle Mannschaften, Spiele und Mitgliedschaften wurden entfernt. Eine laufende Lizenz wurde ohne Rückerstattung sofort beendet.</p>
<p><strong>Grund:</strong> {{reason}}</p>
<p>Falls das nicht beabsichtigt war, kontaktiere bitte umgehend unseren <a href="https://liveclub.app/support">Support</a>.</p>`,
  },
  clubRecommendation: {
    subject: "Neue Vereins-Empfehlung: {{clubName}}",
    html: `<p>Neue Empfehlung über {{source}}:</p>
<ul>
<li><strong>Verein:</strong> {{clubName}}</li>
<li><strong>Land:</strong> {{country}}</li>
<li><strong>Notiz:</strong> {{note}}</li>
<li><strong>Referral-Code:</strong> {{referralCode}}</li>
</ul>`,
  },
  gameSuperseded: {
    subject: "Euer Spiel gegen {{opponentClubName}} wird vom Heimverein administriert",
    html: `<p>Hallo,</p>
<p>Euer Spiel <strong>{{clubName}} vs. {{opponentClubName}}</strong> am {{gameDate}} wurde soeben auch vom Heimverein <strong>{{opponentClubName}}</strong> auf LiveClub erfasst.</p>
<p>Damit es nicht doppelt geführt wird, übernimmt der Heimverein die Erfassung — euer Eintrag bleibt bestehen, wird aber nicht mehr administriert. Ihr könnt das Spiel weiterhin live mitverfolgen, ganz normal auf eurer eigenen Vereinsseite.</p>`,
  },
};

interface TemplateMeta {
  id: string;
  label: string;
  hint?: string;
}

function TemplateCard({ id, label, hint }: TemplateMeta) {
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [testTo, setTestTo] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  useEffect(() => {
    const { db } = getFirebaseClient();
    getDoc(doc(db, "emailTemplates", id)).then((snap) => {
      const data = snap.data();
      const fallback = DEFAULT_CONTENT[id];
      setSubject(data?.subject ?? fallback?.subject ?? "");
      setHtml(data?.html ?? fallback?.html ?? "");
      setLoading(false);
    });
  }, [id]);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const { db } = getFirebaseClient();
      await setDoc(doc(db, "emailTemplates", id), { label, subject, html }, { merge: true });
      setMessage("Gespeichert ✓");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestSend() {
    setTestSending(true);
    setTestMessage(null);
    try {
      await sendTestEmail({ to: testTo, subject, html });
      setTestMessage(`Test-Mail an ${testTo} gesendet ✓`);
    } catch (err) {
      setTestMessage((err as { message?: string })?.message ?? "Senden fehlgeschlagen.");
    } finally {
      setTestSending(false);
    }
  }

  if (loading) return null;

  return (
    <Card>
      <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">{label}</h2>
      <p className="mb-4 text-xs text-gray-400 dark:text-gray-500">
        ID: <code>{id}</code>
        {hint && (
          <>
            {" · Platzhalter: "}
            {hint.split(", ").map((v) => (
              <code key={v} className="mr-1">
                {v}
              </code>
            ))}
          </>
        )}
      </p>
      <div className="flex flex-col gap-4">
        <TextField label="Betreff" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">HTML-Text</label>
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            rows={8}
            className="rounded-lg border border-gray-300 px-4 py-3 font-mono text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>
        {message && <p className="text-sm text-green-700">{message}</p>}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Wird gespeichert …" : "Speichern"}
        </Button>
      </div>

      <div className="mt-4 border-t border-gray-100 dark:border-white/10 pt-4">
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
          Test-Mail (auch ungespeicherte Änderungen, mit Beispieldaten) an eine beliebige Adresse.
        </p>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <TextField
              label="E-Mail-Adresse"
              type="email"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
            />
          </div>
          <Button variant="secondary" onClick={handleTestSend} disabled={testSending || !testTo}>
            {testSending ? "Wird gesendet …" : "Test-Mail senden"}
          </Button>
        </div>
        {testMessage && <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">{testMessage}</p>}
      </div>
    </Card>
  );
}

export default function AdminMailTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateMeta[] | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newId, setNewId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    const { db } = getFirebaseClient();
    getDocs(collection(db, "emailTemplates")).then((snap) => {
      const knownIds = new Set(KNOWN_TEMPLATES.map((k) => k.id));
      const custom: TemplateMeta[] = snap.docs
        .filter((d) => !knownIds.has(d.id))
        .map((d) => ({ id: d.id, label: (d.data().label as string) ?? d.id }));
      setTemplates([...KNOWN_TEMPLATES, ...custom]);
    });
  }, []);

  async function handleAddTemplate() {
    setAddError(null);
    const id = newId.trim();
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      setAddError("ID darf nur Buchstaben, Zahlen, - und _ enthalten.");
      return;
    }
    if (templates?.some((t) => t.id === id)) {
      setAddError("Diese ID gibt es bereits.");
      return;
    }
    const { db } = getFirebaseClient();
    await setDoc(doc(db, "emailTemplates", id), { label: newLabel || id, subject: "", html: "" });
    setTemplates((prev) => [...(prev ?? []), { id, label: newLabel || id }]);
    setNewId("");
    setNewLabel("");
    setAddingNew(false);
  }

  if (!templates) return <p className="text-gray-500 dark:text-gray-400">Wird geladen …</p>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Mail Vorlagen</h1>

      {templates.map((template) => (
        <TemplateCard key={template.id} {...template} />
      ))}

      <Card>
        {addingNew ? (
          <div className="flex flex-col gap-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Neue Vorlage</h2>
            <TextField
              label="ID (technisch, z. B. licenseExpiring)"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
            />
            <TextField label="Name (Anzeige)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
            {addError && <p className="text-sm text-red-600">{addError}</p>}
            <div className="flex gap-2">
              <Button onClick={handleAddTemplate}>Erstellen</Button>
              <Button variant="secondary" onClick={() => setAddingNew(false)}>
                Abbrechen
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setAddingNew(true)}>
            + Neue Vorlage
          </Button>
        )}
      </Card>
    </div>
  );
}
