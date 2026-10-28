/**
 * Pronunciation Lab — sentences (pronunciation-lab plan §3.3 "Practise a
 * sentence", §4.2). Pure.
 *
 * The Lab practises one sentence at a time, and a recorded sentence is found by
 * its exact text (`voiceKey.ts`). So the line that the recording script
 * records and the line the Lab later asks for must come from ONE splitter:
 * this one. Stage 4's catalogue records every Learn model answer sentence by
 * sentence with it; the Lab home (Stage 5) must split a model answer with it
 * too, or ▶ Native for a model-answer sentence falls back to the browser voice.
 */

const SENTENCE_BREAK = /(?<=[.!?…])\s+/u;

/**
 * The sentences of a short French text, trimmed, in order, each keeping its own
 * end punctuation. A break is `. ! ? …` followed by whitespace; line breaks are
 * whitespace. A piece with no letter in it is dropped. Nothing is rewritten.
 */
export function splitSentences(text: string): string[] {
  return text
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()
    .split(SENTENCE_BREAK)
    .map((s) => s.trim())
    .filter((s) => /\p{L}/u.test(s));
}
