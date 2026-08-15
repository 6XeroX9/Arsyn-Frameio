import nodemailer from "nodemailer";
import "dotenv/config";

// Telegram: create a bot via @BotFather, message it once, set
// TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID. No-op if either is missing.
async function notifyTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  }).catch((err) => {
    console.error("[notify] Telegram send failed:", err.message);
    return null;
  });
  if (res && !res.ok) console.error("[notify] Telegram API error:", res.status, await res.text());
}

// Gmail via an App Password (myaccount.google.com/apppasswords) — no
// domain verification needed, unlike Resend. No-op if unset.
let transporter;
function getTransporter() {
  if (transporter !== undefined) return transporter;
  transporter =
    process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD
      ? nodemailer.createTransport({
          service: "gmail",
          auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
        })
      : null;
  return transporter;
}

async function notifyEmail(subject, text) {
  const t = getTransporter();
  const to = process.env.NOTIFY_EMAIL_TO;
  if (!t || !to) return;
  await t
    .sendMail({ from: `"Review Tool" <${process.env.GMAIL_USER}>`, to, subject, text })
    .catch((err) => console.error("[notify] Gmail send failed:", err.message));
}

export async function notifyReviewComplete({ projectName, clientName, videoTitle, versionNumber, commentCount }) {
  const text = `Review marked complete\n\n${projectName} (${clientName})\n${videoTitle} — v${versionNumber}\n${commentCount} comment(s) left`;
  await Promise.all([notifyTelegram(text), notifyEmail(`Review complete: ${projectName}`, text)]);
}
