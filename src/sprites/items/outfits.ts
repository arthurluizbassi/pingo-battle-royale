import type { OutfitArt } from "../types";

/**
 * Outfit sprites. `rows` paint the body interior from y = top (default 24).
 * Rows are 20 wide (x 10..29) or, with `mirror: true`, left halves of 10.
 * '.' = fill color, '_' = keep body color, other keys = that color.
 */
const r = (row: string, times = 1) => Array<string>(times).fill(row);

export const OUTFIT_ART: Record<string, OutfitArt> = {
  bathrobe: {
    fill: "w",
    mirror: true,
    rows: [".....W____", "......W___", ".......W__", "........W_", ".........W", "pppppppppp", ".........p", ".........p"],
  },
  flannel_pajamas: {
    fill: "b",
    mirror: true,
    rows: ["...c....c.", "...c....c.", "cccccccccc", "...c....c.", "...c....c.", "...c....c.", "cccccccccc", "...c....c.", "...c....c.", "...c....c."],
  },
  puffer_jacket: {
    fill: "o",
    mirror: true,
    rows: [".........W", "NNNNNNNNNW", ".........W", "NNNNNNNNNW", ".........W", "NNNNNNNNNW", ".........W", "NNNNNNNNNW", ".........W", "NNNNNNNNNN"],
    front: [{ y: 25, mirror: "even", rows: ["k..........", "", "k..........", "", "k..........", "", "k.........."] }],
  },
  pool_float: {
    fill: null,
    front: [
      { y: 27, mirror: "even", rows: ["kkkkkkkkkkkk", "kyyyyyyyyyyy", "kYYYYYYYYYYY", "kkkkkkkkkkkk"] },
      { x: 3, y: 22, rows: [".kkk..", "kyyyk.", "kykyoo", "kyyyk.", ".kyyk."] },
    ],
  },
  dinosaur_costume: {
    fill: "e",
    mirror: true,
    rows: ["..........", ".....yyyyy", "....yyyyyy", "....YYYYYY", "....yyyyyy", "....yyyyyy", "....YYYYYY", "....yyyyyy", ".....yyyyy"],
    back: [{ x: 0, y: 27, rows: ["......kkkk", "..kkkkeeek", "kkEeeeeek.", "keeeeekk..", "kkkkkk...."] }],
    front: [{ y: 22, mirror: "even", rows: ["..........", "kl........", "kk........"] }],
  },
  mascot_costume: {
    fill: "N",
    mirror: true,
    rows: ["..........", "......nnnn", ".....nnnnn", ".....nnnnn", ".....nnnnn", ".....nnnnn", ".....nnnnn", "......nnnn"],
    front: [
      { x: 18, y: 26, rows: [".yy.", "yyyy", ".yy.", "y..y"] },
      { y: 25, mirror: "even", rows: ["N..........", "", "", "N..........", "", "", "N.........."] },
    ],
  },

  pe_tracksuit: {
    fill: "b",
    mirror: true,
    rows: [...r(".ww......W", 6), ...r(".ww.......", 4)],
  },
  sprinter_uniform: {
    fill: "r",
    sleeves: null,
    rows: [
      "....................", "....................", ".....wwwwwwwwww.....", ".....wwkkkkwwww.....",
      ".....wwwwwkwwww.....", ".....wwwwkwwwww.....", ".....wwwkwwwwww.....", "BBBBBBBBBBBBBBBBBBBB",
      "BBBBBBBBBBBBBBBBBBBB", "BBBBBBBBBBBBBBBBBBBB",
    ],
  },
  delivery_uniform: {
    fill: "r",
    mirror: true,
    rows: [".......www", "..........", "..........", "..........", "yyyyyyyyyy"],
    back: [
      {
        x: 0,
        y: 16,
        rows: ["kkkkkkkkk", "krrrrrrrk", "krrrrrrrk", "krryyyrrk", "kryrrryrk", "krryyyrrk", "krrrrrrrk", "krrrrrrrk", "kRRRRRRRk", "kkkkkkkkk"],
      },
    ],
  },
  superhero_cape: {
    fill: "b",
    back: [
      {
        y: 21,
        mirror: "even",
        rows: ["kkkkkkkkkkk", ...r("krrrrrrrrrrr", 8), ...r("krrrrrrrrrrrr", 6), "kRRRRRRRRRRRR", "kkkkkkkkkkkkk"],
      },
    ],
    front: [{ x: 17, y: 25, rows: ["..kk..", ".kyyk.", "kyrryk", ".kyyk.", "..kk.."] }],
  },
  racing_suit: {
    fill: "w",
    mirror: true,
    rows: r(".k......rr", 10),
    front: [
      { x: 12, y: 27, rows: ["yyy", "yoy"] },
      { x: 24, y: 30, rows: ["cc", "cc"] },
    ],
  },
  ninja_suit: {
    fill: "G",
    mirror: true,
    rows: [".kk.......", "...kk.....", ".....kk...", ".......kk.", "........kk", "rrrrrrrrrr", "........rr", "........r."],
    front: [{ x: 22, y: 30, rows: [".rr", "r.."] }],
  },

  cardboard_armor: {
    fill: "n",
    mirror: true,
    rows: ["NNNNNNNNNN", "........WW", "........WW", "...k....WW", "..kkk...WW", "...k....WW", "...k....WW", "........WW", "NNNNNNNNWW", "........WW"],
    front: [{ y: 22, mirror: "even", rows: ["kkkk.......", "knnk......."] }],
  },
  cushion_vest: {
    fill: "p",
    sleeves: null,
    mirror: true,
    rows: [".........P", "..P....P.P", ".........P", ".........P", "WWWWWWWWWW", ".........P", "..P....P.P", ".........P", ".........P", ".........P"],
  },
  goalie_gear: {
    fill: "w",
    sleeves: "b",
    mirror: true,
    rows: ["BBBBBBBBBB", "bbbbbbbbbb", "bbbbbbbbbb", "BBBBBBBBBB", "bbbbbbbbbb", "bbbbbbbbbb", "BBBBBBBBBB"],
    front: [{ x: 18, y: 26, rows: ["wwww", ".ww.", ".ww.", "wwww"] }],
  },
  bubble_wrap: {
    fill: null,
    rows: [
      "ww..ww..ww..ww..ww..", "wW..wW..wW..wW..wW..", "..ww..ww..ww..ww..ww", "..wW..wW..wW..wW..wW",
      "ww..ww..ww..ww..ww..", "wW..wW..wW..wW..wW..", "..ww..ww..ww..ww..ww", "..wW..wW..wW..wW..wW",
      "ww..ww..ww..ww..ww..", "wW..wW..wW..wW..wW..",
    ],
  },
  tin_armor: {
    fill: "x",
    sleeves: "X",
    mirror: true,
    rows: ["XXXXXXXXXX", ".w........", ".w..k.....", ".w........", "XXXXXXXXXX", "..........", "..k.......", "XXXXXXXXXX"],
    front: [{ y: 22, mirror: "even", rows: ["kkkk........", "kxxxk.......", "kXXXk......."] }],
  },
  turtle_shell: {
    fill: "y",
    sleeves: null,
    mirror: true,
    rows: [".........Y", ".........Y", "YYYYYYYYYY", ".........Y", ".........Y", "YYYYYYYYYY", ".........Y", ".........Y", "YYYYYYYYYY", ".........Y"],
    back: [
      {
        y: 17,
        mirror: "even",
        rows: ["kkkkkkkkkkk", "keEeEeEeEeEe", ...r("kEeeeEeeeEeee", 7), ...r("keeEeeeEeeeEe", 7), "kEEEEEEEEEEE", "kkkkkkkkkkk"],
      },
    ],
  },

  banana_suit: {
    fill: "y",
    rows: [
      "....................", ".Y................Y.", ".Y....N...........Y.", ".Y..........N.....Y.",
      ".Y................Y.", ".Y...N............Y.", ".Y.........N......Y.", ".Y................Y.",
      ".Y.....N..........Y.",
    ],
    front: [{ y: 33, mirror: "even", rows: ["..kyk.....", "..kyk.....", "...k......"] }],
  },
  wetsuit: {
    fill: "B",
    mirror: true,
    rows: [...r(".cc......y", 5), ...r(".cc.......", 5)],
    front: [{ y: 35, mirror: "even", rows: ["kkkkkkkk..", "kccccccck.", "kkkkkkkkk."] }],
  },
  hacker_hoodie: {
    fill: "G",
    mirror: true,
    rows: [".......w..", ".......w..", ".......w..", ".......k..", "..........", "...kkkkkkk", "...k......", "...k......", "...kkkkkkk"],
    front: [{ x: 12, y: 25, rows: ["l...", ".l..", "l.ll"] }],
  },
  disco_outfit: {
    fill: "v",
    mirror: true,
    rows: [".VVVV..___", "..VVV...__", "...VV....w", ".y......w.", "....w.....", "..y.......", "......y...", ".w........", "....y....."],
  },
  bush_camouflage: {
    fill: "e",
    rows: [
      "lE.l..E.lE..l.E..lE.", ".lE..lE..E.lE..l.E.l", "E..lE..lE..E..lE..E.", ".l..E.l..lE.l..E.l..",
      "lE..l..E..l..E..lE.l", "..lE..lE.l..lE..l..E", "E.l..E..lE.l..E..lE.", ".lE.l..E..lE..l.E..l",
      "l..E..lE.l..E..lE...", ".E..l...E..l..E...l.",
    ],
    front: [
      {
        y: 15,
        mirror: "even",
        rows: [
          "............", ".le.........", "lEl.........", ".l..........", "............", "le..........",
          "El..........", ".le.........", "............", "lE..........", ".l..........", "El..........",
        ],
      },
    ],
  },
  shadow_cloak: {
    fill: "V",
    mirror: true,
    rows: [".........y", ...r("........._", 9)],
    back: [
      {
        y: 20,
        mirror: "even",
        rows: ["kkkkkkkkkkk", ...r("kVVVVVVVVVVV", 13), "kVVVVVVVVVVVV", "kVVVVVVVVVVVV", "kVkVVkVVkVVkV", ".k.k..k.k..k."],
      },
    ],
  },

  bbq_apron: {
    fill: "r",
    sleeves: null,
    mirror: true,
    rows: ["_____.....", "_____.....", "____......", "___.......", "__........", "_.........", "_.........", "_.....RRRR", "_.....R...", "_........."],
  },
  lab_coat: {
    fill: "w",
    mirror: true,
    rows: ["......W___", ".......W__", "........W_", "........W_", "........W_", "..kkkk..W_", "..k..k..W_", "..kkkk..W_", "........W_", "........W_"],
    front: [{ x: 13, y: 27, rows: ["b", "b"] }],
  },
  school_uniform: {
    fill: "w",
    mirror: true,
    rows: ["......BBB.", ".......BB.", "........B.", "..........", "..........", "..........", "..........", "BBBBBBBBBB", "BBBBBBBBBB", "BBBBBBBBBB"],
    front: [{ x: 24, y: 27, rows: ["yy", "yy"] }],
  },
  wizard_robe: {
    fill: "v",
    rows: [
      "....................", "...y..........w.....", "..yyy...............", "...y.........y......",
      "YYYYYYYYYYYYYYYYYYYY", "....................", "......w.......y.....", ".............yyy....",
      "..y...........y.....", "....................",
    ],
    front: [{ y: 34, mirror: "even", rows: ["kvvvvvvvvvv", "kkkkkkkkkkk"] }],
  },
  karate_gi: {
    fill: "w",
    rows: [
      "......W______W......", ".......W____W.......", "........W__W........", ".........WW.........",
      "..........W.........", "kkkkkkkkkkkkkkkkkkkk", "........kk.k........", ".......k....k.......",
    ],
  },
  ceo_suit: {
    fill: "B",
    mirror: true,
    rows: ["......kwww", "......kwwr", ".......kwr", ".......kwr", "........kr", "........kR", ".........R", "..........", "........k."],
    front: [{ x: 24, y: 26, rows: ["ww"] }],
  },
};
