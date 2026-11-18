/**
 * Light, safe formatting for a spoken answer's text: a capital letter to start,
 * a capital after each full stop / ! / ? / …, collapsed spaces, and a closing
 * full stop. Chrome's live captions arrive lower-case with no punctuation, and
 * Whisper copies that style when its prompt held earlier unpunctuated answers.
 *
 * It deliberately never invents sentence breaks or commas in the middle (that
 * would be guessing), never changes a word, and is idempotent. Case and the
 * closing mark only — the alignment, the grader's quotes and `canonicalizeForMatch`
 * all ignore both, and nothing here is a mark.
 */

const OPEN = /^["'«“([¿¡\s]+/;
const SENTENCE_END_THEN_WORD = /([.!?…]["'»”)\]]*\s+)(["'«“([¿¡]*)(\p{Ll})/gu;
const CLOSED = /[.!?…]["'»”)\]]*$|["»”]$/;

function capitaliseFirstLetter(s: string): string {
  const lead = OPEN.exec(s)?.[0] ?? '';
  const rest = s.slice(lead.length);
  if (!rest) return s;
  const [first, ...others] = [...rest];
  return lead + first.toLocaleUpperCase('fr') + others.join('');
}

export function tidyAnswer(text: string): string {
  let out = text.replace(/\s+/g, ' ').trim();
  if (!out) return '';
  out = capitaliseFirstLetter(out);
  out = out.replace(SENTENCE_END_THEN_WORD, (_m, end: string, open: string, letter: string) => `${end}${open}${letter.toLocaleUpperCase('fr')}`);
  if (!CLOSED.test(out)) out = `${out}.`;
  return out;
}
