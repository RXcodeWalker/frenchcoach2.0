/**
 * Pre-seed gate for backend/data/igcse/*.json — mandatory manual step (S11
 * plan finding #6: content lives in a separate git repo, so this cannot run
 * as ordinary frontend CI). Runs validateAuthoredQuestionSet (which already
 * folds lintAuthoredContent in as the warnings bucket — do not call the lint
 * a second time) per file, then the authoring-only pattern lint
 * (patternLint.ts, D12: its errors fail this check, its warnings are only
 * printed), then lintCorpus once across every file for cross-set problems.
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
import { lintPatterns } from '../../src/data/exam/bank/patternLint';
import { QUESTIONS } from '../../src/data/questions';
import type { AuthoredQuestionSet } from '../../src/data/exam/bank/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_DIR = join(__dirname, '..', '..', 'backend', 'data', 'igcse');

const DRAFT_SUPPRESSED_CODE = 'not-approved';

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
    // Pattern lint needs a structurally valid set; skip it when validation already failed.
    const patternIssues = errors.length === 0 ? lintPatterns((raw as AuthoredQuestionSet).content) : [];
    const patternErrors = patternIssues.filter((p) => p.severity === 'error');
    const patternWarnings = patternIssues.filter((p) => p.severity === 'warning');

    for (const err of errors) {
      console.log(`  ERROR [${err.code}] ${err.path}: ${err.message}`);
    }
    for (const err of patternErrors) {
      console.log(`  ERROR [${err.code}] ${err.path}: ${err.message}`);
    }
    for (const warn of [...report.warnings, ...patternWarnings]) {
      console.log(`  WARN  [${warn.code}] ${warn.path}: ${warn.message}`);
    }
    if (errors.length + patternIssues.length === 0 && report.warnings.length === 0) {
      console.log('  clean');
    }

    totalErrors += errors.length + patternErrors.length;
    totalWarnings += report.warnings.length + patternWarnings.length;

    if (errors.length === 0) {
      validSets.push(raw as AuthoredQuestionSet);
    }
    console.log('');
  }

  if (validSets.length > 1) {
    console.log(`-- corpus check (${validSets.length} sets) --`);
    const legacyTexts = QUESTIONS.map((q) => q.text);
    const corpusReport = lintCorpus(validSets, legacyTexts);
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
