/**
 * W1 session-model tests: `coached` selects the engine's ConductPolicy
 * (docs/systems/exam-conduct-0520.md §24 — Coached has no time-BASED gating,
 * but always asks both authored further questions, D5), the session clock
 * reaches the engine on every turn, and `inputMode` threads through unchanged
 * into the ConductLog's candidate entries.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SimulationSession } from '../simulationSession';
import type { SimulationTurnInput } from '../simulationSession';
import { ORIGINAL_QUESTION_SET_1 } from '../../../data/exam/originalQuestionSets';

// The driver's inter-action pauses are real timers; they don't affect conduct, so skip them.
vi.mock('../examinerPacing', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../examinerPacing')>()),
  wait: () => Promise.resolve(),
}));

const qs = ORIGINAL_QUESTION_SET_1;

/** Fixed-length scripted turn sequence — real French answers, mixed mic/text, well above the relevance word floor. */
const SCRIPT: SimulationTurnInput[] = [
  { transcript: 'Je voudrais aller à la gare de Lyon, s\'il vous plaît.', responseDurationS: 5, requestedRepeat: false, inputMode: 'speech' },
  { transcript: 'Je voudrais partir vers dix heures du matin.', responseDurationS: 0, requestedRepeat: false, inputMode: 'text' },
  { transcript: 'Un aller-retour, s\'il vous plaît.', responseDurationS: 3, requestedRepeat: false, inputMode: 'speech' },
  { transcript: 'En deuxième classe, merci beaucoup.', responseDurationS: 0, requestedRepeat: false, inputMode: 'text' },
  { transcript: 'Je vais voyager avec ma famille cette fois-ci.', responseDurationS: 4, requestedRepeat: false, inputMode: 'speech' },
  { transcript: 'Non merci, ce sera tout pour aujourd\'hui.', responseDurationS: 0, requestedRepeat: false, inputMode: 'text' },
];

function makeClock(initialT = 0) {
  let t = initialT;
  return {
    now: () => t,
    advance: (deltaS: number) => {
      t += deltaS;
    },
  };
}

async function driveScript(coached: boolean) {
  const clock = makeClock();
  const session = new SimulationSession('parity-session', qs, clock.now, {}, coached);
  await session.begin();
  for (const turn of SCRIPT) {
    clock.advance(turn.responseDurationS);
    await session.submitTurn(turn);
  }
  return session.getConductLog();
}

describe('SimulationSession — coached flag / inputMode plumbing (W1)', () => {
  beforeEach(() => {
    // interpretUtterance is a fire-and-forget live-routing hint; stubbing fetch
    // to reject keeps every turn on the deterministic fallback with zero real
    // network calls, so the test is fast and hermetic.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('no network in test')));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('role-play conduct is identical in both modes: same ConductLog for coached:true and coached:false', async () => {
    const coachedLog = await driveScript(true);
    const uncoachedLog = await driveScript(false);

    expect(JSON.stringify(coachedLog)).toBe(JSON.stringify(uncoachedLog));
  });

  it('passes the mode to the engine as its ConductPolicy', async () => {
    const sim = new SimulationSession('s-sim', qs, () => 0, {}, false);
    const coached = new SimulationSession('s-coached', qs, () => 0, {}, true);
    await sim.begin();
    await coached.begin();
    expect(sim.getSnapshot().engineState.policy).toEqual({ mode: 'examSim' });
    expect(coached.getSnapshot().engineState.policy).toEqual({ mode: 'coached' });
  });

  /** Drives role play + topic 1 with developed answers, `gapS` of session clock per turn; returns the FURTHER_QUESTIONs asked in topic 1. */
  async function topic1FurtherQuestions(coached: boolean, gapS: number) {
    const clock = makeClock();
    const session = new SimulationSession('floor-session', qs, clock.now, {}, coached);
    await session.begin();
    let guard = 0;
    while (session.action?.part !== 'topic2' && guard++ < 40) {
      clock.advance(gapS);
      await session.submitTurn({
        transcript: "Je joue souvent au tennis avec mon frère le samedi parce que c'est amusant.",
        responseDurationS: 5,
        requestedRepeat: false,
      });
    }
    return session.getConductLog().entries.filter(
      (e) => e.kind === 'examiner' && e.action === 'FURTHER_QUESTION' && e.part === 'topic1',
    );
  }

  it('examSim: measures the 3½-min floor on the session clock, not the candidate\'s speaking time (exam-conduct §16)', async () => {
    // 5 s of speech per answer either way; only the clock between turns differs.
    expect(await topic1FurtherQuestions(false, 10)).toHaveLength(2); // ~1 min conversation
    expect(await topic1FurtherQuestions(false, 50)).toHaveLength(0); // ~5 min conversation
  });

  it('coached (D5, Batch 3): always asks both further questions, not time-gated', async () => {
    expect(await topic1FurtherQuestions(true, 10)).toHaveLength(2); // ~1 min conversation
    expect(await topic1FurtherQuestions(true, 50)).toHaveLength(2); // ~5 min conversation — still asked
  });

  it('exposes `coached` via a read-only getter, defaulting to false when omitted', () => {
    const defaulted = new SimulationSession('s1', qs, () => 0);
    expect(defaulted.coached).toBe(false);

    const coached = new SimulationSession('s2', qs, () => 0, {}, true);
    expect(coached.coached).toBe(true);

    const uncoached = new SimulationSession('s3', qs, () => 0, {}, false);
    expect(uncoached.coached).toBe(false);
  });

  it('threads inputMode from SimulationTurnInput onto the ConductLog candidate entries', async () => {
    const log = await driveScript(false);
    const candidateEntries = log.entries.filter((e) => e.kind === 'candidate');

    expect(candidateEntries.length).toBe(SCRIPT.length);
    candidateEntries.forEach((entry, i) => {
      expect(entry.kind === 'candidate' && entry.inputMode).toBe(SCRIPT[i].inputMode);
    });
  });
});

