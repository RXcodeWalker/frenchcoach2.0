/**
 * File-based ReviewStatusStore — mirrors fileEnvelopeStore.ts's shape.
 *
 *   data/envelopes/<attemptId>/review.json
 *
 * Sibling to envelope.json since review targets one scoring attempt, not a
 * whole session. Never read by anything under src/domain/igcse/{evidence,
 * judgement,guardrails,envelope}/ — this is a reporting-layer artifact, not a
 * scoring input, same boundary teacherMark.ts already establishes.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { parseReviewStatus } from '../../src/domain/igcse/comparison/reviewStatus';
import type { ReviewStatus } from '../../src/domain/igcse/comparison/reviewStatus';

export interface ReviewStatusStore {
  save(review: ReviewStatus): Promise<void>;
  load(attemptId: string): Promise<ReviewStatus>;
  list(): Promise<string[]>;
}

export function createReviewStore(envelopesRoot: string): ReviewStatusStore {
  const reviewPath = (attemptId: string) => path.join(envelopesRoot, attemptId, 'review.json');

  return {
    async save(review: ReviewStatus): Promise<void> {
      const dir = path.join(envelopesRoot, review.attemptId);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(reviewPath(review.attemptId), JSON.stringify(review, null, 2) + '\n', 'utf8');
    },
    async load(attemptId: string): Promise<ReviewStatus> {
      const raw = await fs.readFile(reviewPath(attemptId), 'utf8');
      return parseReviewStatus(JSON.parse(raw));
    },
    async list(): Promise<string[]> {
      const entries = await fs.readdir(envelopesRoot, { withFileTypes: true });
      const attemptIds: string[] = [];
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        try {
          await fs.access(reviewPath(entry.name));
          attemptIds.push(entry.name);
        } catch {
          // No review.json for this dir — not yet reviewed, skip.
        }
      }
      return attemptIds;
    },
  };
}
