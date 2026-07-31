"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { sendTestEmail } from "@/lib/firebase/functionsApi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";

const DEFAULT_SUBJECT = "Einladung zu {{clubName}} auf LiveClub";
const DEFAULT_HTML = `<p>Hallo,</p>
<p>Du wurdest als <strong>{{roleLabel}}</strong> zu <strong>{{clubName}}</strong> auf LiveClub eingeladen.</p>
<p><a href="{{inviteUrl}}">Einladung annehmen</a></p>
<p>Falls der Link nicht funktioniert, kopiere diese Adresse in deinen Browser:<br>{{inviteUrl}}</p>`;

export default function AdminSettingsPage() {
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [testTo, setTestTo] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  useEffect(() => {
    const { db } = getFirebaseClient();
    getDoc(doc(db, "settings", "emailTemplates")).then((snap) => {
      const data = snap.data();
      if (data?.inviteSubject) setSubject(data.inviteSubject);
      if (data?.inviteHtml) setHtml(data.inviteHtml);
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const { db } = getFirebaseClient();
      await setDoc(
        doc(db, "settings", "emailTemplates"),
        { inviteSubject: subject, inviteHtml: html },
        { merge: true }
      );
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

  if (loading) return <p className="text-gray-500">Wird geladen …</p>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">Einstellungen</h1>

      <Card>
        <h2 className="mb-2 font-semibold text-gray-900">Einladungs-E-Mail</h2>
        <p className="mb-4 text-sm text-gray-500">
          Verfügbare Platzhalter: <code>{"{{clubName}}"}</code>, <code>{"{{roleLabel}}"}</code>,{" "}
          <code>{"{{inviteUrl}}"}</code>
        </p>
        <div className="flex flex-col gap-4">
          <TextField label="Betreff" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">HTML-Text</label>
            <textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              rows={10}
              className="rounded-lg border border-gray-300 px-4 py-3 font-mono text-sm"
            />
          </div>
          {message && <p className="text-sm text-green-700">{message}</p>}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Wird gespeichert …" : "Speichern"}
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold text-gray-900">Test-Mail senden</h2>
        <p className="mb-4 text-sm text-gray-500">
          Sendet die obige Vorlage (auch ungespeicherte Änderungen) mit Beispieldaten an eine
          beliebige Adresse.
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
        {testMessage && <p className="mt-3 text-sm text-gray-700">{testMessage}</p>}
      </Card>
    </div>
  );
}
