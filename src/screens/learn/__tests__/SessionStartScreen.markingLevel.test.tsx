// @vitest-environment jsdom
// learn-marking §8 — the marking dial on Learn's setup screen.
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { SessionStartScreen } from '../SessionStartScreen';
import { NO_FILTERS } from '../../../domain/learn/selection/filters';
import type { MarkingLevel } from '../../../domain/learn/marking/markingLevel';
import type { FeedbackMode, Topic } from '../../../types';

afterEach(cleanup);

const TOPIC: Topic = {
  key: 'family', label: 'La famille', labelEn: 'Family', icon: '👪', color: '#8b5cf6',
  description: '', questionsCount: 40,
};

function renderScreen(props: { markingLevel?: MarkingLevel; onMarkingLevelChange?: (l: MarkingLevel) => void; feedbackMode?: FeedbackMode }) {
  return render(
    <SessionStartScreen
      topic={TOPIC}
      topicMastery={null}
      onStart={vi.fn()}
      onBack={vi.fn()}
      filters={NO_FILTERS}
      onFiltersChange={vi.fn()}
      matchCount={40}
      feedbackMode={props.feedbackMode ?? 'coach'}
      onFeedbackModeChange={vi.fn()}
      markingLevel={props.markingLevel}
      onMarkingLevelChange={props.onMarkingLevelChange}
    />,
  );
}

describe('marking dial', () => {
  it('is hidden while the flag is off (no level passed)', () => {
    renderScreen({});
    expect(screen.queryByRole('group', { name: 'Marking level' })).toBeNull();
  });

  it('offers the five levels, marks the current one and reports a pick', () => {
    const onChange = vi.fn();
    renderScreen({ markingLevel: 'exam', onMarkingLevelChange: onChange });
    const group = screen.getByRole('group', { name: 'Marking level' });
    const buttons = within(group).getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['A1', 'A2', 'Exam', 'B1', 'B2']);
    expect(within(group).getByRole('button', { name: 'Exam' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(within(group).getByRole('button', { name: 'B1' }));
    expect(onChange).toHaveBeenCalledWith('B1');
  });

  it('is not shown in the Examiner style, which shows no score', () => {
    renderScreen({ markingLevel: 'exam', onMarkingLevelChange: vi.fn(), feedbackMode: 'examiner' });
    expect(screen.queryByRole('group', { name: 'Marking level' })).toBeNull();
  });
});
