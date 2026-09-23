/**
 * S4: bump whenever judgement/prompt.ts changes in a way that changes the
 * rendered scoring prompt — paired with SCORING_PROMPT_FIXTURE_HASH in
 * __tests__/version-pin.test.ts, which fails loudly if the two drift apart.
 * Also bumped when the judgement stage changes how it reads the judge's
 * reply (this is the only judgement-stage version the envelope records).
 *
 * v0.3: scoreSpeaking strips one wrapping ```json fence before JSON.parse.
 * The rendered prompt is unchanged (the fixture hash did not move).
 */
export const SCORING_PROMPT_VERSION = 'scoring-prompt-v0.3';
