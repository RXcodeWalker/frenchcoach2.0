/**
 * S4: bump whenever judgement/prompt.ts changes in a way that changes the
 * rendered scoring prompt — paired with SCORING_PROMPT_FIXTURE_HASH in
 * __tests__/version-pin.test.ts, which fails loudly if the two drift apart.
 * Also bumped when the judgement stage changes how it reads the judge's
 * reply (this is the only judgement-stage version the envelope records).
 *
 * v0.3: scoreSpeaking strips one wrapping ```json fence before JSON.parse.
 * The rendered prompt is unchanged (the fixture hash did not move).
 *
 * v0.4: a role-play descriptorApplied made of several canonical bullets for
 * that mark (quoted together) is accepted; anything else is still rejected.
 * Prompt unchanged.
 *
 * v0.5 (P0 scoring-integrity steps 2–4, one bump for all three):
 * - Step 2: each turn renders the examiner support actually given
 *   ("Asked: … | Repeated ×n | Alternative question used | Second part asked
 *   | Extension prompts"), role-play tasks render their second part and
 *   repetitions, further-question answers are rendered as their own turns, and
 *   new instructions tell the judge to read repetition/alternative use only from
 *   that support, that the text is speech-recognition output, and that delivery
 *   cannot be heard.
 * - Step 3: the evidence allow-list keeps only the factual counts
 *   (responseCountsByQuestion, topicConversationDurationByConversation).
 * - Step 4: role-play quotes are grounded per task, duplicate taskIds are
 *   rejected, and a silent task may be marked 0 with no evidence spans (with a
 *   matching prompt instruction).
 */
export const SCORING_PROMPT_VERSION = 'scoring-prompt-v0.5';
