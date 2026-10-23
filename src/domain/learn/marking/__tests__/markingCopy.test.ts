// learn-marking §6.1/§8.3 — the learner-facing copy and the needs-card view model.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import fixture from './fixtures/ladderReply.fam_01_simple_a1.json';
import {
  EXAM_STANDARD_NOTE,
  MAX_NEEDS_SHOWN,
  buildLevelNeedsView,
  checkedAgainstLine,
  markingLevelName,
  meetsLine,
  needsHeading,
} from '../markingCopy';
import { MARKING_LEVELS, type LadderNeed, type LevelCheck } from '../markingLevel';
import type { FeedbackV2 } from '../../../../types';

const LEVEL_CHECK = fixture.response.levelCheck as LevelCheck;
const BASE = {
  scores: { overall: 6.8, communication: 8, language: 8, accuracy: 10, fluency: 1 },
} as Pick<FeedbackV2, 'unscored' | 'scores' | 'levelCheck'>;
const FB: Pick<FeedbackV2, 'unscored' | 'scores' | 'levelCheck'> = { ...BASE, levelCheck: LEVEL_CHECK };

const withNeeds = (level: 'A2' | 'B1', needs: LadderNeed[]) =>
  ({ ...FB, levelCheck: { ...LEVEL_CHECK, needsByLevel: { ...LEVEL_CHECK.needsByLevel, [level]: needs } } });

const NEED = (over: Partial<LadderNeed> = {}): LadderNeed => ({
  ladder: 'T', label: 'Developing your answer', nextRung: 'B1', text: 'Develop one point.', firstStep: false, example: 'Mon père est grand.', ...over,
});

describe('level names and lines', () => {
  it('never shows the raw `exam` key', () => {
    expect(MARKING_LEVELS.map(markingLevelName)).toEqual(['A1', 'A2', 'Exam standard', 'B1', 'B2']);
    expect(checkedAgainstLine('B1')).toBe('Checked against the B1 ladder');
    expect(checkedAgainstLine('exam')).toBe('Checked against Exam standard');
    expect(needsHeading('B1')).toBe('What your answer needs for B1');
    expect(needsHeading('exam')).toBe('What your answer needs for Exam standard');
    expect(meetsLine('A2')).toBe('This answer meets A2');
  });

  it('says the Exam standard is a practice score, not a Cambridge mark (§1.4)', () => {
    expect(EXAM_STANDARD_NOTE).toMatch(/not a Cambridge mark/);
  });
});

describe('buildLevelNeedsView', () => {
  it('lists the backend\'s unreached rungs at the chosen level, in the backend\'s order', () => {
    const view = buildLevelNeedsView(FB, 'B1');
    expect(view.kind).toBe('needs');
    if (view.kind !== 'needs') return;
    expect(view.level).toBe('B1');
    expect(view.items.map(i => i.ladder)).toEqual(['T', 'L', 'R']);
    expect(view.items.find(i => i.ladder === 'L')?.firstStep).toBe(true);
    expect(view.items[0].example).toBe('Mon père est grand, il travaille comme ingénieur.');
  });

  it('reads a different list at a different level', () => {
    const a1 = buildLevelNeedsView(FB, 'A1');
    const b2 = buildLevelNeedsView(FB, 'B2');
    expect(a1.kind === 'needs' && a1.items.map(i => i.ladder)).toEqual(['L']);
    expect(b2.kind === 'needs' && b2.items.length).toBe(3);
  });

  it('is "meets" when nothing is missing at the level', () => {
    expect(buildLevelNeedsView(withNeeds('A2', []), 'A2')).toEqual({ kind: 'meets', level: 'A2' });
  });

  it('shows nothing without a levelCheck or for an ungraded attempt', () => {
    expect(buildLevelNeedsView(BASE, 'B1')).toEqual({ kind: 'none' });
    expect(buildLevelNeedsView({ ...FB, unscored: 'no_llm_offline' }, 'B1')).toEqual({ kind: 'none' });
  });

  it('drops blank model text instead of rewriting it, and never turns dropped items into a pass', () => {
    const view = buildLevelNeedsView(withNeeds('B1', [NEED({ text: '   ' }), NEED({ ladder: 'L', example: '  ' })]), 'B1');
    expect(view.kind === 'needs' && view.items).toEqual([expect.objectContaining({ ladder: 'L', example: null })]);
    expect(buildLevelNeedsView(withNeeds('B1', [NEED({ text: '' })]), 'B1')).toEqual({ kind: 'none' });
  });

  it(`shows at most ${MAX_NEEDS_SHOWN} items`, () => {
    const many = (['T', 'O', 'F', 'L', 'A', 'R'] as const).map(ladder => NEED({ ladder }));
    const view = buildLevelNeedsView(withNeeds('B1', many), 'B1');
    expect(view.kind === 'needs' && view.items.map(i => i.ladder)).toEqual(['T', 'O', 'F']);
  });
});

describe('scope: Coach voice only (ADR 0005, learn-marking §6.1)', () => {
  const read = (p: string) => readFileSync(join(__dirname, '../../../../', p), 'utf8');

  it('the Examiner-style surfaces never import the marking copy, the needs card or a marking level', () => {
    for (const file of [
      'features/feedback/teacher/LearnExaminerFeedback.tsx',
      'features/feedback/components/ExaminerFeedbackCard.tsx',
    ]) {
      expect(read(file), file).not.toMatch(/markingCopy|LevelNeedsCard|markingLevel|MarkingLevel|levelCheck/);
    }
  });
});
