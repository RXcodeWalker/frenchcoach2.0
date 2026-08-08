import { dispatchAddXP } from '../../../context/AppContext';

export interface CompleteMinigameSessionOptions {
  dispatch: Parameters<typeof dispatchAddXP>[0];
  score: number;
  mode?: string;
  recordSession?: boolean;
}

/**
 * Thin wrapper around dispatchAddXP for minigame completion.
 * Skips dispatch when score is 0 (matches existing game behaviour).
 */
export function completeMinigameSession({
  dispatch,
  score,
}: CompleteMinigameSessionOptions): void {
  if (score > 0) {
    dispatchAddXP(dispatch, score, 'minigame');
  }
}
