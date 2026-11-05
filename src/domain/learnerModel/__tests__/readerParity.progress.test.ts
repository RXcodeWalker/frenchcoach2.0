// ── Reader parity: Progress "Grammar to work on" (learner-model §7 phase 6, flag learnerModelProgress) ─
//
// Old: progressSummary.weakSkills over the projected skill profile (≥ 2 answers,
// below 75%). New: weakSkillsFromModel — the coach's own rule (below 60%,
// confidence > 0.20), practisable skills only — so Progress and the coach stop
// disagreeing about which skills are weak.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { runDual, readDualAt, dailyPlan, DAY_MS, type DualState } from './simulationHarness';
import { weakSkills } from '../../../features/progress/progressSummary';
import { weakSkillsFromModel } from '../../../features/progress/modelWeakSkills';
import { projectSkillProfile } from '../../../services/coach/skillProfileProjection';
import { reduceEvidenceToBeliefState, projectEvidenceBeliefSnapshot } from '../../../services/coach/beliefReducer';
import { observationsFromEvents } from '../../../services/coach/skillObservations';
import { learnerModelCoachFields } from '../../../services/coach/coachBriefInput';
import { applyObservations, emptyModel } from '../update';
import { MARKING_LEVELS, type LevelCheck } from '../../learn/marking/markingLevel';
import ladderFixture from '../../learn/marking/__tests__/fixtures/ladderReply.fam_01_simple_a1.json';
import type { EvidenceEvent } from '../../../types/evidence';

const START = Date.UTC(2026, 9, 1, 8);
const setNow = (ms: number) => vi.setSystemTime(ms);
const LEARNER = { demandAbility: { describe: 6, explain: 5 }, issueRates: { tense: 0.7, gender: 0.3, preposition: 0.2 } } as const;

const oldWeak = (state: DualState) => weakSkills(projectSkillProfile(state.oldSnapshot)).map((w) => w.id);
const newWeak = (state: DualState) => weakSkillsFromModel(state.model, state.now).map((w) => w.id);

beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }));
afterEach(() => vi.useRealTimers());

describe('reader parity — Progress: agreement', () => {
  it.each([1, 2, 3, 4, 5])('seed %i: every skill the new card names is one the old card names too, at the same percentage', (seed) => {
    runDual({
      learner: LEARNER, plan: dailyPlan(10, 3), seed, startMs: START, setNow,
      onDay: (state) => {
        const before = weakSkills(projectSkillProfile(state.oldSnapshot));
        const after = weakSkillsFromModel(state.model, state.now);
        for (const w of after) {
          const match = before.find((b) => b.id === w.id);
          expect(match, `${w.id} day ${state.day}`).toBeDefined();
          expect(w.mastery).toBe(match!.mastery);
        }
      },
    });
  });

  it('…and the new card agrees with the coach\'s own weak skills (the point of the change)', () => {
    const state = runDual({ learner: LEARNER, plan: dailyPlan(10, 3), seed: 1, startMs: START, setNow });
    const coach = learnerModelCoachFields(state.model, state.now).weakestSkillIds.slice(0, 3);
    expect(newWeak(state)).toEqual(coach);
    expect(newWeak(state)).toContain('tense_past');
  });
});

describe('reader parity — Progress: intended divergences', () => {
  it('threshold: a skill between 60% and 75% was "to work on" on Progress but not for the coach; now neither', () => {
    const NOW = START;
    setNow(NOW);
    const ev = (id: string, success: boolean): EvidenceEvent => ({
      id, learnerId: 'local-user', occurredAt: new Date(NOW - 3_600_000).toISOString(), sourceSessionId: id, evidenceType: 'language',
      targetNodeIds: ['opinion'], observation: {}, result: { success },
      reliability: { assessmentConfidence: 0.8, taskValidity: 0.9, signalQuality: 0.9, evaluator: 'llm', rubricVersion: 'x' },
      context: { mode: 'practice', timed: false },
    });
    const events = [ev('a', true), ev('b', true), ev('c', true), ev('d', false)];
    const old = weakSkills(projectSkillProfile(projectEvidenceBeliefSnapshot(reduceEvidenceToBeliefState(events), undefined)));
    expect(old.map((w) => w.id)).toEqual(['opinion']);
    expect(old[0].mastery).toBeGreaterThanOrEqual(60);
    const model = applyObservations(emptyModel('d'), observationsFromEvents(events), NOW);
    expect(weakSkillsFromModel(model, NOW)).toEqual([]);
  });

  it('pronunciation and fluency are not grammar: the old card could name them, the new one never does', () => {
    const state = runDual({ learner: { demandAbility: { describe: 6 }, issueRates: { fluency: 0.9, pronunciation: 0.9, tense: 0.5 } }, plan: dailyPlan(6, 3), seed: 51, startMs: START, setNow });
    expect(oldWeak(state).some((id) => id === 'fluency_score' || id === 'pronunciation')).toBe(true);
    expect(newWeak(state)).not.toContain('fluency_score');
    expect(newWeak(state)).not.toContain('pronunciation');
    expect(newWeak(state)).toContain('tense_past');
  });

  it('expiry: after a month away the old card is empty; the new one still names the faded weakness', () => {
    const state = runDual({ learner: LEARNER, plan: dailyPlan(6, 4), seed: 52, startMs: START, setNow });
    const later = readDualAt(state, state.now + 30 * DAY_MS, setNow);
    expect(oldWeak(later)).toEqual([]);
    expect(newWeak(later)).toContain('tense_past');
  });
});

describe('reader parity — Progress: invariants', () => {
  it('a practice-only exam and the marking level change nothing on the card', () => {
    const base = dailyPlan(4, 3);
    const a = runDual({ learner: LEARNER, plan: base, seed: 61, startMs: START, setNow });
    const b = runDual({ learner: LEARNER, plan: [...base.slice(0, 3), { ...base[3], exam: 'practiceOnly' as const }], seed: 61, startMs: START, setNow });
    expect(newWeak(b)).toEqual(newWeak(a));
    const levelCheck = ladderFixture.response.levelCheck as LevelCheck;
    const runs = MARKING_LEVELS.map((level) => runDual({ learner: LEARNER, plan: base, seed: 61, startMs: START, setNow, marking: { level, levelCheck } }));
    expect(new Set(runs.map((r) => JSON.stringify(r.markedScores))).size).toBeGreaterThan(1);
    for (const r of runs) expect(weakSkillsFromModel(r.model, r.now)).toEqual(weakSkillsFromModel(a.model, a.now));
  });
});
