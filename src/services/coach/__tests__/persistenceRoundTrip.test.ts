// @vitest-environment jsdom
// ── E2E persistence round-trip (plan §7) ────────────────────────────────────
// The test this codebase lacked. It exercises the full chain a single attempt
// drives — evidence log -> belief snapshot -> skill profile — across a
// simulated reload, a partial write, corrupt storage, and a reducer-version
// bump, all against real localStorage.
//
// The invariant under test is I9: the evidence log is the source of truth and
// every other coach store is a DERIVED CACHE, always rebuildable from it. No
// cross-key transaction exists (and none is wanted); recoverability comes from
// the write ordering (evidence first) plus rebuildability, not atomicity.

import { describe, it, expect, beforeEach } from 'vitest';
import { observeAttempt } from '../sessionOrchestrator';
import { rebuildBeliefSnapshot } from '../beliefProjectionService';
import { projectSkillProfile } from '../skillProfileProjection';
import { getBeliefSnapshot, getEvidenceEvents } from '../coachStorage';
import { REDUCER_VERSION } from '../beliefReducer';
import { getSkillProfile, writeSkillProfile } from '../../coaching/diagnosticEngine';
import { STORAGE_KEYS } from '../../persistence/storage';
import type { FeedbackV2, Question } from '../../../types';
import type { EvidenceBeliefSnapshot } from '../../../types/beliefs';

/** The node a "minor" relative-pronoun slip resolves to via the nodeMap. */
const NODE = 'relative_pron';

function makeQuestion(): Question {
  return {
    id: 'q1', topicKey: 'school', text: 'Parle de ton école.', hint: '',
    difficulty: 2, followUps: [], modelAnswer: '', keyVocab: [],
  };
}

/**
 * A GOOD attempt (overall 8, comfortably above LANGUAGE_SUCCESS_SCORE) that
 * nonetheless contains exactly ONE MINOR grammar error. Pre-B1 this was the
 * inversion case: severity 'polish' is stamped confidence 0.6 by the bridge,
 * below the old `>= 0.7` gate, so the node the learner got wrong recorded a
 * mastery SUCCESS.
 */
function makeMinorErrorFeedback(overrides: Partial<FeedbackV2> = {}): FeedbackV2 {
  return {
    scores: { overall: 8, communication: 8, language: 8, fluency: 8 },
    grammar: {
      critical: [],
      polish: [{
        theme: 'RELATIVE_PRONOUN', severity: 'minor', msg: 'qui vs que',
        diagnostic: 'wrong relative pronoun', correction: 'le livre que je lis',
      }],
    },
    vocabulary: [], style: [], fillers: [],
    wordCount: 48, cefrLevel: 'B1', issues: [],
    // A real LLM-graded attempt. The evaluator matters: it sets the reliability
    // cap in computeEventWeight, and the projection only models a skill once
    // weightedEvidence clears MIN_EVIDENCE_WEIGHT (0.5). A single heuristic
    // attempt is genuinely too sparse to model — that gate is pre-existing and
    // correct, so the fixture uses the graded path this test is about.
    engineMeta: {
      requestedEngine: 'gemini', actualEngine: 'gemini', fallbackUsed: false,
      latencyMs: 900, evaluatedAt: '2026-01-15T00:00:00.000Z',
    },
    confidence: 0.9,
    ...overrides,
  };
}

function runAttempt(sessionId: string, feedback = makeMinorErrorFeedback()) {
  return observeAttempt({
    sessionId,
    question: makeQuestion(),
    feedback,
    transcript: 'Le livre qui je lis est très intéressant et je le recommande à tout le monde.',
    finalScore: feedback.scores.overall,
    mode: 'practice',
  });
}

beforeEach(() => {
  localStorage.clear();
});

// ── Steps 1 + 2: the chain, end to end ──────────────────────────────────────

