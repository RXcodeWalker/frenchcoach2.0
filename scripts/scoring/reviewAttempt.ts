/**
 * CLI: set review status for one scored attempt. Writes/updates
 * data/envelopes/<attemptId>/review.json via reviewStore.ts. Never touches
 * envelope.json — review metadata is a sibling artifact, not a scoring input.
 *
 * Usage:
 *   npm run score:review -- --attempt-id <id> --reviewed
 *                           [--reviewer <name>] [--disagreement-resolved] [--notes "..."]
 */

import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createReviewStore } from './reviewStore';
import type { ReviewStatus } from '../../src/domain/igcse/comparison/reviewStatus';

interface CliArgs {
  attemptId: string;
  reviewed: boolean;
  envelopesRoot: string;
  reviewer?: string;
  disagreementResolved?: boolean;
  notes?: string;
}

function parseArgs(argv: string[]): CliArgs {
  const get = (flag: string): string | undefined => {
    const idx = argv.indexOf(flag);
    return idx === -1 ? undefined : argv[idx + 1];
  };

  const attemptId = get('--attempt-id');
  if (!attemptId) {
    throw new Error('Usage: score:review -- --attempt-id <id> --reviewed [options]');
  }

  return {
    attemptId,
    reviewed: argv.includes('--reviewed'),
    envelopesRoot: get('--envelopes-root') ?? path.join(process.cwd(), 'data', 'envelopes'),
    reviewer: get('--reviewer'),
    disagreementResolved: argv.includes('--disagreement-resolved') ? true : undefined,
    notes: get('--notes'),
  };
}

export async function runReviewAttempt(args: CliArgs): Promise<ReviewStatus> {
  const store = createReviewStore(args.envelopesRoot);

  const review: ReviewStatus = {
    attemptId: args.attemptId,
    reviewed: args.reviewed,
    reviewedAt: new Date().toISOString(),
    ...(args.reviewer !== undefined ? { reviewer: args.reviewer } : {}),
    ...(args.disagreementResolved !== undefined ? { disagreementResolved: args.disagreementResolved } : {}),
    ...(args.notes !== undefined ? { notes: args.notes } : {}),
  };

  await store.save(review);
  return review;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const review = await runReviewAttempt(args);
  console.log(`Wrote review status for ${review.attemptId}: reviewed=${review.reviewed}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}
