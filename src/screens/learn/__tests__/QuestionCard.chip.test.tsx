// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { Question } from '../../../types';
import type { QuestionDemands } from '../../../domain/learn/demand/types';
import { deriveDemandLevel } from '../../../domain/learn/demand/deriveDemandLevel';
import { QuestionCard } from '../QuestionCard';

vi.mock('../../../services/tts/ttsService', () => ({ TTS: { speak: vi.fn(), stop: vi.fn() } }));

afterEach(cleanup);

// A hypothetical-conditional question derives to B2 — a band the learner never sees.
const DEMANDS: QuestionDemands = {
  cognitiveDemand: 'hypothesize',
  timeFrames: ['conditional'],
  structures: [],
  responseLoad: 'extended',
  lexicalReach: 'topic',
  sufficientAnswer: 'Say where you would go and why.',
  provenance: 'inferred',
  inferenceConfidence: 0.7,
} as unknown as QuestionDemands;

const QUESTION = {
  id: 'hol_x', topicKey: 'holidays', text: 'Si tu gagnais à la loterie, où irais-tu ?', hint: '',
  difficulty: 3, followUps: [], modelAnswer: '', keyVocab: [], demands: DEMANDS,
} as unknown as Question;

describe('QuestionCard demand chip', () => {
  it('derives to B2 for this fixture (so the test is meaningful)', () => {
    expect(deriveDemandLevel(DEMANDS)).toBe('B2');
  });

  it('shows the exam-relative level label, never a raw B2/C1 code', () => {
    render(<QuestionCard question={QUESTION} showHint={false} onToggleHint={() => {}} />);
    expect(screen.getByText(/Stretch \(B1\+\)/)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/\b(B2|C1|C2)\b/);
  });
});
