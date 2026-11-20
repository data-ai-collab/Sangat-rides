import crypto from "crypto";
import { cookies } from "next/headers";

export type Role = "admin" | "driver";
export type Session = { role: Role; driverId?: string; exp: number };

const COOKIE = "sr_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days, so drivers stay signed in on their phones

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET is not set (needs 16+ characters)");
  return s;
}

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function encodeSession(s: Session): string {
  const body = b64url(JSON.stringify(s));
  return `${body}.${sign(body)}`;
}

export function decodeSession(token?: string | null): Session | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const s = JSON.parse(Buffer.from(body, "base64url").toString()) as Session;
    if (!s.exp || s.exp < Date.now()) return null;
    return s;
  } catch {
    return null;
  }
}

/** Current session from the request cookie (server components and route handlers). */
export function getSession(): Session | null {
  return decodeSession(cookies().get(COOKIE)?.value);
}

export function setSession(role: Role, driverId?: string) {
  const s: Session = { role, driverId, exp: Date.now() + MAX_AGE * 1000 };
  cookies().set(COOKIE, encodeSession(s), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearSession() {
  cookies().set(COOKIE, "", { path: "/", maxAge: 0 });
}

/** PINs are stored as scrypt hashes: "salt:hash". */
export function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pin, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(pin, salt, 32);
  const real = Buffer.from(hash, "hex");
  return test.length === real.length && crypto.timingSafeEqual(test, real);
}

export function checkAdminPassword(pw: string): boolean {
  const real = process.env.ADMIN_PASSWORD;
  if (!real) return false;
  const a = crypto.createHash("sha256").update(pw).digest();
  const b = crypto.createHash("sha256").update(real).digest();
  return crypto.timingSafeEqual(a, b);
}

// Best-effort brute-force brake. Serverless instances don't share memory, so this slows
// guessing on a warm instance rather than guaranteeing a hard limit.
const hits = new Map<string, { n: number; reset: number }>();
export function rateLimited(key: string, max = 10, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < now) {
    hits.set(key, { n: 1, reset: now + windowMs });
    return false;
  }
  h.n += 1;
  return h.n > max;
}
