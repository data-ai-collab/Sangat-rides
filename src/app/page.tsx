import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { formatPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { rideLine } = await getSettings();
  return (
    <div className="flex flex-col gap-8">
      <section className="grid gap-6 md:grid-cols-[1.3fr_1fr] items-start">
        <div className="flex flex-col gap-4">
          <p className="eyebrow">Sri Guru Singh Sabha · 14–22 The River Road, Revesby</p>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">A lift to the Gurdwara this Sunday</h1>
          <p className="text-lg max-w-[60ch]">
            Volunteer drivers from the Sangat pick you up from home and bring you back after langar. It&apos;s free. Arrive any time between{" "}
            <b>9 am and 12 noon</b>, go home between <b>1 pm and 4 pm</b>.
          </p>
          <p className="font-pa text-lg text-muted">ਐਤਵਾਰ ਗੁਰਦੁਆਰੇ ਆਉਣ-ਜਾਣ ਲਈ ਮੁਫ਼ਤ ਸਵਾਰੀ</p>
        </div>
        <div className="rounded-2xl bg-navy text-white p-6 flex flex-col gap-3">
          <span className="text-sm uppercase tracking-wider font-bold text-kesri">Call to book</span>
          <span className="text-4xl font-bold tabular tracking-wide">{rideLine ? formatPhone(rideLine) : "Number coming soon"}</span>
          <p className="text-white/85">
            Just call and say what time. We use the address we have for you. You can book on Sunday morning or the day before.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Link href="/request" className="rounded-2xl border-2 border-kesri bg-white p-6 flex flex-col gap-2 hover:bg-kesri-50">
          <span className="text-2xl font-bold">Request a ride online</span>
          <span className="text-muted">Use your phone number. First time? You can register in two minutes.</span>
        </Link>
        <Link href="/login" className="rounded-2xl border-2 border-line bg-white p-6 flex flex-col gap-2 hover:bg-navy-50">
          <span className="text-2xl font-bold">Drive for the Sangat</span>
          <span className="text-muted">Volunteer drivers sign in to see who needs a lift on their way to the Gurdwara.</span>
        </Link>
        <div className="rounded-2xl bg-white border border-line p-6 flex flex-col gap-2">
          <span className="text-2xl font-bold">How it works</span>
          <ol className="list-decimal pl-5 text-muted flex flex-col gap-1">
            <li>You ask for a pickup and a time.</li>
            <li>A driver who lives near you takes the ride.</li>
            <li>They call you before they arrive.</li>
          </ol>
        </div>
      </section>
    </div>
  );
}
