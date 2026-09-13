// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import { TopicGrid } from '../TopicGrid';

const isLearnTopicUnlockedMock = vi.fn();
vi.mock('../../../features/learn/topicProgress', () => ({
  isLearnTopicUnlocked: (deps: string[]) => isLearnTopicUnlockedMock(deps),
}));

afterEach(() => {
  cleanup();
  isLearnTopicUnlockedMock.mockReset();
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
