/**
 * Emits a pre-tagged AuthoredQuestionSet skeleton for one corpus-matrix row —
 * ids, part, areas, sub-topics, examiner register and partsExpected slots all
 * filled in from docs/guides/corpus-matrix.md (mirrored in ./matrix.ts).
 * Authors fill in the French text (mainText/alternativeTexts/secondPartText/
 * titles/furtherQuestions), the expectedTimeFrame of Q3–Q5 (one past, one
 * future or conditional — content-authoring §8) and targetStructures — see
 * docs/guides/content-authoring.md.
 *
 *   npm run authoring:skeleton -- 002
 *
 * Writes backend/data/igcse/original-practice-002.json if it does not already
 * exist (refuses to overwrite authored work).
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { matrixRowForSetNumber } from './matrix';
import type { AuthoredQuestion, AuthoredQuestionSet, SubTopic } from '../../src/data/exam/bank/types';
import type { TimeFrame } from '../../src/domain/igcse/evidence/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'backend', 'data', 'igcse');

const TODO = 'TODO';

/** Q1–Q2 present; Q3 past, Q4 present (opinion), Q5 future — a starting point only: reorder per topic. */
const DEFAULT_FRAMES: readonly TimeFrame[] = ['present', 'present', 'past', 'present', 'future'];

function roleplayTaskSkeleton(index: number, twoPartNumbers: number[]): AuthoredQuestion {
  const id = `rp${index + 1}`;
  const twoPart = twoPartNumbers.includes(index + 1);
  return {
    questionId: id,
    part: 'rolePlay',
    mainText: TODO,
    alternativeTexts: [],
    partsExpected: twoPart ? 2 : 1,
    ...(twoPart ? { secondPartText: TODO } : {}),
  };
}

function topicQuestionSkeleton(
  topicNum: 1 | 2,
  index: number,
  area: string,
  subTopic: SubTopic,
  twoPartNumbers: number[],
): AuthoredQuestion {
  const id = `t${topicNum}q${index + 1}`;
  const requiresAlternative = index >= 2; // Q3-Q5; never Q1-Q2 (validator alternative-on-q1-q2)
  const twoPart = twoPartNumbers.includes(index + 1);
  return {
    questionId: id,
    part: `topic${topicNum}` as AuthoredQuestion['part'],
    mainText: TODO,
    // D9: an alternative keeps its main question's shape — one part per part.
    alternativeTexts: requiresAlternative ? (twoPart ? [TODO, TODO] : [TODO]) : [],
    topicArea: area as AuthoredQuestion['topicArea'],
    subTopic,
    difficulty: index === 0 ? 'foundation' : index === 4 ? 'higher' : 'core',
    targetStructures: ['present'],
    expectedTimeFrame: DEFAULT_FRAMES[index],
    partsExpected: twoPart ? 2 : 1,
    ...(twoPart ? { secondPartText: TODO } : {}),
  };
}

function buildSkeleton(setNumber: number): AuthoredQuestionSet {
  const row = matrixRowForSetNumber(setNumber);
  if (!row) {
    throw new Error(`No corpus-matrix row for set ${setNumber}. Valid: 1-10 (see docs/guides/corpus-matrix.md).`);
  }

  return {
    questionSetId: row.questionSetId,
    schemaVersion: 'question-bank-v1',
    provenance: 'original-practice',
    review: { status: 'draft', notes: `Author: ${TODO}. Originality check pending (content-authoring §0). Role play: ${row.archetype}.` },
    content: {
      rolePlay: {
        scenarioId: `rp-${row.questionSetId}`,
        topicArea: row.rolePlayArea,
        title: TODO,
        setup: TODO,
        examinerRegister: row.examinerRegister,
        tasks: Array.from({ length: 5 }, (_, i) => roleplayTaskSkeleton(i, row.rolePlayTwoPart)),
      },
      topic1: {
        topicArea: row.topic1Area,
        subTopic: row.topic1SubTopic,
        title: TODO,
        furtherQuestions: [TODO, TODO],
        questions: Array.from({ length: 5 }, (_, i) =>
          topicQuestionSkeleton(1, i, row.topic1Area, row.topic1SubTopic, row.topic1TwoPart),
        ),
      },
      topic2: {
        topicArea: row.topic2Area,
        subTopic: row.topic2SubTopic,
        title: TODO,
        furtherQuestions: [TODO, TODO],
        questions: Array.from({ length: 5 }, (_, i) =>
          topicQuestionSkeleton(2, i, row.topic2Area, row.topic2SubTopic, row.topic2TwoPart),
        ),
      },
    },
  };
}

function main(): void {
  const arg = process.argv[2];
  const setNumber = Number(arg);
  if (!arg || Number.isNaN(setNumber)) {
    console.error('Usage: npm run authoring:skeleton -- <NN>   (e.g. 002 or 2)');
    process.exit(1);
  }

  const skeleton = buildSkeleton(setNumber);
  const filename = `${skeleton.questionSetId}.json`;
  const outPath = join(DATA_DIR, filename);

  if (existsSync(outPath)) {
    console.error(`Refusing to overwrite existing ${outPath}`);
    process.exit(1);
  }

  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(outPath, JSON.stringify(skeleton, null, 2) + '\n', 'utf-8');
  console.log(`Wrote skeleton: ${outPath}`);
  console.log(`Fill in every "${TODO}" per docs/guides/content-authoring.md, then run:`);
  console.log(`  npm run authoring:check -- --draft`);
}

main();
