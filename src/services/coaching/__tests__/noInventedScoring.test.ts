// ── Phase 4 hard gate, widened by Workstream D3 ──────────────────────────────
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
// D3: the original version of this file only read coachService.ts and only
// grepped for the deleted identifiers by name — which is exactly how
// cefrVector.ts's `rareDensity*3 + complexRatio*2 + tenseRangeScore`
// weighted-sum-into-threshold formula slipped past it (fixed in E1). This
// widens the scan to every file under the three trees where an L1/coaching
// signal could be recombined into an invented Cambridge-mark-shaped number,
// and greps for the STRUCTURAL pattern (a weighted sum thresholded into
// bands/levels) rather than specific deleted names. A weighted-sum hit is not
// automatically a violation — coaching/analytics heuristics (exam-readiness
// prediction, streak/volume "consistency" scores) are legitimate uses of the
// same arithmetic shape. Each hit must be allow-listed with a reason, same
// shape as noRawScoreRenderInUI.test.ts's ALLOWED map.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { evaluate } from '../coachService';
import type { Question } from '../../../types';

const ROOT = join(__dirname, '../../../..');
const SCAN_DIRS = ['src/services/coaching', 'src/services/coach', 'src/domain/igcse/evidence'];

// A weighted-sum-into-threshold shape: `<term> * <coefficient>` combined via
// `+`, anywhere in the file. Deliberately loose (a grep guard, not a parser) —
// false positives get triaged into ALLOWED below with a reason; false
// negatives are the failure mode this test exists to close off.
const WEIGHTED_SUM_PATTERN = /[)\]\w]\s*\*\s*\d+(\.\d+)?\s*[+-]|[+-]\s*\(?[\w.]+\s*\*\s*\d+(\.\d+)?/;

// Each entry: why this file's weighted-sum-shaped arithmetic is NOT an
// invented Cambridge mark.
const ALLOWED: Record<string, string> = {
  'src/services/coach/weeklyReviewService.ts':
    'computeExamReadiness blends avgScore + skill-mastery bias into a 0-100 ' +
    '"exam readiness" coaching estimate, not a Cambridge mark — explicitly ' +
    'advisory UI content, never fed back into scoring',
  'src/services/coach/coachProfileService.ts':
    'computeConsistencyScore blends streak/volume into a 0-1 habit-consistency ' +
    'score for the coach profile UI — a practice-habit metric, not a language ' +
    'assessment score',
  'src/services/coaching/coachService.ts':
    '_priorityScore is a sort-order heuristic for which offline coaching issue ' +
    'to surface first (topPriorityIssue) — it never produces or influences a ' +
    'mark/score, only the order feedback is presented in',
  'src/services/coaching/diagnosticEngine.ts':
    '_computeConfidence is the pre-existing (frozen, B2-superseded) skill-' +
    'mastery model\'s asymptotic confidence-from-observation-count curve — an ' +
    'internal belief-confidence heuristic, not a Cambridge mark',
  'src/services/coach/beliefReducer.ts':
    'confidence/uncertainty are the audited evidence-belief projection math ' +
    '(reduceEvidenceToBeliefState, verified sound in this fix plan\'s audit) — ' +
    'Bayesian-style belief-state confidence over evidence volume, not a ' +
    'Cambridge mark or a detector threshold',
};

function listFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) files.push(...listFiles(full));
    else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) files.push(full);
  }
  return files;
}

describe('no invented scoring formula in coachService.ts', () => {
  const SOURCE_PATH = join(__dirname, '../coachService.ts');

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

describe('D3: no un-allow-listed weighted-sum-into-threshold formula in the coaching/coach/evidence trees', () => {
  it('every file with weighted-sum-shaped arithmetic under the scanned trees is allow-listed with a reason', () => {
    const offenders: string[] = [];
    for (const dir of SCAN_DIRS) {
      for (const file of listFiles(join(ROOT, dir))) {
        const source = readFileSync(file, 'utf8');
        if (!WEIGHTED_SUM_PATTERN.test(source)) continue;
        const rel = relative(ROOT, file).replace(/\\/g, '/');
        if (!(rel in ALLOWED)) offenders.push(rel);
      }
    }
    expect(offenders, JSON.stringify(offenders)).toEqual([]);
  });

  it('every allow-listed file still exists and still matches the weighted-sum pattern (prevents a stale entry)', () => {
    for (const relPath of Object.keys(ALLOWED)) {
      const source = readFileSync(join(ROOT, relPath), 'utf8');
      expect(WEIGHTED_SUM_PATTERN.test(source), relPath).toBe(true);
    }
  });

  it('cefrVector.ts (E1 fix) no longer composes its three components into a weighted CEFR-band score', () => {
    const source = readFileSync(join(ROOT, 'src/domain/igcse/evidence/detectors/cefrVector.ts'), 'utf8');
    expect(source).not.toMatch(/bandFromScore/);
    expect(source).not.toMatch(WEIGHTED_SUM_PATTERN);
  });
});
