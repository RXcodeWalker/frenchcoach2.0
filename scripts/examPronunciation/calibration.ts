/**
 * Exam-pronunciation calibration — the release gate's pass criteria
 * (exam-pronunciation plan, Batch 7; docs/systems/exam-pronunciation.md,
 * "Calibration").
 *
 * Reads the recorded fixtures in the backend repo
 * (`backend/tests/fixtures/exam_pronunciation_calibration/<set>/*.json`,
 * written by `backend/scripts/probe_exam_pronunciation.py`), runs the CURRENT
 * fairness rules (`judgeTurn`, `FAIRNESS_CONFIG`) over each clip's stored
 * evidence, and decides:
 *
 *  - clear (Common Voice, clear French) → 0 reported words.
 *  - accented (Common Voice, strong but understandable accent) → 0
 *    accent-only reports. A report counts as accent-only unless the clip's
 *    `knownMisreadings` lists the word (a human listened and confirmed the
 *    speaker said a different word — a genuine error, not accent).
 *  - unclear (set 3, minimal-pair swaps) → every `expectedReported` word of a
 *    `swap` reading is reported.
 *
 * Two readings of the plan's wording, both stricter than the letter, never
 * looser: set 3's `correct` readings are clear French by the same speaker and
 * are held to the clear rule (0 reports); and a `swap` reading reporting a word
 * that was NOT swapped fails too (a false positive is still a false positive).
 * A set passes only with at least one assessed clip — a clip Whisper could not
 * hear has 0 reports trivially and is listed, never counted as a pass.
 *
 * Pure apart from `loadCalibrationFixtures`. Never imported by the app.
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { FAIRNESS_CONFIG, judgeTurn, normalizeWord } from '../../src/domain/examPronunciation/fairness';
import type { ExamPronunciationTurnEvidence, SoundCategory, SuppressionReason } from '../../src/domain/examPronunciation/types';
import { EXAM_PRONUNCIATION_VERSION } from '../../src/domain/examPronunciation/version';

export const CALIBRATION_SETS = ['clear', 'accented', 'unclear'] as const;
export type CalibrationSet = (typeof CALIBRATION_SETS)[number];

export interface CalibrationClip {
  clipId: string;
  set: CalibrationSet;
  /** Set 3 only. */
  reading?: 'correct' | 'swap' | null;
  examTranscript: string;
  expectedReported?: string[] | null;
  knownMisreadings?: string[] | null;
  source?: unknown;
}

export interface CalibrationFixture {
  fixtureFormat: 1;
  assessorVersion: string;
  fairnessVersion: string;
  recordedAt: string;
  clip: CalibrationClip;
  evidence: ExamPronunciationTurnEvidence;
}

export interface WordFinding {
  clipId: string;
  word: string;
  category: SoundCategory | null;
  accuracy: number | null;
  reasons: SuppressionReason[];
}

export interface GroupResult {
  /** Clips in the group whose evidence was assessed. */
  assessed: number;
  notAssessed: string[];
  /** The words that fail the group's rule. Empty = pass. */
  failures: WordFinding[];
  pass: boolean;
}

export type CalibrationStatus = 'not_run' | 'incomplete' | 'pass' | 'fail';

export interface CalibrationResult {
  status: CalibrationStatus;
  fairnessVersion: string;
  fixtureCount: number;
  /** clear = set 1 + set 3's correct readings; unclear = set 3's swap readings. */
  groups: Record<CalibrationSet, GroupResult>;
  /** Swapped words that were reported, with their accuracy — the margin under the floors. */
  caught: WordFinding[];
  /**
   * Threshold check: in clear/accented clips, mispronounced words suppressed
   * only by an accuracy floor (`above_floor` / `not_meaning_carrying`) — how
   * close accent came to being reported. Sorted lowest accuracy first.
   */
  nearMisses: WordFinding[];
}

export function loadCalibrationFixtures(dir: string): CalibrationFixture[] {
  const out: CalibrationFixture[] = [];
  for (const set of CALIBRATION_SETS) {
    const setDir = join(dir, set);
    if (!existsSync(setDir)) continue;
    for (const name of readdirSync(setDir).filter((n) => n.endsWith('.json')).sort()) {
      out.push(JSON.parse(readFileSync(join(setDir, name), 'utf8')) as CalibrationFixture);
    }
  }
  return out;
}

const FLOOR_ONLY: ReadonlySet<SuppressionReason> = new Set(['above_floor', 'not_meaning_carrying']);

function group(): GroupResult {
  return { assessed: 0, notAssessed: [], failures: [], pass: false };
}

