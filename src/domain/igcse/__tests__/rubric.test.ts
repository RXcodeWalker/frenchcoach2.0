import { describe, it, expect } from 'vitest';
import * as rubricModule from '../rubric';
import {
  AWARD_COMMUNICATION,
  CEFR_REFERENCE,
  COMM_0,
  COMM_1_3,
  COMM_4_6,
  COMM_7_9,
  COMM_10_12,
  COMM_13_15,
  PRINCIPLE_POSITIVE_MARKING,
  PRINCIPLE_RP_APPLY_SEPARATELY,
  PRINCIPLE_RP_BEST_FIT,
  PRINCIPLE_RP_CONCISE,
  PRINCIPLE_RP_TWO_MARKS,
  PRINCIPLE_TC_ADEQUATELY,
  PRINCIPLE_TC_BEST_FIT,
  PRINCIPLE_TC_CONVINCINGLY,
  PRINCIPLE_TC_JUST,
  QOL_0,
  QOL_1_3,
  QOL_4_6,
  QOL_7_9,
  QOL_10_12,
  QOL_13_15,
  RP_MARK_0,
  RP_MARK_1,
  RP_MARK_2,
} from '../canonical';
import {
  KNOWN_SERIES,
  SERIES_2025_2027,
  UNSOURCED_ALLOWLIST,
  UNSOURCED_ALLOWLIST_IDS,
} from '../unsourced';
import type { MarkBand, MarkingPrinciple, RolePlayMark, SourceRef } from '../rubric';
import {
  COMMUNICATION,
  IGCSE_0520_SPEAKING,
  MARKING_PRINCIPLES,
  QUALITY_OF_LANGUAGE,
  ROLE_PLAY,
  TOTAL_MARKS,
} from '../rubric';

const EXPECTED_UNSOURCED_IDS = [
  'native-speaker-standard',
  'err-generosity',
  'weight-25-percent',
  'reconfirmation-2025-2027',
] as const;

const LABELED_BANDS = ['Very good', 'Good', 'Satisfactory', 'Weak', 'Poor'] as const;

/** Maps frozen canonical tuples to the rubric descriptor arrays they must match byte-for-byte. */
const CANONICAL_DESCRIPTOR_PAIRS: ReadonlyArray<{
  canonical: readonly string[];
  actual: readonly string[];
}> = [
  { canonical: RP_MARK_2, actual: ROLE_PLAY.marks.find((m) => m.mark === 2)!.descriptor },
  { canonical: RP_MARK_1, actual: ROLE_PLAY.marks.find((m) => m.mark === 1)!.descriptor },
  { canonical: RP_MARK_0, actual: ROLE_PLAY.marks.find((m) => m.mark === 0)!.descriptor },
  { canonical: COMM_13_15, actual: COMMUNICATION.bands[0].descriptor },
  { canonical: COMM_10_12, actual: COMMUNICATION.bands[1].descriptor },
  { canonical: COMM_7_9, actual: COMMUNICATION.bands[2].descriptor },
  { canonical: COMM_4_6, actual: COMMUNICATION.bands[3].descriptor },
  { canonical: COMM_1_3, actual: COMMUNICATION.bands[4].descriptor },
  { canonical: COMM_0, actual: COMMUNICATION.bands[5].descriptor },
  { canonical: QOL_13_15, actual: QUALITY_OF_LANGUAGE.bands[0].descriptor },
  { canonical: QOL_10_12, actual: QUALITY_OF_LANGUAGE.bands[1].descriptor },
  { canonical: QOL_7_9, actual: QUALITY_OF_LANGUAGE.bands[2].descriptor },
  { canonical: QOL_4_6, actual: QUALITY_OF_LANGUAGE.bands[3].descriptor },
  { canonical: QOL_1_3, actual: QUALITY_OF_LANGUAGE.bands[4].descriptor },
  { canonical: QOL_0, actual: QUALITY_OF_LANGUAGE.bands[5].descriptor },
];

