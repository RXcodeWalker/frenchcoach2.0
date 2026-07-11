import type { SpeakingTranscript } from '../judgement/types';
import { countWords } from './counts';
import type { TopicConversationDurationEvidence } from './types';

export function topicConversationDurationByConversation(
  transcript: SpeakingTranscript,
): TopicConversationDurationEvidence[] {
  return transcript.topicConversations.map((conversation) => ({
    conversationId: conversation.conversationId,
    candidateSpeakingDurationS: conversation.turns.reduce(
      (sum, turn) => sum + (turn.candidateResponseDurationS ?? 0),
      0,
    ),
    candidateWordCount: conversation.turns.reduce(
      (sum, turn) => sum + countWords(turn.candidateResponse),
      0,
    ),
  }));
}
