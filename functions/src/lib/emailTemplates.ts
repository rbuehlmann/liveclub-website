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
  // Internal-only — goes to LIVECLUB_TEAM_EMAIL, never to the club itself
  // (unlike clubDeleted above). Deliberately separate from clubDeleted
  // rather than a "[Kopie]"-prefixed reuse of it, since this one carries
  // the archive download link and who triggered the deletion — neither of
  // which the club should ever see.
  clubDeletedInternal: {
    label: "Verein gelöscht (intern)",
    subject: "[Archiv] Verein gelöscht: {{clubName}}",
    html: `<p>Verein <strong>{{clubName}}</strong> wurde gelöscht.</p>
<p><strong>Ausgelöst von:</strong> {{triggeredBy}}</p>
<p><strong>Grund:</strong> {{reason}}</p>
<p><strong>Archiv (30 Tage verfügbar):</strong> <a href="{{archiveUrl}}">Herunterladen</a></p>`,
  },
  // Sent to every individual member (not just the club's contactEmail,
  // which clubDeleted above already covers and which may not even be a
  // real login) when their club is deleted.
  redaktorRemoved: {
    label: "Verein gelöscht (an Redaktor)",
    subject: "{{clubName}} wurde gelöscht",
    html: `<p>Hallo,</p>
<p>Der Verein <strong>{{clubName}}</strong> wurde gelöscht — du bist dadurch nicht mehr Redaktor dort. Dein LiveClub-Konto selbst bleibt bestehen, falls du noch bei anderen Vereinen aktiv bist.</p>`,
  },
  // Sent to a club's contactEmail when one of ITS members deletes their
  // own personal LiveClub account (see deleteOwnAccount.ts) — the club
  // itself is unaffected, this just informs them the person is gone.
  clubMemberLeft: {
    label: "Redaktor hat sein Konto gelöscht",
    subject: "{{memberName}} ist nicht mehr bei {{clubName}}",
    html: `<p>Hallo,</p>
<p><strong>{{memberName}}</strong> ({{memberEmail}}) hat sein/ihr LiveClub-Konto gelöscht und ist dadurch nicht mehr Redaktor bei <strong>{{clubName}}</strong>.</p>`,
  },
  // Sent to LiveClub, the club's contactEmail, AND the original author
  // when a redaktor hides a Team-Info (see hideTeamInfo.ts) — the full
  // post content is included deliberately, so urgency can be judged
  // without logging in anywhere.
  teamInfoHidden: {
    label: "Team-Info ausgeblendet",
    subject: "Team-Info ausgeblendet: {{teamName}} ({{clubName}})",
    html: `<p>Eine Team-Info wurde ausgeblendet.</p>
<p><strong>Redaktor:</strong> {{redaktorName}} ({{redaktorEmail}})</p>
<p><strong>Team:</strong> {{teamName}} ({{clubName}})</p>
<p><strong>Titel:</strong> {{postTitle}}</p>
<p><strong>Text:</strong> {{postText}}</p>
<p><strong>Zeitpunkt:</strong> {{hiddenAt}}</p>`,
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
