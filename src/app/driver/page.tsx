import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { upcomingSundays } from "@/lib/dates";
import { DriverBoard } from "./DriverBoard";

export const dynamic = "force-dynamic";

export default function DriverPage() {
  const s = getSession();
  if (!s || s.role !== "driver") redirect("/login");
  return <DriverBoard sundays={upcomingSundays(4)} />;
}
