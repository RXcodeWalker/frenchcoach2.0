// @vitest-environment jsdom
import type { ComponentProps } from 'react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { ExaminerFeedbackCard } from '../ExaminerFeedbackCard';
import type {
  LearnExaminerFeedback,
  RailRolePlayExaminerFeedback,
  RailTopicExaminerFeedback,
} from '../../../../services/coaching/examinerFeedback';

const LEARN: LearnExaminerFeedback = {
  profile: 'learn',
  strengths: [{ claim: 'You gave a reason with "parce que".', quote: "parce que j'aime le sport" }],
  errors: [{ quote: "j'ai mange une pizza", correction: "j'ai mangé une pizza", category: 'verb_form' }],
  nextStep: { claim: 'Add a second reason.', quote: 'je joue au football', descriptorId: 'C3' },
};

const RAIL_TOPIC: RailTopicExaminerFeedback = {
  profile: 'rail',
  turnKind: 'topic',
  errors: [{ quote: 'je suis alle', correction: 'je suis allé', category: 'agreement' }],
};

const RAIL_RP: RailRolePlayExaminerFeedback = {
  profile: 'rail',
  turnKind: 'rolePlay',
  task: { claim: 'You asked for a table and gave the time.', quote: 'une table pour quatre' },
  clarity: null,
  error: { quote: 'a huit heures', correction: 'à huit heures', category: 'preposition' },
};

afterEach(cleanup);

function renderCard(props: Partial<ComponentProps<typeof ExaminerFeedbackCard>> = {}) {
  return render(
    <ExaminerFeedbackCard status="done" result={LEARN} onRetry={vi.fn()} onSwitchToCoach={vi.fn()} {...props} />,
  );
}

describe('ExaminerFeedbackCard — full learn card', () => {
  it('renders the three headings, the quote → correction row with its category chip, and the next step', () => {
    renderCard();
    expect(screen.getByText('What worked')).not.toBeNull();
    expect(screen.getByText('Mistakes to fix')).not.toBeNull();
    expect(screen.getByText('Your next step')).not.toBeNull();
    expect(screen.getByText("« j'ai mange une pizza »")).not.toBeNull();
    expect(screen.getByText("j'ai mangé une pizza")).not.toBeNull();
    expect(screen.getByText('Verb form')).not.toBeNull();
    expect(screen.getByText('Add a second reason.')).not.toBeNull();
  });

  it('shows the descriptor aimed at, by page, and the practice-only label', () => {
    renderCard();
    expect(screen.getByText(/Descriptor to aim for: “Gives reasons or explanations for some answers\.”/)).not.toBeNull();
    expect(screen.getByText(/Teacher\/Examiner Notes p\.11/)).not.toBeNull();
    expect(screen.getByText('Practice feedback — not a grade prediction')).not.toBeNull();
  });

  it('no longer uses the old "move this up a band" heading', () => {
    renderCard();
    expect(screen.queryByText('What would move this up a band')).toBeNull();
    expect(screen.queryByText('What this answer currently shows')).toBeNull();
  });
});

describe('ExaminerFeedbackCard — compact variant', () => {
  it('keeps the same content but drops the header and the descriptor line', () => {
    renderCard({ variant: 'compact' });
    expect(screen.getByText('What worked')).not.toBeNull();
    expect(screen.getByText('Mistakes to fix')).not.toBeNull();
    expect(screen.getByText('Your next step')).not.toBeNull();
    expect(screen.queryByText('Examiner commentary')).toBeNull();
    expect(screen.queryByText(/Descriptor to aim for/)).toBeNull();
  });

  it('rail topic turn: mistakes only', () => {
    renderCard({ variant: 'compact', result: RAIL_TOPIC });
    expect(screen.getByText('Mistakes to fix')).not.toBeNull();
    expect(screen.getByText('Agreement')).not.toBeNull();
    expect(screen.queryByText('What worked')).toBeNull();
    expect(screen.queryByText('Your next step')).toBeNull();
  });

  it('rail topic turn with nothing to fix says so, honestly', () => {
    renderCard({ variant: 'compact', result: { ...RAIL_TOPIC, errors: [] } });
    expect(screen.getByText('No clear mistakes to fix in this answer.')).not.toBeNull();
  });

  it('role-play turn: the task note and the one error, no marks', () => {
    const { container } = renderCard({ variant: 'compact', result: RAIL_RP });
    expect(screen.getByText('This task')).not.toBeNull();
    expect(screen.getByText('You asked for a table and gave the time.')).not.toBeNull();
    expect(screen.getByText('Preposition')).not.toBeNull();
    expect(container.textContent ?? '').not.toMatch(/\d\s*\/\s*\d|\bmarks?\b|\bband|\bgrade|\bscore/i);
  });
});

describe('ExaminerFeedbackCard — shared states (both variants)', () => {
  it.each(['full', 'compact'] as const)('pending (%s)', (variant) => {
    renderCard({ status: 'pending', result: null, variant });
    expect(screen.getByText('Preparing examiner commentary…')).not.toBeNull();
  });

  it.each(['full', 'compact'] as const)('quota exhausted (%s) offers no retry', (variant) => {
    renderCard({ status: 'quota-exhausted', result: null, variant });
    expect(screen.getByText("You've used today's AI feedback allowance.")).not.toBeNull();
    expect(screen.queryByText('Try again')).toBeNull();
  });

  it.each(['full', 'compact'] as const)('failed (%s) offers retry, and coach mode unless hidden', (variant) => {
    const onRetry = vi.fn();
    renderCard({ status: 'failed', result: null, onRetry, variant });
    fireEvent.click(screen.getByText('Try again'));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Switch to coach mode')).not.toBeNull();
  });

  it('hideSwitchToCoach hides the coach-mode escape hatch', () => {
    renderCard({ status: 'failed', result: null, hideSwitchToCoach: true, variant: 'compact' });
    expect(screen.queryByText('Switch to coach mode')).toBeNull();
  });

  it('an empty learn result says there is no commentary', () => {
    renderCard({ result: { profile: 'learn', strengths: [], errors: [], nextStep: null } });
    expect(screen.getByText('No examiner commentary for this answer.')).not.toBeNull();
  });
});
