import { describe, expect, it } from 'vitest';
import type { NewsFact } from '../../../data/news/types';
import { answerChecks, applyFixes, answerIndexOf, placeFixes, showsHabit, type Fix } from '../show/answerReview';

const fix = (quote: string, correction: string): Fix => ({ kind: 'fix', quote, correction });

const honey: NewsFact = { id: 'honey', label: 'The honey', note: '50 kg every summer', keywords: ['cinquante'] };
const kit: NewsFact = { id: 'kit', label: 'Your kit', note: 'combinaison, gants', keywords: ['combinaison', 'gant*'] };

describe('answerReview', () => {
  const answers = ["Je fais des gâteau avec le miel.", "Hier j'ai fait une tarte. C'est bon.", ''];

  it('places each fix under the answer it quotes; a quote in no answer stays overall', () => {
    const fixes = [fix('des gâteau', 'des gâteaux'), fix("c'est bon", "c'était bon"), fix('le miel. Hier', '…')];
    const { byAnswer, unplaced } = placeFixes(fixes, answers);
    expect(byAnswer[0].map(f => f.correction)).toEqual(['des gâteaux']);
    expect(byAnswer[1].map(f => f.correction)).toEqual(["c'était bon"]);
    expect(byAnswer[2]).toEqual([]);
    expect(unplaced).toHaveLength(1); // spans two answers
  });

  it('matches a quote across case, spacing, edge punctuation and either apostrophe', () => {
    expect(answerIndexOf('« C’EST   bon. »', answers)).toBe(1);
    expect(answerIndexOf('', answers)).toBe(-1);
  });

  it("applies an answer's own fixes to say it better, and says nothing when nothing changed", () => {
    expect(applyFixes(answers[1], [fix("c'est bon", "c'était bon")])).toBe("Hier j'ai fait une tarte. c'était bon.");
    expect(applyFixes(answers[1], [fix('pas là', 'ici')])).toBeNull();
  });

  it('ticks the fact the question needed, or quotes the sheet as a suggestion', () => {
    const turn = { fact: honey, sheet: [honey, kit], starters: [] };
    const used = answerChecks(turn, "Les abeilles font 50 kilos de miel, et je porte une combinaison.");
    expect(used.find(c => c.key === 'fact')).toMatchObject({ met: true });
    expect(used.find(c => c.key === 'extra')).toMatchObject({ met: true, detail: 'Your kit' });
    const missed = answerChecks(turn, 'Les abeilles font beaucoup de miel chaque été, vraiment beaucoup.');
    expect(missed.find(c => c.key === 'fact')).toMatchObject({ met: false, detail: 'It says: 50 kg every summer' });
  });

  it('checks the habit the question asked for, quoting what was heard, and suggests a starter otherwise', () => {
    const past = answerChecks({ habit: 'past', starters: ["Hier, j'ai…"] }, "Hier, j'ai préparé une tarte aux pommes pour les clients.");
    expect(past.find(c => c.key === 'past')).toMatchObject({ met: true, detail: "« j'ai préparé »" });
    const noPast = answerChecks({ habit: 'past', starters: ["Hier, j'ai…"] }, 'Je prépare une tarte aux pommes pour les clients ce soir.');
    expect(noPast.find(c => c.key === 'past')).toMatchObject({ met: false, label: 'Try the past' });
    expect(noPast.find(c => c.key === 'past')!.detail).toContain("Hier, j'ai…");
    expect(showsHabit('reason', "J'aime ça parce que c'est bon.")).toBe(true);
    expect(showsHabit('future', "L'année prochaine, nous allons installer deux ruches.")).toBe(true);
  });

  it('suggests saying more for a very short answer, and checks nothing on a skipped one', () => {
    expect(answerChecks({ starters: [] }, 'Oui, trois ruches.').map(c => c.key)).toEqual(['short']);
    expect(answerChecks({ habit: 'past', fact: honey, starters: [] }, '  ')).toEqual([]);
  });
});
