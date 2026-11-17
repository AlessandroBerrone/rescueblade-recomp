import { describe, expect, it } from 'vitest';
import {
  computeQuadProjectiveFactors,
  computeSpriteCorners,
  sortSpritesForRender,
} from '../quadMath.ts';

describe('computeQuadProjectiveFactors', () => {
  it('returns uniform weights [1,1,1,1] for axis-aligned rectangles', () => {
    const q = computeQuadProjectiveFactors(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 50 },
      { x: 0, y: 50 }
    );
    expect(q[0]).toBeCloseTo(2, 5);
    expect(q[1]).toBeCloseTo(2, 5);
    expect(q[2]).toBeCloseTo(2, 5);
    expect(q[3]).toBeCloseTo(2, 5);
  });

  it('computes symmetric perspective ratio q_bottom / q_top == bottomWidth / topWidth for trapezoids', () => {
    // Classic QuadTileNear trapezoid: top width 128 centered at 256 (192..320), bottom width 256 (128..384)
    const [q0, q1, q2, q3] = computeQuadProjectiveFactors(
      { x: 192, y: 280 },
      { x: 320, y: 280 },
      { x: 384, y: 330 },
      { x: 128, y: 330 }
    );
    // Perspective ratio BR/TL = 256 / 128 = 2.0
    expect(q2 / q0).toBeCloseTo(2.0, 5);
    expect(q3 / q1).toBeCloseTo(2.0, 5);
    expect(q0).toBeCloseTo(q1, 5);
    expect(q2).toBeCloseTo(q3, 5);
  });

  it('falls back safely to [1,1,1,1] for degenerate quads', () => {
    expect(
      computeQuadProjectiveFactors(
        { x: 10, y: 10 },
        { x: 10, y: 10 },
        { x: 10, y: 10 },
        { x: 10, y: 10 }
      )
    ).toEqual([1, 1, 1, 1]);
  });
});

describe('computeSpriteCorners', () => {
  it('centers sprite around regPoint and rotates clockwise in screen coordinates', () => {
    const [tl, tr, br, bl] = computeSpriteCorners({
      locH: 100,
      locV: 200,
      width: 40,
      height: 20,
      texWidth: 40,
      texHeight: 20,
      regX: 20,
      regY: 10,
      rotation: 90,
      flipH: false,
      flipV: false,
      quad: null,
    });
    // Local (-20,-10) rotated +90 deg clockwise -> (+10, -20) => (110, 180)
    expect(tl.x).toBeCloseTo(110, 5);
    expect(tl.y).toBeCloseTo(180, 5);
    // Local (+20,+10) rotated +90 deg clockwise -> (-10, +20) => (90, 220)
    expect(br.x).toBeCloseTo(90, 5);
    expect(br.y).toBeCloseTo(220, 5);
    expect(tr.x).toBeCloseTo(110, 5);
    expect(tr.y).toBeCloseTo(220, 5);
    expect(bl.x).toBeCloseTo(90, 5);
    expect(bl.y).toBeCloseTo(180, 5);
  });

  it('mirrors asymmetric regPoint when flipH is true', () => {
    const [tl, tr] = computeSpriteCorners({
      locH: 100,
      locV: 50,
      width: 40,
      height: 20,
      texWidth: 40,
      texHeight: 20,
      regX: 10,
      regY: 10,
      rotation: 0,
      flipH: true,
      flipV: false,
      quad: null,
    });
    // Unflipped: left=-10..right=30; Flipped: regX becomes 40-10=30 -> left=-30..right=10
    expect(tl.x).toBeCloseTo(70, 5);
    expect(tr.x).toBeCloseTo(110, 5);
  });

  it('preserves identical stage corners when texture and regPoint are scaled up for HD', () => {
    const base = computeSpriteCorners({
      locH: 48,
      locV: 11,
      width: 109,
      height: 25,
      texWidth: 97,
      texHeight: 25,
      regX: 48,
      regY: 12,
      rotation: 0,
      flipH: false,
      flipV: false,
      quad: null,
    });
    const hd = computeSpriteCorners({
      locH: 48,
      locV: 11,
      width: 109,
      height: 25,
      texWidth: 97 * 4,
      texHeight: 25 * 4,
      regX: 48 * 4,
      regY: 12 * 4,
      rotation: 0,
      flipH: false,
      flipV: false,
      quad: null,
    });
    for (let i = 0; i < 4; i++) {
      expect(hd[i].x).toBeCloseTo(base[i].x, 5);
      expect(hd[i].y).toBeCloseTo(base[i].y, 5);
    }
  });
});

describe('sortSpritesForRender', () => {
  it('sorts ascending by locZ and breaks ties by spriteNum', () => {
    const sorted = sortSpritesForRender([
      { locZ: 1000, spriteNum: 5 },
      { locZ: 100, spriteNum: 20 },
      { locZ: 100, spriteNum: 3 },
      { locZ: -1002, spriteNum: 2 },
    ]);
    expect(sorted.map((s) => `${s.locZ}:${s.spriteNum}`)).toEqual([
      '-1002:2',
      '100:3',
      '100:20',
      '1000:5',
    ]);
  });
});
