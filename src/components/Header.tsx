import Link from "next/link";
import { getSession } from "@/lib/auth";
import { SignOut } from "./SignOut";

export function Header() {
  let role: string | null = null;
  try {
    role = getSession()?.role ?? null;
  } catch {
    role = null; // SESSION_SECRET missing: show the public header
  }
  return (
    <header className="bg-white border-b border-line">
      <div className="mx-auto max-w-6xl px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link href="/" className="flex items-center gap-3 no-underline">
          <Logo />
          <span>
            <span className="block text-xl font-bold leading-tight">Sangat Rides</span>
            <span className="block text-sm text-muted">
              Revesby Gurdwara · <span className="font-pa">ਸੰਗਤ ਸਵਾਰੀ ਸੇਵਾ</span>
            </span>
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-1 ml-auto text-[0.95rem] font-bold">
          {role === "driver" && <NavLink href="/driver">My rides</NavLink>}
          {role === "admin" && (
            <>
              <NavLink href="/desk">Phone desk</NavLink>
              <NavLink href="/admin">People &amp; settings</NavLink>
            </>
          )}
          {!role && (
            <>
              <NavLink href="/request">Request a ride</NavLink>
              <NavLink href="/login">Volunteer sign in</NavLink>
            </>
          )}
          {role && <SignOut />}
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-lg px-3 py-2 hover:bg-navy-50">
      {children}
    </Link>
  );
}

export function Logo({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden="true">
      <rect width="44" height="44" rx="10" fill="#14213d" />
      <path d="M8 29h28l-3-7c-.6-1.4-1.7-2-3-2H14c-1.3 0-2.4.6-3 2z" fill="#e8891c" />
      <circle cx="15" cy="30" r="3.4" fill="#fff" />
      <circle cx="29" cy="30" r="3.4" fill="#fff" />
      <path d="M22 7v9M19 11h6" stroke="#e8891c" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
