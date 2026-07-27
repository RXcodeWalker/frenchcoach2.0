import { describe, expect, it } from 'vitest';
import { avoidanceDetector } from '../avoidance';
import { LEGACY_DETECTORS } from '../../framework/legacyDetectors';
import { PHASE3_DETECTORS } from '../../framework/phase3Detectors';
import { oneResponseTranscript, runDetectorChain } from './fixtures';

const FULL_FLEET = [...LEGACY_DETECTORS, ...PHASE3_DETECTORS];

const LONG_PRESENT_ONLY = Array.from({ length: 10 }, () => 'je joue au foot avec mes amis').join(' ');

describe('avoidance detector', () => {
  it('does not analyze short responses (below the word-count floor)', () => {
    const transcript = oneResponseTranscript('je joue au foot');
    const observations = runDetectorChain(avoidanceDetector, FULL_FLEET, transcript);
    expect(observations).toEqual([]);
  });

  it('flags past-tense avoidance on a substantial response with zero past-tense verbs', () => {
    const transcript = oneResponseTranscript(LONG_PRESENT_ONLY);
    const observations = runDetectorChain(avoidanceDetector, FULL_FLEET, transcript);
    expect(observations.some((o) => o.value === 'tense_past' && o.skillNodeId === 'tense_past')).toBe(true);
  });

  it('flags future/conditional avoidance on a substantial response with none', () => {
    const transcript = oneResponseTranscript(LONG_PRESENT_ONLY);
    const observations = runDetectorChain(avoidanceDetector, FULL_FLEET, transcript);
    expect(observations.some((o) => o.value === 'tense_future' && o.skillNodeId === 'tense_future')).toBe(true);
  });

  it('does not flag past-tense avoidance when past tense is used', () => {
    const withPast = `${LONG_PRESENT_ONLY} j'ai mange hier et je suis alle au marche hier aussi`;
    const transcript = oneResponseTranscript(withPast);
    const observations = runDetectorChain(avoidanceDetector, FULL_FLEET, transcript);
    expect(observations.some((o) => o.value === 'tense_past')).toBe(false);
  });

  it('is always advisory-only (forbidden mark influence, low confidence per Part 2)', () => {
    const transcript = oneResponseTranscript(LONG_PRESENT_ONLY);
    const observations = runDetectorChain(avoidanceDetector, FULL_FLEET, transcript);
    expect(observations.length).toBeGreaterThan(0);
    expect(observations.every((o) => o.markInfluence === 'forbidden')).toBe(true);
    expect(observations.every((o) => o.confidence === 0.5)).toBe(true);
  });
});
