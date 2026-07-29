// ── Phase 2 evidence projection tests ──────────────────────────────────────
// Covers §10.4 (deriveNodeOutcome, the FeedbackV2 bridge) and the Phase-2
// hard gate: a characterization test proving the rebuilt pipeline produces
// same-or-richer belief output than the pre-Phase-2 evidenceBuilder.

import { describe, it, expect } from 'vitest';
import {
  buildEvidence,
  deriveNodeOutcome,
  wrapFeedbackAsEvidenceObservations,
} from '../evidenceProjection';
import { reduceEvidenceToBeliefState } from '../beliefReducer';
import type { FeedbackV2, CoachingIssue } from '../../../types';
import type { Observation } from '../../../domain/igcse/evidence/framework/observation';

function makeIssue(overrides: Partial<CoachingIssue> = {}): CoachingIssue {
  return {
    id: 'issue-1',
    category: 'tense',
    severity: 'major',
    quote: "j'ai mange",
    diagnostic: 'wrong past participle',
    correction: "j'ai mangé",
    marksImpact: 2,
    confidence: 0.9,
    ...overrides,
  };
}

function makeFeedback(overrides: Partial<FeedbackV2> = {}): FeedbackV2 {
  return {
    scores: { communication: 6, language: 5, fluency: 6, overall: 6 },
    grammar: { critical: [], polish: [] },
    vocabulary: [],
    style: [],
    fillers: [],
    wordCount: 45,
    cefrLevel: 'A2',
    issues: [],
    ...overrides,
  };
}

// ── deriveNodeOutcome ─────────────────────────────────────────────────────

describe('deriveNodeOutcome', () => {
  function issueObs(overrides: Partial<Observation> = {}): Observation {
    return {
      observationId: 'x', detectorId: 'd', detectorVersion: 'v1',
      type: 'issue:tense', value: 'issue-1', spans: [{ startOffset: 0, endOffset: 5 }],
      confidence: 0.9, markInfluence: 'forbidden', skillNodeId: 'tense_past',
      ...overrides,
    };
  }

  it('returns not_attempted when nothing targets the node and the attempt was unscored', () => {
    expect(deriveNodeOutcome('tense_past', [], null)).toBe('not_attempted');
  });

  it('returns failure when an issue observation targets the node', () => {
    expect(deriveNodeOutcome('tense_past', [issueObs()], 6)).toBe('failure');
  });

  it('an issue observation outranks a high score — the node still failed', () => {
    expect(deriveNodeOutcome('tense_past', [issueObs()], 9)).toBe('failure');
  });

  // ── B1 regression: the mastery inversion this workstream exists to fix ────
  // The FeedbackV2 bridge stamps minor grammar errors at confidence 0.6, below
  // the old `>= 0.7` gate. Those observations fell through to `success`, so
  // every minor error incremented alpha/weightedSuccess on the node the
  // learner got WRONG. One minor error must be a failure, never a success.
  it('a MINOR (low-confidence) issue observation is a failure, never a success', () => {
    const obs = [issueObs({
      type: 'grammar:RELATIVE_PRONOUN', skillNodeId: 'relative_pron', confidence: 0.6,
    })];
    expect(deriveNodeOutcome('relative_pron', obs, 8)).toBe('failure');
    expect(deriveNodeOutcome('relative_pron', obs, null)).toBe('failure');
  });

  it('falls back to the score threshold when the node has no issue observation', () => {
    const obs = [issueObs({ skillNodeId: 'gender', type: 'issue:gender' })];
    // Untargeted node, scored attempt -> score decides.
    expect(deriveNodeOutcome('tense_past', obs, 8)).toBe('success');
    expect(deriveNodeOutcome('tense_past', obs, 3)).toBe('failure');
  });

  it('a non-issue (feature) observation does not fail the node; the score decides', () => {
    const obs = [issueObs({
      type: 'connector_used', value: 'donc', skillNodeId: 'connectors',
    })];
    expect(deriveNodeOutcome('connectors', obs, 8)).toBe('success');
    expect(deriveNodeOutcome('connectors', obs, 3)).toBe('failure');
  });

  it('an unscored attempt with no issue on the node is not_attempted, never a failure', () => {
    const obs = [issueObs({ skillNodeId: 'gender', type: 'issue:gender' })];
    expect(deriveNodeOutcome('tense_past', obs, null)).toBe('not_attempted');
  });
});

// ── wrapFeedbackAsEvidenceObservations (the FeedbackV2 bridge) ────────────

