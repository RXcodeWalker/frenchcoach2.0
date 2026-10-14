/**
 * Guardrail — the QoL sound-alike step (transcription-accuracy plan, Phase 4,
 * stage 6). Advisory, like every L3 trigger: it reports, it never raises or
 * lowers a mark (the owner's rule: guardrails never raise marks).
 *
 *  - `homophone_error_excused`: the marker took at least one QoL error out of
 *    the counted list (judgement/homophoneErrors.ts) — Category A
 *    ('inaudible'), an unconfirmed Category B word ('ambiguousNear') or a
 *    word the recognisers heard as clearly different ('recognisersDisagree').
 *  - `homophone_penalty_unresolved`: the kept QoL mark may still carry a
 *    penalty for an excusable error — the re-ask failed (the first mark
 *    stands), the re-run listed an excusable error anyway, or (defence in
 *    depth, for any path that skipped the step) the final error list still
 *    holds an error the step would excuse.
 */

import { splitQolErrors, type HomophoneReAskOutcome } from '../judgement/homophoneErrors';
import type { ExcusedQolError, SpeakingAssessment, SpeakingTranscript } from '../judgement/types';
import type { GuardrailTrigger } from './types';

/** What the sound-alike step did — the outcome scoreAttempt records from resolveQolHomophones. */
export interface HomophoneStepRecord {
  excusedErrors: readonly ExcusedQolError[];
  reAsk: HomophoneReAskOutcome;
  excusedInReAsk: number;
}

export function checkHomophoneErrors(
  assessment: SpeakingAssessment,
  transcript: SpeakingTranscript,
  record: HomophoneStepRecord | undefined,
): GuardrailTrigger[] {
  const triggers: GuardrailTrigger[] = [];
  const excused = record?.excusedErrors ?? [];
  const count = (reason: ExcusedQolError['reason']) => excused.filter((e) => e.reason === reason).length;
  const inaudible = count('inaudible');
  const ambiguousNear = count('ambiguousNear');
  const recognisersDisagree = count('recognisersDisagree');
  if (excused.length > 0) {
    triggers.push({
      id: 'homophone_error_excused',
      message:
        `qualityOfLanguage: ${excused.length} error(s) excused (inaudible ${inaudible}, ambiguousNear ${ambiguousNear}, ` +
        `recognisersDisagree ${recognisersDisagree})`,
      inaudible,
      ambiguousNear,
      recognisersDisagree,
    });
  }

  const stillExcusable = splitQolErrors(assessment.qualityOfLanguage.errors, transcript).excused.length;
  const reasons: string[] = [];
  if (excused.length > 0 && record?.reAsk === 'failed') reasons.push('the re-ask failed, so the first mark stands');
  if ((record?.excusedInReAsk ?? 0) > 0) reasons.push(`the re-run listed ${record?.excusedInReAsk} excusable error(s) again`);
  if (stillExcusable > 0) reasons.push(`${stillExcusable} excusable error(s) are still in the counted list`);
  if (reasons.length > 0) {
    triggers.push({
      id: 'homophone_penalty_unresolved',
      message: `qualityOfLanguage: the mark may still include a sound-alike penalty — ${reasons.join('; ')}`,
      reAsk: record?.reAsk ?? 'not-run',
      excusedInReAsk: record?.excusedInReAsk ?? 0,
      stillExcusable,
    });
  }
  return triggers;
}
