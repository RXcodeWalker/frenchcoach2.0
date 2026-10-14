/**
 * The text a candidate SEES for a spoken answer: exactly what the marker read
 * (ADR 0011 amendment). A spoken answer is marked Category-A-respelled
 * (il mange / ils mangent, et/est, a/à… take the context-consistent spelling),
 * so showing the raw recogniser text would let the screen disagree with the
 * quotes and corrections in the report. Typed answers are shown verbatim.
 *
 * One implementation: this calls the marker's own `markUtterance`, so what is
 * displayed can never drift from what was marked. Display only — it never
 * feeds a stored transcript, a mark or a request.
 */

import { markUtterance } from '../../igcse/stt/project/spokenText';
import type { Utterance } from '../../igcse/stt/types';

export function displayRespell(utterance: Utterance): string {
  return markUtterance(utterance).text;
}
