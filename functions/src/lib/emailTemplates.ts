import { Firestore } from "firebase-admin/firestore";

export interface EmailTemplateContent {
  label: string;
  subject: string;
  html: string;
}

// Built-in templates the app sends automatically on some trigger/action —
// always available even if the admin never opens /admin/mail-templates or
// the Firestore doc doesn't exist yet, and shown as the starting content
// there. Ad-hoc templates an admin adds later have no entry here — they
// simply have no fallback and start out blank.
export const DEFAULT_TEMPLATES: Record<string, EmailTemplateContent> = {
  emailVerification: {
    label: "E-Mail-Bestätigung",
    subject: "Bitte bestätige deine E-Mail-Adresse",
    html: `<p>Hallo {{displayName}},</p>
<p>Willkommen bei LiveClub! Bitte bestätige deine E-Mail-Adresse, damit dein Konto vollständig aktiv ist.</p>
<p><a href="{{verificationUrl}}">E-Mail-Adresse bestätigen</a></p>
<p>Falls der Link nicht funktioniert, kopiere diese Adresse in deinen Browser:<br>{{verificationUrl}}</p>`,
  },
  passwordReset: {
    label: "Passwort zurücksetzen",
    subject: "Passwort zurücksetzen",
    html: `<p>Hallo,</p>
<p>Du hast angefordert, dein LiveClub-Passwort zurückzusetzen. Klicke auf den folgenden Link, um ein neues Passwort zu vergeben:</p>
<p><a href="{{resetUrl}}">Passwort zurücksetzen</a></p>
<p>Falls du das nicht warst, kannst du diese Mail einfach ignorieren — dein Passwort bleibt unverändert.</p>`,
  },
  invite: {
    label: "Einladung",
    subject: "Einladung zu {{clubName}} auf LiveClub",
    html: `<p>Hallo,</p>
<p>Du wurdest als <strong>{{roleLabel}}</strong> zu <strong>{{clubName}}</strong> auf LiveClub eingeladen.</p>
<p><a href="{{inviteUrl}}">Einladung annehmen</a></p>
<p>Falls der Link nicht funktioniert, kopiere diese Adresse in deinen Browser:<br>{{inviteUrl}}</p>`,
  },
  clubDeactivated: {
    label: "Verein deaktiviert",
    subject: "Dein Verein {{clubName}} wurde deaktiviert",
    html: `<p>Hallo,</p>
<p>Der Verein <strong>{{clubName}}</strong> wurde soeben von der LiveClub-Administration deaktiviert und ist bis auf Weiteres nicht mehr öffentlich sichtbar.</p>
<p><strong>Grund:</strong> {{reason}}</p>
<p>Bitte kontaktiere unseren <a href="https://liveclub.app/support">Support</a>, falls du das klären möchtest.</p>`,
  },
  clubRecommendation: {
    label: "Vereins-Empfehlung eingegangen",
    subject: "Neue Vereins-Empfehlung: {{clubName}}",
    html: `<p>Neue Empfehlung über {{source}}:</p>
<ul>
<li><strong>Verein:</strong> {{clubName}}</li>
<li><strong>Land:</strong> {{country}}</li>
<li><strong>Notiz:</strong> {{note}}</li>
<li><strong>Referral-Code:</strong> {{referralCode}}</li>
</ul>`,
  },
  gameTakeoverInvite: {
    label: "Einladung zur Spielübernahme",
    subject: "Einladung: {{homeTeamName}} vs. {{awayTeamName}} am {{gameDate}}",
    html: `<p>Hallo,</p>
<p>Das Spiel <strong>{{homeTeamName}} vs. {{awayTeamName}}</strong> am {{gameDate}} wurde auf LiveClub erfasst. Du bist berechtigt, die Administration (Start, Tore, Spielstand) zu übernehmen.</p>
<p>Öffne LiveClub und wähle "Übernehmen" beim Spiel, um loszulegen.</p>`,
  },
  gameTakenOver: {
    label: "Spiel übernommen",
    subject: "Du administrierst jetzt: {{homeTeamName}} vs. {{awayTeamName}}",
    html: `<p>Hallo,</p>
<p>Du hast die Administration für <strong>{{homeTeamName}} vs. {{awayTeamName}}</strong> übernommen. Start, Tore und der Spielstand laufen ab jetzt über dein Konto.</p>`,
  },
  gameHandedOff: {
    label: "Spiel abgegeben",
    subject: "Übertragen: {{homeTeamName}} vs. {{awayTeamName}}",
    html: `<p>Hallo,</p>
<p>Die Administration für <strong>{{homeTeamName}} vs. {{awayTeamName}}</strong> wurde an eine andere Person übertragen. Du musst dich nicht mehr darum kümmern — das Spiel kannst du weiterhin live mitverfolgen.</p>`,
  },
  clubDeleted: {
    label: "Verein gelöscht",
    subject: "Dein Verein {{clubName}} wurde gelöscht",
    html: `<p>Hallo,</p>
<p>Der Verein <strong>{{clubName}}</strong> wurde soeben unwiderruflich gelöscht — alle Mannschaften, Spiele und Mitgliedschaften wurden entfernt. Eine laufende Lizenz wurde ohne Rückerstattung sofort beendet.</p>
<p><strong>Grund:</strong> {{reason}}</p>
<p>Falls das nicht beabsichtigt war, kontaktiere bitte umgehend unseren <a href="https://liveclub.app/support">Support</a>.</p>`,
  },
};

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value),
    template
  );
}

export async function getTemplate(
  db: Firestore,
  templateId: string
): Promise<{ subject: string; html: string }> {
  const snap = await db.collection("emailTemplates").doc(templateId).get();
  const data = snap.data();
  const fallback = DEFAULT_TEMPLATES[templateId];
  return {
    subject: data?.subject ?? fallback?.subject ?? "",
    html: data?.html ?? fallback?.html ?? "",
  };
}
