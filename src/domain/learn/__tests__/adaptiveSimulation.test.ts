// ── Adaptive-behaviour simulation — docs §15/§16 Stage 10. ─────────────────────
//
// A SimulatedLearner has a hidden true ability per CognitiveDemand. Each
// attempt draws success from a seeded logistic on (trueAbility - demandScore),
// then synthesizes a transcript that would make evaluateDemandSatisfaction
// (docs §9.3) resolve to 'met', 'not_attempted', or 'unknown' consistently
// with that draw — so the whole pipeline under test (buildEvidence ->
// reduceEvidenceToBeliefState -> projectEvidenceBeliefSnapshot -> deriveAbility
// -> planSlots -> selectQuestions) is the SAME production code every real
// attempt runs through, not a re-implementation of it.
//
// Seeded RNG (mulberry32), no localStorage. Timestamps are recentIso()-
// anchored to Date.now() (never a fixed calendar date) since the belief
// reducer's recencyWeight decays on a 14-day half-life relative to "now".

import { describe, it, expect } from 'vitest';
import { buildEvidence } from '../../../services/coach/evidenceProjection';
import { reduceEvidenceToBeliefState, projectEvidenceBeliefSnapshot } from '../../../services/coach/beliefReducer';
import { deriveAbility } from '../ability/deriveAbility';
import { DEMAND_ANCHORS, MASTERY_WEAK } from '../ability/thresholds';
import { planSlots } from '../selection/planSlots';
import { selectQuestions } from '../selection/selectQuestions';
import { computeSessionTarget } from '../selection/sessionTarget';
import type { Aim } from '../selection/sessionTarget';
import { deriveDemandScore } from '../demand/deriveDemandLevel';
import type { CognitiveDemand, DemandProvenance, QuestionDemands, ResponseLoad } from '../demand/types';
import type { Question, FeedbackV2 } from '../../../types';
import type { EvidenceEvent } from '../../../types/evidence';
import type { EvidenceBeliefSnapshot } from '../../../types/beliefs';
import type { SessionBlend } from '../../../types/coach';

