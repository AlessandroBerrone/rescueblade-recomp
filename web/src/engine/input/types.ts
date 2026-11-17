export type InputDeviceKind = 'keyboard' | 'gamepad' | 'touch';

export type AxisId = 'moveX' | 'moveY' | 'throttle';

export type ActionId =
  | 'action'      // Space / A / X / RT: winch toggle, airbrake, water spray, camera snap
  | 'confirm'     // Enter / Space / A: menu & briefing confirm
  | 'cancel'      // Backspace / Escape / B: back
  | 'pause'       // P / Escape / Start: pause toggle
  | 'up'          // ArrowUp / W / D-Pad Up / Stick Up
  | 'down'        // ArrowDown / S / D-Pad Down / Stick Down
  | 'left'        // ArrowLeft / A / D-Pad Left / Stick Left
  | 'right'       // ArrowRight / D / D-Pad Right / Stick Right
  | 'cheatUnlock'; // R + I + X held (MenuScreen Easter Egg)

export const ALL_AXES: readonly AxisId[] = ['moveX', 'moveY', 'throttle'];

export const ALL_ACTIONS: readonly ActionId[] = [
  'action',
  'confirm',
  'cancel',
  'pause',
  'up',
  'down',
  'left',
  'right',
  'cheatUnlock',
];

export interface ActionState {
  readonly isPressed: boolean;
  readonly justPressed: boolean;
  readonly justReleased: boolean;
}

export interface PointerState {
  readonly x: number;
  readonly y: number;
  readonly isDown: boolean;
  readonly justPressed: boolean;
  readonly justReleased: boolean;
  readonly inside: boolean;
}

export interface GamepadInfo {
  readonly index: number;
  readonly id: string;
  readonly mapping: string;
  readonly rawStickX: number;
  readonly rawStickY: number;
  readonly filteredStickX: number;
  readonly filteredStickY: number;
}

export interface InputState {
  readonly axes: Readonly<Record<AxisId, number>>;
  readonly actions: Readonly<Record<ActionId, ActionState>>;
  readonly pointer: PointerState;
  readonly lastActiveDevice: InputDeviceKind;
  readonly activeGamepad: GamepadInfo | null;
  readonly connectedGamepads: number;
}

export interface ProviderFrameInput {
  readonly device: InputDeviceKind;
  readonly active: boolean;
  readonly axes: Partial<Record<AxisId, number>>;
  readonly actions: Partial<Record<ActionId, boolean>>;
  readonly pointer?: {
    x: number;
    y: number;
    isDown: boolean;
    inside: boolean;
  };
}

export interface InputProvider {
  readonly device: InputDeviceKind;
  poll(): ProviderFrameInput;
  dispose?(): void;
}
