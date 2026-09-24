// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { HistoryTab } from '../HistoryTab';
import type { Session } from '../../../types';

afterEach(() => cleanup());

function session(overrides: Partial<Session> = {}): Session {
  return {
    id: 's1',
    mode: 'exam',
    wordCount: 40,
    score: 8,
    xpEarned: 10,
    durationSec: 300,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('HistoryTab', () => {
  it('tags a practiceOnly session as "practice"', () => {
    render(<HistoryTab sessions={[session({ practiceOnly: true })]} />);
    expect(screen.getByText('practice')).not.toBeNull();
  });

  it('does not tag a counting session', () => {
    render(<HistoryTab sessions={[session()]} />);
    expect(screen.queryByText('practice')).toBeNull();
  });
});
