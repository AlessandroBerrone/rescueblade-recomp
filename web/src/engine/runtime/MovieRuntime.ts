import { memberKey, type LoadedGameBundle } from '../assets/AssetLoader.ts';
import type { SoundEngine } from '../audio/SoundEngine.ts';
import type { InputManager, InputState } from '../InputManager.ts';
import { hasInputEdges, mergeInputEdges, withoutInputEdges } from '../input/edges.ts';
import type { TextTextureCache } from '../render/TextTextureCache.ts';
import { DIRECTOR_INK, type RenderSprite, type TextureEntry } from '../render/types.ts';
import { sortSpritesForRender } from '../render/quadMath.ts';
import {
  type BehaviorFactory,
  type BehaviorInstance,
  type DirectorRect,
  type MovieGlobals,
  type MovieRuntimeContext,
  type SpriteInstance,
} from './DirectorTypes.ts';
import { angleGrind, createInitialGlobals, directorRandom } from './MovieGlobals.ts';

export type BehaviorRegistry = ReadonlyMap<string, BehaviorFactory>;

export class MovieRuntime implements MovieRuntimeContext {
  public readonly globals: MovieGlobals;
  public currentFrame = 1;

  private readonly labelMap = new Map<string, number>();
  private readonly memberTextOverrides = new Map<string, string>();
  private readonly sprites = new Map<number, SpriteInstance>();
  private frameScript: BehaviorInstance | null = null;
  private pendingGoto: number | null = null;
  /** go() requested from outside a tick (e.g. the shell's Menu button). */
  private externalGoto: number | null = null;
  private inTick = false;
  private lastRolloverSprite = 0;
  private latestInput: InputState;
  private accumulatorSec = 0;
  /** Input edges from display frames that ran no score tick, waiting for the next tick. */
  private carriedInput: InputState | null = null;
  private readonly prefStore = new Map<string, string>();

  constructor(
    public readonly bundle: LoadedGameBundle,
    input: InputManager,
    private readonly sound: SoundEngine,
    private readonly textCache: TextTextureCache,
    private readonly behaviorRegistry: BehaviorRegistry,
    private readonly storage?: Pick<Storage, 'getItem' | 'setItem'>
  ) {
    const gameName = bundle.gameId === 'bermuda' ? 'RBlade2' : 'RBlade';
    this.globals = createInitialGlobals(gameName);
    this.latestInput = input.getState();

    for (const lbl of bundle.manifest.frameLabels) {
      this.labelMap.set(lbl.label.toLowerCase(), lbl.frame);
    }

    const savedLock = this.getPref(gameName);
    this.globals.gLockOut = savedLock ?? '0';
    if (savedLock === null) {
      this.setPref(gameName, '0');
    }

    // Start at StartScreen (frame 4 -> naturally steps into 5, or jump straight to StartScreen)
    this.inTick = true;
    this.enterFrame(this.labelMap.get('startscreen') ?? 1);
    this.inTick = false;
  }

  public getFrameRate(): number {
    return this.bundle.manifest.stage.frameRate || 30;
  }

  public go(target: string | number): void {
    let resolved: number | undefined;
    if (typeof target === 'number') {
      resolved = Math.max(1, Math.min(this.bundle.manifest.frameCount, Math.round(target)));
    } else {
      resolved = this.labelMap.get(target.trim().toLowerCase());
    }
    if (resolved === undefined) return;
    if (!this.inTick) {
      // stepTick() clears pendingGoto when it starts, so a request made between
      // ticks would be silently dropped. Queue it and apply it on the next tick.
      this.externalGoto = resolved;
      return;
    }
    // Do not let a frame-loop `go(the frame)` overwrite an already-queued scene transition
    if (this.pendingGoto !== null && this.pendingGoto !== this.currentFrame && resolved === this.currentFrame) {
      return;
    }
    this.pendingGoto = resolved;
  }

