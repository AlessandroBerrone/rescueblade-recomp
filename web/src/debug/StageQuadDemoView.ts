import { ALL_ACTIONS, type ActionId, type InputManager, type InputState } from '../engine/InputManager.ts';
import {
  loadGameAssets,
  memberKey,
  type GameId,
  type LoadedGameBundle,
} from '../engine/assets/AssetLoader.ts';
import { TextTextureCache } from '../engine/render/TextTextureCache.ts';
import { WebGL2StageRenderer } from '../engine/render/WebGL2StageRenderer.ts';
import { DIRECTOR_INK, type Quad2D, type RenderSprite } from '../engine/render/types.ts';

type DemoMode = 'live25d' | 'score';

export class StageQuadDemoView {
  public readonly stageCanvas: HTMLCanvasElement;
  private readonly renderer: WebGL2StageRenderer;
  private readonly textCache: TextTextureCache;
  private readonly stickCanvas: HTMLCanvasElement;
  private readonly stickCtx: CanvasRenderingContext2D;
  private readonly deviceBadge: HTMLElement;
  private readonly padLabel: HTMLElement;
  private readonly pointerLabel: HTMLElement;
  private readonly statusLabel: HTMLElement;
  private readonly levelSelect: HTMLSelectElement;
  private readonly frameSlider: HTMLInputElement;
  private readonly frameLabel: HTMLElement;
  private readonly axisEls: Record<'moveX' | 'moveY' | 'throttle', { val: HTMLElement; fill: HTMLElement }>;
  private readonly actionEls = new Map<ActionId, HTMLElement>();

  private bundles = new Map<GameId, LoadedGameBundle>();
  private activeGame: GameId = 'rescueblade';
  private activeMode: DemoMode = 'live25d';
  private activeLevel = 1;
  private inspectFrame = 4;

  // Live 2.5D copter + scrolling camera state (mirrors Copter.ls + QuadTileNear/Far)
  private mapXPos = 0;
  private copterY = 140;
  private velX = 0;
  private velY = 0;
  private tiltAngle = 0;
  private tick = 0;
  private smokePuffs: { x: number; y: number; size: number; rot: number; blend: number }[] = [];

  constructor(root: HTMLElement, private readonly input: InputManager) {
    root.innerHTML = `
      <div class="layout">
        <div class="panel stage-wrap">
          <div class="row">
            <h1>WebGL2 Stage 512×330 — Sprite Quad &amp; Ink</h1>
            <span id="dbg-status" class="badge">Caricamento...</span>
          </div>
          <canvas id="stage-canvas" width="512" height="330"></canvas>
          <div class="row" style="margin-top:10px;flex-wrap:wrap">
            <select id="sel-game">
              <option value="rescueblade">RescueBlade (rescueblade)</option>
              <option value="bermuda">RescueBlade: Bermuda Triangle</option>
            </select>
            <select id="sel-mode">
              <option value="live25d">Live 2.5D Quad + Copter</option>
              <option value="score">Score Frame Inspector</option>
            </select>
            <select id="sel-level"></select>
            <span style="display:flex;align-items:center;gap:6px">
              Frame: <input id="sel-frame" type="range" min="1" max="50" value="4" style="width:90px" />
              <b id="lbl-frame">4</b>
            </span>
          </div>
        </div>
        <div class="panel">
          <div class="row">
            <span>Input: <span id="dbg-device" class="badge">keyboard</span></span>
            <span id="dbg-pad">Gamepad: nessuno</span>
          </div>
          <div class="row">
            <label for="dbg-dz">Deadzone radiale: <b id="dbg-dz-val">0.15</b></label>
            <input id="dbg-dz" type="range" min="0" max="0.40" step="0.01" value="0.15" />
            <button id="btn-sim-touch" type="button">Simula Touch</button>
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
        </div>
      </div>
    `;

    this.stageCanvas = root.querySelector<HTMLCanvasElement>('#stage-canvas')!;
    this.renderer = new WebGL2StageRenderer(this.stageCanvas, 512, 330);
    this.textCache = new TextTextureCache(this.renderer);
    this.stickCanvas = root.querySelector<HTMLCanvasElement>('#stick-canvas')!;
    this.stickCtx = this.stickCanvas.getContext('2d')!;
    this.deviceBadge = root.querySelector('#dbg-device')!;
    this.padLabel = root.querySelector('#dbg-pad')!;
    this.pointerLabel = root.querySelector('#dbg-pointer')!;
    this.statusLabel = root.querySelector('#dbg-status')!;
    this.levelSelect = root.querySelector<HTMLSelectElement>('#sel-level')!;
    this.frameSlider = root.querySelector<HTMLInputElement>('#sel-frame')!;
    this.frameLabel = root.querySelector('#lbl-frame')!;
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
    this.bindControls(root);
    void this.ensureGameLoaded('rescueblade');
  }


