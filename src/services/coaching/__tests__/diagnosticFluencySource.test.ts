// @vitest-environment jsdom
// D2: the diagnostic's `fluency_score` observation reads scores.fluency (the
// coach's fluency judgement), no longer scores.overall.
import { describe, it, expect, beforeEach } from 'vitest';
import { runAfterSession } from '../diagnosticEngine';
import type { FeedbackV2 } from '../../../types';

function fb(scores: FeedbackV2['scores']): FeedbackV2 {
  return { scores, grammar: { critical: [], polish: [] }, vocabulary: [], style: [], fillers: [], wordCount: 80 } as FeedbackV2;
}

beforeEach(() => localStorage.clear());

function fluencyErrors(): number | undefined {
  for (let i = 0; i < localStorage.length; i++) {
    const raw = localStorage.getItem(localStorage.key(i)!);
    const parsed = raw && JSON.parse(raw);
    const rec = parsed?.skills?.fluency_score ?? parsed?.value?.skills?.fluency_score;
    if (rec) return rec.errors;
  }
  return undefined;
}

describe('runAfterSession fluency observation', () => {
  it('flags a low fluency even when overall is high', () => {
    runAfterSession(fb({ overall: 8, communication: 8, language: 8, accuracy: 8, fluency: 4 }));
    expect(fluencyErrors()).toBe(1);
  });

  it('does not flag a high fluency even when overall is low', () => {
    runAfterSession(fb({ overall: 5, communication: 4, language: 4, accuracy: 4, fluency: 8 }));
    expect(fluencyErrors()).toBe(0);
  });
});
