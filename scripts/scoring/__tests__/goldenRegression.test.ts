import { describe, expect, it } from 'vitest';
import { SYNTHETIC_MANIFEST } from '../../../src/domain/igcse/guardrails/__tests__/syntheticManifest';
import { runGoldenRegression } from '../goldenRegression';

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
});
