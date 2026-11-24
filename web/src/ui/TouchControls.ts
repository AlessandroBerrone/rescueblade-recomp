import type { ActionId, VirtualTouchProvider } from '../engine/InputManager.ts';

export interface TouchControlsOptions {
  /** Element that holds the canvas; the controls overlay is appended to it. */
  host: HTMLElement;
  canvas: HTMLCanvasElement;
  touch: VirtualTouchProvider;
  stageWidth: number;
  stageHeight: number;
  onToggleOptions: () => void;
  onToggleFullscreen: () => void;
  fullscreenSupported: boolean;
}

/** Stick travel in CSS px from the centre to full deflection. */
const STICK_RADIUS = 52;
/** Below this fraction of full deflection the stick reads as centred. */
const STICK_DEADZONE = 0.12;

interface ButtonDef {
  id: string;
  label: string;
  actions: ActionId[];
  className: string;
}

const BUTTONS: ButtonDef[] = [
  // Same mapping as Space on the keyboard / A on a controller.
  { id: 'tc-action', label: 'A', actions: ['action', 'confirm'], className: 'tc-btn tc-btn-main' },
  { id: 'tc-back', label: 'B', actions: ['cancel'], className: 'tc-btn tc-btn-small tc-btn-back' },
  { id: 'tc-pause', label: '❚❚', actions: ['pause'], className: 'tc-btn tc-btn-small tc-btn-pause' },
];

/**
 * On-screen controls for phones and tablets: an analog stick (flight) on the left,
 * action/back/pause buttons on the right, and taps on the stage forwarded as the
 * Director mouse so menus and briefing screens work by touch.
 */
export class TouchControls {
  public readonly root: HTMLElement;
  private readonly opts: TouchControlsOptions;
  private readonly stickZone: HTMLElement;
  private readonly stickBase: HTMLElement;
  private readonly stickKnob: HTMLElement;
  private stickPointer: number | null = null;
  private stickCenterX = 0;
  private stickCenterY = 0;
  private stagePointer: number | null = null;
  private readonly buttonPointers = new Map<number, ActionId[]>();

  constructor(opts: TouchControlsOptions) {
    this.opts = opts;
    this.root = document.createElement('div');
    this.root.className = 'touch-ui';
    this.root.innerHTML = `
      <div class="tc-top">
        <button type="button" class="tc-icon" id="tc-options" aria-label="Opzioni">⚙</button>
        ${opts.fullscreenSupported ? '<button type="button" class="tc-icon" id="tc-fs" aria-label="Schermo intero">⛶</button>' : ''}
      </div>
      <div class="tc-stick-zone" aria-label="Stick di volo">
        <div class="tc-stick-base"><div class="tc-stick-knob"></div></div>
      </div>
      <div class="tc-buttons">
        ${BUTTONS.map((b) => `<button type="button" id="${b.id}" class="${b.className}">${b.label}</button>`).join('')}
      </div>
      <div class="tc-rotate-hint">Ruota il telefono in orizzontale per uno schermo più grande</div>
    `;
    opts.host.appendChild(this.root);

    this.stickZone = this.root.querySelector('.tc-stick-zone')!;
    this.stickBase = this.root.querySelector('.tc-stick-base')!;
    this.stickKnob = this.root.querySelector('.tc-stick-knob')!;

    this.bindStick();
    this.bindButtons();
    this.bindStage();

    this.root.querySelector('#tc-options')!.addEventListener('click', () => opts.onToggleOptions());
    this.root.querySelector('#tc-fs')?.addEventListener('click', () => opts.onToggleFullscreen());
  }

