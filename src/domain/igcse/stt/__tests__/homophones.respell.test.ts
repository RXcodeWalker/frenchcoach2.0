import { describe, it, expect } from 'vitest';
import { respell } from '../homophones/respell';
import { categoryAClass } from '../homophones/classes';
import { RESPELLED, UNCHANGED } from './homophones.fixtures';

function words(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

describe('respell — context-consistent spelling', () => {
  it.each(RESPELLED)('%s → %s', (heard, expected) => {
    expect(respell(heard).text).toBe(expected);
  });

  it.each(UNCHANGED)('leaves %j as heard', (heard) => {
    const r = respell(heard);
    expect(r.text).toBe(heard);
    expect(r.changes).toEqual([]);
  });
});

describe('respell — guard invariants', () => {
  const corpus = [...RESPELLED.map(([h]) => h), ...UNCHANGED];

  it.each(corpus)('%j: same word count, spacing and punctuation', (heard) => {
    const out = respell(heard).text;
    expect(words(out).length).toBe(words(heard).length);
    expect(out.replace(/[\p{L}'’-]/gu, '')).toBe(heard.replace(/[\p{L}'’-]/gu, ''));
  });

  it.each(corpus)('%j: every change stays in the sound class of the word heard', (heard) => {
    const heardWords = words(heard);
    const outWords = words(respell(heard).text);
    for (const c of respell(heard).changes) {
      expect(heardWords[c.index]).toContain(c.from);
      expect(outWords[c.index]).toContain(c.to);
      expect(categoryAClass(c.from, c.to)?.id, `${c.from} → ${c.to}`).toBe(c.classId);
    }
    heardWords.forEach((w, i) => {
      if (w !== outWords[i]) expect(categoryAClass(w, outWords[i]), `${w} → ${outWords[i]}`).not.toBeNull();
    });
  });

  it.each(corpus)('%j: respelling is idempotent', (heard) => {
    const once = respell(heard).text;
    expect(respell(once).text).toBe(once);
  });

  it('keeps the original whitespace exactly', () => {
    expect(respell('  ils   mange\tune pomme \n').text).toBe('  ils   mangent\tune pomme \n');
  });

  it('keeps capitalisation', () => {
    expect(respell('ILS MANGE').text).toBe('ILS MANGENT');
    expect(respell('Il Mangent').text).toBe('Il Mange');
  });

  it('records the word heard and the word written', () => {
    expect(respell("J'ai un frère. Ils mangent.").changes).toEqual([
      { index: 3, from: 'Ils', to: 'Il', rule: 'subject-number', classId: 'il-ils' },
      { index: 4, from: 'mangent', to: 'mange', rule: 'subject-verb', classId: 'present-e' },
    ]);
  });
});
