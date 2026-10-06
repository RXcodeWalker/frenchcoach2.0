import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { bad, ev, turn } from '../../src/domain/examPronunciation/__tests__/evidenceFixture';
import type { ExamPronunciationEvidenceWord } from '../../src/domain/examPronunciation/types';
import {
  evaluateCalibration,
  formatCalibrationResult,
  loadCalibrationFixtures,
  type CalibrationClip,
  type CalibrationFixture,
} from './calibration';

/** Synthetic fixtures — they test the evaluator, not the thresholds. */
function fx(clip: Partial<CalibrationClip> & Pick<CalibrationClip, 'set'>, words: ExamPronunciationEvidenceWord[], couldNotAssess = false): CalibrationFixture {
  return {
    fixtureFormat: 1,
    assessorVersion: 'exam-pronunciation-v1',
    fairnessVersion: 'exam-pronunciation-fairness-v1',
    recordedAt: '2026-10-06T00:00:00+00:00',
    clip: { clipId: `${clip.set}-${clip.reading ?? 'x'}-${words.length}`, examTranscript: '', ...clip },
    evidence: turn(1, words, couldNotAssess ? { couldNotAssess: true, couldNotAssessReason: 'no_speech_recognized', words: [] } : {}),
  };
}

const cleanClear = fx({ set: 'clear' }, [ev('nous'), ev('allons'), ev('bien')]);
const cleanAccented = fx({ set: 'accented' }, [ev('les'), bad('chien', 52), ev('dorment')]);
const caughtSwap = fx({ set: 'unclear', reading: 'swap', expectedReported: ['bon'] }, [ev('un'), bad('bon', 20), ev('gâteau')]);

describe('evaluateCalibration (synthetic evidence)', () => {
  it('is not_run with no fixtures, never a vacuous pass', () => {
    expect(evaluateCalibration([]).status).toBe('not_run');
  });

  it('passes when every rule holds', () => {
    const r = evaluateCalibration([cleanClear, cleanAccented, caughtSwap]);
    expect(r.status).toBe('pass');
    expect(r.caught.map((f) => f.word)).toEqual(['bon']);
    // chien at 52 is above the categorised floor: a near miss, not a report.
    expect(r.nearMisses.map((f) => [f.word, f.accuracy])).toEqual([['chien', 52]]);
  });

  it('is incomplete while a set has no assessed clip', () => {
    expect(evaluateCalibration([cleanClear, cleanAccented]).status).toBe('incomplete');
    const unheard = fx({ set: 'accented' }, [], true);
    const r = evaluateCalibration([cleanClear, unheard, caughtSwap]);
    expect(r.status).toBe('incomplete');
    expect(r.groups.accented.notAssessed).toEqual([unheard.clip.clipId]);
  });

  it('fails a clear clip with any reported word', () => {
    const r = evaluateCalibration([fx({ set: 'clear' }, [ev('un'), bad('bon', 20)]), cleanAccented, caughtSwap]);
    expect(r.status).toBe('fail');
    expect(r.groups.clear.failures.map((f) => f.word)).toEqual(['bon']);
  });

  it("holds set 3's correct readings to the clear rule", () => {
    const correct = fx({ set: 'unclear', reading: 'correct' }, [ev('un'), bad('bon', 20)]);
    const r = evaluateCalibration([cleanClear, cleanAccented, caughtSwap, correct]);
    expect(r.groups.clear.failures.map((f) => f.clipId)).toEqual([correct.clip.clipId]);
  });

  it('fails an accent-only report but not a confirmed misreading', () => {
    const accent = fx({ set: 'accented' }, [ev('un'), bad('bon', 20)]);
    expect(evaluateCalibration([cleanClear, accent, caughtSwap]).groups.accented.pass).toBe(false);
    const misread = fx({ set: 'accented', knownMisreadings: ['bon'] }, [ev('un'), bad('bon', 20)]);
    expect(evaluateCalibration([cleanClear, misread, caughtSwap]).status).toBe('pass');
  });

  it('fails a swap whose word is not reported, or that reports another word', () => {
    const missed = fx({ set: 'unclear', reading: 'swap', expectedReported: ['bon'] }, [ev('un'), bad('bon', 60)]);
    const r1 = evaluateCalibration([cleanClear, cleanAccented, missed]);
    expect(r1.groups.unclear.failures.map((f) => [f.word, f.reasons])).toEqual([['bon', ['above_floor']]]);

    const extra = fx({ set: 'unclear', reading: 'swap', expectedReported: ['bon'] }, [bad('bon', 20), bad('vent', 15)]);
    expect(evaluateCalibration([cleanClear, cleanAccented, extra]).groups.unclear.failures.map((f) => f.word)).toEqual(['vent']);

    const unheard = fx({ set: 'unclear', reading: 'swap', expectedReported: ['bon'] }, [], true);
    expect(evaluateCalibration([cleanClear, cleanAccented, unheard]).groups.unclear.failures[0].reasons).toEqual(['turn_not_assessed']);
  });

  it('never lets French R through, even in a swap reading', () => {
    const r = evaluateCalibration([cleanClear, cleanAccented, fx({ set: 'unclear', reading: 'swap', expectedReported: ['rouge'] }, [bad('rouge', 5)])]);
    expect(r.groups.unclear.failures[0].reasons).toContain('may_be_french_r');
  });

  it('formats a readable verdict', () => {
    const text = formatCalibrationResult(evaluateCalibration([cleanClear, cleanAccented, caughtSwap]));
    expect(text).toContain('PASS');
    expect(text).toContain('✓');
  });
});

// The release gate itself: the recorded fixtures in the backend repo (CI
// checks it out into backend/). Runs only once fixtures exist; until then the
// gate is "not run" and EXAM_PRONUNCIATION_ACCESS must stay off/admin.
const recorded = loadCalibrationFixtures(resolve('backend/tests/fixtures/exam_pronunciation_calibration'));

describe.runIf(recorded.length > 0)('recorded calibration fixtures (Batch 7 release gate)', () => {
  const result = evaluateCalibration(recorded);

  it.each(['clear', 'accented', 'unclear'] as const)('%s: every recorded clip meets its rule', (set) => {
    expect(result.groups[set].failures, formatCalibrationResult(result)).toEqual([]);
  });
});
