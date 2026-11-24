import type { ActionId, AxisId, InputProvider, ProviderFrameInput } from './types.ts';

function clampAxis(v: number): number {
  return Math.max(-1, Math.min(1, v));
}

interface TouchPointer {
  x: number;
  y: number;
  isDown: boolean;
  inside: boolean;
}

/**
 * Provider for virtual on-screen touch controls (e.g. Android / Capacitor mobile port).
 * Virtual controls feed axes and action buttons here; InputManager blends them cleanly
 * with physical keyboard and controller inputs without conflict.
 *
 * A press is always reported to at least one poll(), even when the finger is lifted
 * before the next frame, so quick taps are never lost.
 */
export class VirtualTouchProvider implements InputProvider {
  public readonly device = 'touch' as const;

  private axes: Record<AxisId, number> = {
    moveX: 0,
    moveY: 0,
    throttle: 0,
  };
  private actions = new Set<ActionId>();
  private readonly unpolledPresses = new Set<ActionId>();
  private readonly releaseAfterPoll = new Set<ActionId>();

  private pointerState: TouchPointer | undefined;
  private pointerDownUnpolled = false;
  private pointerReleaseAfterPoll = false;
  /** After a release has been reported once, stop overriding the mouse position. */
  private pointerLeaveAfterPoll = false;

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
      if (!this.actions.has(action)) this.unpolledPresses.add(action);
      this.actions.add(action);
      this.releaseAfterPoll.delete(action);
    } else if (this.unpolledPresses.has(action)) {
      this.releaseAfterPoll.add(action);
    } else {
      this.actions.delete(action);
    }
  }

  public isActionHeld(action: ActionId): boolean {
    return this.actions.has(action);
  }

  /**
   * Feeds a finger on the stage as the Director mouse. Releasing (isDown=false) is
   * reported once at that position; afterwards the touch stops steering the pointer.
   */
  public setTouchPointer(x: number, y: number, isDown: boolean, inside = true): void {
    if (isDown) {
      if (!this.pointerState?.isDown) this.pointerDownUnpolled = true;
      this.pointerReleaseAfterPoll = false;
      this.pointerLeaveAfterPoll = false;
      this.pointerState = { x, y, isDown: true, inside };
      return;
    }
    if (this.pointerDownUnpolled) {
      this.pointerState = { x, y, isDown: true, inside };
      this.pointerReleaseAfterPoll = true;
      return;
    }
    this.pointerState = { x, y, isDown: false, inside };
    this.pointerLeaveAfterPoll = true;
  }

  public clearTouchPointer(): void {
    this.pointerState = undefined;
    this.pointerDownUnpolled = false;
    this.pointerReleaseAfterPoll = false;
    this.pointerLeaveAfterPoll = false;
  }

  public reset(): void {
    this.axes = { moveX: 0, moveY: 0, throttle: 0 };
    this.actions.clear();
    this.unpolledPresses.clear();
    this.releaseAfterPoll.clear();
    this.clearTouchPointer();
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

    const snapshot: ProviderFrameInput = {
      device: this.device,
      active,
      axes: { ...this.axes },
      actions: actionMap,
      pointer: this.pointerState ? { ...this.pointerState } : undefined,
    };

    // Deferred releases: the press has now been seen once.
    this.unpolledPresses.clear();
    for (const a of this.releaseAfterPoll) this.actions.delete(a);
    this.releaseAfterPoll.clear();

    this.pointerDownUnpolled = false;
    if (this.pointerLeaveAfterPoll && this.pointerState) {
      this.pointerState = { ...this.pointerState, inside: false };
      this.pointerLeaveAfterPoll = false;
    }
    if (this.pointerReleaseAfterPoll && this.pointerState) {
      this.pointerState = { ...this.pointerState, isDown: false };
      this.pointerReleaseAfterPoll = false;
      this.pointerLeaveAfterPoll = true;
    }

    return snapshot;
  }
}
