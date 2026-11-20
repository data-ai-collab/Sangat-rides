"use client";

import { t12 } from "@/lib/constants";
import { formatPhone } from "@/lib/phone";
import type { TripDTO } from "@/lib/serialize";
import { StatusPill, Tag, tripBorder } from "./ui";

export function TripCard({
  trip,
  detour,
  showLeg = false,
  children,
}: {
  trip: TripDTO;
  detour?: number | null;
  showLeg?: boolean;
  children?: React.ReactNode;
}) {
  const r = trip.rider;
  return (
    <article className={`rounded-xl border border-line bg-white p-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 ${tripBorder(trip.status)} ${trip.status === "CANCELLED" ? "opacity-60" : ""}`}>
      <div className="text-2xl font-bold tabular leading-tight whitespace-nowrap">
        {t12(trip.time)}
        <small className="block text-xs font-normal text-muted">{trip.leg === "TO" ? "arrive by" : "leave at"}</small>
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-bold">{r.name}</span>
          <StatusPill status={trip.status} />
          {r.status === "NEW" && <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">New rider · check details</span>}
        </div>
        <div className="text-[0.92rem] text-muted">
          {r.suburb} · {r.language}
          {showLeg && <> · {trip.leg === "TO" ? "to Gurdwara" : "home"}</>}
          {detour != null && (
            <> · <b className={detour > 8 ? "text-amber-700" : "text-emerald-700"}>~{detour.toFixed(1)} km off your route</b></>
          )}
        </div>
        {r.needs.length > 0 && <div>{r.needs.map((n) => <Tag key={n}>{n}</Tag>)}</div>}
        {r.address !== undefined && (
          <div className="mt-1 rounded-lg bg-navy-50 px-3 py-2">
            <b>{r.address}, {r.suburb}</b>
            <br />
            Phone: <a href={`tel:${r.phone}`} className="underline tabular">{formatPhone(r.phone || "")}</a>
            {r.notes && <><br />{r.notes}</>}
            {trip.driverName && <><br /><span className="text-muted">Driver: {trip.driverName}</span></>}
          </div>
        )}
        {trip.note && <div className="text-[0.92rem]">Ride note: {trip.note}</div>}
      </div>
      {children && <div className="col-span-2 mt-2 flex flex-wrap items-center gap-2">{children}</div>}
    </article>
  );
}
