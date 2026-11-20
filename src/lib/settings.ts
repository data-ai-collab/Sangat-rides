import { prisma } from "./db";

export type Settings = { rideLine: string; coordinator: string; coordinatorEmail: string };

export async function getSettings(): Promise<Settings> {
  try {
    const rows = await prisma.setting.findMany();
    const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return { rideLine: m.rideLine || "", coordinator: m.coordinator || "", coordinatorEmail: m.coordinatorEmail || "" };
  } catch {
    return { rideLine: "", coordinator: "", coordinatorEmail: "" };
  }
}
