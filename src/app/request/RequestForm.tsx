"use client";

import { useState } from "react";
import { FROM_TIMES, TO_TIMES, labelDate, longDate, t12 } from "@/lib/constants";
import { formatPhone } from "@/lib/phone";
import { RiderForm, emptyRider, type RiderInput } from "@/components/RiderForm";
import { Button, Card, Notice, SundayPicker, api } from "@/components/ui";

type Lookup = { found: boolean; firstName?: string; suburb?: string; trips?: { date: string; leg: string; time: string; status: string }[] };

export function RequestForm({ sundays, rideLine }: { sundays: string[]; rideLine: string }) {
  const [phone, setPhone] = useState("");
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [register, setRegister] = useState<RiderInput | null>(null);
  const [date, setDate] = useState(sundays[0]);
  const [wantTo, setWantTo] = useState(true);
  const [wantFrom, setWantFrom] = useState(true);
  const [to, setTo] = useState("10:00");
  const [from, setFrom] = useState("14:00");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ date: string; to: string | null; from: string | null; isNew: boolean } | null>(null);

  const known = lookup?.found;
  const ready = !!known || (!!register && register !== emptyRider);

  async function find() {
    setError(null);
    setBusy(true);
    try {
      const r = await api<Lookup>("/api/public/lookup", { method: "POST", body: { phone } });
      setLookup(r);
      setRegister(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setError(null);
    if (!wantTo && !wantFrom) return setError("Tick at least one ride.");
    setBusy(true);
    try {
      const r = await api<{ isNewRider: boolean }>("/api/public/request", {
        method: "POST",
        body: { phone, register: known ? undefined : register, date, to: wantTo ? to : null, from: wantFrom ? from : null, note },
      });
      setDone({ date, to: wantTo ? to : null, from: wantFrom ? from : null, isNew: r.isNewRider });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="max-w-2xl">
        <div className="rounded-2xl border-[3px] border-emerald-600 bg-emerald-50 p-6 flex flex-col gap-3">
          <span className="eyebrow">Request received</span>
          <h1 className="text-2xl font-bold">{longDate(done.date)}</h1>
          {done.to && <p className="text-lg">To the Gurdwara: arrive by <b>{t12(done.to)}</b></p>}
          {done.from && <p className="text-lg">Home: leave at <b>{t12(done.from)}</b></p>}
          <p>
            A volunteer driver will call you on <b>{formatPhone(phone)}</b> before pickup.
            {done.isNew && " As this is your first ride, a volunteer may call first to check your address."}
          </p>
          {rideLine && <p className="text-muted">Need to change something? Call {formatPhone(rideLine)}.</p>}
          <div>
            <Button variant="dark" onClick={() => setDone(null)}>Book another ride</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-bold">Request a ride</h1>
        <p className="text-muted">
          Prefer to talk? {rideLine ? <>Call <b className="tabular">{formatPhone(rideLine)}</b> and say what time.</> : "Call the ride line."}
        </p>
      </div>

      <Card>
        <h2 className="text-xl font-bold">1. Your phone number <span className="font-pa text-base text-muted">ਤੁਹਾਡਾ ਫ਼ੋਨ ਨੰਬਰ</span></h2>
        <form
          className="flex flex-wrap gap-2 items-end"
          onSubmit={(e) => {
            e.preventDefault();
            find();
          }}
        >
          <label className="flex-1 min-w-[220px]">
            <span className="lbl">Mobile or home phone</span>
            <input
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setLookup(null);
                setRegister(null);
              }}
              placeholder="0412 345 678"
            />
          </label>
          <Button variant="dark" type="submit" disabled={busy || phone.replace(/\D/g, "").length < 8}>Continue</Button>
        </form>
        {lookup?.found && (
          <Notice tone="ok">
            Sat Sri Akal <b>{lookup.firstName} ji</b>. We&apos;ll pick you up from your address in {lookup.suburb}.
            {!!lookup.trips?.length && (
              <span className="block mt-1 text-sm">
                Already booked: {lookup.trips.map((t) => `${labelDate(t.date)} ${t.leg === "TO" ? "to Gurdwara" : "home"} ${t12(t.time)}`).join(" · ")}
              </span>
            )}
          </Notice>
        )}
        {lookup && !lookup.found && !register && (
          <Notice tone="warn">
            <p>We don&apos;t have this number yet. Register once and we&apos;ll remember your address.</p>
            <Button className="mt-2" variant="dark" onClick={() => setRegister(emptyRider)}>Register for rides</Button>
          </Notice>
        )}
        {lookup && !lookup.found && register && register === emptyRider && (
          <RiderForm
            hidePhone
            submitLabel="Save my details"
            onSubmit={(r) => setRegister({ ...r, phone })}
            onCancel={() => setRegister(null)}
          />
        )}
        {register && register !== emptyRider && (
          <Notice tone="ok">
            Thanks {register.name.split(" ")[0]}. Pickup from <b>{register.address}, {register.suburb}</b>.{" "}
            <button className="underline" onClick={() => setRegister(emptyRider)}>Change</button>
          </Notice>
        )}
      </Card>

      <Card className={ready ? "" : "opacity-60"}>
        <h2 className="text-xl font-bold">2. Which Sunday, and what times?</h2>
        <SundayPicker dates={sundays} value={date} onChange={setDate} />
        <label className="inline-flex items-center gap-3 font-bold">
          <input type="checkbox" checked={wantTo} onChange={(e) => setWantTo(e.target.checked)} /> Ride to the Gurdwara
        </label>
        {wantTo && (
          <label>
            <span className="lbl">Arrive at the Gurdwara by</span>
            <select value={to} onChange={(e) => setTo(e.target.value)}>
              {TO_TIMES.map((t) => <option key={t} value={t}>{t12(t)}</option>)}
            </select>
          </label>
        )}
        <label className="inline-flex items-center gap-3 font-bold">
          <input type="checkbox" checked={wantFrom} onChange={(e) => setWantFrom(e.target.checked)} /> Ride home
        </label>
        {wantFrom && (
          <label>
            <span className="lbl">Leave the Gurdwara at</span>
            <select value={from} onChange={(e) => setFrom(e.target.value)}>
              {FROM_TIMES.map((t) => <option key={t} value={t}>{t12(t)}</option>)}
            </select>
          </label>
        )}
        <label>
          <span className="lbl">Anything the driver should know? (optional)</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Please ring the doorbell" className="min-h-[80px]" />
        </label>
        {error && <Notice tone="error">{error}</Notice>}
        <Button variant="primary" size="lg" disabled={!ready || busy} onClick={submit}>
          {busy ? "Sending…" : "Request my ride"}
        </Button>
      </Card>
    </div>
  );
}
