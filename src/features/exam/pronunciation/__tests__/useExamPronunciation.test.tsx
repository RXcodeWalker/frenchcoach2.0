// @vitest-environment jsdom
/**
 * The state both pronunciation surfaces share. The Batch 5 client is mocked
 * (its own tests cover normalise/trim/POST), so this pins the orchestration:
 * nothing runs on its own, one tap analyses, a retry re-sends only missing
 * turns, global refusals stop the sequence, hydrate reads but never analyses.
 */
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ConductLogEntry } from '../../../../domain/igcse/session/types';
import type { SessionPart } from '../../../../domain/igcse/stt/types';
import { bad, ev, turn } from '../../../../domain/examPronunciation/__tests__/evidenceFixture';
import { clearAllExamAudio, putTurnAudio } from '../../../../services/exam/pronunciation/examAudioStore';
import type { PartAnalysis, TurnOutcome } from '../../../../services/exam/pronunciation/client';
import { useExamPronunciation, type PronunciationClient } from '../useExamPronunciation';

const SESSION = 's1';

let seq = 0;
function examiner(part: SessionPart): ConductLogEntry {
  seq += 1;
  return {
    kind: 'examiner', seq, atS: seq, part, action: 'READ_MAIN', questionId: 'q', variant: 'main', text: 'Question ?',
    trigger: 'scripted',
  };
}
function candidate(part: SessionPart, transcript: string): ConductLogEntry {
  seq += 1;
  return {
    kind: 'candidate', seq, startS: seq, endS: seq + 1, part, questionId: 'q', transcript, wordCount: 5,
    requestedRepeat: false, relevant: true,
  };
}

/** rolePlay: seq 2; topic1: seq 4 and 6; topic2: seq 8. */
function entries(): ConductLogEntry[] {
  seq = 0;
  return [
    examiner('rolePlay'), candidate('rolePlay', 'Je voudrais vingt euros'),
    examiner('topic1'), candidate('topic1', 'Je vais souvent au cinéma'),
    examiner('topic1'), candidate('topic1', 'Le pain est bon'),
    examiner('topic2'), candidate('topic2', 'Mon frère est grand'),
  ];
}

const EVIDENCE = {
  2: turn(2, [ev('Je'), ev('voudrais'), bad('vingt', 10), ev('euros')], {}, 'rolePlay'),
  4: turn(4, [ev('Je'), ev('vais'), bad('souvent', 12), ev('au'), ev('cinéma')], {}, 'topic1'),
  6: turn(6, [ev('Le'), bad('pain', 15), ev('est'), ev('bon')], {}, 'topic1'),
  8: turn(8, [ev('Mon'), ev('frère'), ev('est'), ev('grand')], {}, 'topic2'),
} as const;

function fakeClient(over: Partial<{ analyse: PronunciationClient['analysePart']; fetch: PronunciationClient['fetchStoredEvidence'] }> = {}) {
  const analysePart = vi.fn<PronunciationClient['analysePart']>(async (args) => {
    const turns: TurnOutcome[] = [];
    for (const e of args.entries) {
      if (e.kind !== 'candidate' || e.part !== args.part) continue;
      const evidence = EVIDENCE[e.seq as keyof typeof EVIDENCE];
      const outcome: TurnOutcome = { turnKey: e.seq, status: 'done', evidence, segments: [{ origStartS: 0, origEndS: 5, trimmedStartS: 0 }] };
      turns.push(outcome);
      args.onTurn?.(outcome);
    }
    return { part: args.part, state: 'done', turns } satisfies PartAnalysis;
  });
  const fetchStoredEvidence = vi.fn<PronunciationClient['fetchStoredEvidence']>(async () => ({ state: 'done', evidence: [] }));
  return { client: { analysePart: over.analyse ?? analysePart, fetchStoredEvidence: over.fetch ?? fetchStoredEvidence } as PronunciationClient, analysePart, fetchStoredEvidence };
}

