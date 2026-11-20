import { prisma } from "@/lib/db";
import { fail, ok, requireRole } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!requireRole("admin")) return fail("Coordinator sign-in needed.", 401);
  const callbacks = await prisma.callbackRequest.findMany({
    where: { handled: false },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
  return ok({ callbacks });
}
