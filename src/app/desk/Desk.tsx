"use client";

import { useCallback, useEffect, useState } from "react";
import { FROM_TIMES, TO_TIMES, labelDate, t12 } from "@/lib/constants";
import { formatPhone } from "@/lib/phone";
import type { DriverDTO, RiderDTO, TripDTO } from "@/lib/serialize";
import { RiderForm } from "@/components/RiderForm";
import { TripCard } from "@/components/TripCard";
import { Button, Card, ConfirmButton, Notice, SundayPicker, Tag, api, useToast } from "@/components/ui";

type Callback = { id: string; phone: string; reason: string; createdAt: string };

export function Desk({ sundays, rideLine }: { sundays: string[]; rideLine: string }) {
  const [date, setDate] = useState(sundays[0]);
  const [q, setQ] = useState("");
  const [riders, setRiders] = useState<RiderDTO[]>([]);
  const [trips, setTrips] = useState<TripDTO[]>([]);
  const [drivers, setDrivers] = useState<DriverDTO[]>([]);
  const [callbacks, setCallbacks] = useState<Callback[]>([]);
  const [newCaller, setNewCaller] = useState(false);
  const [times, setTimes] = useState<Record<string, { to: string; from: string }>>({});
  const toast = useToast();

  const loadTrips = useCallback(async () => {
    try {
      const r = await api<{ trips: TripDTO[] }>(`/api/trips?date=${date}`);
      setTrips(r.trips);
    } catch (e) {
      toast.show((e as Error).message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const loadSide = useCallback(async () => {
    const [d, c] = await Promise.all([api<{ drivers: DriverDTO[] }>("/api/drivers"), api<{ callbacks: Callback[] }>("/api/callbacks")]);
    setDrivers(d.drivers.filter((x) => x.active));
    setCallbacks(c.callbacks);
  }, []);

  useEffect(() => {
    loadTrips();
    const t = setInterval(loadTrips, 30000);
    return () => clearInterval(t);
  }, [loadTrips]);

  useEffect(() => {
    loadSide().catch(() => {});
    const t = setInterval(() => loadSide().catch(() => {}), 60000);
    return () => clearInterval(t);
  }, [loadSide]);

  useEffect(() => {
    if (!q.trim()) return setRiders([]);
    const h = setTimeout(async () => {
      try {
        setRiders((await api<{ riders: RiderDTO[] }>(`/api/riders?q=${encodeURIComponent(q)}`)).riders);
      } catch (e) {
        toast.show((e as Error).message);
      }
    }, 250);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function book(rider: RiderDTO, leg: "TO" | "FROM") {
    const time = leg === "TO" ? times[rider.id]?.to || "10:00" : times[rider.id]?.from || "14:00";
    try {
      const r = await api<{ result: string }>("/api/trips", { method: "POST", body: { riderId: rider.id, date, leg, time } });
      toast.show(`${r.result === "updated" ? "Updated" : "Booked"}: ${rider.name}, ${leg === "TO" ? "to Gurdwara" : "home"} ${t12(time)}`);
      loadTrips();
    } catch (e) {
      toast.show((e as Error).message);
    }
  }

  async function tripAction(id: string, body: Record<string, string>, msg: string) {
    try {
      await api(`/api/trips/${id}`, { method: "PATCH", body });
      toast.show(msg);
    } catch (e) {
      toast.show((e as Error).message);
    }
    loadTrips();
  }

  const active = trips.filter((t) => t.status !== "CANCELLED");
  const needDriver = active.filter((t) => t.status === "REQUESTED").length;
  const sorted = [...trips].sort((a, b) => (a.leg === b.leg ? a.time.localeCompare(b.time) : a.leg === "TO" ? -1 : 1));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold">Phone desk</h1>
        <SundayPicker dates={sundays} value={date} onChange={setDate} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat n={new Set(active.map((t) => t.rider.id)).size} label="riders" />
          <Stat n={active.filter((t) => t.leg === "TO").length} label="rides to Gurdwara" />
          <Stat n={active.filter((t) => t.leg === "FROM").length} label="rides home" />
          <Stat n={needDriver} label={needDriver ? "still need a driver" : "all covered"} warn={needDriver > 0} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 items-start">
        <div className="flex flex-col gap-5">
          <Card>
            <h2 className="text-xl font-bold">Find the caller</h2>
            <label>
              <span className="lbl">Name or phone number</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type as they speak" autoComplete="off" />
            </label>
            {q.trim() && riders.length === 0 && <p className="text-muted">No rider matches. Register them as a new caller.</p>}
            <div className="flex flex-col divide-y divide-line">
              {riders.map((r) => {
                const has = trips.filter((t) => t.rider.id === r.id && t.status !== "CANCELLED");
                return (
                  <div key={r.id} className="py-3 flex flex-col gap-2">
                    <div>
                      <b className="text-lg">{r.name}</b>
                      {r.status === "NEW" && <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">New · confirm address</span>}
                      {r.status === "INACTIVE" && <span className="ml-2 text-sm text-muted">(inactive)</span>}
                      <div className="text-[0.95rem]">{r.address}, {r.suburb} · <span className="tabular">{formatPhone(r.phone)}</span> · {r.language}</div>
                      {r.needs.length > 0 && <div className="mt-1">{r.needs.map((n) => <Tag key={n}>{n}</Tag>)}</div>}
                      {has.length > 0 && (
                        <div className="text-sm text-muted">Booked {labelDate(date)}: {has.map((t) => `${t.leg === "TO" ? "to Gurdwara" : "home"} ${t12(t.time)}`).join(", ")}</div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <select className="w-auto" aria-label="Arrive by" value={times[r.id]?.to || "10:00"} onChange={(e) => setTimes((s) => ({ ...s, [r.id]: { from: s[r.id]?.from || "14:00", to: e.target.value } }))}>
                        {TO_TIMES.map((t) => <option key={t} value={t}>{t12(t)}</option>)}
                      </select>
                      <Button size="sm" variant="primary" onClick={() => book(r, "TO")}>Book to Gurdwara</Button>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <select className="w-auto" aria-label="Leave at" value={times[r.id]?.from || "14:00"} onChange={(e) => setTimes((s) => ({ ...s, [r.id]: { to: s[r.id]?.to || "10:00", from: e.target.value } }))}>
                        {FROM_TIMES.map((t) => <option key={t} value={t}>{t12(t)}</option>)}
                      </select>
                      <Button size="sm" variant="primary" onClick={() => book(r, "FROM")}>Book home</Button>
                    </div>
                  </div>
                );
              })}
            </div>
            {!newCaller ? (
              <Button variant="ghost" onClick={() => setNewCaller(true)}>New caller · register them</Button>
            ) : (
              <>
                <h3 className="text-lg font-bold">New caller</h3>
                <RiderForm
                  onCancel={() => setNewCaller(false)}
                  onSubmit={async (r) => {
                    try {
                      await api("/api/riders", { method: "POST", body: r });
                      toast.show(`${r.name} registered. Now book their rides.`);
                      setNewCaller(false);
                      setQ(r.name);
                    } catch (e) {
                      toast.show((e as Error).message);
                    }
                  }}
                />
              </>
            )}
          </Card>

          {callbacks.length > 0 && (
            <Card>
              <h2 className="text-xl font-bold">Please call back ({callbacks.length})</h2>
              <p className="text-sm text-muted">From the automated phone line: unregistered numbers, or riders who pressed 0.</p>
              {callbacks.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                  <div>
                    <b className="tabular">{formatPhone(c.phone)}</b>
                    <div className="text-sm text-muted">{c.reason} · {new Date(c.createdAt).toLocaleString("en-AU", { weekday: "short", hour: "numeric", minute: "2-digit" })}</div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={async () => { await api(`/api/callbacks/${c.id}`, { method: "PATCH" }); loadSide(); }}>Called back</Button>
                </div>
              ))}
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-xl bg-navy text-white p-5">
            <span className="text-sm uppercase tracking-wider font-bold text-kesri">Ride line</span>
            <div className="text-3xl font-bold tabular">{rideLine ? formatPhone(rideLine) : "Not set · add it in Settings"}</div>
            <ol className="mt-3 list-decimal pl-5 flex flex-col gap-1 text-white/90">
              <li>&ldquo;Sat Sri Akal ji. Sangat Rides, Revesby Gurdwara.&rdquo;</li>
              <li>Find them by name or phone. Read back the address.</li>
              <li>Ask what time to arrive (9–12) and to go home (1–4).</li>
              <li>Book both. Tell them a driver will call before pickup.</li>
            </ol>
          </div>

          <Card>
            <h2 className="text-xl font-bold">Bookings for {labelDate(date)}</h2>
            {sorted.length === 0 ? (
              <p className="rounded-xl border-2 border-dashed border-line p-5 text-center text-muted">No rides booked for this Sunday yet.</p>
            ) : (
              sorted.map((t) => (
                <TripCard key={t.id} trip={t} showLeg>
                  {(t.status === "REQUESTED" || t.status === "CLAIMED") && (
                    <select
                      className="w-auto min-h-[40px]"
                      aria-label="Assign driver"
                      value=""
                      onChange={(e) => e.target.value && tripAction(t.id, { action: "assign", driverId: e.target.value }, "Driver assigned.")}
                    >
                      <option value="">{t.driverId ? "Change driver…" : "Assign driver…"}</option>
                      {drivers.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.suburb})</option>)}
                    </select>
                  )}
                  {t.status !== "CANCELLED" && t.status !== "DONE" && (
                    <ConfirmButton size="sm" variant="danger" label="Cancel ride" confirmLabel="Tap again to cancel" onConfirm={() => tripAction(t.id, { action: "cancel" }, "Ride cancelled.")} />
                  )}
                </TripCard>
              ))
            )}
          </Card>
        </div>
      </div>
      {toast.node}
    </div>
  );
}

function Stat({ n, label, warn }: { n: number; label: string; warn?: boolean }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${warn ? "bg-amber-50 border-transparent" : "bg-white border-line"}`}>
      <b className={`block text-3xl tabular leading-none ${warn ? "text-amber-700" : ""}`}>{n}</b>
      <span className="text-sm text-muted">{label}</span>
    </div>
  );
}
