import { dispatchAddXP } from '../../../context/AppContext';

export interface CompleteMinigameSessionOptions {
  dispatch: Parameters<typeof dispatchAddXP>[0];
  score: number;
  mode?: string;
  recordSession?: boolean;
}

// Matches the existing "big win" ceiling already accepted elsewhere in the
// app (Challenges.tsx's 400 XP weekly claim). Real callers (e.g.
// SpeedSpeaking.tsx) accumulate score as round(10 * streakMultiplier) per
// correct answer over a timed round -- realistically 100-400 for an honest
// session, so this clamp doesn't clip legitimate high-performing sessions.
const MAX_MINIGAME_XP = 400;

/**
 * Thin wrapper around dispatchAddXP for minigame completion.
 * Skips dispatch when score is 0 (matches existing game behaviour).
 */
export function completeMinigameSession({
  dispatch,
  score,
}: CompleteMinigameSessionOptions): void {
  if (score > 0) {
    dispatchAddXP(dispatch, Math.min(score, MAX_MINIGAME_XP), 'minigame');
  }
}