describe('wrapFeedbackAsEvidenceObservations', () => {
  it('resolves a FeedbackV2 issue category through the canonical nodeMap', () => {
    const feedback = makeFeedback({ issues: [makeIssue({ category: 'tense' })] });
    const obs = wrapFeedbackAsEvidenceObservations(feedback, 'transcript text');
    expect(obs).toHaveLength(1);
    expect(obs[0].skillNodeId).toBe('tense_past');
    expect(obs[0].markInfluence).toBe('forbidden');
    expect(obs[0].type).toBe('issue:tense');
  });

  it('drops issues whose category has no attributable node (e.g. "grammar")', () => {
    const feedback = makeFeedback({ issues: [makeIssue({ category: 'grammar' })] });
    const obs = wrapFeedbackAsEvidenceObservations(feedback, 'transcript text');
    expect(obs).toHaveLength(0);
  });

  it('resolves legacy grammar errors via theme substring matching', () => {
    const feedback = makeFeedback({
      grammar: {
        critical: [{ theme: 'ELISION_MISSING', severity: 'major', msg: '', diagnostic: '', correction: "j'aime" }],
        polish: [],
      },
    });
    const obs = wrapFeedbackAsEvidenceObservations(feedback, 'transcript text');
    expect(obs).toHaveLength(1);
    expect(obs[0].skillNodeId).toBe('elision');
  });

  it('observationId is deterministic: identical input yields identical id', () => {
    const feedback = makeFeedback({ issues: [makeIssue()] });
    const a = wrapFeedbackAsEvidenceObservations(feedback, 'same transcript');
    const b = wrapFeedbackAsEvidenceObservations(feedback, 'same transcript');
    expect(a[0].observationId).toBe(b[0].observationId);
    expect(a[0].observationId).not.toMatch(/^\d+$/); // not a raw timestamp
  });

  it('observationId differs for different issue ids (no collision within a detector run)', () => {
    const feedback = makeFeedback({
      issues: [makeIssue({ id: 'issue-1' }), makeIssue({ id: 'issue-2' })],
    });
    const obs = wrapFeedbackAsEvidenceObservations(feedback, 'transcript');
    expect(obs[0].observationId).not.toBe(obs[1].observationId);
  });
});

// ── buildEvidence (public entry point) ─────────────────────────────────────

describe('buildEvidence', () => {
  it('produces a language EvidenceEvent with deterministic, non-random ids', () => {
    const feedback = makeFeedback({ issues: [makeIssue()] });
    const eventsA = buildEvidence({
      sessionId: 'sess-fixed', question: null, feedback, avoidanceSignals: [],
      transcript: 'transcript', finalScore: 6, mode: 'practice',
    });
    const eventsB = buildEvidence({
      sessionId: 'sess-fixed', question: null, feedback, avoidanceSignals: [],
      transcript: 'transcript', finalScore: 6, mode: 'practice',
    });
    expect(eventsA[0].id).toBe(eventsB[0].id);
  });

  it('targets the node resolved by the canonical nodeMap', () => {
    const feedback = makeFeedback({ issues: [makeIssue({ category: 'tense' })] });
    const [event] = buildEvidence({
      sessionId: 's1', question: null, feedback, avoidanceSignals: [],
      transcript: 'transcript', finalScore: 6, mode: 'practice',
    });
    expect(event.targetNodeIds).toContain('tense_past');
  });

  it('result.success is false when a confident issue observation exists, even if score is high', () => {
    // Old evidenceBuilder derived success purely from finalScore >= 7; the new
    // pipeline lets a confident issue observation override a high score.
    const feedback = makeFeedback({ issues: [makeIssue({ category: 'tense', confidence: 0.95 })] });
    const [event] = buildEvidence({
      sessionId: 's1', question: null, feedback, avoidanceSignals: [],
      transcript: 'transcript', finalScore: 9, mode: 'practice',
    });
    expect(event.result.success).toBe(false);
  });

  it('falls back to the score threshold when there are no observations at all', () => {
    const feedback = makeFeedback({ issues: [] });
    const [highScore] = buildEvidence({
      sessionId: 's1', question: null, feedback, avoidanceSignals: [],
      transcript: 'transcript', finalScore: 8, mode: 'practice',
    });
    const [lowScore] = buildEvidence({
      sessionId: 's2', question: null, feedback, avoidanceSignals: [],
      transcript: 'transcript', finalScore: 3, mode: 'practice',
    });
    expect(highScore.result.success).toBe(true);
    expect(lowScore.result.success).toBe(false);
  });

  it('includes a behavior event for avoidance signals, targeting the avoided skill', () => {
    const feedback = makeFeedback();
    const events = buildEvidence({
      sessionId: 's1', question: null, feedback,
      avoidanceSignals: [{ skillId: 'subjunctive', observation: 'no subjunctive used', nudge: 'try il faut que' }],
      transcript: 'transcript', finalScore: 6, mode: 'practice',
    });
    const behaviorEvent = events.find(e => e.evidenceType === 'behavior');
    expect(behaviorEvent).toBeDefined();
    expect(behaviorEvent!.targetNodeIds).toEqual(['subjunctive']);
  });

  // ── Phase 4b: unscored (offline, no-LLM) attempts must never be scored ──
  describe('unscored attempts (feedback.unscored === "no_llm_offline")', () => {
    it('omits result.score entirely — never the placeholder 0', () => {
      const feedback = makeFeedback({ unscored: 'no_llm_offline', issues: [makeIssue()] });
      const [event] = buildEvidence({
        sessionId: 's1', question: null, feedback, avoidanceSignals: [],
        transcript: 'transcript', finalScore: 0, mode: 'practice',
      });
      expect(event.result.score).toBeUndefined();
    });

    it('still derives per-node success/failure from real observations when present', () => {
      const feedback = makeFeedback({ unscored: 'no_llm_offline', issues: [makeIssue({ category: 'tense', confidence: 0.95 })] });
      const [event] = buildEvidence({
        sessionId: 's1', question: null, feedback, avoidanceSignals: [],
        transcript: 'transcript', finalScore: 0, mode: 'practice',
      });
      // A real confident issue observation still counts as a failure —
      // observations are real evidence regardless of whether an LLM scored it.
      expect(event.result.success).toBe(false);
    });

    it('does NOT fall back to the score threshold when there are zero observations — never fabricates success:false from a placeholder 0', () => {
      const feedback = makeFeedback({ unscored: 'no_llm_offline', issues: [] });
      const events = buildEvidence({
        sessionId: 's1', question: null, feedback,
        avoidanceSignals: [{ skillId: 'subjunctive', observation: 'no subjunctive used', nudge: 'try il faut que' }],
        transcript: 'transcript', finalScore: 0, mode: 'practice',
      });
      const languageEvent = events.find(e => e.evidenceType === 'language')!;
      // Contrast with the scored case (line ~173 above): finalScore=0 with
      // real scoring would legitimately fall back to success:false. Here,
      // the same finalScore=0 must NOT be trusted as a real threshold input.
      expect(languageEvent.result.success).toBeUndefined();
      expect(languageEvent.result.score).toBeUndefined();
    });
  });
});