describe('SimulationSession — reload-resume snapshot (W7)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('no network in test')));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('refuses to resume a snapshot saved by an older engine (no ConductPolicy / topic start times)', async () => {
    const session = new SimulationSession('old-engine', qs, () => 0);
    await session.begin();
    const snapshot = session.getSnapshot();
    const { policy: _policy, partStartS: _partStartS, ...v3EngineState } = snapshot.engineState;
    void _policy;
    void _partStartS;
    const v3Snapshot = { ...snapshot, engineState: v3EngineState as typeof snapshot.engineState };
    expect(() => new SimulationSession('old-engine', qs, () => 0, {}, false, v3Snapshot)).toThrow(/older session engine/);
  });

  it('getSnapshot() throws before begin() — nothing to resume from yet', () => {
    const session = new SimulationSession('s1', qs, () => 0);
    expect(() => session.getSnapshot()).toThrow();
  });

  it('a session resumed mid-script from getSnapshot() produces the same ConductLog as one driven straight through, uninterrupted', async () => {
    const SPLIT = 3; // resume partway through SCRIPT, not at either end

    // Uninterrupted control run.
    const controlClock = makeClock();
    const control = new SimulationSession('resume-parity', qs, controlClock.now);
    await control.begin();
    for (const turn of SCRIPT) {
      controlClock.advance(turn.responseDurationS);
      await control.submitTurn(turn);
    }

    // "Reload" run: real SimulationSession up to SPLIT, snapshot, then a
    // brand-new instance (a fresh clock too — a real reload restarts
    // performance.now()) picks up from exactly there.
    const firstHalfClock = makeClock();
    const firstHalf = new SimulationSession('resume-parity', qs, firstHalfClock.now);
    await firstHalf.begin();
    for (const turn of SCRIPT.slice(0, SPLIT)) {
      firstHalfClock.advance(turn.responseDurationS);
      await firstHalf.submitTurn(turn);
    }
    const snapshot = firstHalf.getSnapshot();

    // Mirrors ExamMode's resume effect: a real reload restarts performance.now()
    // at 0, so the new clock is offset to continue monotonically from the last
    // timestamp already in the snapshot's entries, not reset alongside it.
    const offsetS = snapshot.entries.reduce(
      (max, e) => Math.max(max, e.kind === 'examiner' ? e.atS : e.endS),
      0,
    );
    const secondHalfClock = makeClock(offsetS);
    const resumed = new SimulationSession('resume-parity', qs, secondHalfClock.now, {}, false, snapshot);
    // No begin() on resume — the snapshot's currentAction is already what the
    // candidate should see, exactly like ExamMode's resume effect.
    expect(resumed.action).toEqual(snapshot.currentAction);
    expect(resumed.getConductLog().entries).toEqual(snapshot.entries);

    for (const turn of SCRIPT.slice(SPLIT)) {
      secondHalfClock.advance(turn.responseDurationS);
      await resumed.submitTurn(turn);
    }

    expect(JSON.stringify(resumed.getConductLog().entries)).toBe(JSON.stringify(control.getConductLog().entries));
    expect(resumed.isComplete).toBe(control.isComplete);
  });
});
