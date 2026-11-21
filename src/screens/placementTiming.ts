/** The shortest the "Transcribing… Scoring…" state stays up after a placement answer. Feedback can come back
 * instantly (offline marking, a cached reply); without a floor the screen jumps to the next question as if the
 * tap did nothing. A module of its own so tests can set it to 0. */
export const MIN_PLACEMENT_PROCESSING_MS = 2500;
