import type { Achievement, Topic, Question, Level } from '../types';

export const LEVELS: { level: Level; minXP: number; maxXP: number; color: string; icon: string }[] = [
  { level: 'Beginner', minXP: 0, maxXP: 500, color: '#64748b', icon: '🌱' },
  { level: 'Intermediate', minXP: 500, maxXP: 1500, color: '#0ea5e9', icon: '📚' },
  { level: 'Advanced', minXP: 1500, maxXP: 3500, color: '#f59e0b', icon: '🔥' },
  { level: 'Expert', minXP: 3500, maxXP: 7000, color: '#10b981', icon: '⚡' },
  { level: 'Beast Mode', minXP: 7000, maxXP: 99999, color: '#ef4444', icon: '👑' },
];

export const getLevelInfo = (totalXP: number) => {
  const current = LEVELS.find(l => totalXP >= l.minXP && totalXP < l.maxXP) || LEVELS[LEVELS.length - 1];
  const next = LEVELS[LEVELS.indexOf(current) + 1];
  const progressInLevel = totalXP - current.minXP;
  const levelRange = (next?.minXP ?? current.maxXP) - current.minXP;
  const progress = Math.min((progressInLevel / levelRange) * 100, 100);
  return { current, next, progress, progressInLevel, levelRange };
};

export const TOPICS: Topic[] = [
  { key: 'school', label: "L'école", labelEn: 'School & Education', icon: '🎓', color: '#0ea5e9', description: 'Parle de ton école, tes matières et ta routine.', questionsCount: 58 },
  { key: 'hobbies', label: 'Les loisirs', labelEn: 'Hobbies & Interests', icon: '🎸', color: '#f59e0b', description: 'Décris tes passe-temps et activités favorites.', questionsCount: 52 },
  { key: 'family', label: 'La famille', labelEn: 'Family & Relationships', icon: '👨‍👩‍👧', color: '#ec4899', description: 'Parle de ta famille et de tes relations.', questionsCount: 47 },
  { key: 'holidays', label: 'Les vacances', labelEn: 'Holidays & Travel', icon: '✈️', color: '#8b5cf6', description: 'Décris tes voyages et vacances préférés.', questionsCount: 61 },
  { key: 'food', label: 'La nourriture', labelEn: 'Food & Drink', icon: '🥐', color: '#f97316', description: 'Parle de la cuisine et des habitudes alimentaires.', questionsCount: 44 },
  { key: 'technology', label: 'La technologie', labelEn: 'Technology', icon: '💻', color: '#06b6d4', description: "Discute de l'impact de la technologie.", questionsCount: 38 },
  { key: 'environment', label: "L'environnement", labelEn: 'Environment', icon: '🌍', color: '#10b981', description: "Parle des problèmes environnementaux.", questionsCount: 43 },
  { key: 'health', label: 'La santé', labelEn: 'Health & Wellbeing', icon: '❤️', color: '#ef4444', description: "Décris ton mode de vie et ta santé.", questionsCount: 41 },
];

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

