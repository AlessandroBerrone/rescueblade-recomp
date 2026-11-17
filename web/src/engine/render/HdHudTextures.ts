import { memberKey, type GameId } from '../assets/AssetLoader.ts';
import type { TextureEntry } from './types.ts';
import type { WebGL2StageRenderer } from './WebGL2StageRenderer.ts';

const HUD_SCALE = 4;

function createScaledTexture(
  renderer: WebGL2StageRenderer,
  logicalW: number,
  logicalH: number,
  regX: number,
  regY: number,
  scale: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
): TextureEntry {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(2, Math.round(logicalW * scale));
  canvas.height = Math.max(2, Math.round(logicalH * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  draw(ctx, logicalW, logicalH);
  return renderer.createImageTexture(canvas, regX * scale, regY * scale, true);
}

function drawRoundedLeftCapPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.arc(x + r, y + h / 2, r, Math.PI / 2, -Math.PI / 2, false);
  ctx.closePath();
}

function drawRoundedRightCapPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.moveTo(x, y);
  ctx.lineTo(x + w - r, y);
  ctx.arc(x + w - r, y + h / 2, r, -Math.PI / 2, Math.PI / 2, false);
  ctx.lineTo(x, y + h);
  ctx.closePath();
}

function drawFullPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  const r = h / 2;
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2, false);
  ctx.lineTo(x + r, y + h);
  ctx.arc(x + r, y + r, r, Math.PI / 2, -Math.PI / 2, false);
  ctx.closePath();
}

function makeChromeGradient(ctx: CanvasRenderingContext2D, h: number): CanvasGradient {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0.0, '#f8fafc');
  grad.addColorStop(0.18, '#cbd5e1');
  grad.addColorStop(0.42, '#64748b');
  grad.addColorStop(0.68, '#e2e8f0');
  grad.addColorStop(0.88, '#94a3b8');
  grad.addColorStop(1.0, '#334155');
  return grad;
}

function drawScoreDigit(renderer: WebGL2StageRenderer, digit: number, scale: number): TextureEntry {
  return createScaledTexture(renderer, 16, 16, 8, 8, scale, (ctx) => {
    const ch = String(digit);
    ctx.font = '900 13.5px "Agency FB", "Arial Narrow", Impact, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.save();
    ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
    ctx.shadowBlur = 2.0;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.8;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(ch, 8, 8.6);
    ctx.restore();

    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(ch, 8, 8.6);

    const fill = ctx.createLinearGradient(0, 2, 0, 14);
    fill.addColorStop(0, '#1e293b');
    fill.addColorStop(0.5, '#090d14');
    fill.addColorStop(1, '#020617');
    ctx.fillStyle = fill;
    ctx.fillText(ch, 8, 8.6);
  });
}

function drawDamageFill(renderer: WebGL2StageRenderer, scale: number): TextureEntry {
  return createScaledTexture(renderer, 92, 17, 91, 8, scale, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0.0, '#ff4d4d');
    grad.addColorStop(0.22, '#ef1a1a');
    grad.addColorStop(0.65, '#b8000c');
    grad.addColorStop(1.0, '#660006');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const gloss = ctx.createLinearGradient(0, 1.5, 0, 8);
    gloss.addColorStop(0, 'rgba(255, 255, 255, 0.48)');
    gloss.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
    ctx.fillStyle = gloss;
    ctx.fillRect(2, 2, w - 4, 5.5);
  });
}

function drawFuelFill(renderer: WebGL2StageRenderer, scale: number): TextureEntry {
  return createScaledTexture(renderer, 93, 17, 0, 8, scale, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0.0, '#6ee787');
    grad.addColorStop(0.22, '#22c55e');
    grad.addColorStop(0.65, '#15803d');
    grad.addColorStop(1.0, '#052e16');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const gloss = ctx.createLinearGradient(0, 1.5, 0, 8);
    gloss.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
    gloss.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
    ctx.fillStyle = gloss;
    ctx.beginPath();
    ctx.moveTo(4, 2);
    ctx.lineTo(w - 2, 2);
    ctx.lineTo(w - 2, 7.5);
    ctx.lineTo(8, 7.5);
    ctx.closePath();
    ctx.fill();
  });
}

function drawDamageBezel(renderer: WebGL2StageRenderer, scale: number): TextureEntry {
  return createScaledTexture(renderer, 97, 25, 48, 12, scale, (ctx, w, h) => {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 1.8;
    ctx.shadowOffsetY = 0.8;

    ctx.beginPath();
    drawRoundedRightCapPill(ctx, -14, 1.2, w + 12.2, h - 2.4, (h - 2.4) / 2);
    drawRoundedRightCapPill(ctx, -14, 4.7, w + 7.2, h - 9.4, (h - 9.4) / 2);
    ctx.fillStyle = makeChromeGradient(ctx, h);
    ctx.fill('evenodd');
    ctx.restore();

    ctx.beginPath();
    drawRoundedRightCapPill(ctx, -14, 4.7, w + 7.2, h - 9.4, (h - 9.4) / 2);
    ctx.lineWidth = 0.9;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.stroke();

    ctx.beginPath();
    drawRoundedRightCapPill(ctx, -14, 1.2, w + 12.2, h - 2.4, (h - 2.4) / 2);
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.stroke();

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(1.5, 1.2);
    ctx.lineTo(14.5, 23.8);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(48, 12.8);
    ctx.transform(1, 0, -0.22, 1, 0, 0);
    ctx.font = '900 13px "Agency FB", "Arial Narrow", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.lineJoin = 'round';
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.strokeText('DAMAGE', 0, 0);

    const txtGrad = ctx.createLinearGradient(0, -6, 0, 6);
    txtGrad.addColorStop(0, '#990000');
    txtGrad.addColorStop(1, '#4c0000');
    ctx.fillStyle = txtGrad;
    ctx.fillText('DAMAGE', 0, 0);
    ctx.restore();
  });
}

