import { describe, expect, it } from 'vitest';
import { DETECTIVE_BANK } from '../bank';
import { DETECTIVE_CASES } from '../cases';
import { QUESTION_WORDS } from '../words';
import { WORD_IDS, WORD_TO_TYPE, type AnswerType, type WordPosition } from '../types';
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

  it('has five cases, each with three witnesses and three closing questions', () => {
    expect(DETECTIVE_CASES).toHaveLength(5);
    for (const c of DETECTIVE_CASES) {
      expect(c.witnesses).toHaveLength(3);
      expect(c.closing).toHaveLength(3);
      for (const w of c.witnesses) {
        expect(w.clue.length).toBeGreaterThan(0);
        expect(w.wrong[w.rightWord]).toBeUndefined();
        expect(Object.keys(w.wrong).length).toBe(WORD_IDS.length - 1);
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
