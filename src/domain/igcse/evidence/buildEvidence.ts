import type { SpeakingTranscript } from '../judgement/types';
import { responseCountsByQuestion } from './counts';
import { fillerDensityByQuestion } from './fillers';
import { rolePlayPartsByTask } from './parts';
import { deriveExpectedTimeFrameFromCues, detectTimeFrameAlignment } from './timeFrame';
import type { EvidenceProfileSubset } from './types';

export function buildEvidenceSubset(transcript: SpeakingTranscript): EvidenceProfileSubset {
  const timeFrameAlignmentByQuestion = transcript.topicConversations.flatMap((conversation) =>
    conversation.turns.map((turn) => {
      const expectedTimeFrame =
        turn.expectedTimeFrame ?? deriveExpectedTimeFrameFromCues(turn.questionPrompt);
      const { detectedTimeFrame, alignment } = detectTimeFrameAlignment(
        expectedTimeFrame,
        turn.candidateResponse,
      );

      return {
        questionId: `${conversation.conversationId}:${turn.turnId}`,
        expectedTimeFrame,
        detectedTimeFrame,
        alignment,
      };
    }),
  );

  return {
    timeFrameAlignmentByQuestion,
    responseCountsByQuestion: responseCountsByQuestion(transcript),
    fillerDensityByQuestion: fillerDensityByQuestion(transcript),
    rolePlayPartsByTask: rolePlayPartsByTask(transcript),
  };
}
