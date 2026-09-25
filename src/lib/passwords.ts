import { randomInt } from "node:crypto";

const WORDS = [
  "sapo", "pingo", "nuvem", "bolha", "trovao", "pixel", "cometa", "pipoca", "tatu", "foguete",
  "gelatina", "coruja", "melancia", "abacaxi", "dragao", "panda", "biscoito", "robo", "lagarta", "vulcao",
];

/** Easy to dictate in class, e.g. "pipoca-cometa-4821". Students can change it on first login. */
export function generateTempPassword(): string {
  const a = WORDS[randomInt(WORDS.length)];
  let b = WORDS[randomInt(WORDS.length)];
  while (b === a) b = WORDS[randomInt(WORDS.length)];
  return `${a}-${b}-${String(randomInt(10000)).padStart(4, "0")}`;
}
