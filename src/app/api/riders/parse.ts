import { LANGUAGES, NEEDS } from "@/lib/constants";
import { SUBURBS } from "@/lib/geo";
import { str } from "@/lib/http";
import { isValidPhone, normalizePhone } from "@/lib/phone";

export function parseRider(body: Record<string, unknown> | null):
  | { data: { name: string; phone: string; address: string; suburb: string; language: string; needs: string; notes: string; status: string } }
  | { error: string } {
  if (!body) return { error: "Invalid request" };
  const name = str(body.name, 80);
  const rawPhone = str(body.phone);
  const address = str(body.address, 160);
  const suburb = str(body.suburb, 60);
  if (!name || !address || !suburb) return { error: "Name, street address and suburb are required." };
  if (!isValidPhone(rawPhone)) return { error: "Enter a full Australian phone number." };
  if (suburb !== "Other" && !SUBURBS[suburb]) return { error: "Choose a suburb from the list." };
  const language = (LANGUAGES as readonly string[]).includes(str(body.language)) ? str(body.language) : "Punjabi";
  const needs = (Array.isArray(body.needs) ? body.needs : [])
    .map(String)
    .filter((n) => (NEEDS as readonly string[]).includes(n))
    .join(",");
  const status = ["NEW", "ACTIVE", "INACTIVE"].includes(str(body.status)) ? str(body.status) : "ACTIVE";
  return { data: { name, phone: normalizePhone(rawPhone), address, suburb, language, needs, notes: str(body.notes, 300), status } };
}
