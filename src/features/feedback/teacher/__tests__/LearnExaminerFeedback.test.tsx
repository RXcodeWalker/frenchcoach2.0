// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { claimMentionsMarkOrBand } from '../../../../domain/examFeedback/shared/markClaimFilter';
import type { ExaminerFeedback } from '../../../../services/coaching/examinerFeedback';

vi.mock('../../../../context/AuthContext', () => ({ useAuth: () => ({ consentStatus: 'unknown' }) }));

import { LearnExaminerFeedback } from '../LearnExaminerFeedback';

const TRANSCRIPT = "Hier j'ai mange une pizza parce que j'aime le sport.";

const RESULT: ExaminerFeedback = {
  profile: 'learn',
  strengths: [{ claim: 'You gave a reason with "parce que".', quote: "parce que j'aime le sport" }],
  errors: [{ quote: "j'ai mange une pizza", correction: "j'ai mangé une pizza", category: 'verb_form' }],
  nextStep: { claim: 'Add a second reason.', quote: "j'aime le sport", descriptorId: 'C3' },
};

const base = {
  onSwitchToCoach: vi.fn(),
  onRetry: vi.fn(),
  transcript: TRANSCRIPT,
};

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }),
  });
});
afterEach(cleanup);

describe('LearnExaminerFeedback', () => {
  it('while pending, spends the wait on the Predict card with the examiner’s wording', () => {
    render(<LearnExaminerFeedback {...base} status="pending" result={null} demands={{ cognitiveDemand: 'justify', timeFrames: ['present'] }} />);
    expect(screen.getByTestId('predict-card')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Did you give a reason?' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('Reviewing your response…');
  });

  it('when done, is the teacher’s conversation in the formal register', () => {
    const { container } = render(<LearnExaminerFeedback {...base} status="done" result={RESULT} name="Marie" />);
    const text = container.textContent ?? '';
    expect(text).toContain('Madame Laurent');
    expect(text).toContain('Let us go through your answer, Marie.');
    expect(text).toContain('There is one point to correct.');
    expect(text).toContain('Mistakes to fix');
    expect(text).toContain(TRANSCRIPT);
    // Examiner Learn has no nudges: the correction is shown, with its hear-it button where speech exists.
    expect(screen.queryByTestId('try-it-first')).toBeNull();
    expect(text).toContain("j'ai mangé une pizza");
  });

  it('shows no mark, band or grade anywhere, and speaks no framing that would', () => {
    const { container } = render(<LearnExaminerFeedback {...base} status="done" result={RESULT} />);
    for (const bubble of container.querySelectorAll('[data-role]')) {
      expect(claimMentionsMarkOrBand(bubble.textContent ?? '')).toBe(false);
    }
    expect(container.textContent).not.toMatch(/\b\d+\s*\/\s*\d+\b|\bband\b|\bgrade\b|\bmarks?\b/i);
  });

  it('folds a Predict answer into a quoted calibration line', () => {
    const view = render(
      <LearnExaminerFeedback {...base} status="pending" result={null} demands={{ cognitiveDemand: 'justify', timeFrames: ['present'] }} />,
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'No' })[0]);
    view.rerender(
      <LearnExaminerFeedback {...base} status="done" result={RESULT} demands={{ cognitiveDemand: 'justify', timeFrames: ['present'] }} />,
    );
    expect(view.container.textContent).toContain("You thought you didn't give a reason, but you did: « parce que j'aime le sport ».");
  });

  it('leaves failed, quota and empty states to the examiner card', () => {
    const failed = render(<LearnExaminerFeedback {...base} status="failed" result={null} />);
    expect(failed.container.textContent).toContain("Couldn't produce evidence-backed examiner feedback");
    cleanup();
    const quota = render(<LearnExaminerFeedback {...base} status="quota-exhausted" result={null} />);
    expect(quota.container.textContent).toContain("used today's AI feedback allowance");
    cleanup();
    const empty = render(
      <LearnExaminerFeedback {...base} status="done" result={{ profile: 'learn', strengths: [], errors: [], nextStep: null } as unknown as ExaminerFeedback} />,
    );
    expect(empty.container.textContent).toContain('No examiner commentary for this answer.');
    expect(empty.container.textContent).not.toContain('Madame Laurent');
  });

  it('offers the Second take in the formal register when there is something to fix', () => {
    const { container } = render(<LearnExaminerFeedback {...base} status="done" result={RESULT} />);
    expect(container.querySelector('[data-role="secondTake"]')?.textContent).toBe('Now answer once more, applying the corrections.');
    expect(container.querySelector('[data-testid="second-take"]')).toBeTruthy();
  });

  it('announces the authored next question only when Learn passes one', () => {
    const none = render(<LearnExaminerFeedback {...base} status="done" result={RESULT} />);
    expect(none.container.querySelector('[data-role="nextQuestion"]')).toBeNull();
    none.unmount();
    const { container } = render(<LearnExaminerFeedback {...base} status="done" result={RESULT} nextQuestion="Et pourquoi ?" />);
    expect(container.querySelector('[data-role="nextQuestion"]')?.textContent).toBe(
      'An examiner would ask you next: « Et pourquoi ? » Continue to answer it.',
    );
    expect(claimMentionsMarkOrBand(container.querySelector('[data-role="nextQuestion"]')!.textContent!)).toBe(false);
  });
});