  private bindControls(root: HTMLElement): void {
    const gameSel = root.querySelector<HTMLSelectElement>('#sel-game')!;
    const modeSel = root.querySelector<HTMLSelectElement>('#sel-mode')!;
    gameSel.addEventListener('change', () => {
      this.activeGame = gameSel.value as GameId;
      this.activeLevel = 1;
      void this.ensureGameLoaded(this.activeGame);
    });
    modeSel.addEventListener('change', () => {
      this.activeMode = modeSel.value as DemoMode;
    });
    this.levelSelect.addEventListener('change', () => {
      this.activeLevel = Number(this.levelSelect.value) || 1;
      this.mapXPos = 0;
    });
    this.frameSlider.addEventListener('input', () => {
      this.inspectFrame = Number(this.frameSlider.value) || 1;
      const b = this.bundles.get(this.activeGame);
      const lbl = b?.manifest.frameLabels.find((l) => l.frame === this.inspectFrame)?.label;
      this.frameLabel.textContent = lbl ? `${this.inspectFrame} (${lbl})` : `${this.inspectFrame}`;
    });

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
    window.addEventListener('pointerup', () => {
      if (touchActive) {
        touchActive = false;
        this.input.touch.reset();
      }
    });
  }

  private async ensureGameLoaded(gameId: GameId): Promise<void> {
    if (!this.bundles.has(gameId)) {
      this.statusLabel.textContent = `Carico ${gameId}...`;
      const bundle = await loadGameAssets(gameId, this.renderer);
      this.bundles.set(gameId, bundle);
    }
    const b = this.bundles.get(gameId)!;
    this.statusLabel.textContent = `${gameId} (${b.texturesByKey.size} tex)`;
    this.levelSelect.innerHTML = '';
    for (const lv of [...b.mapsByLevel.keys()].sort((a, z) => a - z)) {
      const opt = document.createElement('option');
      opt.value = String(lv);
      opt.textContent = `Level ${lv}`;
      this.levelSelect.appendChild(opt);
    }
  }

  public render(state: InputState): void {
    this.tick++;
    const bundle = this.bundles.get(this.activeGame);
    if (bundle) {
      if (this.activeMode === 'live25d') {
        this.renderLive25D(bundle, state);
      } else {
        this.renderScoreFrame(bundle);
      }
    } else {
      this.renderer.renderFrame([119, 187, 255], []);
    }
    this.updateHud(state);
  }


