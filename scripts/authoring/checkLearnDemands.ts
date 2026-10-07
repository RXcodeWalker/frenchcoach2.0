/**
 * Pre-review gate for src/data/learn/demands/*.json — validates every topic
 * file against the question bank (unknown-question-id) and reports each
 * file's errors/warnings, then lints the bank's Learn-only fields
 * (subTopic, coachHint) and question wording. corpus-hash-drift (docs §12, §9.1) compares this
 * corpus's hash against backend/data/learn/'s copy — the same check CI runs
 * (Stage 8).
 *
 *   npm run learn:check                  # real gate — must be clean before review
 *   npm run learn:check -- --draft       # suppresses only "not-approved"
 *   npm run learn:check -- <dir>         # override the default data dir
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateLearnDemandsFile } from '../../src/domain/learn/demand/validate';
import { lintLearnBank } from '../../src/data/learnBankLint';
import { QUESTIONS } from '../../src/data/questions';
import { hashCorpus, loadRawCorpus } from './learnCorpusHash';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_DIR = join(__dirname, '..', '..', 'src', 'data', 'learn', 'demands');
const BACKEND_DATA_DIR = join(__dirname, '..', '..', 'backend', 'data', 'learn');

const DRAFT_SUPPRESSED_CODE = 'not-approved';

function loadFiles(dataDir: string): { filename: string; raw: unknown }[] {
  let filenames: string[];
  try {
    filenames = readdirSync(dataDir).filter((f) => f.endsWith('.json')).sort();
  } catch {
    return [];
  }
  return filenames.map((filename) => ({
    filename,
    raw: JSON.parse(readFileSync(join(dataDir, filename), 'utf-8')) as unknown,
  }));
}

/** §12 corpus-hash-drift — src/data/learn/ and backend/data/learn/ must hash identically (§9.1). */
function checkCorpusHashDrift(sourceDataDir: string): { errors: number } {
  console.log('-- corpus-hash-drift --');
  if (!existsSync(BACKEND_DATA_DIR)) {
    console.log('  SKIPPED: backend/data/learn/ does not exist. Run: npm run learn:sync-backend');
    console.log('');
    return { errors: 0 };
  }

  const sourceFiles = loadRawCorpus(sourceDataDir);
  const backendFiles = loadRawCorpus(BACKEND_DATA_DIR);

  const sourceHash = hashCorpus(sourceFiles);
  const backendHash = hashCorpus(backendFiles);

  if (sourceHash !== backendHash) {
    console.log(`  ERROR [corpus-hash-drift] src/data/learn/ (${sourceHash}) != backend/data/learn/ (${backendHash})`);
    console.log('  Run: npm run learn:sync-backend, then commit and push backend/ separately (CLAUDE.md).');
    console.log('');
    return { errors: 1 };
  }

  console.log('  clean — hashes match');
  console.log('');
  return { errors: 0 };
}

/** Learn-only bank fields and wording (src/data/learnBankLint.ts). Errors fail; warnings are grouped per rule. */
function checkLearnBank(): { errors: number; warnings: number } {
  console.log('-- question bank (subTopic, coachHint, wording) --');
  const issues = lintLearnBank(QUESTIONS);
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  for (const e of errors) console.log(`  ERROR [${e.code}] ${e.message}`);
  const byCode = new Map<string, string[]>();
  for (const w of warnings) byCode.set(w.code, [...(byCode.get(w.code) ?? []), w.questionId]);
  for (const [code, ids] of byCode) console.log(`  WARN  [${code}] ${ids.length}: ${ids.join(', ')}`);
  if (issues.length === 0) console.log('  clean');
  console.log('');
  return { errors: errors.length, warnings: warnings.length };
}

function main(): void {
  const args = process.argv.slice(2);
  const draft = args.includes('--draft');
  const dirArg = args.find((a) => a !== '--draft');
  const dataDir = dirArg ? join(process.cwd(), dirArg) : DEFAULT_DATA_DIR;

  const files = loadFiles(dataDir);
  const knownQuestionIds = new Set(QUESTIONS.map((q) => q.id));
  const questionTextById = new Map(QUESTIONS.map((q) => [q.id, q.text]));

  if (files.length === 0) {
    console.log(`No .json files found in ${dataDir} — nothing to check.`);
    const { errors } = checkCorpusHashDrift(dataDir);
    if (errors > 0) process.exit(1);
    return;
  }

  console.log(`Checking ${files.length} file(s) in ${dataDir}${draft ? ' (--draft: not-approved suppressed)' : ''}\n`);

  let totalErrors = 0;
  let totalWarnings = 0;

  for (const { filename, raw } of files) {
    console.log(`-- ${filename} --`);
    let report;
    try {
      report = validateLearnDemandsFile(raw, { knownQuestionIds, questionTextById });
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
    console.log('');
  }

  const bank = checkLearnBank();
  totalErrors += bank.errors;
  totalWarnings += bank.warnings;

  const { errors: hashDriftErrors } = checkCorpusHashDrift(dataDir);
  totalErrors += hashDriftErrors;

  console.log(`Total: ${totalErrors} error(s), ${totalWarnings} warning(s) across ${files.length} file(s).`);
  if (totalErrors > 0) {
    process.exit(1);
  }
}

main();
