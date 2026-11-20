"use client";

import { useState } from "react";
import { STATUS_BORDER, STATUS_LABEL, STATUS_STYLE, labelDate, type TripStatus } from "@/lib/constants";

type Variant = "primary" | "dark" | "outline" | "ghost" | "danger";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-kesri text-[#1d1303] border-kesri hover:bg-kesri-600 hover:border-kesri-600",
  dark: "bg-navy text-white border-navy hover:bg-navy-600",
  outline: "bg-white text-navy border-navy hover:bg-navy-50",
  ghost: "bg-white text-navy border-line hover:bg-navy-50",
  danger: "bg-white text-red-700 border-red-700 hover:bg-red-50",
};

export function Button({
  variant = "outline",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "min-h-[40px] px-3 py-1.5 text-[0.92rem]" : size === "lg" ? "min-h-[60px] px-6 py-3 text-lg" : "min-h-[48px] px-4 py-2";
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border-2 font-bold text-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${sz} ${VARIANTS[variant]} ${className}`}
    />
  );
}

/** A button that asks for a second tap before doing something destructive. */
export function ConfirmButton({ label, confirmLabel, onConfirm, ...rest }: { label: string; confirmLabel: string; onConfirm: () => void } & Omit<React.ComponentProps<typeof Button>, "onClick">) {
  const [armed, setArmed] = useState(false);
  return (
    <Button
      {...rest}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
          setTimeout(() => setArmed(false), 3500);
        }
      }}
    >
      {armed ? confirmLabel : label}
    </Button>
  );
}

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <section className={`rounded-xl border border-line bg-white p-5 flex flex-col gap-4 min-w-0 ${className}`}>{children}</section>;
}

export function StatusPill({ status }: { status: TripStatus }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}

export const tripBorder = (s: TripStatus) => `border-l-[6px] ${STATUS_BORDER[s]}`;

export function Tag({ children }: { children: React.ReactNode }) {
  return <span className="inline-block rounded-md border border-line px-2 py-0.5 text-sm mr-1 mb-1">{children}</span>;
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "ok" | "error"; children: React.ReactNode }) {
  const t = { info: "bg-blue-50", warn: "bg-amber-50", ok: "bg-emerald-50", error: "bg-red-50 text-red-800" }[tone];
  return <div className={`rounded-xl px-4 py-3 ${t}`}>{children}</div>;
}

export function SundayPicker({ dates, value, onChange }: { dates: string[]; value: string; onChange: (d: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="eyebrow mr-1">Sunday</span>
      {dates.map((d, i) => (
        <button
          key={d}
          aria-pressed={d === value}
          onClick={() => onChange(d)}
          className={`min-h-[44px] rounded-full border-2 px-4 font-bold ${d === value ? "bg-navy text-white border-navy" : "bg-white border-line"}`}
        >
          {i === 0 ? "This Sunday · " : ""}
          {labelDate(d)}
        </button>
      ))}
    </div>
  );
}

export async function api<T = unknown>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    method: init?.method || "GET",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Something went wrong. Please try again.");
  return data as T;
}

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const show = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg((cur) => (cur === m ? null : cur)), 3500);
  };
  const node = msg ? (
    <div role="status" className="fixed left-1/2 -translate-x-1/2 bottom-5 z-20 max-w-[calc(100%-32px)] rounded-full bg-navy px-5 py-3 text-center font-bold text-white shadow-lg">
      {msg}
    </div>
  ) : null;
  return { show, node };
}