describe('E2E round-trip: one attempt with a minor grammar error', () => {
  it('records a FAILURE on the errored node and drives it through to the skill profile', () => {
    expect(getEvidenceEvents()).toHaveLength(0);

    const { evidenceEvents } = runAttempt('sess-1');

    // Evidence log gained the event.
    const stored = getEvidenceEvents();
    expect(stored).toHaveLength(evidenceEvents.length);
    const language = stored.find(e => e.evidenceType === 'language')!;
    expect(language.targetNodeIds).toContain(NODE);

    // B1: a MINOR error is a failure. Pre-B1 this was `true`.
    expect(language.result.success).toBe(false);

    // A second attempt so weightedEvidence clears MIN_EVIDENCE_WEIGHT and the
    // node is modelled from evidence rather than dropped as too sparse.
    runAttempt('sess-2');

    // Beliefs: beta / weightedFailure grew on that node, alpha did not.
    const snapshot = getBeliefSnapshot()!;
    expect(snapshot).not.toBeNull();
    expect(snapshot.reducerVersion).toBe(REDUCER_VERSION);
    const belief = snapshot.skills[NODE];
    expect(belief).toBeDefined();
    expect(belief.fallbackUsed).toBeUndefined();
    // Beta mean below the 0.5 prior means failure evidence dominated.
    expect(belief.mastery).toBeLessThan(0.5);

    // Skill profile: the node is present, with a reduced score.
    const profile = getSkillProfile();
    expect(profile[NODE]).toBeDefined();
    expect(profile[NODE].score).toBeLessThan(0.5);
  });

  it('never writes a fallback-sourced belief back into the skill profile (feedback-loop guard)', () => {
    runAttempt('sess-1');

    const snapshot = getBeliefSnapshot()!;
    const fallbackIds = Object.values(snapshot.skills)
      .filter(s => s.fallbackUsed)
      .map(s => s.nodeId);

    const projected = projectSkillProfile(snapshot);
    for (const id of fallbackIds) {
      expect(projected[id]).toBeUndefined();
    }

    // Direct assertion on the guard, independent of whether this particular
    // snapshot happens to contain a fallback entry.
    const synthetic: EvidenceBeliefSnapshot = {
      ...snapshot,
      skills: {
        ...snapshot.skills,
        gender: {
          nodeId: 'gender', label: 'Gender Agreement', category: 'grammar',
          mastery: 0.9, confidence: 0.4, uncertainty: 0.8, trend: 'unknown',
          avoidanceScore: 0, evidenceCount: 4, weightedEvidence: 0,
          reliabilityMean: 0, lastObservedAt: null, recurringIssueIds: [],
          sourceBreakdown: {}, fallbackUsed: 'diagnosticEngine',
        },
      },
    };
    expect(projectSkillProfile(synthetic).gender).toBeUndefined();
  });

  // ── Exit criterion: two attempts with errors must push mastery DOWN ───────
  it('after two errored attempts the errored skill score has gone DOWN, not up', () => {
    runAttempt('sess-1');
    runAttempt('sess-2');
    const afterTwo = getSkillProfile()[NODE].score;

    runAttempt('sess-3');
    const afterThree = getSkillProfile()[NODE].score;

    // Monotonically down. Pre-B1 this went UP: each minor error incremented
    // alpha, so more mistakes read as more mastery.
    expect(afterThree).toBeLessThan(afterTwo);
    // And it is genuinely below the uninformative 0.5 prior.
    expect(afterThree).toBeLessThan(0.5);
  });
});

// ── Step 3: reload ──────────────────────────────────────────────────────────

describe('E2E round-trip: reload', () => {
  it('re-reading every key after discarding in-memory state reproduces the same derived state', () => {
    runAttempt('sess-1');

    const beliefsBefore = getBeliefSnapshot()!;
    const profileBefore = getSkillProfile();

    // Simulate a reload: nothing is held in module state, so re-reading the
    // same keys is exactly what a fresh page load does.
    const beliefsAfter = getBeliefSnapshot()!;
    const profileAfter = getSkillProfile();

    expect(beliefsAfter).toEqual(beliefsBefore);
    expect(profileAfter).toEqual(profileBefore);
  });
});

// ── Step 4: partial-write recovery ──────────────────────────────────────────

describe('E2E round-trip: partial-write recovery (I9)', () => {
  it('derived caches are disposable — deleting beliefs + profile and rebuilding from the evidence log alone reproduces them', () => {
    runAttempt('sess-1');

    const beliefsBefore = getBeliefSnapshot()!;
    const profileBefore = getSkillProfile();

    // Simulate an interruption after write 1 (evidence) but before writes 2
    // and 3 (beliefs, profile).
    localStorage.removeItem(STORAGE_KEYS.coachBeliefs);
    localStorage.removeItem(STORAGE_KEYS.diagnosticSDE);
    expect(getSkillProfile()).toEqual({});

    // Recovery is exactly: rebuild beliefs from the log, then re-project.
    const rebuilt = rebuildBeliefSnapshot();
    writeSkillProfile(projectSkillProfile(rebuilt));

    // generatedAt is a wall-clock stamp and is expected to differ.
    const withoutStamp = (s: EvidenceBeliefSnapshot) => ({ ...s, generatedAt: '' });
    expect(withoutStamp(rebuilt)).toEqual(withoutStamp(beliefsBefore));

    // lastSeen round-trips through an ISO string, so compare the fields the
    // UI actually reads rather than the raw record.
    const profileAfter = getSkillProfile();
    expect(Object.keys(profileAfter).sort()).toEqual(Object.keys(profileBefore).sort());
    for (const id of Object.keys(profileBefore)) {
      expect(profileAfter[id].score).toBe(profileBefore[id].score);
      expect(profileAfter[id].mastery).toBe(profileBefore[id].mastery);
      expect(profileAfter[id].feedbackCount).toBe(profileBefore[id].feedbackCount);
    }
  });
});