export function evaluateCalibration(fixtures: readonly CalibrationFixture[]): CalibrationResult {
  const groups: Record<CalibrationSet, GroupResult> = { clear: group(), accented: group(), unclear: group() };
  const caught: WordFinding[] = [];
  const nearMisses: WordFinding[] = [];

  for (const fx of fixtures) {
    const { clip, evidence } = fx;
    const bucket: CalibrationSet =
      clip.set === 'unclear' ? (clip.reading === 'swap' ? 'unclear' : 'clear') : clip.set;
    const g = groups[bucket];
    const expected = new Set((clip.expectedReported ?? []).map(normalizeWord));
    const misread = new Set((clip.knownMisreadings ?? []).map(normalizeWord));

    if (evidence.couldNotAssess) {
      g.notAssessed.push(clip.clipId);
      for (const w of expected) {
        g.failures.push({ clipId: clip.clipId, word: w, category: null, accuracy: null, reasons: ['turn_not_assessed'] });
      }
      continue;
    }
    g.assessed += 1;

    const verdicts = judgeTurn(evidence);
    const finding = (v: (typeof verdicts)[number]): WordFinding => ({
      clipId: clip.clipId,
      word: v.word,
      category: v.category,
      accuracy: evidence.words[v.index].accuracyScore,
      reasons: v.reasons,
    });

    const reportedWords = new Set<string>();
    for (const v of verdicts) {
      const w = normalizeWord(v.word);
      if (v.reported) {
        reportedWords.add(w);
        if (bucket === 'unclear' && expected.has(w)) caught.push(finding(v));
        else if (!(bucket === 'accented' && misread.has(w))) g.failures.push(finding(v));
      } else if (bucket !== 'unclear' && v.reasons.length > 0 && v.reasons.every((r) => FLOOR_ONLY.has(r))) {
        nearMisses.push(finding(v));
      }
    }

    if (bucket === 'unclear') {
      for (const w of expected) {
        if (reportedWords.has(w)) continue;
        const v = verdicts.find((x) => normalizeWord(x.word) === w);
        g.failures.push(
          v ? finding(v) : { clipId: clip.clipId, word: w, category: null, accuracy: null, reasons: [] },
        );
      }
    }
  }

  for (const g of Object.values(groups)) g.pass = g.assessed > 0 && g.failures.length === 0;
  nearMisses.sort((a, b) => (a.accuracy ?? 101) - (b.accuracy ?? 101));

  const all = Object.values(groups);
  const status: CalibrationStatus =
    fixtures.length === 0
      ? 'not_run'
      : all.some((g) => g.failures.length > 0)
        ? 'fail'
        : all.some((g) => g.assessed === 0)
          ? 'incomplete'
          : 'pass';

  return {
    status,
    fairnessVersion: EXAM_PRONUNCIATION_VERSION,
    fixtureCount: fixtures.length,
    groups,
    caught,
    nearMisses,
  };
}

/** One readable block for the terminal and for verification-log.md. */
export function formatCalibrationResult(r: CalibrationResult): string {
  const fmt = (f: WordFinding) =>
    `${f.clipId}: "${f.word}"${f.accuracy === null ? '' : ` acc ${f.accuracy}`}${f.category ? ` [${f.category}]` : ''}` +
    (f.reasons.length ? ` (${f.reasons.join(', ')})` : '');
  const lines = [
    `Exam-pronunciation calibration — ${r.status.toUpperCase()}`,
    `fairness ${r.fairnessVersion}; floors: accuracy ${FAIRNESS_CONFIG.accuracyFloor}, very-low ${FAIRNESS_CONFIG.veryLowFloor}; ${r.fixtureCount} fixture(s)`,
  ];
  const rule: Record<CalibrationSet, string> = {
    clear: '0 reported words',
    accented: '0 accent-only reports',
    unclear: 'every swapped word reported, nothing else',
  };
  for (const set of CALIBRATION_SETS) {
    const g = r.groups[set];
    lines.push(
      `- ${set} (${rule[set]}): ${g.assessed === 0 ? 'NO CLIPS' : g.pass ? 'pass' : 'FAIL'} — ${g.assessed} assessed` +
        (g.notAssessed.length ? `, not assessed: ${g.notAssessed.join(', ')}` : ''),
    );
    for (const f of g.failures) lines.push(`    ✗ ${fmt(f)}`);
  }
  if (r.caught.length) {
    lines.push('Swapped words caught:');
    for (const f of r.caught) lines.push(`    ✓ ${fmt(f)}`);
  }
  if (r.nearMisses.length) {
    lines.push('Near misses (suppressed only by a floor; lowest accuracy first):');
    for (const f of r.nearMisses.slice(0, 15)) lines.push(`    · ${fmt(f)}`);
  }
  return lines.join('\n');
}
