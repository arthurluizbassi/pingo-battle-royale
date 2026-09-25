/**
 * The whole game uses this single small palette.
 * Sprite grids are strings where each character is a key of PALETTE ('.' = transparent).
 */
export const PALETTE: Record<string, string> = {
  k: "#231a2e", // outline / ink
  w: "#fbf7ef", // white
  W: "#c9c3d2", // light gray
  g: "#8b8397", // gray
  G: "#4d4658", // dark gray
  r: "#e84a4a", // red
  R: "#9e2a3a", // dark red
  o: "#f28c28", // orange
  y: "#ffd23f", // yellow
  Y: "#d99a1e", // gold
  l: "#8fdc5a", // lime
  e: "#3fa34d", // green
  E: "#22683b", // dark green
  c: "#5ad1e6", // cyan
  b: "#3b7de0", // blue
  B: "#253a7a", // navy
  p: "#ff8fb8", // pink
  P: "#d0457e", // magenta
  v: "#9b6bf2", // violet
  V: "#5a3a9e", // dark violet
  n: "#d8a866", // cardboard / tan
  N: "#9a6232", // brown
  m: "#5e3a22", // dark brown
  s: "#ffc8a2", // peach
  x: "#b8c4d6", // metal
  X: "#6d7a91", // dark metal
};

/** Darker partner of each color, used to auto-shade outfits over the body's shadow side. */
export const SHADE_OF: Record<string, string> = {
  w: "W", W: "g", g: "G", G: "k", r: "R", R: "m", o: "N", y: "Y", Y: "N",
  l: "e", e: "E", E: "k", c: "b", b: "B", B: "k", p: "P", P: "R", v: "V",
  V: "k", n: "N", N: "m", m: "k", s: "n", x: "X", X: "G", k: "k",
};

/** Free body colors. Purely cosmetic. */
export const BODY_COLORS = {
  azul: { name: "Azul", main: "#5aa9f0", shade: "#3a78c4", light: "#a9d6ff" },
  rosa: { name: "Rosa", main: "#ff8fc2", shade: "#d65f98", light: "#ffc6e0" },
  verde: { name: "Verde", main: "#6fd46a", shade: "#43a047", light: "#b5f0a8" },
  amarelo: { name: "Amarelo", main: "#ffd84d", shade: "#e0a92a", light: "#fff1a8" },
  roxo: { name: "Roxo", main: "#a883f5", shade: "#7657c9", light: "#d4c2ff" },
  laranja: { name: "Laranja", main: "#ff9f4a", shade: "#d9722a", light: "#ffd0a3" },
  ciano: { name: "Ciano", main: "#56e0d6", shade: "#2fb0a8", light: "#b1f5ef" },
  vermelho: { name: "Vermelho", main: "#f25f5c", shade: "#bf3b3b", light: "#ffaaa3" },
  cinza: { name: "Cinza", main: "#b3adbf", shade: "#857e94", light: "#e0dce8" },
  menta: { name: "Menta", main: "#9ff0b8", shade: "#62c48a", light: "#d8ffe4" },
} as const;

export type BodyColor = keyof typeof BODY_COLORS;
export const OUTLINE_COLOR = PALETTE.k;