  public sprite(num: number): SpriteInstance {
    const existing = this.sprites.get(num);
    if (existing) return existing;
    const dummy: SpriteInstance = {
      spriteNum: num,
      castLib: 0,
      member: 0,
      locH: -1000,
      locV: -1000,
      width: 0,
      height: 0,
      locZ: num,
      blend: 100,
      rotation: 0,
      flipH: false,
      flipV: false,
      ink: 0,
      quad: null,
      visible: false,
      text: null,
      vars: {},
      behaviors: [],
    };
    this.sprites.set(num, dummy);
    return dummy;
  }

  public getActiveSprites(): SpriteInstance[] {
    return [...this.sprites.values()];
  }

  private getTextureMeta(castLib: number, memberNum: number): TextureEntry | undefined {
    return this.bundle.texturesByKey.get(memberKey(castLib, memberNum));
  }

  public getSpriteRect(sp: SpriteInstance): DirectorRect {
    const tex = this.getTextureMeta(sp.castLib, sp.member);
    const tw = tex?.width || sp.width || 1;
    const th = tex?.height || sp.height || 1;
    const rx = tex ? (sp.flipH ? tw - tex.regX : tex.regX) : 0;
    const ry = tex ? (sp.flipV ? th - tex.regY : tex.regY) : 0;
    const sx = sp.width / tw;
    const sy = sp.height / th;
    const left = sp.locH - rx * sx;
    const top = sp.locV - ry * sy;
    return {
      left,
      top,
      right: left + sp.width,
      bottom: top + sp.height,
    };
  }


  public spritesIntersect(a: SpriteInstance, b: SpriteInstance): boolean {
    const ra = this.getSpriteRect(a);
    const rb = this.getSpriteRect(b);
    return ra.left < rb.right && ra.right > rb.left && ra.top < rb.bottom && ra.bottom > rb.top;
  }

  public pointInSprite(sp: SpriteInstance, x: number, y: number): boolean {
    if (!sp.visible || sp.blend <= 0 || sp.width <= 0 || sp.height <= 0) return false;
    const r = this.getSpriteRect(sp);
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  public getRollover(): number {
    const ptr = this.latestInput.pointer;
    if (!ptr.inside) return 0;
    const ordered = sortSpritesForRender([...this.sprites.values()]);
    for (let i = ordered.length - 1; i >= 0; i--) {
      const sp = ordered[i];
      if (this.pointInSprite(sp, ptr.x, ptr.y)) {
        return sp.spriteNum;
      }
    }
    return 0;
  }

  public puppetSound(channel: number, memberNum: number): void {
    this.sound.puppetSound(channel, memberNum);
  }

  public soundBusy(channel: number): boolean {
    return this.sound.soundBusy(channel);
  }

  public soundMember(channel: number): number {
    return this.sound.getChannelMember(channel);
  }

  public soundControl(channel: number, cmd: 'play' | 'pause' | 'stop'): void {
    if (cmd === 'play') this.sound.play(channel);
    else if (cmd === 'pause') this.sound.pause(channel);
    else this.sound.stop(channel);
  }

  public getMemberText(castLib: number, memberNum: number): string {
    const key = memberKey(castLib, memberNum);
    const override = this.memberTextOverrides.get(key);
    if (override !== undefined) return override;
    return this.bundle.membersByKey.get(key)?.xtra?.text ?? '';
  }

  public setMemberText(castLib: number, memberNum: number, text: string): void {
    const key = memberKey(castLib, memberNum);
    this.memberTextOverrides.set(key, text);
    for (const sp of this.sprites.values()) {
      if (sp.castLib === castLib && sp.member === memberNum) {
        sp.text = text;
      }
    }
  }

  public getPref(key: string): string | null {
    if (this.storage) return this.storage.getItem(`rc_pref_${key}`);
    if (typeof localStorage !== 'undefined') return localStorage.getItem(`rc_pref_${key}`);
    return this.prefStore.get(key) ?? null;
  }

  public setPref(key: string, val: string): void {
    if (this.storage) {
      this.storage.setItem(`rc_pref_${key}`, val);
      return;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`rc_pref_${key}`, val);
      return;
    }
    this.prefStore.set(key, val);
  }

