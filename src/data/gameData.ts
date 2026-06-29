import type { RoleplayScenario } from '../types';
import { ACHIEVEMENT_DEFINITIONS } from './achievements';

// Re-export from the full question bank
export { TOPICS, QUESTIONS, EXAM_SETS, getTopicQuestions, getRandomQuestion, getQuestionById } from './questions';

export { ACHIEVEMENT_DEFINITIONS };

// Backward-compatible shape with `unlocked: false` for consumers that spread it onto Achievement
export const ACHIEVEMENTS = ACHIEVEMENT_DEFINITIONS.map(d => ({ ...d, unlocked: false }));

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
