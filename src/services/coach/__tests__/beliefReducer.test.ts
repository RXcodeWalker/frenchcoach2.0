// ── Phase 2 belief reducer tests ──────────────────────────────────────────────
//
// These are pure-function unit tests — no localStorage, no React, no network.
// Each test group focuses on one behaviour of the reducer pipeline.
//
// Weight estimates used in expected-value comments below assume:
//   - LLM evaluator cap   : 0.85
//   - practice source wt  : 1.00
//   - exam source wt      : 0.60
//   - default reliability : 0.8 × 0.9 × 0.9 = 0.648
//   - base weight (LLM)   : min(0.648 × 0.85, 0.8) × 1.0 ≈ 0.551  (practice)
//                           min(0.648 × 0.85, 0.8) × 0.6 ≈ 0.330  (exam)
//   - noisy weight        : min(0.8 × 0.3 × 0.5 × 0.85, 0.8) × 1.0 ≈ 0.102
//                           0.102 < MIN_RELIABLE_WEIGHT → dropped

import { describe, it, expect } from 'vitest';
import {
  computeEventWeight,
  reduceEvidenceToBeliefState,
  projectEvidenceBeliefSnapshot,
  MIN_RELIABLE_WEIGHT,
  REDUCER_VERSION,
} from '../beliefReducer';
import type { EvidenceEvent } from '../../../types/evidence';
import type { SkillProfile } from '../../../types';

// ── Test fixture factory ──────────────────────────────────────────────────────

let _eventCounter = 0;

function makeEvent(overrides: Partial<EvidenceEvent> = {}): EvidenceEvent {
  return {
    id: `ev-${++_eventCounter}`,
    learnerId: 'local-user',
    occurredAt: new Date().toISOString(),
    sourceSessionId: 'sess-test',
    evidenceType: 'language',
    targetNodeIds: ['tense_past'],
    observation: {
      issueCategories: [],
      feedbackSummary: 'test feedback',
    },
    result: {
      score: 8,
      success: true,
      wordCount: 50,
      issueCount: 0,
      criticalIssueCount: 0,
    },
    reliability: {
      assessmentConfidence: 0.8,
      taskValidity: 0.9,
      signalQuality: 0.9,
      evaluator: 'llm',
      rubricVersion: 'coach-mvp-1',
    },
    context: {
      mode: 'practice',
      timed: false,
    },
    ...overrides,
  };
}

/** Return an ISO timestamp N days ago. */
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

// ── computeEventWeight ────────────────────────────────────────────────────────

describe('computeEventWeight', () => {
  it('practice/LLM event produces a positive weight', () => {
    expect(computeEventWeight(makeEvent())).toBeGreaterThan(0);
  });

  it('practice event weight > exam event weight for identical feedback quality', () => {
    const practice = makeEvent({ context: { mode: 'practice', timed: false } });
    const exam     = makeEvent({ context: { mode: 'exam',     timed: true  } });
    expect(computeEventWeight(practice)).toBeGreaterThan(computeEventWeight(exam));
  });

  it('LLM weight > offline weight for identical transcript quality', () => {
    const llm     = makeEvent();
    const offline = makeEvent({
      reliability: {
        assessmentConfidence: 0.5,
        taskValidity: 0.9,
        signalQuality: 0.9,
        evaluator: 'offline',
        rubricVersion: 'v1',
      },
    });
    expect(computeEventWeight(llm)).toBeGreaterThan(computeEventWeight(offline));
  });

  it('very short answer weight falls below MIN_RELIABLE_WEIGHT', () => {
    // 2-word transcript: taskValidity=0.3, signalQuality=0.5
    // weight ≈ min(0.8×0.3×0.5×0.85, 0.8)×1.0 ≈ 0.102 — below 0.15
    const noisy = makeEvent({
      result: { score: 5, success: false, wordCount: 2 },
      reliability: {
        assessmentConfidence: 0.8,
        taskValidity: 0.3,
        signalQuality: 0.5,
        evaluator: 'llm',
        rubricVersion: 'v1',
      },
    });
    expect(computeEventWeight(noisy)).toBeLessThan(MIN_RELIABLE_WEIGHT);
  });

  it('empty transcript weight is negligibly small (well below threshold)', () => {
    const empty = makeEvent({
      result: { score: 0, success: false, wordCount: 0 },
      reliability: {
        assessmentConfidence: 0.4,
        taskValidity: 0.1,
        signalQuality: 0.2,
        evaluator: 'offline',
        rubricVersion: 'v1',
      },
    });
    expect(computeEventWeight(empty)).toBeLessThan(MIN_RELIABLE_WEIGHT * 0.5);
  });

  it('recent event weight > old event weight (same reliability)', () => {
    const recent = makeEvent({ occurredAt: daysAgo(0) });
    const old    = makeEvent({ occurredAt: daysAgo(30) });
    expect(computeEventWeight(recent)).toBeGreaterThan(computeEventWeight(old));
  });
});

