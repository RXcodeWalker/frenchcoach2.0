import { describe, expect, it } from 'vitest';
import { QUESTIONS, TOPICS } from '../questions';
import { LEARN_SUB_TOPICS } from '../learnSubTopics';
import { lintLearnBank } from '../learnBankLint';
import { MIN_FOCUS_MATCHES } from '../../domain/learn/selection/filters';

// Content gate for Learn overhaul Batch 3b: the real bank, not fixtures.
const CORE = TOPICS.filter((t) => !t.isAdvanced).map((t) => t.key);
const coreQuestions = QUESTIONS.filter((q) => CORE.includes(q.topicKey));
/** Plan D7: coachHint is written for these eight topics first; the rest follow later. */
const HINTED_TOPICS = ['school', 'hobbies', 'family', 'holidays', 'home', 'future', 'food', 'environment'];

describe('Learn question bank — Batch 3b content', () => {
  it('every core-topic question has a sub-topic from its topic\'s closed list', () => {
    const missing = coreQuestions.filter((q) => !q.subTopic).map((q) => q.id);
    expect(missing).toEqual([]);
    expect(lintLearnBank(QUESTIONS).filter((i) => i.code === 'sub-topic-not-in-topic')).toEqual([]);
  });

  it('every listed sub-topic has enough questions to be offered as a Focus chip', () => {
    for (const [topic, list] of Object.entries(LEARN_SUB_TOPICS)) {
      for (const s of list) {
        const n = QUESTIONS.filter((q) => q.topicKey === topic && q.subTopic === s.key).length;
        expect(n, `${topic}/${s.key}`).toBeGreaterThanOrEqual(MIN_FOCUS_MATCHES);
      }
    }
  });

  it('the priority topics carry a coachHint on every question, and no lint error anywhere', () => {
    const missing = QUESTIONS.filter((q) => HINTED_TOPICS.includes(q.topicKey) && !q.coachHint).map((q) => q.id);
    expect(missing).toEqual([]);
    expect(lintLearnBank(QUESTIONS).filter((i) => i.severity === 'error')).toEqual([]);
  });

  it('no bare yes/no question remains in a core topic, except entries a human already reviewed (their wording is the owner\'s to change)', () => {
    const reviewed = new Set(QUESTIONS.filter((q) => q.demands?.provenance === 'reviewed').map((q) => q.id));
    const bare = lintLearnBank(coreQuestions)
      .filter((i) => i.code === 'bare-yes-no-question')
      .map((i) => i.questionId)
      .filter((id) => !reviewed.has(id));
    expect(bare).toEqual([]);
  });

  it('hint is left as written (it feeds inference and avoidance); coachHint is the learner-facing help', () => {
    for (const q of QUESTIONS) expect(typeof q.hint, q.id).toBe('string');
  });
});
