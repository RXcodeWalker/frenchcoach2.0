/**
 * S3 → S1 projection. Pure, lossy, deterministic: the only sanctioned way to get
 * from SessionTranscript's world to SpeakingTranscript's. Drops examiner speech,
 * words, timings, and confidences; joins each candidate turn's utterances into one
 * string; carries expectedTimeFrame / partsExpected / topicArea across from the
 * question set (SessionTranscript alone only stores questionSetId/Hash, not the
 * full set, so the question set is passed alongside — a deliberate deviation from
 * the plan's 1-arg signature, needed to actually carry those fields across).
 *
 * Examiner speech is not passed through as text, but two things derived from
 * it are (P0 step 2): per-turn examiner support (repetitions, alternative
 * question, second part, extension prompts — from examinerEvents plus the
 * examiner utterance text), and further-question turns. The conductor's
 * "≤3½ min → up to 2 further questions" prompts carry questionId null, so
 * their answers would otherwise be dropped; here each null-questionId
 * candidate utterance is grouped under the examiner utterance just before it
 * in that part and emitted as turn 'further1' | 'further2' after Q5.
 */

import { canonicalizeForMatch } from '../../text/normalize';
import type {
  ExaminerSupport,
  RolePlayTaskResponse,
  SpeakingTranscript,
  TopicConversation,
  ConversationTurn,
} from '../../judgement/types';
import type {
  ExaminerEvent,
  SessionPart,
  SessionQuestion,
  SessionQuestionSet,
  SessionTranscript,
  Utterance,
} from '../types';

function joinCandidateText(utterances: Utterance[]): string {
  return utterances.map((u) => u.text).join(' ');
}

function sumCandidateDuration(utterances: Utterance[]): number {
  return utterances.reduce((sum, u) => sum + (u.endS - u.startS), 0);
}

/**
 * W1: 'text' only when every candidate utterance behind this turn was typed —
 * any real speech (or no inputMode provenance at all, e.g. ASR-annotated
 * recordings) means the turn is not exempt from the duration guardrail's
 * speech-only baseline. See judgement/types.ts ConversationTurn.inputMode.
 */
function turnInputMode(utterances: Utterance[]): 'speech' | 'text' | undefined {
  if (utterances.length === 0) return undefined;
  if (utterances.every((u) => u.inputMode === 'text')) return 'text';
  if (utterances.some((u) => u.inputMode === 'speech')) return 'speech';
  return undefined;
}

/**
 * The questionId an examiner event belongs to. An ASR-annotated extension
 * prompt carries questionId null on the event, so fall back to the running
 * attribution on its utterance. A further question has null on both, so it is
 * attributed to no scripted turn.
 */
function eventQuestionId(session: SessionTranscript, event: ExaminerEvent): string | null {
  if (event.questionId !== null) return event.questionId;
  return session.utterances.find((u) => u.utteranceId === event.utteranceId)?.questionId ?? null;
}

function eventsFor(session: SessionTranscript, part: SessionPart, questionId: string): ExaminerEvent[] {
  return session.examinerEvents.filter((e) => e.part === part && eventQuestionId(session, e) === questionId);
}

function utteranceText(session: SessionTranscript, utteranceId: string): string | null {
  return session.utterances.find((u) => u.utteranceId === utteranceId)?.text ?? null;
}

function countRepetitions(session: SessionTranscript, part: SessionPart, questionId: string): number {
  return eventsFor(session, part, questionId).filter((e) => e.kind === 'repetition').length;
}

function examinerSupportFor(session: SessionTranscript, question: SessionQuestion): ExaminerSupport {
  const events = eventsFor(session, question.part, question.questionId);

  const alternativeEvent = events.find((e) => e.kind === 'alternative_question');
  const alternativeAsked = alternativeEvent ? utteranceText(session, alternativeEvent.utteranceId) : null;

  // The second part has no event kind of its own (the engine logs it as a
  // second main_question, a recording as whatever matchQuestion made of it),
  // so it is read from the examiner utterances attributed to this question.
  let secondPartAsked: string | null = null;
  if (question.secondPartText !== undefined) {
    const target = canonicalizeForMatch(question.secondPartText);
    const asked = session.utterances.some(
      (u) =>
        u.role === 'examiner' &&
        u.part === question.part &&
        u.questionId === question.questionId &&
        canonicalizeForMatch(u.text) === target,
    );
    secondPartAsked = asked ? question.secondPartText : null;
  }

  return {
    repetitions: events.filter((e) => e.kind === 'repetition').length,
    alternativeAsked,
    secondPartAsked,
    extensionPrompts: events.filter((e) => e.kind === 'extension_prompt').length,
  };
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
      ...(question.secondPartText !== undefined ? { secondPartPrompt: question.secondPartText } : {}),
      repetitions: countRepetitions(session, 'rolePlay', question.questionId),
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
    const inputMode = turnInputMode(candidateUtterances);
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
      ...(inputMode !== undefined ? { inputMode } : {}),
      examinerSupport: examinerSupportFor(session, question),
    };
  });

  return {
    conversationId,
    ...(topicArea !== undefined ? { topicArea } : {}),
    turns: [...turns, ...buildFurtherTurns(session, conversationId)],
  };
}

/**
 * Further-question turns for one topic part, in time order. Walks the part's
 * utterances in order; each candidate utterance with questionId null is
 * grouped under the examiner utterance just before it (the FURTHER_QUESTION
 * prompt, whether callback or authored), and that prompt becomes the turn's
 * questionPrompt.
 */
function buildFurtherTurns(session: SessionTranscript, conversationId: 'topic1' | 'topic2'): ConversationTurn[] {
  const groups: { prompt: string; utterances: Utterance[] }[] = [];
  let lastExaminer: Utterance | null = null;
  let lastGroupFor: Utterance | null = null;

  for (const utterance of session.utterances) {
    if (utterance.part !== conversationId) continue;
    if (utterance.role === 'examiner') {
      lastExaminer = utterance;
      continue;
    }
    if (utterance.questionId !== null || lastExaminer === null) continue;
    if (lastGroupFor !== lastExaminer) {
      groups.push({ prompt: lastExaminer.text, utterances: [] });
      lastGroupFor = lastExaminer;
    }
    groups[groups.length - 1].utterances.push(utterance);
  }

  return groups.map((group, index) => {
    const inputMode = turnInputMode(group.utterances);
    return {
      turnId: `further${index + 1}`,
      questionPrompt: group.prompt,
      candidateResponse: joinCandidateText(group.utterances),
      candidateResponseDurationS: sumCandidateDuration(group.utterances),
      ...(inputMode !== undefined ? { inputMode } : {}),
    };
  });
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
