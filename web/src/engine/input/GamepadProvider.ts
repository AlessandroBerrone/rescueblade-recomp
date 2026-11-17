import type { ActionId, GamepadInfo, InputProvider, ProviderFrameInput } from './types.ts';

export interface RadialDeadzoneResult {
  x: number;
  y: number;
  magnitude: number;
}

/**
 * Applies a circular radial deadzone to a 2D analog stick vector and linearly
 * rescales magnitudes in [deadzone, 1.0] onto [0.0, 1.0], preserving direction.
 */
export function applyRadialDeadzone(
  rawX: number,
  rawY: number,
  deadzone: number
): RadialDeadzoneResult {
  const dz = Math.max(0, Math.min(0.95, deadzone));
  const mag = Math.hypot(rawX, rawY);
  if (mag <= dz || mag === 0) {
    return { x: 0, y: 0, magnitude: 0 };
  }
  const clampedMag = Math.min(1, mag);
  const scaled = (clampedMag - dz) / (1 - dz);
  return {
    x: (rawX / mag) * scaled,
    y: (rawY / mag) * scaled,
    magnitude: scaled,
  };
}

export interface GamepadProviderOptions {
  deadzone?: number;
  targetWindow?: Window;
  getGamepads?: () => readonly (Gamepad | null)[];
  digitalThreshold?: number;
}

export class GamepadProvider implements InputProvider {
  public readonly device = 'gamepad' as const;

  private deadzone: number;
  private readonly digitalThreshold: number;
  private readonly win: Window | undefined;
  private readonly readGamepads: () => readonly (Gamepad | null)[];
  private preferredIndex: number | null = null;
  private connectedIndices = new Set<number>();
  private lastGamepadInfo: GamepadInfo | null = null;
  private lastConnectedCount = 0;

  constructor(options: GamepadProviderOptions = {}) {
    this.deadzone = options.deadzone ?? 0.15;
    this.digitalThreshold = options.digitalThreshold ?? 0.5;
    this.win = options.targetWindow ?? (typeof window !== 'undefined' ? window : undefined);
    this.readGamepads =
      options.getGamepads ??
      (() => {
        if (typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function') {
          return navigator.getGamepads();
        }
        return [];
      });

    if (this.win) {
      this.win.addEventListener('gamepadconnected', this.onConnected);
      this.win.addEventListener('gamepaddisconnected', this.onDisconnected);
    }
  }

  public setDeadzone(deadzone: number): void {
    this.deadzone = Math.max(0, Math.min(0.95, deadzone));
  }

  public getDeadzone(): number {
    return this.deadzone;
  }

  public getActiveGamepadInfo(): GamepadInfo | null {
    return this.lastGamepadInfo;
  }

  public getConnectedCount(): number {
    return this.lastConnectedCount;
  }

  private readonly onConnected = (e: GamepadEvent): void => {
    this.connectedIndices.add(e.gamepad.index);
    if (this.preferredIndex === null) {
      this.preferredIndex = e.gamepad.index;
    }
  };

  private readonly onDisconnected = (e: GamepadEvent): void => {
    this.connectedIndices.delete(e.gamepad.index);
    if (this.preferredIndex === e.gamepad.index) {
      const next = this.connectedIndices.values().next();
      this.preferredIndex = next.done ? null : next.value;
    }
  };

  private btnPressed(pad: Gamepad, idx: number, analogThreshold = 0.35): boolean {
    const b = pad.buttons[idx];
    if (!b) return false;
    return b.pressed || b.value >= analogThreshold;
  }


  private selectGamepad(pads: readonly (Gamepad | null)[]): Gamepad | null {
    let count = 0;
    let firstValid: Gamepad | null = null;
    let preferred: Gamepad | null = null;

    for (const pad of pads) {
      if (!pad || !pad.connected) continue;
      count++;
      if (!firstValid) firstValid = pad;
      if (pad.index === this.preferredIndex) preferred = pad;
      const hasBtn = pad.buttons.some((b) => b.pressed || b.value > 0.35);
      const hasAxis =
        pad.axes.length >= 2 &&
        Math.hypot(pad.axes[0] ?? 0, pad.axes[1] ?? 0) > this.deadzone;
      if (hasBtn || hasAxis) {
        this.preferredIndex = pad.index;
        preferred = pad;
      }
    }

    this.lastConnectedCount = count;
    return preferred ?? firstValid;
  }

  public poll(): ProviderFrameInput {
    const pads = this.readGamepads();
    const pad = this.selectGamepad(pads);

    if (!pad) {
      this.lastGamepadInfo = null;
      return {
        device: this.device,
        active: false,
        axes: { moveX: 0, moveY: 0, throttle: 0 },
        actions: {},
      };
    }

    const rawX = pad.axes[0] ?? 0;
    const rawY = pad.axes[1] ?? 0;
    const stick = applyRadialDeadzone(rawX, rawY, this.deadzone);

    const dpadUp = this.btnPressed(pad, 12);
    const dpadDown = this.btnPressed(pad, 13);
    const dpadLeft = this.btnPressed(pad, 14);
    const dpadRight = this.btnPressed(pad, 15);

    const dpadX = (dpadRight ? 1 : 0) - (dpadLeft ? 1 : 0);
    const dpadY = (dpadDown ? 1 : 0) - (dpadUp ? 1 : 0);

    const moveX = Math.abs(dpadX) >= Math.abs(stick.x) ? dpadX : stick.x;
    const moveY = Math.abs(dpadY) >= Math.abs(stick.y) ? dpadY : stick.y;
    const throttle = -moveY;

    const btnA = this.btnPressed(pad, 0);
    const btnB = this.btnPressed(pad, 1);
    const btnX = this.btnPressed(pad, 2);
    const btnLB = this.btnPressed(pad, 4);
    const btnRB = this.btnPressed(pad, 5);
    const btnRT = this.btnPressed(pad, 7, 0.35);
    const btnSelect = this.btnPressed(pad, 8);
    const btnStart = this.btnPressed(pad, 9);

    const actions: Record<ActionId, boolean> = {
      action: btnA || btnX || btnRT,
      confirm: btnA,
      cancel: btnB,
      pause: btnStart,
      up: dpadUp || stick.y <= -this.digitalThreshold,
      down: dpadDown || stick.y >= this.digitalThreshold,
      left: dpadLeft || stick.x <= -this.digitalThreshold,
      right: dpadRight || stick.x >= this.digitalThreshold,
      cheatUnlock: btnLB && btnRB && btnSelect,
    };

    const anyAction = Object.values(actions).some(Boolean);
    const active = stick.magnitude > 0 || anyAction;

    this.lastGamepadInfo = {
      index: pad.index,
      id: pad.id,
      mapping: pad.mapping,
      rawStickX: rawX,
      rawStickY: rawY,
      filteredStickX: stick.x,
      filteredStickY: stick.y,
    };

    return {
      device: this.device,
      active,
      axes: { moveX, moveY, throttle },
      actions,
    };
  }

  public dispose(): void {
    if (this.win) {
      this.win.removeEventListener('gamepadconnected', this.onConnected);
      this.win.removeEventListener('gamepaddisconnected', this.onDisconnected);
    }
  }
}

