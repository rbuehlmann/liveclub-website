import { defineSecret } from "firebase-functions/params";

// Set via `firebase functions:secrets:set SMTP_PASSWORD` (run interactively
// by whoever owns the mailbox — never pass the value through a script).
export const smtpPassword = defineSecret("SMTP_PASSWORD");
