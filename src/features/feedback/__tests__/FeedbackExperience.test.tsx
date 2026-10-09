// @vitest-environment jsdom
//
// Learn overhaul Batch 4, detail restored in Batch 6a, spoken by the teacher in
// Batch 6b — the coach view is the teacher's conversation: your answer →
// opening → what you did well (every strength) → fix these first (2, as "Try it
// first" nudges) → also worth fixing (every other fix) → say it better → go
// further, then the score line under the talk, pronunciation (unchanged props)
// and Next / Try again. No engine bar, no band pill, no raw B2/C1, and no
// unfiltered streamed strength. Most tests run under reduced motion (instant);
// the typing tests turn it off.
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const azureProps = vi.fn();
vi.mock('../components/AzurePronunciationCard', () => ({
  AzurePronunciationCard: (props: unknown) => {
    azureProps(props);
    return <div data-testid="azure-card" />;
  },
}));

vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ consentStatus: 'unknown' }) }));

import { FeedbackExperience } from '../FeedbackExperience';
import type { CoachingIssue, FeedbackV2 } from '../../../types';
import type { PronunciationAssessment } from '../../../domain/pronunciation/types';

function stubReducedMotion(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: matches && query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }),
  });
}

beforeEach(() => stubReducedMotion(true));
afterEach(() => {
  cleanup();
  azureProps.mockClear();
  vi.useRealTimers();
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
  // A fresh object per render: the typed reveal plays once per feedback object, like one per attempt.
  const feedback = props.feedback === null ? null : { ...(props.feedback ?? FEEDBACK) };
  return render(
    <MemoryRouter>
      <FeedbackExperience
        transcript={TRANSCRIPT}
        onRetry={vi.fn()}
        onComplete={vi.fn()}
        {...props}
        feedback={feedback}
      />
    </MemoryRouter>,
  );
}

const showMe = () => screen.getAllByRole('button', { name: 'Just show me' }).forEach((b) => fireEvent.click(b));

describe('FeedbackExperience coach view (Batch 6a + 6b)', () => {
  it('renders the conversation in order, then the score line under the talk, then the footer', () => {
    const { container } = renderFeedback();
    showMe();
    const text = container.textContent ?? '';
    const order = [
      'What you did well', 'Fix these first', 'Also worth fixing', 'Say it better', 'Go further', '6.5', 'Try again', 'Next question',
    ].map((t) => text.indexOf(t));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("opens with the learner's own answer, then the teacher", () => {
    const { container } = renderFeedback();
    const text = container.textContent ?? '';
    expect(text.indexOf(TRANSCRIPT)).toBeGreaterThanOrEqual(0);
    expect(text.indexOf(TRANSCRIPT)).toBeLessThan(text.indexOf('Madame Laurent'));
    expect(text).toContain("Let's go through your answer.");
    expect(text).toContain("Let's fix the two that matter most first.");
  });

  it('shows every fix: the first two as nudges, the third straight away', () => {
    const { container } = renderFeedback();
    // Nudges: the learner's words and what to do, never the correction.
    expect(screen.getAllByTestId('try-it-first')).toHaveLength(2);
    expect(container.textContent).not.toContain('Why gender.');
    expect(container.textContent).not.toContain('Why plural.');
    // ...and the rewrite that contains the corrections waits for them.
    expect(screen.queryByText('Say it better')).toBeNull();
    expect(container.textContent).toContain("appears here once you've tried the fixes above");
    // The third is under "Also worth fixing" and is not a nudge.
    expect(screen.getByText('Why third.')).toBeTruthy();
    showMe();
    expect(screen.getByText('Say it better')).toBeTruthy();
    expect(screen.getByText('Ma mère')).toBeTruthy();
    expect(screen.getByText('Why gender.')).toBeTruthy();
    expect(screen.getByText('Why plural.')).toBeTruthy();
    const text = container.textContent ?? '';
    expect(text.indexOf('Also worth fixing')).toBeLessThan(text.indexOf('Why third.'));
    expect(text.indexOf('Why plural.')).toBeLessThan(text.indexOf('Also worth fixing'));
  });

  it('renders all five fixes when the feedback has five', () => {
    renderFeedback({ feedback: FIVE_FIXES });
    expect(screen.getAllByTestId('try-it-first')).toHaveLength(2);
    showMe();
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

  it("uses the model's opening line when there is one, and says the name once", () => {
    const { container } = renderFeedback({
      feedback: { ...FIVE_FIXES, encouragement: 'You explained « avec mes amis » clearly.' } as FeedbackV2,
      learnerName: 'Marie',
    });
    const text = container.textContent ?? '';
    expect(text).toContain('You explained « avec mes amis » clearly.');
    expect(text).not.toContain("Let's go through your answer");
    // Said once in the visible talk (the live region repeats the same words for screen readers).
    const said = [...container.querySelectorAll('[data-role]')].filter((b) => b.textContent?.includes('Marie'));
    expect(said).toHaveLength(1);
    expect(text).toContain('Marie');
  });

  it('underlines the fixes in the learner’s own bubble as the teacher reaches them', () => {
    const { container } = renderFeedback();
    const marked = [...container.querySelectorAll('mark')].map((m) => m.textContent);
    expect(marked).toEqual(expect.arrayContaining(['Mon mère', 'des pizza', 'je suis allé']));
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

  it('speaks a repeated mistake with a phrase from this very answer, and only then', () => {
    const grammar = {
      critical: [{ theme: 'AUXILIARY_VERB', severity: 'major', msg: 'm', diagnostic: 'Aller takes être.', correction: 'je suis allé', quote: 'je suis allé' }],
      polish: [],
    };
    const feedback = { ...FEEDBACK, issues: [], grammar } as unknown as FeedbackV2;
    const recurring = { nodeId: 'etre_avoir', label: 'Être vs Avoir', times: 3 };
    const withMemory = renderFeedback({ feedback, recurring });
    expect(withMemory.container.textContent).toContain('is a slip I\'ve seen before: Être vs Avoir has come up 3 times this week.');
    cleanup();
    const unrelated = renderFeedback({ feedback, recurring: { nodeId: 'negation', label: 'Negation', times: 3 } });
    expect(unrelated.container.textContent).not.toContain('a slip I\'ve seen before');
  });
});

describe('FeedbackExperience typed reveal (Batch 6b)', () => {
  beforeEach(() => stubReducedMotion(false));

  it('starts with the learner’s answer only, and types the rest in about five seconds', () => {
    vi.useFakeTimers();
    const { container } = renderFeedback();
    expect(container.textContent).toContain(TRANSCRIPT);
    expect(container.textContent).not.toContain('What you did well');
    act(() => { vi.advanceTimersByTime(6_000); });
    expect(container.textContent).toContain('Also worth fixing');
    expect(container.textContent).toContain("Let's fix the two that matter most first.");
    expect(screen.queryByRole('button', { name: 'Show all' })).toBeNull();
  });

  it('never blocks Next or Try again while it types', () => {
    vi.useFakeTimers();
    const onRetry = vi.fn();
    const onComplete = vi.fn();
    renderFeedback({ onRetry, onComplete });
    const next = screen.getByRole('button', { name: /Next question/ });
    const retry = screen.getByRole('button', { name: /Try again/ });
    expect((next as HTMLButtonElement).disabled).toBe(false);
    expect((retry as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(next);
    fireEvent.click(retry);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('"Show all" shows everything at once', () => {
    vi.useFakeTimers();
    const { container } = renderFeedback();
    fireEvent.click(screen.getByRole('button', { name: 'Show all' }));
    expect(container.textContent).toContain('Also worth fixing');
    expect(screen.queryByRole('button', { name: 'Show all' })).toBeNull();
  });

  it('a tap on the conversation, or Space, shows everything at once', () => {
    vi.useFakeTimers();
    const first = renderFeedback();
    fireEvent.click(first.container.querySelector('section[aria-label$="feedback"]')!);
    expect(first.container.textContent).toContain('Also worth fixing');
    cleanup();

    const second = renderFeedback({ feedback: { ...FEEDBACK } as FeedbackV2 });
    expect(second.container.textContent).not.toContain('Also worth fixing');
    fireEvent.keyDown(document.body, { key: ' ' });
    expect(second.container.textContent).toContain('Also worth fixing');
  });

  it('keeps the animated text out of the accessibility tree and gives the full talk to one live region', () => {
    vi.useFakeTimers();
    const { container } = renderFeedback();
    const live = container.querySelector('[role="status"][aria-live="polite"]')!;
    expect(live.textContent).toContain("Let's go through your answer.");
    expect(live.textContent).toContain("Let's fix the two that matter most first.");
    for (const bubble of container.querySelectorAll('[data-role]')) expect(bubble.getAttribute('aria-hidden')).toBe('true');
  });

  it('does not type the same attempt again when you come back from the Full report', () => {
    vi.useFakeTimers();
    const { container } = renderFeedback();
    act(() => { vi.advanceTimersByTime(6_000); });
    fireEvent.click(screen.getByRole('button', { name: 'Full report' }));
    fireEvent.click(screen.getByRole('button', { name: 'Coach' }));
    expect(container.textContent).toContain('Also worth fixing');
    expect(screen.queryByRole('button', { name: 'Show all' })).toBeNull();
  });
});

describe('FeedbackExperience while the feedback is generated (Batch 6b)', () => {
  const waiting = (over: Partial<Parameters<typeof FeedbackExperience>[0]> = {}) =>
    renderFeedback({ feedback: null, ...over });

  it('shows nothing streamed — no score line, no unfiltered best_moment — only the Predict card', () => {
    const { container } = waiting({
      partialFeedback: { scores: FEEDBACK.scores, wordCount: 19, cefrLevel: 'A2', best_moment: FEEDBACK.best_moment },
      streamPhase: 'generating',
    });
    const text = container.textContent ?? '';
    expect(text).not.toContain('Exam level (A2)');
    expect(text).not.toContain('avec mes amis');
    expect(text).not.toContain('What you did well');
    expect(screen.getByTestId('predict-card')).toBeTruthy();
  });

  it('the status line follows the real stream phase', () => {
    const first = waiting({ streamPhase: 'transcribing' });
    expect(first.container.textContent).toContain('Listening back to your answer…');
    cleanup();
    const second = waiting({ streamPhase: 'generating' });
    expect(second.container.textContent).toContain('Reading what you said…');
  });

  it('offers checks drawn from the question’s demands and a length check otherwise', () => {
    waiting({ demands: { cognitiveDemand: 'justify', timeFrames: ['past'] } });
    expect(screen.getByRole('group', { name: 'Did you give a reason?' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Did you talk about the past?' })).toBeTruthy();
    expect(screen.queryByRole('group', { name: 'Did you say more than 2 sentences?' })).toBeNull();
    cleanup();
    waiting();
    expect(screen.getByRole('group', { name: 'Did you say more than 2 sentences?' })).toBeTruthy();
  });

  it('answering a check is optional and a found marker earns a calibration line when the feedback lands', () => {
    const demands = { cognitiveDemand: 'justify' as const, timeFrames: ['past' as const] };
    const view = waiting({ demands });
    fireEvent.click(within(screen.getByRole('group', { name: 'Did you give a reason?' })).getByRole('button', { name: 'No' }));
    view.rerender(
      <MemoryRouter>
        <FeedbackExperience feedback={FEEDBACK} transcript="Hier j'ai mangé une pizza parce que c'est délicieux." demands={demands} onRetry={vi.fn()} onComplete={vi.fn()} />
      </MemoryRouter>,
    );
    expect(view.container.textContent).toContain("You thought you didn't give a reason, but you did: « parce que c'est délicieux ».");
  });

  it('an unanswered check, or nothing found, says nothing', () => {
    const demands = { cognitiveDemand: 'justify' as const, timeFrames: ['present' as const] };
    const view = waiting({ demands });
    view.rerender(
      <MemoryRouter>
        <FeedbackExperience feedback={FEEDBACK} transcript="Je joue au foot." demands={demands} onRetry={vi.fn()} onComplete={vi.fn()} />
      </MemoryRouter>,
    );
    expect(view.container.textContent).not.toContain('You thought');
    expect(view.container.textContent).not.toContain('You gave a reason');
  });
});
