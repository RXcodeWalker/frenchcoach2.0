// Stage 2 (docs/architecture, learn-feedback-contract): mapBackendCorrections
// adapts the provider-neutral corrections[]/quoteSpans[] transport contract
// to the frontend's CoachingIssue[]/TranscriptSpan[] domain shape. The
// client never resolves quote occurrences itself — it only splices the
// spans the server already resolved (invariant #10).

import { describe, it, expect } from 'vitest';
import { mapBackendCorrections } from '../apiClient';

describe('mapBackendCorrections', () => {
  it('returns undefined when corrections is absent or empty — callers fall back to raw.issues', () => {
    expect(mapBackendCorrections(undefined, undefined)).toBeUndefined();
    expect(mapBackendCorrections([], [])).toBeUndefined();
  });

  it('maps a correction to a CoachingIssue, preserving quote/correction/tip/label/priority', () => {
    const result = mapBackendCorrections(
      [{
        id: 'c1',
        severity: 'major',
        label: 'Avoir vs Être',
        description: '« j\'ai allé » is wrong',
        explanation: 'aller takes être in the passé composé',
        correction: 'je suis allé',
        quote: 'j\'ai allé',
        tip: 'Dr Mrs Vandertramp',
        priority: 3,
      }],
      undefined,
    );

    expect(result?.issues).toHaveLength(1);
    const issue = result!.issues[0];
    expect(issue.id).toBe('c1');
    expect(issue.severity).toBe('major');
    expect(issue.quote).toBe('j\'ai allé');
    expect(issue.correction).toBe('je suis allé');
    expect(issue.diagnostic).toBe('aller takes être in the passé composé');
    expect(issue.themeLabel).toBe('Avoir vs Être');
    expect(issue.masterTip).toBe('Dr Mrs Vandertramp');
    expect(issue.marksImpact).toBe(3);
  });

  it('falls back to description for diagnostic when explanation is absent', () => {
    const result = mapBackendCorrections(
      [{ id: 'c1', description: '« x » is wrong', quote: 'x' }],
      undefined,
    );
    expect(result?.issues[0].diagnostic).toBe('« x » is wrong');
  });

  it('drops a correction with no id — cannot be targeted by a span or selected', () => {
    const result = mapBackendCorrections(
      [{ description: 'no id here', quote: 'x' } as never],
      undefined,
    );
    expect(result?.issues ?? []).toHaveLength(0);
  });

  it('clamps an out-of-range priority into 0-3 rather than propagating a bad value', () => {
    const result = mapBackendCorrections([{ id: 'c1', quote: 'x', priority: 99 }], undefined);
    expect(result?.issues[0].marksImpact).toBe(3);
  });

  it('defaults an unrecognised severity string to minor rather than crashing', () => {
    const result = mapBackendCorrections([{ id: 'c1', quote: 'x', severity: 'catastrophic' }], undefined);
    expect(result?.issues[0].severity).toBe('minor');
  });

  it('resolves a unique quote span emitted at the correct offset', () => {
    const result = mapBackendCorrections(
      [{ id: 'c1', quote: 'allé', severity: 'major' }],
      [{ correctionId: 'c1', start: 8, end: 12 }],
    );
    expect(result?.transcriptAnnotations).toEqual([
      { start: 8, end: 12, severity: 'major', category: 'grammar', issueId: 'c1' },
    ]);
  });

  it('a correction ships even when its quoteSpan is missing (ambiguous/unresolved server-side)', () => {
    const result = mapBackendCorrections(
      [{ id: 'c1', quote: 'Paris', severity: 'minor' }],
      [], // server found the quote ambiguous and emitted no span
    );
    expect(result?.issues).toHaveLength(1);
    expect(result?.transcriptAnnotations).toHaveLength(0);
  });

  it('ignores a quoteSpan whose correctionId does not match any surviving correction', () => {
    const result = mapBackendCorrections(
      [{ id: 'c1', quote: 'allé' }],
      [{ correctionId: 'c-orphaned', start: 0, end: 4 }],
    );
    expect(result?.transcriptAnnotations).toHaveLength(0);
  });

  it('ignores a malformed quoteSpan missing start/end', () => {
    const result = mapBackendCorrections(
      [{ id: 'c1', quote: 'allé' }],
      [{ correctionId: 'c1' }],
    );
    expect(result?.transcriptAnnotations).toHaveLength(0);
  });
});
