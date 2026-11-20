import { NextResponse } from "next/server";
import { getSession, type Role, type Session } from "./auth";

export const ok = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

/** Returns the session if its role is allowed, otherwise null. */
export function requireRole(...roles: Role[]): Session | null {
  const s = getSession();
  return s && roles.includes(s.role) ? s : null;
}

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-nf-client-connection-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown"
  );
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

export const str = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);
