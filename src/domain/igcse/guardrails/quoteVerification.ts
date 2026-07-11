/**
 * S5 guardrail — quote verification (02-scoring-pipeline-architecture.md §3.5).
 * Every evidence span quoted in an L2 assessment must be a substring of the
 * stored transcript (normalized). On real judge output this is silent by
 * construction — judgement/schema.ts::parseAndValidateJudgeOutput already
 * rejects ungrounded quotes at parse time. This guardrail exists as
 * defense-in-depth for any future path that builds a SpeakingAssessment
 * without going through L2 parse, and as an independently testable L3 unit.
 */

import { buildEvidenceCorpora, isQuoteGrounded } from '../judgement/schema';
import type { EvidenceSpan, SpeakingAssessment, SpeakingTranscript } from '../judgement/types';
import type { GuardrailTrigger } from './types';

function verifySpans(
  spans: EvidenceSpan[],
  corpora: Record<EvidenceSpan['source'], string>,
  criterion: string,
): GuardrailTrigger[] {
  const triggers: GuardrailTrigger[] = [];
  for (const span of spans) {
    if (!isQuoteGrounded(span.quote, corpora[span.source])) {
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

  return [
    ...assessment.rolePlay.tasks.flatMap((task) =>
      verifySpans(task.evidenceSpans, corpora, `rolePlay task ${task.taskId}`),
    ),
    ...verifySpans(assessment.communication.evidenceSpans, corpora, 'communication'),
    ...verifySpans(assessment.qualityOfLanguage.evidenceSpans, corpora, 'qualityOfLanguage'),
  ];
}
