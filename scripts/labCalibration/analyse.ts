/**
 * Pronunciation Lab calibration — the pass/fail decision (pronunciation-lab
 * plan §7). Pure apart from `loadLabCalibrationFixtures`. Never imported by
 * the app.
 *
 * Input: fixtures recorded by `backend/scripts/probe_lab_calibration.py` — for
 * each recording, the real scripted Azure result for the sentence the speaker
 * was asked to say. Each is run through the Lab's own `buildLabTake` with the
 * CURRENT thresholds, so what is judged is exactly what a learner would see.
 *
 * The plan's criteria:
 *   Detection  ≥ 80 % of deliberately swapped words land in Practise / Not heard.
 *   Fairness   ≤ 1 false "Practise" per 20 sentences of correct reading, for the
 *              owner and for each accented speaker (and Common Voice).
 *
 * Readings of the plan, all stricter than the letter, never looser (the same
 * stance as the exam calibration):
 *  - A swap reading that Azure could not assess, or whose swapped word came back
 *    Clear / Almost / unknown, is a MISS (the learner is told nothing useful).
 *    It stays in the denominator; it is listed so a recording that was simply
 *    unusable can be re-made before the result is read.
 *  - A correct reading's "Not heard" (Azure says the word was skipped) counts as
 *    a false flag like a false "Practise" does. The plan-letter figure (Practise
 *    only) is printed beside it.
 *  - A group needs at least `minGroupSentences` assessed sentences to be judged,
 *    and the verdict needs at least one accented speaker other than the owner.
 *    Fewer is "incomplete", never a pass.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeWord } from '../../src/domain/examPronunciation/fairness';
import type { PronunciationAssessment } from '../../src/domain/pronunciation/types';
import { tokenizeSentence } from '../../src/domain/pronunciation/lab/textFeatures';
import { LAB_THRESHOLDS, LAB_THRESHOLDS_VERSION } from '../../src/domain/pronunciation/lab/thresholds';
import { buildLabTake, type LabTake, type WordThresholds } from '../../src/domain/pronunciation/lab/wordStates';
import type { LabWordState } from '../../src/domain/pronunciation/lab/types';
import type { ClipKind, SpeakerKind } from './plan';

export const LAB_CALIBRATION_CRITERIA = {
  /** Share of swapped words that must land in Practise / Not heard. */
  detectionMin: 0.8,
  /** Swap readings needed before detection can be judged (the plan's 20 sentences). */
  minSwapReadings: 20,
  /** False flags allowed per sentence of correct reading (1 per 20). */
  maxFalsePerSentence: 1 / 20,
  /** Assessed sentences a speaker group needs before it can be judged. */
  minGroupSentences: 20,
  /** Accented speakers (not the owner) that must be judged. */
  minAccentedGroups: 1,
} as const;

export interface LabCalibrationFixture {
  fixtureFormat: 1;
  recordedAt?: string;
  assessorVersion?: string;
  clip: {
    clipId: string;
    kind: ClipKind;
    speaker: string;
    speakerKind: SpeakerKind;
    targetText: string;
    sentenceId?: string | null;
    swapWord?: string | null;
    swapTo?: string | null;
  };
  response: PronunciationAssessment;
}

export type SwapOutcome = 'caught' | 'told-clear' | 'told-almost' | 'unknown' | 'not-assessed';

export interface SwapFinding {
  clipId: string;
  sentenceId: string | null;
  swapWord: string;
  swapTo: string;
  outcome: SwapOutcome;
  state: LabWordState | null;
  /** Azure's word score for the swapped word, when it gave one (diagnosis only; the Lab never shows it). */
  accuracy: number | null;
  /** Other words of the sentence the Lab flagged in this reading (information only). */
  otherFlagged: string[];
}

export interface FalseFlag {
  clipId: string;
  word: string;
  state: 'practise' | 'missed';
  accuracy: number | null;
}

export interface GroupFinding {
  speaker: string;
  speakerKind: SpeakerKind;
  sentences: number;
  assessed: number;
  notAssessed: string[];
  /** Words flagged Practise or Not heard in a correct reading. */
  falseFlags: FalseFlag[];
  /** The plan-letter figure: Practise only. */
  falsePractise: number;
  /** falseFlags per 20 assessed sentences. */
  per20: number;
  verdict: 'pass' | 'fail' | 'too-few';
}

