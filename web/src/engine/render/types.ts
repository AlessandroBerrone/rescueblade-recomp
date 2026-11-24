export interface Point2D {
  x: number;
  y: number;
}

/** [TL, TR, BR, BL] in stage coordinates (512x330). */
export type Quad2D = readonly [Point2D, Point2D, Point2D, Point2D];

export const DIRECTOR_INK = {
  COPY: 0,
  MATTE: 8,
  MASK: 9,
  ADD_PIN: 33,
  ADD: 34,
  BG_TRANSPARENT: 36,
  /** Director ink 37: per channel max(sprite, stage). Used by flames, snow and glows. */
  LIGHTEST: 37,
} as const;

export interface TextureEntry {
  readonly texture: WebGLTexture;
  readonly width: number;
  readonly height: number;
  readonly regX: number;
  readonly regY: number;
  readonly hasAlpha: boolean;
}

export interface RenderSprite {
  readonly spriteNum: number;
  readonly texture: TextureEntry | null;
  readonly maskTexture?: TextureEntry | null;
  readonly locH: number;
  readonly locV: number;
  readonly width: number;
  readonly height: number;
  readonly locZ: number;
  readonly rotation: number;
  readonly flipH: boolean;
  readonly flipV: boolean;
  readonly blend: number;
  readonly ink: number;
  /** Colour keyed out by Background Transparent / Matte ink (RGB 0..255). Defaults to white. */
  readonly keyColor?: readonly [number, number, number];
  readonly quad: Quad2D | null;
  readonly visible?: boolean;
}
