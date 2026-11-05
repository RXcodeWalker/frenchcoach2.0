// ── Reader parity: Learn selection (learner-model §7 phase 5, flag learnerModelLearn) ─
//
// Learn reads three things from the learner model once the flag is live: the
// ability read (deriveAbility over the model's demand beliefs), the focus skills
// (the model's selectable weakest) and the skill→structure translation (the
// registry). Each step runs selection twice — once on the old evidence
// snapshot, once on learnerModelSnapshot — with every other input shared.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { runDual, readDualAt, dailyPlan, buildPool, DAY_MS, type DualState } from './simulationHarness';
import { learnerModelSnapshot } from '../../../services/learnerModel/learnerModelViews';
import { deriveAbility } from '../../learn/ability/deriveAbility';
import { computeSessionTarget } from '../../learn/selection/sessionTarget';
import { planSlots } from '../../learn/selection/planSlots';
import { selectQuestions } from '../../learn/selection/selectQuestions';
import { coachFocusMatch } from '../../learn/selection/scoreCandidate';
import { deriveDemandScore, demandScoreToLevel } from '../../learn/demand/deriveDemandLevel';
import { focusStructures, readSkill } from '../read';
import { MARKING_LEVELS, type LevelCheck } from '../../learn/marking/markingLevel';
import ladderFixture from '../../learn/marking/__tests__/fixtures/ladderReply.fam_01_simple_a1.json';
import type { EvidenceBeliefSnapshot } from '../../../types/beliefs';
import type { SessionBlend } from '../../../types/coach';
import type { Question } from '../../../types';

const START = Date.UTC(2026, 9, 1, 8);
const setNow = (ms: number) => vi.setSystemTime(ms);
const BLEND: SessionBlend = { warmupPct: 20, reviewPct: 0, targetSkillPct: 40, stretchPct: 20, choicePct: 20, focusSkillIds: [] };
const LEVEL_RANK = { A1: 0, A2: 1, B1: 2, B2: 3 } as const;

/** authored + reviewed only: their evidence outlives a fortnight in both models, so agreement is the expectation. */
const trustedPool = (): Question[] => buildPool().filter((q) => q.demands!.provenance !== 'inferred');
const LEARNER = { demandAbility: { describe: 7, explain: 6, justify: 3, compare: 5, hypothesize: 2 }, issueRates: { tense: 0.5 } } as const;

function select(snapshot: EvidenceBeliefSnapshot, pool: Question[], focusSkillIds: string[], registry: boolean) {
  const ability = deriveAbility(snapshot);
  const target = computeSessionTarget(ability.abilityScore, 'balanced');
  const slots = planSlots({ sessionBlend: { ...BLEND, focusSkillIds }, sessionTarget: target, count: 5 });
  const { selected } = selectQuestions(
    {
      pool, slots, chosenIds: new Set(), seenIds: new Set(), focusSkillIds,
      ...(registry ? { focusStructures: focusStructures(focusSkillIds) } : {}),
      activeDemandProblem: null, targetLevel: target, getReviewQuestion: () => null,
    },
    { beliefSnapshot: snapshot },
  );
  return { ability, target, selected };
}

/** docs §8.3 hard ceiling: non-stretch, non-choice picks sit at or below today's level unless they were the easiest left (rung 5). */
function ceilingHolds(target: number, selected: ReturnType<typeof select>['selected']): boolean {
  return selected.every((s) => {
    if (s.slot === 'stretch' || s.slot === 'choice' || s.slot === 'review' || s.rung === 5 || !s.question.demands) return true;
    const score = deriveDemandScore(s.question.demands);
    return score <= target + 0.5 && LEVEL_RANK[demandScoreToLevel(score)] <= LEVEL_RANK[demandScoreToLevel(target)];
  });
}

const modelSnap = (state: DualState) => learnerModelSnapshot(state.model, state.now);

beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }));
afterEach(() => vi.useRealTimers());

