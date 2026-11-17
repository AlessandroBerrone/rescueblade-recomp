import type { Point2D, Quad2D, RenderSprite } from './types.ts';

export type Vec4 = readonly [number, number, number, number];

/**
 * Computes projective homogeneous weights [q0, q1, q2, q3] for [TL, TR, BR, BL]
 * by intersecting the two diagonals P0-P2 and P1-P3.
 * Using (u*q, v*q, q) in vertex attributes and (v_uvq.xy / v_uvq.z) in the fragment shader
 * produces exact perspective-correct homography across 2 triangles without affine diagonal seams.
 * Falls back to [1, 1, 1, 1] for parallel/degenerate quads (e.g. rectangles).
 */
export function computeQuadProjectiveFactors(
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  p3: Point2D
): Vec4 {
  const dx1 = p2.x - p0.x;
  const dy1 = p2.y - p0.y;
  const dx2 = p3.x - p1.x;
  const dy2 = p3.y - p1.y;

  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 1e-6) {
    return [1, 1, 1, 1];
  }

  const px = p1.x - p0.x;
  const py = p1.y - p0.y;
  const s = (px * dy2 - py * dx2) / denom;
  const t = (px * dy1 - py * dx1) / denom;

  // Intersection must lie strictly inside both diagonals for valid convex projective mapping
  if (s <= 1e-4 || s >= 1 - 1e-4 || t <= 1e-4 || t >= 1 - 1e-4) {
    return [1, 1, 1, 1];
  }

  const d0 = Math.hypot(s * dx1, s * dy1);
  const d2 = Math.hypot((1 - s) * dx1, (1 - s) * dy1);
  const d1 = Math.hypot(t * dx2, t * dy2);
  const d3 = Math.hypot((1 - t) * dx2, (1 - t) * dy2);

  if (d0 < 1e-5 || d1 < 1e-5 || d2 < 1e-5 || d3 < 1e-5) {
    return [1, 1, 1, 1];
  }

  const q0 = (d0 + d2) / d2;
  const q2 = (d0 + d2) / d0;
  const q1 = (d1 + d3) / d3;
  const q3 = (d1 + d3) / d1;
  return [q0, q1, q2, q3];
}

/**
 * Computes stage-space [TL, TR, BR, BL] corners for a standard Director sprite,
 * honoring texture regPoint pivot, sprite width/height scaling, flipH/flipV, and clockwise rotation.
 */
export function computeSpriteCorners(sprite: Pick<
  RenderSprite,
  'locH' | 'locV' | 'width' | 'height' | 'rotation' | 'flipH' | 'flipV' | 'quad'
> & {
  texWidth: number;
  texHeight: number;
  regX: number;
  regY: number;
}): Quad2D {
  if (sprite.quad) {
    return sprite.quad;
  }

  const tw = sprite.texWidth || 1;
  const th = sprite.texHeight || 1;
  const sx = sprite.width / tw;
  const sy = sprite.height / th;

  const rx = sprite.flipH ? tw - sprite.regX : sprite.regX;
  const ry = sprite.flipV ? th - sprite.regY : sprite.regY;

  const left = -rx * sx;
  const right = (tw - rx) * sx;
  const top = -ry * sy;
  const bottom = (th - ry) * sy;

  const rad = (sprite.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const transform = (lx: number, ly: number): Point2D => ({
    x: sprite.locH + lx * cos - ly * sin,
    y: sprite.locV + lx * sin + ly * cos,
  });

  return [
    transform(left, top),
    transform(right, top),
    transform(right, bottom),
    transform(left, bottom),
  ];
}

/**
 * Sorts sprites in Macromedia Director draw order: ascending locZ, breaking ties by spriteNum.
 */
export function sortSpritesForRender<T extends Pick<RenderSprite, 'locZ' | 'spriteNum'>>(
  sprites: readonly T[]
): T[] {
  return [...sprites].sort((a, b) => {
    if (a.locZ !== b.locZ) return a.locZ - b.locZ;
    return a.spriteNum - b.spriteNum;
  });
}