  private renderLive25D(bundle: LoadedGameBundle, state: InputState): void {
    const map = bundle.mapsByLevel.get(this.activeLevel) ?? bundle.mapsByLevel.get(1);
    const tileIds = map?.tileIds ?? [0];
    const heights = map?.tileHeights ?? [0];
    const count = Math.max(1, tileIds.length);
    const worldW = count * 128;

    this.tiltAngle = Math.max(-30, Math.min(30, this.tiltAngle + state.axes.moveX * 1.4));
    if (Math.abs(state.axes.moveX) < 0.05) this.tiltAngle *= 0.92;
    this.velX = (this.velX + state.axes.moveX * 0.45) * 0.94;
    this.velY = (this.velY + state.axes.moveY * 0.45) * 0.92;
    this.mapXPos = ((this.mapXPos + this.velX * 2.4) % worldW + worldW) % worldW;
    this.copterY = Math.max(28, Math.min(245, this.copterY + this.velY * 2.2));

    const sprites: RenderSprite[] = [];
    const sky = bundle.texturesByKey.get(memberKey(3, 44));
    if (sky) {
      sprites.push({
        spriteNum: 1, texture: sky, locH: 256, locV: 128,
        width: 512, height: 256, locZ: 1, rotation: 0, flipH: false, flipV: false, blend: 100, ink: 0, quad: null,
      });
    }

    const seaFrame = (Math.floor(this.tick / 3) % 22) + 1;
    const tileMemberFor = (tid: number, isFar: boolean): number => {
      switch (tid) {
        case 0: return seaFrame;
        case 1: return 23;
        case 2: return 23 + seaFrame;
        case 3: return 43 + seaFrame;
        case 4: return isFar ? 65 : 64;
        case 5: return isFar ? 67 : 66;
        case 6: return 68;
        case 7: return isFar ? 69 : 70;
        default: return isFar ? 70 : 69;
      }
    };

    const startTile = Math.floor(this.mapXPos / 128);
    const subX = this.mapXPos - startTile * 128;
    for (let k = -2; k <= 6; k++) {
      const idx = ((startTile + k) % count + count) % count;
      const nextIdx = (idx + 1) % count;
      const tid = tileIds[idx];
      const hL = heights[idx] ?? 0;
      const hR = heights[nextIdx] ?? 0;
      const xCenter = k * 128 + 64 - subX;
      const xL = xCenter - 64;
      const xR = xCenter + 64;

      const farTex = bundle.texturesByKey.get(memberKey(2, tileMemberFor(tid, true)));
      if (farTex) {
        const farQuad: Quad2D = [
          { x: xL + (256 - xL) * 0.5, y: 256 },
          { x: xR + (256 - xR) * 0.5, y: 256 },
          { x: xR, y: 280 - hR },
          { x: xL, y: 280 - hL },
        ];
        sprites.push({
          spriteNum: 10 + k, texture: farTex, locH: xCenter, locV: 268,
          width: 128, height: 24, locZ: 2, rotation: 0, flipH: false, flipV: false, blend: 100, ink: 0, quad: farQuad,
        });
      }

      const nearTex = bundle.texturesByKey.get(memberKey(2, tileMemberFor(tid, false)));
      if (nearTex) {
        const nearQuad: Quad2D = [
          { x: xL, y: 280 - hL },
          { x: xR, y: 280 - hR },
          { x: xR + (xR - 256), y: 330 },
          { x: xL + (xL - 256), y: 330 },
        ];
        sprites.push({
          spriteNum: 30 + k, texture: nearTex, locH: xCenter, locV: 305,
          width: 128, height: 50, locZ: 1000, rotation: 0, flipH: false, flipV: false, blend: 100, ink: 0, quad: nearQuad,
        });
      }
    }

    if (state.actions.action.isPressed && this.tick % 4 === 0) {
      this.smokePuffs.push({ x: 256, y: this.copterY, size: 12, rot: 0, blend: 90 });
    }
    const smokeTex = bundle.texturesByKey.get(memberKey(3, 72));
    const smokeMask = bundle.texturesByKey.get(memberKey(3, 73));
    this.smokePuffs = this.smokePuffs.filter((p) => p.blend > 2);
    this.smokePuffs.forEach((p, idx) => {
      p.x -= this.velX * 2.4;
      p.y -= 1.2;
      p.size += 1.4;
      p.rot += 3;
      p.blend -= 2;
      if (smokeTex && smokeMask) {
        sprites.push({
          spriteNum: 60 + idx, texture: smokeTex, maskTexture: smokeMask,
          locH: p.x, locV: p.y, width: p.size, height: p.size, locZ: 105,
          rotation: p.rot, flipH: false, flipV: false, blend: p.blend, ink: DIRECTOR_INK.MASK, quad: null,
        });
      }
    });

    const rotor = Math.floor(this.tick / 2) % 2;
    const bankFrame = Math.max(1, Math.min(21, Math.round(11 - (this.tiltAngle / 30) * 10)));
    const copterTex = bundle.texturesByKey.get(memberKey(3, bankFrame + rotor * 21));
    if (copterTex) {
      sprites.push({
        spriteNum: 80, texture: copterTex, locH: 256, locV: this.copterY,
        width: copterTex.width, height: copterTex.height, locZ: 100,
        rotation: this.tiltAngle, flipH: false, flipV: false, blend: 100, ink: 0, quad: null,
      });
    }

    this.renderer.renderFrame(bundle.manifest.stage.bgColor, sprites);
  }


  private renderScoreFrame(bundle: LoadedGameBundle): void {
    const fr = bundle.score[this.inspectFrame - 1];
    if (!fr) {
      this.renderer.renderFrame(bundle.manifest.stage.bgColor, []);
      return;
    }

    const sprites: RenderSprite[] = [];
    for (const sp of fr.sprites) {
      const key = memberKey(sp.castLib, sp.member);
      const mem = bundle.membersByKey.get(key);
      let tex = bundle.texturesByKey.get(key) ?? null;
      let maskTex = null;

      if (!tex && mem?.type === 15 && mem.xtra?.text !== undefined) {
        tex = this.textCache.getOrCreate(`${bundle.gameId}:${key}`, mem.xtra.text, sp.width, sp.height);
      }
      if (sp.ink === DIRECTOR_INK.MASK) {
        maskTex = bundle.texturesByKey.get(memberKey(sp.castLib, sp.member + 1)) ?? null;
      }

      sprites.push({
        spriteNum: sp.spriteNum,
        texture: tex,
        maskTexture: maskTex,
        locH: sp.locH,
        locV: sp.locV,
        width: sp.width,
        height: sp.height,
        locZ: sp.spriteNum,
        rotation: 0,
        flipH: false,
        flipV: false,
        blend: 100,
        ink: sp.ink,
        quad: null,
      });
    }

    this.renderer.renderFrame(bundle.manifest.stage.bgColor, sprites);
  }

  private updateHud(state: InputState): void {
    this.deviceBadge.textContent = state.lastActiveDevice;
    this.padLabel.textContent = state.activeGamepad
      ? `Gamepad #${state.activeGamepad.index}: ${state.activeGamepad.id.slice(0, 26)}`
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
      this.actionEls.get(a)!.classList.toggle('active', state.actions[a].isPressed);
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
      c.arc(cx + state.activeGamepad.rawStickX * r, cy + state.activeGamepad.rawStickY * r, 4, 0, Math.PI * 2);
      c.fill();
    }

    c.fillStyle = '#38bdf8';
    c.beginPath();
    c.arc(cx + state.axes.moveX * r, cy + state.axes.moveY * r, 5, 0, Math.PI * 2);
    c.fill();
  }
}

