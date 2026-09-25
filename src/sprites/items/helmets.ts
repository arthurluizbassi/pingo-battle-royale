import type { HelmetArt, PixelLayer } from "../types";

/**
 * Helmet sprites. `mirror: "even"` rows are LEFT HALVES centered on the head (x 19.5):
 * a half of length L starts at x = 20 - L. Head reference: tip y9, y12 half 5, y13 half 7,
 * y14 half 8, y15-16 half 9, y17+ half 10. Eyes at y17..19, mouth at y22.
 */
const r = (row: string, times = 1) => Array<string>(times).fill(row);
const sym = (y: number, rows: string[]): PixelLayer => ({ y, rows, mirror: "even" });

export const HELMET_ART: Record<string, HelmetArt> = {
  pot_helmet: {
    layers: [
      sym(6, [
        "kkkkkk", "kxxxxxx", "kxwxxxx", "kxwxxxx", "kkkxxxxxx", "k.kxxxxxx", "kkkxxxxxx", ".kXXXXXXX", ".kkkkkkkk",
      ]),
    ],
  },
  traffic_cone: {
    layers: [
      sym(1, [
        "k", "ko", "koo", "kwww", "kwwww", "kooooo", "koooooo", "kwwwwwww", "kwwwwwwww", "kooooooooo",
        "kkkkkkkkkkkk", "kooooooooooo", "kkkkkkkkkkkk",
      ]),
    ],
  },
  construction_helmet: {
    layers: [
      sym(6, [
        "kkkk", "kkyyyY", "kyywyyY", "kywyyyyY", "kyyyyyyyY", "kyyyyyyyyY",
        "kkkkkkkkkkkk", "kyyyyyyyyyyy", "kkkkkkkkkkkk",
      ]),
    ],
  },
  knight_bucket: {
    layers: [
      sym(4, ["...kkk", "..k...", ".k...."]),
      sym(7, [
        "kkkkkkkk", "kxwxxxxx", "kxwxxxxxx", "kxwxxxxxxx", "kxxxXxxxxx", ...r("kxxxxxxxxx", 5),
        "kxxkkkkxxx", "kxxxxxxxxx", "kXXXXXXXXX", "kkkkkkkkkk",
      ]),
    ],
  },
  viking_helmet: {
    layers: [
      sym(5, [
        "kk.........", "kwk........", "kwwk.......", ".kwwk....kk", "..kwwk.kkxx", "...kwkxwxxx",
        "....kxwxxxx", "...kxxxxxxx", "..kYyYyYyYy", "..kkkkkkkkk",
      ]),
    ],
  },
  astronaut_helmet: {
    layers: [
      sym(5, [
        "........kkkk", "......kkwwww", ".....kwwwwww", "....kwwWwwww", "...kwwwwwwww", "..kwwwwwwwww",
        ".kwwwwwwwwww", ".kwwwwwwwwww", ".kwwkkkkkkkk", ...r(".kwk........", 6), ".kwwkkkkkkkk", ".kkkkkkkkkkk",
      ]),
      { x: 14, y: 14, rows: ["cc", "c."] },
      { x: 23, y: 1, rows: ["r", "k", "k", "k"] },
    ],
  },

  grandma_beanie: {
    layers: [
      sym(4, [
        "kk", "kww", "kwW", "kkkkkk", "krrrrrr", "kwwwwwww", "krrrrrrrr", "krrrrrrrr",
        "kkkkkkkkkk", "kRrRrRrRrR", "kRrRrRrRrR", "kkkkkkkkkk",
      ]),
    ],
  },
  watermelon_helmet: {
    layers: [
      sym(6, [
        "kkkkk", "kkeEeEe", "keEeEeEe", "keEeEeEeE", "keEeEeEeEe", "keEeEeEeEe", "kwwwwwwwwww", "krrkrrrkrrr",
        "kkkkkkkkkkk",
      ]),
    ],
  },
  chef_hat: {
    layers: [
      sym(2, [
        "..kkk", "..kkwww", ".kwwwwWw", "kwwwwwwWw", "kwwwWwwww", "kwwwwwwWw", ".kwwwwwww", "kwwwwwww",
        "kwWwWwWw", "kwWwWwWw", "kwWwWwWw", "kkkkkkkkk", "kwwwwwwww", "kkkkkkkkk",
      ]),
    ],
  },
  pumpkin_head: {
    layers: [
      sym(4, ["E", "E"]),
      sym(6, [
        "kkkkkk", "kkoooNoo", "koooNooNo", "kooNooNooo", "koNooNoooo", "koyyyoNooo", "kooyooNooo",
        "koNooNoooo", "kooyyyyyyy", "kooyoyyoyy", "kNoooNoooo", "kNoooNooo", "kkkkkkkk",
      ]),
    ],
  },
  beehive_wig: {
    layers: [
      sym(1, [
        "kkk", "kbbb", "kbbcb", "kbcbb", "kbbbcb", "kbcbbb", "kbbbcbb", "kbcbbbb", "kbbbbcbb", "kbbcbbbbb",
        "kbbbbbcbbb", "kbcbbbbbbb", "kbbbkkkkkk", "kbbk......", "kbbk......", "kbk.......",
      ]),
      { x: 23, y: 3, rows: [".ww.", "ykyk", ".yy."] },
    ],
  },
  ice_cream_cone: {
    layers: [
      sym(0, [
        "k", "kn", "knN", "knNn", "kNnNn", "knNnNn", "kNnNnNn", "kkkkkkkk", "kppppwppp", "kppwpppppp",
        "kpppppppPp", "kppppppppp", "kPpPppPpPp", "kkPkkkkPkk", "..k....k..",
      ]),
      { x: 19, y: 0, rows: ["rr"] },
    ],
  },

  bike_helmet: {
    layers: [
      sym(7, [
        "kkkkkk", "kkbbbbbb", "kbbkbbkbb", "kbcbkbbkbb", "kbbbbbbbbb", "kkbbbbbbbbb", "kBBBBBBBBBB", "kkkkkkkkkkk",
      ]),
      sym(15, r("k........", 6)),
    ],
  },
  tinfoil_hat: {
    layers: [
      sym(2, ["k", "kx", "kxW", "kxwx", "kWxxw", "kxxWxx", "kwxxxWx", "kxWxxwxx", "kxxxWxxxw", "kxwxxxWxxx", "kkxkkxkkkk"]),
    ],
  },
  miner_helmet: {
    layers: [
      sym(7, [
        "kkkkkk", "kkyyyyyy", "kyyyyyyyy", "kyyyyyyyyy", "kyyyyyyyyy", "kkkkkkkkkkk", "kYYYYYYYYYY", "kkkkkkkkkkk",
      ]),
      { x: 17, y: 8, rows: [".kkkk.", "kwwwwk", "kwyywk", "kwwwwk", ".kkkk."] },
    ],
  },
  football_helmet: {
    layers: [
      sym(6, [
        "kkkkkk", "kkrrrrrw", "krrrrrrrw", "krrrrrrrrw", "krrrrrrrrw", "krrrrrrrrrw", "krrrrrrrrrw",
        "krrrkkkkkkk", "krrk.......", "krrk.......", "krrkXXXXXXX", ...r("krrkX......", 4), ".kkkXXXXXXX",
      ]),
    ],
  },
  fishbowl: {
    layers: [
      sym(1, [
        "kkkkk", "k...", "kk....", "k......", "k.......", "kccccccc", "kcccccccc", "kcccccccc", "kcccccccc",
        "kcccccccc", "kccccccc", "kkkkkkk",
      ]),
      { x: 16, y: 8, rows: [".ooo.o", "okooo.", ".ooo.o"] },
      { x: 22, y: 3, rows: ["w", ".", "w"] },
      { x: 13, y: 6, rows: ["w", "w"] },
    ],
  },
  fencing_mask: {
    layers: [
      sym(6, [
        "..kkkkk", ".kwwwwww", "kwwwwwwww", "kwwwwwwwww", "kwwwwwwwww", "kwwkkkkkkk",
        "kwkGkGkGkG", "kwkkGkGkGk", "kwkGkGkGkG", "kwkkGkGkGk", "kwkGkGkGkG", "kwkkGkGkGk",
        "kwkGkGkGkG", "kwkkGkGkGk", "kwkGkGkGkG", "kwwkkkkkkk",
      ]),
    ],
  },

  backwards_cap: {
    layers: [
      sym(7, ["kkkkkk", "kkeeeeee", "keeeeeeee", "keeeeeeeee", "keeeeeeeee", "kkkkkkkkkk"]),
      { x: 4, y: 11, rows: ["kkkkkk", "kEEEEE", "kkkkkk"] },
      { x: 19, y: 6, rows: ["kk"] },
    ],
  },
  ninja_headband: {
    layers: [
      sym(13, ["kkkkkkkk", "krrrrrrr", "kRRRRRRRR", "kkkkkkkkk"]),
      { x: 3, y: 13, rows: ["..kkkkkkk", "kkrrrrrrk", "krRkkkkk.", "kk......."] },
      { x: 18, y: 14, rows: ["xxxx"] },
    ],
  },
  suspicious_cap: {
    layers: [
      sym(8, [
        "kkkkkk", "kkGGGGGG", "kGGGGGGGG", "kGGGGGGGGG", "kGGGGGGGGG", "kGGGGGGGGG", "kkkkkkkkkk",
        "kGGGGGGGGGGG", "kkkkkkkkkkkk",
      ]),
      { x: 18, y: 9, rows: [".ww.", "...w", "..w.", "....", "..w."] },
    ],
  },
  propeller_cap: {
    layers: [
      { x: 13, y: 3, rows: ["kkkkkkkkkkkkkk", "krrrrrkkyyyyyk", "kkkkkkkkkkkkkk", "......kk......"] },
      sym(7, ["kkkkkk", "kkrrryyy", "krrrryyyy", "krrrrryyyy", "krrrrryyyy", "kkkkkkkkkk", "kbbbbbbbbb", "kkkkkkkkkk"]),
    ],
  },
  winged_helmet: {
    layers: [
      sym(8, ["kkkkkk", "kkxxxxxx", "kxwxxxxxx", "kxxxxxxxxx", "kxxxxxxxxx", "kYYYYYYYYY", "kkkkkkkkkk"]),
      sym(6, [
        "k................", "kwk..............", "kwwk.............", "kwwwkk...........",
        ".kwwwwk..........", "..kwwwk..........", "...kkkk..........",
      ]),
    ],
  },
  racing_helmet: {
    layers: [
      sym(6, [
        "kkkkkk", "kkrrrrrw", "krrrrrrrw", "krrrrrrrrw", "krrrrrrrrw", "krrrrrrrrrw", "krrrrrrrrrw",
        "krrrrrrrrrw", "krrrrrrrrrr", "krrkkkkkkkk", "krkBcBBBBBB", "krkBBcBBBBB", "krkBBBBBBBB",
        "krkkkkkkkkk", "krrrrrrrrrr", ".kkkkkkkkkk",
      ]),
    ],
  },

  paper_crown: {
    layers: [sym(8, ["y...y...y", "yy.yyy.yy", "yyyyyyyyy", "yryyyyryy", "YYYYYYYYY"])],
  },
  birthday_hat: {
    layers: [
      sym(1, [
        "kk", "kww", "kp", "kpp", "kppb", "kpbp", "kpppp", "kpbpp", "kppppb", "kpppbp", "kpbpppp", "kkkkkkk",
      ]),
      sym(13, r("k.......", 8)),
    ],
  },
  pirate_hat: {
    layers: [
      sym(7, [
        "kk......kk", "kGk....kGG", "kGGk.kkGGG", "kGGGkGGGGG", "kGGGGGGGGGG", "kGGGGGGGGGG", "kYYYYYYYYYY",
        "kkkkkkkkkkk",
      ]),
      { x: 17, y: 9, rows: [".www.", "wkwkw", "wwwww", ".w.w."] },
    ],
  },
  wizard_hat: {
    layers: [
      sym(3, [
        "kv", "kv", "kvv", "kvV", "kvvv", "kvvv", "kvvvv", "kvvvv", "kyyyyy", "kvvvvv",
        "kkkkkkkkkkkk", "kVVVVVVVVVVV", "kkkkkkkkkkkk",
      ]),
      { x: 20, y: 0, rows: ["...kk", "..kvk", ".kvk."] },
      { x: 16, y: 8, rows: ["y"] },
      { x: 22, y: 10, rows: ["y"] },
      { x: 19, y: 6, rows: ["w"] },
    ],
  },
  vr_headset: {
    layers: [
      sym(8, r("kG", 7)),
      sym(15, ["kkkkkkkkkkk", "kGGGGGGGGGG", "kGGcccccGGG", "kGGcwcccGGG", "kGGGGGGGGGG", "kkkkkkkkkkk"]),
    ],
  },
  graduation_cap: {
    layers: [
      sym(7, ["kkkkkkkk", "kkGGGGGGGG", "kkGGGGGGGGGG", "kkkkkkkkkkkk", "kGGGGGGG", "kGGGGGGG", "kkkkkkkk"]),
      { x: 19, y: 8, rows: ["yy"] },
      { x: 27, y: 9, rows: ["k.", "y.", "y.", "y.", "yy", "Yy"] },
    ],
  },
};
