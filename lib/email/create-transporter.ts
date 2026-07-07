import nodemailer from "nodemailer";

const ADMIN_EMAIL = "doclink308@gmail.com";

export async function createEmailTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env",
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export function getEmailFromAddress(): string {
  return process.env.SMTP_FROM ?? `Walk Model Agency <${ADMIN_EMAIL}>`;
}
