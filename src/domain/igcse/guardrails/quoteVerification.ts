/**
 * Guardrail — quote verification (see docs/systems/assessment-engine.md for
 * the three-layer pipeline this guardrail belongs to). Every evidence span
 * quoted in an L2 assessment must be a substring of the
 * stored transcript (normalized). On real judge output this is silent by
 * construction — judgement/schema.ts::parseAndValidateJudgeOutput already
 * rejects ungrounded quotes at parse time. This guardrail exists as
 * defense-in-depth for any future path that builds a SpeakingAssessment
 * without going through L2 parse, and as an independently testable L3 unit.
 *
 * Role-play spans are grounded per task (P0 step 4), matching the parse-time
 * rule in judgement/schema.ts: a task's quote must come from that task's own
 * response, not from any role-play response.
 */

import { buildEvidenceCorpora, buildRolePlayTaskCorpora, isQuoteGrounded } from '../judgement/schema';
import type { EvidenceSpan, SpeakingAssessment, SpeakingTranscript } from '../judgement/types';
import type { GuardrailTrigger } from './types';

function verifySpans(
  spans: EvidenceSpan[],
  corpusFor: (span: EvidenceSpan) => string,
  criterion: string,
): GuardrailTrigger[] {
  const triggers: GuardrailTrigger[] = [];
  for (const span of spans) {
    if (!isQuoteGrounded(span.quote, corpusFor(span))) {
      triggers.push({
        id: 'quote_verification_failed',
        message: `${criterion}: evidence quote not grounded in transcript (source=${span.source}): "${span.quote}"`,
        criterion,
        source: span.source,
        quote: span.quote,
      });
    }
  }
  return triggers;
}

export function verifyQuotes(
  assessment: SpeakingAssessment,
  transcript: SpeakingTranscript,
): GuardrailTrigger[] {
  const corpora = buildEvidenceCorpora(transcript);
  const taskCorpora = buildRolePlayTaskCorpora(transcript);
  const bySource = (span: EvidenceSpan) => corpora[span.source];

  return [
    ...assessment.rolePlay.tasks.flatMap((task) =>
      verifySpans(task.evidenceSpans, () => taskCorpora.get(task.taskId) ?? '', `rolePlay task ${task.taskId}`),
    ),
    ...verifySpans(assessment.communication.evidenceSpans, bySource, 'communication'),
    ...verifySpans(assessment.qualityOfLanguage.evidenceSpans, bySource, 'qualityOfLanguage'),
  ];
}
