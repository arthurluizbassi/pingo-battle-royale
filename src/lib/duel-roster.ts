import { ALL_ITEMS, buildFromItems, getItem, loadoutItems, type ItemCategory, type Loadout } from "@/content/items";
import { createRng, type SpecialEffect, type Stats } from "@/engine";
import type { DuelFighter } from "@/game/duel/DuelScene";
import type { PingoLook } from "@/sprites/compose";
import { DETAIL_STYLES, EYE_STYLES, MOUTH_STYLES } from "@/sprites/data/face";
import { BODY_COLORS } from "@/sprites/palette";
import type { PingoRow, ProfileRow } from "./db-types";
import { NEW_PROGRESS, statsWithLevel, type Progress } from "./levels";
import { lookFromPingo } from "./snapshot";

/** Everything a duel needs about one Pingo: how it looks and how it fights. */
export interface DuelEntrant {
  fighter: DuelFighter;
  stats: Stats;
  effects: SpecialEffect[];
}

export function entrantFrom(
  profile: Pick<ProfileRow, "id" | "display_name">,
  pingo: PingoRow | null,
  loadout: Loadout,
  progress: Progress = NEW_PROGRESS,
): DuelEntrant {
  const items = loadoutItems(loadout);
  const { effects } = buildFromItems(items);
  const stats = statsWithLevel(items.map((i) => i.statModifiers), progress.statPoints);
  const sprite = (cat: ItemCategory) => getItem(loadout[cat])?.sprite ?? null;
  return {
    fighter: {
      id: profile.id,
      pingoName: pingo?.name ?? profile.display_name,
      displayName: profile.display_name,
      look: lookFromPingo(pingo),
      gear: { weapon: sprite("weapon"), helmet: sprite("helmet"), outfit: sprite("outfit") },
      level: progress.level,
    },
    stats,
    effects,
  };
}

const NAMES = ["Ana", "Bruno", "Carla", "Davi", "Elisa", "Felipe", "Gabi", "Heitor", "Isa", "João", "Lara", "Miguel", "Nina"];
const PINGO_NAMES = ["Gotinha", "Trovão", "Bolinha", "Pudim", "Faísca", "Jujuba", "Tsunami", "Paçoca", "Pixel", "Nuvem", "Chiclete", "Rex", "Mingau"];

/** A fake class (no database) to preview duels. `weapon` forces the first Pingo's weapon. */
export function demoRoster(seed: number, weapon?: string): DuelEntrant[] {
  const rng = createRng(seed);
  return NAMES.map((name, i) => {
    const look: PingoLook = {
      bodyColor: rng.pick(Object.keys(BODY_COLORS)) as PingoLook["bodyColor"],
      eyes: rng.pick(Object.keys(EYE_STYLES)) as PingoLook["eyes"],
      mouth: rng.pick(Object.keys(MOUTH_STYLES)) as PingoLook["mouth"],
      detail: rng.pick(Object.keys(DETAIL_STYLES)) as PingoLook["detail"],
    };
    const loadout: Loadout = { weapon: null, helmet: null, outfit: null };
    for (const cat of ["weapon", "helmet", "outfit"] as const) {
      if (cat === "weapon" || rng.chance(0.7)) loadout[cat] = rng.pick(ALL_ITEMS.filter((it) => it.category === cat)).id;
    }
    if (i === 0 && weapon) loadout.weapon = weapon === "none" ? null : weapon;
    const entrant = entrantFrom({ id: `demo-${i}`, display_name: name }, null, loadout);
    entrant.fighter.pingoName = PINGO_NAMES[i];
    entrant.fighter.look = look;
    entrant.fighter.level = 1 + rng.int(0, 6);
    return entrant;
  });
}
