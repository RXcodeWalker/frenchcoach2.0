/**
 * S3 word-to-utterance segmentation. Groups the flat RawAsrResult word stream into
 * utterances by speaker-cluster change and by a silence-gap threshold, then
 * attributes each utterance to a `part` and `questionId` by tracking "the question
 * currently in force" as utterances stream past (updated whenever a new utterance's
 * text matches a question in the set above MATCH_THRESHOLD).
 *
 * Role (examiner/candidate) is NOT resolved here — speaker clusters are raw
 * diarizer labels at this point. labelSpeakers rewrites `role` in a later pass.
 * Until then, `role` is a placeholder that must not be trusted by callers.
 */

import { matchQuestion } from './matchQuestion';
import type { RawAsrWord, SessionPart, SessionQuestionSet, Utterance } from '../types';

const SILENCE_GAP_THRESHOLD_S = 1.2;

/** Placeholder role assigned pre-labelSpeakers; overwritten by that pass. */
const UNRESOLVED_ROLE = 'candidate' as const;

interface RunningAttribution {
  part: SessionPart;
  questionId: string | null;
}

function attributeUtterance(
  text: string,
  questionSet: SessionQuestionSet,
  current: RunningAttribution,
): RunningAttribution {
  const match = matchQuestion(text, questionSet);
  if (match === null) {
    return current;
  }
  const question = questionSet.questions.find((q) => q.questionId === match.questionId);
  if (!question) {
    return current;
  }
  return { part: question.part, questionId: question.questionId };
}

export function segmentUtterances(
  words: RawAsrWord[],
  questionSet: SessionQuestionSet,
): Utterance[] {
  if (words.length === 0) return [];

  const utterances: Utterance[] = [];
  let running: RunningAttribution = {
    part: questionSet.questions[0]?.part ?? 'topic1',
    questionId: null,
  };

  let currentCluster = words[0].speakerCluster;
  let bucket: RawAsrWord[] = [];
  let utteranceIndex = 0;

  const flush = () => {
    if (bucket.length === 0) return;
    const text = bucket.map((w) => w.text).join(' ');
    running = attributeUtterance(text, questionSet, running);
    utteranceIndex += 1;
    utterances.push({
      utteranceId: `u${utteranceIndex}`,
      role: UNRESOLVED_ROLE,
      speakerCluster: currentCluster,
      part: running.part,
      questionId: running.questionId,
      startS: bucket[0].startS,
      endS: bucket[bucket.length - 1].endS,
      text,
      words: bucket.map((w) => ({
        text: w.text,
        startS: w.startS,
        endS: w.endS,
        confidence: w.confidence,
      })),
    });
    bucket = [];
  };

  for (const word of words) {
    const speakerChanged = word.speakerCluster !== currentCluster;
    const silenceGap = bucket.length > 0 ? word.startS - bucket[bucket.length - 1].endS : 0;
    const shouldSplit = bucket.length > 0 && (speakerChanged || silenceGap >= SILENCE_GAP_THRESHOLD_S);

    if (shouldSplit) {
      flush();
    }
    currentCluster = word.speakerCluster;
    bucket.push(word);
  }
  flush();

  return utterances;
}

export { SILENCE_GAP_THRESHOLD_S };
