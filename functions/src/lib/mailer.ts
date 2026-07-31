import nodemailer from "nodemailer";
import { smtpPassword } from "./secrets";

const SMTP_HOST = "mail.infomaniak.com";
const SMTP_PORT = 587;
const SMTP_USER = "no-reply@liveclub.app";
const FROM_ADDRESS = "LiveClub <no-reply@liveclub.app>";

export async function sendMail(input: { to: string; subject: string; html: string }) {
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false, // STARTTLS on 587, not implicit TLS
    auth: {
      user: SMTP_USER,
      pass: smtpPassword.value(),
    },
  });

  await transporter.sendMail({
    from: FROM_ADDRESS,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
}
