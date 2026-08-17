/**
 * Pre-review gate for src/data/learn/demands/*.json — validates every topic
 * file against the question bank (unknown-question-id) and reports each
 * file's errors/warnings. corpus-hash-drift (docs §12, §9.1) is Stage 8
 * territory — backend/data/learn/ does not exist yet, so that check is a
 * clean no-op until then.
 *
 *   npm run learn:check                  # real gate — must be clean before review
 *   npm run learn:check -- --draft       # suppresses only "not-approved"
 *   npm run learn:check -- <dir>         # override the default data dir
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateLearnDemandsFile } from '../../src/domain/learn/demand/validate';
import { QUESTIONS } from '../../src/data/questions';

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

/** §12 corpus-hash-drift — Stage 8 wires the real backend/data/learn/ hash comparison. */
function checkCorpusHashDrift(): { errors: number } {
  if (!existsSync(BACKEND_DATA_DIR)) {
    return { errors: 0 };
  }
  console.log('-- corpus-hash-drift --');
  console.log('  SKIPPED: backend/data/learn/ exists but hash-parity checking is not implemented until Stage 8.');
  console.log('');
  return { errors: 0 };
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
    const { errors } = checkCorpusHashDrift();
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

  const { errors: hashDriftErrors } = checkCorpusHashDrift();
  totalErrors += hashDriftErrors;

  console.log(`Total: ${totalErrors} error(s), ${totalWarnings} warning(s) across ${files.length} file(s).`);
  if (totalErrors > 0) {
    process.exit(1);
  }
}

main();
