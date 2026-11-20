import { prisma } from "@/lib/db";
import { hashPin } from "@/lib/auth";
import { SUBURBS } from "@/lib/geo";
import { fail, ok, readJson, requireRole, str } from "@/lib/http";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { driverDTO } from "@/lib/serialize";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!requireRole("admin")) return fail("Coordinator sign-in needed.", 401);
  const b = await readJson(req);
  const name = str(b?.name, 80);
  const suburb = str(b?.suburb, 60);
  const pin = str(b?.pin, 12);
  if (!name || !SUBURBS[suburb]) return fail("Name and home suburb are required.");
  if (!isValidPhone(str(b?.phone))) return fail("Enter a full Australian phone number.");
  if (pin && !/^\d{4,6}$/.test(pin)) return fail("A new PIN must be 4 to 6 digits.");
  const phone = normalizePhone(str(b?.phone));
  const email = str(b?.email, 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Check the email address.");
  const clash = await prisma.driver.findUnique({ where: { phone } });
  if (clash && clash.id !== params.id) return fail("Another driver uses this phone number.", 409);
  const driver = await prisma.driver.update({
    where: { id: params.id },
    data: {
      name,
      phone,
      email,
      suburb,
      seats: Math.min(7, Math.max(1, Number(b?.seats) || 3)),
      active: b?.active !== false,
      ...(pin ? { pinHash: hashPin(pin) } : {}),
    },
  });
  return ok({ driver: driverDTO(driver) });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!requireRole("admin")) return fail("Coordinator sign-in needed.", 401);
  // Open rides go back on the board; finished rides keep their history without the driver.
  await prisma.trip.updateMany({
    where: { driverId: params.id, status: { in: ["CLAIMED", "ONBOARD"] } },
    data: { driverId: null, status: "REQUESTED", claimedAt: null },
  });
  await prisma.driver.delete({ where: { id: params.id } });
  return ok({ ok: true });
}
