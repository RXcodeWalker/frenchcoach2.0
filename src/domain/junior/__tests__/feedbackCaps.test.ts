/**
 * The hard caps (junior-track §9): no per-turn feedback exceeds one line, no
 * Postcard exceeds four, and none of it carries a number, score or verdict.
 * Walks every reachable turn path rather than a hand-picked few.
 */
import { describe, expect, it } from 'vitest';
import { JUNIOR_BANK, JUNIOR_PATTERNS } from '../../../data/junior';
import type { MatchResult } from '../matchAnswer';
import { MAX_POSTCARD_LINES, buildPostcard, postcardLines } from '../postcard';
import {
  answerEtToi,
  answerQuestion,
  answerWarmup,
  startEtToiTurn,
  startQuestionTurn,
  startWarmupTurn,
  turnLineText,
  withLevelUp,
  type QuestionTurnState,
  type TurnResponse,
} from '../turnFlow';
import type { JuniorTurnResult, MatchOutcome } from '../types';
import type { WarmupDecision } from '../warmup';

const OUTCOMES: MatchOutcome[] = ['got', 'almost', 'none'];
const m = (outcome: MatchOutcome): MatchResult => ({ outcome, frames: [], heard: [] });

/** Every response of every question-turn path (all outcome sequences until Léo moves on). */
function allQuestionResponses(): TurnResponse[] {
  const out: TurnResponse[] = [];
  const walk = (state: QuestionTurnState, depth: number) => {
    if (depth > 4) throw new Error('a question turn never ended');
    for (const o of OUTCOMES) {
      const step = answerQuestion(state, m(o));
      out.push(step.response, withLevelUp(step.response, true));
      if (step.response.next === 'listen') walk(step.state, depth + 1);
    }
  };
  walk(startQuestionTurn(), 0);
  return out;
}

function allWarmupResponses(): TurnResponse[] {
  const decisions: WarmupDecision[] = ['webSpeech', 'whisper', 'checkMic'];
  const out: TurnResponse[] = [];
  for (const a of decisions) {
    const first = answerWarmup(startWarmupTurn(), a);
    out.push(first.response);
    if (first.response.next === 'listen') for (const b of decisions) out.push(answerWarmup(first.state, b).response);
  }
  return out;
}

const NO_NUMBERS_OR_VERDICTS = /\d|%|score|grade|band|mark|wrong|incorrect|✗|❌/i;

describe('per-turn feedback: Léo\'s state + at most one line', () => {
  const responses = [...allQuestionResponses(), ...allWarmupResponses(), answerEtToi(startEtToiTurn()).response];
  const theme = JUNIOR_BANK.themes[0];

  it('every response carries a single line key or none', () => {
    expect(responses.length).toBeGreaterThan(20);
    for (const r of responses) expect(r.line === null || typeof r.line === 'string').toBe(true);
  });

  it('every line resolves to one short line of text with no number, score or verdict', () => {
    for (const r of responses) {
      if (r.line === null) continue;
      for (const pattern of JUNIOR_PATTERNS) {
        for (const turnIndex of [0, 1, 2, 3]) {
          const t = turnLineText(r.line, { turnIndex, etToi: theme.etToi[0], pattern });
          const texts = t.kind === 'leo' ? [t.line.fr, t.line.en] : [t.en];
          for (const text of texts) {
            expect(text.split('\n')).toHaveLength(1);
            expect(text, text).not.toMatch(NO_NUMBERS_OR_VERDICTS);
          }
        }
      }
    }
  });

  it('praise only comes from the fixed set (§8)', () => {
    const praise = new Set([0, 1, 2, 3, 4, 5].map((turnIndex) => {
      const t = turnLineText('praise', { turnIndex });
      return t.kind === 'leo' ? t.line.fr : '';
    }));
    expect([...praise].sort()).toEqual(['Bravo !', 'Génial !', 'Super !']);
    const encore = turnLineText('encore', { turnIndex: 0 });
    expect(encore.kind === 'leo' && encore.line.fr).toBe('Encore ?');
  });
});

describe('Postcard: at most four lines, whatever the mission', () => {
  it('holds for every mix of outcomes over a five-turn mission', () => {
    const sticker = { sticker: JUNIOR_BANK.themes[0].stickers[0], gold: false };
    const questions = JUNIOR_BANK.questions.slice(0, 5);
    // 3^5 = 243 outcome combinations.
    for (let code = 0; code < 3 ** 5; code++) {
      const turns: JuniorTurnResult[] = questions.map((q, i) => ({
        questionId: q.id,
        outcome: OUTCOMES[Math.floor(code / 3 ** i) % 3],
        frames: q.frames.map((f, k) => ({ patternId: f.patternId, step: 'frame', sentence: q.modelAnswer[k] })),
        heard: [],
        recordingId: null,
      }));
      for (const gold of [false, true]) {
        const lines = postcardLines(buildPostcard(turns, { ...sticker, gold }));
        expect(lines.length).toBeLessThanOrEqual(MAX_POSTCARD_LINES);
        for (const line of lines) expect(line).not.toMatch(NO_NUMBERS_OR_VERDICTS);
      }
    }
  });
});
