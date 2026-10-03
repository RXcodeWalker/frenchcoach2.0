/**
 * Feedback cannot mutate the envelope (Phase 3 plan, review point 10): the
 * envelope is deep-frozen, a report is generated from it with a fake
 * generator, and it must be deep-equal to a copy taken before.
 */
import { describe, expect, it } from 'vitest';
import { generateExamFeedback } from '../generate';
import { buildFixtureEnvelope, validReply } from './envelopeFixture';

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value as Record<string, unknown>)) deepFreeze(v);
  }
  return value;
}

describe('generateExamFeedback never mutates the envelope', () => {
  it('runs on a deep-frozen envelope and leaves it deep-equal to before', async () => {
    const envelope = buildFixtureEnvelope();
    const before = structuredClone(envelope);
    deepFreeze(envelope);
    const report = await generateExamFeedback(envelope, async () => JSON.stringify(validReply()));
    expect(report.rolePlay.tasks).toHaveLength(5);
    expect(envelope).toEqual(before);
  });
});
