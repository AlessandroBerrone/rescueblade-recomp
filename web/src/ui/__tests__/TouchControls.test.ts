import { describe, expect, it } from 'vitest';
import { stageCoords, stickToAxes } from '../TouchControls.ts';

describe('touch controls helpers', () => {
  it('stick has a radial deadzone and reaches full deflection', () => {
    expect(stickToAxes(0.05, 0.05)).toEqual({ x: 0, y: 0 });
    const full = stickToAxes(0, -1);
    expect(full.x).toBeCloseTo(0);
    expect(full.y).toBeCloseTo(-1);
    const diag = stickToAxes(1, 1);
    expect(Math.hypot(diag.x, diag.y)).toBeCloseTo(1);
  });

  it('maps a touch on a scaled canvas to stage pixels', () => {
    const rect = { left: 100, top: 20, width: 1024, height: 660 };
    expect(stageCoords(100 + 512, 20 + 330, rect, 512, 330)).toEqual({ x: 256, y: 165, inside: true });
    expect(stageCoords(50, 20, rect, 512, 330).inside).toBe(false);
  });
});
