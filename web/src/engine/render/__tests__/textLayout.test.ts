import { describe, expect, it } from 'vitest';
import { collapseStyles, layoutText, type TextStyles } from '../textLayout.ts';

// Every character is 10 px wide at size 10 (the Agency squeeze is applied on top).
const measure = (t: string, font: string) => t.length * Number(/(\d+)px/.exec(font)![1]);
const run = (start: number, size: number, color = [255, 255, 255]) => ({ start, font: 'Arial', size, ascent: size, descent: 2, color });

describe('layoutText', () => {
  it('wraps words at the box width and keeps fixed line spacing', () => {
    const styles: TextStyles = { runs: [run(0, 10)], paras: [{ start: 0, align: 'left', lineSpacing: 16 }] };
    const items = layoutText('aaa bbb ccc', styles, 75, measure);
    expect(items.map((i) => [i.text, i.x, i.baseline])).toEqual([
      ['aaa', 0, 14],
      ['bbb', 40, 14],
      ['ccc', 0, 30],
    ]);
  });

  it('mixes sizes on one line and aligns paragraphs', () => {
    const styles: TextStyles = {
      runs: [run(0, 20), run(2, 10)],
      paras: [
        { start: 0, align: 'left', lineSpacing: 0 },
        { start: 5, align: 'right', lineSpacing: 0 },
      ],
    };
    const items = layoutText('AB cd\nxy', styles, 100, measure);
    expect(items[0]).toMatchObject({ text: 'AB', x: 0, baseline: 20 });
    expect(items[1]).toMatchObject({ text: 'cd', x: 50, baseline: 20 });
    // Second paragraph: right aligned, height from its own 10 px text.
    expect(items[2]).toMatchObject({ text: 'xy', x: 80, baseline: 32 });
  });

  it('justifies every line of a paragraph but the last', () => {
    const styles: TextStyles = { runs: [run(0, 10)], paras: [{ start: 0, align: 'justify', lineSpacing: 0 }] };
    const items = layoutText('aa bb cc dd', styles, 90, measure);
    expect(items.map((i) => i.x)).toEqual([0, 35, 70, 0]);
  });

  it('moves tabs to the next half-inch stop', () => {
    const styles: TextStyles = { runs: [run(0, 10)], paras: [{ start: 0, align: 'left', lineSpacing: 0 }] };
    const items = layoutText('ab\t\tc', styles, 200, measure);
    expect(items.map((i) => i.x)).toEqual([0, 72]);
  });

  it('keeps the first style when a script replaces the text', () => {
    const styles: TextStyles = {
      runs: [run(0, 24), run(5, 10, [0, 0, 255])],
      paras: [{ start: 0, align: 'center', lineSpacing: 0 }, { start: 8, align: 'left', lineSpacing: 30 }],
    };
    const c = collapseStyles(styles);
    expect(c.runs).toHaveLength(1);
    expect(c.runs[0].size).toBe(24);
    expect(c.paras).toEqual([{ start: 0, align: 'center', lineSpacing: 0 }]);
  });
});
