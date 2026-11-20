/** Normalise an Australian phone number to digits, e.g. "+61 412 345 678" -> "0412345678". */
export function normalizePhone(input: string): string {
  let d = String(input || "").replace(/\D/g, "");
  if (d.startsWith("61") && d.length === 11) d = "0" + d.slice(2);
  if (d.length === 9 && /^[2-478]/.test(d)) d = "0" + d;
  return d;
}

export function isValidPhone(input: string): boolean {
  const d = normalizePhone(input);
  return /^0[2-478]\d{8}$/.test(d);
}

/** "0412345678" -> "0412 345 678", landlines "0297001234" -> "02 9700 1234". */
export function formatPhone(input: string): string {
  const d = normalizePhone(input);
  if (/^04\d{8}$/.test(d)) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  if (/^0\d{9}$/.test(d)) return `${d.slice(0, 2)} ${d.slice(2, 6)} ${d.slice(6)}`;
  return input;
}

export function firstName(name: string): string {
  return String(name || "").trim().split(/\s+/)[0] || "";
}
