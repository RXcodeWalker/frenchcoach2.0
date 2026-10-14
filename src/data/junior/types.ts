/**
 * Junior track content types (Grades 4–7, A1 and below). Plan Batch 1.
 *
 * Junior is a separate, mark-free practice track: nothing here (or anywhere under
 * src/data/junior/) may import from src/domain/igcse/, and nothing here carries a
 * mark, band, grade or score. The kid picks a picture, the app builds the exact
 * target sentence from that pick, and a later batch checks what was said against it
 * deterministically.
 *
 * This file is data shape only. The rules over it live in juniorBankLint.ts.
 */

/** Closed list of the articles a noun slot can carry. */
export type JuniorArticle = 'le' | 'la' | "l'" | 'les' | 'un' | 'une';

/** Grammatical gender of a slot word (`pl` for a plural noun). Never the child's gender. */
export type JuniorGender = 'm' | 'f' | 'pl';

/**
 * What a pattern's `{slot}` holds. A `noun` slot is spoken with its article
 * (« le bleu »); an `adjective` or `number` slot cannot take one (« c'est jaune »,
 * « dix ans »), so lint requires the article there to be null.
 */
export type JuniorSlotKind = 'noun' | 'adjective' | 'number';

/** One line Léo says, or one line the kid is shown. Every line has a recorded-audio id. */
export interface JuniorLine {
  fr: string;
  /** The hidden English helper behind the "?" button. */
  en: string;
  /** Id of the pre-recorded file (the files themselves land in Batch 3). */
  audioId: string;
}

/** One picture the kid can tap to choose their answer. */
export interface JuniorSlotOption {
  /** Stable ASCII id, unique within its frame. */
  id: string;
  /** The French word, without its article. */
  word: string;
  /** The picture. */
  emoji: string;
  article: JuniorArticle | null;
  /** Gender the article must agree with; null exactly when `article` is null. */
  gender: JuniorGender | null;
  /**
   * Other forms of `word` the matcher also accepts for this pick (« verte » for « vert »).
   * Depends on the chosen word, so it lives here rather than on the question.
   */
  variants: readonly string[];
  /** English gloss, used to build the English helper for the sentence. */
  en: string;
}

/**
 * A sentence shape, shared across questions and themes (e.g. `j-aime-le-X`).
 * The scaffold ladder (Echo → Frame → Free) is tracked per pattern id.
 */
export interface JuniorPattern {
  id: string;
  slotKind: JuniorSlotKind;
  /**
   * The words of the sentence the matcher must hear besides the chosen word
   * (« aime » for « J'aime le bleu »). Every one must appear in each template of the pattern.
   */
  coreWords: readonly string[];
  /** Léo's line when the kid moves up from Frame/Echo for this pattern. */
  levelUp: JuniorLine;
}

/** One sentence the kid says: a pattern, a template with one `{slot}`, and the pictures to pick from. */
export interface JuniorFrame {
  patternId: string;
  /** French template with exactly one `{slot}`: « J'aime {slot}. » */
  template: string;
  /** English template with exactly one `{slot}`: « I like {slot}. » */
  templateEn: string;
  slotOptions: readonly JuniorSlotOption[];
}

export interface JuniorQuestion {
  id: string;
  themeId: string;
  /** The picture shown with the question. */
  emoji: string;
  /** Léo's question, with its English helper and audio id. */
  prompt: JuniorLine;
  /** 1–2 frames; two stack into a two-sentence turn. */
  frames: readonly JuniorFrame[];
  /** One fully-rendered example sentence per frame; each must be reachable from its frame. */
  modelAnswer: readonly string[];
}

/** The "Et toi ?" turn: the kid asks Léo, Léo answers with something funny. It always counts as complete. */
export interface JuniorEtToi {
  id: string;
  /** What the kid asks Léo. */
  ask: JuniorLine;
  /** Léo's funny or surprising answer. */
  reply: JuniorLine;
}

export interface JuniorSticker {
  id: string;
  emoji: string;
  /** English name for the sticker book. */
  name: string;
}

/** What a complete sticker set unlocks: a Léo outfit or a background. */
export interface JuniorUnlock {
  id: string;
  kind: 'outfit' | 'background';
  emoji: string;
  name: string;
}

export interface JuniorTheme {
  id: string;
  title: JuniorLine;
  emoji: string;
  /** About 6. Replaying the theme earns the next one; when the set is complete, a gold version. */
  stickers: readonly JuniorSticker[];
  unlock: JuniorUnlock;
  etToi: readonly JuniorEtToi[];
}

/** Everything the lint (and, later, the mission builder) reads. */
export interface JuniorBank {
  themes: readonly JuniorTheme[];
  patterns: readonly JuniorPattern[];
  questions: readonly JuniorQuestion[];
  /** Léo's fixed lines that belong to no theme: the praise set, the warm-up, « On le dit ensemble ! ». */
  fixedLines: readonly JuniorLine[];
}
