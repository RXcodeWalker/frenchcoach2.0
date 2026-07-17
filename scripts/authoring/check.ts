/**
 * Pre-seed gate for backend/data/igcse/*.json — mandatory manual step (S11
 * plan finding #6: content lives in a separate git repo, so this cannot run
 * as ordinary frontend CI). Runs validateAuthoredQuestionSet (which already
 * folds lintAuthoredContent in as the warnings bucket — do not call the lint
 * a second time, see validate.ts:298) per file, then lintCorpus once across
 * every file for cross-set problems.
 *
 *   npm run authoring:check                  # real gate — must be clean to seed
 *   npm run authoring:check -- --draft        # suppresses only "not-approved"
 *   npm run authoring:check -- <dir>          # override the default data dir
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateAuthoredQuestionSet } from '../../src/data/exam/bank/validate';
import { lintCorpus } from '../../src/data/exam/bank/corpusLint';
import { QUESTIONS } from '../../src/data/questions';
import type { AuthoredQuestionSet } from '../../src/data/exam/bank/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_DIR = join(__dirname, '..', '..', 'backend', 'data', 'igcse');

const DRAFT_SUPPRESSED_CODE = 'not-approved';

/**
 * original-practice-001 predates the legacy-bank-overlap rule and shares two
 * questions verbatim with the legacy src/data/questions.ts app bank
 * (t1q2/"Décris ta maison ou ton appartement.", t2q1/"Qu'est-ce que tu fais
 * pour protéger l'environnement ?"). Per the S11 plan's explicit non-goal,
 * 001's content is frozen — editing it would change its content_hash for no
 * product benefit (same reasoning as the apostrophe-normalization non-goal).
 * Excluded here, not in corpusLint.ts itself, since the rule is correct and
 * general; this is a one-time grandfather for a specific frozen set.
 */
const LEGACY_OVERLAP_EXEMPT_SET_IDS = new Set(['original-practice-001']);

function loadSets(dataDir: string): { filename: string; raw: unknown }[] {
  let filenames: string[];
  try {
    filenames = readdirSync(dataDir).filter((f) => f.endsWith('.json')).sort();
  } catch {
    console.error(`No such directory: ${dataDir}`);
    process.exit(1);
  }
  return filenames.map((filename) => ({
    filename,
    raw: JSON.parse(readFileSync(join(dataDir, filename), 'utf-8')) as unknown,
  }));
}

function main(): void {
  const args = process.argv.slice(2);
  const draft = args.includes('--draft');
  const dirArg = args.find((a) => a !== '--draft');
  const dataDir = dirArg ? join(process.cwd(), dirArg) : DEFAULT_DATA_DIR;

  const files = loadSets(dataDir);
  if (files.length === 0) {
    console.log(`No .json files found in ${dataDir} — nothing to check.`);
    return;
  }

  console.log(`Checking ${files.length} set(s) in ${dataDir}${draft ? ' (--draft: not-approved suppressed)' : ''}\n`);

  let totalErrors = 0;
  let totalWarnings = 0;
  const validSets: AuthoredQuestionSet[] = [];

  for (const { filename, raw } of files) {
    console.log(`-- ${filename} --`);
    let report;
    try {
      report = validateAuthoredQuestionSet(raw);
    } catch (e) {
      console.log(`  FATAL: ${(e as Error).message}`);
      totalErrors += 1;
      continue;
    }

    const errors = draft ? report.errors.filter((e) => e.code !== DRAFT_SUPPRESSED_CODE) : report.errors;

    for (const err of errors) {
      console.log(`  ERROR [${err.code}] ${err.path}: ${err.message}`);
    }
    for (const warn of report.warnings) {
      console.log(`  WARN  [${warn.code}] ${warn.path}: ${warn.message}`);
    }
    if (errors.length === 0 && report.warnings.length === 0) {
      console.log('  clean');
    }

    totalErrors += errors.length;
    totalWarnings += report.warnings.length;

    if (errors.length === 0) {
      validSets.push(raw as AuthoredQuestionSet);
    }
    console.log('');
  }

  if (validSets.length > 1) {
    console.log(`-- corpus check (${validSets.length} sets) --`);
    const legacyTexts = QUESTIONS.map((q) => q.text);
    const corpusReport = lintCorpus(validSets, legacyTexts);
    corpusReport.issues = corpusReport.issues.filter(
      (issue) => !(issue.code === 'legacy-bank-overlap' && LEGACY_OVERLAP_EXEMPT_SET_IDS.has(issue.setId)),
    );
    for (const issue of corpusReport.issues) {
      console.log(`  ERROR [${issue.code}] ${issue.setId} ${issue.path}: ${issue.message}`);
    }
    if (corpusReport.issues.length === 0) {
      console.log('  clean');
    } else {
      totalErrors += corpusReport.issues.length;
    }
    console.log('');
    console.log('-- coverage --');
    for (const diag of corpusReport.coverage) {
      console.log(`  [${diag.code}] ${diag.message}: ${diag.value}`);
    }
    console.log('');
  }

  console.log(`Total: ${totalErrors} error(s), ${totalWarnings} warning(s) across ${files.length} file(s).`);
  if (totalErrors > 0) {
    process.exit(1);
  }
}

main();
