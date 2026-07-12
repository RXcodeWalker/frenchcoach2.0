import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runReviewAttempt } from '../reviewAttempt';
import { createReviewStore } from '../reviewStore';

let tmpRoot: string;

beforeEach(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'review-attempt-test-'));
});

afterEach(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

describe('runReviewAttempt', () => {
  it('writes data/envelopes/<attemptId>/review.json without touching envelope.json', async () => {
    const review = await runReviewAttempt({
      attemptId: 'attempt-1',
      reviewed: true,
      envelopesRoot: tmpRoot,
      reviewer: 'alice',
    });

    expect(review.attemptId).toBe('attempt-1');
    expect(review.reviewed).toBe(true);
    expect(review.reviewer).toBe('alice');
    expect(review.reviewedAt).toBeDefined();

    const store = createReviewStore(tmpRoot);
    const loaded = await store.load('attempt-1');
    expect(loaded).toEqual(review);

    const envelopePath = path.join(tmpRoot, 'attempt-1', 'envelope.json');
    await expect(fs.access(envelopePath)).rejects.toThrow();
  });

  it('omits optional fields when not supplied', async () => {
    const review = await runReviewAttempt({ attemptId: 'attempt-2', reviewed: false, envelopesRoot: tmpRoot });
    expect(review.reviewer).toBeUndefined();
    expect(review.disagreementResolved).toBeUndefined();
    expect(review.notes).toBeUndefined();
  });
});
