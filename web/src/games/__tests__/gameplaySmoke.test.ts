import { describe, expect, it } from 'vitest';
import { createHeadlessRuntime, enterLevelGameplay, type GameId } from './helpers.ts';

const LEVELS: Record<GameId, number> = { rescueblade: 9, bermuda: 4 };

describe('Headless gameplay smoke test across all levels', () => {
  it('goes StartScreen -> MenuScreen on confirm (RescueBlade)', () => {
    const { rt, input } = createHeadlessRuntime('rescueblade');

    // Advance F4 -> F5 (StartScreen)
    rt.stepTick(input.update());
    expect(rt.currentFrame).toBe(5);

    // Confirm -> MenuScreen (F9 -> F10)
    input.keyboard.setKeyForTest('Enter', true);
    rt.stepTick(input.update());
    input.keyboard.setKeyForTest('Enter', false);
    rt.stepTick(input.update());
    expect(rt.currentFrame).toBe(10);
  });

  for (const gameId of ['rescueblade', 'bermuda'] as const) {
    it(`reaches the gameplay frame of every ${gameId} level and flies 60 ticks without errors`, () => {
      const { rt, input } = createHeadlessRuntime(gameId);
      rt.stepTick(input.update());

      for (let lv = 1; lv <= LEVELS[gameId]; lv++) {
        const gameplayFrame = enterLevelGameplay(rt, input, lv);
        // Before, the test pressed Enter once and stayed on the briefing frame,
        // so the flight loop below never exercised the level itself.
        expect(rt.currentFrame, `level ${lv}`).toBe(gameplayFrame);

        input.keyboard.setKeyForTest('ArrowUp', true);
        input.keyboard.setKeyForTest(lv % 2 ? 'ArrowRight' : 'ArrowLeft', true);
        for (let t = 0; t < 60; t++) {
          if (t === 5) input.keyboard.setKeyForTest('Space', true);
          if (t === 20) input.keyboard.setKeyForTest('Space', false);
          rt.stepTick(input.update());
        }
        input.keyboard.setKeyForTest('ArrowUp', false);
        input.keyboard.setKeyForTest('ArrowRight', false);
        input.keyboard.setKeyForTest('ArrowLeft', false);
        expect(rt.toRenderSprites().length).toBeGreaterThan(5);
      }
    });
  }
});
