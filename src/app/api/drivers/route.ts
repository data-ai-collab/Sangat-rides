import { prisma } from "@/lib/db";
import { hashPin } from "@/lib/auth";
import { SUBURBS } from "@/lib/geo";
import { fail, ok, readJson, requireRole, str } from "@/lib/http";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { driverDTO } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!requireRole("admin")) return fail("Coordinator sign-in needed.", 401);
  const drivers = await prisma.driver.findMany({ orderBy: { name: "asc" } });
  const done = await prisma.trip.groupBy({ by: ["driverId"], where: { status: "DONE" }, _count: { _all: true } });
  const counts = Object.fromEntries(done.map((d) => [d.driverId, d._count._all]));
  return ok({ drivers: drivers.map((d) => ({ ...driverDTO(d), ridesDone: counts[d.id] || 0 })) });
}

export async function POST(req: Request) {
  if (!requireRole("admin")) return fail("Coordinator sign-in needed.", 401);
  const b = await readJson(req);
  const name = str(b?.name, 80);
  const suburb = str(b?.suburb, 60);
  const pin = str(b?.pin, 12);
  if (!name || !SUBURBS[suburb]) return fail("Name and home suburb are required.");
  if (!isValidPhone(str(b?.phone))) return fail("Enter a full Australian phone number.");
  if (!/^\d{4,6}$/.test(pin)) return fail("Set a PIN of 4 to 6 digits for the driver.");
  const phone = normalizePhone(str(b?.phone));
  if (await prisma.driver.findUnique({ where: { phone } })) return fail("A driver with this phone number already exists.", 409);
  const seats = Math.min(7, Math.max(1, Number(b?.seats) || 3));
  const email = str(b?.email, 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Check the email address.");
  const driver = await prisma.driver.create({ data: { name, phone, email, suburb, seats, pinHash: hashPin(pin) } });
  return ok({ driver: driverDTO(driver) }, 201);
}
