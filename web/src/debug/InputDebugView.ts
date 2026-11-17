import { ALL_ACTIONS, type ActionId, type InputManager, type InputState } from '../engine/InputManager.ts';

export class InputDebugView {
  public readonly stageCanvas: HTMLCanvasElement;
  private readonly stageCtx: CanvasRenderingContext2D;
  private readonly stickCanvas: HTMLCanvasElement;
  private readonly stickCtx: CanvasRenderingContext2D;
  private readonly deviceBadge: HTMLElement;
  private readonly padLabel: HTMLElement;
  private readonly pointerLabel: HTMLElement;
  private readonly axisEls: Record<'moveX' | 'moveY' | 'throttle', { val: HTMLElement; fill: HTMLElement }>;
  private readonly actionEls = new Map<ActionId, HTMLElement>();
  private readonly logEl: HTMLElement;
  private readonly logs: string[] = [];

  private copterX = 256;
  private copterY = 165;
  private copterTilt = 0;

  constructor(root: HTMLElement, private readonly input: InputManager) {
    root.innerHTML = `
      <div class="layout">
        <div class="panel stage-wrap">
          <h1>Stage Debug 512×330 (InputManager)</h1>
          <canvas id="stage-canvas" width="512" height="330"></canvas>
          <div class="row" style="margin-top:10px">
            <span>Controlli: <b>Frecce / WASD</b>, <b>Spazio</b> (azione), <b>P</b> (pausa), <b>Gamepad</b></span>
            <button id="btn-sim-touch" type="button">Simula Touch</button>
          </div>
        </div>
        <div class="panel">
          <div class="row">
            <span>Dispositivo attivo: <span id="dbg-device" class="badge">keyboard</span></span>
            <span id="dbg-pad">Gamepad: nessuno</span>
          </div>
          <div class="row">
            <label for="dbg-dz">Deadzone radiale: <b id="dbg-dz-val">0.15</b></label>
            <input id="dbg-dz" type="range" min="0" max="0.40" step="0.01" value="0.15" />
          </div>
          <div class="stick-box">
            <canvas id="stick-canvas" width="110" height="110" style="background:#0b111a;border:1px solid #263952;border-radius:8px"></canvas>
            <div style="flex:1">
              <div class="row"><span>moveX</span><div class="axis-bar"><div id="fill-moveX" class="axis-fill"></div></div><b id="val-moveX">0.00</b></div>
              <div class="row"><span>moveY</span><div class="axis-bar"><div id="fill-moveY" class="axis-fill"></div></div><b id="val-moveY">0.00</b></div>
              <div class="row"><span>throttle</span><div class="axis-bar"><div id="fill-throttle" class="axis-fill"></div></div><b id="val-throttle">0.00</b></div>
              <div class="row"><span id="dbg-pointer">Pointer: (0, 0)</span></div>
            </div>
          </div>
          <div id="dbg-actions" class="actions-grid"></div>
          <div id="dbg-log" class="log"></div>
        </div>
      </div>
    `;

    this.stageCanvas = root.querySelector<HTMLCanvasElement>('#stage-canvas')!;
    this.stageCtx = this.stageCanvas.getContext('2d')!;
    this.stickCanvas = root.querySelector<HTMLCanvasElement>('#stick-canvas')!;
    this.stickCtx = this.stickCanvas.getContext('2d')!;
    this.deviceBadge = root.querySelector('#dbg-device')!;
    this.padLabel = root.querySelector('#dbg-pad')!;
    this.pointerLabel = root.querySelector('#dbg-pointer')!;
    this.logEl = root.querySelector('#dbg-log')!;

    this.axisEls = {
      moveX: { val: root.querySelector('#val-moveX')!, fill: root.querySelector('#fill-moveX')! },
      moveY: { val: root.querySelector('#val-moveY')!, fill: root.querySelector('#fill-moveY')! },
      throttle: { val: root.querySelector('#val-throttle')!, fill: root.querySelector('#fill-throttle')! },
    };

    const actionsGrid = root.querySelector('#dbg-actions')!;
    for (const a of ALL_ACTIONS) {
      const el = document.createElement('span');
      el.className = 'badge';
      el.textContent = a;
      actionsGrid.appendChild(el);
      this.actionEls.set(a, el);
    }

    const dzSlider = root.querySelector<HTMLInputElement>('#dbg-dz')!;
    const dzVal = root.querySelector('#dbg-dz-val')!;
    dzSlider.addEventListener('input', () => {
      const v = Number(dzSlider.value);
      dzVal.textContent = v.toFixed(2);
      this.input.setDeadzone(v);
    });

    const touchBtn = root.querySelector<HTMLButtonElement>('#btn-sim-touch')!;
    let touchActive = false;
    touchBtn.addEventListener('pointerdown', () => {
      touchActive = true;
      this.input.touch.setStick(0.7, -0.5);
      this.input.touch.setAction('action', true);
    });
    const clearTouch = () => {
      if (touchActive) {
        touchActive = false;
        this.input.touch.reset();
      }
    };
    window.addEventListener('pointerup', clearTouch);
  }


