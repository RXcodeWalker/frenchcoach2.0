/**
 * Generates src/data/learn/demands/<topic>.json for every topic, inferring
 * QuestionDemands for all 428 questions in one pass — Stage 3 (docs §13).
 * Per the decision in the design doc: infer all 428, then review; safety
 * comes from inferred labels weighing less everywhere (§13.2), not from
 * withholding them.
 *
 * Unlike learnSkeleton.ts (one topic, TODO placeholders), this writes every
 * topic file in one run and OVERWRITES existing files — it is meant to be
 * run once, early, before any human review has flipped provenance away from
 * 'inferred'. Refuses to run if it would clobber reviewed/authored work.
 *
 *   npm run learn:infer
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { QUESTIONS, TOPICS } from '../../src/data/questions';
import { inferQuestionDemands } from '../../src/domain/learn/demand/infer';
import { LEARN_DEMANDS_SCHEMA_VERSION } from '../../src/domain/learn/demand/version';
import type { LearnDemandsEntry, LearnDemandsFile } from '../../src/domain/learn/demand/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'src', 'data', 'learn', 'demands');

function buildTopicFile(topicKey: string): LearnDemandsFile {
  const questions = QUESTIONS.filter((q) => q.topicKey === topicKey);
  const entries: LearnDemandsEntry[] = questions.map((q) => ({
    questionId: q.id,
    demands: inferQuestionDemands({ text: q.text, hint: q.hint, difficulty: q.difficulty }),
    review: { status: 'draft' },
  }));
  return { schemaVersion: LEARN_DEMANDS_SCHEMA_VERSION, topicKey, entries };
}

function hasNonInferredWork(path: string): boolean {
  if (!existsSync(path)) return false;
  try {
    const existing = JSON.parse(readFileSync(path, 'utf-8')) as LearnDemandsFile;
    return existing.entries.some((e) => e.demands.provenance !== 'inferred' || e.review.status === 'approved');
  } catch {
    // Unreadable/malformed — treat as unsafe to overwrite.
    return true;
  }
}

function main(): void {
  const topicsWithBlockedFiles: string[] = [];
  for (const topic of TOPICS) {
    const path = join(DATA_DIR, `${topic.key}.json`);
    if (hasNonInferredWork(path)) topicsWithBlockedFiles.push(topic.key);
  }
  if (topicsWithBlockedFiles.length > 0) {
    console.error(
      `Refusing to run: the following topic file(s) contain reviewed/authored/approved entries and would be clobbered:\n  ${topicsWithBlockedFiles.join(', ')}\nRemove or back up these files first if you intend to re-infer them.`,
    );
    process.exit(1);
  }

  mkdirSync(DATA_DIR, { recursive: true });

  let totalEntries = 0;
  let totalLowConfidence = 0;
  for (const topic of TOPICS) {
    const file = buildTopicFile(topic.key);
    if (file.entries.length === 0) continue;
    const path = join(DATA_DIR, `${topic.key}.json`);
    writeFileSync(path, JSON.stringify(file, null, 2) + '\n', 'utf-8');
    const lowConfidence = file.entries.filter((e) => (e.demands.inferenceConfidence ?? 1) < 0.5).length;
    totalEntries += file.entries.length;
    totalLowConfidence += lowConfidence;
    console.log(`Wrote ${path} (${file.entries.length} entries, ${lowConfidence} low-confidence)`);
  }

  console.log(`\nTotal: ${totalEntries} entries across ${TOPICS.length} topic file(s), ${totalLowConfidence} low-confidence.`);
  console.log('Coverage check:', totalEntries === QUESTIONS.length ? 'OK, matches QUESTIONS.length' : `MISMATCH: QUESTIONS.length is ${QUESTIONS.length}`);
  console.log('\nNext: npm run learn:check -- --draft');
}

main();
