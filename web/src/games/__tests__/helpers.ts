import fs from 'node:fs';
import path from 'node:path';
import { InputManager } from '../../engine/InputManager.ts';
import { SoundEngine } from '../../engine/audio/SoundEngine.ts';
import type { GameManifest, LoadedGameBundle, ScoreFrameEntry } from '../../engine/assets/AssetLoader.ts';
import type { TextTextureCache } from '../../engine/render/TextTextureCache.ts';
import type { TextureEntry } from '../../engine/render/types.ts';
import { MovieRuntime } from '../../engine/runtime/MovieRuntime.ts';
import { createBehaviorRegistry } from '../registry.ts';

export type GameId = 'rescueblade' | 'bermuda';

export function loadBundleFromDisk(gameId: 'rescueblade' | 'bermuda'): LoadedGameBundle {
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

export function makeFakeTextCache(): TextTextureCache {
  return {
    getOrCreate: () => ({ texture: {} as WebGLTexture, width: 64, height: 16, regX: 0, regY: 0, hasAlpha: true }),
    heightOf: () => 16,
  } as unknown as TextTextureCache;
}

const bundleCache = new Map<GameId, LoadedGameBundle>();

export function createHeadlessRuntime(
  gameId: GameId,
  getGamepads: () => readonly (Gamepad | null)[] = () => []
): { rt: MovieRuntime; input: InputManager } {
  let bundle = bundleCache.get(gameId);
  if (!bundle) {
    bundle = loadBundleFromDisk(gameId);
    bundleCache.set(gameId, bundle);
  }
  const input = new InputManager({ getGamepads });
  const rt = new MovieRuntime(bundle, input, new SoundEngine(), makeFakeTextCache(), createBehaviorRegistry(gameId));
  return { rt, input };
}

export function frameOfLabel(rt: MovieRuntime, label: string): number {
  const hit = rt.bundle.manifest.frameLabels.find((l) => l.label === label);
  if (!hit) throw new Error(`No frame label ${label}`);
  return hit.frame;
}

/**
 * Jumps to LevelN, then taps Enter until the briefing hands over to the
 * gameplay frame (the frame right after the level label). Returns that frame.
 */
export function enterLevelGameplay(rt: MovieRuntime, input: InputManager, level: number, maxTicks = 300): number {
  const briefing = frameOfLabel(rt, `Level${level}`);
  rt.globals.gLevel = level;
  rt.go(`Level${level}`);
  rt.stepTick(input.update());
  const gameplay = briefing + 1;
  for (let t = 0; t < maxTicks && rt.currentFrame !== gameplay; t++) {
    input.keyboard.setKeyForTest('Enter', t % 6 < 2);
    rt.stepTick(input.update());
  }
  input.keyboard.setKeyForTest('Enter', false);
  rt.stepTick(input.update());
  return gameplay;
}
