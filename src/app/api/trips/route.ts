import { prisma } from "@/lib/db";
import { upcomingSundays } from "@/lib/dates";
import { fail, ok, readJson, requireRole, str } from "@/lib/http";
import { driverDTO, tripDTO } from "@/lib/serialize";
import { BookingError, bookLeg } from "@/lib/trips";
import { notifyNewRequest, quietly } from "@/lib/notify";

export const dynamic = "force-dynamic";

// GET /api/trips?date=YYYY-MM-DD — drivers and coordinator.
export async function GET(req: Request) {
  const s = requireRole("admin", "driver");
  if (!s) return fail("Please sign in.", 401);
  const url = new URL(req.url);
  const date = url.searchParams.get("date") || upcomingSundays(1)[0];

  const trips = await prisma.trip.findMany({
    where: { date },
    include: { rider: true, driver: true },
    orderBy: [{ time: "asc" }],
  });
  const me = s.role === "driver" && s.driverId ? await prisma.driver.findUnique({ where: { id: s.driverId } }) : null;
  return ok({ date, trips: trips.map((t) => tripDTO(t, s)), me: me ? driverDTO(me) : null });
}

// POST /api/trips — coordinator books a leg for a rider (phone desk).
export async function POST(req: Request) {
  if (!requireRole("admin")) return fail("Coordinator sign-in needed.", 401);
  const body = await readJson(req);
  const leg = str(body?.leg) === "FROM" ? "FROM" : "TO";
  try {
    const r = await bookLeg({
      riderId: str(body?.riderId, 40),
      date: str(body?.date, 10),
      leg,
      time: str(body?.time, 5),
      channel: "DESK",
      note: str(body?.note, 300),
    });
    if (r.result === "new") await quietly(notifyNewRequest([r.tripId]));
    return ok(r);
  } catch (e) {
    if (e instanceof BookingError) return fail(e.message);
    throw e;
  }
}
