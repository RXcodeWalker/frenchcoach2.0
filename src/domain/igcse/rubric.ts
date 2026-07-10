/**
 * Cambridge IGCSE French 0520 Paper 3 Speaking mark scheme — data only.
 * Primary source: 0520/03/TN/M/J/24 (May/June 2024 Teacher/Examiner Notes).
 * No scoring logic. No generic rubric/board abstraction (CLAUDE.md hard-constraint #1).
 */

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
} from './canonical';
import type { SourceClassification } from './unsourced';
import { UNSOURCED_ALLOWLIST } from './unsourced';

export type { SourceClassification, UnsourcedItem } from './unsourced';
export { KNOWN_SERIES, UNSOURCED_ALLOWLIST, UNSOURCED_ALLOWLIST_IDS } from './unsourced';
export * from './canonical';

export interface SourceRef {
  document: string;
  documentCode: string;
  series: string;
  page: number;
  classification: SourceClassification;
}

export interface RolePlayMark {
  mark: 0 | 1 | 2;
  descriptor: readonly string[];
  source: SourceRef;
}

export type BandLabel = 'Poor' | 'Weak' | 'Satisfactory' | 'Good' | 'Very good';

export interface MarkBand {
  min: number;
  max: number;
  label: BandLabel | null;
  descriptor: readonly string[];
  source: SourceRef;
}

export interface MarkingPrinciple {
  id: string;
  scope: 'global' | 'rolePlay' | 'topicConversation';
  text: string;
  source: SourceRef;
}

const TN_DOCUMENT =
  'Cambridge IGCSE French 0520 Paper 3 Speaking — Instructions for teachers/examiners';
const TN_CODE = '0520/03/TN/M/J/24';
const TN_SERIES = 'M/J/24';

function exactSource(page: number): SourceRef {
  return {
    document: TN_DOCUMENT,
    documentCode: TN_CODE,
    series: TN_SERIES,
    page,
    classification: 'exact',
  };
}

// KNOWN GAP: syllabus cycle (2025–2027) and qualification weighting (25%) are not stated
// in 0520/03/TN/M/J/24. Resolve via 0520 syllabus document (2025–2027) before adding fields.
// See UNSOURCED_ALLOWLIST ids: weight-25-percent, reconfirmation-2025-2027.
export const SYLLABUS_META = {
  syllabusCode: '0520',
  component: '03',
  paper: 'Paper 3 Speaking',
  sourceSeries: TN_SERIES,
} as const;

export const ROLE_PLAY = {
  table: 'A',
  name: 'Role play',
  tasks: 5,
  marksPerResponse: 2,
  maxMarks: 10,
  marks: [
    { mark: 2, descriptor: RP_MARK_2, source: exactSource(10) },
    { mark: 1, descriptor: RP_MARK_1, source: exactSource(10) },
    { mark: 0, descriptor: RP_MARK_0, source: exactSource(10) },
  ],
} as const satisfies {
  table: 'A';
  name: string;
  tasks: number;
  marksPerResponse: number;
  maxMarks: number;
  marks: readonly RolePlayMark[];
};

export const COMMUNICATION = {
  table: 'B',
  name: 'Communication',
  combinedAcross: 'both topic conversations',
  maxMarks: 15,
  cefrReference: CEFR_REFERENCE,
  awardInstruction: AWARD_COMMUNICATION,
  bands: [
    { min: 13, max: 15, label: 'Very good', descriptor: COMM_13_15, source: exactSource(11) },
    { min: 10, max: 12, label: 'Good', descriptor: COMM_10_12, source: exactSource(11) },
    { min: 7, max: 9, label: 'Satisfactory', descriptor: COMM_7_9, source: exactSource(11) },
    { min: 4, max: 6, label: 'Weak', descriptor: COMM_4_6, source: exactSource(11) },
    { min: 1, max: 3, label: 'Poor', descriptor: COMM_1_3, source: exactSource(11) },
    { min: 0, max: 0, label: null, descriptor: COMM_0, source: exactSource(11) },
  ],
} as const satisfies {
  table: 'B';
  name: string;
  combinedAcross: string;
  maxMarks: number;
  cefrReference: string;
  awardInstruction: string;
  bands: readonly MarkBand[];
};

