import type { SpeakingTranscript } from '../judgement/types';
import { countWords } from './counts';
import type { FillerDensityEvidence } from './types';

export const FILLERS = ['euh', 'ben', 'bah', 'alors', 'hmm', 'hein', 'voila', 'voilà'] as const;

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function countFillers(text: string): number {
  const tokens = normalize(text).split(' ').filter(Boolean);
  return tokens.reduce((sum, token) => (FILLERS.includes(token as (typeof FILLERS)[number]) ? sum + 1 : sum), 0);
}

export function fillerDensity(text: string): { fillerCount: number; wordCount: number; density: number } {
  const fillerCount = countFillers(text);
  const wordCount = countWords(text);
  return {
    fillerCount,
    wordCount,
    density: wordCount === 0 ? 0 : fillerCount / wordCount,
  };
}

export function fillerDensityByQuestion(transcript: SpeakingTranscript): FillerDensityEvidence[] {
  const conversation = transcript.topicConversations.flatMap((conversationItem) =>
    conversationItem.turns.map((turn) => {
      const values = fillerDensity(turn.candidateResponse);
      return {
        questionId: `${conversationItem.conversationId}:${turn.turnId}`,
        fillerCount: values.fillerCount,
        wordCount: values.wordCount,
        density: values.density,
      };
    }),
  );

  const rolePlay = transcript.rolePlay.map((task) => {
    const values = fillerDensity(task.candidateResponse);
    return {
      questionId: `rolePlay:${task.taskId}`,
      fillerCount: values.fillerCount,
      wordCount: values.wordCount,
      density: values.density,
    };
  });

  return [...rolePlay, ...conversation];
}