const CANONICAL_PRINCIPLE_PAIRS: ReadonlyArray<{
  canonical: string;
  principle: MarkingPrinciple;
}> = [
  { canonical: PRINCIPLE_POSITIVE_MARKING, principle: MARKING_PRINCIPLES.find((p) => p.id === 'positive-marking')! },
  { canonical: PRINCIPLE_RP_APPLY_SEPARATELY, principle: MARKING_PRINCIPLES.find((p) => p.id === 'rp-apply-separately')! },
  { canonical: PRINCIPLE_RP_TWO_MARKS, principle: MARKING_PRINCIPLES.find((p) => p.id === 'rp-two-marks')! },
  { canonical: PRINCIPLE_RP_BEST_FIT, principle: MARKING_PRINCIPLES.find((p) => p.id === 'rp-best-fit')! },
  { canonical: PRINCIPLE_RP_CONCISE, principle: MARKING_PRINCIPLES.find((p) => p.id === 'rp-concise-response')! },
  { canonical: PRINCIPLE_TC_BEST_FIT, principle: MARKING_PRINCIPLES.find((p) => p.id === 'tc-best-fit')! },
  { canonical: PRINCIPLE_TC_CONVINCINGLY, principle: MARKING_PRINCIPLES.find((p) => p.id === 'tc-convincingly')! },
  { canonical: PRINCIPLE_TC_ADEQUATELY, principle: MARKING_PRINCIPLES.find((p) => p.id === 'tc-adequately')! },
  { canonical: PRINCIPLE_TC_JUST, principle: MARKING_PRINCIPLES.find((p) => p.id === 'tc-just')! },
];

function assertBandCoverage(bands: readonly MarkBand[]): void {
  const sorted = [...bands].sort((a, b) => a.min - b.min);
  expect(sorted[0].min).toBe(0);
  expect(sorted[sorted.length - 1].max).toBe(15);

  for (let i = 0; i < sorted.length; i++) {
    const band = sorted[i];
    expect(band.min).toBeLessThanOrEqual(band.max);
    if (i > 0) {
      expect(band.min).toBe(sorted[i - 1].max + 1);
    }
  }
}

function collectExactSources(): SourceRef[] {
  const sources: SourceRef[] = [];

  for (const mark of ROLE_PLAY.marks) {
    sources.push(mark.source);
  }
  for (const band of COMMUNICATION.bands) {
    sources.push(band.source);
  }
  for (const band of QUALITY_OF_LANGUAGE.bands) {
    sources.push(band.source);
  }
  for (const principle of MARKING_PRINCIPLES) {
    sources.push(principle.source);
  }
  sources.push(IGCSE_0520_SPEAKING.totalMarksSource);

  return sources.filter((s) => s.classification === 'exact');
}

function has2025SeriesCitation(seriesList: readonly string[]): boolean {
  return seriesList.some(
    (series) => SERIES_2025_2027.test(series) || (KNOWN_SERIES as readonly string[]).some((k) => k !== 'M/J/24' && k === series),
  );
}

