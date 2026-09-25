import { ALL_ITEMS, buildFromItems, type ItemCategory } from "@/content/items";
import { createRng, simulateBattle } from "@/engine";
import type { ReplayParticipant } from "@/components/arena/ArenaReplay";
import { summarizeBattle } from "./battle-summary";
import type { ParticipantSnapshot } from "./db-types";
import { powerScore } from "@/engine";
import { DETAIL_STYLES, EYE_STYLES, MOUTH_STYLES } from "@/sprites/data/face";
import { BODY_COLORS } from "@/sprites/palette";
import type { PingoLook } from "@/sprites/compose";

const NAMES = [
  "Ana", "Bruno", "Carla", "Davi", "Elisa", "Felipe", "Gabi", "Heitor", "Isa", "João",
  "Kaio", "Lara", "Miguel", "Nina", "Otávio", "Paula", "Rafa", "Sofia", "Theo", "Vitória",
  "Yuri", "Zeca", "Bia", "Léo", "Malu", "Pedro", "Rita", "Tom", "Vivi", "Zoe",
];
const PINGO_NAMES = [
  "Gotinha", "Trovão", "Bolinha", "Pudim", "Faísca", "Jujuba", "Tsunami", "Paçoca", "Pixel", "Nuvem",
  "Chiclete", "Rex", "Mingau", "Turbo", "Biscoito", "Cometa", "Tofu", "Bolhinha", "Zumbi", "Farofa",
  "Sushi", "Pipoca", "Brigadeiro", "Nhoque", "Pastel", "Coxinha", "Churros", "Quindim", "Tapioca", "Bombom",
];

/** A fake class battle (no database) for demos and visual tests. */
export function demoBattle(seed: number, count = 14) {
  const rng = createRng(seed);
  const pick = <T,>(list: readonly T[]) => rng.pick(list);
  const snapshots: ParticipantSnapshot[] = [];
  const participants: ReplayParticipant[] = [];

  for (let i = 0; i < count; i++) {
    const look: PingoLook = {
      bodyColor: pick(Object.keys(BODY_COLORS)) as PingoLook["bodyColor"],
      eyes: pick(Object.keys(EYE_STYLES)) as PingoLook["eyes"],
      mouth: pick(Object.keys(MOUTH_STYLES)) as PingoLook["mouth"],
      detail: pick(Object.keys(DETAIL_STYLES)) as PingoLook["detail"],
    };
    // some students did every activity, some did none
    const budget = rng.int(0, 3);
    const items = (["weapon", "helmet", "outfit"] as ItemCategory[])
      .slice(0, budget)
      .map((cat) => pick(ALL_ITEMS.filter((it) => it.category === cat)));
    const { stats, effects } = buildFromItems(items);
    const id = `demo-${i}`;
    const gear = Object.fromEntries(items.map((it) => [it.category, it.sprite]));
    snapshots.push({
      profileId: id,
      username: NAMES[i % NAMES.length].toLowerCase(),
      displayName: NAMES[i % NAMES.length],
      pingoName: PINGO_NAMES[i % PINGO_NAMES.length],
      look,
      items: items.map((it) => ({ ...it })),
      stats,
      effects,
      powerScore: powerScore(stats, effects),
    });
    participants.push({
      id,
      pingoName: PINGO_NAMES[i % PINGO_NAMES.length],
      displayName: NAMES[i % NAMES.length],
      look,
      gear,
      items: items.map((it) => ({ id: it.id, name: it.name, category: it.category, sprite: it.sprite })),
    });
  }

  const result = simulateBattle({
    seed,
    participants: snapshots.map((s) => ({ id: s.profileId, name: s.pingoName, stats: s.stats, effects: s.effects })),
  });
  return { participants, result, summary: summarizeBattle(result, snapshots) };
}
