import { describe, expect, it } from 'vitest';
import { gameUrl, parseGameParam } from '../LaunchScreen.ts';

describe('launch page URL handling', () => {
  it('starts a game only for a known ?game= value', () => {
    expect(parseGameParam('?game=rescueblade')).toBe('rescueblade');
    expect(parseGameParam('?game=bermuda&touch=1')).toBe('bermuda');
    expect(parseGameParam('')).toBeNull();
    expect(parseGameParam('?game=pong')).toBeNull();
  });

  it('builds game and launch URLs keeping the path and other params', () => {
    const loc = { pathname: '/rescueblade-recomp/', search: '?touch=1', hash: '' };
    expect(gameUrl('bermuda', loc)).toBe('/rescueblade-recomp/?touch=1&game=bermuda');
    expect(gameUrl(null, { ...loc, search: '?game=bermuda&touch=1' })).toBe('/rescueblade-recomp/?touch=1');
    expect(gameUrl(null, { pathname: '/', search: '?game=rescueblade', hash: '' })).toBe('/');
  });
});
