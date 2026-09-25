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

  /** Students log in with a username; Supabase Auth needs an e-mail, so we derive one. */
  auth: {
    usernameEmailDomain: "alunos.pingo.local",
  },
} as const;

export type ItemTier = keyof typeof GAME.priceByTier;
