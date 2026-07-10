/**
 * S1 Layer-2 scoring orchestration — provenance guard → prompt → judge → parse → validate.
 */

import { parseAndValidateJudgeOutput } from './schema';
import { JudgementValidationError } from './schema';
import { buildJudgementPrompt } from './prompt';
import type { Judge, SpeakingAssessment, SpeakingTranscript } from './types';

export class ProvenanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProvenanceError';
  }
}

const KNOWN_PROVENANCES = new Set(['original-practice', 'confidential-internal']);

/** Must be a known provenance before any judge call. Does not gate redistribution. */
function assertProvenance(transcript: SpeakingTranscript): void {
  if (!KNOWN_PROVENANCES.has(transcript.contentProvenance)) {
    throw new ProvenanceError(
      `contentProvenance must be a known provenance, got "${transcript.contentProvenance as string}"`,
    );
  }
}

/**
 * Blocks confidential-internal transcripts (teacher recordings against TN booklets)
 * from export/sync paths. Called by the Supabase sync adapter and any corpus/anchor
 * export path — never by scoreSpeaking itself, which only needs assertProvenance.
 */
export function assertRedistributable(transcript: SpeakingTranscript): void {
  if (transcript.contentProvenance === 'confidential-internal') {
    throw new ProvenanceError(
      'Transcript is confidential-internal and must not be redistributed or exported',
    );
  }
}

/**
 * Score a speaking transcript via an injected LLM judge port.
 * No network, retries, caching, or guardrails in S1.
 */
export async function scoreSpeaking(
  transcript: SpeakingTranscript,
  judge: Judge,
): Promise<SpeakingAssessment> {
  assertProvenance(transcript);

  const prompt = buildJudgementPrompt(transcript);
  const { raw } = await judge({ prompt });

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new JudgementValidationError('Judge response is not valid JSON');
  }

  return parseAndValidateJudgeOutput(parsed, transcript);
}

export { JudgementValidationError };