describe('reader parity — Learn: agreement', () => {
  it.each([1, 2, 3, 4, 5])('seed %i: same ability, same focus, same questions, ceiling holds — every day for 10 days', (seed) => {
    const pool = trustedPool();
    let days = 0;
    runDual({
      learner: LEARNER, plan: dailyPlan(10, 3), seed, startMs: START, setNow, pool,
      onDay: (state) => {
        days += 1;
        const oldRun = select(state.oldSnapshot, pool, state.oldSnapshot.weakestSkillIds.slice(0, 2), false);
        const newSnap = modelSnap(state);
        const newRun = select(newSnap, pool, newSnap.weakestSkillIds.slice(0, 2), true);
        expect(newRun.ability.abilityScore, `day ${state.day}`).toBeCloseTo(oldRun.ability.abilityScore, 10);
        expect(newRun.ability.source).toBe(oldRun.ability.source);
        expect(newSnap.weakestSkillIds.slice(0, 2)).toEqual(state.oldSnapshot.weakestSkillIds.slice(0, 2));
        expect(newRun.selected.map((s) => s.question.id), `day ${state.day}`).toEqual(oldRun.selected.map((s) => s.question.id));
        expect(ceilingHolds(oldRun.target, oldRun.selected)).toBe(true);
        expect(ceilingHolds(newRun.target, newRun.selected)).toBe(true);
      },
    });
    expect(days).toBe(10);
  });

  it('the agreement is not vacuous: real demand evidence moves ability off the cold start in both', () => {
    const state = runDual({ learner: LEARNER, plan: dailyPlan(10, 3), seed: 1, startMs: START, setNow, pool: trustedPool() });
    expect(deriveAbility(state.oldSnapshot).source).toBeUndefined();
    expect(deriveAbility(modelSnap(state)).source).toBeUndefined();
    expect(state.oldSnapshot.weakestSkillIds).toContain('tense_past');
  });
});