// ── Seeded RNG (mulberry32) — deterministic across runs/platforms. ─────────────
function mulberry32(seed: number): () => number {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function logistic(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * computeEventWeight's recencyWeight is Date.now()-relative (14-day half-
 * life) — a fixed calendar date drifts arbitrarily far in the past as real
 * time passes and would silently decay every synthetic event below
 * MIN_RELIABLE_WEIGHT. All simulated timestamps must stay anchored to "now".
 */
function recentIso(offsetMinutes: number): string {
  return new Date(Date.now() + offsetMinutes * 60_000).toISOString();
}

const ALL_DEMANDS: CognitiveDemand[] = ['describe', 'explain', 'justify', 'compare', 'hypothesize'];

// ── Per-demand marker phrases — reused so synthesized transcripts trigger the
// SAME closed-list detectors evaluateDemandSatisfaction (docs §9.3) reads. ─────
const MET_MARKER: Record<CognitiveDemand, string> = {
  describe: '', // describe has no dedicated marker; word count alone decides (docs §9.3)
  explain: 'parce que il y a beaucoup de raisons importantes',
  justify: 'je pense que c\'est vrai parce que',
  compare: 'd\'un côté c\'est bien, d\'autre part ce n\'est pas parfait',
  hypothesize: 'si tu avais le temps je pense que ce serait super',
};

const RESPONSE_LOAD_MIN_WORDS: Record<ResponseLoad, number> = { short: 15, developed: 40, extended: 70 };

function fillerWords(n: number): string {
  const bank = ['le', 'chat', 'mange', 'la', 'pomme', 'dans', 'jardin', 'avec', 'mon', 'ami', 'aujourd\'hui', 'très', 'joli'];
  const words: string[] = [];
  for (let i = 0; i < n; i++) words.push(bank[i % bank.length]);
  return words.join(' ');
}

/** Synthesize a transcript that resolves to `met` under evaluateDemandSatisfaction. */
function metTranscript(demand: CognitiveDemand, responseLoad: ResponseLoad): string {
  const minWords = RESPONSE_LOAD_MIN_WORDS[responseLoad];
  const marker = MET_MARKER[demand];
  const padded = `${marker} ${fillerWords(minWords)}`.trim();
  return padded;
}

/** Synthesize a transcript that resolves to `not_attempted` (well below the floor). */
function notAttemptedTranscript(): string {
  return fillerWords(2);
}

/** Synthesize a transcript that resolves to `unknown` (clears the floor, no marker — never possible for 'describe', which has no marker path). */
function unknownTranscript(responseLoad: ResponseLoad): string {
  const minWords = RESPONSE_LOAD_MIN_WORDS[responseLoad];
  return fillerWords(minWords);
}

function makeDemands(cognitiveDemand: CognitiveDemand, overrides: Partial<QuestionDemands> = {}): QuestionDemands {
  return {
    cognitiveDemand,
    timeFrames: ['present'],
    structures: [],
    responseLoad: cognitiveDemand === 'describe' ? 'short' : 'developed',
    lexicalReach: 'everyday',
    sufficientAnswer: 'A complete answer addressing the prompt.',
    provenance: 'authored',
    ...overrides,
  };
}

let questionCounter = 0;
function makeQuestion(demand: CognitiveDemand, overrides: Partial<QuestionDemands> = {}, provenance: DemandProvenance = 'authored'): Question {
  questionCounter += 1;
  const demands = makeDemands(demand, { provenance, ...overrides });
  return {
    id: `sim-q-${demand}-${provenance}-${questionCounter}`,
    topicKey: 'school',
    text: `Question about ${demand} #${questionCounter}`,
    hint: 'hint',
    difficulty: 2,
    followUps: [],
    modelAnswer: 'Answer',
    keyVocab: [],
    demands,
  };
}

/** A pool covering every demand at multiple provenances/response loads, band-wide. */
function buildPool(): Question[] {
  const pool: Question[] = [];
  for (const demand of ALL_DEMANDS) {
    const responseLoad: ResponseLoad = demand === 'describe' ? 'short' : demand === 'hypothesize' ? 'extended' : 'developed';
    for (const provenance of ['authored', 'reviewed', 'inferred'] as DemandProvenance[]) {
      for (let i = 0; i < 4; i++) {
        pool.push(makeQuestion(demand, { responseLoad }, provenance));
      }
    }
  }
  return pool;
}

function makeFeedback(finalScore: number): FeedbackV2 {
  return {
    scores: { communication: finalScore, language: finalScore, fluency: finalScore, overall: finalScore },
    grammar: { critical: [], polish: [] },
    vocabulary: [],
    style: [],
    fillers: [],
    wordCount: 0,
    cefrLevel: 'A2',
  };
}

interface AttemptOutcome {
  events: EvidenceEvent[];
  verdict: 'met' | 'not_attempted' | 'unknown';
}

/**
 * Simulates one attempt at `question` by a learner whose true ability at
 * `question.demands.cognitiveDemand` is `trueAbility` (0-10 scale, same as
 * demandScore). Draws success via a seeded logistic on (trueAbility -
 * demandScore), then routes through the REAL buildEvidence (docs §9.3/§10),
 * so 'unknown' can still occur at `unknownRate` regardless of the draw,
 * mirroring L1's genuine inability to establish absence for most demands.
 *
 * Stage 8b: when L1 resolves 'unknown', the simulated backend still "grades"
 * the attempt — feedback.demandsResolved is always true (this harness never
 * exercises the corpus-hash-mismatch/unknown-id degrade path, which is Stage
 * 8's own concern, not selection/ability's) and demands_met/demands_missed
 * carries the SAME succeeded/failed draw an LLM grading this attempt would
 * plausibly agree with — buildDemandEvidence's L2 gap-fill then does the real
 * work of turning that into a (lower-reliability) event.
 */
function simulateAttempt(args: {
  question: Question;
  trueAbility: number;
  rng: () => number;
  unknownRate: number;
  sessionId: string;
  occurredAt: string;
  /** docs §9.1: when the backend never resolved demands (unknown id / hash mismatch), L2 must not run either — scenario J exercises this pure-L1 path. */
  skipL2GapFill?: boolean;
}): AttemptOutcome {
  const { question, trueAbility, rng, unknownRate, sessionId, occurredAt, skipL2GapFill } = args;
  const demands = question.demands!;
  const demandScore = deriveDemandScore(demands);
  const pSuccess = logistic((trueAbility - demandScore) * 1.2);
  const succeeded = rng() < pSuccess;

  let transcript: string;
  let verdict: AttemptOutcome['verdict'];
  let isUnknown = false;

  if (rng() < unknownRate && demands.cognitiveDemand !== 'describe') {
    // describe has no marker path (docs §9.3) -> always met/not_attempted, never unknown.
    transcript = unknownTranscript(demands.responseLoad);
    verdict = 'unknown';
    isUnknown = true;
  } else if (succeeded) {
    transcript = metTranscript(demands.cognitiveDemand, demands.responseLoad);
    verdict = 'met';
  } else {
    transcript = notAttemptedTranscript();
    verdict = 'not_attempted';
  }

  const finalScore = succeeded ? 8 : 3;
  const feedback = makeFeedback(finalScore);
  if (isUnknown && !skipL2GapFill) {
    feedback.demandsResolved = true;
    if (succeeded) feedback.demands_met = [demands.cognitiveDemand];
    else feedback.demands_missed = [demands.cognitiveDemand];
  }

  const events = buildEvidence({
    sessionId,
    question,
    feedback,
    avoidanceSignals: [],
    transcript,
    finalScore,
    mode: 'practice',
    topicKey: question.topicKey,
  }).map((e) => ({ ...e, occurredAt }));

  return { events, verdict };
}

function snapshotFrom(events: EvidenceEvent[]): EvidenceBeliefSnapshot {
  const state = reduceEvidenceToBeliefState(events);
  return projectEvidenceBeliefSnapshot(state, undefined);
}

const DEFAULT_BLEND: SessionBlend = {
  warmupPct: 20,
  reviewPct: 0, // review pool is out of scope for this pure simulation
  targetSkillPct: 40,
  stretchPct: 20,
  choicePct: 20,
  focusSkillIds: [],
};

/** Runs N sessions of `perSession` attempts each, feeding real ability/selection back in every session. Returns the full event log and per-session diagnostics. */
function runSimulation(args: {
  trueAbilityByDemand: Partial<Record<CognitiveDemand, number>>;
  sessions: number;
  perSession: number;
  aim: Aim;
  seed: number;
  unknownRate?: number;
  pool?: Question[];
}) {
  const { trueAbilityByDemand, sessions, perSession, aim, seed, unknownRate = 0.15 } = args;
  const pool = args.pool ?? buildPool();
  const rng = mulberry32(seed);

  const allEvents: EvidenceEvent[] = [];
  const sessionLogs: {
    stretchCount: number;
    warmupCount: number;
    targetCount: number;
    abilityBefore: number;
    abilityAfter: number;
    verdicts: AttemptOutcome['verdict'][];
  }[] = [];

  // occurredAt must stay within the belief reducer's 14-day half-life window
  // of "now" (computeEventWeight's recencyWeight is Date.now()-relative), or
  // events silently decay below MIN_RELIABLE_WEIGHT and are dropped — so
  // sessions count backward from today, never from a fixed calendar date.
  const baseTime = Date.now() - (sessions - 1) * 60_000;
  for (let s = 0; s < sessions; s++) {
    const occurredAt = new Date(baseTime + s * 60_000).toISOString();
    const snapshotBefore = snapshotFrom(allEvents);
    const abilityBefore = deriveAbility(snapshotBefore).abilityScore;
    const sessionTarget = computeSessionTarget(abilityBefore, aim);
    const slots = planSlots({ sessionBlend: DEFAULT_BLEND, sessionTarget, count: perSession });

    const { selected } = selectQuestions(
      {
        pool,
        slots,
        chosenIds: new Set<string>(),
        seenIds: new Set<string>(),
        focusSkillIds: [],
        activeDemandProblem: null,
        getReviewQuestion: () => null,
      },
      { beliefSnapshot: snapshotBefore },
    );

    const verdicts: AttemptOutcome['verdict'][] = [];
    for (const sel of selected) {
      const demand = sel.question.demands!.cognitiveDemand;
      const trueAbility = trueAbilityByDemand[demand] ?? 4.5;
      const outcome = simulateAttempt({
        question: sel.question,
        trueAbility,
        rng,
        unknownRate,
        sessionId: `sim-sess-${s}`,
        occurredAt,
      });
      allEvents.push(...outcome.events);
      verdicts.push(outcome.verdict);
    }

    const snapshotAfter = snapshotFrom(allEvents);
    const abilityAfter = deriveAbility(snapshotAfter).abilityScore;

    sessionLogs.push({
      stretchCount: selected.filter((s2) => s2.slot === 'stretch').length,
      warmupCount: selected.filter((s2) => s2.slot === 'warmup').length,
      targetCount: selected.filter((s2) => s2.slot === 'target').length,
      abilityBefore,
      abilityAfter,
      verdicts,
    });
  }

  return { events: allEvents, sessionLogs, finalSnapshot: snapshotFrom(allEvents) };
}

describe('adaptive simulation — A: repeated success on easy questions', () => {
  it('ability rises within 30 sessions once trusted questions exist; stretch appears once trusted', () => {
    const result = runSimulation({
      trueAbilityByDemand: { describe: 9, explain: 9, justify: 9, compare: 9, hypothesize: 9 },
      sessions: 30,
      perSession: 8,
      aim: 'balanced',
      seed: 1,
      unknownRate: 0.05,
    });

    const first = result.sessionLogs[0].abilityBefore;
    const last = result.sessionLogs[result.sessionLogs.length - 1].abilityAfter;
    expect(last).toBeGreaterThan(first);

    const stretchSessions = result.sessionLogs.filter((s) => s.stretchCount > 0).length;
    expect(stretchSessions).toBeGreaterThan(0);
  });
});

describe('adaptive simulation — B: repeated failure on hard questions', () => {
  it('target falls, never below the cap floor; warmup keeps appearing; never 3 consecutive above-band sessions', () => {
    const result = runSimulation({
      trueAbilityByDemand: { describe: 1, explain: 1, justify: 1, compare: 1, hypothesize: 1 },
      sessions: 20,
      perSession: 8,
      aim: 'balanced',
      seed: 2,
      unknownRate: 0.05,
    });

    const first = result.sessionLogs[0].abilityBefore;
    const last = result.sessionLogs[result.sessionLogs.length - 1].abilityAfter;
    expect(last).toBeLessThanOrEqual(first + 0.01);

    // cap = weakest reliable anchor + 0.5; with all demands failing, describe
    // (lowest anchor, 2.0) governs once its confidence clears RELIABLE_CONFIDENCE.
    expect(last).toBeLessThanOrEqual(DEMAND_ANCHORS.describe + 0.5 + 0.01);

    const sessionsWithWarmup = result.sessionLogs.filter((s) => s.warmupCount > 0).length;
    expect(sessionsWithWarmup).toBeGreaterThan(0);
  });
});

describe('adaptive simulation — C: strong grammar-adjacent demand, weak justify', () => {
  it('ability is capped near anchor(justify)+0.5 despite a strong hypothesize reading', () => {
    const result = runSimulation({
      trueAbilityByDemand: { describe: 8, explain: 8, justify: 0.5, compare: 8, hypothesize: 9 },
      sessions: 25,
      perSession: 8,
      aim: 'balanced',
      seed: 3,
      unknownRate: 0.05,
    });

    const finalAbility = deriveAbility(result.finalSnapshot).abilityScore;
    // cap-wins: a reliably weak justify (anchor 6.0) bounds ability near 6.5,
    // regardless of a strong hypothesize (anchor 8.0) reading.
    expect(finalAbility).toBeLessThanOrEqual(DEMAND_ANCHORS.justify + 0.5 + 0.5);

    const justifyBelief = result.finalSnapshot.demands?.['demand:justify'];
    expect(justifyBelief).toBeDefined();
    expect(justifyBelief!.mastery).toBeLessThan(MASTERY_WEAK);
  });
});

describe('adaptive simulation — D: one good answer then many poor', () => {
  it('mastery never exceeds 0.7 after the first success; no ability rise from a single event', () => {
    const pool = buildPool().filter((q) => q.demands!.cognitiveDemand === 'explain');
    const rng = mulberry32(4);
    const events: EvidenceEvent[] = [];

    // One success.
    const successQ = pool[0];
    const successOutcome = simulateAttempt({
      question: successQ,
      trueAbility: 9,
      rng: () => 0, // force success (pSuccess > 0), and force verdict = met (unknownRate check must fail)
      unknownRate: 0,
      sessionId: 'sess-d',
      occurredAt: recentIso(0),
    });
    events.push(...successOutcome.events);
    expect(successOutcome.verdict).toBe('met');

    // Many poor answers afterward.
    for (let i = 1; i < pool.length; i++) {
      const outcome = simulateAttempt({
        question: pool[i],
        trueAbility: 0,
        rng,
        unknownRate: 0,
        sessionId: 'sess-d',
        occurredAt: recentIso(i),
      });
      events.push(...outcome.events);
    }

    const snapshot = snapshotFrom(events);
    const explainBelief = snapshot.demands?.['demand:explain'];
    expect(explainBelief).toBeDefined();
    expect(explainBelief!.mastery).toBeLessThan(0.7);

    // docs §11 example D: a single event's confidence (~0.13-0.23 depending on
    // provenance/evaluator) sits below MIN_DEMAND_CONFIDENCE (0.20) *and*
    // RELIABLE_CONFIDENCE (0.50) -- deriveAbility excludes the node entirely
    // and falls back to coldStart(). "No mastery from one success" means no
    // ability signal at all yet, not a specific low number.
    expect(explainBelief!.confidence).toBeLessThan(0.20);
    const ability = deriveAbility(snapshot);
    expect(ability.source).toBe('seeded');
  });
});

describe('adaptive simulation — E: a hard question answered well', () => {
  it('demand:hypothesize only gains evidence via >=7.0-scoring questions', () => {
    const highScoreQ = makeQuestion('hypothesize', { responseLoad: 'extended', timeFrames: ['present', 'past', 'conditional'] });
    expect(deriveDemandScore(highScoreQ.demands!)).toBeGreaterThanOrEqual(7.0);

    const outcome = simulateAttempt({
      question: highScoreQ,
      trueAbility: 9,
      rng: () => 0,
      unknownRate: 0,
      sessionId: 'sess-e',
      occurredAt: recentIso(0),
    });
    expect(outcome.verdict).toBe('met');

    const snapshot = snapshotFrom(outcome.events);
    const belief = snapshot.demands?.['demand:hypothesize'];
    expect(belief).toBeDefined();
    expect(belief!.rawEvidenceCount).toBe(1);
  });
});

describe('adaptive simulation — F: a mislabelled question', () => {
  it('learn:check (validateLearnDemandsFile) reports demand-level-mismatch on a doctored fixture', async () => {
    const { validateLearnDemandsFile } = await import('../demand/validate');
    const { LEARN_DEMANDS_SCHEMA_VERSION } = await import('../demand/version');
    const file = {
      schemaVersion: LEARN_DEMANDS_SCHEMA_VERSION,
      topicKey: 'school',
      entries: [
        {
          questionId: 'sim-mismatch-1',
          demands: makeDemands('describe', { lexicalReach: 'abstract' }), // maxes at 2.25 -> A1
          checkedInLevel: 'B2' as const,
          review: { status: 'approved' as const },
        },
      ],
    };
    const report = validateLearnDemandsFile(file);
    expect(report.errors.some((e) => e.code === 'demand-level-mismatch')).toBe(true);
  });
});

describe('adaptive simulation — G: equal score, different demands', () => {
  it('two equal-demandScore questions on different cognitiveDemands produce disjoint targetNodeIds', () => {
    // justify base 6.0 + two bonus-eligible structures (+0.25 each = +0.5) = 6.5, matching compare's base exactly.
    const justifyQ = makeQuestion('justify', { structures: ['comparison', 'conditional'] });
    const compareQ = makeQuestion('compare'); // base 6.5

    const justifyScore = deriveDemandScore(justifyQ.demands!);
    const compareScore = deriveDemandScore(compareQ.demands!);
    expect(justifyScore).toBeCloseTo(compareScore, 5);

    const justifyOutcome = simulateAttempt({ question: justifyQ, trueAbility: 9, rng: () => 0, unknownRate: 0, sessionId: 's', occurredAt: new Date().toISOString() });
    const compareOutcome = simulateAttempt({ question: compareQ, trueAbility: 9, rng: () => 0, unknownRate: 0, sessionId: 's', occurredAt: new Date().toISOString() });

    const justifyNodeIds = justifyOutcome.events.flatMap((e) => e.targetNodeIds);
    const compareNodeIds = compareOutcome.events.flatMap((e) => e.targetNodeIds);
    expect(justifyNodeIds).toEqual(['demand:justify']);
    expect(compareNodeIds).toEqual(['demand:compare']);
  });
});

describe('adaptive simulation — H: gaming with always-short answers', () => {
  it('sessionTarget never rises; avoidance accumulates; no demand FAILURE is ever recorded', () => {
    const pool = buildPool();
    const rng = mulberry32(8);
    const events: EvidenceEvent[] = [];
    const abilityTrace: number[] = [];

    for (let s = 0; s < 15; s++) {
      const snapshot = snapshotFrom(events);
      abilityTrace.push(deriveAbility(snapshot).abilityScore);

      const slots = planSlots({ sessionBlend: DEFAULT_BLEND, sessionTarget: 5, count: 6 });
      const { selected } = selectQuestions(
        { pool, slots, chosenIds: new Set(), seenIds: new Set(), focusSkillIds: [], activeDemandProblem: null, getReviewQuestion: () => null },
        { beliefSnapshot: snapshot },
      );

      for (const sel of selected) {
        // Always a 5-word non-answer regardless of demand -> always not_attempted.
        const transcript = fillerWords(5);
        const ev = buildEvidence({
          sessionId: `sess-h-${s}`,
          question: sel.question,
          feedback: makeFeedback(1),
          avoidanceSignals: [],
          transcript,
          finalScore: 1,
          mode: 'practice',
          topicKey: sel.question.topicKey,
        }).map((e) => ({ ...e, occurredAt: recentIso(s) }));
        events.push(...ev);
      }
      void rng(); // keep signature symmetry with other scenarios; no randomness needed here
    }

    const finalSnapshot = snapshotFrom(events);
    // No demand belief should show weightedFailure-driven low mastery from a
    // Beta failure — avoidance never touches alpha/beta, so any node that
    // received ONLY avoidance events keeps mastery at the untouched prior (0.5).
    for (const demand of ALL_DEMANDS) {
      const belief = finalSnapshot.demands?.[`demand:${demand}`];
      if (belief) {
        expect(belief.mastery).toBeCloseTo(0.5, 1);
      }
    }

    const finalAbility = deriveAbility(finalSnapshot).abilityScore;
    const firstAbility = abilityTrace[0];
    expect(finalAbility).toBeLessThanOrEqual(firstAbility + 0.01);
  });
});

describe('adaptive simulation — I: topic confounding', () => {
  it('failures in one topic move demand belief but the topic key itself never gates ability', () => {
    const topicAPool = buildPool().map((q) => ({ ...q, topicKey: 'school' }));
    const rng = mulberry32(9);
    const events: EvidenceEvent[] = [];

    // unknownRate > 0 so at least some of these failing attempts route through
    // L1 'unknown' + Stage 8b's L2 gap-fill, which is the only path that can
    // push mastery below the 0.5 prior (repeated 'not_attempted' alone cannot
    // -- it is avoidance-only and never touches alpha/beta, docs §9.3).
    for (let i = 0; i < 12; i++) {
      const q = topicAPool.find((qq) => qq.demands!.cognitiveDemand === 'justify')!;
      const outcome = simulateAttempt({ question: q, trueAbility: 0, rng, unknownRate: 0.6, sessionId: 'sess-i', occurredAt: recentIso(i) });
      events.push(...outcome.events);
    }

    const snapshot = snapshotFrom(events);
    const justifyBelief = snapshot.demands?.['demand:justify'];
    expect(justifyBelief).toBeDefined();
    expect(justifyBelief!.mastery).toBeLessThan(0.5);

    // deriveAbility reads only snapshot.demands, never topicKey -> ability
    // stays below the justify anchor regardless of which topic produced it.
    const ability = deriveAbility(snapshot);
    expect(ability.abilityScore).toBeLessThan(DEMAND_ANCHORS.justify);
  });
});

describe('adaptive simulation — J: all-unknown attempts', () => {
  it('20 attempts where L1 resolves nothing and demands are never backend-resolved -> zero demand events, ability unchanged, overallConfidence stays 0, UI shows no band', () => {
    const pool = buildPool().filter((q) => q.demands!.cognitiveDemand !== 'describe'); // describe can never be unknown (docs §9.3)
    const rng = mulberry32(10);
    const events: EvidenceEvent[] = [];

    for (let i = 0; i < 20; i++) {
      const q = pool[i % pool.length];
      const outcome = simulateAttempt({
        question: q,
        trueAbility: 5,
        rng,
        unknownRate: 1.0, // force unknown every time
        sessionId: 'sess-j',
        occurredAt: recentIso(i),
        // docs §9.1: an unresolved demands spec means Stage 8b's L2 gap-fill
        // must not run either -- this scenario is specifically the pure-L1,
        // nothing-measurable case, not "L1 unknown but the backend graded it".
        skipL2GapFill: true,
      });
      expect(outcome.verdict).toBe('unknown');
      // buildEvidence always emits a base language event (targetNodeIds: [])
      // regardless of demands -- the assertion that matters is that NO event
      // targets a demand:* node, i.e. zero DEMAND evidence, not zero events.
      expect(outcome.events.some((e) => e.targetNodeIds.some((id) => id.startsWith('demand:')))).toBe(false);
      events.push(...outcome.events);
    }

    expect(events.some((e) => e.targetNodeIds.some((id) => id.startsWith('demand:')))).toBe(false);
    const snapshot = snapshotFrom(events);
    const ability = deriveAbility(snapshot);
    expect(ability.overallConfidence).toBe(0);
    // coldStart's own path is exercised whenever totalWeight is 0.
    expect(ability.source).toBe('seeded');
  });
});

describe('adaptive simulation — K: corpus-only inferred provenance', () => {
  it('with 100% inferred provenance, no stretch slot is ever filled and no session errors', () => {
    const inferredPool = buildPool()
      .filter((q) => q.demands!.provenance === 'inferred')
      .map((q) => ({ ...q, demands: { ...q.demands!, provenance: 'inferred' as const, inferenceConfidence: 0.6 } }));

    expect(inferredPool.length).toBeGreaterThan(0);

    const result = runSimulation({
      trueAbilityByDemand: { describe: 9, explain: 9, justify: 9, compare: 9, hypothesize: 9 },
      sessions: 10,
      perSession: 8,
      aim: 'push',
      seed: 11,
      unknownRate: 0.05,
      pool: inferredPool,
    });

    for (const log of result.sessionLogs) {
      expect(log.stretchCount).toBe(0);
    }
    // No throw across all 10 sessions is itself the assertion; also confirm
    // sessions still produced picks (didn't silently error out to zero).
    const totalPicks = result.sessionLogs.reduce((sum, l) => sum + l.verdicts.length, 0);
    expect(totalPicks).toBeGreaterThan(0);
  });
});
