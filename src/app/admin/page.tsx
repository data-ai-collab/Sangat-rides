import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Admin } from "./Admin";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  const s = getSession();
  if (!s || s.role !== "admin") redirect("/login");
  return <Admin />;
}
