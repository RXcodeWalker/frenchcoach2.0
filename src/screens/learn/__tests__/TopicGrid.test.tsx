// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import type { Topic } from '../../../types';
import { TopicGrid } from '../TopicGrid';

const isLearnTopicUnlockedMock = vi.fn();
vi.mock('../../../features/learn/topicProgress', () => ({
  isLearnTopicUnlocked: (deps: string[]) => isLearnTopicUnlockedMock(deps),
}));

// The real bank holds one question in each advanced topic (so the grid hides
// them all, docs §13.4). These tests need an advanced topic that is shown, so
// the topic list is fixed here: a base topic, a populated advanced topic, and
// a one-question topic that must stay hidden.
vi.mock('../../../data/gameData', () => {
  const topics: Topic[] = [
    { key: 'school', label: "L'école", labelEn: 'School', icon: '🎓', color: '#3b82f6', description: '', questionsCount: 49 },
    { key: 'pro', label: "L'Espace Pro", labelEn: 'Professional French', icon: '💼', color: '#64748b', description: '', questionsCount: 12, isAdvanced: true },
    { key: 'slang', label: "L'Argot", labelEn: 'Slang', icon: '💬', color: '#ef4444', description: '', questionsCount: 1, isAdvanced: true },
    { key: 'art', label: 'Art & Tableaux', labelEn: 'Visual Storytelling', icon: '🖼️', color: '#06b6d4', description: '', questionsCount: 1, isAdvanced: true },
  ];
  return { TOPICS: topics };
});

afterEach(() => {
  cleanup();
  isLearnTopicUnlockedMock.mockReset();
  vi.restoreAllMocks();
});

function buttonFor(topicLabel: string): HTMLElement {
  const heading = screen.getByText(topicLabel);
  return heading.closest('button')!;
}

describe('TopicGrid locking', () => {
  it('renders a locked advanced topic with a non-empty aria-label and does not call onSelect on click', () => {
    isLearnTopicUnlockedMock.mockReturnValue(false);
    const onSelect = vi.fn();
    render(<TopicGrid onSelect={onSelect} />);

    const lockedButton = buttonFor("L'Espace Pro");
    expect(lockedButton.getAttribute('aria-label')).toMatch(/locked/i);
    expect(lockedButton.getAttribute('aria-disabled')).toBe('true');

    fireEvent.click(lockedButton);
    expect(onSelect).not.toHaveBeenCalled();

    // Lock reason text is present in the DOM without requiring hover/focus.
    expect(lockedButton.textContent).toMatch(/complete 5 sessions/i);
  });

  it('renders an unlocked advanced topic normally and calls onSelect on click', () => {
    isLearnTopicUnlockedMock.mockReturnValue(true);
    const onSelect = vi.fn();
    render(<TopicGrid onSelect={onSelect} />);

    const unlockedButton = buttonFor("L'Espace Pro");
    expect(unlockedButton.getAttribute('aria-disabled')).toBe('false');
    expect(unlockedButton.getAttribute('aria-label')).toBeNull();

    fireEvent.click(unlockedButton);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('never gates a base (non-advanced) topic', () => {
    isLearnTopicUnlockedMock.mockReturnValue(false);
    const onSelect = vi.fn();
    render(<TopicGrid onSelect={onSelect} />);

    const baseButton = buttonFor("L'école");
    expect(baseButton.getAttribute('aria-disabled')).toBe('false');
    fireEvent.click(baseButton);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

describe('TopicGrid — one-question topics are hidden (docs §13.4)', () => {
  it('does not render a topic holding a single question, locked or not', () => {
    isLearnTopicUnlockedMock.mockReturnValue(true);
    render(<TopicGrid onSelect={vi.fn()} />);
    expect(screen.queryByText("L'Argot")).toBeNull();
    expect(screen.queryByText('Art & Tableaux')).toBeNull();
    expect(screen.getByText("L'école")).toBeTruthy();
    expect(screen.getByText("L'Espace Pro")).toBeTruthy();
  });

  it('the Random Question button never lands on a hidden topic', () => {
    isLearnTopicUnlockedMock.mockReturnValue(true);
    const onSelect = vi.fn();
    render(<TopicGrid onSelect={onSelect} />);
    const random = screen.getByText('Random Question').closest('button')!;

    // Math.random() just below 1 would pick the LAST topic of the full list ('art', hidden).
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    fireEvent.click(random);
    expect(onSelect.mock.calls[0][0].key).toBe('pro');
    expect(onSelect.mock.calls[0][0].questionsCount).toBeGreaterThan(1);
  });
});
