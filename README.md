# Sangat Rides

Sunday lifts to and from **Sri Guru Singh Sabha, Revesby** for elderly Sangat, by volunteer drivers.

- **Arrive** at the Gurdwara 9:00 am – 12:00 pm, **leave** 1:00 – 4:00 pm.
- Riders book by **phone** (a volunteer answers, or the automated Twilio line books from their registered address) or **online**.
- Drivers see open rides sorted by how far off their own route to the Gurdwara each pickup is.

Stack: Next.js 14 (App Router, TypeScript, Tailwind) · Prisma 5 · PostgreSQL on Neon · Netlify.

## Pages

| Page | Who | What it does |
|---|---|---|
| `/` | Public | Ride line number, request online, volunteer sign-in |
| `/request` | Riders | Phone number lookup (shows first name only), one-time registration, pick Sunday and times |
| `/login` | Volunteers | Drivers: phone + PIN. Coordinator / phone desk: shared password |
| `/driver` | Drivers | My rides (address + phone revealed after taking a ride), open rides by detour, status buttons |
| `/desk` | Coordinator | Find caller, book in two taps, day's bookings, assign driver, cancel, call-back list |
| `/admin` | Coordinator | Riders (check new self-registrations), drivers (set/reset PINs), settings |

## Ride status

`REQUESTED → CLAIMED → ONBOARD → DONE`, or `CANCELLED`.

Every change is a conditional database update, so two drivers can never take the same ride. There is one trip per rider, per leg, per Sunday (`@@unique([date, riderId, leg])`), so a repeat booking just updates the time.

## Deploy (Neon + Netlify)

1. **Neon:** create a project (region: AWS Sydney `ap-southeast-2`) and a database `sangatrides`. Copy both connection strings:
   - **Pooled** → `DATABASE_URL` (add `&pgbouncer=true`)
   - **Direct** → `DIRECT_URL`
2. **GitHub:** create a repo (e.g. `sangat-rides`) and push this folder:
   ```bash
   git init && git add . && git commit -m "Sangat Rides v1"
   git branch -M main
   git remote add origin https://github.com/<you>/sangat-rides.git
   git push -u origin main
   ```
3. **Netlify:** Add new site → Import from Git → pick the repo. Build settings come from `netlify.toml`.
4. **Netlify environment variables** (Site configuration → Environment variables). See `.env.example` for the full list:
   - `DATABASE_URL`, `DIRECT_URL`
   - `SESSION_SECRET`: run `openssl rand -base64 32`
   - `ADMIN_PASSWORD`: the coordinator / phone-desk password
   - `PUBLIC_BASE_URL`: e.g. `https://sangatrides.netlify.app`
5. **Deploy.** The build runs `prisma db push`, which creates the tables in Neon on the first deploy.
6. **First use:**
   - Sign in at `/login` → Coordinator.
   - Under People & settings, add the ride-line number and your drivers, each with a home suburb and a PIN.
   - Give each driver their PIN in person.

### Run locally

```bash
cp .env.example .env   # fill in your Neon strings and secrets
npm install
npx prisma db push
npm run dev            # http://localhost:3000
```

## Notifications (Brevo)

| When | Who | How |
|---|---|---|
| A rider books (online, phone desk or phone line) | Drivers whose route passes within ~10 km of the rider's suburb, plus the coordinator | Email |
| A driver takes a ride, or the coordinator assigns one | The rider: "Your ride … is with Aman. They will call before pickup." | SMS |
| The coordinator cancels a ride | The rider (SMS) and the driver who had it (email) | SMS + email |
| A rider cancels on the phone line | The driver who had it | Email |
| Every Saturday, 6 pm Sydney (summer time) | All drivers with an email, plus the coordinator: rides still needing a driver, nearest first | Email |

Driver emails never include a rider's address. They show only first name, initial and suburb, and the driver signs in to see the full details.

Setup:
1. In Brevo, go to **SMTP & API → API keys** and generate a key.
2. Under **Senders, Domains & Dedicated IPs → Senders**, verify the email address the messages will come from.
3. In Netlify, add these environment variables:
   - `BREVO_API_KEY`
   - `BREVO_SENDER_EMAIL`
   - `BREVO_SENDER_NAME` (optional)
   - `CRON_SECRET` (run `openssl rand -base64 24`)
4. Redeploy.
5. In the app, open **People & settings**:
   - Add the coordinator's email.
   - Add an email address to each driver.
   - Use **Email drivers the rides still needing a driver** to send a test.
6. **Text messages:** buy SMS credits in Brevo, then set `BREVO_SMS_ENABLED=true` and redeploy. Until then, nothing is texted and nothing is charged.

The Saturday reminder is a Netlify Scheduled Function in `netlify/functions/saturday-digest.mts`, set to `0 7 * * 6` UTC. That is 6 pm in summer (AEDT) and 5 pm in winter (AEST).

If a send fails, it is logged in Netlify's function logs. The booking itself still goes through.

## Optional: automated phone line (Twilio)

When an elderly rider calls, the line recognises their caller ID and books from their registered address:

> "Sat Sri Akal Gurdial ji… Press 1 for a ride to the Gurdwara and back home, 2 to the Gurdwara only, 3 home only, 9 to cancel, 0 for a volunteer to call you back."
>
> → "Press 1 for 9 am, 2 for 10 am, 3 for 11 am" → "Press 1 for 1 pm … 4 for 4 pm" → spoken confirmation.

Unknown numbers, and anyone who presses 0, appear on the phone desk under **Please call back**.

Setup:
1. Buy an Australian mobile number in Twilio. Australian numbers need a regulatory bundle with an address. Cost is roughly a few dollars a month plus per-minute charges; check Twilio's current pricing.
2. On the number, set **A call comes in** → Webhook → `https://<your-site>/api/voice/incoming` (HTTP POST).
3. Set `TWILIO_AUTH_TOKEN` in Netlify, so the site only accepts genuine Twilio requests.
4. Put the Twilio number in Settings as the ride line.

The voice uses Amazon Polly "Aditi" (Indian English).

## Privacy

- Rider addresses and phone numbers are shown only to the coordinator, and to the one driver who has taken that rider's ride.
- The public request page never shows an address. A phone lookup returns the first name and upcoming bookings only.
- Self-registered riders are marked **New** until a volunteer checks their details.
- Before going live, the committee should agree on:
  - driver checks (licence, Working With Children Check)
  - insurance
  - how rider details are stored and who can see them

## Not yet included (mobile phase)

- Push notifications to drivers' phones. Email alerts exist now; push needs the mobile app.
- Street-level routing and maps
- Attendance reports
- Punjabi-language voice prompts
