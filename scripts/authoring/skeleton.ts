/**
 * Emits a pre-tagged AuthoredQuestionSet skeleton for one corpus-matrix row —
 * ids, part, areas, partsExpected slots, and expectedTimeFrame all filled in
 * from docs/guides/corpus-matrix.md (mirrored in ./matrix.ts). Authors fill
 * in only the French text (mainText/alternativeTexts/secondPartText/title/
 * subTopic/targetStructures/furtherQuestions) — see docs/guides/content-authoring.md.
 *
 *   npm run authoring:skeleton -- 002
 *
 * Writes backend/data/igcse/original-practice-002.json if it does not already
 * exist (refuses to overwrite authored work).
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { matrixRowForSetNumber, TIME_FRAME_TEMPLATES } from './matrix';
import type { AuthoredQuestion, AuthoredQuestionSet } from '../../src/data/exam/bank/types';
import type { TimeFrame } from '../../src/domain/igcse/evidence/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'backend', 'data', 'igcse');

const TODO = 'TODO';

function roleplayTaskSkeleton(index: number, twoPartIndices: number[]): AuthoredQuestion {
  const id = `rp${index + 1}`;
  const twoPart = twoPartIndices.includes(index);
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
  frame: TimeFrame,
): AuthoredQuestion {
  const id = `t${topicNum}q${index + 1}`;
  const requiresAlternative = index >= 2; // Q3-Q5
  const isOpinionSlot = index === 3; // Q4 conventionally carries opinion+justification, per 001
  return {
    questionId: id,
    part: `topic${topicNum}` as AuthoredQuestion['part'],
    mainText: TODO,
    alternativeTexts: requiresAlternative ? [TODO] : [],
    topicArea: area as AuthoredQuestion['topicArea'],
    subTopic: TODO,
    difficulty: index === 0 ? 'foundation' : index === 4 ? 'higher' : 'core',
    targetStructures: ['present'],
    expectedTimeFrame: frame,
    partsExpected: isOpinionSlot ? 2 : 1,
    ...(isOpinionSlot ? { secondPartText: 'Pourquoi ?' } : {}),
  };
}

function buildSkeleton(setNumber: number): AuthoredQuestionSet {
  const row = matrixRowForSetNumber(setNumber);
  if (!row) {
    throw new Error(`No corpus-matrix row for set ${setNumber}. Valid: 2-10 (see docs/guides/corpus-matrix.md).`);
  }

  const topic1Frames = TIME_FRAME_TEMPLATES[row.topic1Template].frames;
  const topic2Frames = TIME_FRAME_TEMPLATES[row.topic2Template].frames;

  return {
    questionSetId: row.questionSetId,
    schemaVersion: 'question-bank-v1',
    provenance: 'original-practice',
    review: { status: 'draft', notes: `Author: ${TODO}. Clean-room attestation pending. Archetype: ${row.archetype}. Rare-structure target: ${row.rareStructureTarget}.` },
    content: {
      rolePlay: {
        scenarioId: `rp-${row.questionSetId}`,
        topicArea: row.rolePlayArea,
        title: TODO,
        setup: TODO,
        tasks: Array.from({ length: 5 }, (_, i) => roleplayTaskSkeleton(i, [2])),
      },
      topic1: {
        topicArea: row.topic1Area,
        subTopic: TODO,
        furtherQuestions: [TODO, TODO],
        questions: Array.from({ length: 5 }, (_, i) => topicQuestionSkeleton(1, i, row.topic1Area, topic1Frames[i])),
      },
      topic2: {
        topicArea: row.topic2Area,
        subTopic: TODO,
        furtherQuestions: [TODO, TODO],
        questions: Array.from({ length: 5 }, (_, i) => topicQuestionSkeleton(2, i, row.topic2Area, topic2Frames[i])),
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