  private pushLog(msg: string): void {
    this.logs.unshift(msg);
    if (this.logs.length > 40) this.logs.pop();
    this.logEl.textContent = this.logs.join('\n');
  }

  public render(state: InputState): void {
    this.copterX = Math.max(24, Math.min(488, this.copterX + state.axes.moveX * 4));
    this.copterY = Math.max(24, Math.min(306, this.copterY + state.axes.moveY * 4));
    this.copterTilt = state.axes.moveX * 25;

    const ctx = this.stageCtx;
    ctx.fillStyle = '#77bbff';
    ctx.fillRect(0, 0, 512, 330);
    ctx.fillStyle = '#1b4965';
    ctx.fillRect(0, 280, 512, 50);

    ctx.save();
    ctx.translate(this.copterX, this.copterY);
    ctx.rotate((this.copterTilt * Math.PI) / 180);
    ctx.fillStyle = state.actions.action.isPressed ? '#f59e0b' : '#dc2626';
    ctx.fillRect(-18, -8, 36, 16);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-26, -12, 52, 3);
    ctx.restore();

    if (state.pointer.inside) {
      ctx.strokeStyle = state.pointer.isDown ? '#facc15' : '#0f172a';
      ctx.beginPath();
      ctx.arc(state.pointer.x, state.pointer.y, 7, 0, Math.PI * 2);
      ctx.stroke();
    }

    this.deviceBadge.textContent = state.lastActiveDevice;
    this.padLabel.textContent = state.activeGamepad
      ? `Gamepad #${state.activeGamepad.index}: ${state.activeGamepad.id.slice(0, 28)}`
      : `Gamepad: nessuno (${state.connectedGamepads})`;
    this.pointerLabel.textContent = `Pointer: (${state.pointer.x.toFixed(1)}, ${state.pointer.y.toFixed(1)}) ${state.pointer.isDown ? 'DOWN' : ''}`;

    for (const axis of ['moveX', 'moveY', 'throttle'] as const) {
      const v = state.axes[axis];
      this.axisEls[axis].val.textContent = v.toFixed(2);
      const fill = this.axisEls[axis].fill;
      if (v >= 0) {
        fill.style.left = '50%';
        fill.style.width = `${v * 50}%`;
      } else {
        fill.style.left = `${50 + v * 50}%`;
        fill.style.width = `${-v * 50}%`;
      }
    }

    for (const a of ALL_ACTIONS) {
      const st = state.actions[a];
      this.actionEls.get(a)!.classList.toggle('active', st.isPressed);
      if (st.justPressed) this.pushLog(`[+] ${a} (${state.lastActiveDevice})`);
      if (st.justReleased) this.pushLog(`[-] ${a}`);
    }

    this.drawStickVisualizer(state);
  }

  private drawStickVisualizer(state: InputState): void {
    const c = this.stickCtx;
    const cx = 55;
    const cy = 55;
    const r = 45;
    c.clearRect(0, 0, 110, 110);

    c.strokeStyle = '#334155';
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.stroke();

    c.strokeStyle = '#ef4444';
    c.beginPath();
    c.arc(cx, cy, r * this.input.getDeadzone(), 0, Math.PI * 2);
    c.stroke();

    if (state.activeGamepad) {
      c.fillStyle = '#64748b';
      c.beginPath();
      c.arc(
        cx + state.activeGamepad.rawStickX * r,
        cy + state.activeGamepad.rawStickY * r,
        4,
        0,
        Math.PI * 2
      );
      c.fill();
    }

    c.fillStyle = '#38bdf8';
    c.beginPath();
    c.arc(cx + state.axes.moveX * r, cy + state.axes.moveY * r, 5, 0, Math.PI * 2);
    c.fill();
  }
}

