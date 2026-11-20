import { prisma } from "@/lib/db";
import { rateLimited } from "@/lib/auth";
import { LANGUAGES, NEEDS } from "@/lib/constants";
import { SUBURBS } from "@/lib/geo";
import { clientIp, fail, ok, readJson, str } from "@/lib/http";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { BookingError, bookLeg } from "@/lib/trips";
import { notifyNewRequest, quietly } from "@/lib/notify";

type Body = {
  phone?: string;
  register?: { name?: string; address?: string; suburb?: string; language?: string; needs?: string[]; notes?: string };
  date?: string;
  to?: string | null;
  from?: string | null;
  note?: string;
};

export async function POST(req: Request) {
  if (rateLimited("request:" + clientIp(req), 20)) return fail("Too many requests. Please call the ride line instead.", 429);
  const body = await readJson<Body>(req);
  if (!body) return fail("Invalid request");
  const rawPhone = str(body.phone);
  if (!isValidPhone(rawPhone)) return fail("Please enter a full Australian phone number.");
  const phone = normalizePhone(rawPhone);
  const date = str(body.date, 10);
  const to = body.to ? str(body.to, 5) : null;
  const from = body.from ? str(body.from, 5) : null;
  if (!to && !from) return fail("Choose at least one ride.");

  let rider = await prisma.rider.findUnique({ where: { phone } });
  if (rider?.status === "INACTIVE") return fail("Please call the ride line to book.", 403);

  if (!rider) {
    const r = body.register;
    if (!r) return fail("We don't have this number yet. Please register first.", 404);
    const name = str(r.name, 80);
    const address = str(r.address, 160);
    const suburb = str(r.suburb, 60);
    if (!name || !address || !suburb) return fail("Please fill in your name, street address and suburb.");
    if (suburb !== "Other" && !SUBURBS[suburb]) return fail("Please choose your suburb from the list.");
    const language = (LANGUAGES as readonly string[]).includes(str(r.language)) ? str(r.language) : "Punjabi";
    const needs = (r.needs || []).filter((n) => (NEEDS as readonly string[]).includes(n)).join(",");
    rider = await prisma.rider.create({
      data: { name, phone, address, suburb, language, needs, notes: str(r.notes, 300), status: "NEW", createdVia: "APP" },
    });
  }

  try {
    const booked: Awaited<ReturnType<typeof bookLeg>>[] = [];
    if (to) booked.push(await bookLeg({ riderId: rider.id, date, leg: "TO", time: to, channel: "APP", note: body.note }));
    if (from) booked.push(await bookLeg({ riderId: rider.id, date, leg: "FROM", time: from, channel: "APP", note: body.note }));
    await quietly(notifyNewRequest(booked.filter((b) => b.result === "new").map((b) => b.tripId)));
    return ok({ ok: true, isNewRider: rider.status === "NEW", results: booked.map((b) => b.result) });
  } catch (e) {
    if (e instanceof BookingError) return fail(e.message);
    throw e;
  }
}
