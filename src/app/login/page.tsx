"use client";

import { useState } from "react";
import { Button, Card, Notice, api } from "@/components/ui";

export default function LoginPage() {
  const [kind, setKind] = useState<"driver" | "admin">("driver");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const r = await api<{ next: string }>("/api/auth/login", {
        method: "POST",
        body: kind === "admin" ? { kind, password } : { kind, phone, pin },
      });
      window.location.href = r.next;
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Volunteer sign in</h1>
      <div className="flex gap-2" role="tablist">
        {(["driver", "admin"] as const).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={kind === k}
            onClick={() => setKind(k)}
            className={`flex-1 min-h-[48px] rounded-lg border-2 font-bold ${kind === k ? "bg-navy text-white border-navy" : "bg-white border-line"}`}
          >
            {k === "driver" ? "Driver" : "Coordinator / phone desk"}
          </button>
        ))}
      </div>
      <Card>
        <form className="flex flex-col gap-3" onSubmit={submit}>
          {kind === "driver" ? (
            <>
              <label>
                <span className="lbl">Your phone number</span>
                <input inputMode="tel" autoComplete="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
              </label>
              <label>
                <span className="lbl">PIN</span>
                <input inputMode="numeric" autoComplete="current-password" type="password" required value={pin} onChange={(e) => setPin(e.target.value)} />
              </label>
              <p className="text-sm text-muted">The coordinator gives you a PIN when you register as a driver.</p>
            </>
          ) : (
            <label>
              <span className="lbl">Coordinator password</span>
              <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
          )}
          {error && <Notice tone="error">{error}</Notice>}
          <Button variant="dark" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
        </form>
      </Card>
    </div>
  );
}
