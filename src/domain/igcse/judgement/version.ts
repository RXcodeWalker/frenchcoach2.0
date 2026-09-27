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
/*
 * v0.6 (0520 Phase 1 completion — Quality of Language in its own judge call):
 * L2 is now TWO prompts, each pinned in __tests__/version-pin.test.ts.
 * - buildRolePlayCommunicationPrompt: Table A + Table B, full transcript with
 *   examiner support and the L1 counts allow-list. Table C and the
 *   qualityOfLanguage block are gone; a line says QoL is marked separately.
 * - buildQualityOfLanguagePrompt: Table C only, topic conversations only (no
 *   role play, no examiner support, no L1 word counts). The contract puts
 *   `errors` first: the judge lists every error with a per-turn verbatim quote,
 *   states the booklet frequency wording (`errorFrequency`, recorded, never
 *   mapped to a mark), then best-fits the band holistically.
 * - Parsing: QoL error quotes are grounded in that one turn's candidate
 *   response (buildTopicTurnCorpora); QoL sources exclude rolePlay.
 *
 * v0.6.1 (judge:check, real-Gemini run): the QoL contract's turnId
 * placeholder ("<turn id as rendered>") and the quote-rule line were
 * ambiguous against the transcript's own "Turn q1" heading — a real Gemini
 * reply echoed "Turn q1" as the turnId itself, which
 * validateQolErrors rejected as an unknown turn on every run. Both now say
 * explicitly that turnId is the BARE id ("q1"), never "Turn q1". No contract
 * shape change, no rubric change.
 *
 * v0.6.2 TRIED AND REVERTED (judge:check, verbatim "weak" regression) — the
 * prompt still reads scoring-prompt-v0.6.1; this version number was never
 * released. On the verbatim pre-change "weak" transcript, QoL rose from a
 * pre-change 5 to 7-10 — QOL_NO_QUANTITY_LINE was being read as "do not
 * penalise a lack of language" rather than "do not reward length as such."
 * Tried adding a QOL_QUANTITY_BALANCE_LINE directly after it: Table C's own
 * 4-6/1-3 booklet wording (0520/03/TN, p.12) on range and completeness,
 * stating that one-word/fragment answers and sentences missing a required
 * verb form or article count as evidence under those bullets, while
 * accurate complete sentences are not penalised for being short. No
 * numbers, counts or thresholds were added, and no other prompt, schema, or
 * guardrail was touched.
 *
 * Result (3 verbatim runs, gemini-3.5-flash-lite): weak's QoL was 7, 7, 7 —
 * unchanged from v0.6.1's 7, 7, 10 in the sense that mattered (still over
 * the <=6 pass bar in 3/3 runs); the pre-decided SUCCESS rule required
 * weak's QoL <=6 in 3/3, so this attempt failed it and was reverted per the
 * one-attempt-only instruction. strong (QoL 15 x3) and split-b (Comm 4,
 * QoL 9 x3 — the accurate-short-answer guard) were unaffected; split-a's
 * QoL stayed at 11 in all 3 runs (not higher, but not lower either). See
 * verification-log.md's corresponding entry for the full table, the
 * judge's own QoL justification text (it kept citing "Satisfactory"/"Good"
 * band language even with the new instruction present), and the
 * -reconstructed hold-out comparison. Not retried with different wording,
 * per the task's one-attempt-only instruction — a genuine open finding,
 * left for a future session.
 */
export const SCORING_PROMPT_VERSION = 'scoring-prompt-v0.6.1';
