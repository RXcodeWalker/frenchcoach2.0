// @vitest-environment jsdom
// ── Learn overhaul Batch 2 — the one-screen setup ─────────────────────────────
import { describe, expect, it, vi, afterEach } from 'vitest';
import { useState } from 'react';
import { render, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { SessionStartScreen } from '../SessionStartScreen';
import type { Aim } from '../../../domain/learn/selection/sessionTarget';
import { NO_FILTERS, type LearnFilters } from '../../../domain/learn/selection/filters';
import type { SessionPreview } from '../../../features/learn/sessionSetup';
import type { AbilityResult } from '../../../domain/learn/ability/deriveAbility';
import type { FeedbackMode, SessionMode, Topic } from '../../../types';

afterEach(cleanup);

const TOPIC: Topic = {
  key: 'holidays', label: 'Les vacances', labelEn: 'Holidays & Travel', icon: '✈️', color: '#8b5cf6',
  description: '', questionsCount: 46,
};

const ABILITY = { abilityScore: 4.5, overallConfidence: 0.1, measuredAnswers: 0 } as unknown as AbilityResult;

interface HarnessProps {
  matchCount?: number;
  initialFilters?: LearnFilters;
  focusOptions?: ('present' | 'past' | 'future' | 'opinion')[];
  onStart?: (mode: SessionMode) => void;
  onFiltersChange?: (f: LearnFilters) => void;
  onFeedbackModeChange?: (m: FeedbackMode) => void;
  getPreview?: (mode: SessionMode, aim: Aim) => SessionPreview | null;
  adaptive?: boolean;
}

function Harness({
  matchCount = 46, initialFilters = NO_FILTERS, focusOptions = ['present', 'past'], onStart = vi.fn(),
  onFiltersChange, onFeedbackModeChange, getPreview, adaptive = true,
}: HarnessProps) {
  const [aim, setAim] = useState<Aim>('balanced');
  const [filters, setFilters] = useState<LearnFilters>(initialFilters);
  const [feedbackMode, setFeedbackMode] = useState<FeedbackMode>('coach');
  return (
    <SessionStartScreen
      topic={TOPIC}
      topicMastery={null}
      onStart={onStart}
      onBack={vi.fn()}
      ability={adaptive ? ABILITY : null}
      aim={adaptive ? aim : undefined}
      onAimChange={adaptive ? setAim : undefined}
      filters={filters}
      onFiltersChange={(f) => { setFilters(f); onFiltersChange?.(f); }}
      focusOptions={adaptive ? focusOptions : undefined}
      matchCount={matchCount}
      getPreview={getPreview}
      feedbackMode={feedbackMode}
      onFeedbackModeChange={(m) => { setFeedbackMode(m); onFeedbackModeChange?.(m); }}
    />
  );
}

const lengthButton = (n: number) => screen.getByRole('button', { name: new RegExp(`^${n}\\b`) });

describe('SessionStartScreen — what is gone', () => {
  it('has no engine picker and no separate "just one question" button', () => {
    render(<Harness />);
    expect(screen.queryByText(/AI Engine/i)).toBeNull();
    expect(screen.queryByText(/groq|gemini/i)).toBeNull();
    expect(screen.queryByText(/just one question/i)).toBeNull();
    expect(screen.queryByText(/Choose session length/i)).toBeNull();
  });
});

describe('SessionStartScreen — questions (length)', () => {
  it('offers 1, 5, 10 and 20, defaulting to 10', () => {
    const onStart = vi.fn();
    render(<Harness onStart={onStart} />);
    for (const n of [1, 5, 10, 20]) expect(lengthButton(n)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /start session/i }));
    expect(onStart).toHaveBeenCalledWith('standard');
  });

  it('shows how many questions match', () => {
    render(<Harness matchCount={40} />);
    expect(screen.getByText('40 questions match')).toBeTruthy();
  });

  it('disables lengths above the match count and clamps a larger choice with a message', () => {
    const onStart = vi.fn();
    render(<Harness matchCount={7} onStart={onStart} />);
    expect((lengthButton(10) as HTMLButtonElement).disabled).toBe(true);
    expect((lengthButton(20) as HTMLButtonElement).disabled).toBe(true);
    expect((lengthButton(5) as HTMLButtonElement).disabled).toBe(false);
    // The default (10) no longer fits, so the session is clamped to 5 — and says so.
    expect(screen.getByText(/only 7 questions match/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /start session/i }));
    expect(onStart).toHaveBeenCalledWith('quick');
  });

  it('with zero matches Start is disabled and one tap clears the filter', () => {
    const onStart = vi.fn();
    const onFiltersChange = vi.fn();
    render(<Harness matchCount={0} initialFilters={{ grammar: 'past' }} onStart={onStart} onFiltersChange={onFiltersChange} />);
    const start = screen.getByRole('button', { name: /start session/i }) as HTMLButtonElement;
    expect(start.disabled).toBe(true);
    fireEvent.click(start);
    expect(onStart).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /clear past filter/i }));
    expect(onFiltersChange).toHaveBeenCalledWith({ grammar: null });
  });
});

