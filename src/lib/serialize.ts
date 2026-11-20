import type { Driver, Rider, Trip } from "@prisma/client";
import type { Session } from "./auth";

export type RiderDTO = {
  id: string;
  name: string;
  phone: string;
  address: string;
  suburb: string;
  language: string;
  needs: string[];
  notes: string;
  status: string;
  createdVia: string;
};

export type DriverDTO = { id: string; name: string; phone: string; email: string; suburb: string; seats: number; active: boolean };

export type TripDTO = {
  id: string;
  date: string;
  leg: "TO" | "FROM";
  time: string;
  status: "REQUESTED" | "CLAIMED" | "ONBOARD" | "DONE" | "CANCELLED";
  channel: string;
  note: string;
  driverId: string | null;
  driverName: string | null;
  rider: {
    id: string;
    name: string;
    suburb: string;
    language: string;
    needs: string[];
    status: string;
    // Private details: only for the coordinator, or the driver who took this ride.
    phone?: string;
    address?: string;
    notes?: string;
  };
};

export const splitNeeds = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

export function riderDTO(r: Rider): RiderDTO {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    address: r.address,
    suburb: r.suburb,
    language: r.language,
    needs: splitNeeds(r.needs),
    notes: r.notes,
    status: r.status,
    createdVia: r.createdVia,
  };
}

export function driverDTO(d: Driver): DriverDTO {
  return { id: d.id, name: d.name, phone: d.phone, email: d.email, suburb: d.suburb, seats: d.seats, active: d.active };
}

export function tripDTO(t: Trip & { rider: Rider; driver: Driver | null }, s: Session): TripDTO {
  const canSeePrivate = s.role === "admin" || (s.role === "driver" && t.driverId === s.driverId);
  return {
    id: t.id,
    date: t.date,
    leg: t.leg as TripDTO["leg"],
    time: t.time,
    status: t.status as TripDTO["status"],
    channel: t.channel,
    note: t.note,
    driverId: t.driverId,
    driverName: t.driver?.name ?? null,
    rider: {
      id: t.rider.id,
      name: t.rider.name,
      suburb: t.rider.suburb,
      language: t.rider.language,
      needs: splitNeeds(t.rider.needs),
      status: t.rider.status,
      ...(canSeePrivate ? { phone: t.rider.phone, address: t.rider.address, notes: t.rider.notes } : {}),
    },
  };
}
