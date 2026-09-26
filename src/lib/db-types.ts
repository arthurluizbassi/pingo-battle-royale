/** Row shapes of the tables we read. Kept by hand: small schema, easy to follow. */
import type { ItemCategory } from "@/content/items";
import type { Stats, SpecialEffect } from "@/engine";
import type { PingoLook } from "@/sprites/compose";

export type Role = "student" | "teacher";

export interface ProfileRow {
  id: string;
  class_id: string;
  username: string;
  display_name: string;
  role: Role;
  active: boolean;
  /** signed up with the class code, waiting for the teacher's approval */
  pending: boolean;
  must_change_password: boolean;
  created_at: string;
}

export interface PingoRow {
  id: string;
  owner_id: string;
  name: string;
  body_color: string;
  eyes: string;
  mouth: string;
  detail: string;
}

export interface ClassRow {
  id: string;
  name: string;
  shop_rotation_days: number;
  shop_items_per_category: number;
  shop_auto_rotate: boolean;
  join_code: string | null;
  join_enabled: boolean;
}

export type TxType = "activity" | "admin_adjustment" | "purchase" | "special_reward";

export interface TransactionRow {
  id: string;
  owner_id: string;
  amount: number;
  type: TxType;
  reason: string;
  balance_after: number;
  item_id: string | null;
  batch_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface EquippedRow {
  owner_id: string;
  slot: ItemCategory;
  item_id: string;
}

export interface RotationRow {
  id: string;
  class_id: string;
  item_ids: string[];
  mode: "auto" | "manual";
  starts_at: string;
  ends_at: string | null;
}

export interface SeasonRow {
  id: string;
  class_id: string;
  name: string;
  active: boolean;
  starts_at: string;
  ends_at: string | null;
}

export type BattleStatus = "scheduled" | "locked" | "finished" | "cancelled";

export interface BattleRow {
  id: string;
  class_id: string;
  season_id: string | null;
  number: number;
  name: string;
  scheduled_at: string | null;
  prize_text: string | null;
  status: BattleStatus;
  seed: number | null;
  engine_version: string | null;
  balance_snapshot: unknown;
  winner_id: string | null;
  summary: BattleSummary | null;
  locked_at: string | null;
  finished_at: string | null;
  created_at: string;
}

/** Frozen at LOCK LOADOUTS. Never recomputed from current equipment. */
export interface ParticipantSnapshot {
  profileId: string;
  username: string;
  displayName: string;
  pingoName: string;
  look: PingoLook;
  items: Array<{
    id: string;
    name: string;
    category: ItemCategory;
    sprite: string;
    statModifiers: Partial<Stats>;
    specialEffect: SpecialEffect | null;
  }>;
  stats: Stats;
  effects: SpecialEffect[];
  powerScore: number;
}

export interface ParticipantRow {
  battle_id: string;
  profile_id: string;
  snapshot: ParticipantSnapshot | null;
  power_score: number | null;
  placement: number | null;
  kills: number | null;
  attacks: number | null;
  hits: number | null;
  crits: number | null;
  dodges: number | null;
  blocks: number | null;
  damage_dealt: number | null;
  damage_taken: number | null;
  biggest_hit: number | null;
  eliminated_by: string | null;
}

export interface FunStat {
  emoji: string;
  title: string;
  profileId: string;
  text: string;
}

export interface BattleSummary {
  participants: number;
  ticks: number;
  suddenDeath: boolean;
  totalCrits: number;
  totalDodges: number;
  funStats: FunStat[];
}

export interface TrophyRow {
  id: string;
  profile_id: string;
  battle_id: string | null;
  season_id: string | null;
  kind: "champion" | "runner_up" | "third" | "top_eliminator" | "season_champion";
  label: string;
  created_at: string;
}
