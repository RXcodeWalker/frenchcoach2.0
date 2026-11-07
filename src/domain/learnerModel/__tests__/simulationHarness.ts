// ── Shared seeded simulation harness (learner-model §7, phase 3) ─────────────
//
// Extracted from src/domain/learn/__tests__/adaptiveSimulation.test.ts so the
// adaptive-difficulty scenarios (A–M) and the learner-model reader-parity tests
// drive the SAME synthetic learner through the SAME production code:
// buildEvidence → (old) evidence log → beliefReducer → snapshot, and
// (new) skillObservations → learner model. `runDual` runs both side by side.
//
// Test-only module (lives under __tests__, never imported by app code).

import { buildEvidence } from '../../../services/coach/evidenceProjection';
import { reduceEvidenceToBeliefState, projectEvidenceBeliefSnapshot } from '../../../services/coach/beliefReducer';
import { MAX_EVIDENCE_EVENTS } from '../../../services/coach/coachStorage';
import { observationsFromEvents, type ReviewItemLookup } from '../../../services/coach/skillObservations';
import { deriveDemandScore } from '../../learn/demand/deriveDemandLevel';
import type { CognitiveDemand, DemandProvenance, QuestionDemands, ResponseLoad } from '../../learn/demand/types';
import type { Question, FeedbackV2, CoachingIssue, ExamAreaMarks, IssueCategory } from '../../../types';
import type { EvidenceEvent } from '../../../types/evidence';
import type { EvidenceBeliefSnapshot } from '../../../types/beliefs';
import type { StoredSession } from '../../../services/analytics/analyticsService';
import { applyObservations, emptyModel, examObservations } from '../update';
import type { LearnerModelState } from '../types';
import type { LevelCheck, MarkingLevel } from '../../learn/marking/markingLevel';
import { scoreLearnAttempt } from '../../../features/learn/markingLevel';

