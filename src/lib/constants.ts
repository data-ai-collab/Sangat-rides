// Shared by server and browser code.

/** Arrival slots at the Gurdwara (critical window 9am–12pm). */
export const TO_TIMES = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00"] as const;
/** Departure slots from the Gurdwara (critical window 1pm–4pm). */
export const FROM_TIMES = ["13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00"] as const;

export const NEEDS = ["Walker", "Folding wheelchair", "Help with steps", "Hard of hearing", "Front seat only"] as const;
export const LANGUAGES = ["Punjabi", "Hindi", "English"] as const;

export type Leg = "TO" | "FROM";
export type TripStatus = "REQUESTED" | "CLAIMED" | "ONBOARD" | "DONE" | "CANCELLED";
export type Channel = "DESK" | "APP" | "VOICE";

export const STATUS_LABEL: Record<TripStatus, string> = {
  REQUESTED: "Needs driver",
  CLAIMED: "Driver booked",
  ONBOARD: "On the way",
  DONE: "Dropped off",
  CANCELLED: "Cancelled",
};

export const STATUS_STYLE: Record<TripStatus, string> = {
  REQUESTED: "bg-amber-100 text-amber-800",
  CLAIMED: "bg-blue-100 text-blue-800",
  ONBOARD: "bg-kesri-50 text-kesri-600",
  DONE: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export const STATUS_BORDER: Record<TripStatus, string> = {
  REQUESTED: "border-l-amber-500",
  CLAIMED: "border-l-blue-600",
  ONBOARD: "border-l-kesri",
  DONE: "border-l-emerald-600",
  CANCELLED: "border-l-gray-300",
};

export function t12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

export function labelDate(ymd: string): string {
  return new Date(ymd + "T00:00:00Z").toLocaleDateString("en-AU", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function longDate(ymd: string): string {
  return new Date(ymd + "T00:00:00Z").toLocaleDateString("en-AU", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
