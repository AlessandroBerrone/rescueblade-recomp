import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { InputManager } from '../../engine/InputManager.ts';
import { SoundEngine } from '../../engine/audio/SoundEngine.ts';
import type { GameManifest, LoadedGameBundle, ScoreFrameEntry } from '../../engine/assets/AssetLoader.ts';
import type { TextTextureCache } from '../../engine/render/TextTextureCache.ts';
import type { TextureEntry } from '../../engine/render/types.ts';
import { MovieRuntime } from '../../engine/runtime/MovieRuntime.ts';
import { createBehaviorRegistry } from '../registry.ts';

function loadBundleFromDisk(gameId: 'rescueblade' | 'bermuda'): LoadedGameBundle {
  const dir = path.resolve(__dirname, `../../../../extracted/${gameId}/assets`);
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf-8')) as GameManifest;
  const score = JSON.parse(fs.readFileSync(path.join(dir, 'score.json'), 'utf-8')) as ScoreFrameEntry[];

  const membersByKey = new Map(manifest.members.map((m) => [`${m.castLib}:${m.member}`, m]));
  const texturesByKey = new Map<string, TextureEntry>();
  const mapsByLevel = new Map<number, { tileIds: number[]; tileHeights: number[]; sceneryIds: number[] }>();

  for (const m of manifest.members) {
    const key = `${m.castLib}:${m.member}`;
    if (m.type === 1 && m.bitmap) {
      texturesByKey.set(key, {
        texture: {} as WebGLTexture,
        width: m.bitmap.width,
        height: m.bitmap.height,
        regX: m.bitmap.regPoint[0],
        regY: m.bitmap.regPoint[1],
        hasAlpha: m.bitmap.hasAlpha,
      });
    } else if (m.type === 15 && m.castLib === 6 && m.xtra?.text) {
      const lines = m.xtra.text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const parseRow = (s?: string) => (s ? s.split(',').map((x) => Number.parseInt(x.trim(), 10) || 0) : []);
      mapsByLevel.set(m.member, {
        tileIds: parseRow(lines[0]),
        tileHeights: parseRow(lines[1]),
        sceneryIds: parseRow(lines[2]),
      });
    }
  }

  return { gameId, manifest, score, membersByKey, texturesByKey, mapsByLevel };
}

function makeFakeTextCache(): TextTextureCache {
  return {
    getOrCreate: () => ({ texture: {} as WebGLTexture, width: 64, height: 16, regX: 0, regY: 0, hasAlpha: true }),
  } as unknown as TextTextureCache;
}

describe('Headless gameplay smoke test across all levels', () => {
  it('runs RescueBlade StartScreen -> MenuScreen -> Levels 1..9 without runtime errors', () => {
    const bundle = loadBundleFromDisk('rescueblade');
    const input = new InputManager({ getGamepads: () => [] });
    const sound = new SoundEngine();
    const rt = new MovieRuntime(bundle, input, sound, makeFakeTextCache(), createBehaviorRegistry('rescueblade'));

    // Advance F4 -> F5 (StartScreen)
    rt.stepTick(input.update());
    expect(rt.currentFrame).toBe(5);

    // Confirm -> MenuScreen (F9 -> F10)
    input.keyboard.setKeyForTest('Enter', true);
    rt.stepTick(input.update());
    input.keyboard.setKeyForTest('Enter', false);
    rt.stepTick(input.update());
    expect(rt.currentFrame).toBe(10);

    // Exercise every level 1..9 for 60 ticks with flight + action input
    for (let lv = 1; lv <= 9; lv++) {
      rt.globals.gLevel = lv;
      rt.go(`Level${lv}`);
      rt.stepTick(input.update());
      // Press confirm on briefing -> Gameplay frame
      input.keyboard.setKeyForTest('Enter', true);
      rt.stepTick(input.update());
      input.keyboard.setKeyForTest('Enter', false);

      input.keyboard.setKeyForTest('ArrowUp', true);
      input.keyboard.setKeyForTest('ArrowRight', true);
      for (let t = 0; t < 60; t++) {
        if (t === 5) input.keyboard.setKeyForTest('Space', true);
        if (t === 8) input.keyboard.setKeyForTest('Space', false);
        rt.stepTick(input.update());
      }
      input.keyboard.setKeyForTest('ArrowUp', false);
      input.keyboard.setKeyForTest('ArrowRight', false);
      expect(rt.toRenderSprites().length).toBeGreaterThan(5);
    }
  });

  it('runs Bermuda Triangle StartScreen -> MenuScreen -> Levels 1..4 without runtime errors', () => {
    const bundle = loadBundleFromDisk('bermuda');
    const input = new InputManager({ getGamepads: () => [] });
    const sound = new SoundEngine();
    const rt = new MovieRuntime(bundle, input, sound, makeFakeTextCache(), createBehaviorRegistry('bermuda'));

    rt.stepTick(input.update());
    expect(rt.currentFrame).toBe(5);

    for (let lv = 1; lv <= 4; lv++) {
      rt.globals.gLevel = lv;
      rt.go(`Level${lv}`);
      rt.stepTick(input.update());
      input.keyboard.setKeyForTest('Enter', true);
      rt.stepTick(input.update());
      input.keyboard.setKeyForTest('Enter', false);

      input.keyboard.setKeyForTest('ArrowUp', true);
      input.keyboard.setKeyForTest('ArrowLeft', true);
      for (let t = 0; t < 60; t++) {
        if (t === 5) input.keyboard.setKeyForTest('Space', true);
        if (t === 20) input.keyboard.setKeyForTest('Space', false);
        rt.stepTick(input.update());
      }
      input.keyboard.setKeyForTest('ArrowUp', false);
      input.keyboard.setKeyForTest('ArrowLeft', false);
      expect(rt.toRenderSprites().length).toBeGreaterThan(5);
    }
  });
});
