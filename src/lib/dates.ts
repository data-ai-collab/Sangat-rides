// Sunday maths in Sydney time, regardless of where the server runs.

const fmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Australia/Sydney",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's date in Sydney as YYYY-MM-DD. */
export function sydneyToday(now = new Date()): string {
  return fmt.format(now); // en-CA formats as YYYY-MM-DD
}

function addDays(ymd: string, days: number): string {
  const d = new Date(ymd + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The next `n` Sundays, starting today if today is Sunday. */
export function upcomingSundays(n = 4, now = new Date()): string[] {
  const today = sydneyToday(now);
  const dow = new Date(today + "T00:00:00Z").getUTCDay();
  const first = addDays(today, (7 - dow) % 7);
  return Array.from({ length: n }, (_, i) => addDays(first, i * 7));
}

export function nextSunday(now = new Date()): string {
  return upcomingSundays(1, now)[0];
}

export function isBookableSunday(date: string): boolean {
  return upcomingSundays(4).includes(date);
}