export type Verdict = 'pass' | 'fail' | 'incomplete';

export interface SweepRow {
  clearMin: number;
  almostMin: number;
  isCurrent: boolean;
  detection: number;
  /** Worst false flags per 20 sentences over the judged groups, or null when none can be judged. */
  worstFalsePer20: number | null;
}

export interface LabCalibrationResult {
  thresholdsVersion: string;
  thresholds: WordThresholds;
  verdict: Verdict;
  reasons: string[];
  detection: {
    swapReadings: number;
    caught: number;
    rate: number;
    pass: boolean;
    findings: SwapFinding[];
  };
  groups: GroupFinding[];
  fairnessPass: boolean;
}

const FLAGGED: ReadonlySet<LabWordState> = new Set(['practise', 'missed']);

function takeOf(fixture: LabCalibrationFixture, thresholds: WordThresholds): LabTake {
  // The probe records the scripted result as the API returns it; be explicit about the mode.
  const response: PronunciationAssessment = { ...fixture.response, mode: fixture.response.mode ?? 'scripted' };
  return buildLabTake(fixture.clip.targetText, response, thresholds);
}

function swapFinding(fixture: LabCalibrationFixture, take: LabTake): SwapFinding {
  const { clip } = fixture;
  const swapWord = clip.swapWord ?? '';
  const base = { clipId: clip.clipId, sentenceId: clip.sentenceId ?? null, swapWord, swapTo: clip.swapTo ?? '' };
  if (take.refused !== null) return { ...base, outcome: 'not-assessed', state: null, accuracy: null, otherFlagged: [] };

  const tokens = tokenizeSentence(clip.targetText);
  const index = tokens.findIndex((t) => t.norm === normalizeWord(swapWord));
  const words = take.items.filter((i) => i.kind === 'word');
  const item = index >= 0 ? words.find((w) => w.tokenIndex === index) : undefined;
  if (!item) return { ...base, outcome: 'unknown', state: null, accuracy: null, otherFlagged: [] };

  const outcome: SwapOutcome =
    item.state === 'practise' || item.state === 'missed' ? 'caught'
    : item.state === 'clear' ? 'told-clear'
    : item.state === 'almost' ? 'told-almost'
    : 'unknown';
  const otherFlagged = words.filter((w) => w.tokenIndex !== index && FLAGGED.has(w.state)).map((w) => w.text);
  return { ...base, outcome, state: item.state, accuracy: item.accuracy, otherFlagged };
}

function groupFindings(fixtures: readonly LabCalibrationFixture[], thresholds: WordThresholds): GroupFinding[] {
  const readings = fixtures.filter((f) => f.clip.kind !== 'detect-swap');
  const bySpeaker = new Map<string, LabCalibrationFixture[]>();
  for (const f of readings) bySpeaker.set(f.clip.speaker, [...(bySpeaker.get(f.clip.speaker) ?? []), f]);

  const groups: GroupFinding[] = [];
  for (const [speaker, list] of bySpeaker) {
    const falseFlags: FalseFlag[] = [];
    const notAssessed: string[] = [];
    let assessed = 0;
    for (const f of list) {
      const take = takeOf(f, thresholds);
      if (take.refused !== null) {
        notAssessed.push(f.clip.clipId);
        continue;
      }
      assessed += 1;
      for (const item of take.items) {
        if (item.kind === 'word' && (item.state === 'practise' || item.state === 'missed')) {
          falseFlags.push({ clipId: f.clip.clipId, word: item.text, state: item.state, accuracy: item.accuracy });
        }
      }
    }
    const per20 = assessed === 0 ? 0 : (falseFlags.length / assessed) * 20;
    const verdict: GroupFinding['verdict'] =
      assessed < LAB_CALIBRATION_CRITERIA.minGroupSentences ? 'too-few'
      : falseFlags.length / assessed <= LAB_CALIBRATION_CRITERIA.maxFalsePerSentence ? 'pass'
      : 'fail';
    groups.push({
      speaker,
      speakerKind: list[0].clip.speakerKind,
      sentences: list.length,
      assessed,
      notAssessed,
      falseFlags,
      falsePractise: falseFlags.filter((x) => x.state === 'practise').length,
      per20: Math.round(per20 * 100) / 100,
      verdict,
    });
  }
  return groups.sort((a, b) => a.speaker.localeCompare(b.speaker));
}