// ── Characterization: belief snapshot is same-or-richer than pre-Phase-2 ──
//
// Pre-Phase-2, evidenceBuilder derived EvidenceEvent.result.success purely
// from `finalScore >= 7`, with no per-node attribution — a high-scoring
// attempt with an unrelated grammar slip could never surface that slip as a
// per-node failure. The rebuilt pipeline (via deriveNodeOutcome) can now flag
// a specific node as failed even when the overall score is high, without
// ever regressing the "no observations -> score-threshold fallback" behavior
// the old builder always used. This test locks that: the new snapshot must
// never be *less* informative than the old score-only signal would have been.

describe('characterization: belief snapshot is same-or-richer post-Phase-2', () => {
  function prePhase2Success(finalScore: number): boolean {
    return finalScore >= 7;
  }

  it('a high-scoring session with a confident tense issue now surfaces tense_past as a failure (old pipeline could not)', () => {
    const feedback = makeFeedback({
      scores: { communication: 8, language: 8, fluency: 8, overall: 9 },
      issues: [makeIssue({ category: 'tense', confidence: 0.9 })],
    });
    const events = buildEvidence({
      sessionId: 's1', question: null, feedback, avoidanceSignals: [],
      transcript: 'transcript', finalScore: 9, mode: 'practice',
    });
    const state = reduceEvidenceToBeliefState(events);

    // Old pipeline: prePhase2Success(9) === true -> tense_past would have
    // accumulated as a SUCCESS despite the flagged tense issue. New pipeline
    // must not silently agree with that stale signal: the reducer's
    // per-skill accumulator (beta, not alpha) must grow from this event.
    expect(prePhase2Success(9)).toBe(true);
    expect(events[0].result.success).toBe(false);
    expect(state['tense_past']).toBeDefined();
    expect(state['tense_past'].weightedFailure).toBeGreaterThan(0);
    expect(state['tense_past'].weightedSuccess).toBe(0);
  });

  it('when no issues are present, belief output matches the old score-threshold behavior exactly (no regression)', () => {
    const feedback = makeFeedback({ issues: [] });
    const scores = [2, 5, 6.5, 7, 7.5, 9];
    for (const finalScore of scores) {
      const events = buildEvidence({
        sessionId: `s-${finalScore}`, question: null, feedback, avoidanceSignals: [],
        transcript: 'a reasonably long transcript with enough words in it', finalScore, mode: 'practice',
      });
      expect(events[0].result.success).toBe(prePhase2Success(finalScore));
    }
  });

  it('avoidance (behavior) events are unaffected by the rewrite — same shape as before', () => {
    const feedback = makeFeedback();
    const events = buildEvidence({
      sessionId: 's1', question: null, feedback,
      avoidanceSignals: [{ skillId: 'hypothetical', observation: 'obs', nudge: 'nudge' }],
      transcript: 'transcript', finalScore: 6, mode: 'practice',
    });
    const behaviorEvent = events.find(e => e.evidenceType === 'behavior')!;
    expect(behaviorEvent.result).toEqual({ avoided: true, score: 6, wordCount: expect.any(Number) });
  });
});
