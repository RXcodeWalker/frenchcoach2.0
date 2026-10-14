import { describe, expect, it } from 'vitest';
import { JUNIOR_BANK } from '..';
import { MAX_SENTENCE_WORDS, countWords, lintJuniorBank } from '../juniorBankLint';
import type { JuniorBank } from '../types';

type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };

/** A deep, mutable copy of the real bank, so each test breaks exactly one thing. */
function bank(): Mutable<JuniorBank> {
  return JSON.parse(JSON.stringify(JUNIOR_BANK)) as Mutable<JuniorBank>;
}

const codes = (b: Mutable<JuniorBank>) => lintJuniorBank(b as JuniorBank).map((i) => i.code);
const question = (b: Mutable<JuniorBank>, id: string) => b.questions.find((q) => q.id === id)!;

describe('countWords', () => {
  it('counts written words, not punctuation or guillemets', () => {
    expect(countWords("J'aime le bleu.")).toBe(3);
    expect(countWords("Tu n'as plus besoin d'aide pour « J'aime… » !")).toBe(7);
    expect(countWords('Super !')).toBe(1);
    expect(countWords("Qu'est-ce que tu aimes manger ?")).toBe(5);
  });
});

describe('lintJuniorBank', () => {
  it('is quiet for the real bank', () => {
    expect(lintJuniorBank(JUNIOR_BANK)).toEqual([]);
  });

  describe('sentences', () => {
    it('errors on a Léo line over the word limit', () => {
      const b = bank();
      question(b, 'moi_01').prompt.fr = 'Dis-moi combien tu as de bougies sur ton gâteau cette année';
      expect(codes(b)).toEqual(['sentence-too-long']);
    });
    it('errors on a rendered kid sentence over the word limit', () => {
      const b = bank();
      const frame = question(b, 'moi_01').frames[0];
      frame.template = "Moi, je dis que j'ai bien {slot} ans aujourd'hui.";
      frame.slotOptions = frame.slotOptions.slice(0, 2);
      expect(codes(b)).toContain('sentence-too-long');
    });
    it('allows exactly the limit', () => {
      const b = bank();
      question(b, 'moi_01').prompt.fr = 'un deux trois quatre cinq six sept huit';
      expect(countWords(question(b, 'moi_01').prompt.fr)).toBe(MAX_SENTENCE_WORDS);
      expect(codes(b)).toEqual([]);
    });
    it('errors on a missing English helper, everywhere one is required', () => {
      const b = bank();
      question(b, 'moi_01').prompt.en = '';
      question(b, 'moi_02').frames[0].slotOptions[0].en = ' ';
      b.themes[0].etToi[0].reply.en = '';
      b.fixedLines[0].en = '';
      expect(codes(b)).toEqual(['missing-text', 'missing-text', 'missing-text', 'missing-text']);
    });
  });

  describe('picks', () => {
    it('errors on a pick with no picture', () => {
      const b = bank();
      question(b, 'moi_02').frames[0].slotOptions[0].emoji = '';
      expect(codes(b)).toEqual(['slot-picture']);
    });
    it('errors on a question with no picture', () => {
      const b = bank();
      question(b, 'moi_02').emoji = '';
      expect(codes(b)).toEqual(['slot-picture']);
    });
    it('errors on a noun pick with no article', () => {
      const b = bank();
      const pick = question(b, 'moi_02').frames[0].slotOptions[0];
      pick.article = null;
      pick.gender = null;
      expect(codes(b)).toContain('slot-article');
    });
    it('errors on an adjective or number pick that carries an article', () => {
      const b = bank();
      const colour = question(b, 'col_03').frames[0].slotOptions[0];
      colour.article = 'le';
      colour.gender = 'm';
      const age = question(b, 'moi_01').frames[0].slotOptions[0];
      age.article = 'le';
      age.gender = 'm';
      expect(codes(b).filter((c) => c === 'slot-article')).toHaveLength(2);
    });
    it('errors when the article and gender disagree', () => {
      const b = bank();
      question(b, 'moi_02').frames[0].slotOptions[0].gender = 'f'; // le chocolat
      expect(codes(b)).toEqual(['article-gender']);
    });
    it('errors when le/la should have elided, and when l\' cannot', () => {
      const b = bank();
      const [summer, , spring] = question(b, 'moi_06').frames[0].slotOptions;
      summer.article = 'le'; // le été
      spring.article = "l'"; // l'printemps
      question(b, 'moi_06').modelAnswer = ["J'aime l'hiver."]; // keep the model answer reachable
      expect(codes(b)).toEqual(['article-elision', 'article-elision']);
    });
    it('accepts l\' before a mute or aspirated h', () => {
      const b = bank();
      const winter = question(b, 'moi_06').frames[0].slotOptions[1];
      expect(winter).toMatchObject({ word: 'hiver', article: "l'" });
      expect(codes(b)).toEqual([]);
    });
    it('errors on too few or too many picks, and on a repeated pick id', () => {
      const b = bank();
      const frame = question(b, 'moi_02').frames[0];
      frame.slotOptions = frame.slotOptions.slice(0, 1);
      const many = question(b, 'moi_03').frames[0];
      many.slotOptions = [...many.slotOptions, ...many.slotOptions];
      expect(codes(b)).toContain('slot-options');
      expect(codes(b)).toContain('duplicate-id');
    });
  });

  describe('gendered adjectives', () => {
    it('errors when an adjective pick is gendered but lists only one form', () => {
      const b = bank();
      const green = question(b, 'col_03').frames[0].slotOptions.find((o) => o.id === 'vert')!;
      green.variants = [];
      expect(codes(b)).toEqual(['gendered-adjective']);
    });
    it('accepts the pair when the feminine is the pick and the masculine is the variant', () => {
      const b = bank();
      const blue = question(b, 'col_03').frames[0].slotOptions.find((o) => o.id === 'bleu')!;
      blue.word = 'bleue';
      blue.variants = ['bleu'];
      expect(codes(b)).toEqual([]);
    });
    it('errors on a gendered adjective in fixed template text', () => {
      const b = bank();
      question(b, 'moi_05').frames[0].template = 'Je suis grand et {slot}.';
      expect(codes(b)).toContain('gendered-adjective');
    });
  });

  describe('frames and patterns', () => {
    it('errors on zero frames and on three', () => {
      const b = bank();
      question(b, 'moi_01').frames = [];
      question(b, 'moi_01').modelAnswer = [];
      const q = question(b, 'moi_07');
      q.frames = [q.frames[0], q.frames[1], q.frames[0]];
      q.modelAnswer = [...q.modelAnswer, q.modelAnswer[0]];
      expect(codes(b).filter((c) => c === 'frame-count')).toHaveLength(2);
    });
    it('errors on a pattern id that is not in the registry', () => {
      const b = bank();
      question(b, 'moi_01').frames[0].patternId = 'j-adore-le-X';
      expect(codes(b)).toContain('unknown-pattern');
    });
    it('errors on a template that is missing its pattern core words', () => {
      const b = bank();
      question(b, 'moi_01').frames[0].template = 'Je suis {slot} ans.';
      expect(codes(b)).toContain('pattern-template-mismatch');
    });
    it('errors on a template without exactly one slot', () => {
      const b = bank();
      question(b, 'moi_02').frames[0].template = "J'aime.";
      question(b, 'moi_03').frames[0].templateEn = 'I like {slot} and {slot}.';
      expect(codes(b).filter((c) => c === 'frame-template')).toHaveLength(2);
    });
    it('errors on a pattern with no core words', () => {
      const b = bank();
      b.patterns[0].coreWords = [];
      expect(codes(b)).toContain('pattern-core-words');
    });
    it('requires every pattern to have a level-up line with audio', () => {
      const b = bank();
      b.patterns[0].levelUp.audioId = '';
      expect(codes(b)).toEqual(['audio-id']);
    });
  });

  describe('model answers', () => {
    it('errors when the model answer count does not match the frames', () => {
      const b = bank();
      question(b, 'moi_07').modelAnswer = ["J'ai dix ans."];
      expect(codes(b)).toEqual(['model-answer']);
    });
    it('errors when a model sentence cannot be built from the frame', () => {
      const b = bank();
      question(b, 'moi_01').modelAnswer = ["J'ai vingt ans."];
      expect(codes(b)).toEqual(['model-answer']);
    });
    it('errors on an empty model sentence', () => {
      const b = bank();
      question(b, 'moi_01').modelAnswer = [''];
      expect(codes(b)).toEqual(['model-answer']);
    });
  });

  describe('themes', () => {
    it('errors on a sticker set that is too small', () => {
      const b = bank();
      b.themes[0].stickers = b.themes[0].stickers.slice(0, 2);
      expect(codes(b)).toEqual(['theme-stickers']);
    });
    it('errors on a missing unlock, and on an unknown unlock kind', () => {
      const b = bank();
      (b.themes[0] as { unlock?: unknown }).unlock = undefined;
      (b.themes[1].unlock as { kind: string }).kind = 'hat';
      expect(codes(b)).toEqual(['theme-unlock', 'theme-unlock']);
    });
    it('errors on a theme with no « Et toi ? » turn', () => {
      const b = bank();
      b.themes[0].etToi = [];
      expect(codes(b)).toEqual(['theme-et-toi']);
    });
    it('errors on a theme with too few questions to build a mission', () => {
      const b = bank();
      b.questions = b.questions.filter((q) => q.themeId !== 'couleurs' || ['col_01', 'col_02'].includes(q.id));
      expect(codes(b)).toEqual(['theme-questions']);
    });
    it('errors on a question whose theme does not exist', () => {
      const b = bank();
      question(b, 'moi_01').themeId = 'animaux';
      expect(codes(b)).toContain('unknown-theme');
    });
    it('errors on duplicate theme, pattern and question ids', () => {
      const b = bank();
      b.themes.push(b.themes[0]);
      b.patterns.push(b.patterns[0]);
      b.questions.push(b.questions[0]);
      expect(codes(b).filter((c) => c === 'duplicate-id').length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('audio ids', () => {
    it('errors on a Léo line with no audio id, or a malformed one', () => {
      const b = bank();
      question(b, 'moi_01').prompt.audioId = '';
      b.themes[0].etToi[0].ask.audioId = 'Moi Etoi.mp3';
      expect(codes(b)).toEqual(['audio-id', 'audio-id']);
    });
    it('errors when two lines would share one recording', () => {
      const b = bank();
      question(b, 'moi_02').prompt.audioId = question(b, 'moi_01').prompt.audioId;
      expect(codes(b)).toEqual(['audio-id-duplicate']);
    });
    it('covers the fixed lines', () => {
      const b = bank();
      b.fixedLines[1].audioId = '';
      expect(codes(b)).toEqual(['audio-id']);
    });
  });
});

describe('the pilot bank', () => {
  it('has the two pilot themes with eight questions each', () => {
    expect(JUNIOR_BANK.themes.map((t) => t.id)).toEqual(['moi', 'couleurs']);
    for (const theme of JUNIOR_BANK.themes) {
      expect(JUNIOR_BANK.questions.filter((q) => q.themeId === theme.id)).toHaveLength(8);
    }
  });

  it('gives each theme a set of 6 stickers and an unlock', () => {
    for (const theme of JUNIOR_BANK.themes) {
      expect(theme.stickers).toHaveLength(6);
      expect(theme.unlock.kind).toMatch(/^(outfit|background)$/);
    }
  });

  it('includes stacked two-sentence turns in both themes', () => {
    for (const theme of ['moi', 'couleurs']) {
      expect(JUNIOR_BANK.questions.some((q) => q.themeId === theme && q.frames.length === 2)).toBe(true);
    }
  });

  it('has the fixed praise set, and the warm-up and together lines, in order', () => {
    expect(JUNIOR_BANK.fixedLines.map((l) => l.fr)).toEqual([
      'Super !',
      'Bravo !',
      'Génial !',
      'Encore ?',
      'Dis « Bonjour Léo » pour me réveiller !',
      'Bonjour ! Je suis là !',
      'On le dit ensemble !',
    ]);
  });

  it("never asks the kid's gender or has them describe themselves with a gendered adjective", () => {
    // What the kid is asked and what they say; Léo's own lines (« Je suis là ») are not about the kid.
    const kidFacing = JSON.stringify(
      JUNIOR_BANK.questions.map((q) => [q.prompt.fr, q.frames.map((f) => f.template), q.modelAnswer]),
    ).toLowerCase();
    expect(kidFacing).not.toMatch(/gar[cç]on|fille|masculin|f[ée]minin|\bje suis\b|\btu es\b/);
  });

  it('has no leftover references to marks, bands, grades or scores in learner-facing text', () => {
    const text = JUNIOR_BANK.questions.map((q) => q.prompt.fr + q.prompt.en).join(' ').toLowerCase();
    expect(text).not.toMatch(/\b(mark|band|grade|score|point)s?\b/);
  });
});
