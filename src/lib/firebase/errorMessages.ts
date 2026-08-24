const messages: Record<string, string> = {
  "auth/email-already-in-use": "Diese E-Mail-Adresse wird bereits verwendet.",
  "auth/invalid-email": "Diese E-Mail-Adresse ist ungültig.",
  "auth/weak-password": "Das Passwort muss mindestens 6 Zeichen lang sein.",
  "auth/user-not-found": "Kein Konto mit dieser E-Mail-Adresse gefunden.",
  "auth/wrong-password": "Falsches Passwort.",
  "auth/invalid-credential": "E-Mail-Adresse oder Passwort ist falsch.",
  "auth/too-many-requests": "Zu viele Versuche. Bitte versuche es später erneut.",
};

export function toGermanAuthErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (code && messages[code]) return messages[code];
  return "Etwas ist schiefgelaufen. Bitte versuche es erneut.";
}

const errorKeys: Record<string, string> = {
  "auth/email-already-in-use": "emailAlreadyInUse",
  "auth/invalid-email": "invalidEmail",
  "auth/weak-password": "weakPassword",
  "auth/user-not-found": "userNotFound",
  "auth/wrong-password": "wrongPassword",
  "auth/invalid-credential": "invalidCredential",
  "auth/too-many-requests": "tooManyRequests",
};

// Locale-agnostic counterpart to toGermanAuthErrorMessage, for callers that
// resolve the message themselves via useTranslations("authErrors") — used
// by login/register, which need this in English too. toGermanAuthErrorMessage
// stays as-is for src/app/invite/[invitationId]/page.tsx, which is outside
// the translated area and always German.
export function authErrorKey(error: unknown): string {
  const code = (error as { code?: string })?.code;
  return (code && errorKeys[code]) || "generic";
}
