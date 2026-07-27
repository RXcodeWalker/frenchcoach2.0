import { describe, expect, it } from 'vitest';
import { tagVerbsDetector, tagVerbTokens, tagToTimeFrame } from '../tagVerbs';
import { PHASE3_DETECTORS } from '../../framework/phase3Detectors';
import { oneResponseTranscript, runDetectorChain } from './fixtures';

describe('tagVerbTokens', () => {
  it('tags passe compose (avoir + participle)', () => {
    const tagged = tagVerbTokens(['j', 'ai', 'mange', 'une', 'pomme']);
    expect(tagged.map((t) => t.verb.tag)).toContain('auxiliary');
    expect(tagged.map((t) => t.verb.tag)).toContain('passe_compose_participle');
  });

  it('tags futur proche (aller + infinitive)', () => {
    const tagged = tagVerbTokens(['je', 'vais', 'manger']);
    expect(tagged.some((t) => t.verb.tag === 'futur_proche')).toBe(true);
  });

  it('tags imparfait', () => {
    const tagged = tagVerbTokens(['je', 'jouais', 'au', 'tennis']);
    expect(tagged.some((t) => t.verb.tag === 'imparfait')).toBe(true);
  });

  it('tags conditionnel before imparfait (overlap priority)', () => {
    const tagged = tagVerbTokens(['je', 'jouerais']);
    expect(tagged.some((t) => t.verb.tag === 'conditionnel')).toBe(true);
  });

  it('tags futur simple', () => {
    const tagged = tagVerbTokens(['je', 'jouerai']);
    expect(tagged.some((t) => t.verb.tag === 'futur_simple')).toBe(true);
  });

  it('returns empty for a verbless token list', () => {
    expect(tagVerbTokens(['euh'])).toEqual([]);
  });
});

describe('tagToTimeFrame', () => {
  it('maps morphological tags to time frames', () => {
    expect(tagToTimeFrame('passe_compose_participle')).toBe('past');
    expect(tagToTimeFrame('imparfait')).toBe('past');
    expect(tagToTimeFrame('futur_simple')).toBe('future');
    expect(tagToTimeFrame('futur_proche')).toBe('future');
    expect(tagToTimeFrame('conditionnel')).toBe('conditional');
    expect(tagToTimeFrame('present')).toBe('present');
  });
});

describe('tag-verbs detector', () => {
  it('emits verb observations, feature-only (skillNodeId null), tier 0 with no dependsOn', () => {
    expect(tagVerbsDetector.tier).toBe(0);
    expect(tagVerbsDetector.dependsOn).toEqual([]);
    const transcript = oneResponseTranscript("j'ai mange une pomme");
    const observations = runDetectorChain(tagVerbsDetector, PHASE3_DETECTORS, transcript);
    expect(observations.length).toBeGreaterThan(0);
    expect(observations.every((o) => o.skillNodeId === null)).toBe(true);
  });
});
