import { describe, expect, it } from 'vitest';
import { computeGoldenCase } from '../../goldenRegression';
import { SYNTHETIC_MANIFEST } from '../../../../src/domain/igcse/guardrails/__tests__/syntheticManifest';
import { buildEnvelopeView, bracketResponseLength } from '../envelopeView';

const CLEAN_ENTRY = SYNTHETIC_MANIFEST.find((e) => e.id === 'clean-long-quote-verification')!;

describe('bracketResponseLength', () => {
  it('buckets short/medium/long', () => {
    expect(bracketResponseLength(10)).toBe('short');
    expect(bracketResponseLength(60)).toBe('medium');
    expect(bracketResponseLength(150)).toBe('long');
  });
});

describe('buildEnvelopeView', () => {
  it('builds a view with zero guardrail triggers and no teacher marks', () => {
    const { envelope } = computeGoldenCase(CLEAN_ENTRY);
    expect(envelope).not.toBeNull();

    const view = buildEnvelopeView(envelope!);

    expect(view.attemptId).toBe(envelope!.attemptId);
    expect(view.guardrailTriggers).toEqual([]);
    expect(view.teacherMarkSet).toBeUndefined();
    expect(view.criteria).toHaveLength(7); // 5 role-play tasks + communication + qualityOfLanguage
    expect(view.evidenceGroups.length).toBeGreaterThan(0);

    const communication = view.criteria.find((c) => c.criterion === 'communication')!;
    expect(communication.teacherMark).toBeUndefined();
    expect(communication.responseLength).toBeDefined();
    // CLEAN_LONG_TRANSCRIPT has topic1='A', topic2='B' (different) — topicArea is only
    // attached when both conversations agree, so it must be undefined here.
    expect(communication.topicArea).toBeUndefined();

    const rolePlayRow = view.criteria.find((c) => c.criterion === 'rolePlayTask');
    expect(rolePlayRow?.topicArea).toBeUndefined();
  });
});

describe('buildEnvelopeView — QoL errors (Phase 3 Batch A, display only)', () => {
  it('exposes the envelope QoL errors verbatim on the qualityOfLanguage row only', () => {
    const { envelope } = computeGoldenCase(CLEAN_ENTRY);
    const withErrors = {
      ...envelope!,
      qualityOfLanguage: {
        ...envelope!.qualityOfLanguage,
        errors: [{ source: 'topic1' as const, turnId: 'q1', quote: 'je faire', kind: 'grammar' as const, correction: 'je fais' }],
      },
    };
    const view = buildEnvelopeView(withErrors);
    const qol = view.criteria.find((c) => c.criterion === 'qualityOfLanguage')!;
    expect(qol.errors).toEqual([{ source: 'topic1', turnId: 'q1', quote: 'je faire', correction: 'je fais' }]);
    expect(view.criteria.filter((c) => c.criterion !== 'qualityOfLanguage').every((c) => c.errors === undefined)).toBe(true);
    // Display only: the envelope's marks are what the view renders, unchanged.
    expect(qol.mark).toBe(envelope!.qualityOfLanguage.mark);
  });

  it('omits errors on a pre-v0.4 envelope that never had a list', () => {
    const { envelope } = computeGoldenCase(CLEAN_ENTRY);
    const { errors: _drop, ...qolWithout } = envelope!.qualityOfLanguage;
    void _drop;
    const view = buildEnvelopeView({ ...envelope!, qualityOfLanguage: qolWithout });
    expect(view.criteria.find((c) => c.criterion === 'qualityOfLanguage')!.errors).toBeUndefined();
  });
});