// ── Step 5: corruption ──────────────────────────────────────────────────────

describe('E2E round-trip: corrupt storage degrades to defaults', () => {
  const KEYS = [
    STORAGE_KEYS.coachEvidence,
    STORAGE_KEYS.coachBeliefs,
    STORAGE_KEYS.diagnosticSDE,
  ];

  for (const key of KEYS) {
    it(`a corrupt ${key} does not throw and the round-trip still completes`, () => {
      runAttempt('sess-1');
      localStorage.setItem(key, '{{{');

      // Every reader degrades to its default rather than throwing.
      expect(() => getEvidenceEvents()).not.toThrow();
      expect(() => getBeliefSnapshot()).not.toThrow();
      expect(() => getSkillProfile()).not.toThrow();

      // And a subsequent attempt still completes the whole chain.
      expect(() => runAttempt('sess-2')).not.toThrow();
      expect(getEvidenceEvents().length).toBeGreaterThan(0);
      expect(getBeliefSnapshot()).not.toBeNull();
    });
  }

  it('a corrupt evidence log yields an empty log, not a throw', () => {
    localStorage.setItem(STORAGE_KEYS.coachEvidence, '{{{');
    expect(getEvidenceEvents()).toEqual([]);
  });
});

// ── Step 6: reducer-version invalidation (the B3 guard hole) ────────────────

describe('E2E round-trip: reducer-version invalidation', () => {
  function staleSnapshot(): EvidenceBeliefSnapshot {
    return {
      learnerId: 'local-user',
      generatedAt: '2026-01-01T00:00:00.000Z',
      reducerVersion: 'evidence-v2',
      skills: {
        [NODE]: {
          nodeId: NODE, label: 'Relative Pronouns', category: 'grammar',
          // The exact inversion evidence-v2 produced: high mastery on a node
          // the learner kept getting wrong.
          mastery: 0.95, confidence: 0.8, uncertainty: 0.1, trend: 'improving',
          avoidanceScore: 0, evidenceCount: 5, weightedEvidence: 3,
          reliabilityMean: 0.7, lastObservedAt: '2026-01-01T00:00:00.000Z',
          recurringIssueIds: [], sourceBreakdown: { practice: 3 },
        },
      },
      weakestSkillIds: [],
      strongestSkillIds: [NODE],
      totalEvidenceProcessed: 5,
    };
  }

  it('with a NON-EMPTY evidence log, a stale snapshot is rebuilt at the current version', () => {
    runAttempt('sess-1');
    runAttempt('sess-2');
    localStorage.setItem(STORAGE_KEYS.coachBeliefs, JSON.stringify(staleSnapshot()));

    const got = getBeliefSnapshot()!;
    expect(got.reducerVersion).toBe(REDUCER_VERSION);
    // Rebuilt from real evidence: the inverted 0.95 mastery is gone.
    expect(got.skills[NODE].mastery).toBeLessThan(0.5);
  });

  it('with an EMPTY evidence log, a stale snapshot is DROPPED, never returned stale (B3 guard hole)', () => {
    // The hole: this branch previously returned `stored` verbatim, so the
    // REDUCER_VERSION bump was a no-op for any learner whose evidence log was
    // empty — a fresh install, or one aged out past MAX_EVIDENCE_EVENTS.
    localStorage.setItem(STORAGE_KEYS.coachBeliefs, JSON.stringify(staleSnapshot()));
    expect(getEvidenceEvents()).toEqual([]);

    expect(getBeliefSnapshot()).toBeNull();
  });

  it('with an empty evidence log, a CURRENT-version snapshot is still served', () => {
    const current = { ...staleSnapshot(), reducerVersion: REDUCER_VERSION };
    localStorage.setItem(STORAGE_KEYS.coachBeliefs, JSON.stringify(current));

    const got = getBeliefSnapshot();
    expect(got).not.toBeNull();
    expect(got!.reducerVersion).toBe(REDUCER_VERSION);
  });
});
