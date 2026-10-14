/**
 * The scaffold ladder, per sentence pattern (junior-track §5).
 *
 * | Step  | What the kid sees                                          | Moves up after   |
 * |-------|------------------------------------------------------------|------------------|
 * | echo  | picks the picture; Léo says THEIR sentence; kid repeats    | 2 "got it" turns |
 * | frame | picture + sentence frame, no model audio first             | 3 "got it" turns |
 * | free  | question + pictures, no frame; "help" shows the frame      | —                |
 *
 * - Moving up is celebrated: `recordPatternTurn` returns a `levelledUp` event and
 *   the caller has Léo say the pattern's level-up line.
 * - Moving down is silent: two misses at a step drop the kid one step and return
 *   no event.
 *
 * Counting, as implemented: "got it" turns count up while the kid is at a step;
 * a "miss" is any turn at that step that wasn't "got it" (`almost` or `none`),
 * and two misses IN A ROW drop the step (a "got it" resets the miss count, so
 * occasional misses spread over weeks never drop a kid who is doing well). Both
 * counts restart at zero whenever the step changes. A new pattern starts at Echo.
 *
 * Pure. The per-pattern progress is stored per kid by the caller (Batch 3,
 * through the reducer).
 */
import type { MatchOutcome, ScaffoldStep } from './types';

export const SCAFFOLD_STEPS: readonly ScaffoldStep[] = ['echo', 'frame', 'free'];

/** "Got it" turns needed at a step to move up; Free is the top. */
export const MOVE_UP_AFTER: Readonly<Record<ScaffoldStep, number | null>> = { echo: 2, frame: 3, free: null };

/** Misses in a row at a step that quietly drop the kid one step. */
export const MOVE_DOWN_AFTER_MISSES = 2;

export interface PatternProgress {
  step: ScaffoldStep;
  /** "Got it" turns at the current step. */
  got: number;
  /** Misses in a row at the current step. */
  misses: number;
}

export interface LevelledUp {
  type: 'levelledUp';
  patternId: string;
  from: ScaffoldStep;
  to: ScaffoldStep;
}

export const INITIAL_PATTERN_PROGRESS: PatternProgress = { step: 'echo', got: 0, misses: 0 };

/** The step a pattern is at for this kid (Echo when they have never met it). */
export function stepFor(progress: Readonly<Record<string, PatternProgress>>, patternId: string): ScaffoldStep {
  return progress[patternId]?.step ?? 'echo';
}

/** One turn's outcome for one pattern → the pattern's new progress, plus a `levelledUp` event on a move up only. */
export function recordPatternTurn(
  patternId: string,
  progress: PatternProgress | undefined,
  outcome: MatchOutcome,
): { progress: PatternProgress; event: LevelledUp | null } {
  const current = progress ?? INITIAL_PATTERN_PROGRESS;
  const index = SCAFFOLD_STEPS.indexOf(current.step);

  if (outcome === 'got') {
    const got = current.got + 1;
    const needed = MOVE_UP_AFTER[current.step];
    if (needed !== null && got >= needed) {
      const to = SCAFFOLD_STEPS[index + 1];
      return { progress: { step: to, got: 0, misses: 0 }, event: { type: 'levelledUp', patternId, from: current.step, to } };
    }
    return { progress: { ...current, got, misses: 0 }, event: null };
  }

  const misses = current.misses + 1;
  if (misses >= MOVE_DOWN_AFTER_MISSES && index > 0) {
    return { progress: { step: SCAFFOLD_STEPS[index - 1], got: 0, misses: 0 }, event: null };
  }
  return { progress: { ...current, misses: Math.min(misses, MOVE_DOWN_AFTER_MISSES) }, event: null };
}

/**
 * A whole turn (1–2 frames) → every pattern's new progress. Each frame's own
 * outcome moves its own pattern; a pattern used by both frames of one turn moves
 * once, on the turn's weaker frame (so one turn never counts as two "got it"s).
 */
export function recordTurn(
  all: Readonly<Record<string, PatternProgress>>,
  frames: ReadonlyArray<{ patternId: string; outcome: MatchOutcome }>,
): { progress: Record<string, PatternProgress>; events: LevelledUp[] } {
  const rank: Record<MatchOutcome, number> = { none: 0, almost: 1, got: 2 };
  const perPattern = new Map<string, MatchOutcome>();
  for (const f of frames) {
    const prev = perPattern.get(f.patternId);
    if (prev === undefined || rank[f.outcome] < rank[prev]) perPattern.set(f.patternId, f.outcome);
  }
  const progress: Record<string, PatternProgress> = { ...all };
  const events: LevelledUp[] = [];
  for (const [patternId, outcome] of perPattern) {
    const r = recordPatternTurn(patternId, all[patternId], outcome);
    progress[patternId] = r.progress;
    if (r.event) events.push(r.event);
  }
  return { progress, events };
}
