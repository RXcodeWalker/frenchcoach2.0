import type { Achievement, RoleplayScenario } from '../types';

// Re-export from the full question bank
export { TOPICS, QUESTIONS, EXAM_SETS, getTopicQuestions, getRandomQuestion, getQuestionById } from './questions';

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'premier_pas', name: 'Premier Pas', description: 'Complete your first practice session', icon: '🎯', xpReward: 50, unlocked: false, category: 'practice' },
  { id: 'semaine_parfaite', name: 'Semaine Parfaite', description: 'Maintain a 7-day streak', icon: '🔥', xpReward: 200, unlocked: false, category: 'streak' },
  { id: 'vocab_riche', name: 'Vocabulaire Riche', description: 'Use 50+ unique advanced words', icon: '📚', xpReward: 150, unlocked: false, category: 'skill' },
  { id: 'fluent', name: 'Fluent', description: 'Score 8+ on fluency', icon: '🌟', xpReward: 100, unlocked: false, category: 'skill' },
  { id: 'perfectionniste', name: 'Perfectionniste', description: 'Score perfect 10/10', icon: '💎', xpReward: 300, unlocked: false, category: 'skill' },
  { id: 'examinateur', name: 'Examinateur', description: 'Complete your first exam', icon: '📝', xpReward: 100, unlocked: false, category: 'exam' },
  { id: 'polyglotte', name: 'Polyglotte', description: 'Practice all 8 topics', icon: '🗺', xpReward: 200, unlocked: false, category: 'practice' },
  { id: 'marathonien', name: 'Marathonien', description: 'Complete 50 total sessions', icon: '🏃', xpReward: 250, unlocked: false, category: 'practice' },
  { id: 'grand_oral', name: 'Grand Oral', description: 'Complete your first IGCSE exam', icon: '🎓', xpReward: 150, unlocked: false, category: 'exam' },
  { id: 'curieux', name: 'Curieux', description: 'Use Grammar Coach 10 times', icon: '🔬', xpReward: 75, unlocked: false, category: 'practice' },
  { id: 'causeur', name: 'Causeur', description: 'Complete 5 roleplay conversations', icon: '💬', xpReward: 125, unlocked: false, category: 'social' },
  { id: 'expert', name: 'Expert', description: 'Reach the Advanced level', icon: '🏆', xpReward: 500, unlocked: false, category: 'skill' },
];

export const ROLEPLAY_SCENARIOS: RoleplayScenario[] = [
  { id: 'restaurant', title: 'Au Restaurant', icon: '🍽️', description: 'Order food and drinks in a French restaurant', difficulty: 1 },
  { id: 'hotel', title: "À l'Hôtel", icon: '🏨', description: 'Check in and manage your hotel stay', difficulty: 1 },
  { id: 'airport', title: "À l'Aéroport", icon: '✈️', description: 'Navigate the airport and check in for your flight', difficulty: 2 },
  { id: 'pharmacy', title: 'À la Pharmacie', icon: '💊', description: 'Describe symptoms and buy medicine', difficulty: 2 },
  { id: 'doctor', title: 'Chez le Médecin', icon: '🏥', description: 'Explain your health issues to a doctor', difficulty: 3 },
  { id: 'job_interview', title: "Entretien d'Embauche", icon: '💼', description: 'Impress in a French job interview', difficulty: 3 },
  { id: 'bakery', title: 'À la Boulangerie', icon: '🥖', description: 'Buy bread and pastries at a French bakery', difficulty: 1 },
  { id: 'market', title: 'Au Marché', icon: '🛒', description: 'Shop for fresh produce at a French market', difficulty: 1 },
  { id: 'bank', title: 'À la Banque', icon: '🏦', description: 'Open an account or exchange money', difficulty: 2 },
  { id: 'museum', title: 'Au Musée', icon: '🏛️', description: 'Ask about exhibits and buy tickets', difficulty: 2 },
];
