import { describe, expect, it } from 'vitest';
import { createHeadlessRuntime, enterLevelGameplay, frameOfLabel, loadBundleFromDisk } from './helpers.ts';

type PadState = { axes: number[]; buttons: number[] };

function mockPad(state: PadState): Gamepad {
  return {
    index: 0,
    id: 'Mock Standard Gamepad',
    connected: true,
    mapping: 'standard',
    axes: state.axes,
    buttons: Array.from({ length: 17 }, (_, i) => {
      const v = state.buttons[i] ?? 0;
      return { pressed: v >= 0.5, touched: v > 0, value: v };
    }),
    timestamp: 0,
    vibrationActuator: null as unknown as GamepadHapticActuator,
  };
}

describe('score extraction', () => {
  for (const gameId of ['rescueblade', 'bermuda'] as const) {
    it(`keeps every behavior on sprites that carry more than one (${gameId})`, () => {
      const bundle = loadBundleFromDisk(gameId);
      const multi = bundle.score.flatMap((f) => f.sprites).filter((sp) => (sp.behaviors?.length ?? 0) >= 2);
      expect(multi.length).toBeGreaterThan(0);

      // The sea frame counter only ever lives next to QuadTileFar on one sprite,
      // so it disappears entirely when multi-behavior entries are dropped.
      const names = new Set(bundle.score.flatMap((f) => f.sprites).flatMap((sp) => sp.behaviors ?? []).map((b) => b.name));
      expect(names.has('SeaFrameCounter')).toBe(true);
      expect(names.has('QuadTileFar')).toBe(true);
    });
  }
});

