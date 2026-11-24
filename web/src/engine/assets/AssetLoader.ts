import { buildHdHudTextures } from '../render/HdHudTextures.ts';
import type { TextureEntry } from '../render/types.ts';
import type { WebGL2StageRenderer } from '../render/WebGL2StageRenderer.ts';

export type GameId = 'rescueblade' | 'bermuda';

export interface CastBitmapMeta {
  width: number;
  height: number;
  rect: [number, number, number, number];
  regPoint: [number, number];
  bpp: number;
  flags: number;
  paletteId: number;
  hasAlpha: boolean;
}

export interface CastMemberEntry {
  castLib: number;
  castName: string;
  member: number;
  type: number; // 1=Bitmap, 6=Sound, 11=Script, 15=Xtra/Text
  name: string;
  file?: string;
  bitmap?: CastBitmapMeta;
  sound?: {
    sampleRate: number;
    channels: number;
    sampleSize: number;
    durationSec: number;
    loop?: boolean;
  };
  xtra?: {
    kind: string;
    text?: string;
  };
}

export interface FrameLabelEntry {
  frame: number;
  label: string;
}

export interface GameManifest {
  stage: {
    width: number;
    height: number;
    frameRate: number;
    bgColor: [number, number, number];
  };
  frameLabels: FrameLabelEntry[];
  frameCount: number;
  members: CastMemberEntry[];
}

export interface ScoreSpriteEntry {
  spriteNum: number;
  spriteType: number;
  ink: number;
  castLib: number;
  member: number;
  locH: number;
  locV: number;
  width: number;
  height: number;
  blendByte: number;
  rotationRaw: number;
  behaviors: { castLib: number; member: number; name?: string; params?: Record<string, unknown> }[];
  memberName?: string;
  memberType?: number;
}

export interface ScoreFrameEntry {
  frame: number;
  frameScript: { castLib: number; member: number; name?: string } | null;
  sprites: ScoreSpriteEntry[];
}

export interface LoadedGameBundle {
  gameId: GameId;
  manifest: GameManifest;
  score: ScoreFrameEntry[];
  membersByKey: Map<string, CastMemberEntry>;
  texturesByKey: Map<string, TextureEntry>;
  originalTexturesByKey?: Map<string, TextureEntry>;
  hdTexturesByKey?: Map<string, TextureEntry>;
  mapsByLevel: Map<number, { tileIds: number[]; tileHeights: number[]; sceneryIds: number[] }>;
}

export function applyHudTextures(bundle: LoadedGameBundle, hd: boolean): void {
  const source = hd ? bundle.hdTexturesByKey : bundle.originalTexturesByKey;
  if (!source) return;
  if (hd) {
    for (const [key, tex] of source) {
      bundle.texturesByKey.set(key, tex);
    }
  } else if (bundle.hdTexturesByKey) {
    for (const key of bundle.hdTexturesByKey.keys()) {
      const orig = source.get(key);
      if (orig) bundle.texturesByKey.set(key, orig);
      else bundle.texturesByKey.delete(key);
    }
  }
}

export function memberKey(castLib: number, member: number): string {
  return `${castLib}:${member}`;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

function parseMapText(text: string): { tileIds: number[]; tileHeights: number[]; sceneryIds: number[] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const parseRow = (line: string | undefined) =>
    line ? line.split(',').map((s) => Number.parseInt(s.trim(), 10) || 0) : [];
  return {
    tileIds: parseRow(lines[0]),
    tileHeights: parseRow(lines[1]),
    sceneryIds: parseRow(lines[2]),
  };
}

export async function loadGameAssets(
  gameId: GameId,
  renderer: WebGL2StageRenderer,
  hdHud = true
): Promise<LoadedGameBundle> {
  const base = `${import.meta.env.BASE_URL}assets/${gameId}`;
  const [manifestRes, scoreRes] = await Promise.all([
    fetch(`${base}/manifest.json`),
    fetch(`${base}/score.json`),
  ]);
  if (!manifestRes.ok || !scoreRes.ok) {
    throw new Error(`Failed to fetch manifest/score for ${gameId}`);
  }
  const manifest = (await manifestRes.json()) as GameManifest;
  const score = (await scoreRes.json()) as ScoreFrameEntry[];

  const membersByKey = new Map<string, CastMemberEntry>();
  const texturesByKey = new Map<string, TextureEntry>();
  const mapsByLevel = new Map<number, { tileIds: number[]; tileHeights: number[]; sceneryIds: number[] }>();

  const imageTasks: Promise<void>[] = [];

  for (const m of manifest.members) {
    const key = memberKey(m.castLib, m.member);
    membersByKey.set(key, m);

    if (m.type === 1 && m.file && m.bitmap) {
      const url = `${base}/${m.file}`;
      const bmp = m.bitmap;
      imageTasks.push(
        loadImage(url).then((img) => {
          const tex = renderer.createImageTexture(
            img,
            bmp.regPoint[0],
            bmp.regPoint[1],
            bmp.hasAlpha
          );
          texturesByKey.set(key, tex);
        })
      );
    } else if (m.type === 15 && m.castLib === 6 && m.xtra?.text) {
      mapsByLevel.set(m.member, parseMapText(m.xtra.text));
    }
  }

  await Promise.all(imageTasks);

  const originalTexturesByKey = new Map(texturesByKey);
  const hdTexturesByKey =
    typeof document !== 'undefined' ? buildHdHudTextures(renderer, gameId) : undefined;

  const bundle: LoadedGameBundle = {
    gameId,
    manifest,
    score,
    membersByKey,
    texturesByKey,
    originalTexturesByKey,
    hdTexturesByKey,
    mapsByLevel,
  };

  applyHudTextures(bundle, hdHud);
  return bundle;
}
