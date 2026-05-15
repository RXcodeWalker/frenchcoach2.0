import minigameQuestions from './scenarios/minigameQuestions.json';
import { EMOJI_QUESTIONS } from './emojiQuestions';

export interface SpeedQuestion {
  difficulty: 'easy' | 'medium' | 'hard';
  english: string;
  french: string | string[];
}

export const getSpeedSpeakingPool = (): SpeedQuestion[] => {
  const minigamePool: SpeedQuestion[] = minigameQuestions.map(q => ({
    difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
    english: q.english,
    french: q.french
  }));

  const emojiPool: SpeedQuestion[] = EMOJI_QUESTIONS
    .filter(q => q.category === 'sentences' || q.difficulty > 1)
    .map(q => ({
      difficulty: q.difficulty === 1 ? 'easy' : q.difficulty === 2 ? 'medium' : 'hard',
      english: q.english,
      french: q.french
    }));

  return [...minigamePool, ...emojiPool];
};

export const getNextSpeedQuestion = (currentStreak: number, pool: SpeedQuestion[]) => {
  let difficulty: 'easy' | 'medium' | 'hard' = 'easy';
  if (currentStreak >= 10) difficulty = 'hard';
  else if (currentStreak >= 5) difficulty = 'medium';
  
  const filtered = pool.filter(q => q.difficulty === difficulty);
  return filtered[Math.floor(Math.random() * filtered.length)];
};