function drawFuelBezel(renderer: WebGL2StageRenderer, scale: number): TextureEntry {
  return createScaledTexture(renderer, 96, 25, 48, 12, scale, (ctx, w, h) => {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 1.8;
    ctx.shadowOffsetY = 0.8;

    ctx.beginPath();
    drawRoundedLeftCapPill(ctx, 1.8, 1.2, w + 12.2, h - 2.4, (h - 2.4) / 2);
    drawRoundedLeftCapPill(ctx, 6.8, 4.7, w + 7.2, h - 9.4, (h - 9.4) / 2);
    ctx.fillStyle = makeChromeGradient(ctx, h);
    ctx.fill('evenodd');
    ctx.restore();

    ctx.beginPath();
    drawRoundedLeftCapPill(ctx, 6.8, 4.7, w + 7.2, h - 9.4, (h - 9.4) / 2);
    ctx.lineWidth = 0.9;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.stroke();

    ctx.beginPath();
    drawRoundedLeftCapPill(ctx, 1.8, 1.2, w + 12.2, h - 2.4, (h - 2.4) / 2);
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.stroke();

    ctx.save();
    ctx.font = '900 13.5px "Agency FB", "Arial Narrow", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.lineJoin = 'round';
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.strokeText('FUEL', 50, 12.8);

    const txtGrad = ctx.createLinearGradient(0, 6, 0, 19);
    txtGrad.addColorStop(0, '#0a7a1c');
    txtGrad.addColorStop(1, '#043b0c');
    ctx.fillStyle = txtGrad;
    ctx.fillText('FUEL', 50, 12.8);
    ctx.restore();
  });
}

function drawScoreBezel(renderer: WebGL2StageRenderer, scale: number): TextureEntry {
  return createScaledTexture(renderer, 109, 25, 54, 12, scale, (ctx, w, h) => {
    ctx.beginPath();
    drawFullPill(ctx, 4.5, 4.5, w - 9, h - 9);
    ctx.fillStyle = 'rgba(10, 15, 26, 0.8)';
    ctx.fill();

    ctx.beginPath();
    drawFullPill(ctx, 1.2, 1.2, w - 2.4, h - 2.4);
    drawFullPill(ctx, 4.8, 4.8, w - 9.6, h - 9.6);
    ctx.fillStyle = makeChromeGradient(ctx, h);
    ctx.fill('evenodd');
  });
}

function drawCoconutsStrip(renderer: WebGL2StageRenderer, scale: number): TextureEntry {
  return createScaledTexture(renderer, 90, 16, 89, 0, scale, (ctx) => {
    for (let i = 0; i < 10; i++) {
      const cx = 4.5 + i * 9;
      const cy = 8.4;

      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(cx + 0.4, cy + 0.7, 3.6, 5.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const grad = ctx.createRadialGradient(cx - 1.1, cy - 1.8, 0.6, cx, cy, 5.8);
      grad.addColorStop(0, '#ca8a34');
      grad.addColorStop(0.55, '#7c4a12');
      grad.addColorStop(1, '#3b1f06');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 3.6, 5.4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineWidth = 0.6;
      ctx.strokeStyle = '#291504';
      ctx.stroke();

      ctx.fillStyle = '#3f6212';
      ctx.beginPath();
      ctx.ellipse(cx, cy - 5.2, 1.3, 0.9, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#261203';
      ctx.beginPath();
      ctx.arc(cx - 0.9, cy - 2.4, 0.55, 0, Math.PI * 2);
      ctx.arc(cx + 0.9, cy - 2.4, 0.55, 0, Math.PI * 2);
      ctx.arc(cx, cy - 1.3, 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

export function buildHdHudTextures(
  renderer: WebGL2StageRenderer,
  gameId: GameId,
  scale = HUD_SCALE
): Map<string, TextureEntry> {
  const out = new Map<string, TextureEntry>();

  for (let d = 0; d <= 9; d++) {
    out.set(memberKey(3, 50 + d), drawScoreDigit(renderer, d, scale));
  }
  out.set(memberKey(3, 60), drawDamageFill(renderer, scale));
  out.set(memberKey(3, 61), drawDamageBezel(renderer, scale));
  out.set(memberKey(3, 62), drawFuelBezel(renderer, scale));
  out.set(memberKey(3, 63), drawFuelFill(renderer, scale));
  out.set(memberKey(3, 67), drawScoreBezel(renderer, scale));

  if (gameId === 'bermuda') {
    out.set(memberKey(3, 202), drawCoconutsStrip(renderer, scale));
  }

  return out;
}
