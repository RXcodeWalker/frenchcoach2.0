import { describe, expect, it } from 'vitest';
import { CLOSED_CLASSES, PATTERN_CLASSES, eSoundStem } from '../../../domain/igcse/stt/homophones/classes';
import { TOPICS } from '../../../data/topics';
import { DICTEE_FORMATS, DICTEE_ITEMS, DICTEE_LEVELS, acceptedSpellings, itemsFor, type DicteeItem } from '../../../data/dictee';
import { ROUND_SIZE } from '../engine';
import { judgeLine, toWords } from '../judge';

const closed = new Map(CLOSED_CLASSES.map(c => [c.id, c]));
const patternIds = new Set(PATTERN_CLASSES.map(c => c.id));

/** Whether `item.fr` really contains something from the sound-alike class `id`. */
function containsTrap(item: DicteeItem, id: string): boolean {
  const words = toWords(item.fr).map(w => w.text.toLowerCase());
  const cls = closed.get(id);
  if (cls) return words.some(w => cls.forms.includes(w));
  if (id === 'e-sound') return words.some(w => eSoundStem(w) !== null);
  if (id === 'present-e') return words.some(w => /(?:es?|ent)$/.test(w));
  return patternIds.has(id); // another pattern class: only its id is checked
}

describe('the Dictée bank', () => {
  it('has the shape the screens rely on', () => {
    for (const format of DICTEE_FORMATS) {
      for (const level of DICTEE_LEVELS) {
        // twice a round, so consecutive rounds are not the same lines
        expect(itemsFor(format, level).length, `${format} ${level}`).toBeGreaterThanOrEqual(ROUND_SIZE[format] * 2);
      }
    }
  });

  it('gives every line a permanent, unique id that says what it is', () => {
    const ids = DICTEE_ITEMS.map(i => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const i of DICTEE_ITEMS) expect(i.id, i.fr).toBe(`${i.format === 'words' ? 'w' : 's'}-${i.level.toLowerCase()}-${i.id.split('-')[2]}`);
    expect(ids.every(id => /^[ws]-(a1|a2|b1)-\d{2}$/.test(id))).toBe(true);
  });

  it('never repeats a line', () => {
    const lines = DICTEE_ITEMS.map(i => i.fr.toLowerCase());
    expect(new Set(lines).size).toBe(lines.length);
  });

  it('is written to be spoken and typed: clean text, numbers in letters, a meaning for each', () => {
    for (const i of DICTEE_ITEMS) {
      expect(i.fr, i.id).toBe(i.fr.normalize('NFC').trim().replace(/\s+/g, ' '));
      expect(i.fr, i.id).not.toMatch(/\d/);
      expect(i.fr, i.id).not.toMatch(/[’‘]/); // the bank uses straight apostrophes; the judge accepts both
      expect(i.en.trim().length, i.id).toBeGreaterThan(2);
      expect(TOPICS.some(t => t.key === i.topicKey), `${i.id} topic ${i.topicKey}`).toBe(true);
    }
  });

  it('keeps words short and sentences a sensible length, getting longer with the level', () => {
    for (const i of DICTEE_ITEMS) {
      const n = toWords(i.fr).length;
      if (i.format === 'words') expect(n, i.fr).toBeLessThanOrEqual(4);
      else {
        expect(n, i.fr).toBeGreaterThanOrEqual(3);
        expect(n, i.fr).toBeLessThanOrEqual(16);
        expect(i.fr.length, i.fr).toBeLessThanOrEqual(110);
      }
    }
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const avg = (level: 'A1' | 'A2' | 'B1') => mean(itemsFor('sentences', level).map(i => i.fr.length));
    expect(avg('A1')).toBeLessThan(avg('A2'));
    expect(avg('A2')).toBeLessThan(avg('B1'));
  });

  it('is marked perfect when typed exactly, in capitals, or with curly apostrophes', () => {
    for (const i of DICTEE_ITEMS) {
      for (const typed of [i.fr, i.fr.toUpperCase(), i.fr.toLowerCase(), i.fr.replace(/'/g, '’')]) {
        expect(judgeLine(acceptedSpellings(i), typed).perfect, `${i.id}: ${typed}`).toBe(true);
      }
    }
  });

  it('can be won on a keyboard with no accents: no line needs anything but an accent-level slip', () => {
    const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe');
    for (const i of DICTEE_ITEMS) {
      const v = judgeLine(acceptedSpellings(i), strip(i.fr).toLowerCase());
      const bad = v.marks.filter(m => !['ok', 'accent', 'punct', 'sound'].includes(m.kind));
      expect(bad, `${i.id} ${i.fr}`).toEqual([]);
      expect(v.credit, i.id).toBeGreaterThanOrEqual(0.5);
    }
  });

  it('lists only sound-alike classes that exist and really are in the line', () => {
    for (const i of DICTEE_ITEMS) {
      for (const id of i.traps ?? []) {
        expect(closed.has(id) || patternIds.has(id), `${i.id}: unknown class ${id}`).toBe(true);
        expect(containsTrap(i, id), `${i.id} "${i.fr}" has no "${id}"`).toBe(true);
      }
    }
  });

  it('has enough sound-alike sentences at every level for the Sound-alikes focus', () => {
    for (const level of DICTEE_LEVELS) {
      const n = itemsFor('sentences', level).filter(i => (i.traps?.length ?? 0) > 0).length;
      expect(n, level).toBeGreaterThanOrEqual(ROUND_SIZE.sentences * 2);
    }
  });

  it('declares each alternative spelling as a different line', () => {
    for (const i of DICTEE_ITEMS) {
      const all = acceptedSpellings(i).map(s => s.toLowerCase());
      expect(new Set(all).size, i.id).toBe(all.length);
    }
  });
});
