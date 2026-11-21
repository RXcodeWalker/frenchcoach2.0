import { describe, expect, it } from 'vitest';
import { MISHEARD_EXPRESSIONS, repairMisheardExpressions } from '../misheardExpressions';

const OWNER_ANSWER =
  'Le samedi matin, premièrement, je prends la graisse matinée. Donc, je me lève très tard. Après, je prends un petit déjeuner délicieux.';

describe('repairMisheardExpressions', () => {
  it('owner report 2026-11-21: « graisse matinée » is read as « grasse matinée », with a pronunciation note', () => {
    const { text, notes } = repairMisheardExpressions(OWNER_ANSWER);
    expect(text).toContain('je prends la grasse matinée. Donc');
    expect(text).not.toMatch(/graisse/i);
    // Everything else is untouched, word for word.
    expect(text.replace('grasse', 'graisse')).toBe(OWNER_ANSWER);
    expect(notes).toEqual([
      expect.objectContaining({ expressionId: 'grasse_matinee', heard: 'graisse matinée', meant: 'grasse matinée' }),
    ]);
    expect(notes[0].tip).toMatch(/open French \[a\]/);
  });

  it('matches without accents and in any case, and keeps a sentence-initial capital', () => {
    expect(repairMisheardExpressions('Graisse matinee le dimanche.').text).toBe('Grasse matinée le dimanche.');
    expect(repairMisheardExpressions('je fais la GRAISSE MATINÉE').text).toBe('je fais la grasse matinée');
  });

  it('repairs a same-sound spelling silently (no note: the learner cannot have said it wrong)', () => {
    const { text, notes } = repairMisheardExpressions("Mon emploi du tant est chargé et j'ai fin à midi.");
    expect(text).toBe("Mon emploi du temps est chargé et j'ai faim à midi.");
    expect(notes).toEqual([]);
  });

  it('gives one note per expression even when it is misheard twice', () => {
    const { notes } = repairMisheardExpressions('La graisse matinée, oui, la graisse matinée.');
    expect(notes).toHaveLength(1);
  });

  it('never matches across a full stop or a comma', () => {
    const input = 'Je ne mange pas gras. Matinée calme.';
    expect(repairMisheardExpressions(input)).toEqual({ text: input, notes: [] });
    expect(repairMisheardExpressions('le gras, matinée').text).toBe('le gras, matinée');
  });

  it('leaves correct French and real learner mistakes alone', () => {
    for (const input of [
      'Je fais la grasse matinée.',
      // A grammar slip the learner really made is the feedback's to correct, not ours.
      'Je fais grasse matinée.',
      'Mon emploi de temps.',
      'Ma mère est gentille.',
      'Je lis des bandes dessinées.',
      'La graisse est mauvaise pour la santé.',
    ]) {
      expect(repairMisheardExpressions(input)).toEqual({ text: input, notes: [] });
    }
  });

  it('every variant is distinct from its expression once accents and case are ignored, and every tip is English prose', () => {
    const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/-/g, ' ');
    const ids = new Set<string>();
    for (const e of MISHEARD_EXPRESSIONS) {
      expect(ids.has(e.id)).toBe(false);
      ids.add(e.id);
      expect(e.id).toMatch(/^[a-z_]+$/);
      for (const v of e.variants) {
        expect(fold(v.heard)).not.toBe(fold(e.expression));
        expect(v.heard).toBe(v.heard.toLowerCase());
        if (v.tip) expect(v.tip.length).toBeGreaterThan(30);
        // The repair round-trips: a variant on its own becomes the expression.
        expect(repairMisheardExpressions(v.heard).text).toBe(e.expression);
      }
    }
  });
});
