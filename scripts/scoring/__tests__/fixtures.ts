/**
 * S4 test helpers — a generic fake Judge that builds a schema-valid,
 * quote-grounded JudgeOutput from whatever SpeakingTranscript it's given,
 * so scoreAttempt/replayEnvelope tests aren't coupled to one fixture's exact
 * candidate text.
 */

import type { Judge, JudgeRequest, JudgeResponse, SpeakingTranscript } from '../../../src/domain/igcse/judgement/types';
import { RP_MARK_2, COMM_7_9, QOL_7_9 } from '../../../src/domain/igcse/canonical';

function firstWord(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/\S+/);
  return match ? match[0] : trimmed;
}

export function buildGenericJudgeOutput(transcript: SpeakingTranscript) {
  return {
    rolePlay: {
      tasks: transcript.rolePlay.map((task) => ({
        taskId: task.taskId,
        mark: 2 as const,
        descriptorApplied: RP_MARK_2[0],
        evidenceSpans: [{ source: 'rolePlay' as const, quote: firstWord(task.candidateResponse) }],
      })),
    },
    communication: {
      mark: 8,
      band: { min: 7, max: 9, label: 'Satisfactory' as const },
      bestFitPlacement: 'adequately' as const,
      descriptorsApplied: [COMM_7_9[0]],
      justification: 'Responds satisfactorily with mostly relevant information.',
      evidenceSpans: [
        { source: 'topic1' as const, quote: firstWord(transcript.topicConversations[0].turns[0].candidateResponse) },
        { source: 'topic2' as const, quote: firstWord(transcript.topicConversations[1].turns[0].candidateResponse) },
      ],
    },
    qualityOfLanguage: {
      mark: 8,
      band: { min: 7, max: 9, label: 'Satisfactory' as const },
      bestFitPlacement: 'adequately' as const,
      descriptorsApplied: [QOL_7_9[0]],
      justification: 'Satisfactory structures with frequent errors.',
      evidenceSpans: [
        { source: 'topic1' as const, quote: firstWord(transcript.topicConversations[0].turns[0].candidateResponse) },
      ],
    },
  };
}

/** A Judge whose output adapts to whatever transcript it's asked to score. */
export function createGenericFakeJudge(getTranscript: () => SpeakingTranscript): Judge {
  return async (_req: JudgeRequest): Promise<JudgeResponse> => {
    return { raw: JSON.stringify(buildGenericJudgeOutput(getTranscript())) };
  };
}
