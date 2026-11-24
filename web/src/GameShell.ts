import { ALL_ACTIONS, type ActionId, type InputManager, type InputState } from './engine/InputManager.ts';
import {
  applyTextureModes,
  loadGameAssets,
  loadHdBitmaps,
  type GameId,
  type LoadedGameBundle,
} from './engine/assets/AssetLoader.ts';
import { SoundEngine } from './engine/audio/SoundEngine.ts';
import { TextTextureCache } from './engine/render/TextTextureCache.ts';
import { WebGL2StageRenderer } from './engine/render/WebGL2StageRenderer.ts';
import { MovieRuntime } from './engine/runtime/MovieRuntime.ts';
import { createBehaviorRegistry } from './games/registry.ts';
import { downloadSave, pickAndImportSave } from './engine/runtime/SaveData.ts';
import { gameUrl } from './ui/LaunchScreen.ts';
import { TouchControls, wantsTouchControls } from './ui/TouchControls.ts';

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
  private hdGraphics = readGraphicsPref();

  private readonly statusEl: HTMLElement;
  private readonly frameEl: HTMLElement;
  private readonly deviceEl: HTMLElement;
  private readonly padEl: HTMLElement;
  private readonly controlsBtn: HTMLButtonElement;
  private readonly muteBtn: HTMLButtonElement;
  private readonly hudBtn: HTMLButtonElement;
  private gfxBtn!: HTMLButtonElement;
  private readonly actionEls = new Map<ActionId, HTMLElement>();
  private readonly axisEls: Record<'moveX' | 'moveY' | 'throttle', { val: HTMLElement; fill: HTMLElement }>;
  private readonly stageWrap: HTMLElement;
  private readonly touchControls: TouchControls | null = null;
  private lastDevice = '';

  constructor(root: HTMLElement, private readonly input: InputManager, initialGame: GameId = 'rescueblade') {
    root.innerHTML = `
      <div class="layout">
        <div class="panel stage-wrap">
          <div class="row">
            <h1>RescueBlade Recomp (WebGL2 + WebAudio)</h1>
            <span id="gs-status" class="badge">Caricamento...</span>
          </div>
          <div class="stage-box"><canvas id="stage-canvas" width="512" height="330"></canvas></div>
          <div id="gs-options" class="row options-row" style="margin-top:10px;flex-wrap:wrap">
            <select id="gs-game">
              <option value="rescueblade">RescueBlade (9 Livelli)</option>
              <option value="bermuda">RescueBlade: Bermuda Triangle (4 Livelli)</option>
            </select>
            <button id="gs-controls" type="button">Controlli: Simplified</button>
            <button id="gs-menu" type="button">Menu</button>
            <button id="gs-gfx" type="button" title="Grafica originale o ridisegnata in alta risoluzione (tasto G)">Grafica: HD</button>
            <button id="gs-hud" type="button">HUD: HD</button>
            <button id="gs-mute" type="button">Audio: ON</button>
            <button id="gs-fs" type="button">Fullscreen</button>
            <button id="gs-home" type="button">Cambia gioco</button>
            <button id="gs-export" type="button" title="Scarica i progressi in un file">Esporta salvataggi</button>
            <button id="gs-import" type="button" title="Carica i progressi da un file">Importa salvataggi</button>
          </div>
          <div class="row hints-row" style="font-size:12px;color:#94a3b8;margin-top:4px">
            <span>Frecce/WASD o Stick: Volo &bull; Spazio/A: Verricello / Acqua / Foto &bull; P/Start: Pausa &bull; G: Grafica HD/originale &bull; R+I+X: Sblocca livelli</span>
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

    this.stageWrap = root.querySelector<HTMLElement>('.stage-wrap')!;
    if (wantsTouchControls()) {
      document.body.classList.add('touch-mode');
      this.touchControls = new TouchControls({
        host: root.querySelector<HTMLElement>('.stage-box')!,
        canvas: this.stageCanvas,
        touch: this.input.touch,
        stageWidth: 512,
        stageHeight: 330,
        onToggleOptions: () => this.stageWrap.classList.toggle('show-options'),
        onToggleFullscreen: () => this.toggleFullscreen(),
        fullscreenSupported: Boolean(document.fullscreenEnabled),
      });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.touchControls?.releaseAll();
      });
    }

    this.gfxBtn = root.querySelector<HTMLButtonElement>('#gs-gfx')!;
    this.updateGraphicsButton();

    root.querySelector<HTMLSelectElement>('#gs-game')!.value = initialGame;
    this.bindUI(root);
    void this.switchGame(initialGame);
  }

  private bindUI(root: HTMLElement): void {
    const unlockAudio = () => { void this.sound.unlock(); };
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    // iOS Safari only lets audio start from touchend/click, not pointerdown.
    window.addEventListener('touchend', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });

    const gameSel = root.querySelector<HTMLSelectElement>('#gs-game')!;
    gameSel.addEventListener('change', () => {
      const gameId = gameSel.value as GameId;
      history.replaceState(null, '', gameUrl(gameId, window.location));
      void this.switchGame(gameId);
    });

    root.querySelector<HTMLButtonElement>('#gs-home')!.addEventListener('click', () => {
      this.sound.stopAll();
      window.location.href = gameUrl(null, window.location);
    });

    root.querySelector<HTMLButtonElement>('#gs-export')!.addEventListener('click', () => downloadSave());
    root.querySelector<HTMLButtonElement>('#gs-import')!.addEventListener('click', () => pickAndImportSave());

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

    this.gfxBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.gfxBtn.blur(); // keep Space/Enter going to the game, not to this button
      this.toggleGraphics();
    });
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'KeyG' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      this.toggleGraphics();
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
      this.toggleFullscreen();
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

  /**
   * Desktop: the canvas alone goes fullscreen. Touch: the whole stage panel does, so the
   * on-screen controls stay visible, and phones are asked to stay in landscape.
   */
  private toggleFullscreen(): void {
    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
      return;
    }
    const target = this.touchControls ? this.stageWrap : this.stageCanvas;
    const req = target.requestFullscreen?.({ navigationUI: 'hide' });
    if (this.touchControls && req) {
      void req
        .then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape'))
        .catch(() => undefined);
    }
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
    }
    if (this.hdGraphics) {
      this.statusEl.textContent = 'Carico la grafica HD...';
      await loadHdBitmaps(bundle, this.renderer);
    }
    applyTextureModes(bundle, this.textureModes());
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
    const isFs =
      typeof document !== 'undefined' &&
      (document.fullscreenElement === this.stageCanvas || document.fullscreenElement === this.stageWrap);
    return isFs ? 4 : Math.max(3, Math.min(4, Math.ceil(dpr * 2)));
  }

  private applyHudMode(): void {
    const scale = this.hdHud ? this.getTargetHdScale() : 1;
    this.renderer.setRenderScale(scale);
    this.textCache.setScale(scale);
    for (const bundle of this.bundles.values()) {
      applyTextureModes(bundle, this.textureModes());
    }
    this.hudBtn.textContent = `HUD: ${this.hdHud ? 'HD' : 'Originale'}`;
  }

  private textureModes() {
    return { hdHud: this.hdHud, hdGraphics: this.hdGraphics };
  }

  private toggleGraphics(): void {
    if (this.gfxBtn.disabled) return;
    this.hdGraphics = !this.hdGraphics;
    writeGraphicsPref(this.hdGraphics);
    this.updateGraphicsButton();
    void this.applyGraphicsMode();
  }

  private updateGraphicsButton(): void {
    this.gfxBtn.textContent = `Grafica: ${this.hdGraphics ? 'HD' : 'Originale'}`;
  }

  /** Switches every loaded game between original and upscaled bitmaps (loading them once). */
  private async applyGraphicsMode(): Promise<void> {
    const want = this.hdGraphics;
    if (want) {
      const bundle = this.bundles.get(this.activeGame);
      if (bundle && !bundle.hdBitmapTexturesByKey) {
        this.gfxBtn.disabled = true;
        this.gfxBtn.textContent = 'Grafica: carico HD...';
        await loadHdBitmaps(bundle, this.renderer);
        this.gfxBtn.disabled = false;
        this.updateGraphicsButton();
      }
    }
    if (this.hdGraphics !== want) return;
    for (const bundle of this.bundles.values()) {
      if (want && !bundle.hdBitmapTexturesByKey) await loadHdBitmaps(bundle, this.renderer);
      applyTextureModes(bundle, this.textureModes());
    }
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

    if (state.lastActiveDevice !== this.lastDevice) {
      this.lastDevice = state.lastActiveDevice;
      this.deviceEl.textContent = state.lastActiveDevice;
      // A controller paired to the phone takes over: hide the on-screen controls until touched again.
      if (this.touchControls && state.lastActiveDevice !== 'keyboard') {
        document.body.classList.toggle('touch-hidden', state.lastActiveDevice === 'gamepad');
      }
    }
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


const GFX_PREF_KEY = 'rc_graphics';

/** HD unless the player chose the original graphics, or the URL asks for them (?gfx=orig). */
function readGraphicsPref(): boolean {
  if (typeof window === 'undefined') return false;
  const param = new URLSearchParams(window.location.search).get('gfx');
  if (param === 'orig' || param === 'original') return false;
  if (param === 'hd') return true;
  try {
    return window.localStorage.getItem(GFX_PREF_KEY) !== 'original';
  } catch {
    return true;
  }
}

function writeGraphicsPref(hd: boolean): void {
  try {
    window.localStorage.setItem(GFX_PREF_KEY, hd ? 'hd' : 'original');
  } catch {
    // Private mode or blocked storage: the choice just isn't remembered.
  }
}
