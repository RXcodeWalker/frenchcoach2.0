/**
 * docs Stage 2 (learn-feedback-contract) — copies
 * src/services/api/__fixtures__/feedback-contract/*.json byte-for-byte into
 * backend/tests/fixtures/feedback-contract/, mirroring the pattern
 * syncLearnDemandsToBackend.ts already uses for the demands corpus (§9.1).
 * The frontend repo owns the fixtures; both repos' test suites assert the
 * fixture-set hash matches FEEDBACK_CONTRACT_VERSION, so the two copies can
 * never silently diverge — checkFeedbackContractFixtures.ts fails loudly in
 * whichever repo is stale.
 *
 * Must be run (and backend/ committed+pushed separately, per CLAUDE.md) any
 * time a fixture changes.
 *
 *   npm run feedback:sync-fixtures
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, '..', '..', 'src', 'services', 'api', '__fixtures__', 'feedback-contract');
const DEST_DIR = join(__dirname, '..', '..', 'backend', 'tests', 'fixtures', 'feedback-contract');

function main(): void {
  if (!existsSync(SRC_DIR)) {
    console.error(`Source dir does not exist: ${SRC_DIR}`);
    process.exit(1);
  }
  mkdirSync(DEST_DIR, { recursive: true });

  const filenames = readdirSync(SRC_DIR).filter((f) => f.endsWith('.json')).sort();
  for (const filename of filenames) {
    const raw = readFileSync(join(SRC_DIR, filename), 'utf-8');
    writeFileSync(join(DEST_DIR, filename), raw, 'utf-8');
  }

  console.log(`Copied ${filenames.length} file(s) from ${SRC_DIR} to ${DEST_DIR}.`);
  console.log('Remember: backend/ is a separate git repo — commit and push it separately (CLAUDE.md).');
}

main();
