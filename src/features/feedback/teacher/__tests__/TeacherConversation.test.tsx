// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('../../../../context/AuthContext', () => ({ useAuth: () => ({ consentStatus: 'unknown' }) }));
vi.mock('../../../recording/useRecording', () => ({
  useRecording: () => ({ isRecording: false, sttSupported: false, start: vi.fn(), stop: vi.fn() }),
}));

import { buildTeacherScript, type TeacherLine } from '../buildTeacherScript';
import { TeacherConversation } from '../TeacherConversation';
import type { FeedbackPointGroup } from '../../components/FeedbackPointList';

const TRANSCRIPT = "Hier j'ai allé au cinéma.";
const groups: FeedbackPointGroup[] = [
  { heading: 'What you did well', tone: 'good', points: [{ kind: 'claim', claim: 'You said when.', quote: 'Hier' }] },
  { heading: 'Fix these first', tone: 'bad', points: [{ kind: 'fix', quote: "j'ai allé", correction: 'je suis allé', why: 'Aller takes être.' }] },
];

function script(): TeacherLine[] {
  return buildTeacherScript({ register: 'coach', transcript: TRANSCRIPT, groups, hasSayItBetter: true });
}

function stubReducedMotion(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: matches && query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }),
  });
}

const renderIt = () =>
  render(
    <>
      <input aria-label="elsewhere" />
      <button type="button">Next question</button>
      <TeacherConversation
        lines={script()}
        revealKey={{}}
        tryFirstHeading="Fix these first"
        renderSection={(s) => <p>{s === 'say-it-better' ? 'THE REWRITE' : 'MORE'}</p>}
      />
    </>,
  );

beforeEach(() => {
  vi.useFakeTimers();
  stubReducedMotion(false);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('TeacherConversation', () => {
  it('puts the full talk in one polite live region and keeps the typed bubbles out of the accessibility tree', () => {
    const { container } = renderIt();
    const live = container.querySelector('[role="status"][aria-live="polite"]')!;
    expect(live.textContent).toBe("Let's go through your answer. There's one thing to fix.");
    expect(container.querySelectorAll('[role="status"]')).toHaveLength(1);
    for (const bubble of container.querySelectorAll('[data-role]')) expect(bubble.getAttribute('aria-hidden')).toBe('true');
  });

  it('keeps every button enabled while it types', () => {
    renderIt();
    expect((screen.getByRole('button', { name: 'Next question' }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole('button', { name: 'Show all' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('Space in a text field or on a button does not skip the typing', () => {
    const { container } = renderIt();
    fireEvent.keyDown(screen.getByLabelText('elsewhere'), { key: ' ' });
    fireEvent.keyDown(screen.getByRole('button', { name: 'Next question' }), { key: ' ' });
    expect(container.textContent).not.toContain('Fix these first');
    fireEvent.keyDown(document.body, { key: ' ' });
    expect(container.textContent).toContain('Fix these first');
  });

  it('plays out on its own in about five seconds, and reduced motion shows it at once', () => {
    const timed = renderIt();
    expect(timed.container.textContent).not.toContain('Fix these first');
    act(() => { vi.advanceTimersByTime(5_500); });
    expect(timed.container.textContent).toContain('Fix these first');
    cleanup();

    stubReducedMotion(true);
    const instant = renderIt();
    expect(instant.container.textContent).toContain('Fix these first');
    expect(screen.queryByRole('button', { name: 'Show all' })).toBeNull();
  });

  it('holds the rewrite until the nudge has been tried or shown', () => {
    stubReducedMotion(true);
    const { container } = renderIt();
    expect(container.textContent).not.toContain('THE REWRITE');
    expect(container.textContent).toContain('Your improved answer appears here');
    fireEvent.click(screen.getByRole('button', { name: 'Just show me' }));
    expect(container.textContent).toContain('THE REWRITE');
    expect(container.textContent).not.toContain('Your improved answer appears here');
  });
});
