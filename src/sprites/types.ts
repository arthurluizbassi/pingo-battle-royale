/**
 * Pixel sprites are plain data: strings of PALETTE keys ('.' = transparent).
 *
 * Placement of a layer:
 *  - `x` given: the rows start at that column (left aligned).
 *  - otherwise rows are CENTERED on the category axis (helmet/outfit: head center, weapon: hand).
 *  - `mirror: "even"`: each row is the LEFT HALF, mirrored to make a symmetric row (even width).
 *  - `mirror: "odd"`: same, but the last char of the half is the shared center column.
 */
export interface PixelLayer {
  y: number;
  rows: string[];
  x?: number;
  mirror?: "even" | "odd";
}

export interface WeaponArt {
  layers: PixelLayer[];
  /** drawn behind the body */
  back?: PixelLayer[];
}

export interface HelmetArt {
  layers: PixelLayer[];
  back?: PixelLayer[];
}

/**
 * Outfits paint the body interior (outline is kept) from row `top` down.
 * `rows` are 20 wide (or mirrored halves of 10) aligned with the body (x 10..29):
 *   '.' = use `fill`, '_' = keep the body color, any palette key = that color.
 * Pixels over the body's shadow side are auto-darkened (SHADE_OF).
 */
export interface OutfitArt {
  fill: string | null;
  top?: number;
  rows?: string[];
  mirror?: boolean;
  /** color of the arms; defaults to fill; null keeps body color */
  sleeves?: string | null;
  /** drawn over the outfit, not masked by the body */
  front?: PixelLayer[];
  /** drawn behind the body (capes, tails) */
  back?: PixelLayer[];
}
