// @vitest-environment jsdom
/**
 * 0520 conduct plan, Batch 1 repros for the exam intro copy (exam-conduct §1-§2,
 * §4). The rewrite lands in Batch 3; until then `it.fails` pins today's wrong
 * copy without committing a red suite — flip each to `it` when Batch 3 lands.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
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

describe('ExamIntro — 0520 Paper 3 structure (fixed in Batch 3)', () => {
  it.fails('exam-conduct §1: names Paper 3, not Paper 4', () => {
    expect(introText()).not.toMatch(/Paper 4/);
  });

  it.fails('exam-conduct §1: no three-minute parts and no "general conversation"', () => {
    const text = introText();
    expect(text).not.toMatch(/three minutes|trois minutes|3 min/i);
    expect(text).not.toMatch(/general conversation/i);
  });

  it.fails('exam-conduct §1-§2: mentions two topic conversations and 10 minutes of preparation', () => {
    const text = introText();
    expect(text).toMatch(/two topic conversations/i);
    expect(text).toMatch(/10 min/i);
  });

  it.fails('exam-conduct §4: never names a topic before the test', () => {
    expect(introText()).not.toMatch(/loisirs|hobbies|boulangerie/i);
  });
});
