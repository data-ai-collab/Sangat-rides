// Netlify Scheduled Function: every Saturday at 6 pm Sydney time, email drivers the rides
// that still need a driver for Sunday. Schedules are in UTC: 07:00 UTC Saturday is 6 pm AEDT
// (summer) and 5 pm AEST (winter).

export default async () => {
  const base = (process.env.URL || process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
  const res = await fetch(`${base}/api/notify/digest`, {
    method: "POST",
    headers: { "x-cron-secret": process.env.CRON_SECRET || "" },
  });
  console.log("Saturday digest:", res.status, await res.text());
};

export const config = { schedule: "0 7 * * 6" };
