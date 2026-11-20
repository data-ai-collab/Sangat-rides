"use client";

import { useCallback, useEffect, useState } from "react";
import { SUBURB_NAMES } from "@/lib/geo";
import { formatPhone } from "@/lib/phone";
import type { DriverDTO, RiderDTO } from "@/lib/serialize";
import { RiderForm, emptyRider } from "@/components/RiderForm";
import { Button, Card, ConfirmButton, Tag, api, useToast } from "@/components/ui";

type DriverRow = DriverDTO & { ridesDone: number };
type DriverInput = { name: string; phone: string; email: string; suburb: string; seats: number; pin: string; active: boolean };
const emptyDriver: DriverInput = { name: "", phone: "", email: "", suburb: "", seats: 3, pin: "", active: true };
type SettingsState = { rideLine: string; coordinator: string; coordinatorEmail: string; emailEnabled?: boolean; smsEnabled?: boolean };

export function Admin() {
  const [riders, setRiders] = useState<RiderDTO[]>([]);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [editRider, setEditRider] = useState<string | null>(null);
  const [editDriver, setEditDriver] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [settings, setSettings] = useState<SettingsState>({ rideLine: "", coordinator: "", coordinatorEmail: "" });
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const toast = useToast();

  async function saveSettings() {
    setSaveState("saving");
    setSaveError("");
    try {
      await api("/api/settings", {
        method: "PUT",
        body: { rideLine: settings.rideLine, coordinator: settings.coordinator, coordinatorEmail: settings.coordinatorEmail },
      });
      await load();
      setSaveState("saved");
      setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 6000);
    } catch (e) {
      setSaveError((e as Error).message);
      setSaveState("error");
    }
  }

  const load = useCallback(async () => {
    const [r, d, s] = await Promise.all([
      api<{ riders: RiderDTO[] }>("/api/riders"),
      api<{ drivers: DriverRow[] }>("/api/drivers"),
      api<SettingsState>("/api/settings"),
    ]);
    setRiders(r.riders);
    setDrivers(d.drivers);
    setSettings(s);
  }, []);

  useEffect(() => {
    load().catch((e) => toast.show((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  async function run(fn: () => Promise<unknown>, msg: string) {
    try {
      await fn();
      if (msg) toast.show(msg);
      await load();
      return true;
    } catch (e) {
      toast.show((e as Error).message);
      return false;
    }
  }

  const f = filter.trim().toLowerCase();
  const shown = riders.filter((r) => !f || r.name.toLowerCase().includes(f) || r.suburb.toLowerCase().includes(f) || r.phone.includes(f.replace(/\D/g, "") || "~"));
  const newCount = riders.filter((r) => r.status === "NEW").length;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl font-bold">People &amp; settings</h1>
      <div className="grid gap-5 lg:grid-cols-2 items-start">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold">Riders ({riders.length}){newCount > 0 && <span className="ml-2 text-base text-red-700">{newCount} new to check</span>}</h2>
            <Button size="sm" onClick={() => setEditRider("new")}>Add rider</Button>
          </div>
          {editRider === "new" && (
            <RiderForm
              onCancel={() => setEditRider(null)}
              onSubmit={async (r) => {
                if (await run(() => api("/api/riders", { method: "POST", body: r }), "Rider added.")) setEditRider(null);
              }}
            />
          )}
          <input placeholder="Filter by name, suburb or phone" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <div className="flex flex-col divide-y divide-line">
            {shown.length === 0 && <p className="py-4 text-muted">No riders yet. Riders can register themselves on the Request page, or add them here.</p>}
            {shown.map((r) =>
              editRider === r.id ? (
                <div key={r.id} className="py-3">
                  <RiderForm
                    showStatus
                    initial={{ ...emptyRider, ...r }}
                    onCancel={() => setEditRider(null)}
                    onSubmit={async (v) => {
                      if (await run(() => api(`/api/riders/${r.id}`, { method: "PATCH", body: v }), "Rider saved.")) setEditRider(null);
                    }}
                  />
                </div>
              ) : (
                <div key={r.id} className="py-3 flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <b>{r.name}</b>
                    {r.status === "NEW" && <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">New</span>}
                    {r.status === "INACTIVE" && <span className="ml-2 text-sm text-muted">(inactive)</span>}
                    <div className="text-[0.92rem]">{r.address}, {r.suburb} · <span className="tabular">{formatPhone(r.phone)}</span> · {r.language}</div>
                    {r.needs.length > 0 && <div className="mt-1">{r.needs.map((n) => <Tag key={n}>{n}</Tag>)}</div>}
                  </div>
                  <div className="flex gap-2">
                    {r.status === "NEW" && (
                      <Button size="sm" variant="dark" onClick={() => run(() => api(`/api/riders/${r.id}`, { method: "PATCH", body: { ...r, status: "ACTIVE" } }), "Marked as checked.")}>Checked</Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setEditRider(r.id)}>Edit</Button>
                    <ConfirmButton size="sm" variant="danger" label="Remove" confirmLabel="Tap again" onConfirm={() => run(() => api(`/api/riders/${r.id}`, { method: "DELETE" }), "Rider removed.")} />
                  </div>
                </div>
              )
            )}
          </div>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-bold">Drivers ({drivers.length})</h2>
              <Button size="sm" onClick={() => setEditDriver("new")}>Add driver</Button>
            </div>
            {editDriver === "new" && (
              <DriverForm
                isNew
                onCancel={() => setEditDriver(null)}
                onSubmit={async (d) => {
                  if (await run(() => api("/api/drivers", { method: "POST", body: d }), `Driver added. Give them their PIN: ${d.pin}`)) setEditDriver(null);
                }}
              />
            )}
            <div className="flex flex-col divide-y divide-line">
              {drivers.length === 0 && <p className="py-4 text-muted">No drivers yet. Add each volunteer with their home suburb and a PIN.</p>}
              {drivers.map((d) =>
                editDriver === d.id ? (
                  <div key={d.id} className="py-3">
                    <DriverForm
                      initial={{ ...d, pin: "" }}
                      onCancel={() => setEditDriver(null)}
                      onSubmit={async (v) => {
                        if (await run(() => api(`/api/drivers/${d.id}`, { method: "PATCH", body: v }), v.pin ? `Saved. New PIN: ${v.pin}` : "Driver saved.")) setEditDriver(null);
                      }}
                    />
                  </div>
                ) : (
                  <div key={d.id} className="py-3 flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <b>{d.name}</b>
                      {!d.active && <span className="ml-2 text-sm text-muted">(paused)</span>}
                      <div className="text-[0.92rem]">{d.suburb} · <span className="tabular">{formatPhone(d.phone)}</span> · {d.seats} seats{d.ridesDone ? ` · ${d.ridesDone} rides done` : ""}</div>
                      <div className="text-sm text-muted">{d.email || "No email: won't get ride alerts"}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setEditDriver(d.id)}>Edit</Button>
                      <ConfirmButton size="sm" variant="danger" label="Remove" confirmLabel="Tap again" onConfirm={() => run(() => api(`/api/drivers/${d.id}`, { method: "DELETE" }), "Driver removed.")} />
                    </div>
                  </div>
                )
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold">Settings</h2>
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (saveState !== "saving") saveSettings();
              }}
            >
              <label>
                <span className="lbl">Ride line phone number (shown on the home page)</span>
                <input inputMode="tel" value={settings.rideLine} onChange={(e) => setSettings({ ...settings, rideLine: e.target.value })} />
              </label>
              <label>
                <span className="lbl">Coordinator name</span>
                <input value={settings.coordinator} onChange={(e) => setSettings({ ...settings, coordinator: e.target.value })} />
              </label>
              <label>
                <span className="lbl">Coordinator email (gets every new request and the Saturday summary)</span>
                <input type="email" value={settings.coordinatorEmail} onChange={(e) => setSettings({ ...settings, coordinatorEmail: e.target.value })} />
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="dark" type="submit" disabled={saveState === "saving"}>
                  {saveState === "saving" ? "Saving…" : "Save settings"}
                </Button>
                {saveState === "saved" && (
                  <span role="status" className="font-bold text-emerald-700">✓ Saved</span>
                )}
                {saveState === "error" && (
                  <span role="alert" className="font-bold text-red-700">Not saved: {saveError}</span>
                )}
              </div>
            </form>
            <div className="rounded-lg bg-navy-50 px-4 py-3 text-[0.95rem] flex flex-col gap-1">
              <b>Notifications (Brevo)</b>
              <span>Email: {settings.emailEnabled ? "on" : "off · set BREVO_API_KEY and BREVO_SENDER_EMAIL in Netlify"}</span>
              <span>Text messages to riders: {settings.smsEnabled ? "on" : "off · set BREVO_SMS_ENABLED=true once you have SMS credits"}</span>
            </div>
            <Button
              variant="ghost"
              disabled={!settings.emailEnabled}
              onClick={() =>
                run(async () => {
                  const r = await api<{ open: number; emailed: number }>("/api/notify/digest", { method: "POST" });
                  toast.show(`Sent to ${r.emailed} people: ${r.open} ride(s) still need a driver.`);
                }, "")
              }
            >
              Email drivers the rides still needing a driver
            </Button>
          </Card>
        </div>
      </div>
      {toast.node}
    </div>
  );
}

function DriverForm({ initial = emptyDriver, isNew = false, onSubmit, onCancel }: { initial?: DriverInput; isNew?: boolean; onSubmit: (d: DriverInput) => void; onCancel: () => void }) {
  const [d, setD] = useState<DriverInput>(initial);
  const set = <K extends keyof DriverInput>(k: K, v: DriverInput[K]) => setD((c) => ({ ...c, [k]: v }));
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(d);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className="lbl">Name</span><input required value={d.name} onChange={(e) => set("name", e.target.value)} /></label>
        <label><span className="lbl">Phone (used to sign in)</span><input required inputMode="tel" value={d.phone} onChange={(e) => set("phone", e.target.value)} /></label>
        <label className="sm:col-span-2"><span className="lbl">Email (ride alerts near them, Saturday reminder)</span><input type="email" value={d.email} onChange={(e) => set("email", e.target.value)} /></label>
        <label><span className="lbl">Spare seats</span><input type="number" min={1} max={7} value={d.seats} onChange={(e) => set("seats", Number(e.target.value))} /></label>
        <label className="sm:col-span-2">
          <span className="lbl">Home suburb (finds pickups on their way)</span>
          <select required value={d.suburb} onChange={(e) => set("suburb", e.target.value)}>
            <option value="">Choose suburb…</option>
            {SUBURB_NAMES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label>
          <span className="lbl">{isNew ? "PIN (4–6 digits)" : "New PIN (leave blank to keep)"}</span>
          <input inputMode="numeric" required={isNew} pattern="\d{4,6}" value={d.pin} onChange={(e) => set("pin", e.target.value)} />
        </label>
        {!isNew && (
          <label className="inline-flex items-center gap-3 self-end min-h-[48px]">
            <input type="checkbox" checked={d.active} onChange={(e) => set("active", e.target.checked)} /> Active
          </label>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="dark" type="submit">Save driver</Button>
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
