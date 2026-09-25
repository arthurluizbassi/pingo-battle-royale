import type { WeaponArt } from "../types";

/**
 * Weapon sprites. Rows without `x` are centered on the hand axis (x = 32),
 * so odd-width rows are symmetric around the grip. The hand is at y 23..26.
 * Palette keys: see src/sprites/palette.ts
 */
const r = (row: string, times = 1) => Array<string>(times).fill(row);

export const WEAPON_ART: Record<string, WeaponArt> = {
  cardboard_sword: {
    layers: [
      {
        y: 4,
        rows: [
          "k", "knk", ...r("kwnNk", 3), "kwWWk", ...r("kwnNk", 3), "kwWWk", ...r("kwnNk", 4),
          "kkkkkkkkk", "knnnnnnnk", "kkkkkkkkk", ...r("kmk", 5), "knnnk", "kkkkk",
        ],
      },
    ],
  },
  ruler_katana: {
    layers: [
      {
        y: 3,
        rows: [
          "k", "kyk", "kyyyk", "kkyyk", "kyyyk", "kkyyk", "kyyyk", "kkkyk", "kyyyk", "kkyyk",
          "kyyyk", "kkyyk", "kyyyk", "kkkyk", "kyyyk", "kkyyk", "kyyyk",
          "kkkkkkk", "kXXXXXk", "kkkkkkk", "kBk", "kwk", "kBk", "kwk", "kBk", "kwk", "kkk",
        ],
      },
    ],
  },
  mechanical_keyboard: {
    layers: [
      {
        y: 10,
        rows: [
          "kkkkkkk", "kwwGwwk", "kGGGGGk", "kwwGwwk", "kGGGGGk", "kccGwwk", "kGGGGGk", "kwwGppk",
          "kGGGGGk", "kwwGyyk", "kGGGGGk", "kwwGwwk", "kGGGGGk", "kwwwwwk", "kGGGGGk", "kkkkkkk",
          "k", "k", ".kk", "..k",
        ],
      },
    ],
  },
  battle_umbrella: {
    layers: [
      {
        y: 3,
        rows: [
          "k", "k", "krk", "krk", "krrrk", "krRrk", ...r("krrRrrk", 5), "krRrk", "kwwwk", "krk", ...r("kXk", 8),
        ],
      },
      { x: 28, y: 27, rows: ["...kmk", "kk.kmk", "kmkkmk", "kmmmmk", ".kkkk."] },
    ],
  },
  selfie_stick: {
    layers: [
      {
        y: 2,
        rows: ["kkkkk", "kccck", "kcwck", "kccck", "kccck", "kccck", "kkkkk", "kXk", ...r("kxk", 13), ...r("kGk", 5), "kkk"],
      },
    ],
  },

  sofa_leg: {
    layers: [
      {
        y: 8,
        rows: [
          "kkkkkkk", "knnnNmk", "kkkkkkk", "knNmk", "knnNNmk", "knnNNmk", "knNmk", "knNmk",
          "knnNNmk", "knnNNmk", "knnNNmk", "knNmk", ...r("kNk", 7), "knNmk", "kkkkk",
        ],
      },
    ],
  },
  fair_mallet: {
    layers: [
      {
        y: 5,
        rows: ["kkkkkkkkkkk", ...r("krrwwrwwrrk", 4), "kRRWWRWWRRk", "kkkkkkkkkkk", ...r("kNk", 16), "kkk"],
      },
    ],
  },
  frozen_fish: {
    layers: [
      {
        y: 7,
        rows: [
          "kkk", "kcwck", "kckcwck", "kcccwck", "kbbccck", "kcccwck", "kccccck", "kcwccck",
          "kccccck", "kcccwck", "kccccck", "kbcccbk", "kbcbk", ...r("kbk", 6), "kbbbk", "kbbwbbk", "kkk.kkk",
        ],
      },
    ],
  },
  wifi_hammer: {
    layers: [
      { y: 2, rows: [".ccccc.", "c.....c", "..ccc..", ".c...c.", "...c..."] },
      {
        y: 8,
        rows: ["kkkkkkkkk", "kwxxxxxXk", "kxxxxxxXk", "kxxxxxxXk", "kXXXXXXXk", "kkkkkkkkk", ...r("kNk", 14), "kkk"],
      },
    ],
  },
  aquarium_anchor: {
    layers: [
      {
        y: 21,
        rows: [
          ".kkk.", "kX.Xk", ".kXk.", "kXk", "kXk", "kkkkkkkkk", "kXXXXXXXk", "kkkkXkkkk",
          ...r("kXk", 4), "kk.kXk.kk", "kXk.kXk.kXk", "kXXkkXkkXXk", ".kXXXXXXXk.", "..kkkkkkk..",
        ],
      },
    ],
  },

  plastic_dagger: {
    layers: [
      { y: 14, rows: ["k", "kpk", ...r("kwpPk", 5), "kkkkkkk", "kyyyyyk", "kkkkkkk", ...r("kbk", 4), "kyk", "kkk"] },
    ],
  },
  ninja_chopsticks: {
    layers: [
      { y: 6, rows: [".k...k.", "knk.knk", ...r("knk.knk", 17), "kRk.kRk", "kRk.kRk", "kkk.kkk"] },
    ],
  },
  sharp_spinner: {
    layers: [
      {
        y: 9,
        rows: [
          ".....x.....", "....kkk....", "...kbbbk...", "...kbwbk...", "...kbbbk...", "....kbk....",
          "....kxk....", ".xkkkxkkkx.", "kbbbkXkbbbk", "kbwbk.kbwbk", "kbbbk.kbbbk", ".kkk...kkk.",
          "...........", "kxk",
        ],
      },
    ],
  },
  lightning_yoyo: {
    layers: [
      { y: 27, rows: ["k", "k"] },
      { y: 29, rows: [".kkkkk.", "kyyyByk", "kyyByyk", "kyBBByk", "kyyByyk", "kyByyyk", ".kkkkk."] },
      { x: 36, y: 30, rows: ["W", ".", "W", ".", "W"] },
    ],
  },
  bbq_skewer: {
    layers: [
      {
        y: 3,
        rows: [
          "k", "x", "kkkkk", "kNNmk", "kNmmk", "kkkkk", "x", "kkkkk", "kllek", "klEek", "kkkkk", "x",
          "kkkkk", "krrRk", "krRRk", "kkkkk", "x", "kkkkk", "kwwWk", "kWWWk", "kkkkk", ...r("kNk", 4), "kkk",
        ],
      },
    ],
  },

  sharpened_pencil: {
    layers: [
      {
        y: 3,
        rows: ["k", "kGk", "knk", "knnnk", ...r("kwyYk", 14), "kxxxk", "kXxXk", "kpppk", "kpppk", "kPPPk", "kkkkk"],
      },
    ],
  },
  geometry_compass: {
    layers: [
      {
        y: 4,
        rows: [
          "k.......y", "k.......y", "X.......X", ".X.....X.", ".X.....X.", ".X.....X.", "..X...X..",
          "..X...X..", "..X...X..", "..X...X..", "...X.X...", "...X.X...", "...X.X...", "...kXk...",
          "...kxk...", "...kXk...", "....k....", ...r("kGk", 6), "kkk",
        ],
      },
    ],
  },
  pet_cactus: {
    layers: [
      {
        y: 6,
        rows: [
          "..p..", ".pyp.", "kkpkk", "klwEk", "wkleEkw", "klwEk", "kleEk", "wkleEkw", "klwEk", "kleEk",
          "wkleEkw", "klwEk", "kkkkkkk", "kooooNk", "kkkkkkk", "kooNk", "kooNk", "kooNk", "kkkkk",
        ],
      },
    ],
  },
  party_laser_sword: {
    layers: [
      { y: 3, rows: ["c", ...r("cwc", 16), "kkkkk", "kXrXk", ...r("kGk", 5), "kkk"] },
      { x: 35, y: 6, rows: [".y.", "yyy", ".y."] },
      { x: 28, y: 13, rows: ["y"] },
      { x: 35, y: 17, rows: ["p"] },
    ],
  },
  prompt_wand: {
    layers: [
      { y: 5, rows: ["kkkkkkk", "klGGGGk", "kGlGGGk", "klGllGk", "kkkkkkk", ...r("kVk", 17), "kyk", "kkk"] },
      { x: 36, y: 2, rows: [".y.", "yyy", ".y."] },
      { x: 27, y: 4, rows: ["y"] },
      { x: 37, y: 9, rows: ["w"] },
    ],
  },

  pot_lid: {
    layers: [
      {
        y: 11,
        rows: [
          "...kkkkk...", ".kkxxxxxkk.", ".kxwwxxxXk.", "kxwxxkxxxXk", "kxxxkGkxxXk", "kxxxxkxxxXk",
          ".kxxxxxxXk.", ".kkXXXXXkk.", "...kkkkk...",
        ],
      },
      { y: 20, rows: ["kXk", "kXk", "kXk"] },
    ],
  },
  pool_noodle: {
    layers: [
      { y: 2, rows: ["kkkkk", "koGok", "kkkkk", ...r("kwlek", 2), "keeek", ...r("kwlek", 2), "keeek", ...r("kwlek", 2), "keeek", ...r("kwlek", 2), "keeek", ...r("kwlek", 2), "keeek", ...r("kwlek", 2), "keeek", ...r("kwlek", 2), "keeek", ...r("kwlek", 2), "kkkkk"] },
    ],
  },
  coffee_broom: {
    layers: [
      {
        y: 3,
        rows: [
          "Y.y.Y.y.Y", "yYyYyYyYy", "yYyYyYyYy", "kyYyYyYyk", ".kyYyYyk.", ".kyYyYyk.", ".krrrrrk.",
          "..kkkkk..", ...r("kNk", 17), "kkk",
        ],
      },
    ],
  },
  door_shield: {
    layers: [
      {
        y: 8,
        rows: [
          "kkkkkkkkk", "knnnnnnnk", "knkkkkknk", "knkNNNknk", "knkNNNknk", "knkNNNknk", "knkkkkknk",
          "knnnnnnnk", "knnnnnYnk", "knkkkkknk", "knkNNNknk", "knkNNNknk", "knkkkkknk", "knnnnnnnk", "kkkkkkkkk",
        ],
      },
    ],
  },
  thick_book: {
    layers: [
      {
        y: 10,
        rows: [
          "kkkkkkkkk", "kRrrrrkwk", "kRrrrrkWk", "kRyyyykwk", "kRrrrrkWk", "kRryyrkwk", "kRrrrrkWk",
          "kRrrrrkwk", "kRrrrrkWk", "kRyyyykwk", "kRrrrrkWk", "kRrrrrkwk", "kkkkkkkkk",
        ],
      },
    ],
  },

  rubber_chicken: {
    layers: [
      {
        y: 5,
        rows: [
          "...rr..", "..krrk.", ".kyyyk.", ".kykyko", ".kyyyoo", ".kyyyk.", "..kyk..", "..kyk..",
          ".kyyyk.", "kyyyyyk", "kyYyyyk", "kyYyyyk", "kyYyyyk", "kyyyyyk", ".kyyyk.", "..kyk..",
          ...r("..kok..", 6), ".kook..",
        ],
      },
    ],
  },
  ballistic_flipflop: {
    layers: [
      {
        y: 8,
        rows: [
          ".kkkkk.", "kelllek", "kellwek", "kelwlek", "kewllek", "kwlllwk", "kelllek", "kelllek",
          "kelllek", "kelllek", "kelllek", "kelllek", "kelllek", "kelllek", ".keeek.", "..kkk..",
        ],
      },
      { x: 36, y: 10, rows: ["W.", ".W", "W.", "..", "W.", ".W"] },
    ],
  },
  clown_horn: {
    layers: [
      {
        y: 8,
        rows: [
          "kkkkkkk", "kyyyyYk", ".kyyYk.", "..kyk..", ...r("kyk", 8), "kYk",
          ".kkkkk.", "krwrrrk", "krwrrRk", "krrrrRk", "krrrrRk", "kRrrRRk", ".kkkkk.",
        ],
      },
      { x: 36, y: 5, rows: ["..W", "W..", "..W"] },
      { x: 26, y: 5, rows: ["W..", "..W", "W.."] },
    ],
  },
  d20: {
    layers: [
      {
        y: 11,
        rows: [
          "....kkk....", "..kkwWwkk..", ".kwwWwWwwk.", ".kwWwwwWwk.", "kwWwrwrwWwk", "kwWwrwrwWwk",
          "kWwwwwwwwWk", ".kWWWWWWWk.", ".kwWwwwWwk.", "..kkwWwkk..", "....kkk....",
        ],
      },
    ],
  },
  universal_remote: {
    layers: [
      { y: 3, rows: ["c...c", ".c.c.", "..c.."] },
      {
        y: 8,
        rows: [
          "kkkkk", "kGrGk", "kGGGk", "kbGbk", "kGGGk", "kwGwk", "kwGwk", "kGGGk", "klGyk", "kGGGk",
          "kwGwk", "kwGwk", "kGGGk", ...r("kGGGk", 5), "kkkkk",
        ],
      },
    ],
  },
};