  private bindStick(): void {
    const zone = this.stickZone;
    zone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this.stickPointer !== null) return;
      this.stickPointer = e.pointerId;
      zone.setPointerCapture?.(e.pointerId);
      const rect = this.stickBase.getBoundingClientRect();
      this.stickCenterX = rect.left + rect.width / 2;
      this.stickCenterY = rect.top + rect.height / 2;
      this.stickBase.classList.add('active');
      this.moveStick(e.clientX, e.clientY);
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.stickPointer) return;
      e.preventDefault();
      this.moveStick(e.clientX, e.clientY);
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== this.stickPointer) return;
      this.stickPointer = null;
      this.stickBase.classList.remove('active');
      this.stickKnob.style.transform = '';
      this.opts.touch.setStick(0, 0);
      this.syncDirections(0, 0);
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
    zone.addEventListener('lostpointercapture', end);
  }

  private moveStick(clientX: number, clientY: number): void {
    let dx = clientX - this.stickCenterX;
    let dy = clientY - this.stickCenterY;
    const dist = Math.hypot(dx, dy);
    if (dist > STICK_RADIUS) {
      dx = (dx / dist) * STICK_RADIUS;
      dy = (dy / dist) * STICK_RADIUS;
    }
    this.stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    const { x, y } = stickToAxes(dx / STICK_RADIUS, dy / STICK_RADIUS);
    this.opts.touch.setStick(x, y);
    this.syncDirections(x, y);
  }

  /** Digital directions too, for screens that read up/down/left/right instead of the axes. */
  private syncDirections(x: number, y: number): void {
    const t = this.opts.touch;
    t.setAction('left', x < -0.5);
    t.setAction('right', x > 0.5);
    t.setAction('up', y < -0.5);
    t.setAction('down', y > 0.5);
  }

  private bindButtons(): void {
    for (const def of BUTTONS) {
      const btn = this.root.querySelector<HTMLButtonElement>(`#${def.id}`)!;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        btn.setPointerCapture?.(e.pointerId);
        this.buttonPointers.set(e.pointerId, def.actions);
        btn.classList.add('active');
        for (const a of def.actions) this.opts.touch.setAction(a, true);
        navigator.vibrate?.(8);
      });
      const end = (e: PointerEvent) => {
        if (!this.buttonPointers.has(e.pointerId)) return;
        this.buttonPointers.delete(e.pointerId);
        btn.classList.remove('active');
        for (const a of def.actions) {
          const stillHeld = [...this.buttonPointers.values()].some((acts) => acts.includes(a));
          if (!stillHeld) this.opts.touch.setAction(a, false);
        }
      };
      btn.addEventListener('pointerup', end);
      btn.addEventListener('pointercancel', end);
      btn.addEventListener('lostpointercapture', end);
      // Keep long presses from opening the context menu / text selection.
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
    }
  }

  /** Finger on the game picture acts as the mouse (menu buttons, briefing, "click to continue"). */
  private bindStage(): void {
    const canvas = this.opts.canvas;
    const toStage = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return stageCoords(e.clientX, e.clientY, rect, this.opts.stageWidth, this.opts.stageHeight);
    };
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' || this.stagePointer !== null) return;
      e.preventDefault();
      this.stagePointer = e.pointerId;
      canvas.setPointerCapture?.(e.pointerId);
      const p = toStage(e);
      this.opts.touch.setTouchPointer(p.x, p.y, true, p.inside);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.stagePointer) return;
      const p = toStage(e);
      this.opts.touch.setTouchPointer(p.x, p.y, true, p.inside);
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== this.stagePointer) return;
      this.stagePointer = null;
      const p = toStage(e);
      // A cancelled touch (e.g. system gesture) must not click whatever is under it.
      const inside = e.type === 'pointercancel' ? false : p.inside;
      this.opts.touch.setTouchPointer(p.x, p.y, false, inside);
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
  }

  /** Releases everything, e.g. when the page is hidden mid-press. */
  public releaseAll(): void {
    this.stickPointer = null;
    this.stagePointer = null;
    this.buttonPointers.clear();
    this.stickKnob.style.transform = '';
    this.stickBase.classList.remove('active');
    for (const b of this.root.querySelectorAll('.tc-btn')) b.classList.remove('active');
    this.opts.touch.reset();
  }
}

/** Maps a normalised stick offset (−1..1, y down) to game axes with a radial deadzone. */
export function stickToAxes(nx: number, ny: number, deadzone = STICK_DEADZONE): { x: number; y: number } {
  const mag = Math.hypot(nx, ny);
  if (mag <= deadzone) return { x: 0, y: 0 };
  const clamped = Math.min(1, mag);
  const scaled = (clamped - deadzone) / (1 - deadzone);
  return { x: (nx / mag) * scaled, y: (ny / mag) * scaled };
}

/** Converts a client position to stage pixels for a canvas drawn at `rect`. */
export function stageCoords(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  stageWidth: number,
  stageHeight: number
): { x: number; y: number; inside: boolean } {
  if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0, inside: false };
  const x = ((clientX - rect.left) / rect.width) * stageWidth;
  const y = ((clientY - rect.top) / rect.height) * stageHeight;
  const inside = x >= 0 && y >= 0 && x <= stageWidth && y <= stageHeight;
  return { x, y, inside };
}

/** True on phones/tablets, or when forced with ?touch=1 (and off with ?touch=0). */
export function wantsTouchControls(win: Window = window): boolean {
  const param = new URLSearchParams(win.location.search).get('touch');
  if (param === '1') return true;
  if (param === '0') return false;
  const coarse = win.matchMedia?.('(pointer: coarse)').matches === true;
  const touchOnly = (win.navigator.maxTouchPoints ?? 0) > 0 && win.matchMedia?.('(hover: none)').matches === true;
  return coarse || touchOnly;
}
