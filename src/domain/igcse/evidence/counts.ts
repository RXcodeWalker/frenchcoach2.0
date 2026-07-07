import type { SpeakingTranscript } from '../judgement/types';
import type { ResponseCountEvidence } from './types';

export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean).length;
}

export function responseCountsByQuestion(transcript: SpeakingTranscript): ResponseCountEvidence[] {
  const conversationCounts = transcript.topicConversations.flatMap((conversation) =>
    conversation.turns.map((turn) => ({
      questionId: `${conversation.conversationId}:${turn.turnId}`,
      wordCount: countWords(turn.candidateResponse),
      responseCount: turn.candidateResponse.trim().length > 0 ? 1 : 0,
    })),
  );

  const rolePlayCounts = transcript.rolePlay.map((task) => ({
    questionId: `rolePlay:${task.taskId}`,
    wordCount: countWords(task.candidateResponse),
    responseCount: task.candidateResponse.trim().length > 0 ? 1 : 0,
  }));

  return [...rolePlayCounts, ...conversationCounts];
}
