// @vitest-environment jsdom
/**
 * 0520 conduct plan exam intro copy tests (exam-conduct §1-§2, §4). Fixed in
 * Batch 3.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ExamIntro } from '../ExamIntro';

vi.mock('../../../services/exam/examinerVoice', () => ({
  isTtsAvailable: () => false,
  hasFrenchVoice: () => true,
  ensureVoiceReady: () => Promise.resolve(),
}));

afterEach(() => cleanup());

function introText(): string {
  const { container } = render(<ExamIntro coached={false} onStart={vi.fn()} onBack={vi.fn()} />);
  return container.textContent ?? '';
}

describe('ExamIntro — 0520 Paper 3 structure (Batch 3)', () => {
  it('exam-conduct §1: names Paper 3, not Paper 4', () => {
    expect(introText()).not.toMatch(/Paper 4/);
    expect(introText()).toMatch(/Paper 3/);
  });

  it('exam-conduct §1: no three-minute parts and no "general conversation"', () => {
    const text = introText();
    expect(text).not.toMatch(/three minutes|trois minutes|3 min/i);
    expect(text).not.toMatch(/general conversation/i);
  });

  it('exam-conduct §1-§2: mentions two topic conversations and 10 minutes of preparation', () => {
    const text = introText();
    expect(text).toMatch(/two topic conversations/i);
    expect(text).toMatch(/10 min/i);
  });

  it('exam-conduct §4: never names a topic before the test', () => {
    expect(introText()).not.toMatch(/loisirs|hobbies|boulangerie/i);
  });

  it('only one Start button — no duplicate "Hear the card first" action', () => {
    render(<ExamIntro coached={false} onStart={vi.fn()} onBack={vi.fn()} />);
    expect(screen.queryByText(/Hear the card first/i)).toBeNull();
  });
});
