import { prisma } from "@/lib/db";
import { fail, ok, requireRole } from "@/lib/http";

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  if (!requireRole("admin")) return fail("Coordinator sign-in needed.", 401);
  await prisma.callbackRequest.update({ where: { id: params.id }, data: { handled: true } });
  return ok({ ok: true });
}
