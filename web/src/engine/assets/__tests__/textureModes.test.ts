import { describe, expect, it } from 'vitest';
import { applyTextureModes, type LoadedGameBundle } from '../AssetLoader.ts';
import type { TextureEntry } from '../../render/types.ts';

const tex = (name: string, hd = false): TextureEntry =>
  ({ texture: name as unknown as WebGLTexture, width: 10, height: 10, regX: 0, regY: 0, hasAlpha: false, hd });

function bundle(): LoadedGameBundle {
  return {
    gameId: 'rescueblade',
    manifest: { stage: { width: 512, height: 330, frameRate: 30, bgColor: [0, 0, 0] }, frameLabels: [], frameCount: 0, members: [] },
    score: [],
    membersByKey: new Map(),
    texturesByKey: new Map(),
    originalTexturesByKey: new Map([['3:1', tex('orig-1')], ['3:61', tex('orig-hud')]]),
    hdTexturesByKey: new Map([['3:61', tex('hud-hd')]]),
    hdBitmapTexturesByKey: new Map([['3:1', tex('hd-1', true)], ['3:61', tex('hd-hud', true)]]),
    mapsByLevel: new Map(),
  };
}

describe('applyTextureModes', () => {
  it('layers original, then HD bitmaps, then the HD HUD', () => {
    const b = bundle();
    applyTextureModes(b, { hdHud: true, hdGraphics: true });
    expect(b.texturesByKey.get('3:1')?.texture).toBe('hd-1');
    expect(b.texturesByKey.get('3:61')?.texture).toBe('hud-hd');
  });

  it('goes back to the original bitmaps when HD graphics are off', () => {
    const b = bundle();
    applyTextureModes(b, { hdHud: true, hdGraphics: true });
    applyTextureModes(b, { hdHud: false, hdGraphics: false });
    expect(b.texturesByKey.get('3:1')?.texture).toBe('orig-1');
    expect(b.texturesByKey.get('3:61')?.texture).toBe('orig-hud');
  });

  it('keeps the upscaled HUD bitmap when only the procedural HUD is off', () => {
    const b = bundle();
    applyTextureModes(b, { hdHud: false, hdGraphics: true });
    expect(b.texturesByKey.get('3:61')?.texture).toBe('hd-hud');
  });
});
