// @vitest-environment jsdom
//
// Learn overhaul Batch 4, detail restored in Batch 6a — the coach view is:
// score line → what you did well (every strength) → fix these first (2) →
// also worth fixing (every other fix) → say it better → go further →
// pronunciation (unchanged props) → Next / Try again. No engine bar, no band
// pill, no raw B2/C1, and no unfiltered streamed strength.
import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const azureProps = vi.fn();
vi.mock('../components/AzurePronunciationCard', () => ({
  AzurePronunciationCard: (props: unknown) => {
    azureProps(props);
    return <div data-testid="azure-card" />;
  },
}));

import { FeedbackExperience } from '../FeedbackExperience';
import type { CoachingIssue, FeedbackV2 } from '../../../types';
import type { PronunciationAssessment } from '../../../domain/pronunciation/types';

afterEach(() => {
  cleanup();
  azureProps.mockClear();
});

const TRANSCRIPT = "Samedi je suis allé au cinéma avec mes amis. Mon mère était contente et nous avons mangé des pizza.";

function issue(id: string, quote: string, correction: string, marksImpact: CoachingIssue['marksImpact']): CoachingIssue {
  return { id, category: 'grammar', severity: 'major', quote, diagnostic: `Why ${id}.`, correction, marksImpact };
}

const FEEDBACK = {
  scores: { overall: 6.5, communication: 7, language: 6, fluency: 6 },
  grammar: { critical: [], polish: [] },
  vocabulary: [{ basic: 'content', upgrade: 'ravi', example: 'Elle était ravie.' }],
  style: [], fillers: [], wordCount: 19,
  cefrLevel: 'B2',
  pronunciation: { score: null, issues: [] },
  schemaVersion: 2,
  responseTier: 3,
  examiner: { predictedBand: 'Core-Secure', oneLiner: 'Solid.' },
  best_moment: 'Your « avec mes amis » says who you were with.',
  biggest_opportunity: 'Add one sentence about what you will do next weekend.',
  expansion_ideas: ['Say which film you saw.'],
  improved_answer: "Samedi, je suis allé au cinéma avec mes amis. Ma mère était contente et nous avons mangé des pizzas.",
  rephrase: 'Rephrased.',
  issues: [
    issue('gender', 'Mon mère', 'Ma mère', 3),
    issue('plural', 'des pizza', 'des pizzas', 2),
    issue('third', 'je suis allé', 'je suis allé(e)', 1),
  ],
} as unknown as FeedbackV2;

const FIVE_FIXES = {
  ...FEEDBACK,
  issues: [
    issue('gender', 'Mon mère', 'Ma mère', 3),
    issue('plural', 'des pizza', 'des pizzas', 2),
    issue('third', 'je suis allé', 'je suis allé(e)', 1),
    issue('fourth', 'était contente', 'était très contente', 1),
    issue('fifth', 'Samedi je', 'Samedi, je', 0),
  ],
  strengths: [
    { quote: 'avec mes amis', why: 'You said who you were with.' },
    { quote: 'nous avons mangé', why: 'You used the passé composé with avoir.' },
  ],
} as unknown as FeedbackV2;

const PRONUNCIATION = { overallScore: 80, words: [] } as unknown as PronunciationAssessment;

