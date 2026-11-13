/**
 * An examiner line's text appears when its voice starts, not before and not
 * long after (owner report 2026-11-13: text and voice used to drift apart).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ORIGINAL_QUESTION_SET_1 } from '../../../data/exam/originalQuestionSets';

const speak = vi.hoisted(() => ({
  calls: [] as { text: string; onStart?: () => void; finish: () => void }[],
}));

vi.mock('../examinerVoice', () => ({
  speakExaminerText: (text: string, _gen: number | undefined, opts: { onStart?: () => void } = {}) =>
    new Promise<void>((resolve) => {
      speak.calls.push({ text, onStart: opts.onStart, finish: resolve });
    }),
}));

vi.mock('../examinerPacing', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../examinerPacing')>()),
  wait: () => Promise.resolve(),
}));

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('SimulationSession — text shown when the voice starts', () => {
  beforeEach(() => {
    speak.calls.length = 0;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('logs and shows the line only once speech starts, with the atS taken before', async () => {
    const { SimulationSession } = await import('../simulationSession');
    const shown: string[] = [];
    const session = new SimulationSession('reveal', ORIGINAL_QUESTION_SET_1, () => 7, {
      onExaminerAction: (a) => shown.push(a.text ?? ''),
    });
    const begun = session.begin();
    await flush();

    expect(speak.calls).toHaveLength(1);
    expect(shown).toEqual([]);
    expect(session.getConductLog().entries).toHaveLength(0);

    speak.calls[0].onStart?.();
    expect(shown).toEqual([speak.calls[0].text]);
    const entries = session.getConductLog().entries;
    expect(entries).toHaveLength(1);
    expect(entries[0].kind === 'examiner' && entries[0].atS).toBe(7);

    speak.calls[0].finish();
    await begun;
    expect(shown).toHaveLength(1);
  });

  it('a line whose voice never starts is still shown when speaking resolves', async () => {
    const { SimulationSession } = await import('../simulationSession');
    const shown: string[] = [];
    const session = new SimulationSession('reveal-silent', ORIGINAL_QUESTION_SET_1, () => 0, {
      onExaminerAction: (a) => shown.push(a.text ?? ''),
    });
    const begun = session.begin();
    await flush();
    speak.calls[0].finish();
    await begun;
    expect(shown).toHaveLength(1);
    expect(session.getConductLog().entries).toHaveLength(1);
  });
});
