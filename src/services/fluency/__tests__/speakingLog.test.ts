// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { appendSpeakingSample, getSpeakingLog, SPEAKING_LOG_MAX, type SpeakingSample } from '../speakingLog';
import { STORAGE_KEYS, storageSet } from '../../persistence/storage';

const sample = (id: string): SpeakingSample => ({
  id, at: '2026-11-03T10:00:00.000Z', surface: 'learn', style: 'coach', sessionId: `s-${id}`,
  topicKey: 'school', questionId: 'sch_1', followUp: false, transcriptSource: 'whisper',
  score: 7, aiFluency: 6, durationSec: 20,
  metricsVersion: 1, recordedS: 20, startDelayS: 1.2, speakingSpanS: 17, voicedS: 13, pauseCount: 3,
  pausesOver1s: 2, pausesOver2s: 1, longestPauseS: 2.4, totalPauseS: 4, wordCount: 30,
  wordsPerMinute: 105.9, articulationWpm: 138.5, wordsPerRun: 7.5,
});

beforeEach(() => localStorage.clear());

describe('speaking log', () => {
  it('starts empty and appends in order', () => {
    expect(getSpeakingLog()).toEqual([]);
    appendSpeakingSample(sample('a'));
    appendSpeakingSample(sample('b'));
    expect(getSpeakingLog().map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('replaces a sample with the same id instead of duplicating it', () => {
    appendSpeakingSample(sample('a'));
    appendSpeakingSample({ ...sample('a'), score: 9 });
    expect(getSpeakingLog()).toHaveLength(1);
    expect(getSpeakingLog()[0].score).toBe(9);
  });

  it('keeps only the newest SPEAKING_LOG_MAX samples', () => {
    storageSet(STORAGE_KEYS.speakingLog, { v: 1, samples: Array.from({ length: SPEAKING_LOG_MAX }, (_, i) => sample(String(i))) });
    appendSpeakingSample(sample('new'));
    const log = getSpeakingLog();
    expect(log).toHaveLength(SPEAKING_LOG_MAX);
    expect(log[0].id).toBe('1');
    expect(log[log.length - 1].id).toBe('new');
  });

  it('ignores an unknown version', () => {
    storageSet(STORAGE_KEYS.speakingLog, { v: 99, samples: [sample('a')] });
    expect(getSpeakingLog()).toEqual([]);
  });
});
