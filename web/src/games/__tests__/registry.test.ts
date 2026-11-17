import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ScoreFrameEntry } from '../../engine/assets/AssetLoader.ts';
import { createBehaviorRegistry } from '../registry.ts';

function collectMissingBehaviors(gameId: 'rescueblade' | 'bermuda'): string[] {
  const scorePath = path.resolve(__dirname, `../../../../extracted/${gameId}/assets/score.json`);
  const score = JSON.parse(fs.readFileSync(scorePath, 'utf-8')) as ScoreFrameEntry[];
  const reg = createBehaviorRegistry(gameId);
  const missing = new Set<string>();

  for (const fr of score) {
    if (fr.frameScript?.name && !reg.has(fr.frameScript.name)) {
      missing.add(`frameScript:${fr.frameScript.name}`);
    }
    for (const sp of fr.sprites) {
      for (const b of sp.behaviors) {
        if (b.name && !reg.has(b.name)) {
          missing.add(`spriteBehavior:${b.name}`);
        }
      }
    }
  }
  return [...missing].sort();
}

describe('Behavior registries for both games', () => {
  it('registers 100% of frameScripts and sprite behaviors referenced in rescueblade score.json', () => {
    expect(collectMissingBehaviors('rescueblade')).toEqual([]);
  });

  it('registers 100% of frameScripts and sprite behaviors referenced in bermuda score.json', () => {
    expect(collectMissingBehaviors('bermuda')).toEqual([]);
  });
});
