import type { MovieGlobals } from './DirectorTypes.ts';

export function createInitialGlobals(gameName: string): MovieGlobals {
  return {
    gFirstTime: 1,
    gGameName: gameName,
    gCurrentLevel: 1,
    gLevel: 1,
    gLevelResult: null,
    gLevelScoreList: new Array(15).fill(0),
    gScore: 0,
    gScoreTotal: 0,
    gTimeBonus: 0,
    gFlyingPoints: 0,
    gLockOut: '0',
    gPaused: 0,
    gProControls: 0,
    gTileIDList: [],
    gTileHeightList: [],
    gSceneryList: [],
    gUnderSeaHeightList: [],
    gXVel: 0,
    gXOffset: 0,
    gXVelChange: 0,
    gSeaFrame: 1,
    gfuelPercent: 100,
    gDamagePercent: 0,
    gCableItem: 0,
    gCableLength: 0,
    gRescueCount: 0,
    gRescuedList: [],
    gSmokeList: [],
    gPickupList: [],
    gPloshList: [],
    gPloshX: -1,
    gWaterFlow: 0,
    gCopterTile: 0,
    gGuyDoom: null,
    gCoconuts: 0,
    gCoconutList: [],
    gAbducteeList: [],
    yDonk: 0,
  };
}

/** Exact port of Director MovieScript 2 - Initialization.ls AngleGrind */
export function angleGrind(originX: number, originY: number, targetX: number, targetY: number): number {
  const radToDeg = 180 / Math.PI;
  const x = targetX - originX;
  const y = targetY - originY;
  if (x === 0 && y === 0) return 0;
  if (x === 0) return y < 0 ? 270 : 90;
  if (y === 0) return x > 0 ? 0 : 180;
  let grind = x > 0 ? Math.atan(y / x) * radToDeg : 180 + Math.atan(y / x) * radToDeg;
  if (grind < 0) grind += 360;
  return grind;
}

/**
 * Lingo integer(): rounds to the nearest integer, halves away from zero.
 * Not the same as Math.trunc for negative or fractional values.
 */
export function lingoInteger(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

/** Director random(N) returns an integer in [1, N] inclusive. */
export function directorRandom(max: number): number {
  const n = Math.floor(max);
  if (n <= 1) return 1;
  return Math.floor(Math.random() * n) + 1;
}
