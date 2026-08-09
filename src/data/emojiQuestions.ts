export interface EmojiQuestion {
  id: string;
  emojis: string;
  french: string;
  english: string;
  options: string[];
  category: 'food' | 'animals' | 'objects' | 'nature' | 'activities' | 'sentences';
  difficulty: 1 | 2 | 3;
}

export const EMOJI_QUESTIONS: EmojiQuestion[] = [
  {
    id: '1',
    emojis: '🍎',
    french: 'la pomme',
    english: 'the apple',
    options: ['la pomme', 'la poire', 'la banane', 'le raisin'],
    category: 'food',
    difficulty: 1
  },
  {
    id: '2',
    emojis: '🐱',
    french: 'le chat',
    english: 'the cat',
    options: ['le chien', 'le chat', 'le lapin', 'le lion'],
    category: 'animals',
    difficulty: 1
  },
  {
    id: '3',
    emojis: '🏠',
    french: 'la maison',
    english: 'the house',
    options: ['la ville', 'la voiture', 'la maison', 'le jardin'],
    category: 'objects',
    difficulty: 1
  },
  {
    id: '4',
    emojis: '🚗',
    french: 'la voiture',
    english: 'the car',
    options: ['le train', 'le vélo', 'la voiture', 'le bus'],
    category: 'activities',
    difficulty: 1
  },
  {
    id: '5',
    emojis: '🐶',
    french: 'le chien',
    english: 'the dog',
    options: ['le chat', 'le loup', 'le chien', 'le renard'],
    category: 'animals',
    difficulty: 1
  },
  {
    id: '6',
    emojis: '🍌',
    french: 'la banane',
    english: 'the banana',
    options: ['la fraise', 'la banane', 'le citron', 'l\'orange'],
    category: 'food',
    difficulty: 1
  },
  {
    id: '7',
    emojis: '☀️',
    french: 'le soleil',
    english: 'the sun',
    options: ['la lune', 'le soleil', 'le ciel', 'le nuage'],
    category: 'nature',
    difficulty: 1
  },
  {
    id: '8',
    emojis: '🌙',
    french: 'la lune',
    english: 'the moon',
    options: ['l\'étoile', 'le soleil', 'la lune', 'la terre'],
    category: 'nature',
    difficulty: 1
  },
  {
    id: '9',
    emojis: '⚽',
    french: 'le football',
    english: 'football',
    options: ['le tennis', 'le basketball', 'le football', 'le rugby'],
    category: 'activities',
    difficulty: 1
  },
  {
    id: '10',
    emojis: '🍕',
    french: 'la pizza',
    english: 'the pizza',
    options: ['le pain', 'le fromage', 'la pizza', 'le gâteau'],
    category: 'food',
    difficulty: 1
  },
  {
    id: '11',
    emojis: '🍦',
    french: 'la glace',
    english: 'the ice cream',
    options: ['le chocolat', 'la glace', 'le lait', 'le sucre'],
    category: 'food',
    difficulty: 1
  },
  {
    id: '12',
    emojis: '🚲',
    french: 'le vélo',
    english: 'the bicycle',
    options: ['la moto', 'la voiture', 'le vélo', 'le camion'],
    category: 'activities',
    difficulty: 1
  },
  {
    id: '13',
    emojis: '📖',
    french: 'le livre',
    english: 'the book',
    options: ['le stylo', 'le cahier', 'le livre', 'le journal'],
    category: 'objects',
    difficulty: 1
  },
  {
    id: '14',
    emojis: '🥛',
    french: 'le lait',
    english: 'the milk',
    options: ['l\'eau', 'le jus', 'le lait', 'le café'],
    category: 'food',
    difficulty: 1
  },
  {
    id: '15',
    emojis: '🥖',
    french: 'le pain',
    english: 'the bread',
    options: ['le beurre', 'le pain', 'le croissant', 'le gâteau'],
    category: 'food',
    difficulty: 1
  },
  {
    id: '16',
    emojis: '🧀',
    french: 'le fromage',
    english: 'the cheese',
    options: ['le lait', 'le fromage', 'le beurre', 'le yaourt'],
    category: 'food',
    difficulty: 1
  },
  {
    id: '17',
    emojis: '🍳',
    french: 'l\'œuf',
    english: 'the egg',
    options: ['l\'œuf', 'le poulet', 'le bacon', 'le riz'],
    category: 'food',
    difficulty: 1
  },
  {
    id: '18',
    emojis: '🥕',
    french: 'la carotte',
    english: 'the carrot',
    options: ['la pomme de terre', 'la carotte', 'la tomate', 'le brocoli'],
    category: 'food',
    difficulty: 1
  },
  {
    id: '19',
    emojis: '🍟',
    french: 'les frites',
    english: 'the fries',
    options: ['les frites', 'le burger', 'le sel', 'la pomme'],
    category: 'food',
    difficulty: 1
  },
  {
    id: '20',
    emojis: '🍔',
    french: 'le hamburger',
    english: 'the hamburger',
    options: ['le sandwich', 'le hamburger', 'la pizza', 'le hot-dog'],
    category: 'food',
    difficulty: 1
  },
  {
    id: '21',
    emojis: '🎸',
    french: 'la guitare',
    english: 'the guitar',
    options: ['le piano', 'la guitare', 'le violon', 'la batterie'],
    category: 'activities',
    difficulty: 1
  },
  {
    id: '22',
    emojis: '🎹',
    french: 'le piano',
    english: 'the piano',
    options: ['la flûte', 'le saxophone', 'le piano', 'la trompette'],
    category: 'activities',
    difficulty: 1
  },
  {
    id: '23',
    emojis: '🎨',
    french: 'la peinture',
    english: 'the painting',
    options: ['le dessin', 'la peinture', 'la sculpture', 'la photo'],
    category: 'activities',
    difficulty: 1
  },
  {
    id: '24',
    emojis: '🚀',
    french: 'la fusée',
    english: 'the rocket',
    options: ['l\'avion', 'la fusée', 'l\'étoile', 'la planète'],
    category: 'nature',
    difficulty: 2
  },
  {
    id: '25',
    emojis: '🛸',
    french: 'l\'ovni',
    english: 'the UFO',
    options: ['l\'ovni', 'le robot', 'le monstre', 'l\'espace'],
    category: 'nature',
    difficulty: 3
  },
  {
    id: '26',
    emojis: '🧸',
    french: 'l\'ours en peluche',
    english: 'the teddy bear',
    options: ['le jouet', 'la poupée', 'l\'ours en peluche', 'le train'],
    category: 'objects',
    difficulty: 1
  },
  {
    id: '27',
    emojis: '🎈',
    french: 'le ballon',
    english: 'the balloon',
    options: ['la fête', 'le cadeau', 'le ballon', 'le gâteau'],
    category: 'objects',
    difficulty: 1
  },
  {
    id: '28',
    emojis: '🎂',
    french: 'le gâteau',
    english: 'the cake',
    options: ['le biscuit', 'le chocolat', 'le gâteau', 'le bonbon'],
    category: 'food',
    difficulty: 1
  },
  {
    id: '29',
    emojis: '🌈',
    french: 'l\'arc-en-ciel',
    english: 'the rainbow',
    options: ['la pluie', 'l\'arc-en-ciel', 'le soleil', 'le ciel'],
    category: 'nature',
    difficulty: 2
  },
  {
    id: '30',
    emojis: '⚡',
    french: 'l\'éclair',
    english: 'the lightning',
    options: ['le tonnerre', 'la pluie', 'l\'éclair', 'le vent'],
    category: 'nature',
    difficulty: 2
  },
  {
    id: '31',
    emojis: '🐰',
    french: 'le lapin',
    english: 'the rabbit',
    options: ['le chat', 'le lapin', 'le chien', 'le lion'],
    category: 'animals',
    difficulty: 1
  },
  {
    id: '32',
    emojis: '🐦',
    french: 'l\'oiseau',
    english: 'the bird',
    options: ['le poisson', 'l\'oiseau', 'le chat', 'le cheval'],
    category: 'animals',
    difficulty: 1
  },
  {
    id: '33',
    emojis: '🐟',
    french: 'le poisson',
    english: 'the fish',
    options: ['le poisson', 'l\'oiseau', 'le chat', 'le chien'],
    category: 'animals',
    difficulty: 1
  },
  {
    id: '34',
    emojis: '🐴',
    french: 'le cheval',
    english: 'the horse',
    options: ['le chien', 'le cheval', 'le lion', 'le lapin'],
    category: 'animals',
    difficulty: 1
  },
  {
    id: '35',
    emojis: '📚',
    french: 'le livre',
    english: 'the book',
    options: ['le cahier', 'le livre', 'le stylo', 'la table'],
    category: 'objects',
    difficulty: 1
  },
  {
    id: '36',
    emojis: '✏️',
    french: 'le crayon',
    english: 'the pencil',
    options: ['le stylo', 'le crayon', 'le livre', 'la règle'],
    category: 'objects',
    difficulty: 1
  },
  // Adding Sentence Questions

  {
    id: 's1',
    emojis: '👨‍🍳🔥🥩',
    french: 'Le chef cuit la viande',
    english: 'The chef is cooking the meat',
    options: ['Le chef mange la pomme', 'Le chef cuit la viande', 'Le chat dort sur le lit', 'Je vais à la plage'],
    category: 'sentences',
    difficulty: 2
  },
  {
    id: 's2',
    emojis: '🏃‍♂️➡️🏠',
    french: 'Je vais à la maison',
    english: 'I am going home',
    options: ['Je vais à la maison', 'Il court dans le parc', 'Nous aimons le fromage', 'Elle regarde la télé'],
    category: 'sentences',
    difficulty: 2
  },
  {
    id: 's3',
    emojis: '👩‍🏫🍎',
    french: 'La prof mange une pomme',
    english: 'The teacher is eating an apple',
    options: ['Le prof boit du café', 'La prof mange une pomme', 'L\'élève écrit un livre', 'Le soleil brille'],
    category: 'sentences',
    difficulty: 2
  },
  {
    id: 's4',
    emojis: '🐱💤🛏️',
    french: 'Le chat dort sur le lit',
    english: 'The cat is sleeping on the bed',
    options: ['Le chien joue dehors', 'Le chat dort sur le lit', 'La souris mange du pain', 'Le lion rugit'],
    category: 'sentences',
    difficulty: 2
  },
  {
    id: 's5',
    emojis: '🚗💨🛣️',
    french: 'La voiture va vite sur la route',
    english: 'The car goes fast on the road',
    options: ['Le train s\'arrête', 'La voiture va vite sur la route', 'Le vélo est cassé', 'Il pleut aujourd\'hui'],
    category: 'sentences',
    difficulty: 3
  },
  {
    id: 's6',
    emojis: '👧📖🏫',
    french: 'Elle lit un livre à l\'école',
    english: 'She is reading a book at school',
    options: ['Il écrit une lettre', 'Elle lit un livre à l\'école', 'Nous jouons au parc', 'Tu manges une pomme'],
    category: 'sentences',
    difficulty: 2
  }
];

