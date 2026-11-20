import { prisma } from "./db";
import { FROM_TIMES, TO_TIMES, type Channel, type Leg } from "./constants";
import { isBookableSunday } from "./dates";

export function validTime(leg: Leg, time: string): boolean {
  return leg === "TO" ? (TO_TIMES as readonly string[]).includes(time) : (FROM_TIMES as readonly string[]).includes(time);
}

/**
 * Book (or re-book) one leg for a rider. One trip per rider per leg per Sunday:
 * an active booking has its time updated; a cancelled or finished one is reopened.
 */
export async function bookLeg(opts: {
  riderId: string;
  date: string;
  leg: Leg;
  time: string;
  channel: Channel;
  note?: string;
}): Promise<{ result: "new" | "updated"; tripId: string }> {
  const { riderId, date, leg, time, channel } = opts;
  if (!isBookableSunday(date)) throw new BookingError("Rides can be booked for the next four Sundays only.");
  if (!validTime(leg, time)) throw new BookingError("That time is outside the Sunday ride window.");
  const note = (opts.note || "").slice(0, 300);

  const existing = await prisma.trip.findUnique({ where: { date_riderId_leg: { date, riderId, leg } } });
  if (existing && existing.status !== "CANCELLED" && existing.status !== "DONE") {
    await prisma.trip.update({ where: { id: existing.id }, data: { time, note: note || existing.note } });
    return { result: "updated", tripId: existing.id };
  }
  if (existing) {
    await prisma.trip.update({
      where: { id: existing.id },
      data: { time, note, channel, status: "REQUESTED", driverId: null, claimedAt: null, completedAt: null },
    });
    return { result: "new", tripId: existing.id };
  }
  const trip = await prisma.trip.create({ data: { riderId, date, leg, time, channel, note, status: "REQUESTED" } });
  return { result: "new", tripId: trip.id };
}

export class BookingError extends Error {}

/** Cancel every open leg a rider has on a Sunday. Returns the cancelled legs, with the driver who had each one. */
export async function cancelRiderDay(riderId: string, date: string) {
  const open = await prisma.trip.findMany({
    where: { riderId, date, status: { in: ["REQUESTED", "CLAIMED"] } },
    include: { driver: true, rider: true },
  });
  if (open.length) {
    await prisma.trip.updateMany({ where: { id: { in: open.map((t) => t.id) } }, data: { status: "CANCELLED", driverId: null } });
  }
  return open;
}
