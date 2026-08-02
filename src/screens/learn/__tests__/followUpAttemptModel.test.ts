// ── Phase 3 Slice D: follow-up-turn attempt model (pure logic) ────────────────
// Learn.tsx and SessionSummary.tsx are stateful screen components with no
// existing test file (CLAUDE.md: only pure functions are unit-tested). These
// tests replicate the exact reduce/guard expressions those files use against
// QuestionAttempt/SessionQuestion fixtures, without rendering React.

import { describe, it, expect } from 'vitest';
import type { FeedbackV2, QuestionAttempt, SessionQuestion, Question } from '../../../types';

function makeFeedback(overrides: Partial<FeedbackV2> = {}): FeedbackV2 {
  return {
    scores: { overall: 6, communication: 6, language: 6, fluency: 6 },
    grammar: { critical: [], polish: [] },
    vocabulary: [], style: [], fillers: [],
    wordCount: 45, cefrLevel: 'A2', issues: [],
    ...overrides,
  };
}

function makeAttempt(overrides: Partial<QuestionAttempt> = {}): QuestionAttempt {
  return {
    transcript: 'Une reponse.',
    score: 6,
    xpEarned: 10,
    feedback: makeFeedback(),
    durationSec: 20,
    attemptIndex: 1,
    ...overrides,
  };
}

function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 'q1', topicKey: 'school', text: 'Question?', hint: '', difficulty: 1,
    followUps: ['Follow-up prompt?'], modelAnswer: '', keyVocab: [],
    ...overrides,
  };
}

// Mirrors _finalizeAnswer's bestScore guard (Learn.tsx): a follow-up attempt
// must never move bestScore, since SessionProgressBar/SessionSummary key on it
// as "mastery of the catalogued question."
function applyAttempt(sq: SessionQuestion, attempt: QuestionAttempt): SessionQuestion {
  const isFollowUpAttempt = attempt.kind === 'followup';
  const updated: SessionQuestion = { ...sq, attempts: [...sq.attempts, attempt] };
  if (!isFollowUpAttempt && attempt.score !== null) {
    updated.bestScore = Math.max(updated.bestScore ?? attempt.score, attempt.score);
  }
  return updated;
}

// Mirrors SessionSummary.tsx's totalWords fix: last MAIN attempt, not literal last.
function lastMainWordCount(q: SessionQuestion): number {
  const mainAttempts = q.attempts.filter(at => at.kind !== 'followup');
  const last = mainAttempts[mainAttempts.length - 1];
  return last?.transcript?.split(/\s+/).filter(Boolean).length ?? 0;
}

describe('follow-up attempt model', () => {
  it('appends a follow-up attempt without advancing bestScore', () => {
    let sq: SessionQuestion = {
      question: makeQuestion(), status: 'active', attempts: [], bestScore: null, savedVocab: [],
    };
    sq = applyAttempt(sq, makeAttempt({ score: 6, attemptIndex: 1, kind: 'main' }));
    expect(sq.bestScore).toBe(6);

    // A high-scoring follow-up must not lift bestScore.
    sq = applyAttempt(sq, makeAttempt({
      score: 9, attemptIndex: 3, kind: 'followup', promptText: 'Follow-up prompt?',
      transcript: 'Une reponse plus longue au suivi.',
    }));
    expect(sq.bestScore).toBe(6);
    expect(sq.attempts).toHaveLength(2);
    expect(sq.attempts[1].kind).toBe('followup');
  });

  it('a low-scoring follow-up does not drag bestScore down either (excluded entirely)', () => {
    let sq: SessionQuestion = {
      question: makeQuestion(), status: 'active', attempts: [], bestScore: null, savedVocab: [],
    };
    sq = applyAttempt(sq, makeAttempt({ score: 8, attemptIndex: 1, kind: 'main' }));
    sq = applyAttempt(sq, makeAttempt({ score: 2, attemptIndex: 3, kind: 'followup' }));
    expect(sq.bestScore).toBe(8);
  });

  it('SessionSummary word count uses the last MAIN attempt, not the literal last attempt', () => {
    const sq: SessionQuestion = {
      question: makeQuestion(),
      status: 'completed',
      bestScore: 7,
      savedVocab: [],
      attempts: [
        makeAttempt({ transcript: 'Cinq mots dans cette reponse principale.', attemptIndex: 1, kind: 'main' }),
        makeAttempt({ transcript: 'Trois mots suivi.', attemptIndex: 3, kind: 'followup', promptText: 'Follow-up prompt?' }),
      ],
    };
    // Main attempt has 6 words; follow-up has 3. Must sum the main one.
    expect(lastMainWordCount(sq)).toBe(6);
  });

  it('a session with no follow-up attempts is unaffected by the fix', () => {
    const sq: SessionQuestion = {
      question: makeQuestion(),
      status: 'completed',
      bestScore: 7,
      savedVocab: [],
      attempts: [
        makeAttempt({ transcript: 'Premiere tentative courte.', attemptIndex: 1, kind: 'main' }),
        makeAttempt({ transcript: 'Deuxieme tentative de retry plus longue.', attemptIndex: 2, kind: 'main' }),
      ],
    };
    expect(lastMainWordCount(sq)).toBe(6);
  });
});
