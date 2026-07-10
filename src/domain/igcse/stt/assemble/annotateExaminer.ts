/**
 * S3 examiner-event annotation. Walks examiner utterances in time order against
 * the question set and classifies each as a raw, auditable event. This does NOT
 * aggregate into repetitions_used / alternative_triggered — that is an L1 detector
 * (a later subphase); S3 emits only the raw annotated events.
 */

import { matchQuestion } from './matchQuestion';
import type { ExaminerEvent, ExaminerEventKind, SessionQuestionSet, Utterance } from '../types';

/** Extension prompts are short back-channel-ish follow-ups, not new questions. */
const EXTENSION_PROMPT_PATTERNS = [/^pourquoi\s*\??$/, /^et\s+ensuite\s*\??$/, /^peux-tu\s+expliquer\s*\??$/];

function isExtensionPrompt(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return EXTENSION_PROMPT_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function annotateExaminer(
  utterances: Utterance[],
  questionSet: SessionQuestionSet,
): ExaminerEvent[] {
  const examinerUtterances = utterances
    .filter((u) => u.role === 'examiner')
    .slice()
    .sort((a, b) => a.startS - b.startS);

  const seenMainQuestionIds = new Set<string>();
  const events: ExaminerEvent[] = [];
  let eventIndex = 0;

  for (const utterance of examinerUtterances) {
    eventIndex += 1;
    const eventId = `e${eventIndex}`;
    const match = matchQuestion(utterance.text, questionSet);

    let kind: ExaminerEventKind;
    let questionId: string | null;
    let matchScore: number;

    if (match === null) {
      if (isExtensionPrompt(utterance.text)) {
        kind = 'extension_prompt';
        questionId = null;
        matchScore = 0;
      } else {
        kind = 'unmatched';
        questionId = null;
        matchScore = 0;
      }
    } else if (match.variant === 'alternative') {
      kind = 'alternative_question';
      questionId = match.questionId;
      matchScore = match.score;
    } else if (seenMainQuestionIds.has(match.questionId)) {
      kind = 'repetition';
      questionId = match.questionId;
      matchScore = match.score;
    } else {
      kind = 'main_question';
      questionId = match.questionId;
      matchScore = match.score;
      seenMainQuestionIds.add(match.questionId);
    }

    events.push({
      eventId,
      utteranceId: utterance.utteranceId,
      atS: utterance.startS,
      part: utterance.part,
      kind,
      questionId,
      matchScore,
    });
  }

  return events;
}
