import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createReviewStore } from '../reviewStore';
import { ReviewStatusValidationError } from '../../../src/domain/igcse/comparison/reviewStatus';

let tmpRoot: string;

beforeEach(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'review-store-test-'));
});

afterEach(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

describe('createReviewStore', () => {
  it('round-trips save/load by attemptId', async () => {
    const store = createReviewStore(tmpRoot);
    const review = {
      attemptId: 'attempt-1',
      reviewed: true,
      reviewer: 'alice',
      reviewedAt: '2026-07-12T00:00:00.000Z',
      disagreementResolved: true,
      notes: 'looks fine',
    };

    await store.save(review);
    const loaded = await store.load('attempt-1');

    expect(loaded).toEqual(review);
  });

  it('writes review.json as a sibling to a would-be envelope.json, not merged into it', async () => {
    const store = createReviewStore(tmpRoot);
    await store.save({ attemptId: 'attempt-1', reviewed: false });

    const reviewPath = path.join(tmpRoot, 'attempt-1', 'review.json');
    const raw = await fs.readFile(reviewPath, 'utf8');
    expect(JSON.parse(raw)).toEqual({ attemptId: 'attempt-1', reviewed: false });
  });

  it('list() returns attemptIds that have a review.json', async () => {
    const store = createReviewStore(tmpRoot);
    await store.save({ attemptId: 'attempt-1', reviewed: true });
    await store.save({ attemptId: 'attempt-2', reviewed: false });

    const ids = await store.list();
    expect(ids.sort()).toEqual(['attempt-1', 'attempt-2']);
  });

  it('load() throws ReviewStatusValidationError on malformed JSON', async () => {
    const store = createReviewStore(tmpRoot);
    const dir = path.join(tmpRoot, 'attempt-bad');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'review.json'), JSON.stringify({ reviewed: 'not-a-boolean' }), 'utf8');

    await expect(store.load('attempt-bad')).rejects.toThrow(ReviewStatusValidationError);
  });
});