export const SAMPLE_QUESTIONS: Question[] = [
  {
    id: 'sch_01',
    topicKey: 'school',
    text: 'Parle-moi de ton école.',
    hint: 'Talk about your school — size, subjects, facilities, uniform...',
    difficulty: 1,
    followUps: ['Quel est ton professeur préféré et pourquoi ?', "Combien d'élèves y a-t-il dans ton école ?"],
    modelAnswer: "Mon école s'appelle... Elle se situe à... Il y a environ... élèves. Les matières que j'étudie sont... Ma matière préférée est... parce que...",
    keyVocab: ['professeur', 'matière', 'uniforme', 'salle de classe', 'bibliothèque'],
  },
  {
    id: 'hob_01',
    topicKey: 'hobbies',
    text: 'Quels sont tes passe-temps préférés ?',
    hint: 'Describe your hobbies — sports, music, reading, gaming...',
    difficulty: 1,
    followUps: ['Depuis combien de temps pratiques-tu ce passe-temps ?', 'Avec qui partages-tu ces activités ?'],
    modelAnswer: "Dans mon temps libre, j'aime... Je pratique... depuis... ans. C'est important pour moi parce que...",
    keyVocab: ['passe-temps', 'activité', 'pratiquer', 'temps libre', 'passion'],
  },
  {
    id: 'env_01',
    topicKey: 'environment',
    text: "Que penses-tu des problèmes environnementaux ?",
    hint: 'Discuss climate change, pollution, recycling, solutions...',
    difficulty: 2,
    followUps: ['Que fais-tu personnellement pour protéger l\'environnement ?', 'Quel est, selon toi, le problème environnemental le plus grave ?'],
    modelAnswer: "Je pense que les problèmes environnementaux sont très importants. Le réchauffement climatique... La pollution... Pour y remédier, nous devons...",
    keyVocab: ['réchauffement climatique', 'pollution', 'recycler', 'énergie renouvelable', 'développement durable'],
  },
  {
    id: 'fam_01',
    topicKey: 'family',
    text: 'Décris ta famille.',
    hint: 'Talk about family members, relationships, activities together...',
    difficulty: 1,
    followUps: ["Qu'est-ce que tu fais avec ta famille le week-end ?", 'Quelle est la personne de ta famille avec qui tu t\'entends le mieux ?'],
    modelAnswer: "Ma famille se compose de... Mon père/Ma mère... J'ai... frères/sœurs. Nous aimons... ensemble.",
    keyVocab: ['frère', 'sœur', 'parents', 's\'entendre', 'relations'],
  },
  {
    id: 'hol_01',
    topicKey: 'holidays',
    text: 'Décris tes dernières vacances.',
    hint: 'Where did you go, what did you do, who were you with, how was it...',
    difficulty: 1,
    followUps: ["Qu'est-ce qui s'est passé de mémorable pendant ces vacances ?", 'Où aimerais-tu aller pour tes prochaines vacances ?'],
    modelAnswer: "Pendant mes dernières vacances, je suis allé(e) à... avec... Nous avons visité... Le moment le plus mémorable était...",
    keyVocab: ['voyager', 'visiter', 'découvrir', 'séjourner', 'souvenir'],
  },
  {
    id: 'tech_01',
    topicKey: 'technology',
    text: "Comment la technologie a-t-elle changé ta vie quotidienne ?",
    hint: 'Talk about smartphones, social media, online learning, pros and cons...',
    difficulty: 2,
    followUps: ['Quels sont les dangers des réseaux sociaux pour les jeunes ?', 'Penses-tu que nous sommes trop dépendants de la technologie ?'],
    modelAnswer: "La technologie a considérablement changé ma vie. Grâce à mon smartphone... Les réseaux sociaux... Cependant, il y a des inconvénients...",
    keyVocab: ['smartphone', 'réseaux sociaux', 'numérique', 'dépendance', 'avantages et inconvénients'],
  },
];

export const EXAM_QUESTIONS: Question[] = [
  {
    id: 'exam_01',
    topicKey: 'school',
    text: 'Décris une journée typique à l\'école.',
    hint: 'Morning routine, lessons, lunch, after school...',
    difficulty: 2,
    followUps: [],
    modelAnswer: '',
    keyVocab: ['cours', 'récréation', 'déjeuner', 'devoirs', 'emploi du temps'],
  },
  {
    id: 'exam_02',
    topicKey: 'environment',
    text: 'Quelles actions peut-on prendre pour protéger l\'environnement ?',
    hint: 'Individual actions, government policy, recycling, transport...',
    difficulty: 3,
    followUps: [],
    modelAnswer: '',
    keyVocab: ['réduire', 'recycler', 'transport en commun', 'énergies vertes', 'sensibilisation'],
  },
  {
    id: 'exam_03',
    topicKey: 'technology',
    text: 'Les téléphones portables sont-ils bénéfiques pour les jeunes ?',
    hint: 'Arguments for and against, balanced opinion...',
    difficulty: 3,
    followUps: [],
    modelAnswer: '',
    keyVocab: ['avantages', 'inconvénients', 'distraction', 'communication', 'sécurité'],
  },
  {
    id: 'exam_04',
    topicKey: 'hobbies',
    text: 'Quel sport ou activité physique pratiquez-vous et pourquoi ?',
    hint: 'Describe the sport/activity, benefits, how often...',
    difficulty: 2,
    followUps: [],
    modelAnswer: '',
    keyVocab: ['entraînement', 'compétition', 'santé', 'équipe', 'champion'],
  },
  {
    id: 'exam_05',
    topicKey: 'family',
    text: 'Décris un membre de ta famille qui t\'inspire.',
    hint: 'Who they are, what they do, why they inspire you...',
    difficulty: 2,
    followUps: [],
    modelAnswer: '',
    keyVocab: ['admirer', 'inspirer', 'qualités', 'rôle modèle', 'fierté'],
  },
];

export const ROLEPLAY_SCENARIOS = [
  { id: 'restaurant', title: 'Au Restaurant', icon: '🍽️', description: 'Order food and drinks in a French restaurant', difficulty: 1 },
  { id: 'hotel', title: "À l'Hôtel", icon: '🏨', description: 'Check in and manage your hotel stay', difficulty: 1 },
  { id: 'airport', title: "À l'Aéroport", icon: '✈️', description: 'Navigate the airport and check in for your flight', difficulty: 2 },
  { id: 'pharmacy', title: 'À la Pharmacie', icon: '💊', description: 'Describe symptoms and buy medicine', difficulty: 2 },
  { id: 'doctor', title: 'Chez le Médecin', icon: '🏥', description: 'Explain your health issues to a doctor', difficulty: 3 },
  { id: 'job_interview', title: "Entretien d'Embauche", icon: '💼', description: 'Impress in a French job interview', difficulty: 3 },
];
