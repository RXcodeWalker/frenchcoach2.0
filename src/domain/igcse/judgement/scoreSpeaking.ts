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

function assertProvenance(transcript: SpeakingTranscript): void {
  if (transcript.contentProvenance !== 'original-practice') {
    throw new ProvenanceError(
      `contentProvenance must be "original-practice", got "${transcript.contentProvenance as string}"`,
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
