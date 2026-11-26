/**
 * Dictée's content model. The bank is hand-written (never AI-generated, never
 * read from the exam bank, a past paper or Learn): a line is exactly what the
 * recorded voice says and exactly what the learner has to type.
 */

/** Warm-up (A1), Exam level (A2), Stretch (B1) — the labels Learn uses. */
export type DicteeLevel = 'A1' | 'A2' | 'B1';
export const DICTEE_LEVELS: readonly DicteeLevel[] = ['A1', 'A2', 'B1'];

/** One word (with its article) or one sentence per question. */
export type DicteeFormat = 'words' | 'sentences';
export const DICTEE_FORMATS: readonly DicteeFormat[] = ['words', 'sentences'];

export interface DicteeItem {
  /** Permanent: a learner's "my slips" list refers to it. Never reuse or renumber. */
  id: string;
  format: DicteeFormat;
  level: DicteeLevel;
  /** A Learn topic key; used for the topic chip only. */
  topicKey: string;
  /** The line as spoken and as it must be written. Numbers are written in letters. */
  fr: string;
  /** Shown only when the learner asks for the meaning. */
  en: string;
  /** Other full spellings that are equally right (a homophone the audio cannot settle). */
  accept?: readonly string[];
  /**
   * Sound-alike classes (ids from `domain/igcse/stt/homophones/classes`) this
   * line really tests — a/à, et/est, ses/ces… Drives the "Sound-alikes" focus.
   * `dictee.bank.test.ts` checks each one is actually present in `fr`.
   */
  traps?: readonly string[];
}

/** [number, topicKey, fr, en, traps?] — the compact form the bank files are written in. */
export type ItemRow = readonly [string, string, string, string, (readonly string[])?];

export function itemsFrom(format: DicteeFormat, level: DicteeLevel, rows: readonly ItemRow[]): DicteeItem[] {
  const prefix = `${format === 'words' ? 'w' : 's'}-${level.toLowerCase()}`;
  return rows.map(([n, topicKey, fr, en, traps]) => ({
    id: `${prefix}-${n}`,
    format,
    level,
    topicKey,
    fr,
    en,
    ...(traps && traps.length > 0 ? { traps } : {}),
  }));
}
