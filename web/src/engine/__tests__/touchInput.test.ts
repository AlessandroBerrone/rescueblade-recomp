import { describe, expect, it } from 'vitest';
import { InputManager } from '../InputManager.ts';
import { mergeInputEdges, withoutInputEdges } from '../input/edges.ts';

describe('virtual touch input', () => {
  it('a tap released before the next frame is still seen once', () => {
    const mgr = new InputManager({ getGamepads: () => [] });
    mgr.touch.setAction('confirm', true);
    mgr.touch.setAction('confirm', false);
    const s1 = mgr.update();
    expect(s1.actions.confirm.justPressed).toBe(true);
    const s2 = mgr.update();
    expect(s2.actions.confirm.isPressed).toBe(false);
    expect(s2.actions.confirm.justReleased).toBe(true);
  });

  it('a quick tap on the stage produces mouse down then up at the tap position', () => {
    const mgr = new InputManager({ getGamepads: () => [] });
    mgr.touch.setTouchPointer(200, 100, true);
    mgr.touch.setTouchPointer(200, 100, false);
    const s1 = mgr.update();
    expect(s1.pointer.justPressed).toBe(true);
    expect(s1.pointer.x).toBe(200);
    const s2 = mgr.update();
    expect(s2.pointer.justReleased).toBe(true);
    expect(s2.pointer.x).toBe(200);
    expect(mgr.update().pointer.justReleased).toBe(false);
  });

  it('touch stick feeds flight axes', () => {
    const mgr = new InputManager({ getGamepads: () => [] });
    mgr.touch.setStick(0.5, -1);
    const s = mgr.update();
    expect(s.axes.moveX).toBeCloseTo(0.5);
    expect(s.axes.throttle).toBeCloseTo(1);
    expect(s.lastActiveDevice).toBe('touch');
  });

  it('edges from frames without a score tick are carried, not duplicated', () => {
    const mgr = new InputManager({ getGamepads: () => [] });
    mgr.touch.setAction('pause', true);
    const pressFrame = mgr.update();
    const nextFrame = mgr.update();
    expect(nextFrame.actions.pause.justPressed).toBe(false);
    const merged = mergeInputEdges(pressFrame, nextFrame);
    expect(merged.actions.pause.justPressed).toBe(true);
    expect(withoutInputEdges(merged).actions.pause.justPressed).toBe(false);
  });
});
