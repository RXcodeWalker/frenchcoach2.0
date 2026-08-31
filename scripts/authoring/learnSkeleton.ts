/**
 * Emits a pre-tagged LearnDemandsFile skeleton for one topic — one entry per
 * question currently in that topic in src/data/questions.ts, cognitiveDemand
 * defaulted to "describe" (the conservative floor) so an unreviewed skeleton
 * never overstates demand. Authors/inference fill in every "TODO" per
 * docs/guides/learn-demands.md.
 *
 *   npm run learn:skeleton -- school
 *
 * Writes src/data/learn/demands/<topic>.json if it does not already exist
 * (refuses to overwrite authored work).
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { QUESTIONS, TOPICS } from '../../src/data/questions';
import type { LearnDemandsEntry, LearnDemandsFile } from '../../src/domain/learn/demand/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'src', 'data', 'learn', 'demands');

const TODO = 'TODO';

function entrySkeleton(questionId: string): LearnDemandsEntry {
  return {
    questionId,
    demands: {
      cognitiveDemand: 'describe',
      timeFrames: ['present'],
      structures: [],
      responseLoad: 'developed',
      lexicalReach: 'everyday',
      sufficientAnswer: TODO,
      provenance: 'inferred',
      inferenceConfidence: 0,
    },
    review: { status: 'draft', notes: `Author: ${TODO}` },
  };
}

function buildSkeleton(topicKey: string): LearnDemandsFile {
  const questions = QUESTIONS.filter((q) => q.topicKey === topicKey);
  if (questions.length === 0) {
    const known = TOPICS.map((t) => t.key).join(', ');
    throw new Error(`No questions found for topicKey "${topicKey}". Known topics: ${known}`);
  }
  return {
    schemaVersion: 'learn-demands-v1',
    topicKey,
    entries: questions.map((q) => entrySkeleton(q.id)),
  };
}

function main(): void {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: npm run learn:skeleton -- <topicKey>   (e.g. school)');
    process.exit(1);
  }

  const skeleton = buildSkeleton(arg);
  const outPath = join(DATA_DIR, `${skeleton.topicKey}.json`);

  if (existsSync(outPath)) {
    console.error(`Refusing to overwrite existing ${outPath}`);
    process.exit(1);
  }

  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(outPath, JSON.stringify(skeleton, null, 2) + '\n', 'utf-8');
  console.log(`Wrote skeleton: ${outPath} (${skeleton.entries.length} entries)`);
  console.log(`Fill in every "${TODO}" per docs/guides/learn-demands.md, then run:`);
  console.log(`  npm run learn:check -- --draft`);
}

main();
