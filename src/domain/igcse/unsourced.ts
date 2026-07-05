/**
 * Items not traceable to 0520/03/TN/M/J/24.
 * The test suite asserts this allowlist equals exactly these four entries.
 * Promoting any item to `exact` without updating this list fails the build.
 */

export type SourceClassification = 'exact' | 'paraphrase' | 'inferred' | 'unsupported';

export interface UnsourcedItem {
  id: string;
  statement: string;
  classification: Exclude<SourceClassification, 'exact' | 'paraphrase'>;
  resolvedBy: string;
}

export const UNSOURCED_ALLOWLIST = [
  {
    id: 'native-speaker-standard',
    statement: 'Native-speaker standard is not required for full marks.',
    classification: 'unsupported',
    resolvedBy: 'Cambridge IGCSE French Speaking Test Training Handbook',
  },
  {
    id: 'err-generosity',
    statement: 'When in doubt, err on the side of generosity.',
    classification: 'unsupported',
    resolvedBy: 'Cambridge IGCSE French Speaking Test Training Handbook',
  },
  {
    id: 'weight-25-percent',
    statement: 'Paper 3 Speaking is 25% of the qualification.',
    classification: 'unsupported',
    resolvedBy: 'Cambridge IGCSE French 0520 syllabus document (2025–2027)',
  },
  {
    id: 'reconfirmation-2025-2027',
    statement:
      'Descriptor text verified for M/J/24; reconfirm against a 2025–2027-series 0520/03 TN booklet before treating as cycle-validated.',
    classification: 'inferred',
    resolvedBy: '0520/03 Teacher/Examiner Notes booklet, 2025–2027 series',
  },
] as const satisfies readonly UnsourcedItem[];

export const UNSOURCED_ALLOWLIST_IDS = UNSOURCED_ALLOWLIST.map((item) => item.id);

/** Series cited by `exact` sources. Add 2025–2027 booklet series here after reconfirmation. */
export const KNOWN_SERIES = ['M/J/24'] as const;

export type KnownSeries = (typeof KNOWN_SERIES)[number];

/** Pattern for 2025–2027 booklet series codes once reconfirmed. */
export const SERIES_2025_2027 = /^S\d{2}\/2[5-7]|M\/J\/2[5-7]|O\/N\/2[5-7]/;
