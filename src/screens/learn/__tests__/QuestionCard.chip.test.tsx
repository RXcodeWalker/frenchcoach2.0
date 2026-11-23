// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

  it('shows the exam-relative level label, uses the exam-relative wording, never a bare CEFR code', () => {
    render(<QuestionCard question={QUESTION} showHint={false} onToggleHint={() => {}} />);
    expect(screen.getByText(/Stretch \(B2\)/)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/B1\+|\b(C1|C2)\b/);
  });
});

describe('QuestionCard vocabulary chips', () => {
  const WITH_VOCAB = { ...QUESTION, keyVocab: [{ fr: 'bon', en: 'good' }, { fr: 'faire du sport', en: 'to do sport' }] } as unknown as Question;

  it('says the word when its chip opens, with a "sounds like" cue for a single word', async () => {
    const { TTS } = await import('../../../services/tts/ttsService');
    vi.mocked(TTS.speak).mockClear();
    render(<QuestionCard question={WITH_VOCAB} showHint={false} onToggleHint={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'bon: good' }));
    expect(TTS.speak).toHaveBeenCalledWith('bon', { recorded: true });
    expect(screen.getByTestId('vocab-cue').textContent).toBe('· boh(n)');
    // Closing it is silent.
    fireEvent.click(screen.getByRole('button', { name: 'bon: good' }));
    expect(TTS.speak).toHaveBeenCalledTimes(1);
  });

  it('reads a phrase as written and gives it no cue', async () => {
    const { TTS } = await import('../../../services/tts/ttsService');
    vi.mocked(TTS.speak).mockClear();
    render(<QuestionCard question={WITH_VOCAB} showHint={false} onToggleHint={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'faire du sport: to do sport' }));
    expect(TTS.speak).toHaveBeenCalledWith('faire du sport', { recorded: true });
    expect(screen.queryByTestId('vocab-cue')).toBeNull();
  });

  it('stays silent while the microphone is open, so nothing lands in the answer', async () => {
    const { TTS } = await import('../../../services/tts/ttsService');
    vi.mocked(TTS.speak).mockClear();
    render(<QuestionCard question={WITH_VOCAB} showHint={false} onToggleHint={() => {}} micOpen />);
    fireEvent.click(screen.getByRole('button', { name: 'bon: good' }));
    expect(TTS.speak).not.toHaveBeenCalled();
    expect(screen.getByText('good', { exact: false })).toBeTruthy();
  });
});
