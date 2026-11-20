import crypto from "crypto";
import { nextSunday } from "@/lib/dates";
import { fail, ok, requireRole } from "@/lib/http";
import { sendDigest } from "@/lib/notify";

export const dynamic = "force-dynamic";

// POST /api/notify/digest — emails drivers the rides still needing a driver for the coming Sunday.
// Called every Saturday evening by netlify/functions/saturday-digest.mts (with CRON_SECRET),
// or by the coordinator from the phone desk.
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET || "";
  const given = req.headers.get("x-cron-secret") || "";
  const fromCron =
    secret.length >= 16 && given.length === secret.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!fromCron && !requireRole("admin")) return fail("Not allowed.", 401);
  return ok(await sendDigest(nextSunday()));
}
