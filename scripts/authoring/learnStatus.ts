/**
 * Status report over src/data/learn/demands/*.json: provenance split
 * (inferred vs reviewed vs authored) and per-topic demand coverage — the
 * live distance from the Stage 3/9 exit criteria (428/428 coverage; a
 * non-inferred >=7.0 question in every core topic before Stage 10).
 *
 *   npm run learn:status
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveDemandScore } from '../../src/domain/learn/demand/deriveDemandLevel';
import { QUESTIONS } from '../../src/data/questions';
import type { LearnDemandsFile } from '../../src/domain/learn/demand/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'src', 'data', 'learn', 'demands');

function main(): void {
  let filenames: string[];
  try {
    filenames = readdirSync(DATA_DIR).filter((f) => f.endsWith('.json')).sort();
  } catch {
    console.log(`No data directory at ${DATA_DIR} — nothing to report.`);
    return;
  }

  const files: LearnDemandsFile[] = filenames.map(
    (f) => JSON.parse(readFileSync(join(DATA_DIR, f), 'utf-8')) as LearnDemandsFile,
  );

  const totalQuestions = QUESTIONS.length;
  const coveredIds = new Set(files.flatMap((f) => f.entries.map((e) => e.questionId)));

  console.log(`=== Learn demands authoring status — ${files.length} topic file(s) ===\n`);
  console.log(`Coverage: ${coveredIds.size}/${totalQuestions} questions carry demands.\n`);

  const provenanceCounts = { inferred: 0, reviewed: 0, authored: 0 };
  for (const file of files) {
    let hasNonInferredAbove7 = false;
    for (const entry of file.entries) {
      provenanceCounts[entry.demands.provenance] += 1;
      if (entry.demands.provenance !== 'inferred' && deriveDemandScore(entry.demands) >= 7.0) {
        hasNonInferredAbove7 = true;
      }
    }
    console.log(
      `  ${file.topicKey}: ${file.entries.length} entries${hasNonInferredAbove7 ? ', has a non-inferred >=7.0 question' : ', NO non-inferred >=7.0 question yet'}`,
    );
  }

  console.log('');
  console.log(
    `Provenance: inferred=${provenanceCounts.inferred}, reviewed=${provenanceCounts.reviewed}, authored=${provenanceCounts.authored}`,
  );
  console.log('');
  if (coveredIds.size < totalQuestions) {
    console.log(`${totalQuestions - coveredIds.size} question(s) have no demands entry yet.`);
  } else {
    console.log('All questions carry demands.');
  }
}

main();
