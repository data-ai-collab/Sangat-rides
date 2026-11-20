import { prisma } from "@/lib/db";
import { fail, ok, readJson, requireRole, str } from "@/lib/http";
import { notifyCancelled, notifyClaimed, quietly } from "@/lib/notify";

// Status machine: REQUESTED -> CLAIMED -> ONBOARD -> DONE, or CANCELLED.
// Each change is a conditional update, so two drivers can't take the same ride.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const s = requireRole("admin", "driver");
  if (!s) return fail("Please sign in.", 401);
  const body = await readJson(req);
  const action = str(body?.action, 20);
  const id = params.id;
  const isAdmin = s.role === "admin";
  const mine = isAdmin ? {} : { driverId: s.driverId };
  const now = new Date();

  let count = 0;
  switch (action) {
    case "claim": {
      if (s.role !== "driver" || !s.driverId) return fail("Only drivers can take rides.", 403);
      count = (
        await prisma.trip.updateMany({
          where: { id, status: "REQUESTED", driverId: null },
          data: { driverId: s.driverId, status: "CLAIMED", claimedAt: now },
        })
      ).count;
      if (!count) return fail("Another driver has already taken this ride.", 409);
      break;
    }
    case "release":
      count = (
        await prisma.trip.updateMany({
          where: { id, status: "CLAIMED", ...mine },
          data: { driverId: null, status: "REQUESTED", claimedAt: null },
        })
      ).count;
      break;
    case "onboard":
      count = (await prisma.trip.updateMany({ where: { id, status: "CLAIMED", ...mine }, data: { status: "ONBOARD" } })).count;
      break;
    case "done":
      count = (
        await prisma.trip.updateMany({
          where: { id, status: { in: ["CLAIMED", "ONBOARD"] }, ...mine },
          data: { status: "DONE", completedAt: now },
        })
      ).count;
      break;
    case "cancel": {
      if (!isAdmin) return fail("Ask the coordinator to cancel a ride.", 403);
      const before = await prisma.trip.findUnique({ where: { id }, include: { rider: true, driver: true } });
      count = (
        await prisma.trip.updateMany({
          where: { id, status: { in: ["REQUESTED", "CLAIMED", "ONBOARD"] } },
          data: { status: "CANCELLED", driverId: null },
        })
      ).count;
      if (count && before) {
        await quietly(
          notifyCancelled({
            date: before.date,
            leg: before.leg,
            time: before.time,
            riderName: before.rider.name,
            riderPhone: before.rider.phone,
            driver: before.driver ? { name: before.driver.name, email: before.driver.email } : null,
          })
        );
      }
      break;
    }
    case "assign": {
      if (!isAdmin) return fail("Coordinator only.", 403);
      const driverId = str(body?.driverId, 40);
      const driver = await prisma.driver.findUnique({ where: { id: driverId } });
      if (!driver || !driver.active) return fail("Choose an active driver.");
      count = (
        await prisma.trip.updateMany({
          where: { id, status: { in: ["REQUESTED", "CLAIMED"] } },
          data: { driverId, status: "CLAIMED", claimedAt: now },
        })
      ).count;
      break;
    }
    default:
      return fail("Unknown action.");
  }
  if (!count) return fail("This ride has changed. Refresh and try again.", 409);
  if (action === "claim" || action === "assign") await quietly(notifyClaimed(id));
  return ok({ ok: true });
}
