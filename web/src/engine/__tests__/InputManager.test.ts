import { describe, expect, it } from 'vitest';
import { InputManager, applyRadialDeadzone } from '../InputManager.ts';

function makeMockGamepad(overrides: {
  index?: number;
  id?: string;
  connected?: boolean;
  axes?: number[];
  pressedButtons?: number[];
  buttonValues?: Record<number, number>;
}): Gamepad {
  const buttons: GamepadButton[] = Array.from({ length: 16 }, (_, i) => {
    const val = overrides.buttonValues?.[i] ?? (overrides.pressedButtons?.includes(i) ? 1 : 0);
    return {
      pressed: val >= 0.5 || Boolean(overrides.pressedButtons?.includes(i)),
      touched: val > 0,
      value: val,
    };
  });
  return {
    index: overrides.index ?? 0,
    id: overrides.id ?? 'Mock Standard Gamepad',
    connected: overrides.connected ?? true,
    mapping: 'standard',
    axes: overrides.axes ?? [0, 0, 0, 0],
    buttons,
    timestamp: 0,
    vibrationActuator: null as unknown as GamepadHapticActuator,
  };
}

describe('applyRadialDeadzone', () => {
  it('zeros vectors inside or on the radial deadzone', () => {
    expect(applyRadialDeadzone(0.05, -0.05, 0.15)).toEqual({ x: 0, y: 0, magnitude: 0 });
    expect(applyRadialDeadzone(0.15, 0, 0.15)).toEqual({ x: 0, y: 0, magnitude: 0 });
    expect(applyRadialDeadzone(0.1, 0.1, 0.15)).toEqual({ x: 0, y: 0, magnitude: 0 });
  });

  it('linearly rescales vectors outside deadzone while preserving direction', () => {
    const res = applyRadialDeadzone(0.575, 0, 0.15);
    expect(res.x).toBeCloseTo(0.5, 5);
    expect(res.y).toBeCloseTo(0, 5);
    expect(res.magnitude).toBeCloseTo(0.5, 5);

    const diag = applyRadialDeadzone(0.6, -0.8, 0.2);
    expect(diag.magnitude).toBeCloseTo(1.0, 5);
    expect(diag.x).toBeCloseTo(0.6, 5);
    expect(diag.y).toBeCloseTo(-0.8, 5);
  });

  it('clamps super-unit magnitudes to 1.0', () => {
    const res = applyRadialDeadzone(1.0, 1.0, 0.15);
    expect(res.magnitude).toBeCloseTo(1.0, 5);
    expect(Math.hypot(res.x, res.y)).toBeCloseTo(1.0, 5);
  });
});


describe('InputManager', () => {
  it('tracks keyboard movement, throttle, and edge-triggered action states', () => {
    const mgr = new InputManager({ getGamepads: () => [] });

    mgr.keyboard.setKeyForTest('ArrowRight', true);
    mgr.keyboard.setKeyForTest('ArrowUp', true);
    mgr.keyboard.setKeyForTest('Space', true);
    let s = mgr.update();
    expect(s.axes.moveX).toBe(1);
    expect(s.axes.moveY).toBe(-1);
    expect(s.axes.throttle).toBe(1);
    expect(s.actions.action).toEqual({ isPressed: true, justPressed: true, justReleased: false });
    expect(s.actions.confirm.justPressed).toBe(true);
    expect(s.lastActiveDevice).toBe('keyboard');

    s = mgr.update();
    expect(s.actions.action).toEqual({ isPressed: true, justPressed: false, justReleased: false });

    mgr.keyboard.setKeyForTest('Space', false);
    mgr.keyboard.setKeyForTest('ArrowRight', false);
    mgr.keyboard.setKeyForTest('ArrowUp', false);
    s = mgr.update();
    expect(s.axes.moveX).toBe(0);
    expect(s.axes.throttle).toBe(0);
    expect(s.actions.action).toEqual({ isPressed: false, justPressed: false, justReleased: true });
  });

  it('polls gamepad stick with radial deadzone and D-Pad axes cleanly', () => {
    let pad: Gamepad | null = makeMockGamepad({ axes: [0.08, -0.09] });
    const mgr = new InputManager({ deadzone: 0.15, getGamepads: () => [pad] });

    let s = mgr.update();
    expect(s.axes.moveX).toBe(0);
    expect(s.axes.moveY).toBe(0);
    expect(s.connectedGamepads).toBe(1);
    expect(s.lastActiveDevice).toBe('keyboard');

    pad = makeMockGamepad({ axes: [-0.575, 0], pressedButtons: [0] });
    s = mgr.update();
    expect(s.axes.moveX).toBeCloseTo(-0.5, 5);
    expect(s.actions.action.justPressed).toBe(true);
    expect(s.actions.confirm.justPressed).toBe(true);
    expect(s.lastActiveDevice).toBe('gamepad');

    pad = makeMockGamepad({ axes: [0.3, 0], pressedButtons: [14, 12] });
    s = mgr.update();
    expect(s.axes.moveX).toBe(-1);
    expect(s.axes.moveY).toBe(-1);
    expect(s.axes.throttle).toBe(1);
    expect(s.actions.left.isPressed).toBe(true);
    expect(s.actions.up.isPressed).toBe(true);
  });

  it('blends keyboard, gamepad, and virtual touch by max axis magnitude and OR actions', () => {
    const pad = makeMockGamepad({ axes: [0.575, 0] });
    const mgr = new InputManager({ deadzone: 0.15, getGamepads: () => [pad] });

    mgr.touch.setStick(-0.9, 0.4);
    mgr.touch.setAction('pause', true);
    let s = mgr.update();
    expect(s.axes.moveX).toBeCloseTo(-0.9, 5);
    expect(s.axes.moveY).toBeCloseTo(0.4, 5);
    expect(s.axes.throttle).toBeCloseTo(-0.4, 5);
    expect(s.actions.pause.justPressed).toBe(true);
    expect(s.lastActiveDevice).toBe('touch');

    mgr.keyboard.setKeyForTest('ArrowRight', true);
    s = mgr.update();
    expect(s.axes.moveX).toBe(1);
    expect(s.lastActiveDevice).toBe('keyboard');
  });

  it('handles gamepadconnected/disconnected events and cheatUnlock (R+I+X) + pointer', () => {
    const target = new EventTarget();
    let pads: (Gamepad | null)[] = [];
    const mgr = new InputManager({
      targetWindow: target as unknown as Window,
      getGamepads: () => pads,
    });

    const p0 = makeMockGamepad({ index: 0, axes: [0.6, 0] });
    pads = [p0];
    target.dispatchEvent(Object.assign(new Event('gamepadconnected'), { gamepad: p0 }));
    let s = mgr.update();
    expect(s.connectedGamepads).toBe(1);
    expect(s.lastActiveDevice).toBe('gamepad');

    pads = [];
    target.dispatchEvent(Object.assign(new Event('gamepaddisconnected'), { gamepad: p0 }));
    s = mgr.update();
    expect(s.connectedGamepads).toBe(0);
    expect(s.activeGamepad).toBeNull();

    mgr.keyboard.setKeyForTest('KeyR', true);
    mgr.keyboard.setKeyForTest('KeyI', true);
    mgr.keyboard.setKeyForTest('KeyX', true);
    mgr.keyboard.setPointerForTest(256, 165, true, true);
    s = mgr.update();
    expect(s.actions.cheatUnlock.justPressed).toBe(true);
    expect(s.pointer.justPressed).toBe(true);
    expect(s.lastActiveDevice).toBe('keyboard');
  });
});

