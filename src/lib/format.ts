import { BALANCE, type SpecialEffect, type StatKey } from "@/engine";

export const STAT_LABEL: Record<StatKey, string> = {
  hp: "HP",
  atk: "ATK",
  def: "DEF",
  spd: "VEL",
  crit: "CRIT",
  dodge: "ESQ",
};

export const STAT_NAME: Record<StatKey, string> = {
  hp: "Vida",
  atk: "Ataque",
  def: "Defesa",
  spd: "Velocidade",
  crit: "Chance de crítico",
  dodge: "Chance de esquiva",
};

const isPercent = (key: StatKey) => key === "crit" || key === "dodge";

export function formatStat(key: StatKey, value: number): string {
  return isPercent(key) ? `${Math.round(value * 100)}%` : String(Math.round(value));
}

export function formatModifier(key: StatKey, value: number): string {
  const sign = value > 0 ? "+" : "";
  return isPercent(key) ? `${sign}${Math.round(value * 100)}% ${STAT_LABEL[key]}` : `${sign}${value} ${STAT_LABEL[key]}`;
}

export function effectDescription(effect: SpecialEffect): string {
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  switch (effect.type) {
    case "firstStrike":
      return `Primeiro ataque da batalha causa +${pct(effect.value)} de dano.`;
    case "openingGuard":
      return `O primeiro golpe recebido causa ${pct(effect.value)} menos dano.`;
    case "adrenaline":
      return `+${effect.value} VEL quando o HP fica abaixo de ${pct(BALANCE.effects.adrenalineHpThreshold)}.`;
    case "block":
      return `${pct(effect.value)} de chance de bloquear ${pct(BALANCE.effects.blockReduction)} de um golpe.`;
    case "chaos":
      return `Dano caótico: cada golpe causa entre ${pct(1 - effect.value)} e ${pct(1 + effect.value)} do normal.`;
    case "critDamage":
      return `Críticos causam +${pct(effect.value)} de dano extra.`;
    case "critShield":
      return `Críticos recebidos causam ${pct(effect.value)} menos dano extra.`;
  }
}

export const EFFECT_NAME: Record<SpecialEffect["type"], string> = {
  firstStrike: "Golpe de abertura",
  openingGuard: "Guarda inicial",
  adrenaline: "Adrenalina",
  block: "Bloqueio",
  chaos: "Caos",
  critDamage: "Crítico devastador",
  critShield: "Anti-crítico",
};

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export function formatDateTime(iso: string | null | undefined): string {
  return iso ? dateFmt.format(new Date(iso)) : "—";
}

export function formatCoins(amount: number): string {
  return new Intl.NumberFormat("pt-BR").format(amount);
}
