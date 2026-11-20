"use client";

import { useState } from "react";
import { LANGUAGES, NEEDS } from "@/lib/constants";
import { SUBURB_NAMES } from "@/lib/geo";
import { Button } from "./ui";

export type RiderInput = {
  name: string;
  phone: string;
  address: string;
  suburb: string;
  language: string;
  needs: string[];
  notes: string;
  status?: string;
};

export const emptyRider: RiderInput = { name: "", phone: "", address: "", suburb: "", language: "Punjabi", needs: [], notes: "" };

export function RiderForm({
  initial = emptyRider,
  hidePhone = false,
  showStatus = false,
  submitLabel = "Save rider",
  onSubmit,
  onCancel,
}: {
  initial?: RiderInput;
  hidePhone?: boolean;
  showStatus?: boolean;
  submitLabel?: string;
  onSubmit: (r: RiderInput) => Promise<void> | void;
  onCancel?: () => void;
}) {
  const [r, setR] = useState<RiderInput>(initial);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof RiderInput>(k: K, v: RiderInput[K]) => setR((cur) => ({ ...cur, [k]: v }));

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await onSubmit(r);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="lbl">Full name</span>
          <input required value={r.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" />
        </label>
        {!hidePhone && (
          <label>
            <span className="lbl">Phone</span>
            <input required inputMode="tel" value={r.phone} onChange={(e) => set("phone", e.target.value)} />
          </label>
        )}
        <label>
          <span className="lbl">Language</span>
          <select value={r.language} onChange={(e) => set("language", e.target.value)}>
            {LANGUAGES.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
        <label className="sm:col-span-2">
          <span className="lbl">Pickup address (street)</span>
          <input required value={r.address} onChange={(e) => set("address", e.target.value)} placeholder="House number and street" autoComplete="street-address" />
        </label>
        <label className="sm:col-span-2">
          <span className="lbl">Suburb</span>
          <select required value={r.suburb} onChange={(e) => set("suburb", e.target.value)}>
            <option value="">Choose suburb…</option>
            {SUBURB_NAMES.map((s) => (
              <option key={s}>{s}</option>
            ))}
            <option value="Other">Other (not listed)</option>
          </select>
        </label>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="font-bold text-[0.95rem] mb-1.5">Help needed</legend>
        <div className="flex flex-wrap gap-2">
          {NEEDS.map((n) => (
            <label key={n} className="inline-flex items-center gap-2 rounded-lg border-2 border-line px-3 py-2 min-h-[44px] cursor-pointer">
              <input
                type="checkbox"
                checked={r.needs.includes(n)}
                onChange={(e) => set("needs", e.target.checked ? [...r.needs, n] : r.needs.filter((x) => x !== n))}
              />
              {n}
            </label>
          ))}
        </div>
      </fieldset>
      <label>
        <span className="lbl">Notes for drivers</span>
        <input value={r.notes} onChange={(e) => set("notes", e.target.value)} placeholder="e.g. Granny flat at the back" />
      </label>
      {showStatus && (
        <label>
          <span className="lbl">Status</span>
          <select value={r.status || "ACTIVE"} onChange={(e) => set("status", e.target.value)}>
            <option value="ACTIVE">Active</option>
            <option value="NEW">New · details not checked yet</option>
            <option value="INACTIVE">Inactive · can&apos;t book</option>
          </select>
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="dark" type="submit" disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </Button>
        {onCancel && (
          <Button variant="ghost" type="button" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
