import { useCallback, useReducer } from 'react';
import type { Boss } from './bosses';
import { clearFog, createBattle, nextRound, resolveRound, type BattleState, type RoundInput } from './engine';

type Action =
  | { type: 'answer'; input: RoundInput }
  | { type: 'next' }
  | { type: 'clear-fog' };

function reducer(state: BattleState, action: Action): BattleState {
  switch (action.type) {
    case 'answer':
      return resolveRound(state, action.input);
    case 'next':
      return nextRound(state);
    case 'clear-fog':
      return clearFog(state);
  }
}

/**
 * The fight as React state. The seed is the only random input and is drawn
 * once, so the whole battle is the engine's pure functions (`engine.ts`) —
 * nothing here touches XP, sessions, storage or the network.
 */
export function useBattle(boss: Boss) {
  const [state, dispatch] = useReducer(reducer, boss, (b) => createBattle(b, Math.floor(Math.random() * 2 ** 32)));
  const answer = useCallback((input: RoundInput) => dispatch({ type: 'answer', input }), []);
  const next = useCallback(() => dispatch({ type: 'next' }), []);
  const lift = useCallback(() => dispatch({ type: 'clear-fog' }), []);
  return { state, answer, next, clearFog: lift };
}
