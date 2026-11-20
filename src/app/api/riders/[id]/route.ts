import { prisma } from "@/lib/db";
import { fail, ok, readJson, requireRole } from "@/lib/http";
import { riderDTO } from "@/lib/serialize";
import { parseRider } from "../parse";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!requireRole("admin")) return fail("Coordinator sign-in needed.", 401);
  const parsed = parseRider(await readJson(req));
  if ("error" in parsed) return fail(parsed.error);
  const clash = await prisma.rider.findUnique({ where: { phone: parsed.data.phone } });
  if (clash && clash.id !== params.id) return fail(`${clash.name} already uses this phone number.`, 409);
  const rider = await prisma.rider.update({ where: { id: params.id }, data: parsed.data });
  return ok({ rider: riderDTO(rider) });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!requireRole("admin")) return fail("Coordinator sign-in needed.", 401);
  await prisma.rider.delete({ where: { id: params.id } });
  return ok({ ok: true });
}
