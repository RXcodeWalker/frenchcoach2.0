// ── Phase 4 hard gate ─────────────────────────────────────────────────────
// coachService.ts is the offline (no-LLM) fallback path. Phase 4
// (i-am-building-an-cosmic-cascade.md §Phase 4) retires the invented
// weighted-formula scorer (`_computeScores`: base 2.0 + correctTenseCount*1.2
// + ... — exactly the kind of un-sourced Cambridge weight the Assessment
// Engine exists to delete) and the score-derived examiner verdict
// (`_buildExaminerVerdict`, which turned that invented number into a fake
// predicted band). Offline now returns evidence + deterministic coaching
// text with placeholder zero scores and an explicit `unscored:
// 'no_llm_offline'` flag — never a fabricated mark presented as real.
//
// This test pins that regression: nobody should reintroduce a weighted
// scoring formula or a score-driven verdict builder into this file.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluate } from '../coachService';
import type { Question } from '../../../types';

const SOURCE_PATH = join(__dirname, '../coachService.ts');

describe('no invented scoring formula in coachService.ts', () => {
  it('does not define a weighted score-computation function', () => {
    const source = readFileSync(SOURCE_PATH, 'utf8');
    expect(source).not.toMatch(/_computeScores/);
    expect(source).not.toMatch(/_buildExaminerVerdict/);
  });

  it('does not reference scoreToBand or LANGUAGE_SUCCESS_SCORE (band/score-gated prose)', () => {
    const source = readFileSync(SOURCE_PATH, 'utf8');
    expect(source).not.toMatch(/scoreToBand/);
    expect(source).not.toMatch(/LANGUAGE_SUCCESS_SCORE/);
  });

  it('does not contain the old hand-tuned per-signal score weights', () => {
    const source = readFileSync(SOURCE_PATH, 'utf8');
    // Literal coefficients from the deleted formula — a reintroduction of
    // any of these particular magic numbers alongside "language"/"comm"/
    // "fluency" locals would mean the formula crept back in.
    expect(source).not.toMatch(/correctTenseCount\s*\*\s*1\.2/);
    expect(source).not.toMatch(/relevanceScore\s*\*\s*2\.0/);
  });
});

describe('offline evaluate() never fabricates a mark', () => {
  const question: Question = {
    id: 'q1',
    topicKey: 'school',
    text: "Qu'est-ce que tu penses de ton collège ?",
    difficulty: 2,
  } as Question;

  it('flags the result as unscored', () => {
    const transcript = 'Je pense que le collège est intéressant parce que il y a beaucoup de matières et je aime les sciences et le sport et mes profs sont sympas et je joue le football avec mes amis après les cours chaque semaine.';
    const result = evaluate(transcript, question);
    expect(result.unscored).toBe('no_llm_offline');
  });

  it('returns an all-zero placeholder score, not a computed number', () => {
    const transcript = 'Je pense que le collège est intéressant parce que il y a beaucoup de matières et je aime les sciences et le sport et mes profs sont sympas et je joue le football avec mes amis après les cours chaque semaine.';
    const result = evaluate(transcript, question);
    expect(result.scores).toEqual({ overall: 0, communication: 0, language: 0, fluency: 0 });
  });

  it('carries no examiner verdict (no predicted band derived from a placeholder score)', () => {
    const transcript = 'Je pense que le collège est intéressant parce que il y a beaucoup de matières et je aime les sciences et le sport et mes profs sont sympas et je joue le football avec mes amis après les cours chaque semaine.';
    const result = evaluate(transcript, question);
    expect(result.examiner).toBeUndefined();
  });
});
