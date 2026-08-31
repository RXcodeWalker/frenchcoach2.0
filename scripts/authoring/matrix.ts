/**
 * Machine-readable mirror of docs/guides/corpus-matrix.md's "Authoritative
 * per-set topic assignment" table. Source of truth is the doc; this module
 * exists only so the skeleton/status scripts don't hand-parse markdown.
 * Keep both in sync by hand — the doc is prose-first for human authors, this
 * is data-first for tooling.
 */

export type TopicArea = 'A' | 'B' | 'C' | 'D' | 'E';

export type TimeFrameTemplateId = 'P0' | 'P1' | 'P2';

export interface TimeFrameTemplate {
  id: TimeFrameTemplateId;
  frames: readonly ['present' | 'past' | 'future', 'present' | 'past' | 'future', 'present' | 'past' | 'future', 'present' | 'past' | 'future' | 'conditional', 'present' | 'past' | 'future' | 'conditional'];
}

export const TIME_FRAME_TEMPLATES: Record<TimeFrameTemplateId, TimeFrameTemplate> = {
  P0: { id: 'P0', frames: ['present', 'present', 'past', 'present', 'future'] },
  P1: { id: 'P1', frames: ['present', 'past', 'present', 'future', 'conditional'] },
  P2: { id: 'P2', frames: ['present', 'future', 'past', 'conditional', 'present'] },
};

export interface CorpusMatrixRow {
  setNumber: number; // 2..10
  questionSetId: string;
  topic1Area: TopicArea;
  topic2Area: TopicArea;
  rolePlayArea: TopicArea;
  archetype: string;
  topic1Template: TimeFrameTemplateId;
  topic2Template: TimeFrameTemplateId;
  rareStructureTarget: string;
}

/** Rows 002-010; 001 (A+C, role-play A) already exists and is not regenerated. */
export const CORPUS_MATRIX: CorpusMatrixRow[] = [
  { setNumber: 2, questionSetId: 'original-practice-002', topic1Area: 'A', topic2Area: 'B', rolePlayArea: 'A', archetype: 'social arrangement', topic1Template: 'P1', topic2Template: 'P0', rareStructureTarget: 'imperfect' },
  { setNumber: 3, questionSetId: 'original-practice-003', topic1Area: 'A', topic2Area: 'D', rolePlayArea: 'D', archetype: 'work-experience enquiry', topic1Template: 'P0', topic2Template: 'P1', rareStructureTarget: 'negation' },
  { setNumber: 4, questionSetId: 'original-practice-004', topic1Area: 'A', topic2Area: 'E', rolePlayArea: 'E', archetype: 'travel disruption', topic1Template: 'P2', topic2Template: 'P0', rareStructureTarget: 'comparison' },
  { setNumber: 5, questionSetId: 'original-practice-005', topic1Area: 'B', topic2Area: 'C', rolePlayArea: 'B', archetype: 'appointment booking', topic1Template: 'P0', topic2Template: 'P2', rareStructureTarget: 'simple-future' },
  { setNumber: 6, questionSetId: 'original-practice-006', topic1Area: 'B', topic2Area: 'D', rolePlayArea: 'B', archetype: 'problem / complaint', topic1Template: 'P1', topic2Template: 'P2', rareStructureTarget: 'negation' },
  { setNumber: 7, questionSetId: 'original-practice-007', topic1Area: 'B', topic2Area: 'E', rolePlayArea: 'E', archetype: 'lost property abroad', topic1Template: 'P2', topic2Template: 'P1', rareStructureTarget: 'imperfect' },
  { setNumber: 8, questionSetId: 'original-practice-008', topic1Area: 'C', topic2Area: 'D', rolePlayArea: 'C', archetype: 'information request', topic1Template: 'P0', topic2Template: 'P1', rareStructureTarget: 'comparison' },
  { setNumber: 9, questionSetId: 'original-practice-009', topic1Area: 'C', topic2Area: 'E', rolePlayArea: 'C', archetype: 'service encounter', topic1Template: 'P1', topic2Template: 'P0', rareStructureTarget: 'simple-future' },
  { setNumber: 10, questionSetId: 'original-practice-010', topic1Area: 'D', topic2Area: 'E', rolePlayArea: 'D', archetype: 'reservation / booking', topic1Template: 'P2', topic2Template: 'P2', rareStructureTarget: 'conditional' },
];

export function matrixRowForSetNumber(n: number): CorpusMatrixRow | undefined {
  return CORPUS_MATRIX.find((r) => r.setNumber === n);
}
