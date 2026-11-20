"use client";

import { useCallback, useEffect, useState } from "react";
import { detourKm } from "@/lib/geo";
import type { DriverDTO, TripDTO } from "@/lib/serialize";
import { TripCard } from "@/components/TripCard";
import { Button, Notice, SundayPicker, api, useToast } from "@/components/ui";

type Data = { trips: TripDTO[]; me: DriverDTO | null };

export function DriverBoard({ sundays }: { sundays: string[] }) {
  const [date, setDate] = useState(sundays[0]);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      setData(await api<Data>(`/api/trips?date=${date}`));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [date]);

  useEffect(() => {
    setData(null);
    load();
    const t = setInterval(load, 30000); // keep the board fresh while it's open
    return () => clearInterval(t);
  }, [load]);

  async function act(id: string, action: string, msg: string) {
    setBusyId(id);
    try {
      await api(`/api/trips/${id}`, { method: "PATCH", body: { action } });
      toast.show(msg);
    } catch (e) {
      toast.show((e as Error).message);
    } finally {
      setBusyId(null);
      load();
    }
  }

  const me = data?.me;
  const trips = data?.trips ?? [];
  const mine = trips.filter((t) => t.driverId === me?.id && t.status !== "CANCELLED").sort((a, b) => (a.leg === b.leg ? a.time.localeCompare(b.time) : a.leg === "TO" ? -1 : 1));
  const open = (leg: "TO" | "FROM") =>
    trips
      .filter((t) => t.leg === leg && t.status === "REQUESTED")
      .map((t) => ({ t, d: detourKm(me?.suburb, t.rider.suburb) }))
      .sort((a, b) => (a.d ?? 99) - (b.d ?? 99) || a.t.time.localeCompare(b.t.time));
  const others = trips.filter((t) => t.driverId && t.driverId !== me?.id && t.status !== "CANCELLED");
  const openCount = trips.filter((t) => t.status === "REQUESTED").length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Sat Sri Akal{me ? `, ${me.name.split(" ")[0]}` : ""}</h1>
        {me && <p className="text-muted">Home: {me.suburb} · {me.seats} spare seats. Open rides are sorted by how far off your route to the Gurdwara they are.</p>}
        <SundayPicker dates={sundays} value={date} onChange={setDate} />
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {!data && !error && <p className="text-muted">Loading rides…</p>}

      {data && (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-bold border-b-[3px] border-navy pb-2">My rides</h2>
            {mine.length === 0 ? (
              <p className="rounded-xl border-2 border-dashed border-line p-5 text-center text-muted">
                You haven&apos;t taken any rides for this Sunday yet. {openCount ? `${openCount} still need a driver below.` : ""}
              </p>
            ) : (
              mine.map((t) => (
                <TripCard key={t.id} trip={t} showLeg>
                  {t.status === "CLAIMED" && (
                    <>
                      <Button variant="dark" disabled={busyId === t.id} onClick={() => act(t.id, "onboard", "Marked as on the way.")}>
                        {t.leg === "TO" ? "Picked up" : "Left the Gurdwara"}
                      </Button>
                      <Button variant="ghost" disabled={busyId === t.id} onClick={() => act(t.id, "release", "Ride given back to the board.")}>Give back</Button>
                    </>
                  )}
                  {t.status === "ONBOARD" && (
                    <Button variant="dark" disabled={busyId === t.id} onClick={() => act(t.id, "done", "Dropped off. Thank you for your seva.")}>
                      {t.leg === "TO" ? "Dropped at Gurdwara" : "Dropped home"}
                    </Button>
                  )}
                  {t.status === "DONE" && <span className="font-bold text-emerald-700">Done. Thank you.</span>}
                </TripCard>
              ))
            )}
          </section>

          <div className="grid gap-6 md:grid-cols-2 items-start">
            {(["TO", "FROM"] as const).map((leg) => {
              const list = open(leg);
              return (
                <section key={leg} className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-[3px] border-navy pb-2">
                    <h2 className="text-xl font-bold">{leg === "TO" ? "Needs a lift to the Gurdwara" : "Needs a lift home"}</h2>
                    <span className="text-sm text-muted">
                      {leg === "TO" ? "Arrive 9 am – 12 pm · " : "Leave 1 – 4 pm · "}
                      <span className="font-pa">{leg === "TO" ? "ਗੁਰਦੁਆਰੇ ਜਾਣਾ" : "ਘਰ ਵਾਪਸੀ"}</span>
                    </span>
                  </div>
                  {list.length === 0 ? (
                    <p className="rounded-xl border-2 border-dashed border-line p-5 text-center text-muted">Every ride here has a driver.</p>
                  ) : (
                    list.map(({ t, d }) => (
                      <TripCard key={t.id} trip={t} detour={d}>
                        <Button variant="primary" disabled={busyId === t.id} onClick={() => act(t.id, "claim", "The ride is yours. Please call the rider to confirm.")}>
                          I&apos;ll drive this
                        </Button>
                      </TripCard>
                    ))
                  )}
                </section>
              );
            })}
          </div>

          {others.length > 0 && (
            <details className="rounded-xl border border-line bg-white p-4">
              <summary className="cursor-pointer font-bold">Rides other drivers have taken ({others.length})</summary>
              <ul className="mt-3 flex flex-col gap-1 text-[0.95rem]">
                {others.map((t) => (
                  <li key={t.id}>
                    {t.rider.name} ({t.rider.suburb}), {t.leg === "TO" ? "to Gurdwara" : "home"}: {t.driverName}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
      {toast.node}
    </div>
  );
}
