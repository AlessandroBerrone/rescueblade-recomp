import { ALL_ACTIONS, type ActionId, type InputManager, type InputState } from './engine/InputManager.ts';
import {
  applyHudTextures,
  loadGameAssets,
  type GameId,
  type LoadedGameBundle,
} from './engine/assets/AssetLoader.ts';
import { SoundEngine } from './engine/audio/SoundEngine.ts';
import { TextTextureCache } from './engine/render/TextTextureCache.ts';
import { WebGL2StageRenderer } from './engine/render/WebGL2StageRenderer.ts';
import { MovieRuntime } from './engine/runtime/MovieRuntime.ts';
import { createBehaviorRegistry } from './games/registry.ts';

export class GameShell {
  public readonly stageCanvas: HTMLCanvasElement;
  private readonly renderer: WebGL2StageRenderer;
  private readonly textCache: TextTextureCache;
  private readonly sound: SoundEngine;
  private readonly bundles = new Map<GameId, LoadedGameBundle>();
  private runtime: MovieRuntime | null = null;
  private activeGame: GameId = 'rescueblade';
  private loading = false;
  private hdHud = true;

  private readonly statusEl: HTMLElement;
  private readonly frameEl: HTMLElement;
  private readonly deviceEl: HTMLElement;
  private readonly padEl: HTMLElement;
  private readonly controlsBtn: HTMLButtonElement;
  private readonly muteBtn: HTMLButtonElement;
  private readonly hudBtn: HTMLButtonElement;
  private readonly actionEls = new Map<ActionId, HTMLElement>();
  private readonly axisEls: Record<'moveX' | 'moveY' | 'throttle', { val: HTMLElement; fill: HTMLElement }>;

  constructor(root: HTMLElement, private readonly input: InputManager) {
    root.innerHTML = `
      <div class="layout">
        <div class="panel stage-wrap">
          <div class="row">
            <h1>RescueBlade Recomp (WebGL2 + WebAudio)</h1>
            <span id="gs-status" class="badge">Caricamento...</span>
          </div>
          <canvas id="stage-canvas" width="512" height="330"></canvas>
          <div class="row" style="margin-top:10px;flex-wrap:wrap">
            <select id="gs-game">
              <option value="rescueblade">RescueBlade (9 Livelli)</option>
              <option value="bermuda">RescueBlade: Bermuda Triangle (4 Livelli)</option>
            </select>
            <button id="gs-controls" type="button">Controlli: Simplified</button>
            <button id="gs-menu" type="button">Menu</button>
            <button id="gs-hud" type="button">HUD: HD</button>
            <button id="gs-mute" type="button">Audio: ON</button>
            <button id="gs-fs" type="button">Fullscreen</button>
          </div>
          <div class="row" style="font-size:12px;color:#94a3b8;margin-top:4px">
            <span>Frecce/WASD o Stick: Volo &bull; Spazio/A: Verricello / Acqua / Foto &bull; P/Start: Pausa &bull; R+I+X: Sblocca livelli</span>
            <span id="gs-frame">F1</span>
          </div>
        </div>
        <div class="panel">
          <div class="row">
            <span>Input: <span id="dbg-device" class="badge">keyboard</span></span>
            <span id="dbg-pad">Gamepad: nessuno</span>
          </div>
          <div class="row">
            <label for="dbg-dz">Deadzone: <b id="dbg-dz-val">0.15</b></label>
            <input id="dbg-dz" type="range" min="0" max="0.40" step="0.01" value="0.15" />
            <label for="gs-vol">Vol:</label>
            <input id="gs-vol" type="range" min="0" max="1" step="0.05" value="0.8" style="width:70px" />
          </div>
          <div style="margin:8px 0">
            <div class="row"><span>moveX</span><div class="axis-bar"><div id="fill-moveX" class="axis-fill"></div></div><b id="val-moveX">0.00</b></div>
            <div class="row"><span>moveY</span><div class="axis-bar"><div id="fill-moveY" class="axis-fill"></div></div><b id="val-moveY">0.00</b></div>
            <div class="row"><span>throttle</span><div class="axis-bar"><div id="fill-throttle" class="axis-fill"></div></div><b id="val-throttle">0.00</b></div>
          </div>
          <div id="dbg-actions" class="actions-grid"></div>
        </div>
      </div>
    `;

    const initialScale = this.getTargetHdScale();
    this.stageCanvas = root.querySelector<HTMLCanvasElement>('#stage-canvas')!;
    this.renderer = new WebGL2StageRenderer(this.stageCanvas, 512, 330, initialScale);
    this.textCache = new TextTextureCache(this.renderer, initialScale);
    this.sound = new SoundEngine();

    this.statusEl = root.querySelector('#gs-status')!;
    this.frameEl = root.querySelector('#gs-frame')!;
    this.deviceEl = root.querySelector('#dbg-device')!;
    this.padEl = root.querySelector('#dbg-pad')!;
    this.controlsBtn = root.querySelector('#gs-controls')!;
    this.muteBtn = root.querySelector('#gs-mute')!;
    this.hudBtn = root.querySelector('#gs-hud')!;
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

    this.bindUI(root);
    void this.switchGame('rescueblade');
  }

