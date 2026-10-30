import { describe, expect, it } from 'vitest';
import { practiceLinkFor, priceState, sessionsToEarn } from '../itemState';

describe('priceState', () => {
  it('is locked whatever the balance when the requirement is unmet', () => {
    expect(priceState(100, 10_000, false)).toEqual({ kind: 'locked' });
  });
  it('is affordable at exactly the price and reports the balance after', () => {
    expect(priceState(400, 400, true)).toEqual({ kind: 'affordable', price: 400, after: 0 });
    expect(priceState(400, 650, true)).toEqual({ kind: 'affordable', price: 400, after: 250 });
  });
  it('is short with the gap and the sessions to close it', () => {
    expect(priceState(400, 260, true)).toEqual({ kind: 'short', price: 400, short: 140, sessions: 3 });
  });
});

describe('sessionsToEarn', () => {
  it('rounds up and never says zero sessions', () => {
    expect(sessionsToEarn(1)).toBe(1);
    expect(sessionsToEarn(50)).toBe(1);
    expect(sessionsToEarn(51)).toBe(2);
  });
});

describe('practiceLinkFor', () => {
  it('sends exam requirements to Exam and everything else to Learn', () => {
    expect(practiceLinkFor('examinateur').to).toBe('/exam');
    expect(practiceLinkFor('grand_oral').to).toBe('/exam');
    expect(practiceLinkFor('triple_jour').to).toBe('/learn');
    expect(practiceLinkFor(undefined).to).toBe('/learn');
  });
});
