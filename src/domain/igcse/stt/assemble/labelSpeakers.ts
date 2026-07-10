/**
 * S3 speaker-role labelling. Scores each diarization cluster's combined utterance
 * text against the question set; the cluster whose speech better matches known
 * questions is the examiner. Ties/near-ties surface a low roleLabelConfidence
 * rather than silently guessing.
 */

import { matchQuestion } from './matchQuestion';
import type { SessionQuestionSet, Utterance } from '../types';

const CONFIDENCE_TIE_THRESHOLD = 0.15;

export interface LabelSpeakersResult {
  utterances: Utterance[];
  roleLabelConfidence: number;
}

function clusterQuestionScore(clusterUtterances: Utterance[], questionSet: SessionQuestionSet): number {
  if (clusterUtterances.length === 0) return 0;
  const scores = clusterUtterances.map((u) => matchQuestion(u.text, questionSet)?.score ?? 0);
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

/**
 * Labels roles for a two-cluster diarization. Requires exactly two distinct
 * speakerCluster values in `utterances` — assembleSession's contract with the
 * diarizer (`expectedSpeakers: 2`).
 */
export function labelSpeakers(
  utterances: Utterance[],
  questionSet: SessionQuestionSet,
): LabelSpeakersResult {
  const clusters = Array.from(new Set(utterances.map((u) => u.speakerCluster)));

  if (clusters.length !== 2) {
    // Degenerate diarization: cannot reliably assign roles. Preserve utterances,
    // flag zero confidence so the CLI surfaces a warning rather than guessing.
    return { utterances, roleLabelConfidence: 0 };
  }

  const [clusterA, clusterB] = clusters;
  const utterancesA = utterances.filter((u) => u.speakerCluster === clusterA);
  const utterancesB = utterances.filter((u) => u.speakerCluster === clusterB);

  const scoreA = clusterQuestionScore(utterancesA, questionSet);
  const scoreB = clusterQuestionScore(utterancesB, questionSet);

  const examinerCluster = scoreA >= scoreB ? clusterA : clusterB;
  const roleLabelConfidence = Math.min(1, Math.abs(scoreA - scoreB) / CONFIDENCE_TIE_THRESHOLD);

  const labelled = utterances.map((u) => ({
    ...u,
    role: u.speakerCluster === examinerCluster ? ('examiner' as const) : ('candidate' as const),
  }));

  return { utterances: labelled, roleLabelConfidence };
}

export { CONFIDENCE_TIE_THRESHOLD };
