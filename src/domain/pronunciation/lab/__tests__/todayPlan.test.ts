import { describe, expect, it } from 'vitest';
import { emptyLabHistory, type LabHistory } from '../labHistory';
import { buildTodayPlan, todayDoneLine } from '../todayPlan';

const TODAY = '2026-11-23';

function withTricky(word: string, lastDay: string): LabHistory {
  return {
    ...emptyLabHistory(),
    words: { [word]: { status: 'tricky', practiseCount: 2, clearRun: 0, lastDay, lastClearDay: null } },
  };
}

describe('buildTodayPlan', () => {
  it('a new learner gets two steps: one sentence, one ear round — no tricky words, no named sound', () => {
    const plan = buildTodayPlan(emptyLabHistory(), TODAY);
    expect(plan.map((s) => s.kind)).toEqual(['sentence', 'ear']);
    expect(plan.every((s) => s.family === null)).toBe(true);
  });

  it('puts tricky words first, only while some are due today', () => {
    const due = buildTodayPlan(withTricky('jardin', '2026-11-20'), TODAY);
    expect(due.map((s) => s.kind)).toEqual(['tricky', 'sentence', 'ear']);
    expect(due[0].note).toBe('1 word waiting — say each one again');
    const doneToday = buildTodayPlan(withTricky('jardin', TODAY), TODAY);
    expect(doneToday.map((s) => s.kind)).toEqual(['sentence', 'ear']);
  });

  it('aims the sentence and the ear round at the weakest sound once one is named', () => {
    const observations = [];
    for (const day of ['2026-11-01', '2026-11-02']) {
      for (let i = 0; i < 3; i++) observations.push({ family: 'frenchR' as const, accuracy: 40, basis: 'word' as const, day });
    }
    const plan = buildTodayPlan({ ...emptyLabHistory(), observations }, TODAY);
    expect(plan.find((s) => s.kind === 'sentence')?.family).toBe('frenchR');
    expect(plan.find((s) => s.kind === 'ear')?.family).toBe('frenchR');
    expect(plan.find((s) => s.kind === 'sentence')?.note).toBe('One with The French R in it');
  });

  it('says nothing like a score', () => {
    for (const step of buildTodayPlan(withTricky('jardin', '2026-11-20'), TODAY)) {
      expect(`${step.title} ${step.note}`).not.toMatch(/\b\d{2,3}\b|wrong|%/);
    }
    expect(todayDoneLine(1, 3)).toBe('1 of 3 done.');
    expect(todayDoneLine(3, 3)).toMatch(/done/);
  });
});
