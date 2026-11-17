import type { ActionId, InputProvider, ProviderFrameInput } from './types.ts';

export interface KeyboardMouseOptions {
  targetWindow?: Window;
  stageElement?: HTMLElement | null;
  stageWidth?: number;
  stageHeight?: number;
}

const PREVENT_DEFAULT_CODES = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
]);

export class KeyboardMouseProvider implements InputProvider {
  public readonly device = 'keyboard' as const;

  private readonly win: Window | undefined;
  private stageEl: HTMLElement | null;
  private stageWidth: number;
  private stageHeight: number;

  private readonly keysDown = new Set<string>();
  private pointerX = 0;
  private pointerY = 0;
  private pointerDown = false;
  private pointerInside = false;
  private dirtyActivity = false;

  constructor(options: KeyboardMouseOptions = {}) {
    this.win = options.targetWindow ?? (typeof window !== 'undefined' ? window : undefined);
    this.stageEl = options.stageElement ?? null;
    this.stageWidth = options.stageWidth ?? 512;
    this.stageHeight = options.stageHeight ?? 330;

    if (this.win) {
      this.win.addEventListener('keydown', this.onKeyDown);
      this.win.addEventListener('keyup', this.onKeyUp);
      this.win.addEventListener('blur', this.onBlur);
    }
    if (this.stageEl) {
      this.attachStageElement(this.stageEl);
    }
  }

  public attachStageElement(el: HTMLElement): void {
    if (this.stageEl && this.stageEl !== el) {
      this.detachStageElement(this.stageEl);
    }
    this.stageEl = el;
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointerleave', this.onPointerLeave);
    if (this.win) {
      this.win.addEventListener('pointerup', this.onPointerUp);
    }
  }

  private detachStageElement(el: HTMLElement): void {
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointerleave', this.onPointerLeave);
    if (this.win) {
      this.win.removeEventListener('pointerup', this.onPointerUp);
    }
  }

  private isEditableTarget(target: EventTarget | null): boolean {
    if (!target || typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) {
      return false;
    }
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (this.isEditableTarget(e.target)) return;
    if (PREVENT_DEFAULT_CODES.has(e.code)) {
      e.preventDefault();
    }
    if (!this.keysDown.has(e.code)) {
      this.dirtyActivity = true;
    }
    this.keysDown.add(e.code);
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.keysDown.delete(e.code);
  };

  private readonly onBlur = (): void => {
    this.keysDown.clear();
    this.pointerDown = false;
  };

  private updatePointerCoords(e: PointerEvent): void {
    if (!this.stageEl) return;
    const rect = this.stageEl.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    this.pointerX = ((e.clientX - rect.left) / rect.width) * this.stageWidth;
    this.pointerY = ((e.clientY - rect.top) / rect.height) * this.stageHeight;
    this.pointerInside =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;
  }


  private readonly onPointerMove = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') return;
    const prevX = this.pointerX;
    const prevY = this.pointerY;
    this.updatePointerCoords(e);
    if (this.pointerInside && Math.hypot(this.pointerX - prevX, this.pointerY - prevY) >= 2) {
      this.dirtyActivity = true;
    }
  };

  private readonly onPointerDown = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') return;
    this.updatePointerCoords(e);
    if (e.button === 0) {
      this.pointerDown = true;
      this.dirtyActivity = true;
    }
  };

  private readonly onPointerUp = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') return;
    this.updatePointerCoords(e);
    if (e.button === 0) {
      this.pointerDown = false;
    }
  };

  private readonly onPointerLeave = (): void => {
    this.pointerInside = false;
  };

  /** Imperative helper for deterministic testing without DOM events. */
  public setKeyForTest(code: string, pressed: boolean): void {
    if (pressed) {
      this.keysDown.add(code);
      this.dirtyActivity = true;
    } else {
      this.keysDown.delete(code);
    }
  }

  public setPointerForTest(x: number, y: number, isDown: boolean, inside = true): void {
    this.pointerX = x;
    this.pointerY = y;
    this.pointerDown = isDown;
    this.pointerInside = inside;
    if (isDown) this.dirtyActivity = true;
  }

  private hasAny(...codes: string[]): boolean {
    for (const c of codes) {
      if (this.keysDown.has(c)) return true;
    }
    return false;
  }

  public poll(): ProviderFrameInput {
    const left = this.hasAny('ArrowLeft', 'KeyA');
    const right = this.hasAny('ArrowRight', 'KeyD');
    const up = this.hasAny('ArrowUp', 'KeyW');
    const down = this.hasAny('ArrowDown', 'KeyS');

    const moveX = (right ? 1 : 0) - (left ? 1 : 0);
    const moveY = (down ? 1 : 0) - (up ? 1 : 0);
    const throttle = -moveY;

    const space = this.hasAny('Space');
    const enter = this.hasAny('Enter', 'NumpadEnter');
    const esc = this.hasAny('Escape');
    const back = this.hasAny('Backspace');
    const pauseKey = this.hasAny('KeyP');
    const cheatUnlock = this.hasAny('KeyR') && this.hasAny('KeyI') && this.hasAny('KeyX');

    const actions: Record<ActionId, boolean> = {
      action: space,
      confirm: space || enter,
      cancel: back || esc,
      pause: pauseKey || esc,
      up,
      down,
      left,
      right,
      cheatUnlock,
    };

    const anyKeyOrPointer =
      this.dirtyActivity || this.keysDown.size > 0 || this.pointerDown;
    this.dirtyActivity = false;

    return {
      device: this.device,
      active: anyKeyOrPointer,
      axes: { moveX, moveY, throttle },
      actions,
      pointer: {
        x: this.pointerX,
        y: this.pointerY,
        isDown: this.pointerDown,
        inside: this.pointerInside,
      },
    };
  }

  public dispose(): void {
    if (this.win) {
      this.win.removeEventListener('keydown', this.onKeyDown);
      this.win.removeEventListener('keyup', this.onKeyUp);
      this.win.removeEventListener('blur', this.onBlur);
    }
    if (this.stageEl) {
      this.detachStageElement(this.stageEl);
    }
  }
}

