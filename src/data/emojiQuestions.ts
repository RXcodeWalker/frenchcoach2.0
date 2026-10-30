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
  },
  {
    id: 'e085',
    emojis: '🍐',
    french: 'la poire',
    english: 'the pear',
    options: ['la pomme', 'la poire', 'la pêche', 'la prune'],
    category: 'food',
    difficulty: 1
  },
  {
    id: 'e086',
    emojis: '🥑',
    french: 'l\'avocat',
    english: 'the avocado',
    options: ['la banane', 'le concombre', 'l\'avocat', 'le citron'],
    category: 'food',
    difficulty: 2
  },
  {
    id: 'e087',
    emojis: '🌽',
    french: 'le maïs',
    english: 'the corn',
    options: ['le blé', 'la carotte', 'le riz', 'le maïs'],
    category: 'food',
    difficulty: 2
  },
  {
    id: 'e088',
    emojis: '🍚',
    french: 'le riz',
    english: 'the rice',
    options: ['le riz', 'les pâtes', 'le pain', 'la soupe'],
    category: 'food',
    difficulty: 1
  },
  {
    id: 'e089',
    emojis: '🍲',
    french: 'la soupe',
    english: 'the soup',
    options: ['la salade', 'la soupe', 'le gâteau', 'le riz'],
    category: 'food',
    difficulty: 1
  },
  {
    id: 'e090',
    emojis: '🥩',
    french: 'la viande',
    english: 'the meat',
    options: ['le poisson', 'le fromage', 'la viande', 'l\'œuf'],
    category: 'food',
    difficulty: 2
  },
  {
    id: 'e091',
    emojis: '🌭',
    french: 'le hot-dog',
    english: 'the hot dog',
    options: ['le hamburger', 'la pizza', 'les frites', 'le hot-dog'],
    category: 'food',
    difficulty: 2
  },
  {
    id: 'e092',
    emojis: '🥪',
    french: 'le sandwich',
    english: 'the sandwich',
    options: ['le sandwich', 'la pizza', 'le gâteau', 'la salade'],
    category: 'food',
    difficulty: 1
  },
  {
    id: 'e093',
    emojis: '🍩',
    french: 'le beignet',
    english: 'the doughnut',
    options: ['le gâteau', 'le beignet', 'la glace', 'le bonbon'],
    category: 'food',
    difficulty: 3
  },
  {
    id: 'e094',
    emojis: '🍬',
    french: 'le bonbon',
    english: 'the sweet',
    options: ['le chocolat', 'le gâteau', 'le bonbon', 'la glace'],
    category: 'food',
    difficulty: 1
  },
  {
    id: 'e095',
    emojis: '🧈',
    french: 'le beurre',
    english: 'the butter',
    options: ['le fromage', 'le lait', 'le miel', 'le beurre'],
    category: 'food',
    difficulty: 2
  },
  {
    id: 'e096',
    emojis: '🧂',
    french: 'le sel',
    english: 'the salt',
    options: ['le sel', 'le sucre', 'le poivre', 'l\'huile'],
    category: 'food',
    difficulty: 2
  },
  {
    id: 'e097',
    emojis: '🥜',
    french: 'la cacahuète',
    english: 'the peanut',
    options: ['la noix', 'la cacahuète', 'l\'amande', 'la noisette'],
    category: 'food',
    difficulty: 3
  },
  {
    id: 'e098',
    emojis: '🍷',
    french: 'le vin',
    english: 'the wine',
    options: ['le jus', 'l\'eau', 'le vin', 'le lait'],
    category: 'food',
    difficulty: 2
  },
  {
    id: 'e099',
    emojis: '💧',
    french: 'l\'eau',
    english: 'the water',
    options: ['le jus', 'le lait', 'le thé', 'l\'eau'],
    category: 'food',
    difficulty: 1
  },
  {
    id: 'e100',
    emojis: '🍵',
    french: 'le thé',
    english: 'the tea',
    options: ['le thé', 'le café', 'l\'eau', 'le lait'],
    category: 'food',
    difficulty: 1
  },
  {
    id: 'e101',
    emojis: '🥒',
    french: 'le concombre',
    english: 'the cucumber',
    options: ['la courgette', 'le concombre', 'l\'avocat', 'le chou'],
    category: 'food',
    difficulty: 3
  },
  {
    id: 'e102',
    emojis: '🧅',
    french: 'l\'oignon',
    english: 'the onion',
    options: ['l\'ail', 'la tomate', 'l\'oignon', 'la carotte'],
    category: 'food',
    difficulty: 2
  },
  {
    id: 'e103',
    emojis: '🍆',
    french: 'l\'aubergine',
    english: 'the aubergine',
    options: ['la courgette', 'la tomate', 'le poivron', 'l\'aubergine'],
    category: 'food',
    difficulty: 3
  },
  {
    id: 'e104',
    emojis: '🐯',
    french: 'le tigre',
    english: 'the tiger',
    options: ['le tigre', 'le lion', 'le léopard', 'le chat'],
    category: 'animals',
    difficulty: 2
  },
  {
    id: 'e105',
    emojis: '🦒',
    french: 'la girafe',
    english: 'the giraffe',
    options: ['l\'éléphant', 'la girafe', 'le zèbre', 'le chameau'],
    category: 'animals',
    difficulty: 2
  },
  {
    id: 'e106',
    emojis: '🦓',
    french: 'le zèbre',
    english: 'the zebra',
    options: ['le cheval', 'la girafe', 'le zèbre', 'l\'âne'],
    category: 'animals',
    difficulty: 3
  },
  {
    id: 'e107',
    emojis: '🐊',
    french: 'le crocodile',
    english: 'the crocodile',
    options: ['le serpent', 'le lézard', 'la tortue', 'le crocodile'],
    category: 'animals',
    difficulty: 3
  },
  {
    id: 'e108',
    emojis: '🐍',
    french: 'le serpent',
    english: 'the snake',
    options: ['le serpent', 'le ver', 'le crocodile', 'le lézard'],
    category: 'animals',
    difficulty: 2
  },
  {
    id: 'e109',
    emojis: '🐙',
    french: 'la pieuvre',
    english: 'the octopus',
    options: ['le poisson', 'la pieuvre', 'le crabe', 'la méduse'],
    category: 'animals',
    difficulty: 3
  },
  {
    id: 'e110',
    emojis: '🦀',
    french: 'le crabe',
    english: 'the crab',
    options: ['la pieuvre', 'le homard', 'le crabe', 'la crevette'],
    category: 'animals',
    difficulty: 3
  },
  {
    id: 'e111',
    emojis: '🐬',
    french: 'le dauphin',
    english: 'the dolphin',
    options: ['la baleine', 'le requin', 'le poisson', 'le dauphin'],
    category: 'animals',
    difficulty: 2
  },
  {
    id: 'e112',
    emojis: '🐳',
    french: 'la baleine',
    english: 'the whale',
    options: ['la baleine', 'le dauphin', 'le requin', 'la pieuvre'],
    category: 'animals',
    difficulty: 2
  },
  {
    id: 'e113',
    emojis: '🦈',
    french: 'le requin',
    english: 'the shark',
    options: ['le dauphin', 'le requin', 'la baleine', 'le poisson'],
    category: 'animals',
    difficulty: 2
  },
  {
    id: 'e114',
    emojis: '🐔',
    french: 'la poule',
    english: 'the hen',
    options: ['le coq', 'le canard', 'la poule', 'l\'oiseau'],
    category: 'animals',
    difficulty: 2
  },
  {
    id: 'e115',
    emojis: '🦆',
    french: 'le canard',
    english: 'the duck',
    options: ['la poule', 'le cygne', 'l\'oie', 'le canard'],
    category: 'animals',
    difficulty: 2
  },
  {
    id: 'e116',
    emojis: '🦅',
    french: 'l\'aigle',
    english: 'the eagle',
    options: ['l\'aigle', 'le hibou', 'le pigeon', 'le corbeau'],
    category: 'animals',
    difficulty: 3
  },
  {
    id: 'e117',
    emojis: '🐭',
    french: 'la souris',
    english: 'the mouse',
    options: ['le rat', 'la souris', 'le lapin', 'le chat'],
    category: 'animals',
    difficulty: 1
  },
  {
    id: 'e118',
    emojis: '🐹',
    french: 'le hamster',
    english: 'the hamster',
    options: ['la souris', 'le lapin', 'le hamster', 'le cochon d\'Inde'],
    category: 'animals',
    difficulty: 3
  },
  {
    id: 'e119',
    emojis: '🐨',
    french: 'le koala',
    english: 'the koala',
    options: ['l\'ours', 'le singe', 'le paresseux', 'le koala'],
    category: 'animals',
    difficulty: 3
  },
  {
    id: 'e120',
    emojis: '🐼',
    french: 'le panda',
    english: 'the panda',
    options: ['le panda', 'l\'ours', 'le koala', 'le tigre'],
    category: 'animals',
    difficulty: 2
  },
  {
    id: 'e121',
    emojis: '🦘',
    french: 'le kangourou',
    english: 'the kangaroo',
    options: ['le koala', 'le kangourou', 'le lapin', 'l\'autruche'],
    category: 'animals',
    difficulty: 3
  },
  {
    id: 'e122',
    emojis: '🐪',
    french: 'le chameau',
    english: 'the camel',
    options: ['le cheval', 'le lama', 'le chameau', 'l\'âne'],
    category: 'animals',
    difficulty: 3
  },
  {
    id: 'e123',
    emojis: '🐜',
    french: 'la fourmi',
    english: 'the ant',
    options: ['l\'abeille', 'la mouche', 'l\'araignée', 'la fourmi'],
    category: 'animals',
    difficulty: 3
  },
  {
    id: 'e124',
    emojis: '🐞',
    french: 'la coccinelle',
    english: 'the ladybird',
    options: ['la coccinelle', 'le papillon', 'l\'abeille', 'la fourmi'],
    category: 'animals',
    difficulty: 3
  },
  {
    id: 'e125',
    emojis: '🦎',
    french: 'le lézard',
    english: 'the lizard',
    options: ['le serpent', 'le lézard', 'la tortue', 'la grenouille'],
    category: 'animals',
    difficulty: 3
  },
  {
    id: 'e126',
    emojis: '📺',
    french: 'la télévision',
    english: 'the television',
    options: ['la radio', 'l\'ordinateur', 'la télévision', 'le téléphone'],
    category: 'objects',
    difficulty: 2
  },
  {
    id: 'e127',
    emojis: '📻',
    french: 'la radio',
    english: 'the radio',
    options: ['la télévision', 'le téléphone', 'l\'ordinateur', 'la radio'],
    category: 'objects',
    difficulty: 2
  },
  {
    id: 'e128',
    emojis: '💡',
    french: 'l\'ampoule',
    english: 'the light bulb',
    options: ['l\'ampoule', 'la lampe', 'la bougie', 'la lune'],
    category: 'objects',
    difficulty: 3
  },
  {
    id: 'e129',
    emojis: '🕯️',
    french: 'la bougie',
    english: 'the candle',
    options: ['la lampe', 'la bougie', 'l\'ampoule', 'le feu'],
    category: 'objects',
    difficulty: 3
  },
  {
    id: 'e130',
    emojis: '🥄',
    french: 'la cuillère',
    english: 'the spoon',
    options: ['la fourchette', 'le couteau', 'la cuillère', 'l\'assiette'],
    category: 'objects',
    difficulty: 2
  },
  {
    id: 'e131',
    emojis: '🔪',
    french: 'le couteau',
    english: 'the knife',
    options: ['la fourchette', 'la cuillère', 'les ciseaux', 'le couteau'],
    category: 'objects',
    difficulty: 2
  },
  {
    id: 'e132',
    emojis: '🍽️',
    french: 'l\'assiette',
    english: 'the plate',
    options: ['l\'assiette', 'le verre', 'la tasse', 'le bol'],
    category: 'objects',
    difficulty: 2
  },
  {
    id: 'e133',
    emojis: '🥣',
    french: 'le bol',
    english: 'the bowl',
    options: ['l\'assiette', 'le bol', 'la tasse', 'le verre'],
    category: 'objects',
    difficulty: 3
  },
  {
    id: 'e134',
    emojis: '⌚',
    french: 'la montre',
    english: 'the watch',
    options: ['le réveil', 'l\'horloge', 'la montre', 'le bracelet'],
    category: 'objects',
    difficulty: 2
  },
  {
    id: 'e135',
    emojis: '💍',
    french: 'la bague',
    english: 'the ring',
    options: ['le collier', 'le bracelet', 'la montre', 'la bague'],
    category: 'objects',
    difficulty: 3
  },
  {
    id: 'e136',
    emojis: '👑',
    french: 'la couronne',
    english: 'the crown',
    options: ['la couronne', 'le chapeau', 'la bague', 'le casque'],
    category: 'objects',
    difficulty: 3
  },
  {
    id: 'e137',
    emojis: '🎩',
    french: 'le chapeau',
    english: 'the hat',
    options: ['la casquette', 'le chapeau', 'la couronne', 'le bonnet'],
    category: 'objects',
    difficulty: 2
  },
  {
    id: 'e138',
    emojis: '🧦',
    french: 'les chaussettes',
    english: 'the socks',
    options: ['les chaussures', 'les gants', 'les chaussettes', 'les lunettes'],
    category: 'objects',
    difficulty: 2
  },
  {
    id: 'e139',
    emojis: '🧤',
    french: 'les gants',
    english: 'the gloves',
    options: ['les chaussettes', 'les bottes', 'les lunettes', 'les gants'],
    category: 'objects',
    difficulty: 2
  },
  {
    id: 'e140',
    emojis: '👗',
    french: 'la robe',
    english: 'the dress',
    options: ['la robe', 'la jupe', 'le pantalon', 'la chemise'],
    category: 'objects',
    difficulty: 2
  },
  {
    id: 'e141',
    emojis: '🧥',
    french: 'le manteau',
    english: 'the coat',
    options: ['le pull', 'le manteau', 'le chapeau', 'le sac'],
    category: 'objects',
    difficulty: 2
  },
  {
    id: 'e142',
    emojis: '👜',
    french: 'le sac à main',
    english: 'the handbag',
    options: ['le sac à dos', 'la valise', 'le sac à main', 'le portefeuille'],
    category: 'objects',
    difficulty: 3
  },
  {
    id: 'e143',
    emojis: '💰',
    french: 'l\'argent',
    english: 'the money',
    options: ['le cadeau', 'la carte', 'le sac', 'l\'argent'],
    category: 'objects',
    difficulty: 2
  },
  {
    id: 'e144',
    emojis: '✉️',
    french: 'la lettre',
    english: 'the letter',
    options: ['la lettre', 'le livre', 'la carte', 'le colis'],
    category: 'objects',
    difficulty: 2
  },
  {
    id: 'e145',
    emojis: '📅',
    french: 'le calendrier',
    english: 'the calendar',
    options: ['le livre', 'le calendrier', 'la lettre', 'l\'horloge'],
    category: 'objects',
    difficulty: 3
  },
  {
    id: 'e146',
    emojis: '📓',
    french: 'le cahier',
    english: 'the notebook',
    options: ['le livre', 'le stylo', 'le cahier', 'le sac'],
    category: 'objects',
    difficulty: 1
  },
  {
    id: 'e147',
    emojis: '🖊️',
    french: 'le stylo',
    english: 'the pen',
    options: ['le crayon', 'le cahier', 'la gomme', 'le stylo'],
    category: 'objects',
    difficulty: 1
  },
  {
    id: 'e148',
    emojis: '📏',
    french: 'la règle',
    english: 'the ruler',
    options: ['la règle', 'le crayon', 'le stylo', 'les ciseaux'],
    category: 'objects',
    difficulty: 2
  },
  {
    id: 'e149',
    emojis: '🎻',
    french: 'le violon',
    english: 'the violin',
    options: ['la guitare', 'le violon', 'le piano', 'la flûte'],
    category: 'objects',
    difficulty: 2
  },
  {
    id: 'e150',
    emojis: '🥁',
    french: 'la batterie',
    english: 'the drums',
    options: ['la guitare', 'le piano', 'la batterie', 'la trompette'],
    category: 'objects',
    difficulty: 3
  },
  {
    id: 'e151',
    emojis: '🎺',
    french: 'la trompette',
    english: 'the trumpet',
    options: ['le violon', 'la flûte', 'la guitare', 'la trompette'],
    category: 'objects',
    difficulty: 3
  },
  {
    id: 'e152',
    emojis: '🛋️',
    french: 'le canapé',
    english: 'the sofa',
    options: ['le canapé', 'la chaise', 'le lit', 'la table'],
    category: 'objects',
    difficulty: 2
  },
  {
    id: 'e153',
    emojis: '🚿',
    french: 'la douche',
    english: 'the shower',
    options: ['le bain', 'la douche', 'le lavabo', 'la piscine'],
    category: 'objects',
    difficulty: 2
  },
  {
    id: 'e154',
    emojis: '🛁',
    french: 'la baignoire',
    english: 'the bathtub',
    options: ['la douche', 'le lavabo', 'la baignoire', 'la piscine'],
    category: 'objects',
    difficulty: 3
  },
  {
    id: 'e155',
    emojis: '🧹',
    french: 'le balai',
    english: 'the broom',
    options: ['l\'aspirateur', 'la brosse', 'le seau', 'le balai'],
    category: 'objects',
    difficulty: 3
  },
  {
    id: 'e156',
    emojis: '🔨',
    french: 'le marteau',
    english: 'the hammer',
    options: ['le marteau', 'le tournevis', 'la scie', 'la clé'],
    category: 'objects',
    difficulty: 3
  },
  {
    id: 'e157',
    emojis: '🌴',
    french: 'le palmier',
    english: 'the palm tree',
    options: ['le cactus', 'le palmier', 'l\'arbre', 'la fleur'],
    category: 'nature',
    difficulty: 2
  },
  {
    id: 'e158',
    emojis: '🍂',
    french: 'la feuille',
    english: 'the leaf',
    options: ['la fleur', 'l\'arbre', 'la feuille', 'l\'herbe'],
    category: 'nature',
    difficulty: 1
  },
  {
    id: 'e159',
    emojis: '🌹',
    french: 'la rose',
    english: 'the rose',
    options: ['la fleur', 'la tulipe', 'la feuille', 'la rose'],
    category: 'nature',
    difficulty: 2
  },
  {
    id: 'e160',
    emojis: '🌻',
    french: 'le tournesol',
    english: 'the sunflower',
    options: ['le tournesol', 'la rose', 'la fleur', 'le soleil'],
    category: 'nature',
    difficulty: 3
  },
  {
    id: 'e161',
    emojis: '🌲',
    french: 'le sapin',
    english: 'the fir tree',
    options: ['l\'arbre', 'le sapin', 'la forêt', 'le palmier'],
    category: 'nature',
    difficulty: 2
  },
  {
    id: 'e162',
    emojis: '🌪️',
    french: 'la tornade',
    english: 'the tornado',
    options: ['l\'orage', 'le vent', 'la tornade', 'la pluie'],
    category: 'nature',
    difficulty: 3
  },
  {
    id: 'e163',
    emojis: '🌬️',
    french: 'le vent',
    english: 'the wind',
    options: ['la pluie', 'la neige', 'le nuage', 'le vent'],
    category: 'nature',
    difficulty: 2
  },
  {
    id: 'e164',
    emojis: '⛈️',
    french: 'l\'orage',
    english: 'the storm',
    options: ['l\'orage', 'la pluie', 'la neige', 'le vent'],
    category: 'nature',
    difficulty: 2
  },
  {
    id: 'e165',
    emojis: '🌅',
    french: 'le lever du soleil',
    english: 'the sunrise',
    options: ['le coucher du soleil', 'le lever du soleil', 'la lune', 'le matin'],
    category: 'nature',
    difficulty: 3
  },
  {
    id: 'e166',
    emojis: '☄️',
    french: 'la comète',
    english: 'the comet',
    options: ['l\'étoile', 'la planète', 'la comète', 'la fusée'],
    category: 'nature',
    difficulty: 3
  },
  {
    id: 'e167',
    emojis: '🏜️',
    french: 'le désert',
    english: 'the desert',
    options: ['la plage', 'la montagne', 'la forêt', 'le désert'],
    category: 'nature',
    difficulty: 2
  },
  {
    id: 'e168',
    emojis: '🌾',
    french: 'le blé',
    english: 'the wheat',
    options: ['le blé', 'le maïs', 'l\'herbe', 'le riz'],
    category: 'nature',
    difficulty: 3
  },
  {
    id: 'e169',
    emojis: '🐚',
    french: 'le coquillage',
    english: 'the shell',
    options: ['la plage', 'le coquillage', 'le crabe', 'la pierre'],
    category: 'nature',
    difficulty: 3
  },
  {
    id: 'e170',
    emojis: '🌱',
    french: 'la plante',
    english: 'the plant',
    options: ['l\'arbre', 'la fleur', 'la plante', 'l\'herbe'],
    category: 'nature',
    difficulty: 2
  },
  {
    id: 'e171',
    emojis: '🍀',
    french: 'le trèfle',
    english: 'the clover',
    options: ['la fleur', 'la feuille', 'l\'herbe', 'le trèfle'],
    category: 'nature',
    difficulty: 3
  },
  {
    id: 'e172',
    emojis: '🚁',
    french: 'l\'hélicoptère',
    english: 'the helicopter',
    options: ['l\'hélicoptère', 'l\'avion', 'le bateau', 'la fusée'],
    category: 'activities',
    difficulty: 3
  },
  {
    id: 'e173',
    emojis: '⛵',
    french: 'le bateau',
    english: 'the boat',
    options: ['l\'avion', 'le bateau', 'le train', 'le bus'],
    category: 'activities',
    difficulty: 1
  },
  {
    id: 'e174',
    emojis: '🚑',
    french: 'l\'ambulance',
    english: 'the ambulance',
    options: ['la voiture', 'le bus', 'l\'ambulance', 'le camion'],
    category: 'activities',
    difficulty: 2
  },
  {
    id: 'e175',
    emojis: '🚒',
    french: 'le camion de pompiers',
    english: 'the fire engine',
    options: ['l\'ambulance', 'le bus', 'la voiture', 'le camion de pompiers'],
    category: 'activities',
    difficulty: 3
  },
  {
    id: 'e176',
    emojis: '🚓',
    french: 'la voiture de police',
    english: 'the police car',
    options: ['la voiture de police', 'l\'ambulance', 'le camion', 'le bus'],
    category: 'activities',
    difficulty: 3
  },
  {
    id: 'e177',
    emojis: '🚕',
    french: 'le taxi',
    english: 'the taxi',
    options: ['le bus', 'le taxi', 'la voiture', 'le train'],
    category: 'activities',
    difficulty: 1
  },
  {
    id: 'e178',
    emojis: '🚜',
    french: 'le tracteur',
    english: 'the tractor',
    options: ['le camion', 'la voiture', 'le tracteur', 'le bus'],
    category: 'activities',
    difficulty: 2
  },
  {
    id: 'e179',
    emojis: '🏍️',
    french: 'la moto',
    english: 'the motorbike',
    options: ['le vélo', 'la voiture', 'le bus', 'la moto'],
    category: 'activities',
    difficulty: 1
  },
  {
    id: 'e180',
    emojis: '🛴',
    french: 'la trottinette',
    english: 'the scooter',
    options: ['la trottinette', 'le vélo', 'la moto', 'le skateboard'],
    category: 'activities',
    difficulty: 3
  },
  {
    id: 'e181',
    emojis: '🏐',
    french: 'le volley',
    english: 'volleyball',
    options: ['le basket', 'le volley', 'le football', 'le tennis'],
    category: 'activities',
    difficulty: 2
  },
  {
    id: 'e182',
    emojis: '🏓',
    french: 'le ping-pong',
    english: 'table tennis',
    options: ['le tennis', 'le basket', 'le ping-pong', 'le badminton'],
    category: 'activities',
    difficulty: 3
  },
  {
    id: 'e183',
    emojis: '🥊',
    french: 'la boxe',
    english: 'boxing',
    options: ['la lutte', 'le judo', 'le tennis', 'la boxe'],
    category: 'activities',
    difficulty: 3
  },
  {
    id: 'e184',
    emojis: '⛳',
    french: 'le golf',
    english: 'golf',
    options: ['le golf', 'le tennis', 'le football', 'le ski'],
    category: 'activities',
    difficulty: 2
  },
  {
    id: 'e185',
    emojis: '🏇',
    french: 'l\'équitation',
    english: 'horse riding',
    options: ['la natation', 'l\'équitation', 'la danse', 'le ski'],
    category: 'activities',
    difficulty: 3
  },
  {
    id: 'e186',
    emojis: '🚴',
    french: 'le cyclisme',
    english: 'cycling',
    options: ['la course', 'la natation', 'le cyclisme', 'le ski'],
    category: 'activities',
    difficulty: 3
  },
  {
    id: 'e187',
    emojis: '🏃',
    french: 'la course',
    english: 'running',
    options: ['la natation', 'la marche', 'le cyclisme', 'la course'],
    category: 'activities',
    difficulty: 2
  },
  {
    id: 'e188',
    emojis: '🧗',
    french: 'l\'escalade',
    english: 'climbing',
    options: ['l\'escalade', 'la randonnée', 'la course', 'le ski'],
    category: 'activities',
    difficulty: 3
  },
  {
    id: 'e189',
    emojis: '⛺',
    french: 'le camping',
    english: 'camping',
    options: ['l\'hôtel', 'le camping', 'la plage', 'la montagne'],
    category: 'activities',
    difficulty: 2
  },
  {
    id: 'e190',
    emojis: '🏨',
    french: 'l\'hôtel',
    english: 'the hotel',
    options: ['la maison', 'l\'école', 'l\'hôtel', 'le camping'],
    category: 'activities',
    difficulty: 2
  },
  {
    id: 'e191',
    emojis: '🏫',
    french: 'l\'école',
    english: 'the school',
    options: ['la maison', 'l\'hôpital', 'le cinéma', 'l\'école'],
    category: 'activities',
    difficulty: 1
  },
  {
    id: 'e192',
    emojis: '🏥',
    french: 'l\'hôpital',
    english: 'the hospital',
    options: ['l\'hôpital', 'l\'école', 'la banque', 'le musée'],
    category: 'activities',
    difficulty: 2
  },
  {
    id: 'e193',
    emojis: '🏦',
    french: 'la banque',
    english: 'the bank',
    options: ['l\'hôpital', 'la banque', 'le musée', 'la poste'],
    category: 'activities',
    difficulty: 2
  },
  {
    id: 'e194',
    emojis: '🏰',
    french: 'le château',
    english: 'the castle',
    options: ['la maison', 'l\'église', 'le château', 'le musée'],
    category: 'activities',
    difficulty: 2
  },
  {
    id: 'e195',
    emojis: '⛪',
    french: 'l\'église',
    english: 'the church',
    options: ['le château', 'l\'école', 'le musée', 'l\'église'],
    category: 'activities',
    difficulty: 2
  },
  {
    id: 'e196',
    emojis: '🗼',
    french: 'la tour Eiffel',
    english: 'the Eiffel Tower',
    options: ['la tour Eiffel', 'l\'Arc de Triomphe', 'le château', 'la cathédrale'],
    category: 'activities',
    difficulty: 2
  },
  {
    id: 'e197',
    emojis: '🎢',
    french: 'les montagnes russes',
    english: 'the roller coaster',
    options: ['le manège', 'les montagnes russes', 'le train', 'le cirque'],
    category: 'activities',
    difficulty: 3
  },
  {
    id: 'e198',
    emojis: '🎡',
    french: 'la grande roue',
    english: 'the big wheel',
    options: ['le manège', 'les montagnes russes', 'la grande roue', 'le cirque'],
    category: 'activities',
    difficulty: 3
  },
  {
    id: 'e199',
    emojis: '🎪',
    french: 'le cirque',
    english: 'the circus',
    options: ['le théâtre', 'le cinéma', 'le concert', 'le cirque'],
    category: 'activities',
    difficulty: 3
  },
  {
    id: 'e200',
    emojis: '🎃',
    french: 'la citrouille',
    english: 'the pumpkin',
    options: ['la citrouille', 'la tomate', 'l\'orange', 'le melon'],
    category: 'activities',
    difficulty: 3
  },
  {
    id: 'e201',
    emojis: '🎆',
    french: 'le feu d\'artifice',
    english: 'the fireworks',
    options: ['la fête', 'le feu d\'artifice', 'le feu', 'la lumière'],
    category: 'activities',
    difficulty: 3
  },
  {
    id: 'e202',
    emojis: '🌙😴🛏️',
    french: 'Je dors dans mon lit la nuit',
    english: 'I sleep in my bed at night',
    options: ['Je mange à la maison', 'Je joue au parc', 'Je dors dans mon lit la nuit', 'Je lis un livre'],
    category: 'sentences',
    difficulty: 2
  },
  {
    id: 'e203',
    emojis: '☀️🌳🚶',
    french: 'Je me promène dans le parc',
    english: 'I am walking in the park',
    options: ['Je dors dans mon lit', 'Je mange une glace', 'Il pleut beaucoup', 'Je me promène dans le parc'],
    category: 'sentences',
    difficulty: 3
  },
  {
    id: 'e204',
    emojis: '🍞🧈😋',
    french: 'Je mange du pain avec du beurre',
    english: 'I eat bread with butter',
    options: ['Je mange du pain avec du beurre', 'Je bois du lait', 'Je mange une pizza', 'J\'aime le fromage'],
    category: 'sentences',
    difficulty: 2
  },
  {
    id: 'e205',
    emojis: '🚌🏫',
    french: 'Je prends le bus pour aller à l\'école',
    english: 'I take the bus to go to school',
    options: ['Je vais à l\'école à pied', 'Je prends le bus pour aller à l\'école', 'Je prends le train pour Paris', 'Je rentre à la maison'],
    category: 'sentences',
    difficulty: 3
  },
  {
    id: 'e206',
    emojis: '🎸🎵🎤',
    french: 'Elle chante et joue de la guitare',
    english: 'She sings and plays the guitar',
    options: ['Il joue au football', 'Elle écoute la radio', 'Elle chante et joue de la guitare', 'Nous dansons ensemble'],
    category: 'sentences',
    difficulty: 3
  },
  {
    id: 'e207',
    emojis: '🏊☀️🏖️',
    french: 'Nous nageons à la plage',
    english: 'We swim at the beach',
    options: ['Nous mangeons au restaurant', 'Nous skions en montagne', 'Nous jouons au tennis', 'Nous nageons à la plage'],
    category: 'sentences',
    difficulty: 2
  },
  {
    id: 'e208',
    emojis: '📺🛋️🍿',
    french: 'Nous regardons la télévision sur le canapé',
    english: 'We watch television on the sofa',
    options: ['Nous regardons la télévision sur le canapé', 'Nous mangeons au restaurant', 'Nous jouons au football', 'Nous allons au cinéma'],
    category: 'sentences',
    difficulty: 3
  },
  {
    id: 'e209',
    emojis: '❄️⛷️🏔️',
    french: 'Il neige et nous faisons du ski',
    english: 'It is snowing and we go skiing',
    options: ['Il pleut et nous restons à la maison', 'Il neige et nous faisons du ski', 'Il fait chaud et nous nageons', 'Nous jouons dans le parc'],
    category: 'sentences',
    difficulty: 3
  },
  {
    id: 'e210',
    emojis: '🐶🦴😋',
    french: 'Le chien mange un os',
    english: 'The dog is eating a bone',
    options: ['Le chat boit du lait', 'La souris mange du fromage', 'Le chien mange un os', 'Le lapin mange une carotte'],
    category: 'sentences',
    difficulty: 2
  },
  {
    id: 'e211',
    emojis: '🐱🥛',
    french: 'Le chat boit du lait',
    english: 'The cat is drinking milk',
    options: ['Le chien mange un os', 'Le poisson nage', 'Le lapin dort', 'Le chat boit du lait'],
    category: 'sentences',
    difficulty: 2
  },
  {
    id: 'e212',
    emojis: '👧🎨🖌️',
    french: 'La fille fait de la peinture',
    english: 'The girl is painting',
    options: ['La fille fait de la peinture', 'La fille lit un livre', 'Le garçon joue au football', 'La fille mange une pomme'],
    category: 'sentences',
    difficulty: 2
  },
  {
    id: 'e213',
    emojis: '👦🚲🌳',
    french: 'Le garçon fait du vélo dans le parc',
    english: 'The boy rides his bike in the park',
    options: ['Le garçon joue au football', 'Le garçon fait du vélo dans le parc', 'La fille nage à la piscine', 'Le garçon lit à la maison'],
    category: 'sentences',
    difficulty: 3
  },
  {
    id: 'e214',
    emojis: '🍕🥤👪',
    french: 'La famille mange une pizza',
    english: 'The family is eating a pizza',
    options: ['La famille va à la plage', 'Le chat dort sur le lit', 'La famille mange une pizza', 'Nous faisons les courses'],
    category: 'sentences',
    difficulty: 2
  },
  {
    id: 'e215',
    emojis: '📚✏️🏫',
    french: 'Les élèves étudient à l\'école',
    english: 'The pupils study at school',
    options: ['Les élèves jouent au parc', 'Les enfants dorment', 'La prof mange une pomme', 'Les élèves étudient à l\'école'],
    category: 'sentences',
    difficulty: 3
  },
  {
    id: 'e216',
    emojis: '🛒🥕🍎',
    french: 'Je fais les courses',
    english: 'I am doing the shopping',
    options: ['Je fais les courses', 'Je fais la cuisine', 'Je fais du sport', 'Je fais mes devoirs'],
    category: 'sentences',
    difficulty: 2
  },
  {
    id: 'e217',
    emojis: '✈️🧳🌴',
    french: 'Nous partons en vacances',
    english: 'We are going on holiday',
    options: ['Nous rentrons à la maison', 'Nous partons en vacances', 'Nous allons à l\'école', 'Nous faisons les courses'],
    category: 'sentences',
    difficulty: 2
  }
];
