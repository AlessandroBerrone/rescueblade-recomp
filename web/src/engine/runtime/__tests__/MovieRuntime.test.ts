import { describe, expect, it } from 'vitest';
import { InputManager } from '../../InputManager.ts';
import { SoundEngine } from '../../audio/SoundEngine.ts';
import type { LoadedGameBundle } from '../../assets/AssetLoader.ts';
import type { TextTextureCache } from '../../render/TextTextureCache.ts';
import type { BehaviorFactory } from '../DirectorTypes.ts';
import { MovieRuntime, type BehaviorRegistry } from '../MovieRuntime.ts';
import { angleGrind } from '../MovieGlobals.ts';

function makeMinimalBundle(): LoadedGameBundle {
  return {
    gameId: 'rescueblade',
    manifest: {
      stage: { width: 512, height: 330, frameRate: 30, bgColor: [119, 187, 255] },
      frameLabels: [
        { frame: 4, label: 'StartScreen' },
        { frame: 9, label: 'MenuScreen' },
      ],
      frameCount: 10,
      members: [],
    },
    score: [
      { frame: 1, frameScript: null, sprites: [] },
      { frame: 2, frameScript: null, sprites: [] },
      { frame: 3, frameScript: null, sprites: [] },
      { frame: 4, frameScript: null, sprites: [] },
      {
        frame: 5,
        frameScript: { castLib: 4, member: 2, name: 'StartScreenFrameScript' },
        sprites: [
          {
            spriteNum: 1, spriteType: 16, ink: 0, castLib: 3, member: 1,
            locH: 256, locV: 165, width: 100, height: 40, blendByte: 0, blend: 100, rotation: 0,
            behaviors: [{ castLib: 1, member: 19, name: 'TestBtn' }],
          },
        ],
      },
      { frame: 6, frameScript: null, sprites: [] },
      { frame: 7, frameScript: null, sprites: [] },
      { frame: 8, frameScript: null, sprites: [] },
      { frame: 9, frameScript: null, sprites: [] },
      {
        frame: 10,
        frameScript: { castLib: 4, member: 3, name: 'MenuScreen' },
        sprites: [],
      },
    ],
    membersByKey: new Map(),
    texturesByKey: new Map(),
    mapsByLevel: new Map(),
  };
}

describe('MovieRuntime', () => {
  it('advances from label marker F04 into F05, loops via go(the frame), and jumps on click', () => {
    const events: string[] = [];
    const registry: BehaviorRegistry = new Map<string, BehaviorFactory>([
      [
        'StartScreenFrameScript',
        () => ({
          name: 'StartScreenFrameScript',
          spriteNum: 0,
          exitFrame(ctx) {
            ctx.go(ctx.currentFrame);
          },
          mouseUp(ctx) {
            events.push('start_click');
            ctx.go('MenuScreen');
          },
        }),
      ],
      [
        'TestBtn',
        () => ({
          name: 'TestBtn',
          spriteNum: 1,
          beginSprite() {
            events.push('btn_begin');
          },
          endSprite() {
            events.push('btn_end');
          },
        }),
      ],
      [
        'MenuScreen',
        () => ({
          name: 'MenuScreen',
          spriteNum: 0,
          exitFrame(ctx) {
            ctx.go(ctx.currentFrame);
          },
        }),
      ],
    ]);

    const input = new InputManager({ getGamepads: () => [] });
    const sound = new SoundEngine();
    const fakeTextCache = {} as TextTextureCache;
    const rt = new MovieRuntime(makeMinimalBundle(), input, sound, fakeTextCache, registry);

    expect(rt.currentFrame).toBe(4);
    // Tick 1: F04 has no go(), advances to F05 and runs beginSprite
    rt.stepTick(input.update());
    expect(rt.currentFrame).toBe(5);
    expect(events).toEqual(['btn_begin']);

    // Tick 2: F05 loops on F05 without re-running beginSprite
    rt.stepTick(input.update());
    expect(rt.currentFrame).toBe(5);
    expect(events).toEqual(['btn_begin']);

    // Tick 3..4: Click anywhere -> mouseUp -> go('MenuScreen') -> F09 -> F10
    input.keyboard.setPointerForTest(256, 165, true, true);
    rt.stepTick(input.update());
    input.keyboard.setPointerForTest(256, 165, false, true);
    rt.stepTick(input.update());
    expect(rt.currentFrame).toBe(9);
    expect(events).toEqual(['btn_begin', 'start_click', 'btn_end']);

    rt.stepTick(input.update());
    expect(rt.currentFrame).toBe(10);
  });

  it('computes AngleGrind accurately across all quadrants', () => {
    expect(angleGrind(0, 0, 10, 0)).toBe(0);
    expect(angleGrind(0, 0, 0, 10)).toBe(90);
    expect(angleGrind(0, 0, -10, 0)).toBe(180);
    expect(angleGrind(0, 0, 0, -10)).toBe(270);
    expect(angleGrind(0, 0, 10, 10)).toBeCloseTo(45, 5);
  });

  it('sees a one-frame tap exactly once at 120 Hz and on slow frames', () => {
    const run = (frameDt: number[]) => {
      let ups = 0;
      const registry: BehaviorRegistry = new Map<string, BehaviorFactory>([
        [
          'StartScreenFrameScript',
          () => ({
            name: 'StartScreenFrameScript',
            spriteNum: 0,
            exitFrame(ctx) {
              ctx.go(ctx.currentFrame);
            },
            mouseUp() {
              ups++;
            },
          }),
        ],
      ]);
      const input = new InputManager({ getGamepads: () => [] });
      const rt = new MovieRuntime(makeMinimalBundle(), input, new SoundEngine(), {} as TextTextureCache, registry);
      rt.stepTick(input.update()); // reach the looping F05
      // Finger down and up between two display frames.
      input.touch.setTouchPointer(10, 10, true);
      input.touch.setTouchPointer(10, 10, false);
      for (const dt of frameDt) rt.updateFixedTimestep(dt, input.update());
      return ups;
    };
    expect(run(Array(12).fill(1 / 120))).toBe(1);
    expect(run([0.1, 0.1, 0.1])).toBe(1);
  });

  it('saves level, per-level scores and control mode, and restores them on the next run', () => {
    const data = new Map<string, string>();
    const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
    const input = new InputManager({ getGamepads: () => [] });
    const make = () =>
      new MovieRuntime(makeMinimalBundle(), input, new SoundEngine(), {} as TextTextureCache, new Map(), storage);

    const rt = make();
    rt.globals.gLevel = 4;
    rt.globals.gLevelScoreList[0] = 1200;
    rt.globals.gLevelScoreList[2] = 850;
    rt.globals.gProControls = 1;
    rt.updateFixedTimestep(1 / 30, input.update());
    expect(JSON.parse(data.get('rc_pref_RBlade_progress')!)).toEqual({
      level: 4,
      levelScores: [1200, 0, 850, 0, 0, 0, 0, 0, 0],
      proControls: 1,
    });

    const next = make();
    expect(next.globals.gLevel).toBe(4);
    expect(next.globals.gLevelScoreList.slice(0, 3)).toEqual([1200, 0, 850]);
    expect(next.globals.gProControls).toBe(1);
  });
});