describe('IGCSE_0520_SPEAKING rubric', () => {
  it('covers Communication bands 0–15 contiguously', () => {
    assertBandCoverage(COMMUNICATION.bands);
  });

  it('covers Quality of Language bands 0–15 contiguously', () => {
    assertBandCoverage(QUALITY_OF_LANGUAGE.bands);
  });

  it('defines role play as 5 tasks × 2 marks = 10', () => {
    expect(ROLE_PLAY.tasks).toBe(5);
    expect(ROLE_PLAY.marksPerResponse).toBe(2);
    expect(ROLE_PLAY.marks.map((m: RolePlayMark) => m.mark).sort()).toEqual([0, 1, 2]);
    expect(ROLE_PLAY.tasks * ROLE_PLAY.marksPerResponse).toBe(ROLE_PLAY.maxMarks);
    expect(ROLE_PLAY.maxMarks).toBe(10);
  });

  it('sums component maxima to TOTAL_MARKS 40', () => {
    const sum =
      ROLE_PLAY.maxMarks + COMMUNICATION.maxMarks + QUALITY_OF_LANGUAGE.maxMarks;
    expect(sum).toBe(TOTAL_MARKS);
    expect(TOTAL_MARKS).toBe(40);
  });

  it('uses null (not empty string) for the 0-mark band label', () => {
    for (const bands of [COMMUNICATION.bands, QUALITY_OF_LANGUAGE.bands]) {
      const zeroBand = bands.find((b) => b.min === 0 && b.max === 0);
      expect(zeroBand).toBeDefined();
      expect(zeroBand!.label).toBeNull();
      expect(zeroBand!.label).not.toBe('');
    }
  });

  it('uses Cambridge band labels for marks ≥ 1 only', () => {
    for (const bands of [COMMUNICATION.bands, QUALITY_OF_LANGUAGE.bands]) {
      const labeled = bands.filter((b) => b.min >= 1);
      expect(labeled.map((b) => b.label)).toEqual([...LABELED_BANDS]);
      const uniqueLabels = new Set(labeled.map((b) => b.label));
      expect(uniqueLabels.size).toBe(labeled.length);
    }
  });

  it('byte-matches frozen canonical descriptor strings (anti-drift)', () => {
    for (const { canonical, actual } of CANONICAL_DESCRIPTOR_PAIRS) {
      expect([...actual]).toEqual([...canonical]);
    }
    expect(COMMUNICATION.cefrReference).toBe(CEFR_REFERENCE);
    expect(QUALITY_OF_LANGUAGE.cefrReference).toBe(CEFR_REFERENCE);
    expect(COMMUNICATION.awardInstruction).toBe(AWARD_COMMUNICATION);
    expect(QUALITY_OF_LANGUAGE.awardInstruction).toBe(AWARD_COMMUNICATION);
    for (const { canonical, principle } of CANONICAL_PRINCIPLE_PAIRS) {
      expect(principle.text).toBe(canonical);
    }
  });

  it('requires positive page numbers and KNOWN_SERIES for every exact source', () => {
    for (const source of collectExactSources()) {
      expect(source.page).toBeGreaterThan(0);
      expect(Number.isInteger(source.page)).toBe(true);
      expect(source.documentCode).toBe('0520/03/TN/M/J/24');
      expect((KNOWN_SERIES as readonly string[]).includes(source.series)).toBe(true);
    }
  });

  it('keeps the unsourced allowlist at exactly four tamper-proof entries', () => {
    expect(UNSOURCED_ALLOWLIST).toHaveLength(4);
    expect([...UNSOURCED_ALLOWLIST_IDS].sort()).toEqual([...EXPECTED_UNSOURCED_IDS].sort());
    expect(IGCSE_0520_SPEAKING.unsourced).toEqual(UNSOURCED_ALLOWLIST);

    const nonExact = UNSOURCED_ALLOWLIST.map((item) => item.id);
    expect(nonExact.sort()).toEqual([...EXPECTED_UNSOURCED_IDS].sort());
  });

  it('blocks reconfirmation removal until a 2025–2027 series is cited on descriptors', () => {
    const exactSeries = [...new Set(collectExactSources().map((s) => s.series))];
    const reconfirmed = has2025SeriesCitation(exactSeries);

    const stillOnAllowlist = UNSOURCED_ALLOWLIST_IDS.includes('reconfirmation-2025-2027');
    if (!reconfirmed) {
      expect(stillOnAllowlist).toBe(true);
    }
  });

  it('deep-freezes the composed rubric object', () => {
    expect(Object.isFrozen(IGCSE_0520_SPEAKING)).toBe(true);
    expect(Object.isFrozen(IGCSE_0520_SPEAKING.rolePlay)).toBe(true);
    expect(Object.isFrozen(IGCSE_0520_SPEAKING.communication.bands)).toBe(true);

    const before = IGCSE_0520_SPEAKING.totalMarks;
    try {
      // @ts-expect-error — intentional mutation attempt on frozen data
      IGCSE_0520_SPEAKING.totalMarks = 39;
    } catch {
      // strict mode may throw on freeze violation in some engines
    }
    expect(IGCSE_0520_SPEAKING.totalMarks).toBe(before);
  });

  it('exports data only — no scoring functions', () => {
    for (const [name, value] of Object.entries(rubricModule)) {
      expect(typeof value).not.toBe('function');
      if (name.startsWith('_')) continue;
      expect(name).not.toMatch(/compute|score|evaluate|resolve/i);
    }
    expect(rubricModule._EXPORT_KIND).toBe('data-only');
  });
});
