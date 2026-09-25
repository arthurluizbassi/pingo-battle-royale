import type { PixelLayer } from "../types";

/** Free cosmetic face options. They never change stats. */

interface EyeStyle {
  label: string;
  left: PixelLayer;
  right: PixelLayer;
  /** width of each eye, used for the blink line */
  width: 2 | 3;
}

export const EYE_STYLES = {
  redondo: {
    label: "Redondos",
    width: 2,
    left: { x: 14, y: 17, rows: ["kw", "kk", "kk"] },
    right: { x: 24, y: 17, rows: ["kw", "kk", "kk"] },
  },
  ponto: {
    label: "Pontinhos",
    width: 2,
    left: { x: 14, y: 18, rows: ["kk", "kk"] },
    right: { x: 24, y: 18, rows: ["kk", "kk"] },
  },
  grande: {
    label: "Grandões",
    width: 3,
    left: { x: 13, y: 16, rows: ["kkk", "kkw", "kkk", "kkk"] },
    right: { x: 24, y: 16, rows: ["kkk", "kkw", "kkk", "kkk"] },
  },
  feliz: {
    label: "Felizes",
    width: 3,
    left: { x: 13, y: 18, rows: [".k.", "k.k"] },
    right: { x: 24, y: 18, rows: [".k.", "k.k"] },
  },
  bravo: {
    label: "Bravos",
    width: 2,
    left: { x: 13, y: 15, rows: ["kk..", "..k.", "....", ".kw.", ".kk.", ".kk."] },
    right: { x: 23, y: 15, rows: ["..kk", ".k..", "....", ".kw.", ".kk.", ".kk."] },
  },
  sono: {
    label: "Sonolentos",
    width: 3,
    left: { x: 13, y: 19, rows: ["kkk", ".k."] },
    right: { x: 24, y: 19, rows: ["kkk", ".k."] },
  },
  brilho: {
    label: "Brilhantes",
    width: 3,
    left: { x: 13, y: 17, rows: [".k.", "kyk", ".k."] },
    right: { x: 24, y: 17, rows: [".k.", "kyk", ".k."] },
  },
} satisfies Record<string, EyeStyle>;

export const MOUTH_STYLES = {
  sorriso: { label: "Sorriso", layer: { x: 18, y: 22, rows: ["k..k", ".kk."] } },
  aberta: { label: "Boca aberta", layer: { x: 18, y: 22, rows: ["kkkk", "kRRk", ".kk."] } },
  reta: { label: "Sério", layer: { x: 19, y: 23, rows: ["kk"] } },
  gato: { label: "Gatinho", layer: { x: 17, y: 22, rows: ["k.kk.k", ".k..k."] } },
  dentes: { label: "Dentuço", layer: { x: 18, y: 22, rows: ["kkkk", ".ww."] } },
  lingua: { label: "Linguinha", layer: { x: 18, y: 22, rows: ["kkkk", ".pp."] } },
} satisfies Record<string, { label: string; layer: PixelLayer }>;

export const DETAIL_STYLES = {
  nenhum: { label: "Nenhum", layers: [] },
  bochechas: {
    label: "Bochechas",
    layers: [
      { x: 11, y: 21, rows: ["pp"] },
      { x: 27, y: 21, rows: ["pp"] },
    ],
  },
  sardas: {
    label: "Sardas",
    layers: [
      { x: 11, y: 21, rows: ["N.N"] },
      { x: 26, y: 21, rows: ["N.N"] },
    ],
  },
  curativo: { label: "Curativo", layers: [{ x: 22, y: 13, rows: ["nnnn", "nwwn", "nnnn"] }] },
  broto: { label: "Broto", layers: [{ x: 17, y: 5, rows: ["ll..ll", ".llll.", "..ee..", "..ee.."] }] },
  estrela: { label: "Estrela", layers: [{ x: 26, y: 20, rows: [".y.", "yyy", ".y."] }] },
} satisfies Record<string, { label: string; layers: PixelLayer[] }>;

export type EyeStyleId = keyof typeof EYE_STYLES;
export type MouthStyleId = keyof typeof MOUTH_STYLES;
export type DetailStyleId = keyof typeof DETAIL_STYLES;
