import { prisma } from "./db";
import { sendEmail, sendSms, type Recipient } from "./brevo";
import { longDate, labelDate, t12 } from "./constants";
import { detourKm } from "./geo";
import { firstName } from "./phone";
import { getSettings } from "./settings";

// Drivers are emailed about new rides within this many km of their route.
const NEAR_KM = 10;

const site = () => (process.env.PUBLIC_BASE_URL || process.env.URL || "").replace(/\/$/, "");
const shortName = (name: string) => {
  const p = name.trim().split(/\s+/);
  return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0];
};
const legText = (leg: string, time: string) => (leg === "TO" ? `to the Gurdwara, arrive by ${t12(time)}` : `home, leaving the Gurdwara at ${t12(time)}`);

/** Run notifications without ever failing the request that triggered them. */
export async function quietly(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    console.error("notification failed", e);
  }
}

/** A rider asked for new rides: tell the coordinator, and drivers who live near the route. */
export async function notifyNewRequest(tripIds: string[]) {
  if (!tripIds.length) return;
  const trips = await prisma.trip.findMany({ where: { id: { in: tripIds } }, include: { rider: true }, orderBy: { leg: "desc" } });
  if (!trips.length) return;
  const rider = trips[0].rider;
  const date = trips[0].date;
  const lines = trips.map((t) => `• ${legText(t.leg, t.time)}`).join("\n");
  const { coordinatorEmail } = await getSettings();

  const drivers = await prisma.driver.findMany({ where: { active: true, email: { not: "" } } });
  const near = drivers
    .map((d) => ({ d, km: detourKm(d.suburb, rider.suburb) }))
    .filter((x) => x.km != null && x.km <= NEAR_KM);

  const sends: Promise<unknown>[] = near.map(({ d, km }) =>
    sendEmail(
      [{ email: d.email, name: d.name }],
      `Ride needed near you · ${labelDate(date)}`,
      `Sat Sri Akal ${firstName(d.name)} ji,\n\n${shortName(rider.name)} from ${rider.suburb} needs a lift on ${longDate(date)}:\n${lines}\n\n` +
        `It's about ${km!.toFixed(1)} km off your route.\n\nTake the ride: ${site()}/driver\n\nThank you for your seva.`
    )
  );
  if (coordinatorEmail) {
    sends.push(
      sendEmail(
        [{ email: coordinatorEmail }],
        `New ride request · ${rider.name} · ${labelDate(date)}`,
        `${rider.name} (${rider.suburb}) booked by ${trips[0].channel.toLowerCase()} for ${longDate(date)}:\n${lines}\n\n` +
          (rider.status === "NEW" ? "This is a NEW rider: please call to check their address.\n\n" : "") +
          `${near.length} driver(s) nearby were emailed.\n\nPhone desk: ${site()}/desk`
      )
    );
  }
  await Promise.allSettled(sends);
}

/** A driver took a ride: text the rider. */
export async function notifyClaimed(tripId: string) {
  const t = await prisma.trip.findUnique({ where: { id: tripId }, include: { rider: true, driver: true } });
  if (!t || !t.driver) return;
  await sendSms(
    t.rider.phone,
    `Sat Sri Akal ${firstName(t.rider.name)} ji. Your ride ${t.leg === "TO" ? "to Revesby Gurdwara" : "home"} on ${labelDate(t.date)} ` +
      `(${t.leg === "TO" ? "arrive by" : "leave at"} ${t12(t.time)}) is with ${firstName(t.driver.name)}. They will call before pickup. - Sangat Rides`
  );
}

/** A ride was cancelled: tell the driver who had it, and the rider. */
export async function notifyCancelled(
  trip: { date: string; leg: string; time: string; riderName: string; riderPhone: string; driver?: { name: string; email: string } | null },
  { textRider = true } = {}
) {
  const sends: Promise<unknown>[] = [];
  if (textRider) {
    sends.push(
      sendSms(trip.riderPhone, `Sat Sri Akal ${firstName(trip.riderName)} ji. Your ride ${trip.leg === "TO" ? "to the Gurdwara" : "home"} on ${labelDate(trip.date)} has been cancelled. Call the ride line to rebook. - Sangat Rides`)
    );
  }
  if (trip.driver?.email) {
    sends.push(
      sendEmail(
        [{ email: trip.driver.email, name: trip.driver.name }],
        `Ride cancelled · ${labelDate(trip.date)}`,
        `Sat Sri Akal ${firstName(trip.driver.name)} ji,\n\nThe ride for ${shortName(trip.riderName)} (${legText(trip.leg, trip.time)}) on ${longDate(trip.date)} has been cancelled. No need to pick them up.\n\n${site()}/driver`
      )
    );
  }
  await Promise.allSettled(sends);
}

/** Saturday evening: rides still without a driver for tomorrow. */
export async function sendDigest(date: string): Promise<{ open: number; emailed: number }> {
  const open = await prisma.trip.findMany({
    where: { date, status: "REQUESTED" },
    include: { rider: true },
    orderBy: [{ leg: "desc" }, { time: "asc" }],
  });
  const { coordinatorEmail } = await getSettings();
  const drivers = await prisma.driver.findMany({ where: { active: true, email: { not: "" } } });
  if (!open.length) {
    if (coordinatorEmail) await sendEmail([{ email: coordinatorEmail }], `All rides covered for ${labelDate(date)}`, `Every ride for ${longDate(date)} has a driver. Thank you!\n\n${site()}/desk`);
    return { open: 0, emailed: coordinatorEmail ? 1 : 0 };
  }

  const list = (driverSuburb?: string) =>
    open
      .map((t) => {
        const km = detourKm(driverSuburb, t.rider.suburb);
        return { t, km, line: `• ${t.leg === "TO" ? "To Gurdwara" : "Home"} ${t12(t.time)}: ${shortName(t.rider.name)}, ${t.rider.suburb}${km != null && driverSuburb ? ` (~${km.toFixed(1)} km off your route)` : ""}` };
      })
      .sort((a, b) => (a.km ?? 99) - (b.km ?? 99))
      .map((x) => x.line)
      .join("\n");

  const recipients: { r: Recipient; suburb?: string }[] = drivers.map((d) => ({ r: { email: d.email, name: d.name }, suburb: d.suburb }));
  if (coordinatorEmail) recipients.push({ r: { email: coordinatorEmail } });

  await Promise.allSettled(
    recipients.map(({ r, suburb }) =>
      sendEmail(
        [r],
        `${open.length} ride${open.length > 1 ? "s" : ""} still need a driver tomorrow`,
        `Sat Sri Akal${r.name ? " " + firstName(r.name) + " ji" : ""},\n\nThese Sangat members still need a lift on ${longDate(date)}:\n\n${list(suburb)}\n\n` +
          `If you can help, take a ride here: ${site()}/driver\n\nWaheguru ji ka Khalsa, Waheguru ji ki Fateh.`
      )
    )
  );
  return { open: open.length, emailed: recipients.length };
}
