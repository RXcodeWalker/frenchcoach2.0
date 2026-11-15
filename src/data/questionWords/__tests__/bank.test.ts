import { describe, expect, it } from 'vitest';
import { DETECTIVE_BANK } from '../bank';
import { BLANK, DETECTIVE_CASES, fillQuestion, rightFill } from '../cases';
import { highlightWord } from '../../../features/questionDetective/highlight';
import { QUESTION_WORDS, questionWord } from '../words';
import { WORD_IDS, WORD_TO_TYPE, type AnswerType, type WordId, type WordPosition } from '../types';
import { normalizeFrench } from '../../../features/minigames/utils/normalizeFrench';

function wordCount(s: string): number {
  return s.replace(/[?.!,]/g, '').trim().split(/\s+/).filter(Boolean).length;
}

function keyOf(s: string): string {
  return normalizeFrench(s.replace(/-/g, ' '));
}

describe('Question Detective bank', () => {
  it('has eight tools', () => {
    expect(QUESTION_WORDS.map(w => w.id)).toEqual([...WORD_IDS]);
  });

  it('has at least 20 questions per word, and every word in all three positions', () => {
    const positions: WordPosition[] = ['end', 'front', 'estCeQue'];
    for (const id of WORD_IDS) {
      const qs = DETECTIVE_BANK.filter(q => q.wordId === id);
      expect(qs.length, id).toBeGreaterThanOrEqual(20);
      for (const pos of positions) {
        expect(qs.some(q => q.position === pos), `${id} ${pos}`).toBe(true);
      }
    }
  });

  it('keeps every accepted answer to at most three words', () => {
    const long: string[] = [];
    for (const q of DETECTIVE_BANK) {
      for (const a of q.accepted) {
        if (wordCount(a) > 3) long.push(`${q.id}: ${a}`);
      }
    }
    for (const c of DETECTIVE_CASES) {
      for (const close of c.closing) {
        for (const a of close.accepted) {
          if (wordCount(a) > 3) long.push(`${c.id}: ${a}`);
        }
      }
    }
    expect(long).toEqual([]);
  });

  it('tags each question with the type of its word', () => {
    for (const q of DETECTIVE_BANK) {
      expect(q.answerType).toBe(WORD_TO_TYPE[q.wordId]);
      expect(q.model).toBe(q.accepted[0]);
      expect(q.tiles.length).toBeGreaterThan(1);
      expect(q.tiles[q.tiles.length - 1]).toBe('?');
    }
  });

  it('gives every accepted answer exactly one type', () => {
    const types = new Map<string, AnswerType>();
    const clashes: string[] = [];
    for (const q of DETECTIVE_BANK) {
      for (const a of q.accepted) {
        const key = keyOf(a);
        const prev = types.get(key);
        if (prev && prev !== q.answerType) clashes.push(`${a} is ${prev} and ${q.answerType} (${q.id})`);
        else types.set(key, q.answerType);
      }
    }
    expect(clashes).toEqual([]);
  });

  it('has enough answers of each type to pick two distractors of a different type', () => {
    const byType = new Map<AnswerType, Set<string>>();
    for (const q of DETECTIVE_BANK) {
      const set = byType.get(q.answerType) ?? new Set<string>();
      set.add(q.model);
      byType.set(q.answerType, set);
    }
    for (const type of byType.keys()) {
      const others = [...byType.entries()].filter(([t]) => t !== type).reduce((n, [, set]) => n + set.size, 0);
      expect(others, type).toBeGreaterThanOrEqual(2);
    }
  });

  it('has five cases, each with three steps and three closing questions', () => {
    expect(DETECTIVE_CASES).toHaveLength(5);
    for (const c of DETECTIVE_CASES) {
      expect(c.steps, c.id).toHaveLength(3);
      expect(c.closing, c.id).toHaveLength(3);
    }
  });

  it('writes every case step as a reasoned link in the chain', () => {
    for (const c of DETECTIVE_CASES) {
      for (const [i, step] of c.steps.entries()) {
        const where = `${c.id}/${step.id}`;
        // One blank, filled by the tool; the filled question marks the tool.
        expect(step.question.split(BLANK).length, where).toBe(2);
        const word = rightFill(step, questionWord(step.rightWord)!.lemma);
        expect(highlightWord(fillQuestion(step, word), step.rightWord).word, where).not.toBe('');
        // The goal and the glosses are English and say something.
        expect(step.goal.length, where).toBeGreaterThan(20);
        expect(step.questionGloss.length, where).toBeGreaterThan(0);
        expect(step.clue.length, where).toBeGreaterThan(0);
        expect(step.clueGloss.length, where).toBeGreaterThan(0);
        // The goal never hands over the French word.
        expect(step.goal.toLowerCase(), where).not.toContain(questionWord(step.rightWord)!.lemma.toLowerCase());
        // Exactly three other tools, each with a reply, none of them the right one.
        const wrong = Object.keys(step.wrong);
        expect(wrong, where).toHaveLength(3);
        expect(wrong, where).not.toContain(step.rightWord);
        for (const id of wrong) {
          expect(WORD_IDS as readonly string[], where).toContain(id);
          expect(step.wrong[id as WordId]!.length, where).toBeGreaterThan(0);
        }
        // After the first step the goal builds on the clue before it.
        if (i > 0) expect(step.goal, where).not.toBe(c.steps[i - 1].goal);
      }
    }
  });
});

describe('question-word ids', () => {
  it('are the closed WordId list', () => {
    const extra = DETECTIVE_BANK.filter(q => !(WORD_IDS as readonly string[]).includes(q.wordId));
    expect(extra.map(q => q.id)).toEqual([]);
  });
});
