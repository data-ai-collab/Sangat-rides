import crypto from "crypto";
import { prisma } from "@/lib/db";
import { longDate, t12 } from "@/lib/constants";
import { nextSunday } from "@/lib/dates";
import { firstName, normalizePhone } from "@/lib/phone";
import { bookLeg, cancelRiderDay } from "@/lib/trips";
import { notifyCancelled, notifyNewRequest, quietly } from "@/lib/notify";

// Automated ride line (Twilio Programmable Voice).
// Point the Twilio number's "A call comes in" webhook (HTTP POST) at  /api/voice/incoming.
// The caller is recognised by caller ID, so their registered address is used automatically.
//
//  incoming -> menu (1 both / 2 to only / 3 home only / 9 cancel / 0 call me back)
//           -> arrive (1=9am 2=10am 3=11am)  -> home (1=1pm 2=2pm 3=3pm 4=4pm) -> booked

const ARRIVE: Record<string, string> = { "1": "09:00", "2": "10:00", "3": "11:00" };
const LEAVE: Record<string, string> = { "1": "13:00", "2": "14:00", "3": "15:00", "4": "16:00" };
const VOICE = `voice="Polly.Aditi" language="en-IN"`;

const xmlEsc = (s: string) =>
  s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c] as string);
const say = (text: string) => `<Say ${VOICE}>${xmlEsc(text)}</Say>`;
const pause = (s = 1) => `<Pause length="${s}"/>`;

