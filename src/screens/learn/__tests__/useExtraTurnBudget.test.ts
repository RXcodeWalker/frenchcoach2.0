// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExtraTurnBudget } from '../useExtraTurnBudget';

describe('useExtraTurnBudget', () => {
  it('spends the full budget in one session, then a new session gets a full budget back', () => {
    const { result } = renderHook(() => useExtraTurnBudget());

    // Spend all 3 practice slots across 3 different questions (index changes
    // each time so the mutual-exclusion flag never blocks the next spend).
    for (let i = 0; i < 3; i++) {
      expect(result.current.canOfferPractice(i)).toBe(true);
      act(() => result.current.consumePractice(i));
    }
    expect(result.current.practiceStepsUsed).toBe(3);
    expect(result.current.canOfferPractice(3)).toBe(false);

    // Spend all 3 follow-up slots similarly.
    for (let i = 10; i < 13; i++) {
      expect(result.current.canOfferFollowUp(i)).toBe(true);
      act(() => result.current.consumeFollowUp(i));
    }
    expect(result.current.followUpsUsed).toBe(3);
    expect(result.current.canOfferFollowUp(13)).toBe(false);

    act(() => result.current.resetForNewSession());

    expect(result.current.practiceStepsUsed).toBe(0);
    expect(result.current.followUpsUsed).toBe(0);
    expect(result.current.canOfferPractice(0)).toBe(true);
    expect(result.current.canOfferFollowUp(0)).toBe(true);
  });

  it('enforces one extra turn per question within a session (mutual exclusion)', () => {
    const { result } = renderHook(() => useExtraTurnBudget());

    expect(result.current.canOfferPractice(0)).toBe(true);
    act(() => result.current.consumePractice(0));

    // Same question index: follow-up must not also be offered.
    expect(result.current.canOfferFollowUp(0)).toBe(false);
    // A different question is unaffected.
    expect(result.current.canOfferFollowUp(1)).toBe(true);

    act(() => result.current.resetForNewQuestion());
    // resetForNewQuestion clears the mutual-exclusion flag without touching
    // the session-scoped counters.
    expect(result.current.practiceStepsUsed).toBe(1);
    expect(result.current.canOfferFollowUp(0)).toBe(true);
  });
});
