import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { hashCorpus, loadRawCorpus } from '../../../../scripts/authoring/learnCorpusHash';
import type { LearnDemandsFile, QuestionDemands } from '../../../domain/learn/demand/types';
import { byQuestionId, demandsVersion } from '../demandsManifest';

/**
 * Guardrails for the demands corpus (plan Batch 3, verdict #5). `demandsVersion`
 * is a hash over the raw bytes of every demands file, the backend hashes its
 * byte copy, and a mismatch silently sets `demandsResolved: false`, which
 * switches the L2 evidence layer off. Nothing else checked either of these.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = join(HERE, '..', 'demands');
const BACKEND_DIR = join(HERE, '..', '..', '..', '..', 'backend', 'data', 'learn');

describe('demands manifest freshness', () => {
  const files = loadRawCorpus(SOURCE_DIR);

  it('finds the corpus', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('demandsVersion equals the hash of src/data/learn/demands (run `npm run learn:build-manifest`)', () => {
    expect(demandsVersion).toBe(hashCorpus(files));
  });

  it('byQuestionId equals the corpus entries (run `npm run learn:build-manifest`)', () => {
    const fromFiles: Record<string, QuestionDemands> = {};
    for (const { raw } of files) {
      for (const entry of (JSON.parse(raw) as LearnDemandsFile).entries) {
        fromFiles[entry.questionId] = entry.demands;
      }
    }
    expect(byQuestionId).toEqual(fromFiles);
  });
});

// backend/ is a separate repository: CI checks it out, a local clone may not have it.
describe.skipIf(!existsSync(BACKEND_DIR))('frontend/backend demands parity', () => {
  it('backend/data/learn hashes identically to src/data/learn/demands (run `npm run learn:sync-backend`, push backend/)', () => {
    expect(hashCorpus(loadRawCorpus(BACKEND_DIR))).toBe(hashCorpus(loadRawCorpus(SOURCE_DIR)));
  });

  it('backend/data/learn has the same file names as the source corpus', () => {
    expect(loadRawCorpus(BACKEND_DIR).map((f) => f.filename)).toEqual(
      loadRawCorpus(SOURCE_DIR).map((f) => f.filename),
    );
  });
});
