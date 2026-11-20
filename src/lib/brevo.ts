// Brevo (https://app.brevo.com) for email and SMS.
// Every send is best-effort: a failed notification is logged and never breaks a booking.

const API = "https://api.brevo.com/v3";
const TIMEOUT_MS = 6000;

export const emailEnabled = () => !!(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);
export const smsEnabled = () => !!process.env.BREVO_API_KEY && process.env.BREVO_SMS_ENABLED === "true";

async function post(path: string, body: unknown): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(API + path, {
      method: "POST",
      headers: { "api-key": process.env.BREVO_API_KEY || "", "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      console.error(`Brevo ${path} failed: ${res.status} ${await res.text().catch(() => "")}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`Brevo ${path} error`, e);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export type Recipient = { email: string; name?: string };

export async function sendEmail(to: Recipient[], subject: string, text: string, html?: string): Promise<boolean> {
  const list = to.filter((r) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email));
  if (!emailEnabled() || list.length === 0) return false;
  return post("/smtp/email", {
    sender: { email: process.env.BREVO_SENDER_EMAIL, name: process.env.BREVO_SENDER_NAME || "Sangat Rides" },
    // One email per person, so drivers never see each other's addresses.
    messageVersions: list.map((r) => ({ to: [r] })),
    subject,
    textContent: text,
    htmlContent: html || textToHtml(text),
  });
}

/** Australian number -> international digits for Brevo, e.g. 0412345678 -> 61412345678. */
export function toIntl(phone: string): string | null {
  const d = phone.replace(/\D/g, "");
  if (/^04\d{8}$/.test(d)) return "61" + d.slice(1);
  if (/^614\d{8}$/.test(d)) return d;
  return null; // only mobiles can receive SMS
}

export async function sendSms(phone: string, content: string): Promise<boolean> {
  const recipient = toIntl(phone);
  if (!smsEnabled() || !recipient) return false;
  return post("/transactionalSMS/send", {
    sender: (process.env.BREVO_SMS_SENDER || "SangatRides").replace(/[^A-Za-z0-9]/g, "").slice(0, 11),
    recipient,
    content,
    type: "transactional",
    tag: "sangat-rides",
  });
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
}

function textToHtml(text: string): string {
  const body = esc(text)
    .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" style="color:#c96f0c;font-weight:bold">$1</a>')
    .replace(/\n/g, "<br>");
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:1.5;color:#14213d;max-width:560px">
<div style="font-weight:bold;font-size:20px;margin-bottom:12px">Sangat Rides · Revesby Gurdwara</div>${body}</div>`;
}
