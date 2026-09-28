/**
 * Local-only originality check (ADR 0008, content-authoring §0). Compares the
 * authored question bank against a text extraction of the 0520/03
 * Teacher/Examiner Notes and prints findings by set and question id only
 * (see originality.ts) — never the notes' wording.
 *
 *   npx tsx scripts/authoring/originalityCheck.ts <path-to-TN-text> [data-dir]
 *
 * The notes are confidential to centres and must never enter either repo, so
 * this refuses any notes path that resolves inside this repo or inside the
 * backend repo (symlinks resolved), and it never writes anything. Exits 1 if
 * anything is flagged: rewrite the flagged items and re-run until clean.
 */
import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, relative, resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findOriginalityIssues, NGRAM_SIZE, SIMILAR_LINE_THRESHOLD } from './originality';
import type { AuthoredQuestionSet } from '../../src/data/exam/bank/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MAIN_REPO = resolve(__dirname, '..', '..');
const DEFAULT_DATA_DIR = join(MAIN_REPO, 'backend', 'data', 'igcse');

/** The roots the notes must never live under: this repo, and the backend repo wherever its checkout really is. */
function protectedRoots(): string[] {
  const roots = [realpathSync(MAIN_REPO)];
  // backend/ is the nested checkout (or a symlink to it); ../french-coach-backend is the sibling-clone layout.
  for (const candidate of [join(MAIN_REPO, 'backend'), join(MAIN_REPO, '..', 'french-coach-backend')]) {
    if (existsSync(candidate)) roots.push(realpathSync(candidate));
  }
  return roots;
}

function isInside(child: string, root: string): boolean {
  const rel = relative(root, child);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function main(): void {
  const [notesArg, dirArg] = process.argv.slice(2);
  if (!notesArg) {
    console.error('Usage: npx tsx scripts/authoring/originalityCheck.ts <path-to-TN-text> [data-dir]');
    console.error('The notes text must live OUTSIDE both repositories (ADR 0008).');
    process.exit(2);
  }

  const notesPath = resolve(process.cwd(), notesArg);
  if (!existsSync(notesPath)) {
    console.error(`No such file: ${notesPath}`);
    process.exit(2);
  }
  const realNotes = realpathSync(notesPath);
  for (const root of protectedRoots()) {
    if (isInside(realNotes, root)) {
      console.error(`Refusing: ${realNotes} is inside ${root}. Keep the notes text outside both repos (ADR 0008).`);
      process.exit(2);
    }
  }

  const dataDir = dirArg ? resolve(process.cwd(), dirArg) : DEFAULT_DATA_DIR;
  const sets = readdirSync(dataDir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(dataDir, f), 'utf-8')) as AuthoredQuestionSet);

  const findings = findOriginalityIssues(sets, readFileSync(realNotes, 'utf-8'));
  console.log(
    `Originality check: ${sets.length} set(s) against the notes (${NGRAM_SIZE}-gram overlap; line similarity >= ${SIMILAR_LINE_THRESHOLD}).\n`,
  );
  for (const f of findings) {
    const detail = f.kind === 'five-gram' ? `${f.value} shared ${NGRAM_SIZE}-gram(s)` : `similarity ${f.value.toFixed(2)}`;
    console.log(`  FLAG [${f.kind}] ${f.setId} ${f.path}: ${detail}`);
  }
  const byKind = (k: string) => findings.filter((f) => f.kind === k).length;
  console.log(`\nTotal: ${findings.length} finding(s) — ${byKind('five-gram')} five-gram, ${byKind('similar-line')} similar-line.`);
  if (findings.length > 0) process.exit(1);
}

main();
