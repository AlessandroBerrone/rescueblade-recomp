import type { MovieGlobals } from './DirectorTypes.ts';

/**
 * Player progress kept in the browser, next to the original game's own prefs:
 *   rc_pref_<gameName>          lock-out tier (levels 4-6 / 7-9 unlocked), written by the Lingo port
 *   rc_pref_<gameName>_hi       best total score, written by the Lingo port
 *   rc_pref_<gameName>_progress next level, best score per level and control mode (this file)
 * gameName is the Director global gGameName: RBlade or RBlade2 (Bermuda).
 */
export const PREF_PREFIX = 'rc_pref_';
export const SAVE_FILE_FORMAT = 'rescueblade-recomp-save';

export interface GameProgress {
  level: number;
  levelScores: number[];
  proControls: number;
}

export function progressKey(gameName: string): string {
  return `${gameName}_progress`;
}

const toInt = (v: unknown, min: number, max: number): number | null => {
  const n = typeof v === 'number' ? v : Number.NaN;
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.trunc(n))) : null;
};

export function snapshotProgress(g: MovieGlobals, numLevels: number): GameProgress {
  return {
    level: g.gLevel,
    levelScores: g.gLevelScoreList.slice(0, numLevels).map((s) => Math.max(0, Math.trunc(s || 0))),
    proControls: g.gProControls === 1 ? 1 : 0,
  };
}

/** Parses saved progress, ignoring anything malformed or out of range. */
export function parseProgress(raw: string | null, numLevels: number): GameProgress | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  // gLevel goes one past the last level after finishing it; the menu clamps it.
  const level = toInt(d.level, 1, numLevels + 1) ?? 1;
  const scores = Array.isArray(d.levelScores) ? d.levelScores : [];
  const levelScores = Array.from({ length: numLevels }, (_, i) => toInt(scores[i], 0, 99_999_999) ?? 0);
  const proControls = d.proControls === 1 ? 1 : 0;
  return { level, levelScores, proControls };
}

export function applyProgress(g: MovieGlobals, p: GameProgress): void {
  g.gLevel = p.level;
  g.gCurrentLevel = p.level;
  p.levelScores.forEach((s, i) => { g.gLevelScoreList[i] = s; });
  g.gProControls = p.proControls;
}

/** localStorage, or null where the browser blocks it (private mode, disabled site data). */
export function browserStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export interface SaveFile {
  format: typeof SAVE_FILE_FORMAT;
  version: 1;
  exportedAt: string;
  prefs: Record<string, string>;
}

/** Every rc_pref_* entry, both games, as a downloadable save file. */
export function exportSave(storage: Pick<Storage, 'length' | 'key' | 'getItem'>, now = new Date()): SaveFile {
  const prefs: Record<string, string> = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key?.startsWith(PREF_PREFIX)) continue;
    const value = storage.getItem(key);
    if (value !== null) prefs[key.slice(PREF_PREFIX.length)] = value;
  }
  return { format: SAVE_FILE_FORMAT, version: 1, exportedAt: now.toISOString(), prefs };
}

/**
 * Checks a save file and returns the prefs to write. Only the keys this game uses are
 * accepted, so a wrong or tampered file cannot fill the browser with junk.
 */
export function parseSaveFile(text: string): Record<string, string> {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Il file non è un salvataggio valido.');
  }
  const d = data as Partial<SaveFile> | null;
  if (!d || d.format !== SAVE_FILE_FORMAT || typeof d.prefs !== 'object' || d.prefs === null) {
    throw new Error('Il file non è un salvataggio di RescueBlade Recomp.');
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(d.prefs)) {
    if (!/^RBlade2?(_hi|_progress)?$/.test(key) || typeof value !== 'string' || value.length > 4096) continue;
    out[key] = value;
  }
  if (Object.keys(out).length === 0) throw new Error('Il salvataggio è vuoto.');
  return out;
}

/** Replaces all saved progress (both games) with the imported prefs. */
export function importSave(
  storage: Pick<Storage, 'length' | 'key' | 'setItem' | 'removeItem'>,
  prefs: Record<string, string>
): void {
  const old: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith(PREF_PREFIX)) old.push(key);
  }
  for (const key of old) storage.removeItem(key);
  for (const [key, value] of Object.entries(prefs)) storage.setItem(`${PREF_PREFIX}${key}`, value);
}

/** Starts a download of the current save. */
export function downloadSave(): void {
  const storage = browserStorage();
  if (!storage) {
    window.alert('Questo browser non permette di salvare i progressi.');
    return;
  }
  const save = exportSave(storage);
  const blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rescueblade-salvataggio-${save.exportedAt.slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Asks for a save file, writes it and reloads so the running game picks it up. */
export function pickAndImportSave(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    const storage = browserStorage();
    try {
      if (!storage) throw new Error('Questo browser non permette di salvare i progressi.');
      const prefs = parseSaveFile(await file.text());
      if (!window.confirm('Importare questo salvataggio? I progressi attuali verranno sostituiti.')) return;
      importSave(storage, prefs);
      window.location.reload();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err));
    }
  });
  input.click();
}
