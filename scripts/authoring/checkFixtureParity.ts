/**
 * One-off parity check: every in-repo offline fixture
 * (src/data/exam/bank/fixtures/, OFFLINE_FIXTURES) must hash identically to
 * its canonical authored source in french-coach-backend's data/igcse/*.json.
 * The scoring server falls back to these fixtures when the content API is
 * unreachable, and hash-guards the result against the transcript's declared
 * questionSetHash — so any drift turns into a terminal 409 for that set.
 *
 * Hashes the engine-facing SessionQuestionSet (validate -> adapt ->
 * hashQuestionSet), the exact value the scoring server compares.
 *
 *   npx tsx scripts/authoring/checkFixtureParity.ts            # default: backend/data/igcse
 *   npx tsx scripts/authoring/checkFixtureParity.ts <dir>      # override the data dir
 *
 * Exits 1 on any mismatch, or a set present on only one side.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OFFLINE_FIXTURES } from '../../src/data/exam/bank/fixtures';
import { parseAuthoredQuestionSet } from '../../src/data/exam/bank/validate';
import { toSessionQuestionSet } from '../../src/data/exam/bank/adapter';
import { hashQuestionSet } from '../../src/domain/igcse/content/hashQuestionSet';
import type { AuthoredQuestionSet } from '../../src/data/exam/bank/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_DIR = join(__dirname, '..', '..', 'backend', 'data', 'igcse');

async function hashAuthored(set: AuthoredQuestionSet): Promise<string> {
  return hashQuestionSet(toSessionQuestionSet(parseAuthoredQuestionSet(set)));
}

async function main(): Promise<void> {
  const dirArg = process.argv[2];
  const dataDir = dirArg ? resolve(process.cwd(), dirArg) : DEFAULT_DATA_DIR;

  let filenames: string[];
  try {
    filenames = readdirSync(dataDir).filter((f) => f.endsWith('.json')).sort();
  } catch {
    console.error(`No such directory: ${dataDir}`);
    process.exit(1);
  }

  const backendHashes = new Map<string, string>();
  for (const filename of filenames) {
    const raw = JSON.parse(readFileSync(join(dataDir, filename), 'utf-8')) as AuthoredQuestionSet;
    backendHashes.set(raw.questionSetId, await hashAuthored(raw));
  }

  let failures = 0;
  const ids = [...new Set([...Object.keys(OFFLINE_FIXTURES), ...backendHashes.keys()])].sort();
  for (const id of ids) {
    const fixture = OFFLINE_FIXTURES[id];
    const backendHash = backendHashes.get(id);
    if (!fixture) {
      console.log(`✗ ${id}: in ${dataDir} but has no in-repo fixture`);
      failures += 1;
      continue;
    }
    if (!backendHash) {
      console.log(`✗ ${id}: in-repo fixture has no backend JSON`);
      failures += 1;
      continue;
    }
    const fixtureHash = await hashAuthored(fixture);
    if (fixtureHash === backendHash) {
      console.log(`✓ ${id}  ${fixtureHash}`);
    } else {
      console.log(`✗ ${id}: fixture ${fixtureHash} != backend ${backendHash}`);
      failures += 1;
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} set(s) out of parity.`);
    process.exit(1);
  }
  console.log(`\nAll ${ids.length} fixture(s) match the backend JSON.`);
}

void main();
