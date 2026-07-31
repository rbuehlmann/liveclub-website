import { db } from "../firebaseAdmin";

export const DEFAULT_INVITE_SUBJECT = "Einladung zu {{clubName}} auf LiveClub";
export const DEFAULT_INVITE_HTML = `<p>Hallo,</p>
<p>Du wurdest als <strong>{{roleLabel}}</strong> zu <strong>{{clubName}}</strong> auf LiveClub eingeladen.</p>
<p><a href="{{inviteUrl}}">Einladung annehmen</a></p>
<p>Falls der Link nicht funktioniert, kopiere diese Adresse in deinen Browser:<br>{{inviteUrl}}</p>`;

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value),
    template
  );
}

export async function getInviteTemplate(): Promise<{ subject: string; html: string }> {
  const snap = await db.collection("settings").doc("emailTemplates").get();
  const data = snap.data();
  return {
    subject: data?.inviteSubject ?? DEFAULT_INVITE_SUBJECT,
    html: data?.inviteHtml ?? DEFAULT_INVITE_HTML,
  };
}