  private bindUI(root: HTMLElement): void {
    const unlockAudio = () => { void this.sound.unlock(); };
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });

    const gameSel = root.querySelector<HTMLSelectElement>('#gs-game')!;
    gameSel.addEventListener('change', () => {
      void this.switchGame(gameSel.value as GameId);
    });

    this.controlsBtn.addEventListener('click', () => {
      if (!this.runtime) return;
      this.runtime.globals.gProControls = this.runtime.globals.gProControls === 1 ? 0 : 1;
      this.controlsBtn.textContent = `Controlli: ${this.runtime.globals.gProControls === 1 ? 'Pro' : 'Simplified'}`;
    });

    root.querySelector<HTMLButtonElement>('#gs-menu')!.addEventListener('click', () => {
      if (!this.runtime) return;
      this.sound.stopAll();
      this.runtime.go('MenuScreen');
    });

    this.hudBtn.addEventListener('click', () => {
      this.hdHud = !this.hdHud;
      this.applyHudMode();
    });

    document.addEventListener('fullscreenchange', () => {
      if (this.hdHud) {
        this.applyHudMode();
      }
    });

    this.muteBtn.addEventListener('click', () => {
      this.sound.setMuted(!this.sound.isMuted());
      this.muteBtn.textContent = `Audio: ${this.sound.isMuted() ? 'OFF' : 'ON'}`;
    });

    root.querySelector<HTMLButtonElement>('#gs-fs')!.addEventListener('click', () => {
      if (document.fullscreenElement) void document.exitFullscreen?.();
      else void this.stageCanvas.requestFullscreen?.();
    });

    const dzSlider = root.querySelector<HTMLInputElement>('#dbg-dz')!;
    const dzVal = root.querySelector('#dbg-dz-val')!;
    dzSlider.addEventListener('input', () => {
      const v = Number(dzSlider.value);
      dzVal.textContent = v.toFixed(2);
      this.input.setDeadzone(v);
    });

    root.querySelector<HTMLInputElement>('#gs-vol')!.addEventListener('input', (e) => {
      this.sound.setMasterVolume(Number((e.target as HTMLInputElement).value));
    });
  }

  private async switchGame(gameId: GameId): Promise<void> {
    this.activeGame = gameId;
    this.loading = true;
    this.sound.stopAll();
    this.statusEl.textContent = `Carico ${gameId}...`;

    let bundle = this.bundles.get(gameId);
    if (!bundle) {
      bundle = await loadGameAssets(gameId, this.renderer, this.hdHud);
      this.bundles.set(gameId, bundle);
    } else {
      applyHudTextures(bundle, this.hdHud);
    }
    await this.sound.loadGameSounds(gameId, bundle.manifest);
    if (this.activeGame !== gameId) return;

    const registry = createBehaviorRegistry(gameId);
    this.runtime = new MovieRuntime(bundle, this.input, this.sound, this.textCache, registry);
    this.controlsBtn.textContent = `Controlli: ${this.runtime.globals.gProControls === 1 ? 'Pro' : 'Simplified'}`;
    this.statusEl.textContent = `${gameId} (${bundle.texturesByKey.size} tex)`;
    this.loading = false;
  }

  private getTargetHdScale(): number {
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const isFs = typeof document !== 'undefined' && document.fullscreenElement === this.stageCanvas;
    return isFs ? 4 : Math.max(3, Math.min(4, Math.ceil(dpr * 2)));
  }

  private applyHudMode(): void {
    const scale = this.hdHud ? this.getTargetHdScale() : 1;
    this.renderer.setRenderScale(scale);
    this.textCache.setScale(scale);
    for (const bundle of this.bundles.values()) {
      applyHudTextures(bundle, this.hdHud);
    }
    this.hudBtn.textContent = `HUD: ${this.hdHud ? 'HD' : 'Originale'}`;
  }

  public tick(dtSec: number, state: InputState): void {
    if (this.runtime && !this.loading) {
      this.runtime.updateFixedTimestep(dtSec, state);
      this.renderer.renderFrame(this.runtime.bundle.manifest.stage.bgColor, this.runtime.toRenderSprites());
      const lbl = this.runtime.bundle.manifest.frameLabels.find((l) => l.frame === this.runtime!.currentFrame)?.label;
      this.frameEl.textContent = lbl ? `F${this.runtime.currentFrame} (${lbl})` : `F${this.runtime.currentFrame}`;
    } else {
      this.renderer.renderFrame([119, 187, 255], []);
    }

    this.deviceEl.textContent = state.lastActiveDevice;
    this.padEl.textContent = state.activeGamepad
      ? `Gamepad #${state.activeGamepad.index}: ${state.activeGamepad.id.slice(0, 24)}`
      : `Gamepad: nessuno (${state.connectedGamepads})`;

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
  }
}