describe('SessionStartScreen — focus', () => {
  it('shows only the offered focus chips and toggles the filter', () => {
    const onFiltersChange = vi.fn();
    render(<Harness focusOptions={['present', 'past']} onFiltersChange={onFiltersChange} />);
    expect(screen.getByRole('button', { name: 'Past' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /future/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Past' }));
    expect(onFiltersChange).toHaveBeenLastCalledWith({ grammar: 'past' });
    expect(screen.getByRole('button', { name: 'Past' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Past' }));
    expect(onFiltersChange).toHaveBeenLastCalledWith({ grammar: null });
  });

  it('hides the whole Focus section when the topic has no offered chips or the legacy path is live', () => {
    const { unmount } = render(<Harness focusOptions={[]} />);
    expect(screen.queryByText(/^Focus/)).toBeNull();
    unmount();
    render(<Harness adaptive={false} />);
    expect(screen.queryByText(/^Focus/)).toBeNull();
  });
});

describe('SessionStartScreen — difficulty and preview', () => {
  const getPreview = (_mode: SessionMode, aim: Aim): SessionPreview => ({
    total: 5,
    stretch: aim === 'push' ? 2 : 0,
    targetLabel: aim === 'push' ? 'Stretch (B1)' : 'Exam level (A2)',
  });

  it('labels the aim Easier / Right for me / Harder', () => {
    render(<Harness getPreview={getPreview} />);
    for (const name of ['Easier', 'Right for me', 'Harder']) {
      expect(screen.getByRole('button', { name: new RegExp(name) })).toBeTruthy();
    }
    expect(screen.queryByText(/Comfortable|Push/)).toBeNull();
  });

  it('the preview line changes with the difficulty', () => {
    render(<Harness getPreview={getPreview} />);
    expect(screen.getByText('Pitched at Exam level (A2).')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Harder/ }));
    expect(screen.getByText('Pitched at Stretch (B1), with 2 of 5 a step above.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Easier/ }));
    expect(screen.getByText('Pitched at Exam level (A2).')).toBeTruthy();
  });

  it('the preview follows the chosen length', () => {
    const spy = vi.fn(getPreview);
    render(<Harness getPreview={spy} />);
    fireEvent.click(lengthButton(5));
    expect(spy).toHaveBeenLastCalledWith('quick', 'balanced');
  });
});

describe('SessionStartScreen — feedback style', () => {
  it('Coach is the default; Examiner is labelled as unscored', () => {
    const onFeedbackModeChange = vi.fn();
    render(<Harness onFeedbackModeChange={onFeedbackModeChange} />);
    const coach = screen.getByRole('button', { name: /^Coach/ });
    const examiner = screen.getByRole('button', { name: /^Examiner/ });
    expect(coach.getAttribute('aria-pressed')).toBe('true');
    expect(within(examiner).getByText(/no score/i)).toBeTruthy();
    fireEvent.click(examiner);
    expect(onFeedbackModeChange).toHaveBeenCalledWith('examiner');
    expect(examiner.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('SessionStartScreen — topic average', () => {
  it('shows an em dash, never 0.0, when there is no scored average', () => {
    render(
      <SessionStartScreen
        topic={TOPIC}
        topicMastery={{
          topicKey: 'holidays', sessionsCompleted: 2, scoredSessionsCompleted: 0,
          uniqueQuestionsAnswered: ['hol_01'], averageScore: null, lastSessionAt: '', mastered: false,
        }}
        onStart={vi.fn()} onBack={vi.fn()}
        filters={NO_FILTERS} onFiltersChange={vi.fn()} matchCount={46}
        feedbackMode="coach" onFeedbackModeChange={vi.fn()}
      />,
    );
    expect(screen.queryByText('0.0')).toBeNull();
    expect(screen.getByText('—')).toBeTruthy();
  });
});
