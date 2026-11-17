import type { LoadedGameBundle } from '../assets/AssetLoader.ts';
import type { Quad2D } from '../render/types.ts';

export interface DirectorRect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

export interface SpriteInstance {
  readonly spriteNum: number;
  castLib: number;
  member: number;
  locH: number;
  locV: number;
  width: number;
  height: number;
  locZ: number;
  blend: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  ink: number;
  quad: Quad2D | null;
  visible: boolean;
  /** Mutable text override for TextXtra sprites (e.g. Mission, Score, SubmitScore). */
  text: string | null;
  textColor?: string;
  textAlign?: CanvasTextAlign;
  textFontSize?: number;
  /** Dynamic behavior properties accessible cross-sprite (e.g. sprite.vars.survivorState). */
  vars: Record<string, unknown>;
  /** Attached behavior instances for this sprite on the current frame. */
  behaviors: BehaviorInstance[];
}

export interface BehaviorInstance {
  readonly name: string;
  readonly spriteNum: number;
  beginSprite?(ctx: MovieRuntimeContext, sprite: SpriteInstance): void;
  endSprite?(ctx: MovieRuntimeContext, sprite: SpriteInstance): void;
  exitFrame?(ctx: MovieRuntimeContext, sprite: SpriteInstance): void;
  mouseDown?(ctx: MovieRuntimeContext, sprite: SpriteInstance): void;
  mouseUp?(ctx: MovieRuntimeContext, sprite: SpriteInstance): void;
  mouseWithin?(ctx: MovieRuntimeContext, sprite: SpriteInstance): void;
  mouseLeave?(ctx: MovieRuntimeContext, sprite: SpriteInstance): void;
  keyDown?(ctx: MovieRuntimeContext, sprite: SpriteInstance): void;
}

export type BehaviorFactory = (params?: Record<string, unknown>) => BehaviorInstance;

export interface MovieGlobals {
  gFirstTime: number;
  gGameName: string;
  gCurrentLevel: number;
  gLevel: number;
  gLevelResult: string | null;
  gLevelScoreList: number[];
  gScore: number;
  gScoreTotal: number;
  gTimeBonus: number;
  gFlyingPoints: number;
  gLockOut: string;
  gPaused: number;
  gProControls: number;
  gTileIDList: number[];
  gTileHeightList: number[];
  gSceneryList: number[];
  gUnderSeaHeightList: number[];
  gXVel: number;
  gXOffset: number;
  gXVelChange: number;
  gSeaFrame: number;
  gfuelPercent: number;
  gDamagePercent: number;
  gCableItem: number;
  gCableLength: number;
  gRescueCount: number;
  gRescuedList: SpriteInstance[];
  gSmokeList: SpriteInstance[];
  gPickupList: SpriteInstance[];
  gPloshList: SpriteInstance[];
  gPloshX: number;
  gWaterFlow: number;
  gCopterTile: number;
  gGuyDoom: string | null;
  // Bermuda Triangle extras
  gCoconuts: number;
  gCoconutList: SpriteInstance[];
  gAbducteeList: SpriteInstance[];
  yDonk: number;
}

export interface MovieRuntimeContext {
  readonly bundle: LoadedGameBundle;
  readonly globals: MovieGlobals;
  readonly currentFrame: number;
  go(target: string | number): void;
  sprite(num: number): SpriteInstance;
  getSpriteRect(sp: SpriteInstance): DirectorRect;
  spritesIntersect(a: SpriteInstance, b: SpriteInstance): boolean;
  pointInSprite(sp: SpriteInstance, x: number, y: number): boolean;
  getRollover(): number;
  puppetSound(channel: number, memberNum: number): void;
  soundBusy(channel: number): boolean;
  soundMember(channel: number): number;
  soundControl(channel: number, cmd: 'play' | 'pause' | 'stop'): void;
  getMemberText(castLib: number, memberNum: number): string;
  setMemberText(castLib: number, memberNum: number, text: string): void;
  getPref(key: string): string | null;
  setPref(key: string, val: string): void;
  random(max: number): number;
  angleGrind(ox: number, oy: number, tx: number, ty: number): number;
  getInput(): import('../InputManager.ts').InputState;
}