  public random(max: number): number {
    return directorRandom(max);
  }

  public angleGrind(ox: number, oy: number, tx: number, ty: number): number {
    return angleGrind(ox, oy, tx, ty);
  }

  public getInput(): InputState {
    return this.latestInput;
  }

  private enterFrame(frameNum: number): void {
    for (const sp of this.sprites.values()) {
      for (const b of sp.behaviors) b.endSprite?.(this, sp);
    }
    this.sprites.clear();
    this.frameScript = null;
    this.lastRolloverSprite = 0;
    this.currentFrame = frameNum;

    const sf = this.bundle.score[frameNum - 1];
    if (!sf) return;

    if (sf.frameScript) {
      const fsName = sf.frameScript.name ?? memberKey(sf.frameScript.castLib, sf.frameScript.member);
      const factory = this.behaviorRegistry.get(fsName);
      if (factory) {
        this.frameScript = factory();
      }
    }

    for (const raw of sf.sprites) {
      const key = memberKey(raw.castLib, raw.member);
      const mem = this.bundle.membersByKey.get(key);
      const initialText = mem?.type === 15 ? this.getMemberText(raw.castLib, raw.member) : null;
      const behs: BehaviorInstance[] = [];
      for (const b of raw.behaviors) {
        const bName = b.name ?? memberKey(b.castLib, b.member);
        const factory = this.behaviorRegistry.get(bName);
        if (factory) {
          const inst = factory(b.params);
          behs.push(inst);
        }
      }

      const sp: SpriteInstance = {
        spriteNum: raw.spriteNum,
        castLib: raw.castLib,
        member: raw.member,
        locH: raw.locH,
        locV: raw.locV,
        width: raw.width,
        height: raw.height,
        locZ: raw.spriteNum,
        blend: 100,
        rotation: raw.rotationRaw / 65536 || 0,
        flipH: false,
        flipV: false,
        ink: raw.ink,
        quad: null,
        visible: true,
        text: initialText,
        vars: {},
        behaviors: behs,
      };
      this.sprites.set(raw.spriteNum, sp);
    }

    const sortedNums = [...this.sprites.keys()].sort((a, b) => a - b);
    for (const num of sortedNums) {
      const sp = this.sprites.get(num)!;
      for (const b of sp.behaviors) {
        b.beginSprite?.(this, sp);
      }
    }
  }


  public stepTick(inputState: InputState): void {
    this.inTick = true;
    try {
      this.runTick(inputState);
    } finally {
      this.inTick = false;
    }
  }

