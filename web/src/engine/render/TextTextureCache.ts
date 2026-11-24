import type { TextureEntry } from './types.ts';
import type { WebGL2StageRenderer } from './WebGL2StageRenderer.ts';
import { layoutText, type TextStyles } from './textLayout.ts';

const styleIds = new WeakMap<object, number>();
let nextStyleId = 1;
function styleId(o: object): number {
  let id = styleIds.get(o);
  if (id === undefined) {
    id = nextStyleId++;
    styleIds.set(o, id);
  }
  return id;
}

export class TextTextureCache {
  private readonly cache = new Map<string, { sig: string; entry: TextureEntry; canvas: HTMLCanvasElement }>();
  private scale: number;

  private readonly heights = new WeakMap<TextureEntry, number>();

  /** Height in stage px the text needs (at least the box height it was drawn for). */
  public heightOf(entry: TextureEntry): number {
    return this.heights.get(entry) ?? 0;
  }

  private measureCtx: CanvasRenderingContext2D | null = null;

  private readonly measure = (text: string, font: string): number => {
    this.measureCtx ??= document.createElement('canvas').getContext('2d')!;
    this.measureCtx.font = font;
    return this.measureCtx.measureText(text).width;
  };

  constructor(private readonly renderer: WebGL2StageRenderer, scale = 1) {
    this.scale = Math.max(1, Math.min(8, scale));
  }

  public setScale(scale: number): void {
    this.scale = Math.max(1, Math.min(8, scale));
  }

  public getScale(): number {
    return this.scale;
  }

  public getOrCreate(
    key: string,
    text: string,
    width: number,
    height: number,
    options: {
      fontSize?: number;
      color?: string;
      align?: CanvasTextAlign;
      bgColor?: string;
      /** Character and paragraph styles of the member: replaces the options above. */
      styles?: TextStyles;
    } = {}
  ): TextureEntry {
    const w = Math.max(2, Math.round(width));
    const h = Math.max(2, Math.round(height));
    const scale = this.scale;
    const fontSize = options.fontSize ?? 15;
    const color = options.color ?? '#0f172a';
    const align = options.align ?? 'left';
    const bgColor = options.bgColor ?? 'transparent';
    const sig = `${text}|${w}x${h}@${scale}|${fontSize}|${color}|${align}|${bgColor}|${options.styles ? styleId(options.styles) : ''}`;

    const existing = this.cache.get(key);
    if (existing && existing.sig === sig) {
      return existing.entry;
    }

    // Director grows a text box that is set to fit its text, and the score keeps the
    // old size: draw everything rather than cut the last lines off.
    const layout = options.styles ? layoutText(text, options.styles, w, this.measure) : null;
    const contentH = layout ? Math.ceil(Math.max(0, ...layout.map((i) => i.bottom))) : 0;
    const cw = Math.max(2, Math.round(w * scale));
    const ch = Math.max(2, Math.round(Math.max(h, contentH) * scale));

    const canvas = existing?.canvas ?? document.createElement('canvas');
    const sizeChanged = canvas.width !== cw || canvas.height !== ch;
    if (sizeChanged) {
      canvas.width = cw;
      canvas.height = ch;
    }

    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    if (bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, h);
    }

    if (layout) {
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      for (const item of layout) {
        ctx.font = item.font;
        ctx.fillStyle = item.color;
        ctx.setTransform(scale * item.scaleX, 0, 0, scale, item.x * scale, 0);
        ctx.fillText(item.text, 0, item.baseline);
      }
    } else {
      ctx.fillStyle = color;
      ctx.font = `bold ${fontSize}px "Agency FB", "Arial Narrow", Arial, sans-serif`;
      ctx.textBaseline = 'top';
      ctx.textAlign = align;

      const lines = text.split(/\r?\n/);
      const lineH = Math.round(fontSize * 1.2);
      const xPos = align === 'center' ? w / 2 : align === 'right' ? w - 4 : 4;
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], xPos, 4 + i * lineH, w - 8);
      }
    }

    if (existing && !sizeChanged) {
      this.renderer.updateTextureFromCanvas(existing.entry, canvas);
      this.heights.set(existing.entry, Math.max(h, contentH));
      existing.sig = sig;
      return existing.entry;
    }

    if (existing) {
      this.renderer.deleteTexture(existing.entry);
    }

    // Director Text sprites have regPoint at (0,0) top-left!
    const entry = this.renderer.createImageTexture(canvas, 0, 0, true);
    this.heights.set(entry, Math.max(h, contentH));
    this.cache.set(key, { sig, entry, canvas });
    return entry;
  }
}
