/**
 * Status report over backend/data/igcse/*.json: how many sets are
 * reviewedBy:internal:* vs reviewedBy:teacher:* — the live distance from the
 * teacher-review gate ("every item teacher-approved" before it counts as
 * fully reviewed, vs. pilot-ready internal:* review). Also echoes the corpus
 * coverage diagnostics so authors don't need to re-run `authoring:check`
 * just to see the coverage numbers.
 *
 *   npm run authoring:status
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintCorpus } from '../../src/data/exam/bank/corpusLint';
import type { AuthoredQuestionSet } from '../../src/data/exam/bank/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'backend', 'data', 'igcse');

function reviewTier(reviewedBy: string | undefined): 'internal' | 'teacher' | 'unset' {
  if (!reviewedBy) return 'unset';
  if (reviewedBy.startsWith('teacher:')) return 'teacher';
  if (reviewedBy.startsWith('internal:')) return 'internal';
  return 'unset';
}

function main(): void {
  let filenames: string[];
  try {
    filenames = readdirSync(DATA_DIR).filter((f) => f.endsWith('.json')).sort();
  } catch {
    console.log(`No data directory at ${DATA_DIR} — nothing to report.`);
    return;
  }

  const sets: AuthoredQuestionSet[] = filenames.map(
    (f) => JSON.parse(readFileSync(join(DATA_DIR, f), 'utf-8')) as AuthoredQuestionSet,
  );

  const tierCounts = { internal: 0, teacher: 0, unset: 0, draft: 0 };
  console.log(`=== Authoring status — ${sets.length} set(s) in ${DATA_DIR} ===\n`);

  for (const set of sets) {
    if (set.review.status !== 'approved') {
      tierCounts.draft += 1;
      console.log(`  ${set.questionSetId}: draft (not yet approved)`);
      continue;
    }
    const tier = reviewTier(set.review.reviewedBy);
    tierCounts[tier] += 1;
    console.log(`  ${set.questionSetId}: approved, reviewedBy=${set.review.reviewedBy ?? '(none)'} [${tier}]`);
  }

  console.log('');
  console.log(`internal: ${tierCounts.internal}, teacher: ${tierCounts.teacher}, unset: ${tierCounts.unset}, draft: ${tierCounts.draft}`);
  console.log('');
  if (tierCounts.teacher < sets.length) {
    console.log(
      `Teacher-review gate NOT met: ${sets.length - tierCounts.teacher} of ${sets.length} set(s) still need a ` +
        `0520-familiar teacher's exam-realism review and reviewedBy: teacher:<name>.`,
    );
  } else {
    console.log('Teacher-review gate met: every set carries reviewedBy: teacher:*.');
  }

  const approvedSets = sets.filter((s) => s.review.status === 'approved');
  if (approvedSets.length > 0) {
    console.log('\n=== Corpus coverage (approved sets only) ===\n');
    const report = lintCorpus(approvedSets);
    for (const diag of report.coverage) {
      console.log(`  [${diag.code}] ${diag.message}: ${diag.value}`);
    }
    if (report.issues.length > 0) {
      console.log(`\n  ${report.issues.length} cross-set issue(s) — run \`npm run authoring:check\` for detail.`);
    }
  }
}

main();
