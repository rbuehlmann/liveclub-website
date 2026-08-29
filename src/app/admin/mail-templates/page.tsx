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
    id: "supportRequest",
    label: "Support-Anfrage eingegangen",
    hint: "{{platform}}, {{topicLabel}}, {{name}}, {{email}}, {{message}}",
  },
  {
    id: "gameTakeoverInvite",
    label: "Einladung zur Spielübernahme",
    hint: "{{homeTeamName}}, {{awayTeamName}}, {{gameDate}}",
  },
  { id: "gameTakenOver", label: "Spiel übernommen", hint: "{{homeTeamName}}, {{awayTeamName}}" },
  { id: "gameHandedOff", label: "Spiel abgegeben", hint: "{{homeTeamName}}, {{awayTeamName}}" },
  {
    id: "gameOpenClaimed",
    label: "Offenes Spiel übernommen",
    hint: "{{editorName}}, {{homeTeamName}}, {{awayTeamName}}, {{gameDate}}",
  },
  {
    id: "clubDeletedInternal",
    label: "Verein gelöscht (intern)",
    hint: "{{clubName}}, {{triggeredBy}}, {{reason}}, {{archiveUrl}}",
  },
  { id: "redaktorRemoved", label: "Verein gelöscht (an Redaktor)", hint: "{{clubName}}" },
  { id: "clubMemberLeft", label: "Redaktor hat sein Konto gelöscht", hint: "{{memberName}}, {{memberEmail}}, {{clubName}}" },
  {
    id: "teamInfoHidden",
    label: "Team-Info ausgeblendet",
    hint: "{{redaktorName}}, {{redaktorEmail}}, {{teamName}}, {{clubName}}, {{postTitle}}, {{postText}}, {{hiddenAt}}",
  },
];

// Purely a sidebar grouping — every id here must also be a KNOWN_TEMPLATES
// entry. Anything not listed (custom templates added via "+ Neue Vorlage")
// falls into "Weitere" automatically.
const CATEGORIES: { label: string; ids: string[] }[] = [
  { label: "Auth", ids: ["emailVerification", "passwordReset"] },
  {
    label: "Vereine",
    ids: [
      "invite",
      "clubDeactivated",
      "clubDeleted",
      "clubDeletedInternal",
      "redaktorRemoved",
      "clubMemberLeft",
      "clubRecommendation",
    ],
  },
  { label: "Spiele", ids: ["gameTakeoverInvite", "gameTakenOver", "gameHandedOff", "gameOpenClaimed"] },
  { label: "Team-Infos", ids: ["teamInfoHidden"] },
  { label: "Support", ids: ["supportRequest"] },
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
  supportRequest: {
    subject: "[{{platform}}] {{topicLabel}}: {{name}}",
    html: `<p>Neue Support-Anfrage über die Website:</p>
<ul>
<li><strong>Plattform:</strong> {{platform}}</li>
<li><strong>Anliegen:</strong> {{topicLabel}}</li>
<li><strong>Name:</strong> {{name}}</li>
<li><strong>E-Mail:</strong> {{email}}</li>
</ul>
<p><strong>Nachricht:</strong></p>
<p>{{message}}</p>`,
  },
  gameTakeoverInvite: {
    subject: "Einladung: {{homeTeamName}} vs. {{awayTeamName}} am {{gameDate}}",
    html: `<p>Hallo,</p>
<p>Das Spiel <strong>{{homeTeamName}} vs. {{awayTeamName}}</strong> am {{gameDate}} wurde auf LiveClub erfasst. Du bist berechtigt, die Administration (Start, Tore, Spielstand) zu übernehmen.</p>
<p>Öffne LiveClub und wähle "Übernehmen" beim Spiel, um loszulegen.</p>`,
  },
  gameTakenOver: {
    subject: "Du administrierst jetzt: {{homeTeamName}} vs. {{awayTeamName}}",
    html: `<p>Hallo,</p>
<p>Du hast die Administration für <strong>{{homeTeamName}} vs. {{awayTeamName}}</strong> übernommen. Start, Tore und der Spielstand laufen ab jetzt über dein Konto.</p>`,
  },
  gameHandedOff: {
    subject: "Übertragen: {{homeTeamName}} vs. {{awayTeamName}}",
    html: `<p>Hallo,</p>
<p>Die Administration für <strong>{{homeTeamName}} vs. {{awayTeamName}}</strong> wurde an eine andere Person übertragen. Du musst dich nicht mehr darum kümmern — das Spiel kannst du weiterhin live mitverfolgen.</p>`,
  },
  gameOpenClaimed: {
    subject: "{{editorName}} administriert jetzt: {{homeTeamName}} vs. {{awayTeamName}}",
    html: `<p>Hallo,</p>
<p><strong>{{editorName}}</strong> hat die Administration für <strong>{{homeTeamName}} vs. {{awayTeamName}}</strong> am {{gameDate}} übernommen — das Spiel war offen, seid ihr aber jetzt versorgt.</p>`,
  },
  clubDeletedInternal: {
    subject: "[Archiv] Verein gelöscht: {{clubName}}",
    html: `<p>Verein <strong>{{clubName}}</strong> wurde gelöscht.</p>
<p><strong>Ausgelöst von:</strong> {{triggeredBy}}</p>
<p><strong>Grund:</strong> {{reason}}</p>
<p><strong>Archiv (30 Tage verfügbar):</strong> <a href="{{archiveUrl}}">Herunterladen</a></p>`,
  },
  redaktorRemoved: {
    subject: "{{clubName}} wurde gelöscht",
    html: `<p>Hallo,</p>
<p>Der Verein <strong>{{clubName}}</strong> wurde gelöscht — du bist dadurch nicht mehr Redaktor dort. Dein LiveClub-Konto selbst bleibt bestehen, falls du noch bei anderen Vereinen aktiv bist.</p>`,
  },
  clubMemberLeft: {
    subject: "{{memberName}} ist nicht mehr bei {{clubName}}",
    html: `<p>Hallo,</p>
<p><strong>{{memberName}}</strong> ({{memberEmail}}) hat sein/ihr LiveClub-Konto gelöscht und ist dadurch nicht mehr Redaktor bei <strong>{{clubName}}</strong>.</p>`,
  },
  teamInfoHidden: {
    subject: "Team-Info ausgeblendet: {{teamName}} ({{clubName}})",
    html: `<p>Eine Team-Info wurde ausgeblendet.</p>
<p><strong>Redaktor:</strong> {{redaktorName}} ({{redaktorEmail}})</p>
<p><strong>Team:</strong> {{teamName}} ({{clubName}})</p>
<p><strong>Titel:</strong> {{postTitle}}</p>
<p><strong>Text:</strong> {{postText}}</p>
<p><strong>Zeitpunkt:</strong> {{hiddenAt}}</p>`,
  },
};

