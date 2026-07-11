import "server-only";
import nodemailer from "nodemailer";

type Mail = { to: string; subject: string; text: string };

export async function sendEmail({ to, subject, text }: Mail): Promise<void> {
  const smtpUrl = process.env.SMTP_URL;
  if (!smtpUrl) {
    if (process.env.NODE_ENV === "production") {
      // Fail loudly, never leak the token into prod logs.
      console.error(
        `[email] SMTP_URL is not configured — email to ${to} ("${subject}") was NOT sent. Set SMTP_URL to enable email delivery.`,
      );
      return;
    }
    // Dev fallback: print the full message so the reset link is usable locally.
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
