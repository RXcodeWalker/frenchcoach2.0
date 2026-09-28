/**
 * Machine-readable mirror of docs/guides/corpus-matrix.md's matrix table.
 * Source of truth is the doc; this module exists only so the skeleton script
 * doesn't hand-parse markdown. Keep both in sync by hand — the doc is
 * prose-first for human authors, this is data-first for tooling.
 */

import type { ExaminerRegister, SubTopic, TopicArea } from '../../src/data/exam/bank/types';

export interface CorpusMatrixRow {
  setNumber: number; // 1..10
  questionSetId: string;
  topic1Area: TopicArea;
  topic1SubTopic: SubTopic;
  topic2Area: TopicArea;
  topic2SubTopic: SubTopic;
  rolePlayArea: TopicArea;
  archetype: string;
  examinerRegister: ExaminerRegister;
  /** 1-based task/question numbers that are two-part (rp3–rp5, Q3–Q5 only). */
  rolePlayTwoPart: number[];
  topic1TwoPart: number[];
  topic2TwoPart: number[];
}

const NATURE: SubTopic = 'The natural world, the environment, the climate and the weather';

export const CORPUS_MATRIX: CorpusMatrixRow[] = [
  { setNumber: 1, questionSetId: 'original-practice-001', topic1Area: 'A', topic1SubTopic: 'Travel and transport', topic2Area: 'C', topic2SubTopic: NATURE, rolePlayArea: 'A', archetype: 'a missed train: buying a new ticket at the station', examinerRegister: 'vous', rolePlayTwoPart: [3, 4, 5], topic1TwoPart: [3, 5], topic2TwoPart: [4, 5] },
  { setNumber: 2, questionSetId: 'original-practice-002', topic1Area: 'B', topic1SubTopic: 'In the home', topic2Area: 'C', topic2SubTopic: 'Communications and technology', rolePlayArea: 'B', archetype: 'planning an outing with a French friend', examinerRegister: 'tu', rolePlayTwoPart: [3, 5], topic1TwoPart: [3, 4], topic2TwoPart: [3, 5] },
  { setNumber: 3, questionSetId: 'original-practice-003', topic1Area: 'B', topic1SubTopic: 'Clothes and accessories', topic2Area: 'D', topic2SubTopic: 'Education', rolePlayArea: 'C', archetype: 'asking at a tourist office', examinerRegister: 'vous', rolePlayTwoPart: [4, 5], topic1TwoPart: [4, 5], topic2TwoPart: [3, 4] },
  { setNumber: 4, questionSetId: 'original-practice-004', topic1Area: 'A', topic1SubTopic: 'Food and drink', topic2Area: 'E', topic2SubTopic: 'Countries, nationalities and languages', rolePlayArea: 'D', archetype: 'first day of a work placement in a sports shop', examinerRegister: 'vous', rolePlayTwoPart: [3, 4, 5], topic1TwoPart: [3, 5], topic2TwoPart: [4] },
  { setNumber: 5, questionSetId: 'original-practice-005', topic1Area: 'B', topic1SubTopic: 'Self, family and friends', topic2Area: 'C', topic2SubTopic: 'The built environment', rolePlayArea: 'E', archetype: "a French friend's family celebration", examinerRegister: 'tu', rolePlayTwoPart: [3, 4], topic1TwoPart: [3, 4], topic2TwoPart: [3, 5] },
  { setNumber: 6, questionSetId: 'original-practice-006', topic1Area: 'A', topic1SubTopic: 'The human body and health', topic2Area: 'D', topic2SubTopic: 'Work', rolePlayArea: 'A', archetype: 'ordering a meal in a restaurant', examinerRegister: 'vous', rolePlayTwoPart: [3, 5], topic1TwoPart: [4, 5], topic2TwoPart: [3, 4] },
  { setNumber: 7, questionSetId: 'original-practice-007', topic1Area: 'B', topic1SubTopic: 'Leisure time', topic2Area: 'E', topic2SubTopic: 'Culture, customs, faiths and celebrations', rolePlayArea: 'B', archetype: 'shopping for clothes with a French friend', examinerRegister: 'tu', rolePlayTwoPart: [3, 4, 5], topic1TwoPart: [3, 5], topic2TwoPart: [4, 5] },
  { setNumber: 8, questionSetId: 'original-practice-008', topic1Area: 'A', topic1SubTopic: 'Food and drink', topic2Area: 'C', topic2SubTopic: 'People and places', rolePlayArea: 'C', archetype: 'a friend organising a park clean-up', examinerRegister: 'tu', rolePlayTwoPart: [4, 5], topic1TwoPart: [3, 4], topic2TwoPart: [3, 5] },
  { setNumber: 9, questionSetId: 'original-practice-009', topic1Area: 'B', topic1SubTopic: 'Self, family and friends', topic2Area: 'C', topic2SubTopic: NATURE, rolePlayArea: 'D', archetype: 'first day at a French school, with a classmate', examinerRegister: 'tu', rolePlayTwoPart: [3, 4], topic1TwoPart: [4, 5], topic2TwoPart: [3, 4] },
  { setNumber: 10, questionSetId: 'original-practice-010', topic1Area: 'B', topic1SubTopic: 'Leisure time', topic2Area: 'D', topic2SubTopic: 'Work', rolePlayArea: 'E', archetype: 'a guided tour on holiday in Quebec', examinerRegister: 'vous', rolePlayTwoPart: [3, 4, 5], topic1TwoPart: [3, 5], topic2TwoPart: [4, 5] },
];

export function matrixRowForSetNumber(n: number): CorpusMatrixRow | undefined {
  return CORPUS_MATRIX.find((r) => r.setNumber === n);
}
