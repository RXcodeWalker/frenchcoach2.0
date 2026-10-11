/**
 * The nudge shown in place of a fix while the learner has a go at it ("Try it
 * first", Learn feedback Batch 6b). Built only from data the fix already
 * carries — the learner's own quote and the fix's tag — with no AI call, and
 * it never gives the correction away.
 *
 * A fix carries no error category of its own (every Learn fix is 'grammar'), so
 * the only thing that says what kind of slip it is is its free-text tag, e.g.
 * « Être vs Avoir ».
 */
export function tryItHint(quote: string, tag?: string): string {
  const label = tag?.trim();
  return label
    ? `« ${quote} » — something's off here (${label}). Can you fix it?`
    : `« ${quote} » — something's off here. Can you fix it?`;
}
