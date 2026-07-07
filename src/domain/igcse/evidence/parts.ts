import type { SpeakingTranscript } from '../judgement/types';
import type { RolePlayPartsEvidence } from './types';

function splitCommunicativeActs(response: string): string[] {
  return response
    .split(/[.!?;,]| et | puis | ensuite | mais /i)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function detectPartsAddressed(response: string, partsExpected: 1 | 2): 0 | 1 | 2 {
  const acts = splitCommunicativeActs(response);

  if (partsExpected === 1) {
    return acts.length > 0 ? 1 : 0;
  }

  if (acts.length >= 2) return 2;
  return acts.length > 0 ? 1 : 0;
}

export function rolePlayPartsByTask(transcript: SpeakingTranscript): RolePlayPartsEvidence[] {
  return transcript.rolePlay.map((task) => {
    const partsExpected = task.partsExpected ?? 1;
    return {
      taskId: task.taskId,
      partsExpected,
      partsAddressed: detectPartsAddressed(task.candidateResponse, partsExpected),
    };
  });
}