// ── Seeded RNG (mulberry32) — deterministic across runs/platforms. ─────────────
export function mulberry32(seed: number): () => number {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function logistic(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * computeEventWeight's recencyWeight is Date.now()-relative (14-day half-
 * life) — a fixed calendar date drifts arbitrarily far in the past as real
 * time passes and would silently decay every synthetic event below
 * MIN_RELIABLE_WEIGHT. All simulated timestamps must stay anchored to "now".
 */
export function recentIso(offsetMinutes: number): string {
  return new Date(Date.now() + offsetMinutes * 60_000).toISOString();
}

export const ALL_DEMANDS: CognitiveDemand[] = ['describe', 'explain', 'justify', 'compare', 'hypothesize'];

// ── Per-demand marker phrases — reused so synthesized transcripts trigger the
// SAME closed-list detectors evaluateDemandSatisfaction (docs §9.3) reads. ─────
export const MET_MARKER: Record<CognitiveDemand, string> = {
  describe: '', // describe has no dedicated marker; word count alone decides (docs §9.3)
  explain: 'parce que il y a beaucoup de raisons importantes',
  justify: 'je pense que c\'est vrai parce que',
  compare: 'd\'un côté c\'est bien, d\'autre part ce n\'est pas parfait',
  hypothesize: 'si tu avais le temps je pense que ce serait super',
};

export const RESPONSE_LOAD_MIN_WORDS: Record<ResponseLoad, number> = { short: 15, developed: 40, extended: 70 };

export function fillerWords(n: number): string {
  const bank = ['le', 'chat', 'mange', 'la', 'pomme', 'dans', 'jardin', 'avec', 'mon', 'ami', 'aujourd\'hui', 'très', 'joli'];
  const words: string[] = [];
  for (let i = 0; i < n; i++) words.push(bank[i % bank.length]);
  return words.join(' ');
}

/** Synthesize a transcript that resolves to `met` under evaluateDemandSatisfaction. */
export function metTranscript(demand: CognitiveDemand, responseLoad: ResponseLoad): string {
  const minWords = RESPONSE_LOAD_MIN_WORDS[responseLoad];
  const marker = MET_MARKER[demand];
  const padded = `${marker} ${fillerWords(minWords)}`.trim();
  return padded;
}

/** Synthesize a transcript that resolves to `not_attempted` (well below the floor). */
export function notAttemptedTranscript(): string {
  return fillerWords(2);
}

/** Synthesize a transcript that resolves to `unknown` (clears the floor, no marker — never possible for 'describe', which has no marker path). */
export function unknownTranscript(responseLoad: ResponseLoad): string {
  const minWords = RESPONSE_LOAD_MIN_WORDS[responseLoad];
  return fillerWords(minWords);
}

export function makeDemands(cognitiveDemand: CognitiveDemand, overrides: Partial<QuestionDemands> = {}): QuestionDemands {
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
export function makeQuestion(demand: CognitiveDemand, overrides: Partial<QuestionDemands> = {}, provenance: DemandProvenance = 'authored'): Question {
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
export function buildPool(): Question[] {
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

export function makeFeedback(finalScore: number): FeedbackV2 {
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

export interface AttemptOutcome {
  events: EvidenceEvent[];
  verdict: 'met' | 'not_attempted' | 'unknown';
  /** The graded feedback the events were built from. */
  feedback: FeedbackV2;
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
export function simulateAttempt(args: {
  question: Question;
  trueAbility: number;
  rng: () => number;
  unknownRate: number;
  sessionId: string;
  occurredAt: string;
  /** docs §9.1: when the backend never resolved demands (unknown id / hash mismatch), L2 must not run either — scenario J exercises this pure-L1 path. */
  skipL2GapFill?: boolean;
  /** learner-model harness: grammar issues the marker found in this answer (become skill-node failures). */
  issues?: CoachingIssue[];
  /** learner-model harness: the ladder level check the backend returned (learn-marking §8). */
  levelCheck?: LevelCheck;
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
  if (args.issues) {
    // runDual answers look like real LLM-marked ones (engine + word count), so
    // their language events carry a realistic weight instead of an offline,
    // zero-word one that the reliability gate would always drop.
    feedback.issues = args.issues;
    feedback.wordCount = transcript.split(/\s+/).filter(Boolean).length;
    feedback.engineMeta = { actualEngine: 'groq' } as FeedbackV2['engineMeta'];
  }
  if (args.levelCheck) feedback.levelCheck = args.levelCheck;
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

  return { events, verdict, feedback };
}


// ── Dual pipeline: old evidence snapshot and new learner model, side by side ──

export const DAY_MS = 86_400_000;

export interface SyntheticLearner {
  /** Hidden ability per cognitive demand (0–10, the demandScore scale). */
  demandAbility: Partial<Record<CognitiveDemand, number>>;
  /** Hidden error rate per marker issue category: P(the marker flags it in one answer). */
  issueRates?: Partial<Record<IssueCategory, number>>;
  /** Hidden share of marks per 0520 area, for simulated Exam Sims. */
  examAreaRates?: { rolePlay: number; communication: number; qualityOfLanguage: number };
}

export interface DualDayPlan {
  day: number;
  answers: number;
  /** An Exam Sim sat that day: counted (ADR 0007) or practice-only (Coached/typed/resumed/early start). */
  exam?: 'counted' | 'practiceOnly';
  /** Fixed marks for that exam instead of drawing them from examAreaRates. */
  examMarks?: ExamAreaMarks;
}

export interface DualState {
  day: number;
  now: number;
  /** The evidence log as the app keeps it (capped at MAX_EVIDENCE_EVENTS). */
  log: EvidenceEvent[];
  /** Every event ever produced (uncapped). */
  allEvents: EvidenceEvent[];
  oldSnapshot: EvidenceBeliefSnapshot;
  model: LearnerModelState;
  /** Newest first, as getSessionHistory returns them. */
  sessions: StoredSession[];
  /** The marked score each answer was SHOWN at the chosen marking level (display/XP only). */
  markedScores: (number | null)[];
}

export interface DualOptions {
  learner: SyntheticLearner;
  plan: DualDayPlan[];
  seed: number;
  /** Day 0, ms. Every step sets the clock to startMs + day × DAY_MS (+ minutes). */
  startMs: number;
  /** The old reducer reads Date.now(): tests pass vi.setSystemTime. */
  setNow: (ms: number) => void;
  pool?: Question[];
  unknownRate?: number;
  /** Review-pool lookup used for the review-gap weight (absent: none). */
  reviewItem?: (questionId: string) => ReviewItemLookup | undefined;
  /** learn-marking §8: the learner's marking level, with the ladder check every answer carries. */
  marking?: { level: MarkingLevel; levelCheck: LevelCheck };
  onDay?: (state: DualState) => void;
}

function issue(category: IssueCategory, n: number): CoachingIssue {
  return { id: `iss-${category}-${n}`, category, severity: 'minor', quote: 'x', diagnostic: '', correction: '', marksImpact: 1 } as CoachingIssue;
}

function drawMarks(rates: NonNullable<SyntheticLearner['examAreaRates']>, rng: () => number): ExamAreaMarks {
  const mark = (rate: number, max: number) => Math.max(0, Math.min(max, Math.round(rate * max + (rng() - 0.5) * 2)));
  const rolePlay = mark(rates.rolePlay, 15);
  const communication = mark(rates.communication, 15);
  const qualityOfLanguage = mark(rates.qualityOfLanguage, 15);
  return { rolePlay, rolePlayMax: 15, communication, qualityOfLanguage, total: rolePlay + communication + qualityOfLanguage };
}

/**
 * Runs the plan through BOTH pipelines. Each answer is one real buildEvidence
 * call; the old side appends it to a capped log and re-reduces, the new side
 * converts it once (skillObservations) and folds it into the model. Exams go
 * to the session list (old coach reads them there) and to the model through
 * examObservations (counted only).
 */
export function runDual(opts: DualOptions): DualState {
  const rng = mulberry32(opts.seed);
  const pool = opts.pool ?? buildPool();
  const unknownRate = opts.unknownRate ?? 0.15;
  let log: EvidenceEvent[] = [];
  const allEvents: EvidenceEvent[] = [];
  let model = emptyModel('sim-device');
  const sessions: StoredSession[] = [];
  const markedScores: (number | null)[] = [];
  let k = 0;
  let issueN = 0;
  let state: DualState | null = null;

  for (const day of opts.plan) {
    for (let i = 0; i < day.answers; i++) {
      const now = opts.startMs + day.day * DAY_MS + i * 60_000;
      opts.setNow(now);
      const question = pool[k % pool.length];
      k += 1;
      const issues: CoachingIssue[] = [];
      for (const [category, rate] of Object.entries(opts.learner.issueRates ?? {})) {
        if (rng() < (rate ?? 0)) issues.push(issue(category as IssueCategory, issueN++));
      }
      const demand = question.demands!.cognitiveDemand;
      const outcome = simulateAttempt({
        question,
        trueAbility: opts.learner.demandAbility[demand] ?? 4.5,
        rng,
        unknownRate,
        sessionId: `sim-${day.day}-${i}`,
        occurredAt: new Date(now).toISOString(),
        issues,
        levelCheck: opts.marking?.levelCheck,
      });
      // What Learn shows and rewards at the chosen level (never fed to evidence).
      if (opts.marking) markedScores.push(scoreLearnAttempt(outcome.feedback, opts.marking.level, 0).marked.score);
      log = [...log, ...outcome.events].slice(-MAX_EVIDENCE_EVENTS);
      allEvents.push(...outcome.events);
      model = applyObservations(model, observationsFromEvents(outcome.events, opts.reviewItem), now);
      sessions.unshift({ id: `sim-${day.day}-${i}`, date: new Date(now).toISOString(), mode: 'practice', topicKey: question.topicKey, score: 6 } as StoredSession);
    }
    if (day.exam) {
      const now = opts.startMs + day.day * DAY_MS + 12 * 3_600_000;
      opts.setNow(now);
      const marks = day.examMarks ?? drawMarks(opts.learner.examAreaRates ?? { rolePlay: 0.6, communication: 0.6, qualityOfLanguage: 0.6 }, rng);
      const session = {
        id: `sim-exam-${day.day}`, date: new Date(now).toISOString(), mode: 'exam', score: marks.total / 4,
        practiceOnly: day.exam === 'practiceOnly', examMarks: marks,
      } as StoredSession;
      sessions.unshift(session);
      model = applyObservations(model, examObservations({ sessionId: session.id, date: session.date, mode: 'exam', practiceOnly: session.practiceOnly, marks }), now);
    }
    const now = opts.startMs + day.day * DAY_MS + 20 * 3_600_000;
    opts.setNow(now);
    state = {
      day: day.day,
      now,
      log,
      allEvents: [...allEvents],
      oldSnapshot: projectEvidenceBeliefSnapshot(reduceEvidenceToBeliefState(log), undefined),
      model,
      sessions: [...sessions],
      markedScores: [...markedScores],
    };
    opts.onDay?.(state);
  }
  if (!state) throw new Error('runDual: empty plan');
  return state;
}

/** Re-read both sides at a later time without new answers (e.g. after a break). */
export function readDualAt(state: DualState, now: number, setNow: (ms: number) => void): DualState {
  setNow(now);
  return { ...state, now, oldSnapshot: projectEvidenceBeliefSnapshot(reduceEvidenceToBeliefState(state.log), undefined) };
}

/** `days` consecutive practice days of `answers` each, starting at `from`. */
export function dailyPlan(days: number, answers: number, from = 0): DualDayPlan[] {
  return Array.from({ length: days }, (_, i) => ({ day: from + i, answers }));
}
