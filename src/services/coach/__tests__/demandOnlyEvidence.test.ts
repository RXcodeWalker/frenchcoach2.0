// @vitest-environment jsdom
// ── Learn overhaul Batch 1f — Examiner voice records L1 demand evidence only ──
// An Examiner-voice Learn answer has no score (ADR 0005), so it must never go
// through orchestrateAttempt: that would record a Session (counts, cloud sync,
// achievements) and emit a language event with no success signal that the
// reducer still adds to skill confidence. Instead it records only the L1
// demand read of the transcript: one demand:* event or none, no score, never
// success:false (L1 has no failure path; without demandsResolved there's no
// L2), no language event, no Session / XP / topic mastery / review-pool write.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildDemandOnlyEvidence } from '../evidenceProjection';
import { recordDemandOnlyAttempt } from '../sessionOrchestrator';
import { getSessionHistory } from '../../analytics/analyticsService';
import { getEvidenceEvents, getBeliefSnapshot } from '../coachStorage';
import { STORAGE_KEYS } from '../../persistence/storage';
import type { Question } from '../../../types';
import type { QuestionDemands } from '../../../domain/learn/demand/types';

function demands(overrides: Partial<QuestionDemands> = {}): QuestionDemands {
  return {
    cognitiveDemand: 'explain',
    timeFrames: ['present'],
    structures: [],
    responseLoad: 'developed',
    lexicalReach: 'everyday',
    sufficientAnswer: 'Say why.',
    provenance: 'reviewed',
    ...overrides,
  };
}

function question(d: QuestionDemands | null = demands()): Question {
  return {
    id: 'sch_02', topicKey: 'school', text: 'Pourquoi aimes-tu le français ?', hint: 'reasons',
    difficulty: 2, followUps: [], modelAnswer: '', keyVocab: [], demands: d ?? undefined,
  };
}

// Above the not-attempted floor (0.4 × 40 = 16 words) with an explain marker.
const MET = "J'aime le français parce que le prof est très sympa, les cours sont intéressants et on parle beaucoup en classe avec mes amis";
const SHORT = 'Oui bof';
// Clears the not-attempted floor (0.4 × 40 words) with no explain marker.
const UNKNOWN = Array.from({ length: 20 }, () => 'le chat mange').join(' ');

const CTX = { sessionId: 'sess-exam-voice', topicKey: 'school' };

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('buildDemandOnlyEvidence', () => {
  it('a met transcript yields exactly one demand:* success event, with no score', () => {
    const events = buildDemandOnlyEvidence(question(), MET, CTX);
    expect(events).toHaveLength(1);
    expect(events[0].targetNodeIds).toEqual(['demand:explain']);
    expect(events[0].result.success).toBe(true);
    expect(events[0].result).not.toHaveProperty('score');
  });

  it('a far-too-short transcript yields one avoidance event, never success:false', () => {
    const events = buildDemandOnlyEvidence(question(), SHORT, CTX);
    expect(events).toHaveLength(1);
    expect(events[0].targetNodeIds).toEqual(['demand:explain']);
    expect(events[0].result.success).not.toBe(false);
    expect(events[0].result).not.toHaveProperty('score');
  });

  it('an unknown L1 read yields nothing (no L2 without demandsResolved)', () => {
    expect(buildDemandOnlyEvidence(question(), UNKNOWN, CTX)).toEqual([]);
  });

  it('a question without demands yields nothing', () => {
    expect(buildDemandOnlyEvidence(question(null), MET, CTX)).toEqual([]);
  });

  it('never emits a language event over skill nodes', () => {
    for (const transcript of [MET, SHORT, UNKNOWN]) {
      for (const event of buildDemandOnlyEvidence(question(), transcript, CTX)) {
        expect(event.targetNodeIds.every((id) => id.startsWith('demand:'))).toBe(true);
        expect(event.observation.transcript).toBeUndefined();
      }
    }
  });
});

describe('recordDemandOnlyAttempt', () => {
  it('appends the demand event and refreshes beliefs — no Session, XP, mastery or review write', () => {
    const progressionBefore = localStorage.getItem(`${STORAGE_KEYS.progression}::guest`);
    const sessionsBefore = getSessionHistory().length;

    const events = recordDemandOnlyAttempt({ ...CTX, question: question(), transcript: MET });

    expect(events).toHaveLength(1);
    expect(getEvidenceEvents()).toHaveLength(1);
    expect(getEvidenceEvents()[0].targetNodeIds).toEqual(['demand:explain']);
    expect(getBeliefSnapshot()?.demands?.['demand:explain']).toBeDefined();

    expect(getSessionHistory()).toHaveLength(sessionsBefore);
    expect(localStorage.getItem(`${STORAGE_KEYS.progression}::guest`)).toBe(progressionBefore);
    expect(localStorage.getItem(`${STORAGE_KEYS.topicMastery}::guest`)).toBeNull();
    expect(localStorage.getItem(`${STORAGE_KEYS.reviewPool}::guest`)).toBeNull();
  });

  it('an unknown read writes nothing at all', () => {
    expect(recordDemandOnlyAttempt({ ...CTX, question: question(), transcript: UNKNOWN })).toEqual([]);
    expect(getEvidenceEvents()).toHaveLength(0);
  });
});
