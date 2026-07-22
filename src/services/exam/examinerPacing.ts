/**
 * Centralized timing constants for examiner voice pacing (S10 delivery polish).
 * Sub-second beats matching natural turn-taking latency — not exam slowdown;
 * total added time per turn is bounded (~1s worst case).
 */

export const PRE_SPEECH_LEAD_MS = 350;
export const INTER_ACTION_PAUSE_MS = 450;
export const PRE_LISTEN_PAUSE_MS = 550;

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