function twiml(inner: string) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`, {
    headers: { "Content-Type": "text/xml" },
  });
}

function gather(action: string, prompt: string, retryText = "Sorry, we didn't hear a choice.") {
  return twiml(
    `<Gather input="dtmf" numDigits="1" timeout="8" action="${xmlEsc(action)}" method="POST">${say(prompt)}</Gather>` +
      say(retryText) +
      `<Redirect method="POST">${xmlEsc(action.replace(/\/api\/voice\/\w+/, "/api/voice/incoming"))}</Redirect>`
  );
}

const goodbye = (text: string) => twiml(say(text) + pause() + say("Waheguru ji ka Khalsa, Waheguru ji ki Fateh.") + "<Hangup/>");

/** Verify the request really came from Twilio (skipped if TWILIO_AUTH_TOKEN isn't set). */
function validTwilio(req: Request, params: Record<string, string>): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return true;
  const sig = req.headers.get("x-twilio-signature") || "";
  const u = new URL(req.url);
  const base = process.env.PUBLIC_BASE_URL ? process.env.PUBLIC_BASE_URL.replace(/\/$/, "") + u.pathname + u.search : req.url;
  const data = base + Object.keys(params).sort().map((k) => k + params[k]).join("");
  const expected = crypto.createHmac("sha1", token).update(data).digest("base64");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: Request, { params }: { params: { step: string } }) {
  const form = await req.formData();
  const p: Record<string, string> = {};
  form.forEach((v, k) => (p[k] = String(v)));
  if (!validTwilio(req, p)) return new Response("Forbidden", { status: 403 });

  const url = new URL(req.url);
  const q = url.searchParams;
  const digits = p.Digits || "";
  const phone = normalizePhone(p.From || "");
  const date = nextSunday();
  const when = longDate(date);
  const link = (step: string, extra: Record<string, string> = {}) => {
    const sp = new URLSearchParams(extra);
    const qs = sp.toString();
    return `/api/voice/${step}${qs ? "?" + qs : ""}`;
  };

  const rider = phone ? await prisma.rider.findUnique({ where: { phone } }) : null;

  if (!rider || rider.status === "INACTIVE") {
    if (params.step === "incoming") {
      await prisma.callbackRequest.create({ data: { phone: phone || p.From || "unknown", reason: "Unregistered caller" } });
    }
    return goodbye(
      "Sat Sri Akal. Thank you for calling Sangat Rides at Revesby Gurdwara. This phone number is not registered for rides yet. A volunteer will call you back soon to set it up."
    );
  }

  const name = firstName(rider.name);

  switch (params.step) {
    case "incoming":
      return gather(
        link("menu"),
        `Sat Sri Akal ${name} ji. This is Sangat Rides from Revesby Gurdwara, for ${when}. ` +
          "Press 1 for a ride to the Gurdwara and back home. " +
          "Press 2 for a ride to the Gurdwara only. " +
          "Press 3 for a ride home only. " +
          "Press 9 to cancel your rides. " +
          "Press 0 and a volunteer will call you back."
      );

    case "menu":
      if (digits === "1" || digits === "2") return arrivePrompt(digits === "1" ? "both" : "to");
      if (digits === "3") return homePrompt("");
      if (digits === "9") {
        const cancelled = await cancelRiderDay(rider.id, date);
        // The rider heard the confirmation, so only drivers who had these rides are told.
        for (const t of cancelled.filter((x) => x.driver)) {
          await quietly(
            notifyCancelled(
              { date: t.date, leg: t.leg, time: t.time, riderName: t.rider.name, riderPhone: t.rider.phone, driver: { name: t.driver!.name, email: t.driver!.email } },
              { textRider: false }
            )
          );
        }
        return goodbye(cancelled.length ? `Your rides for ${when} are cancelled.` : `You had no rides booked for ${when}.`);
      }
      if (digits === "0") {
        await prisma.callbackRequest.create({ data: { phone, reason: `Asked for a call back (${rider.name})` } });
        return goodbye("Thank you. A volunteer will call you back soon.");
      }
      return twiml(say("Sorry, that is not one of the choices.") + `<Redirect method="POST">${link("incoming")}</Redirect>`);

    case "arrive": {
      const legs = q.get("legs") || "to";
      const arrive = ARRIVE[digits];
      if (!arrive) return arrivePrompt(legs, "Sorry, please choose 1, 2 or 3.");
      if (legs === "both") return homePrompt(arrive);
      const b = await bookLeg({ riderId: rider.id, date, leg: "TO", time: arrive, channel: "VOICE" });
      if (b.result === "new") await quietly(notifyNewRequest([b.tripId]));
      return goodbye(`Thank you. You are booked to arrive at the Gurdwara by ${t12(arrive)} on ${when}. A volunteer driver will call you before pickup.`);
    }

    case "home": {
      const arriveParam = q.get("arrive") || "";
      const arrive = Object.values(ARRIVE).includes(arriveParam) ? arriveParam : "";
      const leave = LEAVE[digits];
      if (!leave) return homePrompt(arrive, "Sorry, please choose 1, 2, 3 or 4.");
      const booked: Awaited<ReturnType<typeof bookLeg>>[] = [];
      if (arrive) booked.push(await bookLeg({ riderId: rider.id, date, leg: "TO", time: arrive, channel: "VOICE" }));
      booked.push(await bookLeg({ riderId: rider.id, date, leg: "FROM", time: leave, channel: "VOICE" }));
      await quietly(notifyNewRequest(booked.filter((x) => x.result === "new").map((x) => x.tripId)));
      const msg = arrive
        ? `Thank you. You are booked to arrive at the Gurdwara by ${t12(arrive)}, and to go home at ${t12(leave)}, on ${when}.`
        : `Thank you. You are booked to go home from the Gurdwara at ${t12(leave)} on ${when}.`;
      return goodbye(msg + " A volunteer driver will call you before pickup.");
    }

    default:
      return twiml(`<Redirect method="POST">${link("incoming")}</Redirect>`);
  }

  function arrivePrompt(legs: string, prefix = "") {
    return gather(
      link("arrive", { legs }),
      `${prefix} What time would you like to arrive at the Gurdwara? Press 1 for 9 am. Press 2 for 10 am. Press 3 for 11 am.`
    );
  }
  function homePrompt(arrive: string, prefix = "") {
    return gather(
      link("home", arrive ? { arrive } : {}),
      `${prefix} What time would you like to go home? Press 1 for 1 pm. Press 2 for 2 pm. Press 3 for 3 pm. Press 4 for 4 pm.`
    );
  }
}
