import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ANSWER_LADDER,
  CEFR_REFERENCE,
  COMMUNICATION,
  CRITERIA,
  HELP_LADDER,
  QUALITY_OF_LANGUAGE,
  QUIZ,
  ROLE_PLAY,
  ROLE_PLAY_EXAMPLES,
  TOPIC_AREAS,
  TOTAL_MARKS,
  bandFor,
  positionInBand,
} from '../guideContent';

describe('exam guide content stays tied to the rubric', () => {
  it('the three criteria add up to the paper total', () => {
    expect(CRITERIA.reduce((sum, c) => sum + c.max, 0)).toBe(TOTAL_MARKS);
    expect(ROLE_PLAY.tasks * ROLE_PLAY.marksPerResponse).toBe(ROLE_PLAY.maxMarks);
  });

  it('every mark from 0 to 15 lands in exactly one band, for both criteria', () => {
    for (const criterion of [COMMUNICATION, QUALITY_OF_LANGUAGE]) {
      for (let mark = 0; mark <= criterion.maxMarks; mark++) {
        const matches = criterion.bands.filter((b) => mark >= b.min && mark <= b.max);
        expect(matches).toHaveLength(1);
        expect(bandFor(criterion.bands, mark)).toBe(matches[0]);
      }
    }
  });

  it('places a mark in its band by the notes’ convincingly / adequately / just rule', () => {
    const good = bandFor(COMMUNICATION.bands, 11);
    expect(good.label).toBe('Good');
    expect(positionInBand(good, 12)).toBe('convincingly');
    expect(positionInBand(good, 11)).toBe('adequately');
    expect(positionInBand(good, 10)).toBe('just');
    expect(positionInBand(bandFor(COMMUNICATION.bands, 0), 0)).toBeNull();
  });

  it('the band ranges quoted in the help ladder are the rubric’s own', () => {
    const quoted = HELP_LADDER.map((h) => h.band).join(' ');
    expect(quoted).toContain(`${COMMUNICATION.bands[1].min}–${COMMUNICATION.bands[1].max}`);
    expect(quoted).toContain(`${COMMUNICATION.bands[2].min}–${COMMUNICATION.bands[2].max}`);
    // The 10–12 descriptor really is the one about occasional alternative questions.
    expect(COMMUNICATION.bands[1].descriptor.join(' ')).toMatch(/occasional use of the alternative/);
    expect(COMMUNICATION.bands[2].descriptor.join(' ')).toMatch(/frequently requires use of the alternative/);
  });

  it('the CEFR level the guide states is the one the notes give', () => {
    expect(CEFR_REFERENCE).toContain('A2 with elements of B1');
    const screen = readFileSync(join(__dirname, '../../../screens/examGuide/ExamGuide.tsx'), 'utf8');
    expect(screen).toContain('A2 with elements of B1');
  });

  it('role-play examples use only real marks, and the quiz answers point at real options', () => {
    for (const ex of ROLE_PLAY_EXAMPLES) expect(ROLE_PLAY.marks.map((m) => m.mark)).toContain(ex.mark);
    for (const q of QUIZ) expect(q.options[q.answer]).toBeDefined();
    expect(new Set(QUIZ.map((q) => q.id)).size).toBe(QUIZ.length);
  });

  it('pairs topic areas with the right conversation (A/B first, C/D/E second)', () => {
    expect(TOPIC_AREAS.filter((a) => a.conversation === 1).map((a) => a.area)).toEqual(['A', 'B']);
    expect(TOPIC_AREAS.filter((a) => a.conversation === 2).map((a) => a.area)).toEqual(['C', 'D', 'E']);
  });

  it('the answer ladder grows one step at a time, starting from a plain answer', () => {
    expect(ANSWER_LADDER.length).toBeGreaterThan(3);
    expect(new Set(ANSWER_LADDER.map((s) => s.text)).size).toBe(ANSWER_LADDER.length);
  });

  it('never claims the unsourced 25% weighting', () => {
    const files = ['../guideContent.ts', '../../../screens/examGuide/ExamGuide.tsx', '../../../screens/examGuide/GuideWidgets.tsx'];
    for (const f of files) expect(readFileSync(join(__dirname, f), 'utf8')).not.toMatch(/25 ?%/);
  });
});
