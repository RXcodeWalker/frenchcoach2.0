/**
 * Shared types for the Junior track's pure logic (plan Batch 2; spec
 * docs/systems/junior-track.md). Junior is mark-free: nothing here is a mark,
 * band, grade or score, and nothing here is read by src/domain/igcse/ (ADR 0012).
 */

/** What the matcher heard against the target sentence (junior-track §6). Never a verdict on the kid. */
export type MatchOutcome = 'got' | 'almost' | 'none';

/** The scaffold ladder, per sentence pattern (junior-track §5). */
export type ScaffoldStep = 'echo' | 'frame' | 'free';

/** Léo's five animated states. These ARE the per-turn feedback (junior-track §7). */
export type LeoState = 'listening' | 'happy' | 'celebrating' | 'curious' | 'thinking';

/** Which recogniser the rest of the mission uses (junior-track §2). */
export type Recogniser = 'webSpeech' | 'whisper';

/** One frame of a finished question turn, as the Postcard needs it. */
export interface JuniorTurnFrame {
  patternId: string;
  /** The scaffold step the frame was played at. */
  step: ScaffoldStep;
  /** The target sentence the kid built from their pick (rendered from the bank, never the transcript). */
  sentence: string;
}

/**
 * A finished question turn. There is deliberately no transcript field: the
 * Postcard shows what the kid was aiming for, never what the recogniser wrote.
 */
export interface JuniorTurnResult {
  questionId: string;
  /** Recorded honestly (turnFlow.ts): a turn that needed « On le dit ensemble ! » stays `none`. */
  outcome: MatchOutcome;
  frames: readonly JuniorTurnFrame[];
  /** Authored key words heard on the decisive attempt (the Postcard's chips). */
  heard: readonly string[];
  /** The kid's own recording of the decisive attempt, when one was kept. */
  recordingId: string | null;
}
