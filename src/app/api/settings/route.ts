import { prisma } from "@/lib/db";
import { emailEnabled, smsEnabled } from "@/lib/brevo";
import { fail, ok, readJson, requireRole, str } from "@/lib/http";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

// Public visitors only get the ride-line number; the coordinator gets everything.
export async function GET() {
  const s = await getSettings();
  if (!requireRole("admin")) return ok({ rideLine: s.rideLine });
  return ok({ ...s, emailEnabled: emailEnabled(), smsEnabled: smsEnabled() });
}

export async function PUT(req: Request) {
  if (!requireRole("admin")) return fail("Coordinator sign-in needed.", 401);
  const b = await readJson(req);
  const coordinatorEmail = str(b?.coordinatorEmail, 120);
  if (coordinatorEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(coordinatorEmail)) return fail("Check the coordinator email address.");
  const entries = { rideLine: str(b?.rideLine, 40), coordinator: str(b?.coordinator, 80), coordinatorEmail };
  for (const [key, value] of Object.entries(entries)) {
    await prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }
  return ok(entries);
}