describe('sea animation', () => {
  it('cycles gSeaFrame through all 20 sea tiles during RescueBlade level 1', () => {
    const { rt, input } = createHeadlessRuntime('rescueblade');
    rt.stepTick(input.update());
    enterLevelGameplay(rt, input, 1);

    const seen = new Set<number>();
    for (let t = 0; t < 4 * 21; t++) {
      rt.stepTick(input.update());
      seen.add(rt.globals.gSeaFrame);
    }
    expect([...seen].sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });
});

describe('MovieRuntime.go between ticks', () => {
  it('honours a go() issued outside a tick, like the shell Menu button', () => {
    const { rt, input } = createHeadlessRuntime('rescueblade');
    rt.stepTick(input.update());
    enterLevelGameplay(rt, input, 1);

    rt.go('MenuScreen');
    rt.stepTick(input.update());
    expect(rt.currentFrame).toBe(frameOfLabel(rt, 'MenuScreen'));
  });
});

describe('gamepad drives the game', () => {
  it('confirms menus with A, flies with the stick and pauses with Start', () => {
    const pad: PadState = { axes: [0, 0, 0, 0], buttons: [] };
    const { rt, input } = createHeadlessRuntime('rescueblade', () => [mockPad(pad)]);
    const tick = (n = 1) => {
      for (let i = 0; i < n; i++) rt.stepTick(input.update());
    };
    const tap = (btn: number) => {
      pad.buttons[btn] = 1;
      tick();
      pad.buttons[btn] = 0;
      tick();
    };

    tick();
    tap(0); // A on the start screen
    expect(rt.currentFrame).toBe(frameOfLabel(rt, 'MenuScreen') + 1);

    rt.globals.gLevel = 1;
    rt.go('Level1');
    tick();
    const gameplay = frameOfLabel(rt, 'Level1') + 1;
    for (let i = 0; i < 40 && rt.currentFrame !== gameplay; i++) tap(0);
    expect(rt.currentFrame).toBe(gameplay);
    expect(input.getState().lastActiveDevice).toBe('gamepad');

    // Stick inside the deadzone must not move anything.
    pad.axes[0] = 0.1;
    tick();
    expect(input.getState().axes.moveX).toBe(0);

    // Full right stick: the world scrolls (gXVel) the way the keyboard does.
    pad.axes[0] = 1;
    pad.axes[1] = -1;
    tick(45);
    expect(Math.abs(rt.globals.gXVel)).toBeGreaterThan(0);
    pad.axes[0] = 0;
    pad.axes[1] = 0;

    expect(rt.globals.gPaused).toBe(0);
    tap(9); // Start
    expect(rt.globals.gPaused).toBe(1);
    tap(9);
    expect(rt.globals.gPaused).toBe(0);
  });

  it('maps the analog right trigger and X to the action button, B to cancel', () => {
    const pad: PadState = { axes: [0, 0, 0, 0], buttons: [] };
    const { input } = createHeadlessRuntime('rescueblade', () => [mockPad(pad)]);

    pad.buttons[7] = 0.2; // light trigger touch: below threshold
    expect(input.update().actions.action.isPressed).toBe(false);
    pad.buttons[7] = 0.6;
    expect(input.update().actions.action.isPressed).toBe(true);
    pad.buttons[7] = 0;
    pad.buttons[2] = 1;
    expect(input.update().actions.action.isPressed).toBe(true);
    pad.buttons[2] = 0;
    pad.buttons[1] = 1;
    const st = input.update();
    expect(st.actions.cancel.justPressed).toBe(true);
    expect(st.actions.action.isPressed).toBe(false);
  });
});

describe('score channel sprite properties', () => {
  const spriteAt = (gameId: 'rescueblade' | 'bermuda', frame: number, spriteNum: number) => {
    const bundle = loadBundleFromDisk(gameId);
    const sp = bundle.score[frame - 1].sprites.find((s) => s.spriteNum === spriteNum);
    if (!sp) throw new Error(`no sprite ${spriteNum} in frame ${frame}`);
    return sp;
  };

  it('reads rotation from the right bytes (flames upright, steam valve tilted)', () => {
    // Flames in Nuclear Combustion used to come out rotated by 255 degrees.
    expect(spriteAt('rescueblade', 30, 74).rotation).toBe(0);
    expect(spriteAt('rescueblade', 29, 9).rotation).toBeCloseTo(40.79, 2);
    expect(spriteAt('rescueblade', 33, 21).rotation).toBe(180);
  });

  it('applies the score blend (the winch cable is drawn at 30%)', () => {
    const { rt, input } = createHeadlessRuntime('rescueblade');
    rt.stepTick(input.update());
    enterLevelGameplay(rt, input, 2);
    expect(rt.sprite(5).member).toBe(45);
    expect(rt.sprite(5).blend).toBe(30);
  });
});

describe('near ground tiles', () => {
  it('starts the five near strips on consecutive map tiles, like Lingo integer()', () => {
    const { rt, input } = createHeadlessRuntime('rescueblade');
    rt.stepTick(input.update());
    enterLevelGameplay(rt, input, 1);
    // Level 1 scenery ids around the start are 1, 2, 0, 0, 0 (tiles 15..19),
    // which the near strips show as members 69, 70, 68, 68, 68. Truncating
    // instead of rounding made the first two strips start one tile late.
    const members = [50, 51, 52, 53, 54].map((n) => rt.sprite(n).member);
    expect(members).toEqual([69, 70, 68, 68, 68]);
  });
});

describe('score counter', () => {
  it('settles on the exact score instead of one point below', () => {
    const { rt, input } = createHeadlessRuntime('rescueblade');
    rt.stepTick(input.update());
    enterLevelGameplay(rt, input, 1);
    rt.globals.gScore = 500;
    for (let t = 0; t < 60; t++) rt.stepTick(input.update());
    const digits = [17, 16, 15, 14, 13, 12, 11].map((n) => rt.sprite(n).member - 50).join('');
    expect(digits).toBe('0000500');
  });

  it('never stretches the 1x1 "no scenery" pixel into a block on the horizon, in any level', () => {
    for (const [gameId, levels] of [['rescueblade', 9], ['bermuda', 4]] as const) {
      const { rt, input } = createHeadlessRuntime(gameId);
      rt.stepTick(input.update());
      for (let lv = 1; lv <= levels; lv++) {
        enterLevelGameplay(rt, input, lv);
        input.keyboard.setKeyForTest('ArrowUp', true);
        input.keyboard.setKeyForTest('ArrowRight', true);
        for (let t = 0; t < 90; t++) {
          rt.stepTick(input.update());
          const blocks = rt
            .toRenderSprites()
            .filter((s) => s.texture?.width === 1 && s.texture.height === 1 && s.width * s.height > 1);
          expect(blocks.map((s) => s.spriteNum), `${gameId} level ${lv}`).toEqual([]);
        }
        input.keyboard.setKeyForTest('ArrowUp', false);
        input.keyboard.setKeyForTest('ArrowRight', false);
      }
    }
  });
});
