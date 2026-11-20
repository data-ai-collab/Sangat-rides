"use client";

export function SignOut() {
  return (
    <button
      className="rounded-lg px-3 py-2 text-muted hover:bg-navy-50"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/";
      }}
    >
      Sign out
    </button>
  );
}
