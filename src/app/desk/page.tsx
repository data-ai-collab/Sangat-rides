import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { upcomingSundays } from "@/lib/dates";
import { getSettings } from "@/lib/settings";
import { Desk } from "./Desk";

export const dynamic = "force-dynamic";

export default async function DeskPage() {
  const s = getSession();
  if (!s || s.role !== "admin") redirect("/login");
  const { rideLine } = await getSettings();
  return <Desk sundays={upcomingSundays(4)} rideLine={rideLine} />;
}
