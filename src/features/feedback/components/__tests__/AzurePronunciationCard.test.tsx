// @vitest-environment jsdom
// Exam-pronunciation plan Batch 2: a result the backend produced without
// Azure because the Azure Speech budget is spent says so, instead of blaming
// the recording.
import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('../../../../services/tts/ttsService', () => ({ TTS: { speak: vi.fn() } }));

import { AzurePronunciationCard } from '../AzurePronunciationCard';
import type { PronunciationAssessment } from '../../../../domain/pronunciation/types';

afterEach(cleanup);

const NO_VERDICT: PronunciationAssessment = {
  score: null,
  transcript: 'je suis allé au cinéma',
  issues: [],
  words: [],
  provider: 'whisper-heuristic',
  subScores: null,
  couldNotAssess: true,
  couldNotAssessReason: 'assessment_unavailable',
};

describe('AzurePronunciationCard — Azure budget exhausted', () => {
  it('says analysis is unavailable until next month, not that the audio was unclear', () => {
    render(<AzurePronunciationCard result={{ ...NO_VERDICT, azureBudgetExhausted: true }} />);
    expect(screen.getByText('Pronunciation analysis is unavailable until next month.')).toBeTruthy();
    expect(screen.queryByText(/too unclear/)).toBeNull();
    expect(screen.queryByText(/couldn't assess/i)).toBeNull();
  });

  it('adds the line above a scored heuristic result too', () => {
    render(
      <AzurePronunciationCard
        result={{ ...NO_VERDICT, score: 70, couldNotAssess: false, couldNotAssessReason: null, azureBudgetExhausted: true }}
      />,
    );
    expect(screen.getByTestId('azure-budget-exhausted')).toBeTruthy();
    expect(screen.getByText('70')).toBeTruthy();
  });

  it('keeps the existing could-not-assess copy when the budget is not the reason', () => {
    render(<AzurePronunciationCard result={NO_VERDICT} />);
    expect(screen.queryByTestId('azure-budget-exhausted')).toBeNull();
    expect(screen.getByText("We couldn't assess this recording.")).toBeTruthy();
  });
});
