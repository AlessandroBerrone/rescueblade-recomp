import { GamepadProvider } from './input/GamepadProvider.ts';
import { KeyboardMouseProvider } from './input/KeyboardMouseProvider.ts';
import { VirtualTouchProvider } from './input/VirtualTouchProvider.ts';
import {
  ALL_ACTIONS,
  ALL_AXES,
  type ActionId,
  type ActionState,
  type AxisId,
  type InputDeviceKind,
  type InputProvider,
  type InputState,
  type PointerState,
} from './input/types.ts';

export * from './input/types.ts';
export { applyRadialDeadzone } from './input/GamepadProvider.ts';
export { GamepadProvider, KeyboardMouseProvider, VirtualTouchProvider };

export interface InputManagerOptions {
  stageElement?: HTMLElement | null;
  stageWidth?: number;
  stageHeight?: number;
  deadzone?: number;
  providers?: InputProvider[];
  targetWindow?: Window;
  getGamepads?: () => readonly (Gamepad | null)[];
}

function clampAxis(v: number): number {
  return Math.max(-1, Math.min(1, v));
}

function createEmptyActions(): Record<ActionId, ActionState> {
  const rec = {} as Record<ActionId, ActionState>;
  for (const a of ALL_ACTIONS) {
    rec[a] = { isPressed: false, justPressed: false, justReleased: false };
  }
  return rec;
}

export class InputManager {
  public readonly keyboard: KeyboardMouseProvider;
  public readonly gamepad: GamepadProvider;
  public readonly touch: VirtualTouchProvider;

  private readonly providers: InputProvider[];
  private prevActions = new Map<ActionId, boolean>();
  private prevProviderSignatures = new Map<InputProvider, string>();
  private prevPointerDown = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private lastPointerInside = false;
  private lastActiveDevice: InputDeviceKind = 'keyboard';
  private state: InputState;

  constructor(options: InputManagerOptions = {}) {
    this.keyboard = new KeyboardMouseProvider({
      targetWindow: options.targetWindow,
      stageElement: options.stageElement,
      stageWidth: options.stageWidth ?? 512,
      stageHeight: options.stageHeight ?? 330,
    });
    this.gamepad = new GamepadProvider({
      deadzone: options.deadzone ?? 0.15,
      targetWindow: options.targetWindow,
      getGamepads: options.getGamepads,
    });
    this.touch = new VirtualTouchProvider();

    this.providers = options.providers ?? [this.keyboard, this.gamepad, this.touch];

    for (const a of ALL_ACTIONS) {
      this.prevActions.set(a, false);
    }

    this.state = {
      axes: { moveX: 0, moveY: 0, throttle: 0 },
      actions: createEmptyActions(),
      pointer: {
        x: 0,
        y: 0,
        isDown: false,
        justPressed: false,
        justReleased: false,
        inside: false,
      },
      lastActiveDevice: 'keyboard',
      activeGamepad: null,
      connectedGamepads: 0,
    };
  }


  public attachStageElement(el: HTMLElement): void {
    this.keyboard.attachStageElement(el);
  }

  public setDeadzone(deadzone: number): void {
    this.gamepad.setDeadzone(deadzone);
  }

  public getDeadzone(): number {
    return this.gamepad.getDeadzone();
  }

  /**
   * Polls all providers once per frame, blends axes by largest magnitude (clamped [-1, 1]),
   * ORs discrete actions, computes edge triggers, and updates lastActiveDevice.
   */
  public update(): InputState {
    const snapshots = this.providers.map((p) => p.poll());

    const axes: Record<AxisId, number> = { moveX: 0, moveY: 0, throttle: 0 };
    const pressedNow = new Map<ActionId, boolean>();
    for (const a of ALL_ACTIONS) pressedNow.set(a, false);

    let pointerDownNow = false;
    let pointerUpdated = false;

    for (let idx = 0; idx < snapshots.length; idx++) {
      const snap = snapshots[idx];
      const provider = this.providers[idx];
      const sig = JSON.stringify({
        axes: snap.axes,
        actions: snap.actions,
        down: snap.pointer?.isDown ?? false,
      });
      const prevSig = this.prevProviderSignatures.get(provider);
      this.prevProviderSignatures.set(provider, sig);
      if (snap.active && sig !== prevSig) {
        this.lastActiveDevice = snap.device;
      }

      for (const axis of ALL_AXES) {
        const val = snap.axes[axis];
        if (val !== undefined && Math.abs(val) > Math.abs(axes[axis])) {
          axes[axis] = clampAxis(val);
        }
      }

      for (const action of ALL_ACTIONS) {
        if (snap.actions[action]) {
          pressedNow.set(action, true);
        }
      }

      if (snap.pointer) {
        if (!pointerUpdated || snap.pointer.isDown || snap.pointer.inside) {
          this.lastPointerX = snap.pointer.x;
          this.lastPointerY = snap.pointer.y;
          this.lastPointerInside = snap.pointer.inside;
          pointerUpdated = true;
        }
        if (snap.pointer.isDown) {
          pointerDownNow = true;
        }
      }
    }

    if (axes.throttle === 0 && axes.moveY !== 0) {
      axes.throttle = clampAxis(-axes.moveY);
    }

    const actions = {} as Record<ActionId, ActionState>;
    for (const action of ALL_ACTIONS) {
      const isPressed = pressedNow.get(action) ?? false;
      const wasPressed = this.prevActions.get(action) ?? false;
      actions[action] = {
        isPressed,
        justPressed: isPressed && !wasPressed,
        justReleased: !isPressed && wasPressed,
      };
      this.prevActions.set(action, isPressed);
    }

    const pointer: PointerState = {
      x: this.lastPointerX,
      y: this.lastPointerY,
      isDown: pointerDownNow,
      justPressed: pointerDownNow && !this.prevPointerDown,
      justReleased: !pointerDownNow && this.prevPointerDown,
      inside: this.lastPointerInside,
    };
    this.prevPointerDown = pointerDownNow;

    this.state = {
      axes,
      actions,
      pointer,
      lastActiveDevice: this.lastActiveDevice,
      activeGamepad: this.gamepad.getActiveGamepadInfo(),
      connectedGamepads: this.gamepad.getConnectedCount(),
    };

    return this.state;
  }

  public getState(): InputState {
    return this.state;
  }

  public getAxis(axis: AxisId): number {
    return this.state.axes[axis];
  }

  public isPressed(action: ActionId): boolean {
    return this.state.actions[action].isPressed;
  }

  public justPressed(action: ActionId): boolean {
    return this.state.actions[action].justPressed;
  }

  public justReleased(action: ActionId): boolean {
    return this.state.actions[action].justReleased;
  }

  public dispose(): void {
    for (const p of this.providers) {
      p.dispose?.();
    }
  }
}