function detectionFindings(fixtures: readonly LabCalibrationFixture[], thresholds: WordThresholds): SwapFinding[] {
  return fixtures
    .filter((f) => f.clip.kind === 'detect-swap')
    .map((f) => swapFinding(f, takeOf(f, thresholds)))
    .sort((a, b) => a.clipId.localeCompare(b.clipId));
}

export function analyseLabCalibration(
  fixtures: readonly LabCalibrationFixture[],
  thresholds: WordThresholds = LAB_THRESHOLDS.word,
): LabCalibrationResult {
  const C = LAB_CALIBRATION_CRITERIA;
  const findings = detectionFindings(fixtures, thresholds);
  const caught = findings.filter((f) => f.outcome === 'caught').length;
  const rate = findings.length === 0 ? 0 : caught / findings.length;
  const detectionPass = findings.length >= C.minSwapReadings && rate >= C.detectionMin;
  const groups = groupFindings(fixtures, thresholds);

  const reasons: string[] = [];
  let definiteFail = false;
  let incomplete = false;

  if (findings.length < C.minSwapReadings) {
    incomplete = true;
    reasons.push(`Detection: ${findings.length} swap readings recorded, ${C.minSwapReadings} needed.`);
  } else if (rate < C.detectionMin) {
    definiteFail = true;
    reasons.push(`Detection: only ${caught} of ${findings.length} swapped words were marked Practise / Not heard (${pct(rate)}; ${pct(C.detectionMin)} needed).`);
  }

  for (const g of groups) {
    if (g.verdict === 'fail') {
      definiteFail = true;
      reasons.push(`Fairness: ${g.speaker} had ${g.falseFlags.length} false flags in ${g.assessed} correct sentences (${g.per20} per 20; 1 per 20 allowed).`);
    }
  }
  const judged = groups.filter((g) => g.verdict !== 'too-few');
  const owner = groups.find((g) => g.speakerKind === 'owner');
  if (!owner || owner.verdict === 'too-few') {
    incomplete = true;
    reasons.push(`Fairness: your own correct readings need ${C.minGroupSentences} assessed sentences${owner ? ` (${owner.assessed} so far)` : ''}.`);
  }
  const accentedJudged = judged.filter((g) => g.speakerKind === 'accented');
  if (accentedJudged.length < C.minAccentedGroups) {
    incomplete = true;
    reasons.push(`Fairness: at least ${C.minAccentedGroups} accented speaker other than you must read ${C.minGroupSentences} sentences correctly (${accentedJudged.length} judged so far).`);
  }
  for (const g of groups.filter((x) => x.verdict === 'too-few' && x.speakerKind !== 'owner')) {
    reasons.push(`Note: ${g.speaker} has only ${g.assessed} assessed sentences (${g.sentences} recorded), too few to judge — not counted.`);
  }
  const fairnessPass = !groups.some((g) => g.verdict === 'fail') && accentedJudged.length >= C.minAccentedGroups && !!owner && owner.verdict === 'pass';

  const verdict: Verdict = definiteFail ? 'fail' : incomplete ? 'incomplete' : 'pass';
  if (verdict === 'pass') reasons.push('Both criteria are met on the recordings supplied.');
  return {
    thresholdsVersion: LAB_THRESHOLDS_VERSION,
    thresholds,
    verdict,
    reasons,
    detection: { swapReadings: findings.length, caught, rate, pass: detectionPass, findings },
    groups,
    fairnessPass,
  };
}

/**
 * What the same recordings would give under other cut-offs. DIAGNOSTIC ONLY:
 * choosing cut-offs by looking at this table tunes them to these recordings.
 * Any change to `LAB_THRESHOLDS` is a `LAB_THRESHOLDS_VERSION` bump, a
 * `verification-log.md` entry, and should be confirmed on recordings that were
 * not used to choose it.
 */
