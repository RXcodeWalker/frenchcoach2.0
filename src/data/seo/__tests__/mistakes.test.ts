import { describe, expect, it } from 'vitest';
import { COMMON_MISTAKES } from '../mistakes';
import { TOPIC_PAGES } from '../topics';

const allAnswers = TOPIC_PAGES.flatMap((t) => t.answers.map((a) => a.answer));

describe('common-mistakes data (docs/systems/public-seo-pages.md)', () => {
  it('covers the four themes once each, with slips, fixes and examples', () => {
    expect(COMMON_MISTAKES.map((m) => m.id)).toEqual(['agreement', 'etre-avoir', 'tense', 'short-answers']);
    for (const m of COMMON_MISTAKES) {
      expect(m.slips.length, m.id).toBeGreaterThanOrEqual(2);
      expect(m.fix.length, m.id).toBeGreaterThanOrEqual(3);
      expect(m.examples.length, m.id).toBeGreaterThanOrEqual(3);
      expect(m.marks.length, m.id).toBeGreaterThan(20);
    }
  });

  it('every example is a verbatim highlight from the topic page it names', () => {
    for (const m of COMMON_MISTAKES) {
      for (const ex of m.examples) {
        const topic = TOPIC_PAGES.find((t) => t.slug === ex.topic);
        expect(topic, `${m.id}: no topic ${ex.topic}`).toBeDefined();
        const found = topic!.answers.some((a) => a.highlights.some((h) => h.fr === ex.fr));
        expect(found, `${m.id}: "${ex.fr}" is not a highlight of ${ex.topic}`).toBe(true);
      }
    }
  });

  it('a slip differs from its correction, and no model answer contains a slip', () => {
    for (const m of COMMON_MISTAKES) {
      for (const s of m.slips) {
        expect(s.wrong, m.id).not.toBe(s.right);
        expect(s.note.length, s.wrong).toBeGreaterThan(20);
        // Question-and-answer slips ("Q ? — A") are checked on the answer half.
        const spoken = s.wrong.split(' — ').pop()!.replace(/[.!?]$/, '');
        for (const answer of allAnswers) expect(answer, `${spoken} appears in a model answer`).not.toContain(spoken);
      }
    }
  });

  it('makes no promise about marks', () => {
    const text = JSON.stringify(COMMON_MISTAKES);
    expect(text).not.toMatch(/guarantee|will (earn|get|score|lose)|always (earns|costs)/i);
  });
});