function renderFeedback(props: Partial<Parameters<typeof FeedbackExperience>[0]> = {}) {
  return render(
    <MemoryRouter>
      <FeedbackExperience
        feedback={FEEDBACK}
        transcript={TRANSCRIPT}
        onRetry={vi.fn()}
        onComplete={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  );
}

describe('FeedbackExperience coach view (Batch 6a)', () => {
  it('renders the stack in order: score line, what you did well, fixes, say it better, go further, footer', () => {
    const { container } = renderFeedback();
    const text = container.textContent ?? '';
    const order = [
      '6.5', 'What you did well', 'Fix these first', 'Also worth fixing', 'Say it better', 'Go further', 'Try again', 'Next question',
    ].map((t) => text.indexOf(t));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('shows every fix: two first, the third under Also worth fixing', () => {
    const { container } = renderFeedback();
    expect(screen.getByText('Ma mère')).toBeTruthy();
    expect(screen.getByText('Why gender.')).toBeTruthy();
    expect(screen.getByText('Why plural.')).toBeTruthy();
    expect(screen.getByText('Why third.')).toBeTruthy();
    const text = container.textContent ?? '';
    expect(text.indexOf('Also worth fixing')).toBeLessThan(text.indexOf('Why third.'));
    expect(text.indexOf('Why plural.')).toBeLessThan(text.indexOf('Also worth fixing'));
  });

  it('renders all five fixes when the feedback has five', () => {
    renderFeedback({ feedback: FIVE_FIXES });
    for (const id of ['gender', 'plural', 'third', 'fourth', 'fifth']) {
      expect(screen.getByText(`Why ${id}.`)).toBeTruthy();
    }
  });

  it('shows every quoted strength under What you did well', () => {
    renderFeedback({ feedback: FIVE_FIXES });
    expect(screen.getByText('You said who you were with.')).toBeTruthy();
    expect(screen.getByText('You used the passé composé with avoir.')).toBeTruthy();
    expect(screen.getByText('« nous avons mangé »')).toBeTruthy();
    // best_moment is the fallback only, so it is not repeated next to strengths[].
    expect(screen.queryByText(FEEDBACK.best_moment!)).toBeNull();
  });

  it('has no engine control, re-evaluate bar or band pill, and never shows B2/C1', () => {
    const { container } = renderFeedback();
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/re-?evaluate/i);
    expect(text).not.toMatch(/groq|gemini/i);
    expect(text).not.toMatch(/Core\+|Extended|Foundation/);
    expect(text).not.toMatch(/\bB2\b|\bC1\b/);
    expect(text).toContain('Stretch (B1+)');
  });

  it('shows Go further (vocabulary and expansion ideas) but keeps the one focus in the Full report', () => {
    const { container } = renderFeedback();
    const goFurther = screen.getByRole('region', { name: 'Go further' });
    expect(goFurther.textContent).toContain('Vocabulary');
    expect(goFurther.textContent).toContain('How To Extend Your Answer');
    expect(container.textContent).not.toContain('Add one sentence about what you will do next weekend.');
  });

  it('has no Go further section when there is nothing to add', () => {
    renderFeedback({ feedback: { ...FEEDBACK, vocabulary: [], expansion_ideas: [] } as FeedbackV2 });
    expect(screen.queryByRole('region', { name: 'Go further' })).toBeNull();
  });

  it('the Full report holds the one focus and the third correction', () => {
    renderFeedback();
    fireEvent.click(screen.getByRole('button', { name: 'Full report' }));
    expect(screen.getByText('Add one sentence about what you will do next weekend.')).toBeTruthy();
    expect(screen.getByText(/je suis allé\(e\)/)).toBeTruthy();
  });

  it('passes the pronunciation props through unchanged', () => {
    renderFeedback({ pronunciationResult: PRONUNCIATION, pronunciationStatus: 'done' });
    expect(screen.getByTestId('azure-card')).toBeTruthy();
    expect(azureProps).toHaveBeenCalledWith({ result: PRONUNCIATION, correctedSentence: FEEDBACK.improved_answer });
  });

  it('the streaming preview shows only the score line, never the unfiltered streamed best_moment', () => {
    const { container } = renderFeedback({
      feedback: null,
      partialFeedback: { scores: FEEDBACK.scores, wordCount: 19, cefrLevel: 'A2', best_moment: FEEDBACK.best_moment },
    });
    const text = container.textContent ?? '';
    expect(text).toContain('Exam level (A2)');
    expect(text).not.toContain('avec mes amis');
    expect(text).not.toContain('What you did well');
  });
});
