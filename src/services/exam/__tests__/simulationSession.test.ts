/**
 * W1 session-model tests: the `coached` flag and per-turn `inputMode` are pure
 * plumbing on SimulationSession — `coached` must never reach conductEngine
 * (see the exam-overhaul plan's Invariant 1: "the rail is not a fourth
 * scoring layer"), and `inputMode` must thread through unchanged into the
 * built SessionTranscript's candidate utterances.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SimulationSession } from '../simulationSession';
import type { SimulationTurnInput } from '../simulationSession';
import { ORIGINAL_QUESTION_SET_1 } from '../../../data/exam/originalQuestionSets';

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

  it('produces a byte-identical ConductLog for coached:true and coached:false given the same scripted turns', async () => {
    const coachedLog = await driveScript(true);
    const uncoachedLog = await driveScript(false);

    expect(JSON.stringify(coachedLog)).toBe(JSON.stringify(uncoachedLog));
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