export const QUALITY_OF_LANGUAGE = {
  table: 'C',
  name: 'Quality of Language',
  combinedAcross: 'both topic conversations',
  maxMarks: 15,
  cefrReference: CEFR_REFERENCE,
  awardInstruction: AWARD_COMMUNICATION,
  bands: [
    { min: 13, max: 15, label: 'Very good', descriptor: QOL_13_15, source: exactSource(12) },
    { min: 10, max: 12, label: 'Good', descriptor: QOL_10_12, source: exactSource(12) },
    { min: 7, max: 9, label: 'Satisfactory', descriptor: QOL_7_9, source: exactSource(12) },
    { min: 4, max: 6, label: 'Weak', descriptor: QOL_4_6, source: exactSource(12) },
    { min: 1, max: 3, label: 'Poor', descriptor: QOL_1_3, source: exactSource(12) },
    { min: 0, max: 0, label: null, descriptor: QOL_0, source: exactSource(12) },
  ],
} as const satisfies {
  table: 'C';
  name: string;
  combinedAcross: string;
  maxMarks: number;
  cefrReference: string;
  awardInstruction: string;
  bands: readonly MarkBand[];
};

export const MARKING_PRINCIPLES: readonly MarkingPrinciple[] = [
  {
    id: 'positive-marking',
    scope: 'global',
    text: PRINCIPLE_POSITIVE_MARKING,
    source: exactSource(10),
  },
  {
    id: 'rp-apply-separately',
    scope: 'rolePlay',
    text: PRINCIPLE_RP_APPLY_SEPARATELY,
    source: exactSource(10),
  },
  {
    id: 'rp-two-marks',
    scope: 'rolePlay',
    text: PRINCIPLE_RP_TWO_MARKS,
    source: exactSource(10),
  },
  {
    id: 'rp-best-fit',
    scope: 'rolePlay',
    text: PRINCIPLE_RP_BEST_FIT,
    source: exactSource(10),
  },
  {
    id: 'rp-concise-response',
    scope: 'rolePlay',
    text: PRINCIPLE_RP_CONCISE,
    source: exactSource(6),
  },
  {
    id: 'tc-best-fit',
    scope: 'topicConversation',
    text: PRINCIPLE_TC_BEST_FIT,
    source: exactSource(11),
  },
  {
    id: 'tc-convincingly',
    scope: 'topicConversation',
    text: PRINCIPLE_TC_CONVINCINGLY,
    source: exactSource(11),
  },
  {
    id: 'tc-adequately',
    scope: 'topicConversation',
    text: PRINCIPLE_TC_ADEQUATELY,
    source: exactSource(11),
  },
  {
    id: 'tc-just',
    scope: 'topicConversation',
    text: PRINCIPLE_TC_JUST,
    source: exactSource(11),
  },
];

export const TOTAL_MARKS = 40 as const;

export const TOTAL_MARKS_SOURCE = exactSource(10);

/**
 * S4: bump whenever a descriptor, band, mark, or principle below changes in a
 * way that affects output — paired with RUBRIC_CONTENT_HASH in
 * __tests__/version-pin.test.ts, which fails loudly if the two drift apart.
 */
export const RUBRIC_VERSION = 'rubric-v0.1';

export const IGCSE_0520_SPEAKING = deepFreeze({
  meta: SYLLABUS_META,
  rolePlay: ROLE_PLAY,
  communication: COMMUNICATION,
  qualityOfLanguage: QUALITY_OF_LANGUAGE,
  principles: MARKING_PRINCIPLES,
  totalMarks: TOTAL_MARKS,
  totalMarksSource: TOTAL_MARKS_SOURCE,
  unsourced: UNSOURCED_ALLOWLIST,
});

function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  for (const value of Object.values(obj)) {
    if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }
  return obj;
}

/** @internal Exported for tests — this module must not export scoring functions. */
export const _EXPORT_KIND = 'data-only' as const;