export function sweepThresholds(fixtures: readonly LabCalibrationFixture[]): SweepRow[] {
  const rows: SweepRow[] = [];
  for (const clearMin of [70, 75, 80, 85, 90]) {
    for (const almostMin of [40, 50, 60, 70]) {
      if (almostMin >= clearMin) continue;
      const t = { clearMin, almostMin };
      const findings = detectionFindings(fixtures, t);
      const judged = groupFindings(fixtures, t).filter((g) => g.verdict !== 'too-few');
      rows.push({
        clearMin,
        almostMin,
        isCurrent: clearMin === LAB_THRESHOLDS.word.clearMin && almostMin === LAB_THRESHOLDS.word.almostMin,
        detection: findings.length === 0 ? 0 : findings.filter((f) => f.outcome === 'caught').length / findings.length,
        worstFalsePer20: judged.length === 0 ? null : Math.max(...judged.map((g) => g.per20)),
      });
    }
  }
  return rows;
}

const pct = (x: number) => `${Math.round(x * 100)} %`;

/** Reads every fixture file in `dir` (non-recursive). A missing folder is no fixtures, not an error. */
export function loadLabCalibrationFixtures(dir: string): LabCalibrationFixture[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => n.endsWith('.json'))
    .sort()
    .map((n) => JSON.parse(readFileSync(join(dir, n), 'utf8')) as LabCalibrationFixture)
    .filter((f) => f.fixtureFormat === 1);
}

/** The human-readable report. */
export function formatLabCalibrationReport(result: LabCalibrationResult, sweep: readonly SweepRow[] = []): string {
  const out: string[] = [];
  const t = result.thresholds;
  out.push(`Pronunciation Lab calibration — ${result.thresholdsVersion} (Clear ≥ ${t.clearMin}, Almost ≥ ${t.almostMin})`);
  out.push(`VERDICT: ${result.verdict.toUpperCase()}`);
  for (const r of result.reasons) out.push(`  • ${r}`);

  const d = result.detection;
  out.push('', `Detection — ${d.caught} of ${d.swapReadings} swapped words marked Practise / Not heard (${pct(d.rate)}; need ${pct(LAB_CALIBRATION_CRITERIA.detectionMin)})`);
  for (const f of d.findings) {
    const acc = f.accuracy === null ? '' : ` (Azure word score ${Math.round(f.accuracy)})`;
    const extra = f.otherFlagged.length ? `; also flagged: ${f.otherFlagged.join(', ')}` : '';
    out.push(`  ${f.outcome === 'caught' ? '✓' : '✗'} ${f.clipId.padEnd(10)} ${f.swapWord} → ${f.swapTo}: ${f.outcome}${f.state ? ` [${f.state}]` : ''}${acc}${extra}`);
  }

  out.push('', 'Fairness — correct readings flagged by mistake (Practise or Not heard)');
  for (const g of result.groups) {
    out.push(`  ${g.verdict.toUpperCase().padEnd(8)} ${g.speaker} (${g.speakerKind}): ${g.falseFlags.length} flags in ${g.assessed} assessed sentences = ${g.per20} per 20 (Practise only: ${g.falsePractise})`);
    for (const x of g.falseFlags) out.push(`           ${x.clipId}: "${x.word}" ${x.state}${x.accuracy === null ? '' : ` (score ${Math.round(x.accuracy)})`}`);
    if (g.notAssessed.length) out.push(`           not assessed: ${g.notAssessed.join(', ')}`);
  }

  if (sweep.length) {
    out.push('', 'What other cut-offs would have given on THESE recordings (diagnostic only — see the warning in analyse.ts):');
    out.push('  Clear≥  Almost≥  detection  worst false flags per 20');
    for (const r of sweep) {
      out.push(`  ${String(r.clearMin).padEnd(7)} ${String(r.almostMin).padEnd(8)} ${pct(r.detection).padEnd(10)} ${r.worstFalsePer20 === null ? 'n/a' : r.worstFalsePer20}${r.isCurrent ? '   ← current' : ''}`);
    }
    out.push('  A change to the cut-offs is a LAB_THRESHOLDS_VERSION bump + a verification-log.md entry, and is only trustworthy if confirmed on recordings not used to choose it.');
  }
  return out.join('\n');
}
