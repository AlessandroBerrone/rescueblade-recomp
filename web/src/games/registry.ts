import type { GameId } from '../engine/assets/AssetLoader.ts';
import type { BehaviorFactory } from '../engine/runtime/DirectorTypes.ts';
import type { BehaviorRegistry } from '../engine/runtime/MovieRuntime.ts';
import { registerSharedCoreBehaviors } from './shared/coreBehaviors.ts';
import { registerSharedCopterBehaviors } from './shared/copterBehaviors.ts';
import { registerOceanBehaviors } from './shared/oceanBehaviors.ts';
import { registerHazardBehaviors } from './shared/hazardBehaviors.ts';
import { registerBossBehaviors } from './shared/bossBehaviors.ts';
import { registerBermudaBehaviors } from './bermuda/behaviors.ts';
import { registerBermudaBossAndSubBehaviors } from './bermuda/bossAndSubBehaviors.ts';

export function createBehaviorRegistry(gameId: GameId): BehaviorRegistry {
  const map = new Map<string, BehaviorFactory>();
  registerSharedCoreBehaviors(map);
  registerSharedCopterBehaviors(map);
  registerOceanBehaviors(map);
  registerHazardBehaviors(map);
  registerBossBehaviors(map);

  if (gameId === 'bermuda') {
    registerBermudaBehaviors(map);
    registerBermudaBossAndSubBehaviors(map);
  }

  return map;
}
