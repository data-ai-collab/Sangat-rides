import { prisma } from "@/lib/db";
import { checkAdminPassword, rateLimited, setSession, verifyPin } from "@/lib/auth";
import { clientIp, fail, ok, readJson, str } from "@/lib/http";
import { normalizePhone } from "@/lib/phone";

export async function POST(req: Request) {
  if (rateLimited("login:" + clientIp(req), 12)) return fail("Too many attempts. Wait 10 minutes and try again.", 429);
  const body = await readJson(req);
  if (!body) return fail("Invalid request");

  if (body.kind === "admin") {
    if (!checkAdminPassword(str(body.password))) return fail("That password isn't right.", 401);
    setSession("admin");
    return ok({ role: "admin", next: "/desk" });
  }

  const phone = normalizePhone(str(body.phone));
  const pin = str(body.pin, 12);
  const driver = await prisma.driver.findUnique({ where: { phone } });
  if (!driver || !driver.active || !verifyPin(pin, driver.pinHash)) {
    return fail("Phone number or PIN isn't right. Ask the coordinator to reset your PIN.", 401);
  }
  setSession("driver", driver.id);
  return ok({ role: "driver", next: "/driver" });
}
