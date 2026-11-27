import { describe, expect, it } from 'vitest';
import { correctedAnswer, descriptorArea, errorCategories, placeErrors } from '../examinerAnswer';
import type { ExaminerErrorItem } from '../../../../services/coaching/examinerFeedback';

const e = (quote: string, correction: string, category: ExaminerErrorItem['category'] = 'verb_form'): ExaminerErrorItem => ({
  quote,
  correction,
  category,
});

describe('examinerAnswer', () => {
  const T = "Hier j'ai mange une pizza avec mon mère.";

  it('places each mistake in reading order, case-insensitively, never overlapping', () => {
    const placed = placeErrors(T, [e('mon mère', 'ma mère', 'gender'), e("J'ai mange", "j'ai mangé")]);
    expect(placed.map((p) => T.slice(p.start, p.end))).toEqual(["j'ai mange", 'mon mère']);
    expect(placeErrors(T, [e('une pizza', 'des pizzas'), e('pizza', 'pizzas')])).toHaveLength(1);
  });

  it('applies every correction, or gives nothing when one cannot be placed', () => {
    expect(correctedAnswer(T, [e("j'ai mange", "j'ai mangé"), e('mon mère', 'ma mère', 'gender')])).toBe(
      "Hier j'ai mangé une pizza avec ma mère.",
    );
    expect(correctedAnswer(T, [e('le chat', 'la chatte')])).toBeNull();
    expect(correctedAnswer(T, [])).toBe(T);
    expect(correctedAnswer('  ', [])).toBeNull();
  });

  it('counts mistakes by type, most first', () => {
    expect(errorCategories([e('a', 'b', 'gender'), e('c', 'd'), e('f', 'g')])).toEqual([
      { category: 'verb_form', count: 2 },
      { category: 'gender', count: 1 },
    ]);
  });

  it('names the part of the Notes a descriptor comes from', () => {
    expect(descriptorArea('C3')).toBe('Communication');
    expect(descriptorArea('S2')).toBe('Range of structures');
    expect(descriptorArea('V1')).toBe('Range of vocabulary');
  });
});