// ── reduceEvidenceToBeliefState ───────────────────────────────────────────────

describe('reduceEvidenceToBeliefState', () => {
  it('returns an empty map when given no events', () => {
    const state = reduceEvidenceToBeliefState([]);
    expect(Object.keys(state)).toHaveLength(0);
  });

  it('creates an entry for the targeted skill after one valid event', () => {
    const state = reduceEvidenceToBeliefState([makeEvent()]);
    expect(state['tense_past']).toBeDefined();
    expect(state['tense_past'].rawEvidenceCount).toBe(1);
  });

  // ── Strong evidence ─────────────────────────────────────────────────────

  it('strong failure evidence: weightedFailure > weightedSuccess', () => {
    const failures = Array.from({ length: 5 }, () =>
      makeEvent({ result: { score: 2, success: false, wordCount: 50 } }),
    );
    const state = reduceEvidenceToBeliefState(failures);
    const s = state['tense_past'];
    expect(s.weightedFailure).toBeGreaterThan(s.weightedSuccess);
    expect(s.beta).toBeGreaterThan(s.alpha);
  });

  it('strong success evidence: weightedSuccess > weightedFailure', () => {
    const successes = Array.from({ length: 5 }, () =>
      makeEvent({ result: { score: 9, success: true, wordCount: 60 } }),
    );
    const state = reduceEvidenceToBeliefState(successes);
    const s = state['tense_past'];
    expect(s.weightedSuccess).toBeGreaterThan(s.weightedFailure);
    expect(s.alpha).toBeGreaterThan(s.beta);
  });

  // ── Noisy evidence ─────────────────────────────────────────────────────

  it('noisy (short-answer) events are silently dropped — no state created', () => {
    const noisy = Array.from({ length: 10 }, () =>
      makeEvent({
        result: { score: 4, success: false, wordCount: 2 },
        reliability: {
          assessmentConfidence: 0.8,
          taskValidity: 0.3,
          signalQuality: 0.5,
          evaluator: 'llm',
          rubricVersion: 'v1',
        },
      }),
    );
    const state = reduceEvidenceToBeliefState(noisy);
    expect(state['tense_past']).toBeUndefined();
  });

  it('one noisy event mixed with good events does not corrupt the count', () => {
    const events = [
      makeEvent({ result: { score: 4, success: false, wordCount: 2 },
        reliability: { assessmentConfidence: 0.8, taskValidity: 0.3, signalQuality: 0.5, evaluator: 'llm', rubricVersion: 'v1' } }),
      makeEvent({ result: { score: 8, success: true,  wordCount: 50 } }),
      makeEvent({ result: { score: 7, success: true,  wordCount: 45 } }),
    ];
    const state = reduceEvidenceToBeliefState(events);
    // Only the two good events should count
    expect(state['tense_past'].rawEvidenceCount).toBe(2);
  });

  // ── Phase 4b: events with no success signal at all (unscored offline
  // attempt, zero confident observations) must not be silently counted as
  // a failure via `(undefined ?? 0) >= LANGUAGE_SUCCESS_SCORE`. ─────────────

  it('an event with neither result.success nor result.score contributes evidence but leaves alpha/beta at their (1,1) prior', () => {
    const state = reduceEvidenceToBeliefState([
      makeEvent({ result: { wordCount: 50 } }), // no success, no score — offline, zero observations
    ]);
    const s = state['tense_past'];
    expect(s.rawEvidenceCount).toBe(1);
    expect(s.weightedEvidence).toBeGreaterThan(0);
    // No signal either way — neither bucket should have moved off the (1,1) prior.
    expect(s.alpha).toBe(1.0);
    expect(s.beta).toBe(1.0);
    expect(s.weightedSuccess).toBe(0);
    expect(s.weightedFailure).toBe(0);
  });

  it('contrast: a genuinely scored 0 (real bad answer, no explicit success) still counts as a failure', () => {
    const state = reduceEvidenceToBeliefState([
      makeEvent({ result: { score: 0, wordCount: 50 } }), // real score, no explicit success — falls back to threshold
    ]);
    const s = state['tense_past'];
    expect(s.beta).toBeGreaterThan(0);
    expect(s.weightedFailure).toBeGreaterThan(0);
  });

  it('explicit success still takes priority even with no score', () => {
    const state = reduceEvidenceToBeliefState([
      makeEvent({ result: { success: true, wordCount: 50 } }), // no score, but success is explicit
    ]);
    const s = state['tense_past'];
    expect(s.alpha).toBeGreaterThan(0);
    expect(s.weightedSuccess).toBeGreaterThan(0);
  });

  // ── Exam weighting ─────────────────────────────────────────────────────

  it('exam failures accumulate less beta than identical practice failures', () => {
    const practiceFailures = Array.from({ length: 4 }, () =>
      makeEvent({
        result:  { score: 2, success: false, wordCount: 50 },
        context: { mode: 'practice', timed: false },
      }),
    );
    const examFailures = Array.from({ length: 4 }, () =>
      makeEvent({
        result:  { score: 2, success: false, wordCount: 50 },
        context: { mode: 'exam', timed: true },
      }),
    );

    const practiceState = reduceEvidenceToBeliefState(practiceFailures);
    const examState     = reduceEvidenceToBeliefState(examFailures);

    expect(practiceState['tense_past'].weightedFailure).toBeGreaterThan(
      examState['tense_past'].weightedFailure,
    );
  });

  it('exam evidence is recorded in sourceBreakdown under "exam" key', () => {
    const state = reduceEvidenceToBeliefState([
      makeEvent({ context: { mode: 'exam', timed: true } }),
    ]);
    expect(state['tense_past'].sourceBreakdown['exam']).toBeGreaterThan(0);
    expect(state['tense_past'].sourceBreakdown['practice']).toBeUndefined();
  });

  // ── Avoidance evidence ──────────────────────────────────────────────────

  it('behavior events increment avoidance counters but not rawEvidenceCount', () => {
    const avoidance = makeEvent({
      evidenceType: 'behavior',
      targetNodeIds: ['subjunctive'],
      result: { avoided: true, score: 6, wordCount: 40 },
    });
    const state = reduceEvidenceToBeliefState([avoidance]);
    const s = state['subjunctive'];
    expect(s).toBeDefined();
    expect(s.avoidance.weightedAvoided).toBeGreaterThan(0);
    expect(s.avoidance.weightedInvited).toBeGreaterThan(0);
    expect(s.rawEvidenceCount).toBe(0); // avoidance ≠ language evidence
    expect(s.weightedEvidence).toBe(0);
  });

  // ── Trend detection ─────────────────────────────────────────────────────

  it('detects improving trend: 3 older failures followed by 4 recent successes', () => {
    const failures = Array.from({ length: 3 }, (_, i) =>
      makeEvent({
        occurredAt: daysAgo(7 - i),
        result: { score: 3, success: false, wordCount: 50 },
      }),
    );
    const successes = Array.from({ length: 4 }, (_, i) =>
      makeEvent({
        occurredAt: daysAgo(3 - i),
        result: { score: 9, success: true, wordCount: 60 },
      }),
    );

    const state = reduceEvidenceToBeliefState([...failures, ...successes]);
    expect(state['tense_past'].recentObservations).toHaveLength(7);

    const snap = projectEvidenceBeliefSnapshot(state);
    expect(snap.skills['tense_past']?.trend).toBe('improving');
  });

  it('detects declining trend: 4 successes then 3 failures', () => {
    const successes = Array.from({ length: 4 }, (_, i) =>
      makeEvent({
        occurredAt: daysAgo(7 - i),
        result: { score: 9, success: true, wordCount: 60 },
      }),
    );
    const failures = Array.from({ length: 3 }, (_, i) =>
      makeEvent({
        occurredAt: daysAgo(2 - i),
        result: { score: 2, success: false, wordCount: 50 },
      }),
    );

    const state = reduceEvidenceToBeliefState([...successes, ...failures]);
    const snap  = projectEvidenceBeliefSnapshot(state);
    expect(snap.skills['tense_past']?.trend).toBe('declining');
  });

  it('returns unknown trend when fewer than 4 observations exist', () => {
    const state = reduceEvidenceToBeliefState([
      makeEvent({ result: { score: 8, success: true, wordCount: 50 } }),
      makeEvent({ result: { score: 6, success: true, wordCount: 40 } }),
    ]);
    const snap = projectEvidenceBeliefSnapshot(state);
    expect(snap.skills['tense_past']?.trend).toBe('unknown');
  });

  // ── Multi-skill events ──────────────────────────────────────────────────

  it('one event with multiple targetNodeIds updates all specified skills', () => {
    const multiTarget = makeEvent({
      targetNodeIds: ['tense_past', 'negation'],
      result: { score: 4, success: false, wordCount: 50 },
    });
    const state = reduceEvidenceToBeliefState([multiTarget]);
    expect(state['tense_past']).toBeDefined();
    expect(state['negation']).toBeDefined();
    expect(state['tense_past'].rawEvidenceCount).toBe(1);
    expect(state['negation'].rawEvidenceCount).toBe(1);
  });

  it('events with empty targetNodeIds are skipped entirely', () => {
    const noTarget = makeEvent({ targetNodeIds: [] });
    const state = reduceEvidenceToBeliefState([noTarget]);
    expect(Object.keys(state)).toHaveLength(0);
  });

  it('processes events oldest-first regardless of input order', () => {
    const recent  = makeEvent({ occurredAt: daysAgo(1), result: { score: 9, success: true,  wordCount: 60 } });
    const earlier = makeEvent({ occurredAt: daysAgo(5), result: { score: 2, success: false, wordCount: 50 } });
    const oldest  = makeEvent({ occurredAt: daysAgo(9), result: { score: 2, success: false, wordCount: 50 } });

    // Feed in reverse chronological order — reducer should sort before processing
    const state = reduceEvidenceToBeliefState([recent, earlier, oldest]);
    // recentObservations[0] should be the oldest event
    expect(state['tense_past'].recentObservations[0].occurredAt).toBe(oldest.occurredAt);
  });
});

