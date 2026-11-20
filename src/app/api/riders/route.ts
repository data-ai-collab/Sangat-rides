import { prisma } from "@/lib/db";
import { fail, ok, readJson, requireRole } from "@/lib/http";
import { riderDTO } from "@/lib/serialize";
import { parseRider } from "./parse";

export const dynamic = "force-dynamic";

// GET /api/riders?q=  — coordinator search by name or phone (empty q = everyone).
export async function GET(req: Request) {
  if (!requireRole("admin")) return fail("Coordinator sign-in needed.", 401);
  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  const digits = q.replace(/\D/g, "");
  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
        ],
      }
    : {};
  const riders = await prisma.rider.findMany({ where, orderBy: { name: "asc" }, take: q ? 15 : 500 });
  return ok({ riders: riders.map(riderDTO) });
}

export async function POST(req: Request) {
  if (!requireRole("admin")) return fail("Coordinator sign-in needed.", 401);
  const parsed = parseRider(await readJson(req));
  if ("error" in parsed) return fail(parsed.error);
  const exists = await prisma.rider.findUnique({ where: { phone: parsed.data.phone } });
  if (exists) return fail(`${exists.name} is already registered with this phone number.`, 409);
  const rider = await prisma.rider.create({ data: { ...parsed.data, createdVia: "DESK" } });
  return ok({ rider: riderDTO(rider) }, 201);
}
