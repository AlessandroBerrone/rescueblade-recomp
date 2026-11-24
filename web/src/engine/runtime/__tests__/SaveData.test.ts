import { describe, expect, it } from 'vitest';
import { exportSave, importSave, parseProgress, parseSaveFile } from '../SaveData.ts';

function memoryStorage(init: Record<string, string> = {}) {
  const data = new Map(Object.entries(init));
  return {
    data,
    get length() { return data.size; },
    key: (i: number) => [...data.keys()][i] ?? null,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

describe('save data', () => {
  it('ignores malformed or out-of-range progress', () => {
    expect(parseProgress(null, 9)).toBeNull();
    expect(parseProgress('not json', 9)).toBeNull();
    expect(parseProgress('{"level":99,"levelScores":[-5,"x",300],"proControls":7}', 4)).toEqual({
      level: 5,
      levelScores: [0, 0, 300, 0],
      proControls: 0,
    });
  });

  it('round-trips both games through an export file and replaces old progress on import', () => {
    const from = memoryStorage({
      rc_pref_RBlade: '1',
      rc_pref_RBlade_hi: '4200',
      rc_pref_RBlade2_progress: '{"level":2,"levelScores":[900,0,0,0],"proControls":0}',
      unrelated: 'keep',
    });
    const file = JSON.stringify(exportSave(from, new Date('2026-11-24T12:00:00Z')));

    const to = memoryStorage({ rc_pref_RBlade: '2', rc_pref_RBlade_progress: '{"level":9}', other: 'x' });
    importSave(to, parseSaveFile(file));
    expect(Object.fromEntries(to.data)).toEqual({
      other: 'x',
      rc_pref_RBlade: '1',
      rc_pref_RBlade_hi: '4200',
      rc_pref_RBlade2_progress: '{"level":2,"levelScores":[900,0,0,0],"proControls":0}',
    });
  });

  it('rejects files that are not a save and drops unknown keys', () => {
    expect(() => parseSaveFile('hello')).toThrow();
    expect(() => parseSaveFile('{"format":"other","prefs":{}}')).toThrow();
    expect(parseSaveFile(JSON.stringify({
      format: 'rescueblade-recomp-save', version: 1, prefs: { RBlade_hi: '10', evil: 'x', RBlade: 3 },
    }))).toEqual({ RBlade_hi: '10' });
  });
});
