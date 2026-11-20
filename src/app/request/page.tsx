import { upcomingSundays } from "@/lib/dates";
import { getSettings } from "@/lib/settings";
import { RequestForm } from "./RequestForm";

export const dynamic = "force-dynamic";

export default async function RequestPage() {
  const { rideLine } = await getSettings();
  return <RequestForm sundays={upcomingSundays(4)} rideLine={rideLine} />;
}
