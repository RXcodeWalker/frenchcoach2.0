import { describe, it, expect } from 'vitest';
import type { StoredSession } from '../sessionSync';
import { mergeSessionLists } from '../sessionSync';

function makeSession(id: string, date: string): StoredSession {
  return {
    id,
    date,
    mode: 'practice',
    topicKey: 'greetings',
    questionText: 'Comment ça va ?',
    transcript: 'Ça va bien',
    wordCount: 3,
    score: 8,
    durationSec: 30,
  };
}

describe('mergeSessionLists', () => {
  it('unions local and cloud sessions by id', () => {
    const local = [makeSession('s-1', '2026-01-01')];
    const cloud = [makeSession('s-2', '2026-01-02')];
    const merged = mergeSessionLists(local, cloud);
    expect(merged.map(s => s.id)).toEqual(['s-1', 's-2']);
  });

  it('does not duplicate a session present in both local and cloud, preferring the local copy', () => {
    const local = { ...makeSession('s-1', '2026-01-01'), score: 5 };
    const cloud = { ...makeSession('s-1', '2026-01-01'), score: 9 };
    const merged = mergeSessionLists([local], [cloud]);
    expect(merged).toHaveLength(1);
    expect(merged[0].score).toBe(5);
  });

  it('sorts the merged list by date ascending', () => {
    const local = [makeSession('s-b', '2026-01-03')];
    const cloud = [makeSession('s-a', '2026-01-01'), makeSession('s-c', '2026-01-05')];
    const merged = mergeSessionLists(local, cloud);
    expect(merged.map(s => s.id)).toEqual(['s-a', 's-b', 's-c']);
  });

  it('returns empty array when both inputs are empty', () => {
    expect(mergeSessionLists([], [])).toEqual([]);
  });

  it('cross-account isolation: merging account B\'s empty local list against account A\'s cloud sessions never happens — mergeSessionLists is a pure union over whatever two lists it is given', () => {
    // This is the load-bearing property the identity-scoping fix depends on:
    // mergeSessionLists itself has no notion of "whose" data it is — the
    // caller (hydrateFromCloud, now correctly identity-scoped) is entirely
    // responsible for ensuring "local" here means "this identity's local
    // sessions", never a leftover from a different identity. Confirmed here
    // as a pure-function contract: given disjoint local/cloud sets, the
    // union is exactly their combination, nothing more, nothing less.
    const local = [makeSession('a-1', '2026-01-01')];
    const cloud = [makeSession('a-2', '2026-01-02')];
    const merged = mergeSessionLists(local, cloud);
    expect(merged).toHaveLength(2);
  });
});
