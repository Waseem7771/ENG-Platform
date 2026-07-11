import "server-only";
import nodemailer from "nodemailer";

type Mail = { to: string; subject: string; text: string };

export async function sendEmail({ to, subject, text }: Mail): Promise<void> {
  const smtpUrl = process.env.SMTP_URL;
  if (!smtpUrl) {
    // Dev/self-host fallback — same degradation philosophy as aiAvailable.
    console.info(`[email:console] to=${to} subject="${subject}"\n${text}`);
    return;
  }
  const transporter = nodemailer.createTransport(smtpUrl);
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "SpeakPath <no-reply@speakpath.local>",
    to,
    subject,
    text,
  });
}
