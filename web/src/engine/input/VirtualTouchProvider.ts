import type { ActionId, AxisId, InputProvider, ProviderFrameInput } from './types.ts';

function clampAxis(v: number): number {
  return Math.max(-1, Math.min(1, v));
}

/**
 * Provider for virtual on-screen touch controls (e.g. Android / Capacitor mobile port).
 * Virtual controls feed axes and action buttons here; InputManager blends them cleanly
 * with physical keyboard and controller inputs without conflict.
 */
export class VirtualTouchProvider implements InputProvider {
  public readonly device = 'touch' as const;

  private axes: Record<AxisId, number> = {
    moveX: 0,
    moveY: 0,
    throttle: 0,
  };
  private actions = new Set<ActionId>();
  private pointerState: { x: number; y: number; isDown: boolean; inside: boolean } | undefined;

  public setStick(x: number, y: number): void {
    this.axes.moveX = clampAxis(x);
    this.axes.moveY = clampAxis(y);
    this.axes.throttle = clampAxis(-y);
  }

  public setAxis(axis: AxisId, value: number): void {
    this.axes[axis] = clampAxis(value);
    if (axis === 'moveY') {
      this.axes.throttle = clampAxis(-this.axes.moveY);
    } else if (axis === 'throttle') {
      this.axes.moveY = clampAxis(-this.axes.throttle);
    }
  }

  public setAction(action: ActionId, pressed: boolean): void {
    if (pressed) {
      this.actions.add(action);
    } else {
      this.actions.delete(action);
    }
  }

  public setTouchPointer(x: number, y: number, isDown: boolean, inside = true): void {
    this.pointerState = { x, y, isDown, inside };
  }

  public clearTouchPointer(): void {
    this.pointerState = undefined;
  }

  public reset(): void {
    this.axes = { moveX: 0, moveY: 0, throttle: 0 };
    this.actions.clear();
    this.pointerState = undefined;
  }

  public poll(): ProviderFrameInput {
    const actionMap: Partial<Record<ActionId, boolean>> = {};
    for (const a of this.actions) {
      actionMap[a] = true;
    }

    const active =
      Math.abs(this.axes.moveX) > 0 ||
      Math.abs(this.axes.moveY) > 0 ||
      this.actions.size > 0 ||
      Boolean(this.pointerState?.isDown);

    return {
      device: this.device,
      active,
      axes: { ...this.axes },
      actions: actionMap,
      pointer: this.pointerState,
    };
  }
}
