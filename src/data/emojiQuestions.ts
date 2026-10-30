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
  },
  {
    id: 'e001',
    emojis: '🍇',
    french: 'le raisin',
    english: 'the grapes',
    options: ['la fraise', 'le raisin', 'la cerise', 'la prune'],
    category: 'food',
    difficulty: 1
  },
  {
    id: 'e002',
    emojis: '🍓',
    french: 'la fraise',
    english: 'the strawberry',
    options: ['la framboise', 'la cerise', 'la fraise', 'la pomme'],
    category: 'food',
    difficulty: 1
  },
  {
    id: 'e003',
    emojis: '🍒',
    french: 'la cerise',
    english: 'the cherry',
    options: ['la prune', 'la fraise', 'la poire', 'la cerise'],
    category: 'food',
    difficulty: 1
  },
  {
    id: 'e004',
    emojis: '🍑',
    french: 'la pêche',
    english: 'the peach',
    options: ['la pêche', 'la poire', 'la prune', 'l\'abricot'],
    category: 'food',
    difficulty: 2
  },
  {
    id: 'e005',
    emojis: '🍊',
    french: 'l\'orange',
    english: 'the orange',
    options: ['le citron', 'l\'orange', 'la mandarine', 'la pomme'],
    category: 'food',
    difficulty: 1
  },
  {
    id: 'e006',
    emojis: '🍋',
    french: 'le citron',
    english: 'the lemon',
    options: ['l\'orange', 'la lime', 'le citron', 'la banane'],
    category: 'food',
    difficulty: 1
  },
  {
    id: 'e007',
    emojis: '🍅',
    french: 'la tomate',
    english: 'the tomato',
    options: ['la carotte', 'la cerise', 'le poivron', 'la tomate'],
    category: 'food',
    difficulty: 1
  },
  {
    id: 'e008',
    emojis: '🥐',
    french: 'le croissant',
    english: 'the croissant',
    options: ['le croissant', 'le pain', 'la brioche', 'le gâteau'],
    category: 'food',
    difficulty: 1
  },
  {
    id: 'e009',
    emojis: '🍫',
    french: 'le chocolat',
    english: 'the chocolate',
    options: ['le caramel', 'le chocolat', 'le bonbon', 'le gâteau'],
    category: 'food',
    difficulty: 1
  },
  {
    id: 'e010',
    emojis: '🍗',
    french: 'le poulet',
    english: 'the chicken',
    options: ['le poisson', 'le porc', 'le poulet', 'le canard'],
    category: 'food',
    difficulty: 2
  },
  {
    id: 'e011',
    emojis: '🥗',
    french: 'la salade',
    english: 'the salad',
    options: ['la soupe', 'la pizza', 'la tarte', 'la salade'],
    category: 'food',
    difficulty: 1
  },
  {
    id: 'e012',
    emojis: '☕',
    french: 'le café',
    english: 'the coffee',
    options: ['le café', 'le thé', 'le lait', 'le jus'],
    category: 'food',
    difficulty: 1
  },
  {
    id: 'e013',
    emojis: '🍝',
    french: 'les pâtes',
    english: 'the pasta',
    options: ['le riz', 'les pâtes', 'les frites', 'la soupe'],
    category: 'food',
    difficulty: 2
  },
  {
    id: 'e014',
    emojis: '🥔',
    french: 'la pomme de terre',
    english: 'the potato',
    options: ['la carotte', 'l\'oignon', 'la pomme de terre', 'le chou'],
    category: 'food',
    difficulty: 2
  },
  {
    id: 'e015',
    emojis: '🍄',
    french: 'le champignon',
    english: 'the mushroom',
    options: ['le haricot', 'la tomate', 'le poivron', 'le champignon'],
    category: 'food',
    difficulty: 2
  },
  {
    id: 'e016',
    emojis: '🍯',
    french: 'le miel',
    english: 'the honey',
    options: ['le miel', 'le sucre', 'la confiture', 'le beurre'],
    category: 'food',
    difficulty: 2
  },
  {
    id: 'e017',
    emojis: '🥞',
    french: 'la crêpe',
    english: 'the pancake',
    options: ['la gaufre', 'la crêpe', 'le gâteau', 'la tarte'],
    category: 'food',
    difficulty: 2
  },
  {
    id: 'e018',
    emojis: '🍉',
    french: 'la pastèque',
    english: 'the watermelon',
    options: ['le melon', 'la fraise', 'la pastèque', 'la mangue'],
    category: 'food',
    difficulty: 3
  },
  {
    id: 'e019',
    emojis: '🍍',
    french: 'l\'ananas',
    english: 'the pineapple',
    options: ['la mangue', 'la noix de coco', 'le kiwi', 'l\'ananas'],
    category: 'food',
    difficulty: 3
  },
  {
    id: 'e020',
    emojis: '🥦',
    french: 'le brocoli',
    english: 'the broccoli',
    options: ['le brocoli', 'le chou-fleur', 'l\'épinard', 'le concombre'],
    category: 'food',
    difficulty: 2
  },
  {
    id: 'e021',
    emojis: '🐘',
    french: 'l\'éléphant',
    english: 'the elephant',
    options: ['le rhinocéros', 'l\'éléphant', 'l\'hippopotame', 'la girafe'],
    category: 'animals',
    difficulty: 1
  },
  {
    id: 'e022',
    emojis: '🦁',
    french: 'le lion',
    english: 'the lion',
    options: ['le tigre', 'le léopard', 'le lion', 'le loup'],
    category: 'animals',
    difficulty: 1
  },
  {
    id: 'e023',
    emojis: '🐻',
    french: 'l\'ours',
    english: 'the bear',
    options: ['le loup', 'le renard', 'le singe', 'l\'ours'],
    category: 'animals',
    difficulty: 2
  },
  {
    id: 'e024',
    emojis: '🐮',
    french: 'la vache',
    english: 'the cow',
    options: ['la vache', 'la chèvre', 'le cochon', 'le mouton'],
    category: 'animals',
    difficulty: 1
  },
  {
    id: 'e025',
    emojis: '🐷',
    french: 'le cochon',
    english: 'the pig',
    options: ['la vache', 'le cochon', 'le mouton', 'le cheval'],
    category: 'animals',
    difficulty: 1
  },
  {
    id: 'e026',
    emojis: '🐑',
    french: 'le mouton',
    english: 'the sheep',
    options: ['la chèvre', 'la vache', 'le mouton', 'le lapin'],
    category: 'animals',
    difficulty: 2
  },
  {
    id: 'e027',
    emojis: '🐸',
    french: 'la grenouille',
    english: 'the frog',
    options: ['la tortue', 'le serpent', 'le crapaud', 'la grenouille'],
    category: 'animals',
    difficulty: 2
  },
  {
    id: 'e028',
    emojis: '🦋',
    french: 'le papillon',
    english: 'the butterfly',
    options: ['le papillon', 'l\'abeille', 'la mouche', 'la coccinelle'],
    category: 'animals',
    difficulty: 2
  },
  {
    id: 'e029',
    emojis: '🐢',
    french: 'la tortue',
    english: 'the turtle',
    options: ['la grenouille', 'la tortue', 'le serpent', 'le crocodile'],
    category: 'animals',
    difficulty: 2
  },
  {
    id: 'e030',
    emojis: '🐌',
    french: 'l\'escargot',
    english: 'the snail',
    options: ['la limace', 'la tortue', 'l\'escargot', 'le ver'],
    category: 'animals',
    difficulty: 3
  },
  {
    id: 'e031',
    emojis: '🐝',
    french: 'l\'abeille',
    english: 'the bee',
    options: ['la guêpe', 'la mouche', 'la fourmi', 'l\'abeille'],
    category: 'animals',
    difficulty: 3
  },
  {
    id: 'e032',
    emojis: '🦊',
    french: 'le renard',
    english: 'the fox',
    options: ['le renard', 'le loup', 'le chien', 'l\'écureuil'],
    category: 'animals',
    difficulty: 2
  },
  {
    id: 'e033',
    emojis: '🐺',
    french: 'le loup',
    english: 'the wolf',
    options: ['le renard', 'le loup', 'l\'ours', 'le chien'],
    category: 'animals',
    difficulty: 2
  },
  {
    id: 'e034',
    emojis: '🐧',
    french: 'le pingouin',
    english: 'the penguin',
    options: ['le canard', 'le cygne', 'le pingouin', 'le pélican'],
    category: 'animals',
    difficulty: 2
  },
  {
    id: 'e035',
    emojis: '🦉',
    french: 'le hibou',
    english: 'the owl',
    options: ['le corbeau', 'l\'aigle', 'le pigeon', 'le hibou'],
    category: 'animals',
    difficulty: 3
  },
  {
    id: 'e036',
    emojis: '🕷️',
    french: 'l\'araignée',
    english: 'the spider',
    options: ['l\'araignée', 'la fourmi', 'la mouche', 'le scorpion'],
    category: 'animals',
    difficulty: 3
  },
  {
    id: 'e037',
    emojis: '🐒',
    french: 'le singe',
    english: 'the monkey',
    options: ['le gorille', 'le singe', 'l\'ours', 'le chat'],
    category: 'animals',
    difficulty: 2
  },
  {
    id: 'e038',
    emojis: '🔑',
    french: 'la clé',
    english: 'the key',
    options: ['la porte', 'la serrure', 'la clé', 'le cadenas'],
    category: 'objects',
    difficulty: 2
  },
  {
    id: 'e039',
    emojis: '☂️',
    french: 'le parapluie',
    english: 'the umbrella',
    options: ['le chapeau', 'le manteau', 'le sac', 'le parapluie'],
    category: 'objects',
    difficulty: 2
  },
  {
    id: 'e040',
    emojis: '⏰',
    french: 'le réveil',
    english: 'the alarm clock',
    options: ['le réveil', 'la montre', 'l\'horloge', 'le téléphone'],
    category: 'objects',
    difficulty: 2
  },
  {
    id: 'e041',
    emojis: '📱',
    french: 'le téléphone',
    english: 'the phone',
    options: ['la télévision', 'le téléphone', 'la radio', 'l\'ordinateur'],
    category: 'objects',
    difficulty: 2
  },
  {
    id: 'e042',
    emojis: '💻',
    french: 'l\'ordinateur',
    english: 'the computer',
    options: ['la télévision', 'la tablette', 'l\'ordinateur', 'la radio'],
    category: 'objects',
    difficulty: 2
  },
  {
    id: 'e043',
    emojis: '🎒',
    french: 'le sac à dos',
    english: 'the backpack',
    options: ['la valise', 'le sac à main', 'la trousse', 'le sac à dos'],
    category: 'objects',
    difficulty: 2
  },
  {
    id: 'e044',
    emojis: '👓',
    french: 'les lunettes',
    english: 'the glasses',
    options: ['les lunettes', 'les chaussures', 'les gants', 'les chaussettes'],
    category: 'objects',
    difficulty: 2
  },
  {
    id: 'e045',
    emojis: '🪑',
    french: 'la chaise',
    english: 'the chair',
    options: ['la table', 'la chaise', 'le canapé', 'le lit'],
    category: 'objects',
    difficulty: 1
  },
  {
    id: 'e046',
    emojis: '🛏️',
    french: 'le lit',
    english: 'the bed',
    options: ['la chaise', 'l\'armoire', 'le lit', 'le canapé'],
    category: 'objects',
    difficulty: 1
  },
  {
    id: 'e047',
    emojis: '🚪',
    french: 'la porte',
    english: 'the door',
    options: ['la fenêtre', 'le mur', 'le toit', 'la porte'],
    category: 'objects',
    difficulty: 1
  },
  {
    id: 'e048',
    emojis: '👟',
    french: 'la chaussure',
    english: 'the shoe',
    options: ['la chaussure', 'la chaussette', 'le gant', 'le chapeau'],
    category: 'objects',
    difficulty: 2
  },
  {
    id: 'e049',
    emojis: '👕',
    french: 'le tee-shirt',
    english: 'the T-shirt',
    options: ['le pantalon', 'le tee-shirt', 'la chemise', 'le pull'],
    category: 'objects',
    difficulty: 2
  },
  {
    id: 'e050',
    emojis: '🎁',
    french: 'le cadeau',
    english: 'the present',
    options: ['le gâteau', 'la carte', 'le cadeau', 'le ballon'],
    category: 'objects',
    difficulty: 2
  },
  {
    id: 'e051',
    emojis: '✂️',
    french: 'les ciseaux',
    english: 'the scissors',
    options: ['le couteau', 'la colle', 'le stylo', 'les ciseaux'],
    category: 'objects',
    difficulty: 3
  },
  {
    id: 'e052',
    emojis: '🔔',
    french: 'la cloche',
    english: 'the bell',
    options: ['la cloche', 'la sonnette', 'la clé', 'l\'horloge'],
    category: 'objects',
    difficulty: 3
  },
  {
    id: 'e053',
    emojis: '🌳',
    french: 'l\'arbre',
    english: 'the tree',
    options: ['la forêt', 'l\'arbre', 'la feuille', 'la fleur'],
    category: 'nature',
    difficulty: 1
  },
  {
    id: 'e054',
    emojis: '🌸',
    french: 'la fleur',
    english: 'the flower',
    options: ['l\'arbre', 'la feuille', 'la fleur', 'l\'herbe'],
    category: 'nature',
    difficulty: 1
  },
  {
    id: 'e055',
    emojis: '❄️',
    french: 'la neige',
    english: 'the snow',
    options: ['la glace', 'la pluie', 'le vent', 'la neige'],
    category: 'nature',
    difficulty: 1
  },
  {
    id: 'e056',
    emojis: '🌧️',
    french: 'la pluie',
    english: 'the rain',
    options: ['la pluie', 'la neige', 'le nuage', 'l\'orage'],
    category: 'nature',
    difficulty: 2
  },
  {
    id: 'e057',
    emojis: '🌊',
    french: 'la vague',
    english: 'the wave',
    options: ['la mer', 'la vague', 'le fleuve', 'la plage'],
    category: 'nature',
    difficulty: 2
  },
  {
    id: 'e058',
    emojis: '🔥',
    french: 'le feu',
    english: 'the fire',
    options: ['la fumée', 'le soleil', 'le feu', 'la chaleur'],
    category: 'nature',
    difficulty: 1
  },
  {
    id: 'e059',
    emojis: '⛰️',
    french: 'la montagne',
    english: 'the mountain',
    options: ['la colline', 'la vallée', 'la forêt', 'la montagne'],
    category: 'nature',
    difficulty: 2
  },
  {
    id: 'e060',
    emojis: '🌍',
    french: 'la Terre',
    english: 'the Earth',
    options: ['la Terre', 'la Lune', 'le soleil', 'l\'étoile'],
    category: 'nature',
    difficulty: 2
  },
  {
    id: 'e061',
    emojis: '⭐',
    french: 'l\'étoile',
    english: 'the star',
    options: ['la lune', 'l\'étoile', 'le soleil', 'la planète'],
    category: 'nature',
    difficulty: 2
  },
  {
    id: 'e062',
    emojis: '☁️',
    french: 'le nuage',
    english: 'the cloud',
    options: ['le ciel', 'la pluie', 'le nuage', 'le brouillard'],
    category: 'nature',
    difficulty: 2
  },
  {
    id: 'e063',
    emojis: '🌋',
    french: 'le volcan',
    english: 'the volcano',
    options: ['la montagne', 'la grotte', 'le désert', 'le volcan'],
    category: 'nature',
    difficulty: 3
  },
  {
    id: 'e064',
    emojis: '🏝️',
    french: 'l\'île',
    english: 'the island',
    options: ['l\'île', 'la plage', 'la mer', 'la côte'],
    category: 'nature',
    difficulty: 3
  },
  {
    id: 'e065',
    emojis: '🌵',
    french: 'le cactus',
    english: 'the cactus',
    options: ['le désert', 'le cactus', 'la plante', 'le palmier'],
    category: 'nature',
    difficulty: 2
  },
  {
    id: 'e066',
    emojis: '🏊',
    french: 'la natation',
    english: 'swimming',
    options: ['la danse', 'la course', 'la natation', 'la gymnastique'],
    category: 'activities',
    difficulty: 2
  },
  {
    id: 'e067',
    emojis: '🎬',
    french: 'le cinéma',
    english: 'the cinema',
    options: ['le théâtre', 'le concert', 'le musée', 'le cinéma'],
    category: 'activities',
    difficulty: 2
  },
  {
    id: 'e068',
    emojis: '✈️',
    french: 'l\'avion',
    english: 'the plane',
    options: ['l\'avion', 'le train', 'le bateau', 'l\'hélicoptère'],
    category: 'activities',
    difficulty: 1
  },
  {
    id: 'e069',
    emojis: '🚂',
    french: 'le train',
    english: 'the train',
    options: ['l\'avion', 'le train', 'le bus', 'le métro'],
    category: 'activities',
    difficulty: 1
  },
  {
    id: 'e070',
    emojis: '🚌',
    french: 'le bus',
    english: 'the bus',
    options: ['le train', 'le tram', 'le bus', 'la voiture'],
    category: 'activities',
    difficulty: 1
  },
  {
    id: 'e071',
    emojis: '🎵',
    french: 'la musique',
    english: 'the music',
    options: ['la danse', 'la peinture', 'le cinéma', 'la musique'],
    category: 'activities',
    difficulty: 1
  },
  {
    id: 'e072',
    emojis: '🏀',
    french: 'le basket',
    english: 'basketball',
    options: ['le basket', 'le football', 'le tennis', 'le rugby'],
    category: 'activities',
    difficulty: 2
  },
  {
    id: 'e073',
    emojis: '🎾',
    french: 'le tennis',
    english: 'tennis',
    options: ['le basket', 'le tennis', 'le golf', 'le badminton'],
    category: 'activities',
    difficulty: 1
  },
  {
    id: 'e074',
    emojis: '⛷️',
    french: 'le ski',
    english: 'skiing',
    options: ['le patin', 'la luge', 'le ski', 'le surf'],
    category: 'activities',
    difficulty: 2
  },
  {
    id: 'e075',
    emojis: '🏖️',
    french: 'la plage',
    english: 'the beach',
    options: ['la mer', 'le sable', 'la piscine', 'la plage'],
    category: 'activities',
    difficulty: 2
  },
  {
    id: 'e076',
    emojis: '🎮',
    french: 'le jeu vidéo',
    english: 'the video game',
    options: ['le jeu vidéo', 'le film', 'le livre', 'le sport'],
    category: 'activities',
    difficulty: 2
  },
  {
    id: 'e077',
    emojis: '📷',
    french: 'l\'appareil photo',
    english: 'the camera',
    options: ['la télévision', 'l\'appareil photo', 'le téléphone', 'l\'ordinateur'],
    category: 'activities',
    difficulty: 3
  },
  {
    id: 'e078',
    emojis: '🎭',
    french: 'le théâtre',
    english: 'the theatre',
    options: ['le cinéma', 'le concert', 'le théâtre', 'le cirque'],
    category: 'activities',
    difficulty: 3
  },
  {
    id: 'e079',
    emojis: '🌧️👧☂️',
    french: 'Il pleut et elle prend un parapluie',
    english: 'It is raining and she takes an umbrella',
    options: ['Il fait beau et elle joue', 'La neige tombe sur la maison', 'Elle cherche ses clés', 'Il pleut et elle prend un parapluie'],
    category: 'sentences',
    difficulty: 3
  },
  {
    id: 'e080',
    emojis: '👦⚽🏟️',
    french: 'Le garçon joue au football au stade',
    english: 'The boy plays football at the stadium',
    options: ['Le garçon joue au football au stade', 'Le garçon lit un livre', 'La fille mange une glace', 'Le garçon nage à la piscine'],
    category: 'sentences',
    difficulty: 2
  },
  {
    id: 'e081',
    emojis: '👪🍽️🏠',
    french: 'La famille mange à la maison',
    english: 'The family eats at home',
    options: ['La famille voyage en avion', 'La famille mange à la maison', 'Le chat dort sur le lit', 'Nous allons au cinéma'],
    category: 'sentences',
    difficulty: 2
  },
  {
    id: 'e082',
    emojis: '🎂🎈🎁',
    french: 'C\'est mon anniversaire',
    english: 'It is my birthday',
    options: ['C\'est mon cadeau préféré', 'Il pleut aujourd\'hui', 'C\'est mon anniversaire', 'J\'ai faim'],
    category: 'sentences',
    difficulty: 2
  },
  {
    id: 'e083',
    emojis: '☀️🏖️👪',
    french: 'La famille va à la plage',
    english: 'The family goes to the beach',
    options: ['La famille mange à la maison', 'Il neige en montagne', 'Le garçon joue au tennis', 'La famille va à la plage'],
    category: 'sentences',
    difficulty: 2
  },
  {
    id: 'e084',
    emojis: '✈️🌍👩',
    french: 'Elle voyage en avion',
    english: 'She travels by plane',
    options: ['Elle voyage en avion', 'Elle prend le train', 'Elle marche dans la rue', 'Elle nage dans la mer'],
    category: 'sentences',
    difficulty: 3
  }
];
