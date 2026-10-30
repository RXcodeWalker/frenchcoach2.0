import { describe, expect, it } from 'vitest';
import { normalizeWord } from '../../../src/domain/examPronunciation/fairness';
import { azureWord, scripted } from '../../../src/domain/pronunciation/lab/__tests__/labFixtures';
import { tokenizeSentence } from '../../../src/domain/pronunciation/lab/textFeatures';
import { LAB_THRESHOLDS } from '../../../src/domain/pronunciation/lab/thresholds';
import {
  analyseLabCalibration,
  formatLabCalibrationReport,
  sweepThresholds,
  type LabCalibrationFixture,
} from '../analyse';
import type { ClipKind, SpeakerKind } from '../plan';
import { CALIBRATION_SENTENCES } from '../sentences';

interface Spec {
  /** Per-word Azure score overrides by token index (default 92). */
  scores?: Record<number, number>;
  /** Token indexes Azure reports as skipped. */
  skipped?: number[];
  /** True = Azure could not assess this clip at all. */
  unassessable?: boolean;
}

function fixture(kind: ClipKind, speaker: string, speakerKind: SpeakerKind, i: number, spec: Spec = {}): LabCalibrationFixture {
  const s = CALIBRATION_SENTENCES[i];
  const tokens = tokenizeSentence(s.sentence);
  const words = tokens.map((t, idx) =>
    azureWord(t.norm, spec.scores?.[idx] ?? 92, {
      errorType: spec.skipped?.includes(idx) ? 'skipped' : (spec.scores?.[idx] ?? 92) < 50 ? 'mispronounced' : 'correct',
    }),
  );
  const response = spec.unassessable
    ? scripted([], { couldNotAssess: true, couldNotAssessReason: 'no_speech_recognized', score: null, subScores: null })
    : scripted(words);
  return {
    fixtureFormat: 1,
    clip: {
      clipId: `${kind}-${speaker}-${s.id}`,
      kind,
      speaker,
      speakerKind,
      targetText: s.sentence,
      sentenceId: s.id,
      swapWord: kind === 'detect-swap' ? s.swapWord : null,
      swapTo: kind === 'detect-swap' ? s.swapTo : null,
    },
    response,
  };
}

const swapIndexOf = (i: number) =>
  tokenizeSentence(CALIBRATION_SENTENCES[i].sentence).findIndex((t) => t.norm === normalizeWord(CALIBRATION_SENTENCES[i].swapWord));
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** 20 swaps, `caughtCount` of them with the swapped word scored low; 20 clean owner readings; clean accented speakers. */
function suite(opts: { caughtCount?: number; accented?: string[]; accentedSpec?: (i: number) => Spec; ownerSpec?: (i: number) => Spec } = {}) {
  const caughtCount = opts.caughtCount ?? 20;
  const all: LabCalibrationFixture[] = [];
  for (const i of range(20)) {
    all.push(fixture('detect-swap', 'owner', 'owner', i, i < caughtCount ? { scores: { [swapIndexOf(i)]: 25 } } : {}));
    all.push(fixture('detect-correct', 'owner', 'owner', i, opts.ownerSpec?.(i)));
  }
  for (const speaker of opts.accented ?? ['asha']) {
    for (const i of range(20)) all.push(fixture('fair', speaker, 'accented', i, opts.accentedSpec?.(i)));
  }
  return all;
}

