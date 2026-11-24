import { ALL_ACTIONS, type ActionId, type ActionState, type InputState } from './types.ts';

/**
 * Input is polled once per display frame (60/90/120 Hz) but the Director score
 * ticks at a fixed 30 Hz. These helpers make sure a one-frame edge
 * (justPressed / justReleased) is seen by exactly one score tick:
 * edges from frames without a tick are carried over, and when a display frame
 * runs several ticks only the first one sees them.
 */
export function mergeInputEdges(prev: InputState, cur: InputState): InputState {
  const actions = {} as Record<ActionId, ActionState>;
  for (const a of ALL_ACTIONS) {
    const p = prev.actions[a];
    const c = cur.actions[a];
    actions[a] = {
      isPressed: c.isPressed,
      justPressed: p.justPressed || c.justPressed,
      justReleased: p.justReleased || c.justReleased,
    };
  }
  return {
    ...cur,
    actions,
    pointer: {
      ...cur.pointer,
      justPressed: prev.pointer.justPressed || cur.pointer.justPressed,
      justReleased: prev.pointer.justReleased || cur.pointer.justReleased,
    },
  };
}

export function hasInputEdges(state: InputState): boolean {
  if (state.pointer.justPressed || state.pointer.justReleased) return true;
  return ALL_ACTIONS.some((a) => state.actions[a].justPressed || state.actions[a].justReleased);
}

export function withoutInputEdges(state: InputState): InputState {
  const actions = {} as Record<ActionId, ActionState>;
  for (const a of ALL_ACTIONS) {
    actions[a] = { isPressed: state.actions[a].isPressed, justPressed: false, justReleased: false };
  }
  return {
    ...state,
    actions,
    pointer: { ...state.pointer, justPressed: false, justReleased: false },
  };
}