interface TemplateMeta {
  id: string;
  label: string;
  hint?: string;
}

function SidebarButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-left text-sm font-medium ${
        active
          ? "bg-brand-red/10 text-brand-red-link"
          : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );
}

// Wraps every outgoing mail server-side (functions/src/lib/mailer.ts) —
// change the logo/branding once here instead of in all 15 templates.
function EmailLayoutCard() {
  const [headerHtml, setHeaderHtml] = useState("");
  const [footerHtml, setFooterHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const { db } = getFirebaseClient();
    getDoc(doc(db, "settings", "emailLayout"))
      .then((snap) => {
        const data = snap.data();
        setHeaderHtml(data?.headerHtml ?? "");
        setFooterHtml(data?.footerHtml ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const { db } = getFirebaseClient();
      await setDoc(doc(db, "settings", "emailLayout"), { headerHtml, footerHtml }, { merge: true });
      setMessage("Gespeichert ✓ — gilt sofort für alle Mails.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

  return (
    <Card>
      <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">Header & Footer</h2>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Wird automatisch um jede ausgehende Mail gelegt (auch Test-Mails) — z. B. ein Logo oben oder ein
        einheitlicher Footer. So musst du das Design nur an einer Stelle pflegen, nicht in jeder der
        Vorlagen einzeln.
      </p>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Header (HTML)</label>
          <textarea
            value={headerHtml}
            onChange={(e) => setHeaderHtml(e.target.value)}
            rows={6}
            placeholder='<div style="text-align:center;padding:16px 0;"><img src="https://liveclub.app/logo.png" height="40" alt="LiveClub"></div>'
            className="rounded-lg border border-gray-300 px-4 py-3 font-mono text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Footer (HTML)</label>
          <textarea
            value={footerHtml}
            onChange={(e) => setFooterHtml(e.target.value)}
            rows={6}
            placeholder='<p style="color:#999;font-size:12px;text-align:center;">LiveClub · liveclub.app</p>'
            className="rounded-lg border border-gray-300 px-4 py-3 font-mono text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>
        {message && <p className="text-sm text-green-700">{message}</p>}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Wird gespeichert …" : "Speichern"}
        </Button>
      </div>
    </Card>
  );
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
          Test-Mail (auch ungespeicherte Änderungen, mit Beispieldaten und dem aktuellen Header/Footer) an
          eine beliebige Adresse.
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

const DESIGN_ID = "__design__";

export default function AdminMailTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateMeta[] | null>(null);
  const [selectedId, setSelectedId] = useState<string>(DESIGN_ID);
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
    setSelectedId(id);
  }

  if (!templates) return <p className="text-gray-500 dark:text-gray-400">Wird geladen …</p>;

  const byId = new Map(templates.map((t) => [t.id, t]));
  const categorizedIds = new Set(CATEGORIES.flatMap((c) => c.ids));
  const customTemplates = templates.filter((t) => !categorizedIds.has(t.id));
  const selectedTemplate = selectedId !== DESIGN_ID ? byId.get(selectedId) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Mail Vorlagen</h1>

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <nav className="flex flex-col gap-4 md:w-64 md:flex-shrink-0">
          <div>
            <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Design
            </p>
            <SidebarButton
              label="Header & Footer"
              active={selectedId === DESIGN_ID}
              onClick={() => setSelectedId(DESIGN_ID)}
            />
          </div>

          {CATEGORIES.map((cat) => {
            const items = cat.ids.map((id) => byId.get(id)).filter((t): t is TemplateMeta => !!t);
            if (items.length === 0) return null;
            return (
              <div key={cat.label}>
                <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  {cat.label}
                </p>
                <div className="flex flex-col gap-0.5">
                  {items.map((t) => (
                    <SidebarButton
                      key={t.id}
                      label={t.label}
                      active={selectedId === t.id}
                      onClick={() => setSelectedId(t.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {customTemplates.length > 0 && (
            <div>
              <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Weitere
              </p>
              <div className="flex flex-col gap-0.5">
                {customTemplates.map((t) => (
                  <SidebarButton
                    key={t.id}
                    label={t.label}
                    active={selectedId === t.id}
                    onClick={() => setSelectedId(t.id)}
                  />
                ))}
              </div>
            </div>
          )}

          <Button variant="secondary" onClick={() => setAddingNew(true)}>
            + Neue Vorlage
          </Button>
        </nav>

        <div className="flex-1">
          {selectedId === DESIGN_ID ? (
            <EmailLayoutCard />
          ) : selectedTemplate ? (
            <TemplateCard key={selectedTemplate.id} {...selectedTemplate} />
          ) : null}

          {addingNew && (
            <Card className="mt-6">
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
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
