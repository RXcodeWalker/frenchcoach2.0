import { describe, expect, it } from 'vitest';
import { MIN_TREND_SAMPLES, TREND_WINDOW, buildFluencyProfile, type FlowSample } from '../fluencyProfile';
import { metrics } from './fixtures';

const at = (i: number) => new Date(Date.UTC(2026, 9, 1, 12, i)).toISOString();
const sample = (i: number, over: Partial<FlowSample> = {}): FlowSample => ({ ...metrics(), at: at(i), topicKey: 'school', ...over });

describe('buildFluencyProfile', () => {
  it('is empty with no log', () => {
    const p = buildFluencyProfile([]);
    expect(p.measured).toBe(0);
    expect(p.trend).toBeNull();
    expect(p.now.wordsPerMinute).toBeNull();
  });

  it('leaves out other metrics versions and answers too short to describe', () => {
    const p = buildFluencyProfile([sample(0), sample(1, { metricsVersion: 999 }), sample(2, { speakingSpanS: 2 })]);
    expect(p.logged).toBe(3);
    expect(p.measured).toBe(1);
  });

  it('claims no trend below the minimum on each side', () => {
    const p = buildFluencyProfile(Array.from({ length: MIN_TREND_SAMPLES * 2 - 1 }, (_, i) => sample(i)));
    expect(p.trend).toBeNull();
  });

  it('compares the latest answers with the ones before (medians)', () => {
    const slow = Array.from({ length: 10 }, (_, i) => sample(i, { wordsPerMinute: 80 + (i % 3) }));
    const fast = Array.from({ length: 10 }, (_, i) => sample(20 + i, { wordsPerMinute: 110 + (i % 3) }));
    const p = buildFluencyProfile([...fast, ...slow]); // order in the log doesn't matter
    expect(p.trend?.answers).toBe(TREND_WINDOW);
    const speed = p.trend?.changes.find((c) => c.measure === 'wordsPerMinute');
    expect(speed?.direction).toBe('smoother');
    expect(p.now.wordsPerMinute).toBe(111);
    expect(p.nowAnswers).toBe(TREND_WINDOW);
  });

  it('never invents a speed when no words were heard', () => {
    const p = buildFluencyProfile([sample(0, { wordsPerMinute: null, wordsPerRun: null })]);
    expect(p.now.wordsPerMinute).toBeNull();
    expect(p.now.pausesPerMinute).toBe(12);
    expect(p.series[0].wordsPerMinute).toBeNull();
  });

  it('ranks topics with enough answers and names the slowest only when two qualify', () => {
    const one = [0, 1, 2].map((i) => sample(i, { topicKey: 'school', wordsPerMinute: 120 }));
    expect(buildFluencyProfile(one).slowestTopic).toBeNull();
    const two = [...one, ...[3, 4, 5].map((i) => sample(i, { topicKey: 'family', wordsPerMinute: 90 })), sample(6, { topicKey: 'food' })];
    const p = buildFluencyProfile(two);
    expect(p.topics.map((t) => t.topicKey)).toEqual(['school', 'family']);
    expect(p.slowestTopic).toBe('family');
  });
});