describe('reader parity — Learn: intended divergences', () => {
  it('≈ 11-day expiry: after 12 days off, inferred-tag evidence is gone from the old read (cold start); the model keeps a decayed read', () => {
    // The real bank is 99% inferred tags at confidence 0.8: base weight ≈ 0.26.
    const inferred = buildPool()
      .filter((q) => q.demands!.provenance === 'inferred')
      .map((q) => ({ ...q, demands: { ...q.demands!, inferenceConfidence: 0.8 } }));
    const state = runDual({ learner: { demandAbility: { describe: 8, explain: 8, justify: 8, compare: 8, hypothesize: 8 } }, plan: dailyPlan(3, 20), seed: 31, startMs: START, setNow, pool: inferred, unknownRate: 0 });
    expect(deriveAbility(state.oldSnapshot).source).toBeUndefined();
    const later = readDualAt(state, state.now + 12 * DAY_MS, setNow);
    expect(deriveAbility(later.oldSnapshot)).toMatchObject({ source: 'seeded', abilityScore: 4.5 });
    const kept = deriveAbility(modelSnap(later));
    expect(kept.source).toBeUndefined();
    expect(kept.measuredAnswers).toBeGreaterThan(0);
    // Faded, not gone: each read is still above deriveAbility's MIN_DEMAND_CONFIDENCE.
    // Old side: every outcome event expired; only never-gated avoidance entries remain, with no measured answers.
    expect(Object.values(later.oldSnapshot.demands ?? {}).every((d) => d.rawEvidenceCount === 0)).toBe(true);
  });

  it('selectable focus: fluency (and pronunciation) can be the old weakest, never the model\'s Learn focus', () => {
    const state = runDual({ learner: { demandAbility: { describe: 6 }, issueRates: { fluency: 0.9, tense: 0.4 } }, plan: dailyPlan(6, 3), seed: 32, startMs: START, setNow, pool: trustedPool() });
    expect(state.oldSnapshot.weakestSkillIds).toContain('fluency_score');
    const snap = modelSnap(state);
    expect(snap.weakestSkillIds).not.toContain('fluency_score');
    expect(snap.weakestSkillIds).toContain('tense_past');
  });

  it('registry translation: a "connectors" focus now steers toward justification questions (the old table matched nothing)', () => {
    const justification = buildPool().find((q) => q.demands!.cognitiveDemand === 'justify')!;
    const q = { ...justification, demands: { ...justification.demands!, structures: ['justification' as const] } };
    const candidate = { question: q, demandNodeConfidence: null, seen: false, cognitiveDemandUsedThisSession: false };
    const slot = { type: 'target' as const, band: null };
    expect(coachFocusMatch({ candidate, slot, focusSkillIds: ['connectors'], activeDemandProblem: null })).toBe(0);
    expect(coachFocusMatch({ candidate, slot, focusSkillIds: ['connectors'], focusStructures: focusStructures(['connectors']), activeDemandProblem: null })).toBe(1);
    // …and agrees with the old table on a skill it already knew.
    const perfectQ = { ...q, demands: { ...q.demands, structures: ['perfect' as const] } };
    const c2 = { ...candidate, question: perfectQ };
    expect(coachFocusMatch({ candidate: c2, slot, focusSkillIds: ['tense_past'], activeDemandProblem: null }))
      .toBe(coachFocusMatch({ candidate: c2, slot, focusSkillIds: ['tense_past'], focusStructures: focusStructures(['tense_past']), activeDemandProblem: null }));
  });

  it('review-gap weighting: passes on due review items after ≥ 6 days count more in the model (UNVALIDATED ×1.25)', () => {
    const due = () => ({ nextEligibleAt: new Date(START - DAY_MS).toISOString(), lastAnsweredAt: new Date(START - 10 * DAY_MS).toISOString() });
    const plain = runDual({ learner: LEARNER, plan: dailyPlan(4, 3), seed: 33, startMs: START, setNow, pool: trustedPool() });
    const reviewed = runDual({ learner: LEARNER, plan: dailyPlan(4, 3), seed: 33, startMs: START, setNow, pool: trustedPool(), reviewItem: due });
    const a = readSkill(plain.model, 'demand:describe', plain.now)!;
    const b = readSkill(reviewed.model, 'demand:describe', reviewed.now)!;
    expect(b.successWeight).toBeCloseTo(a.successWeight * 1.25, 8);
    expect(b.failureWeight).toBeCloseTo(a.failureWeight, 8);
    // The old reducer never sees the review pool: identical either way.
    expect(reviewed.oldSnapshot.demands).toEqual(plain.oldSnapshot.demands);
  });
});

describe('reader parity — Learn: invariants', () => {
  it('the marking level never changes the ability read or the questions chosen', () => {
    const levelCheck = ladderFixture.response.levelCheck as LevelCheck;
    const pool = trustedPool();
    const runs = MARKING_LEVELS.map((level) =>
      runDual({ learner: LEARNER, plan: dailyPlan(4, 3), seed: 41, startMs: START, setNow, pool, marking: { level, levelCheck } }));
    expect(new Set(runs.map((r) => JSON.stringify(r.markedScores))).size).toBeGreaterThan(1);
    const ids = runs.map((r) => select(modelSnap(r), pool, [], true).selected.map((s) => s.question.id));
    for (const x of ids.slice(1)) expect(x).toEqual(ids[0]);
  });

  it('a practice-only exam changes nothing Learn reads', () => {
    const base = dailyPlan(4, 3);
    const a = runDual({ learner: LEARNER, plan: base, seed: 42, startMs: START, setNow, pool: trustedPool() });
    const b = runDual({ learner: LEARNER, plan: [...base.slice(0, 3), { ...base[3], exam: 'practiceOnly' as const }], seed: 42, startMs: START, setNow, pool: trustedPool() });
    expect(modelSnap(b)).toEqual(modelSnap(a));
  });
});
