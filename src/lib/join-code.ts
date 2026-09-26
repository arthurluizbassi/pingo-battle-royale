/** Class join codes: 6 characters, no look-alikes (no 0/O, 1/I/L), shown as "PINGO-XXXXXX". */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const JOIN_PREFIX = "PINGO-";

export function generateJoinCode(randomInt: (max: number) => number): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

/** Accepts what a student might type: "pingo-k4q9mz", " K4Q 9MZ ", "PINGO K4Q9MZ" → "K4Q9MZ". */
export function normalizeJoinCode(input: string): string {
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return cleaned.startsWith("PINGO") ? cleaned.slice(5) : cleaned;
}

export function displayJoinCode(code: string | null): string {
  return code ? `${JOIN_PREFIX}${code}` : "—";
}

/** "Ana Júlia Souza" → "ana.julia" (suggestion only; the student can edit it) */
export function suggestUsername(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join(".")
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 32);
}