function setup(over: { enabled?: boolean; client?: PronunciationClient } = {}) {
  const log = entries();
  const fake = fakeClient();
  const client = over.client ?? fake.client;
  const hook = renderHook(() =>
    useExamPronunciation({
      enabled: over.enabled ?? true,
      getSessionId: () => SESSION,
      getEntries: () => log,
      recognizer: 'webspeech',
      client,
    }),
  );
  return { ...hook, ...fake, log };
}

beforeEach(() => {
  clearAllExamAudio();
});
afterEach(() => {
  cleanup();
  clearAllExamAudio();
});

describe('useExamPronunciation', () => {
  it('does nothing on its own: no call until a part is analysed', () => {
    const { analysePart, fetchStoredEvidence, result } = setup();
    expect(analysePart).not.toHaveBeenCalled();
    expect(fetchStoredEvidence).not.toHaveBeenCalled();
    expect(result.current.status).toEqual({ rolePlay: 'idle', topic1: 'idle', topic2: 'idle' });
    expect(result.current.report).toBeNull();
  });

  it('is inert when disabled', async () => {
    const { analysePart, result } = setup({ enabled: false });
    let out;
    await act(async () => {
      out = await result.current.analyse('rolePlay');
    });
    expect(out).toBe('not_enabled');
    expect(analysePart).not.toHaveBeenCalled();
  });

  it('analyses one part on demand and builds the report from the stored rows', async () => {
    const { analysePart, result } = setup();
    await act(async () => {
      await result.current.analyse('topic1');
    });
    expect(analysePart).toHaveBeenCalledTimes(1);
    expect(analysePart.mock.calls[0][0]).toMatchObject({ sessionId: SESSION, part: 'topic1', recognizer: 'webspeech' });
    expect(result.current.status.topic1).toBe('done');
    expect(result.current.status.rolePlay).toBe('idle');
    expect(result.current.analysedTurns).toEqual({ rolePlay: 0, topic1: 2, topic2: 0 });
    const card = result.current.cardFor('topic1')!;
    expect(card.words).toEqual(['souvent', 'pain']);
    expect(card.pattern?.category).toBe('nasalVowel');
    // a card is words and a pattern: no numeric value anywhere on it
    const numbers: unknown[] = [];
    JSON.parse(JSON.stringify(card), (_key, value) => {
      if (typeof value === 'number') numbers.push(value);
      return value;
    });
    expect(numbers).toEqual([]);
    expect(Object.keys(card).sort()).toEqual(['part', 'pattern', 'words']);
  });

  it('analyseAll runs the parts in exam order and fills them in as they finish', async () => {
    const { analysePart, result } = setup();
    await act(async () => {
      await result.current.analyseAll();
    });
    expect(analysePart.mock.calls.map((c) => c[0].part)).toEqual(['rolePlay', 'topic1', 'topic2']);
    expect(result.current.status).toEqual({ rolePlay: 'done', topic1: 'done', topic2: 'done' });
    expect(result.current.report?.parts.map((p) => p.part)).toEqual(['rolePlay', 'topic1', 'topic2']);
  });

  it('analyseAll stops at the first part that does not finish and leaves the rest idle', async () => {
    const analyse = vi.fn<PronunciationClient['analysePart']>(async (args) => ({
      part: args.part,
      state: args.part === 'topic1' ? 'budget_exhausted' : 'done',
      turns: [],
    }));
    const { result } = setup({ client: { ...fakeClient().client, analysePart: analyse } });
    await act(async () => {
      await result.current.analyseAll();
    });
    expect(result.current.status).toEqual({ rolePlay: 'done', topic1: 'budget_exhausted', topic2: 'idle' });
    expect(analyse).toHaveBeenCalledTimes(2);
  });

  it('a retry sends only the turns that have no stored result yet', async () => {
    let first = true;
    const analyse = vi.fn<PronunciationClient['analysePart']>(async (args) => {
      const keys = args.entries.filter((e) => e.kind === 'candidate' && e.part === args.part).map((e) => e.seq);
      if (first) {
        first = false;
        // turn 4 stored, then the part fails on turn 6
        const outcome: TurnOutcome = { turnKey: 4, status: 'done', evidence: EVIDENCE[4] };
        args.onTurn?.(outcome);
        return { part: args.part, state: 'failed', turns: [outcome] };
      }
      expect(keys).toEqual([6]);
      const outcome: TurnOutcome = { turnKey: 6, status: 'done', evidence: EVIDENCE[6] };
      args.onTurn?.(outcome);
      return { part: args.part, state: 'done', turns: [outcome] };
    });
    const { result } = setup({ client: { ...fakeClient().client, analysePart: analyse } });
    await act(async () => {
      await result.current.analyse('topic1');
    });
    expect(result.current.status.topic1).toBe('failed');
    await act(async () => {
      await result.current.analyse('topic1');
    });
    expect(result.current.status.topic1).toBe('done');
    expect(analyse).toHaveBeenCalledTimes(2);
    expect(result.current.report?.parts.find((p) => p.part === 'topic1')?.reportedWords.map((w) => w.word)).toEqual([
      'souvent',
      'pain',
    ]);
  });

  it('a part that is already fully stored resolves done without another request', async () => {
    const { analysePart, result } = setup();
    await act(async () => {
      await result.current.analyse('topic1');
    });
    analysePart.mockClear();
    let out;
    await act(async () => {
      out = await result.current.analyse('topic1');
    });
    expect(out).toBe('done');
    expect(analysePart).not.toHaveBeenCalled();
  });

  it('waits for the latest recording to land in the store before reading the log', async () => {
    const order: string[] = [];
    const log = entries();
    const fake = fakeClient();
    fake.analysePart.mockImplementation(async (args) => {
      order.push('analyse');
      return { part: args.part, state: 'done', turns: [] };
    });
    const { result } = renderHook(() =>
      useExamPronunciation({
        enabled: true,
        getSessionId: () => SESSION,
        getEntries: () => log,
        recognizer: 'webspeech',
        settled: async () => {
          order.push('settled');
        },
        client: fake.client,
      }),
    );
    await act(async () => {
      await result.current.analyse('rolePlay');
    });
    expect(order).toEqual(['settled', 'analyse']);
  });

  it('reports how many speech turns of a part still have a recording in memory', () => {
    const { result } = setup();
    expect(result.current.partAudio('topic1')).toEqual({ speechTurns: 2, withAudio: 0 });
    putTurnAudio(SESSION, 4, new Blob(['x']));
    expect(result.current.partAudio('topic1')).toEqual({ speechTurns: 2, withAudio: 1 });
    expect(result.current.partAudio('rolePlay')).toEqual({ speechTurns: 1, withAudio: 0 });
  });

  it('records which parts have ended (the Coached rail shows a card for each)', () => {
    const { result } = setup();
    act(() => result.current.markPartEnded('rolePlay'));
    act(() => result.current.markPartEnded('rolePlay'));
    act(() => result.current.markPartEnded('topic1'));
    expect(result.current.endedParts).toEqual(['rolePlay', 'topic1']);
  });

  describe('hydrate (report reopen)', () => {
    it('reads stored rows once, marks their parts done and rebuilds the report with no conduct log', async () => {
      const stored = [EVIDENCE[2], EVIDENCE[4], EVIDENCE[6]];
      const fetchStored = vi.fn<PronunciationClient['fetchStoredEvidence']>(async () => ({ state: 'done', evidence: stored }));
      const hook = renderHook(() =>
        useExamPronunciation({
          enabled: true,
          getSessionId: () => SESSION,
          getEntries: () => [], // the in-memory log is gone after a reload
          recognizer: 'webspeech',
          client: { ...fakeClient().client, fetchStoredEvidence: fetchStored },
        }),
      );
      await act(async () => {
        await hook.result.current.hydrate();
        await hook.result.current.hydrate();
      });
      expect(fetchStored).toHaveBeenCalledTimes(1);
      expect(hook.result.current.status).toEqual({ rolePlay: 'done', topic1: 'done', topic2: 'idle' });
      const report = hook.result.current.report!;
      expect(report.transcript.map((t) => t.turnKey)).toEqual([2, 4, 6]);
      expect(report.parts.find((p) => p.part === 'topic1')!.reportedWords.every((w) => w.clip === null)).toBe(true);
    });

    it('a 403 not_enabled from the backend overrides the client gate', async () => {
      const fetchStored = vi.fn<PronunciationClient['fetchStoredEvidence']>(async () => ({ state: 'not_enabled', evidence: [] }));
      const { result } = setup({ client: { ...fakeClient().client, fetchStoredEvidence: fetchStored } });
      await act(async () => {
        await result.current.hydrate();
      });
      expect(result.current.notEnabledByBackend).toBe(true);
    });

    it('does not read when disabled, and ignores a failed read', async () => {
      const off = setup({ enabled: false });
      await act(async () => {
        await off.result.current.hydrate();
      });
      expect(off.fetchStoredEvidence).not.toHaveBeenCalled();

      const failing = vi.fn<PronunciationClient['fetchStoredEvidence']>(async () => ({ state: 'failed', evidence: [] }));
      const on = setup({ client: { ...fakeClient().client, fetchStoredEvidence: failing } });
      await act(async () => {
        await on.result.current.hydrate();
      });
      expect(on.result.current.notEnabledByBackend).toBe(false);
      expect(on.result.current.status.rolePlay).toBe('idle');
    });
  });

  it('reset forgets the attempt, and an analysis still in flight cannot write into the next one', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const analyse = vi.fn<PronunciationClient['analysePart']>(async (args) => {
      await gate;
      const outcome: TurnOutcome = { turnKey: 2, status: 'done', evidence: EVIDENCE[2] };
      args.onTurn?.(outcome);
      return { part: args.part, state: 'done', turns: [outcome] };
    });
    const { result } = setup({ client: { ...fakeClient().client, analysePart: analyse } });
    let pending!: Promise<unknown>;
    act(() => {
      pending = result.current.analyse('rolePlay');
    });
    expect(result.current.status.rolePlay).toBe('running');
    act(() => result.current.reset());
    expect(result.current.status.rolePlay).toBe('idle');
    await act(async () => {
      release();
      await pending;
    });
    expect(result.current.status.rolePlay).toBe('idle');
    expect(result.current.report).toBeNull();
  });

  it('still analyses after React StrictMode’s simulated unmount/remount (the abort controller is replaced, not left aborted)', async () => {
    const log = entries();
    const fake = fakeClient();
    const { result } = renderHook(
      () =>
        useExamPronunciation({
          enabled: true,
          getSessionId: () => SESSION,
          getEntries: () => log,
          recognizer: 'webspeech',
          client: fake.client,
        }),
      { wrapper: StrictMode },
    );
    await act(async () => {
      await result.current.analyse('rolePlay');
    });
    expect(result.current.status.rolePlay).toBe('done');
    const signal = fake.analysePart.mock.calls[0][0].signal!;
    expect(signal.aborted).toBe(false);
  });

  it('an aborted analysis puts the part back to idle rather than leaving it running or failed', async () => {
    const analyse = vi.fn<PronunciationClient['analysePart']>(async () => {
      throw new DOMException('Aborted', 'AbortError');
    });
    const { result } = setup({ client: { ...fakeClient().client, analysePart: analyse } });
    await act(async () => {
      await result.current.analyse('rolePlay');
    });
    expect(result.current.status.rolePlay).toBe('idle');
  });

  it('turns a thrown client error into the failed state', async () => {
    const analyse = vi.fn<PronunciationClient['analysePart']>(async () => {
      throw new Error('boom');
    });
    const { result } = setup({ client: { ...fakeClient().client, analysePart: analyse } });
    await act(async () => {
      await result.current.analyse('rolePlay');
    });
    expect(result.current.status.rolePlay).toBe('failed');
  });
});
