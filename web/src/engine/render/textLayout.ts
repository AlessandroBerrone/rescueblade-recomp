import { cssFont, fontScaleX } from './textFonts.ts';

/** Character style run of a Director text member (from its XMED data). */
export interface TextRunStyle {
  readonly start: number;
  readonly font: string;
  readonly size: number;
  readonly ascent: number;
  readonly descent: number;
  readonly color: readonly [number, number, number] | readonly number[];
}

export type TextAlign = 'left' | 'center' | 'right' | 'justify';

export interface TextParaStyle {
  readonly start: number;
  readonly align: TextAlign;
  /** Fixed line height in px; 0 = from the tallest character on the line. */
  readonly lineSpacing: number;
}

export interface TextStyles {
  readonly runs: readonly TextRunStyle[];
  readonly paras: readonly TextParaStyle[];
}

export interface PlacedText {
  readonly x: number;
  readonly baseline: number;
  readonly text: string;
  readonly font: string;
  /** Horizontal squeeze to draw with (the measured widths already include it). */
  readonly scaleX: number;
  readonly color: string;
  /** Lowest pixel row the text reaches. */
  readonly bottom: number;
}

export type MeasureFn = (text: string, font: string) => number;

function measureRun(measure: MeasureFn, text: string, run: TextRunStyle): number {
  return measure(text, cssFont(run.font, run.size)) * fontScaleX(run.font);
}

/** Director's default tab stops: every half inch. */
const TAB = 36;

interface Piece {
  text: string;
  run: TextRunStyle;
  kind: 'word' | 'space' | 'tab';
  width: number;
}

function styleAt<T extends { start: number }>(list: readonly T[], offset: number): T {
  let cur = list[0];
  for (const s of list) {
    if (s.start <= offset) cur = s;
    else break;
  }
  return cur;
}

function rgb(c: readonly number[]): string {
  return `rgb(${c[0] ?? 0}, ${c[1] ?? 0}, ${c[2] ?? 0})`;
}

/**
 * When a script replaces a member's text, Director keeps the style of the first
 * character and the first paragraph for the whole new text.
 */
export function collapseStyles(styles: TextStyles): TextStyles {
  return {
    runs: styles.runs.length ? [{ ...styles.runs[0], start: 0 }] : [],
    paras: styles.paras.length ? [{ ...styles.paras[0], start: 0 }] : [],
  };
}

/** Lays out styled text in a box `width` px wide: word wrap, tabs, alignment, line spacing. */
export function layoutText(text: string, styles: TextStyles, width: number, measure: MeasureFn): PlacedText[] {
  const runs = styles.runs.length
    ? [...styles.runs].sort((a, b) => a.start - b.start)
    : [{ start: 0, font: '', size: 12, ascent: 12, descent: 3, color: [0, 0, 0] }];
  const paras = styles.paras.length ? [...styles.paras].sort((a, b) => a.start - b.start) : [{ start: 0, align: 'left' as TextAlign, lineSpacing: 0 }];
  const out: PlacedText[] = [];
  let top = 0;
  let offset = 0;

  for (const paraText of text.split('\n')) {
    const para = styleAt(paras, offset);
    // Split the paragraph into words, spaces and tabs, each with one character style.
    const pieces: Piece[] = [];
    for (let i = 0; i < paraText.length; ) {
      const run = styleAt(runs, offset + i);
      const nextRun = runs.find((r) => r.start > offset + i)?.start ?? Infinity;
      const ch = paraText[i];
      const kind: Piece['kind'] = ch === '\t' ? 'tab' : ch === ' ' ? 'space' : 'word';
      let j = i + 1;
      if (kind !== 'tab') {
        while (j < paraText.length && offset + j < nextRun) {
          const c = paraText[j];
          const k = c === '\t' ? 'tab' : c === ' ' ? 'space' : 'word';
          if (k !== kind) break;
          j++;
        }
      }
      const t = paraText.slice(i, j);
      pieces.push({ text: t, run, kind, width: kind === 'tab' ? 0 : measureRun(measure, t, run) });
      i = j;
    }
    // The paragraph mark carries a style too: it sets the height of an empty line.
    const markRun = styleAt(runs, offset + paraText.length);

    // Break into lines.
    const lines: Piece[][] = [];
    let line: Piece[] = [];
    let x = 0;
    const pushLine = () => {
      while (line.length && line[line.length - 1].kind === 'space') line.pop();
      lines.push(line);
      line = [];
      x = 0;
    };
    for (const p of pieces) {
      if (p.kind === 'tab') {
        p.width = (Math.floor(x / TAB) + 1) * TAB - x;
      }
      if (p.kind === 'word' && x + p.width > width && line.some((q) => q.kind !== 'space')) {
        pushLine();
      }
      if (p.kind === 'space' && line.length === 0 && lines.length > 0) continue;
      if (p.kind === 'word' && p.width > width && line.length === 0) {
        // A word longer than the box: break it by characters.
        let chunk = '';
        for (const c of p.text) {
          const w = measureRun(measure, chunk + c, p.run);
          if (w > width && chunk) {
            line.push({ ...p, text: chunk, width: measureRun(measure, chunk, p.run) });
            pushLine();
            chunk = c;
          } else chunk += c;
        }
        p.text = chunk;
        p.width = measureRun(measure, chunk, p.run);
      }
      line.push(p);
      x += p.width;
    }
    pushLine();

    lines.forEach((ln, li) => {
      const ascent = ln.length ? Math.max(...ln.map((p) => p.run.ascent)) : markRun.ascent;
      const descent = ln.length ? Math.max(...ln.map((p) => p.run.descent)) : markRun.descent;
      const height = para.lineSpacing > 0 ? para.lineSpacing : ascent + descent;
      const baseline = top + height - descent;
      const used = ln.reduce((s, p) => s + p.width, 0);
      const last = li === lines.length - 1;
      let px = 0;
      let extraPerSpace = 0;
      if (para.align === 'center') px = (width - used) / 2;
      else if (para.align === 'right') px = width - used;
      else if (para.align === 'justify' && !last) {
        const spaces = ln.filter((p) => p.kind === 'space').length;
        if (spaces) extraPerSpace = Math.max(0, width - used) / spaces;
      }
      for (const p of ln) {
        if (p.kind === 'word') {
          out.push({ x: px, baseline, text: p.text, font: cssFont(p.run.font, p.run.size), scaleX: fontScaleX(p.run.font), color: rgb(p.run.color), bottom: baseline + p.run.descent });
        }
        px += p.width + (p.kind === 'space' ? extraPerSpace : 0);
      }
      top += height;
    });
    offset += paraText.length + 1;
  }
  return out;
}
