/**
 * Economy & product settings. Combat numbers live in src/engine/balance.ts.
 * See GAME_BALANCE.md.
 */
export const GAME = {
  currency: {
    name: "PingoCoins",
    short: "PC",
  },

  /** Items are priced by tier. Higher tier = a bit stronger and/or more interesting, never "+50 ATK". */
  priceByTier: {
    1: 80,
    2: 150,
    3: 240,
    4: 360,
  } as Record<1 | 2 | 3 | 4, number>,

  rewards: {
    /** default value suggested in the teacher's batch distribution form */
    defaultActivity: 100,
    maxSingleGrant: 5000,
  },

  shop: {
    itemsPerCategory: 5,
    rotationDays: 7,
  },

  /**
   * Season ranking. Winning gives glory (points, trophies, badges) — NEVER coins or stats,
   * so last week's champion is not automatically stronger this week.
   */
  season: {
    pointsByPlacement: [10, 7, 5, 4, 3],
    participationPoints: 1,
    pointsPerKill: 1,
  },

  /**
   * Duels and levels. Numbers chosen with `npx tsx scripts/simulate-levels.ts` (see GAME_BALANCE.md):
   * an active student reaches the max level in ~6 weeks; a max-level, well-equipped Pingo beats
   * a naked level-1 one ~92% of the time; any single stat is as good as a mixed build.
   */
  duels: {
    xpWin: 30,
    xpLoss: 20,
    /** duels per day that give XP (after that: friendly duels, no XP) */
    dailyXpDuels: 12,
    /** anti-spam: a duel takes ~25 s to watch anyway */
    minSecondsBetween: 8,
    /** matchmaking ("meio" rule): weight = exp(-|Δlevel| / levelWidth) */
    levelWidth: 5,
    maxPerOpponentPerDay: 2,
    avoidLastOpponents: 5,
    /**
     * Daily trophies (Clash-style, see GAME_BALANCE.md §12): everyone starts the day at `start`;
     * a duel is worth `k` trophies, split by the trophy gap (`scale` = gap where the favourite
     * is expected to win ~10 of 11). Only the challenger's trophies move. Floor: zero.
     */
    trophies: {
      start: 1000,
      k: 60,
      scale: 400,
      /** duels in the day needed to be on the podium (and get its coins) */
      minDuelsForPodium: 5,
    },
  },

  levels: {
    max: 20,
    pointsPerLevel: 1,
    /** total XP to reach the max level; each level costs a bit more than the previous one */
    totalXp: 12_000,
    /** what ONE upgrade gives (crit/dodge as fractions) and how many points it costs */
    upgrades: {
      hp: { value: 2, cost: 1 },
      atk: { value: 1, cost: 1 },
      def: { value: 1, cost: 1 },
      spd: { value: 1, cost: 3 },
      crit: { value: 0.015, cost: 1 },
      dodge: { value: 0.015, cost: 1 },
    },
  },

  /** Students log in with a username; Supabase Auth needs an e-mail, so we derive one. */
  auth: {
    usernameEmailDomain: "alunos.pingo.local",
  },
} as const;

export type ItemTier = keyof typeof GAME.priceByTier;
