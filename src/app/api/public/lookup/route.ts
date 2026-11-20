import { prisma } from "@/lib/db";
import { rateLimited } from "@/lib/auth";
import { upcomingSundays } from "@/lib/dates";
import { clientIp, fail, ok, readJson, str } from "@/lib/http";
import { firstName, isValidPhone, normalizePhone } from "@/lib/phone";

// Public: a rider types their phone number. We return only their first name and upcoming
// bookings, never their address, so a stranger can't learn where someone lives.
export async function POST(req: Request) {
  if (rateLimited("lookup:" + clientIp(req), 30)) return fail("Too many tries. Please call the ride line instead.", 429);
  const body = await readJson(req);
  const raw = str(body?.phone);
  if (!isValidPhone(raw)) return fail("Please enter a full Australian phone number, e.g. 0412 345 678.");
  const rider = await prisma.rider.findUnique({ where: { phone: normalizePhone(raw) } });
  if (!rider || rider.status === "INACTIVE") return ok({ found: false });

  const trips = await prisma.trip.findMany({
    where: { riderId: rider.id, date: { in: upcomingSundays(4) }, status: { not: "CANCELLED" } },
    orderBy: [{ date: "asc" }, { leg: "desc" }],
    select: { date: true, leg: true, time: true, status: true },
  });
  return ok({ found: true, firstName: firstName(rider.name), suburb: rider.suburb, trips });
}
