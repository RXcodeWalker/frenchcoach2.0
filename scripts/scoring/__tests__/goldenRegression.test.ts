import { describe, expect, it } from 'vitest';
import { SYNTHETIC_MANIFEST } from '../../../src/domain/igcse/guardrails/__tests__/syntheticManifest';
import { computeGoldenCase, runGoldenRegression } from '../goldenRegression';

describe('goldenRegression', () => {
  it('produces zero diffs against the checked-in goldens for the full manifest', async () => {
    const { failures, checked } = await runGoldenRegression({ updateGoldens: false });
    expect(checked).toHaveLength(SYNTHETIC_MANIFEST.length);
    expect(failures).toEqual([]);
  });

  it('scopes to a single case via --case', async () => {
    const id = SYNTHETIC_MANIFEST[0].id;
    const { checked, failures } = await runGoldenRegression({ updateGoldens: false, caseId: id });
    expect(checked).toEqual([id]);
    expect(failures).toEqual([]);
  });

  it('throws on an unknown --case id', async () => {
    await expect(runGoldenRegression({ updateGoldens: false, caseId: 'does-not-exist' })).rejects.toThrow(
      /No syntheticManifest entry/,
    );
  });

  it('every entry with a static assessment trips exactly its declared guardrails', () => {
    for (const entry of SYNTHETIC_MANIFEST.filter((e) => e.assessment)) {
      expect(computeGoldenCase(entry).guardrailTriggers, entry.id).toEqual(entry.expectedGuardrails);
    }
  });

  it('stage 6: the sound-alike cases keep the mark the rules call for', () => {
    const qol = (id: string) => {
      const envelope = computeGoldenCase(SYNTHETIC_MANIFEST.find((e) => e.id === id)!).envelope!;
      return {
        mark: envelope.qualityOfLanguage.mark,
        counted: envelope.qualityOfLanguage.errors?.length,
        excused: envelope.excusedErrors?.map((e) => e.reason),
      };
    };
    // Excused: the re-ask's mark (8) stands and the error is out of the counted list.
    expect(qol('sound-alike-inaudible-excused')).toEqual({ mark: 8, counted: 0, excused: ['inaudible'] });
    expect(qol('sound-alike-near-disagreement-excused')).toEqual({ mark: 8, counted: 0, excused: ['ambiguousNear'] });
    // Counted: no re-ask, the first mark (7) and its error stand.
    expect(qol('sound-alike-near-agreement-counted')).toEqual({ mark: 7, counted: 1, excused: [] });
    // Owner rule until the STT benchmark: a clearly different word the recognisers disagreed on is excused too.
    expect(qol('sound-alike-different-word-excused')).toEqual({ mark: 8, counted: 0, excused: ['recognisersDisagree'] });
    // Excused but the re-ask failed: the first mark stands, never raised by a guardrail.
    expect(qol('sound-alike-fallback-turn')).toEqual({ mark: 7, counted: 0, excused: ['ambiguousNear'] });
  });
});
