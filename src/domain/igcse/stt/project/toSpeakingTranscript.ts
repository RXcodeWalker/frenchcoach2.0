/**
 * S3 → S1 projection. Pure, lossy, deterministic: the only sanctioned way to get
 * from SessionTranscript's world to SpeakingTranscript's. Drops examiner speech,
 * words, timings, and confidences; joins each candidate turn's utterances into one
 * string; carries expectedTimeFrame / partsExpected / topicArea across from the
 * question set (SessionTranscript alone only stores questionSetId/Hash, not the
 * full set, so the question set is passed alongside — a deliberate deviation from
 * the plan's 1-arg signature, needed to actually carry those fields across).
 */

import type {
  RolePlayTaskResponse,
  SpeakingTranscript,
  TopicConversation,
  ConversationTurn,
} from '../../judgement/types';
import type { SessionQuestion, SessionQuestionSet, SessionTranscript, Utterance } from '../types';

function joinCandidateText(utterances: Utterance[]): string {
  return utterances.map((u) => u.text).join(' ');
}

function sumCandidateDuration(utterances: Utterance[]): number {
  return utterances.reduce((sum, u) => sum + (u.endS - u.startS), 0);
}

function findQuestion(questionSet: SessionQuestionSet, questionId: string | null): SessionQuestion | undefined {
  if (questionId === null) return undefined;
  return questionSet.questions.find((q) => q.questionId === questionId);
}

function buildRolePlayTasks(
  session: SessionTranscript,
  questionSet: SessionQuestionSet,
): RolePlayTaskResponse[] {
  const rolePlayQuestions = questionSet.questions.filter((q) => q.part === 'rolePlay');

  return rolePlayQuestions.map((question) => {
    const candidateUtterances = session.utterances.filter(
      (u) => u.role === 'candidate' && u.part === 'rolePlay' && u.questionId === question.questionId,
    );
    return {
      taskId: question.questionId,
      taskPrompt: question.mainText,
      candidateResponse: joinCandidateText(candidateUtterances),
      ...(question.partsExpected !== undefined ? { partsExpected: question.partsExpected } : {}),
    };
  });
}

function buildTopicConversation(
  session: SessionTranscript,
  questionSet: SessionQuestionSet,
  conversationId: 'topic1' | 'topic2',
): TopicConversation {
  const topicQuestions = questionSet.questions.filter((q) => q.part === conversationId);
  const topicArea = topicQuestions.find((q) => q.topicArea !== undefined)?.topicArea;

  const turns: ConversationTurn[] = topicQuestions.map((question) => {
    const candidateUtterances = session.utterances.filter(
      (u) => u.role === 'candidate' && u.part === conversationId && u.questionId === question.questionId,
    );
    return {
      turnId: question.questionId,
      questionPrompt: question.mainText,
      candidateResponse: joinCandidateText(candidateUtterances),
      ...(question.expectedTimeFrame !== undefined
        ? { expectedTimeFrame: question.expectedTimeFrame }
        : {}),
      ...(candidateUtterances.length > 0
        ? { candidateResponseDurationS: sumCandidateDuration(candidateUtterances) }
        : {}),
    };
  });

  return {
    conversationId,
    ...(topicArea !== undefined ? { topicArea } : {}),
    turns,
  };
}

export function toSpeakingTranscript(
  session: SessionTranscript,
  questionSet: SessionQuestionSet,
): SpeakingTranscript {
  return {
    contentProvenance: session.contentProvenance,
    rolePlay: buildRolePlayTasks(session, questionSet),
    topicConversations: [
      buildTopicConversation(session, questionSet, 'topic1'),
      buildTopicConversation(session, questionSet, 'topic2'),
    ],
  };
}

export { findQuestion };