  private runTick(inputState: InputState): void {
    this.latestInput = inputState;
    this.pendingGoto = null;

    if (this.externalGoto !== null) {
      const target = this.externalGoto;
      this.externalGoto = null;
      this.enterFrame(target);
      return;
    }

    const rolloverNum = this.getRollover();
    if (this.lastRolloverSprite !== 0 && this.lastRolloverSprite !== rolloverNum) {
      const prevSp = this.sprites.get(this.lastRolloverSprite);
      if (prevSp) {
        for (const b of prevSp.behaviors) b.mouseLeave?.(this, prevSp);
      }
    }
    if (rolloverNum !== 0) {
      const hitSp = this.sprites.get(rolloverNum);
      if (hitSp) {
        for (const b of hitSp.behaviors) b.mouseWithin?.(this, hitSp);
      }
    }
    this.lastRolloverSprite = rolloverNum;

    if (inputState.pointer.justPressed) {
      const hitSp = rolloverNum !== 0 ? this.sprites.get(rolloverNum) : undefined;
      if (hitSp) {
        for (const b of hitSp.behaviors) b.mouseDown?.(this, hitSp);
      }
      this.frameScript?.mouseDown?.(this, this.sprite(0));
    }

    if (inputState.pointer.justReleased) {
      const hitSp = rolloverNum !== 0 ? this.sprites.get(rolloverNum) : undefined;
      if (hitSp) {
        for (const b of hitSp.behaviors) b.mouseUp?.(this, hitSp);
      }
      this.frameScript?.mouseUp?.(this, this.sprite(0));
    }

    if (inputState.actions.pause.justPressed) {
      this.frameScript?.keyDown?.(this, this.sprite(0));
    }

    if (this.pendingGoto !== null && this.pendingGoto !== this.currentFrame) {
      this.enterFrame(this.pendingGoto);
      return;
    }

    const sortedNums = [...this.sprites.keys()].sort((a, b) => a - b);
    for (const num of sortedNums) {
      const sp = this.sprites.get(num);
      if (!sp) continue;
      for (const b of sp.behaviors) {
        b.exitFrame?.(this, sp);
      }
    }
    this.frameScript?.exitFrame?.(this, this.sprite(0));

    const nextFrame =
      this.pendingGoto !== null
        ? this.pendingGoto
        : Math.min(this.bundle.manifest.frameCount, this.currentFrame + 1);

    if (nextFrame !== this.currentFrame) {
      this.enterFrame(nextFrame);
    }
  }

  /** Fixed 30 Hz Director Score timestep accumulator regardless of display refresh rate. */
  public updateFixedTimestep(dtSec: number, inputState: InputState): void {
    const step = 1 / this.getFrameRate();
    this.accumulatorSec = Math.min(this.accumulatorSec + dtSec, step * 4);
    const withEdges = this.carriedInput ? mergeInputEdges(this.carriedInput, inputState) : inputState;
    let ticked = false;
    while (this.accumulatorSec >= step) {
      // Only the first tick of this display frame sees the edges, so a tap or key press
      // fires once: never lost on 60-120 Hz screens, never doubled on slow frames.
      this.stepTick(ticked ? withoutInputEdges(inputState) : withEdges);
      ticked = true;
      this.accumulatorSec -= step;
    }
    this.carriedInput = !ticked && hasInputEdges(withEdges) ? withEdges : null;
  }

  public toRenderSprites(): RenderSprite[] {
    const out: RenderSprite[] = [];
    for (const sp of this.sprites.values()) {
      if (!sp.visible || sp.blend <= 0) continue;
      const key = memberKey(sp.castLib, sp.member);
      const mem = this.bundle.membersByKey.get(key);
      let tex = this.bundle.texturesByKey.get(key) ?? null;
      let maskTex: TextureEntry | null = null;

      if (!tex && mem?.type === 15) {
        const txt = sp.text ?? this.getMemberText(sp.castLib, sp.member);
        tex = this.textCache.getOrCreate(
          `${this.bundle.gameId}:${key}:${sp.spriteNum}`,
          txt,
          sp.width,
          sp.height,
          {
            fontSize: sp.textFontSize,
            color: sp.textColor,
            align: sp.textAlign,
          }
        );
      }

      if (sp.ink === DIRECTOR_INK.MASK) {
        maskTex = this.bundle.texturesByKey.get(memberKey(sp.castLib, sp.member + 1)) ?? null;
      }

      out.push({
        spriteNum: sp.spriteNum,
        texture: tex,
        maskTexture: maskTex,
        locH: sp.locH,
        locV: sp.locV,
        width: sp.width,
        height: sp.height,
        locZ: sp.locZ,
        rotation: sp.rotation,
        flipH: sp.flipH,
        flipV: sp.flipV,
        blend: sp.blend,
        ink: sp.ink,
        quad: sp.quad,
        visible: sp.visible,
      });
    }
    return out;
  }
}

