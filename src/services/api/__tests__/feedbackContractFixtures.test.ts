// docs Stage 2 (learn-feedback-contract) — src/services/api/__fixtures__/
// feedback-contract/ is the frontend's owned copy; syncFeedbackContractFixtures.ts
// copies it byte-for-byte into backend/tests/fixtures/feedback-contract/
// (mirroring syncLearnDemandsToBackend.ts's pattern for the demands corpus).
// This asserts the two copies match — if this fails, run:
//   npm run feedback:sync-fixtures
// then commit and push backend/ separately (CLAUDE.md).

import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, '..', '__fixtures__', 'feedback-contract');
const BACKEND_DIR = join(__dirname, '..', '..', '..', '..', 'backend', 'tests', 'fixtures', 'feedback-contract');

const SEP = String.fromCharCode(0x20);

function hashFixtureSet(dir: string): string {
  const filenames = readdirSync(dir).filter(f => f.endsWith('.json')).sort();
  const hash = createHash('sha256');
  for (const filename of filenames) {
    hash.update(filename);
    hash.update(SEP);
    hash.update(readFileSync(join(dir, filename), 'utf-8'));
    hash.update(SEP);
  }
  return hash.digest('hex');
}

describe('feedback-contract fixture sync', () => {
  it('has at least one fixture in the source directory', () => {
    const filenames = readdirSync(SRC_DIR).filter(f => f.endsWith('.json'));
    expect(filenames.length).toBeGreaterThan(0);
  });

  it('every fixture is valid JSON with a schemaVersion', () => {
    const filenames = readdirSync(SRC_DIR).filter(f => f.endsWith('.json'));
    for (const filename of filenames) {
      const parsed = JSON.parse(readFileSync(join(SRC_DIR, filename), 'utf-8'));
      expect(parsed.schemaVersion, `${filename} missing schemaVersion`).toBeGreaterThanOrEqual(2);
    }
  });

  it('matches backend/tests/fixtures/feedback-contract/ byte-for-byte — run npm run feedback:sync-fixtures if this fails', () => {
    if (!existsSync(BACKEND_DIR)) {
      throw new Error(
        `${BACKEND_DIR} does not exist. Run: npm run feedback:sync-fixtures`,
      );
    }
    const sourceHash = hashFixtureSet(SRC_DIR);
    const backendHash = hashFixtureSet(BACKEND_DIR);
    expect(backendHash, 'backend/tests/fixtures/feedback-contract/ is stale').toBe(sourceHash);
  });
});
