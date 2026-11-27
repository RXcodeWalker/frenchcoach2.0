import { describe, expect, it } from 'vitest';
import { correctionTypes } from '../components/correctionTypes';
import { answerFeatures } from '../teacher/answerHighlights';
import { breakdownSummary } from '../coachPoints';
import type { CoachingIssue, FeedbackV2 } from '../../../types';

const issue = (id: string, extra: Partial<CoachingIssue> = {}): CoachingIssue =>
  ({ id, category: 'grammar', severity: 'major', quote: id, diagnostic: '', correction: 'x', marksImpact: 1, ...extra }) as CoachingIssue;

describe('correctionTypes', () => {
  it('counts by theme label, falling back to the category, most frequent first', () => {
    const types = correctionTypes([
      issue('a', { themeLabel: 'Gender' }),
      issue('b', { category: 'tense' }),
      issue('c', { themeLabel: 'Gender' }),
    ]);
    expect(types).toEqual([
      { label: 'Gender', count: 2 },
      { label: 'Tense', count: 1 },
    ]);
  });

  it('adds and drops nothing', () => {
    expect(correctionTypes([]).length).toBe(0);
  });
});

describe('answerFeatures', () => {
  it('lists every feature found, each quoting the answer', () => {
    const t = "Hier je suis allé au parc parce que c'est calme. Demain je vais jouer au foot.";
    const features = answerFeatures(t);
    expect(features.map((f) => f.label)).toEqual(expect.arrayContaining(['Gave a reason', 'Talked about the past', 'Talked about the future']));
    for (const f of features) expect(t.toLowerCase()).toContain(f.quote.toLowerCase());
  });

  it('says nothing about what is not there', () => {
    expect(answerFeatures('')).toEqual([]);
    expect(answerFeatures('Je joue au foot.').map((f) => f.label)).not.toContain('Talked about the past');
  });
});

describe('breakdownSummary', () => {
  it('names what the Breakdown holds beyond the conversation', () => {
    const fb = {
      issues: [issue('a', { mini_lesson: { title: 't', rule: '', examples: [], common_mistake: '', practice: '' } }), issue('b')],
      vocabularyV2: [{ basic: 'b', tier: 'weak', upgrades: [] }],
      expansion_ideas: ['i', 'j'],
    } as unknown as FeedbackV2;
    expect(breakdownSummary(fb, true)).toEqual(['1 lesson', '1 vocabulary upgrade', '2 ideas to extend', 'model answer']);
  });

  it('is empty when there is nothing extra', () => {
    expect(breakdownSummary({} as FeedbackV2, false)).toEqual([]);
  });
});