describe('analyseLabCalibration', () => {
  it('PASS when ≥ 80 % of swaps are caught and nobody is falsely flagged', () => {
    const r = analyseLabCalibration(suite({ caughtCount: 17 }));
    expect(r.verdict).toBe('pass');
    expect(r.detection).toMatchObject({ swapReadings: 20, caught: 17, pass: true });
    expect(r.fairnessPass).toBe(true);
    expect(r.groups.map((g) => g.verdict)).toEqual(['pass', 'pass']);
  });

  it('FAIL when too few swaps are caught — 15 of 20 is 75 %', () => {
    const r = analyseLabCalibration(suite({ caughtCount: 15 }));
    expect(r.verdict).toBe('fail');
    expect(r.reasons.join(' ')).toMatch(/only 15 of 20/);
    expect(r.detection.pass).toBe(false);
  });

  it('FAIL on the exam’s failure mode: the swapped word comes back Clear', () => {
    const r = analyseLabCalibration(suite({ caughtCount: 0 }));
    expect(r.verdict).toBe('fail');
    expect(r.detection.findings.every((f) => f.outcome === 'told-clear')).toBe(true);
  });

  it('a swap Azure skipped counts as caught (“Not heard”); a swap it could not assess is a miss, in the denominator', () => {
    const fixtures = suite({ caughtCount: 20 });
    const skippedIdx = fixtures.findIndex((f) => f.clip.clipId === 'detect-swap-owner-s01');
    fixtures[skippedIdx] = fixture('detect-swap', 'owner', 'owner', 0, { skipped: [swapIndexOf(0)] });
    const failedIdx = fixtures.findIndex((f) => f.clip.clipId === 'detect-swap-owner-s02');
    fixtures[failedIdx] = fixture('detect-swap', 'owner', 'owner', 1, { unassessable: true });
    const r = analyseLabCalibration(fixtures);
    const byId = Object.fromEntries(r.detection.findings.map((f) => [f.sentenceId, f]));
    expect(byId.s01.outcome).toBe('caught');
    expect(byId.s01.state).toBe('missed');
    expect(byId.s02.outcome).toBe('not-assessed');
    expect(r.detection).toMatchObject({ swapReadings: 20, caught: 19 });
  });

  it('FAIL when an accented speaker is falsely flagged more than once per 20 sentences — and says who', () => {
    const r = analyseLabCalibration(suite({ accentedSpec: (i) => (i < 3 ? { scores: { 1: 30 } } : {}) }));
    expect(r.verdict).toBe('fail');
    const asha = r.groups.find((g) => g.speaker === 'asha')!;
    expect(asha).toMatchObject({ verdict: 'fail', assessed: 20, falsePractise: 3, per20: 3 });
    expect(r.reasons.join(' ')).toMatch(/asha had 3 false flags in 20/);
  });

  it('exactly one false flag in 20 sentences still passes (the plan’s limit is “≤ 1 per 20”)', () => {
    const r = analyseLabCalibration(suite({ accentedSpec: (i) => (i === 4 ? { scores: { 1: 30 } } : {}) }));
    expect(r.groups.find((g) => g.speaker === 'asha')).toMatchObject({ verdict: 'pass', falsePractise: 1 });
    expect(r.verdict).toBe('pass');
  });

  it('counts “Not heard” on a correct reading as a false flag too (stricter than the plan’s Practise-only wording)', () => {
    const r = analyseLabCalibration(suite({ ownerSpec: (i) => (i < 2 ? { skipped: [1] } : {}) }));
    const owner = r.groups.find((g) => g.speaker === 'owner')!;
    expect(owner).toMatchObject({ falsePractise: 0, verdict: 'fail' });
    expect(owner.falseFlags).toHaveLength(2);
    expect(owner.falseFlags[0].state).toBe('missed');
  });

  it('never pretends: no accented speaker other than the owner ⇒ INCOMPLETE, not PASS', () => {
    const r = analyseLabCalibration(suite({ accented: [] }));
    expect(r.verdict).toBe('incomplete');
    expect(r.reasons.join(' ')).toMatch(/accented speaker other than you/);
  });

  it('too few readings for a speaker are listed but not judged — and do not rescue the verdict', () => {
    const fixtures = suite({ accented: [] });
    for (const i of range(10)) fixtures.push(fixture('fair', 'ravi', 'accented', i));
    const r = analyseLabCalibration(fixtures);
    expect(r.groups.find((g) => g.speaker === 'ravi')!.verdict).toBe('too-few');
    expect(r.verdict).toBe('incomplete');
    expect(r.reasons.join(' ')).toMatch(/ravi has only 10 assessed/);
  });

  it('too few swap readings ⇒ INCOMPLETE', () => {
    const fixtures = suite().filter((f) => !(f.clip.kind === 'detect-swap' && Number(f.clip.sentenceId!.slice(1)) > 15));
    const r = analyseLabCalibration(fixtures);
    expect(r.verdict).toBe('incomplete');
    expect(r.reasons.join(' ')).toMatch(/15 swap readings recorded, 20 needed/);
  });

  it('a clear failure is reported as FAIL even while other recordings are still missing', () => {
    const r = analyseLabCalibration(suite({ accented: [], caughtCount: 5 }));
    expect(r.verdict).toBe('fail');
  });

  it('uses the Lab’s own current thresholds by default', () => {
    const r = analyseLabCalibration(suite());
    expect(r.thresholds).toEqual(LAB_THRESHOLDS.word);
    expect(analyseLabCalibration(suite(), LAB_THRESHOLDS.word)).toEqual(r);
  });

  it('a swapped word scored in the middle (Almost) is not caught', () => {
    const fixtures = suite();
    const idx = fixtures.findIndex((f) => f.clip.clipId === 'detect-swap-owner-s03');
    fixtures[idx] = fixture('detect-swap', 'owner', 'owner', 2, { scores: { [swapIndexOf(2)]: 70 } });
    const f = analyseLabCalibration(fixtures).detection.findings.find((x) => x.sentenceId === 's03')!;
    expect(f).toMatchObject({ outcome: 'told-almost', state: 'almost' });
  });
});

describe('sweepThresholds', () => {
  it('has a row for the current cut-offs that agrees with the main analysis', () => {
    const fixtures = suite({ caughtCount: 17 });
    const current = sweepThresholds(fixtures).find((r) => r.isCurrent)!;
    expect(current).toMatchObject({ clearMin: 80, almostMin: 60 });
    expect(current.detection).toBeCloseTo(17 / 20);
    expect(current.worstFalsePer20).toBe(0);
  });

  it('shows how a stricter “Almost” floor would catch a swap scored 70', () => {
    const fixtures = suite({ caughtCount: 0 });
    for (const i of range(20)) {
      fixtures[fixtures.findIndex((f) => f.clip.clipId === `detect-swap-owner-s${String(i + 1).padStart(2, '0')}`)] =
        fixture('detect-swap', 'owner', 'owner', i, { scores: { [swapIndexOf(i)]: 66 } });
    }
    const rows = sweepThresholds(fixtures);
    expect(rows.find((r) => r.clearMin === 80 && r.almostMin === 60)!.detection).toBe(0);
    expect(rows.find((r) => r.clearMin === 80 && r.almostMin === 70)!.detection).toBe(1);
  });
});

describe('formatLabCalibrationReport', () => {
  it('prints the verdict, the missed swaps and the false flags', () => {
    const fixtures = suite({ caughtCount: 18, accentedSpec: (i) => (i === 0 ? { scores: { 1: 30 } } : {}) });
    const text = formatLabCalibrationReport(analyseLabCalibration(fixtures), sweepThresholds(fixtures));
    expect(text).toMatch(/VERDICT: PASS/);
    expect(text).toMatch(/18 of 20 swapped words/);
    expect(text).toMatch(/✗ detect-swap-owner-s19 +\w+ → \w+: told-clear/);
    expect(text).toMatch(/PASS +asha \(accented\): 1 flags in 20/);
    expect(text).toMatch(/← current/);
    expect(text).toMatch(/LAB_THRESHOLDS_VERSION bump/);
  });
});
