export interface ListeningQuestion {
  id: string;
  topicKey: string;
  type: 'dictation' | 'comprehension' | 'multiple-choice';
  audioText: string;
  options?: string[];
  correctAnswer: string;
  translationEn: string;
  explanation?: string;
  difficulty: 1 | 2 | 3;
}

export const LISTENING_QUESTIONS: ListeningQuestion[] = [
  // School
  {
    id: 'list_sch_01',
    topicKey: 'school',
    type: 'dictation',
    audioText: "J'aime beaucoup mon école parce que les professeurs sont sympas.",
    correctAnswer: "J'aime beaucoup mon école parce que les professeurs sont sympas.",
    translationEn: "I really like my school because the teachers are nice.",
    difficulty: 1
  },
  {
    id: 'list_sch_02',
    topicKey: 'school',
    type: 'comprehension',
    audioText: "Ma matière préférée est le français, mais je n'aime pas les maths.",
    options: [
      "I love math but hate French.",
      "My favorite subject is French, but I don't like math.",
      "I like both French and math.",
      "I don't like French or math."
    ],
    correctAnswer: "My favorite subject is French, but I don't like math.",
    translationEn: "My favorite subject is French, but I don't like math.",
    difficulty: 1
  },
  // Family
  {
    id: 'list_fam_01',
    topicKey: 'family',
    type: 'dictation',
    audioText: "J'ai un frère aîné et une sœur cadette.",
    correctAnswer: "J'ai un frère aîné et une sœur cadette.",
    translationEn: "I have an older brother and a younger sister.",
    difficulty: 2
  },
  {
    id: 'list_fam_02',
    topicKey: 'family',
    type: 'comprehension',
    audioText: "Mes parents habitent dans une grande maison à la campagne.",
    options: [
      "My parents live in a small apartment in the city.",
      "My parents live in a big house in the countryside.",
      "My parents want to move to the countryside.",
      "My parents visit the countryside often."
    ],
    correctAnswer: "My parents live in a big house in the countryside.",
    translationEn: "My parents live in a big house in the countryside.",
    difficulty: 1
  },
  // Hobbies
  {
    id: 'list_hob_01',
    topicKey: 'hobbies',
    type: 'dictation',
    audioText: "Le week-end, j'aime jouer au football avec mes amis au parc.",
    correctAnswer: "Le week-end, j'aime jouer au football avec mes amis au parc.",
    translationEn: "On the weekend, I like to play football with my friends at the park.",
    difficulty: 1
  },
  // Food
  {
    id: 'list_food_01',
    topicKey: 'food',
    type: 'multiple-choice',
    audioText: "Je voudrais un croissant et un café au lait, s'il vous plaît.",
    options: [
      "A croissant and a black coffee",
      "A baguette and a tea",
      "A croissant and a coffee with milk",
      "A sandwich and a juice"
    ],
    correctAnswer: "A croissant and a coffee with milk",
    translationEn: "I would like a croissant and a coffee with milk, please.",
    difficulty: 1
  }
];

export function getListeningQuestions(topicKey: string): ListeningQuestion[] {
  return LISTENING_QUESTIONS.filter(q => q.topicKey === topicKey);
}

export function getRandomListeningQuestion(topicKey: string, excludeIds: string[] = []): ListeningQuestion | null {
  const filtered = LISTENING_QUESTIONS.filter(q => q.topicKey === topicKey && !excludeIds.includes(q.id));
  if (filtered.length === 0) return null;
  return filtered[Math.floor(Math.random() * filtered.length)];
}