// ── projectEvidenceBeliefSnapshot ─────────────────────────────────────────────

describe('projectEvidenceBeliefSnapshot', () => {
  it('returns an empty snapshot when given no state and no fallback', () => {
    const snap = projectEvidenceBeliefSnapshot({});
    expect(Object.keys(snap.skills)).toHaveLength(0);
    expect(snap.weakestSkillIds).toHaveLength(0);
    expect(snap.strongestSkillIds).toHaveLength(0);
    expect(snap.totalEvidenceProcessed).toBe(0);
  });

  it('snapshot carries the current REDUCER_VERSION', () => {
    const snap = projectEvidenceBeliefSnapshot({});
    expect(snap.reducerVersion).toBe(REDUCER_VERSION);
  });

  // ── Sparse evidence / fallback ──────────────────────────────────────────

  it('skill with no evidence uses diagnostic fallback and marks fallbackUsed', () => {
    const fallback: SkillProfile = {
      tense_past: {
        name: 'Past Tense',
        score: 0.55,
        mastery: 'learning',
        lastSeen: Date.now() - 86_400_000,
        feedbackCount: 4,
      },
    };
    const snap = projectEvidenceBeliefSnapshot({}, fallback);
    const skill = snap.skills['tense_past'];
    expect(skill).toBeDefined();
    expect(skill.fallbackUsed).toBe('diagnosticEngine');
    expect(skill.mastery).toBe(0.55);
    expect(skill.weightedEvidence).toBe(0);
  });

  it('skill with no evidence AND no fallback is omitted from snapshot', () => {
    const fallback: SkillProfile = {};
    const snap = projectEvidenceBeliefSnapshot({}, fallback);
    expect(snap.skills['tense_past']).toBeUndefined();
  });

  it('fallback skills do NOT appear in weakestSkillIds or strongestSkillIds', () => {
    const fallback: SkillProfile = {
      tense_past: { name: 'Past Tense', score: 0.10, mastery: 'unknown', lastSeen: Date.now(), feedbackCount: 10 },
    };
    const snap = projectEvidenceBeliefSnapshot({}, fallback);
    expect(snap.weakestSkillIds).not.toContain('tense_past');
    expect(snap.strongestSkillIds).not.toContain('tense_past');
  });

  // ── Mastery values from evidence ────────────────────────────────────────

  it('6 strong failures produce mastery < 0.40', () => {
    // beta = 1 + 6×0.551 ≈ 4.31; mastery = 1/(1+4.31) ≈ 0.19
    const events = Array.from({ length: 6 }, () =>
      makeEvent({ result: { score: 2, success: false, wordCount: 60 } }),
    );
    const state = reduceEvidenceToBeliefState(events);
    const snap  = projectEvidenceBeliefSnapshot(state);
    expect(snap.skills['tense_past'].mastery).toBeLessThan(0.40);
    expect(snap.skills['tense_past'].fallbackUsed).toBeUndefined();
  });

  it('6 strong successes produce mastery > 0.70', () => {
    // alpha = 1 + 6×0.551 ≈ 4.31; mastery = 4.31/(4.31+1) ≈ 0.81
    const events = Array.from({ length: 6 }, () =>
      makeEvent({ result: { score: 9, success: true, wordCount: 60 } }),
    );
    const state = reduceEvidenceToBeliefState(events);
    const snap  = projectEvidenceBeliefSnapshot(state);
    expect(snap.skills['tense_past'].mastery).toBeGreaterThan(0.70);
  });

  // ── Exam vs practice mastery impact ────────────────────────────────────

  it('practice failures drive mastery lower than equivalent exam failures', () => {
    // Practice: weight≈0.551/event → beta = 1+4×0.551 ≈ 3.20 → mastery ≈ 0.24
    // Exam:     weight≈0.330/event → beta = 1+4×0.330 ≈ 2.32 → mastery ≈ 0.30
    const practiceEvents = Array.from({ length: 4 }, () =>
      makeEvent({ result: { score: 2, success: false, wordCount: 50 }, context: { mode: 'practice', timed: false } }),
    );
    const examEvents = Array.from({ length: 4 }, () =>
      makeEvent({ result: { score: 2, success: false, wordCount: 50 }, context: { mode: 'exam', timed: true } }),
    );

    const practiceSnap = projectEvidenceBeliefSnapshot(reduceEvidenceToBeliefState(practiceEvents));
    const examSnap     = projectEvidenceBeliefSnapshot(reduceEvidenceToBeliefState(examEvents));

    expect(practiceSnap.skills['tense_past'].mastery).toBeLessThan(
      examSnap.skills['tense_past'].mastery,
    );
  });

  // ── Confidence and uncertainty ──────────────────────────────────────────

  it('confidence grows as evidence accumulates', () => {
    const few  = projectEvidenceBeliefSnapshot(reduceEvidenceToBeliefState(
      Array.from({ length: 2 }, () => makeEvent()),
    ));
    const many = projectEvidenceBeliefSnapshot(reduceEvidenceToBeliefState(
      Array.from({ length: 10 }, () => makeEvent()),
    ));
    expect(many.skills['tense_past'].confidence).toBeGreaterThan(
      few.skills['tense_past'].confidence,
    );
  });

  it('uncertainty is non-negative', () => {
    const events = Array.from({ length: 5 }, () => makeEvent());
    const snap   = projectEvidenceBeliefSnapshot(reduceEvidenceToBeliefState(events));
    expect(snap.skills['tense_past'].uncertainty).toBeGreaterThanOrEqual(0);
  });

  // ── weakest / strongest skill lists ────────────────────────────────────

  it('weak skill appears in weakestSkillIds once confidence threshold is met', () => {
    // 6 failures → mastery ≈ 0.19, confidence > 0.2
    const events = Array.from({ length: 6 }, () =>
      makeEvent({ result: { score: 2, success: false, wordCount: 60 } }),
    );
    const snap = projectEvidenceBeliefSnapshot(reduceEvidenceToBeliefState(events));
    if (snap.skills['tense_past'].confidence > 0.2) {
      expect(snap.weakestSkillIds).toContain('tense_past');
    }
  });

  it('strong skill appears in strongestSkillIds once confidence threshold is met', () => {
    // 8 successes → mastery ≈ 0.84, confidence > 0.35
    const events = Array.from({ length: 8 }, () =>
      makeEvent({ result: { score: 9, success: true, wordCount: 70 } }),
    );
    const snap = projectEvidenceBeliefSnapshot(reduceEvidenceToBeliefState(events));
    if (snap.skills['tense_past'].confidence > 0.35) {
      expect(snap.strongestSkillIds).toContain('tense_past');
    }
  });

  // ── Avoidance score ─────────────────────────────────────────────────────

  it('avoidance events produce non-zero avoidanceScore in projection', () => {
    const events = [
      makeEvent({ evidenceType: 'behavior', targetNodeIds: ['subjunctive'],
        result: { avoided: true, score: 6, wordCount: 40 } }),
      // Add a language event so the skill clears the MIN_EVIDENCE_WEIGHT gate
      // via avoidance weight (avoidance weight doesn't count toward weightedEvidence,
      // so we also need a language event)
      makeEvent({ targetNodeIds: ['subjunctive'], result: { score: 7, success: true, wordCount: 50 } }),
      makeEvent({ targetNodeIds: ['subjunctive'], result: { score: 7, success: true, wordCount: 50 } }),
    ];
    const state = reduceEvidenceToBeliefState(events);
    const snap  = projectEvidenceBeliefSnapshot(state);
    expect(snap.skills['subjunctive']?.avoidanceScore).toBeGreaterThan(0);
  });

  // ── Source breakdown ────────────────────────────────────────────────────

  it('sourceBreakdown reflects the modes that contributed evidence', () => {
    const events = [
      makeEvent({ context: { mode: 'practice', timed: false } }),
      makeEvent({ context: { mode: 'practice', timed: false } }),
      makeEvent({ context: { mode: 'exam',     timed: true  } }),
    ];
    const snap = projectEvidenceBeliefSnapshot(reduceEvidenceToBeliefState(events));
    const bd   = snap.skills['tense_past'].sourceBreakdown;
    expect(bd['practice']).toBeGreaterThan(0);
    expect(bd['exam']).toBeGreaterThan(0);
    // Practice has more weight
    expect(bd['practice']).toBeGreaterThan(bd['exam']);
  });

  // ── Evidence-derived overrides diagnostic fallback ──────────────────────

  it('evidence-derived skill overrides diagnostic fallback for same nodeId', () => {
    const fallback: SkillProfile = {
      tense_past: { name: 'Past Tense', score: 0.70, mastery: 'practiced', lastSeen: Date.now(), feedbackCount: 5 },
    };
    const events = Array.from({ length: 5 }, () =>
      makeEvent({ result: { score: 2, success: false, wordCount: 60 } }),
    );
    const state = reduceEvidenceToBeliefState(events);
    const snap  = projectEvidenceBeliefSnapshot(state, fallback);

    // Mastery should reflect the failures, not the fallback 0.70
    expect(snap.skills['tense_past'].fallbackUsed).toBeUndefined();
    expect(snap.skills['tense_past'].mastery).toBeLessThan(0.50);
  });
});
