// Stage 3 (docs/architecture, learn-feedback-contract): mapBackendChanges
// adapts the wire-shape changes[] annotations to the domain ChangeAnnotation[]
// shape. The diff itself is computed client-side (buildChanges.ts) — this
// only carries the LLM's {quote, quoteContext, category, explanation}
// annotations through.

import { describe, it, expect } from 'vitest';
import { mapBackendChanges } from '../apiClient';

describe('mapBackendChanges', () => {
  it('returns an empty array when changes is absent or empty', () => {
    expect(mapBackendChanges(undefined)).toEqual([]);
    expect(mapBackendChanges([])).toEqual([]);
  });

  it('maps a change annotation, preserving quote/quoteContext/explanation', () => {
    const result = mapBackendChanges([
      { quote: 'va', quoteContext: 'je va au parc', category: 'tense', explanation: 'present tense of aller' },
    ]);
    expect(result).toEqual([
      { quote: 'va', quoteContext: 'je va au parc', category: 'tense', explanation: 'present tense of aller' },
    ]);
  });

  it('drops an annotation with no quote — carries no targeting information', () => {
    const result = mapBackendChanges([{ explanation: 'no quote here', category: 'grammar' }]);
    expect(result).toHaveLength(0);
  });

  it('defaults an unrecognised category to grammar rather than crashing', () => {
    const result = mapBackendChanges([{ quote: 'va', category: 'not-a-real-category' }]);
    expect(result[0].category).toBe('grammar');
  });

  it('defaults a missing category to grammar', () => {
    const result = mapBackendChanges([{ quote: 'va' }]);
    expect(result[0].category).toBe('grammar');
  });

  it('defaults a missing explanation to an empty string', () => {
    const result = mapBackendChanges([{ quote: 'va', category: 'tense' }]);
    expect(result[0].explanation).toBe('');
  });
});
