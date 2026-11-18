import type { RolePlayExample } from './types';

/**
 * Model replies for the six practice role-play cards in src/data/roleplayCards.ts
 * (the cards the Role-play drill uses, written for the app — not exam papers).
 * The examiner's French lines and the English task instructions are read from
 * the cards, never retyped here; `publicContent.test.ts` fails if a card gains
 * or loses a task without a matching reply.
 *
 * Every reply is deliberately short: the role play is marked on whether each
 * task is communicated fully and correctly, so a complete one-sentence reply is
 * the target (exam guide, "Role play").
 */
export const ROLE_PLAY_EXAMPLES: readonly RolePlayExample[] = [
  {
    slug: 'tourist-office',
    cardId: 'rp_tourism_01',
    title: 'At the tourist office',
    register: 'vous',
    intro:
      'You are visiting a French town and ask the tourist office for help. The examiner plays the worker and addresses you as « vous ». Each task asks for one clear piece of information: say it, and stop.',
    tasks: [
      {
        taskId: 1,
        answer: "Bonjour, madame. Je voudrais une liste des activités à faire dans la ville, s'il vous plaît.",
        note: 'Greeting, then « je voudrais », then the request: polite and complete in one sentence.',
      },
      {
        taskId: 2,
        answer: "Je voudrais visiter la région en août, pendant une semaine.",
        note: 'Both parts of the task (when, how long) are in one short sentence. Nothing is missing.',
      },
      {
        taskId: 3,
        answer: "Je préfère les activités culturelles, parce que je m'intéresse à l'histoire et j'adore les musées.",
        note: 'The task asks for a type and a reason: « parce que » makes sure the reason is there.',
      },
      {
        taskId: 4,
        answer: "Oui, quels sont les moyens de transport dans la région, s'il vous plaît ?",
        note: 'Asking a question: the examiner needs to hear a real question form, with the right word order.',
      },
      {
        taskId: 5,
        answer: "Oui, pourriez-vous me donner un plan de la ville, s'il vous plaît ? Merci beaucoup, madame.",
        note: 'Two things to do, two things done: the request and the thanks.',
      },
    ],
    phrases: [
      { fr: 'Je voudrais…', en: 'I would like…' },
      { fr: "s'il vous plaît", en: 'please' },
      { fr: 'Pourriez-vous me donner… ?', en: 'Could you give me…?' },
      { fr: "Quels sont les moyens de transport… ?", en: 'What transport is there…?' },
      { fr: 'Merci beaucoup', en: 'Thank you very much' },
    ],
    related: ['hotel', 'train-station'],
  },
  {
    slug: 'hotel',
    cardId: 'rp_hotel_01',
    title: 'Checking in at a hotel',
    register: 'vous',
    intro:
      'You are checking into a hotel for a holiday. The examiner plays the receptionist, so the language is polite and « vous ». Most tasks combine two small pieces of information: give both.',
    tasks: [
      {
        taskId: 1,
        answer: "Oui, j'ai une réservation au nom de Taylor.",
        note: 'You were asked to say you have a reservation and give your name: both are in the reply.',
      },
      {
        taskId: 2,
        answer: "Pour trois nuits, dans une chambre double avec salle de bains, s'il vous plaît.",
        note: 'Number of nights and room type, with « pour » and « dans »: no verb needed.',
      },
      {
        taskId: 3,
        answer: "Je préfère la chambre avec vue sur la mer, parce que c'est plus joli et j'aime écouter les vagues.",
        note: 'A choice plus a reason: one clear reason is enough, and two shows range.',
      },
      {
        taskId: 4,
        answer: "Oui, est-ce qu'il y a le wifi dans l'hôtel et un parking pour les voitures ?",
        note: "« Est-ce que » is the safest way to form a question under pressure.",
      },
      {
        taskId: 5,
        answer: "Merci beaucoup. Où est l'ascenseur, s'il vous plaît ?",
        note: 'Thanks first, then the question: the order does not matter, but both must be there.',
      },
    ],
    phrases: [
      { fr: "J'ai une réservation au nom de…", en: 'I have a reservation in the name of…' },
      { fr: 'une chambre double / simple', en: 'a double / single room' },
      { fr: "avec vue sur la mer", en: 'with a sea view' },
      { fr: "Est-ce qu'il y a… ?", en: 'Is there…?' },
      { fr: 'Où est… ?', en: 'Where is…?' },
    ],
    related: ['tourist-office', 'campsite'],
  },
  {
    slug: 'restaurant',
    cardId: 'rp_restaurant_01',
    title: 'Eating at a restaurant',
    register: 'vous',
    intro:
      'You are eating out with a friend in France, and the examiner plays the waiter or waitress. Ordering needs a handful of polite phrases: « je voudrais », « je prendrai » and « s\'il vous plaît » cover almost everything.',
    tasks: [
      {
        taskId: 1,
        answer: "Oui, j'ai réservé une table pour deux personnes au nom de Taylor.",
        note: 'Reservation, number of people and name: the three things the task asks for.',
      },
      {
        taskId: 2,
        answer: "Je voudrais la soupe à l'oignon comme entrée, et comme boisson, une eau minérale, s'il vous plaît.",
        note: 'A starter and a drink: both items named, politely.',
      },
      {
        taskId: 3,
        answer: "Je prendrai le steak avec des frites. Et quel est le plat du jour, s'il vous plaît ?",
        note: '« Je prendrai » (I will take) is the natural way to order, and the question is asked in full.',
      },
      {
        taskId: 4,
        answer: "Oui, je suis allergique aux noix, alors pas de noix dans mon plat, s'il vous plaît.",
        note: 'You may say you have none: either is fine, but a real sentence with « allergique à » shows range.',
      },
      {
        taskId: 5,
        answer: "Je voudrais une glace au chocolat, et l'addition, s'il vous plaît.",
        note: 'A dessert and the bill: two things asked for, one sentence.',
      },
    ],
    phrases: [
      { fr: "J'ai réservé une table pour…", en: 'I booked a table for…' },
      { fr: 'Je voudrais… / Je prendrai…', en: 'I would like… / I will have…' },
      { fr: 'comme entrée / comme plat principal', en: 'as a starter / as a main course' },
      { fr: 'Je suis allergique à…', en: 'I am allergic to…' },
      { fr: "L'addition, s'il vous plaît", en: 'The bill, please' },
    ],
    related: ['hotel', 'train-station'],
  },
  {
    slug: 'train-station',
    cardId: 'rp_train_01',
    title: 'Buying train tickets',
    register: 'vous',
    intro:
      'You are at a French railway station buying train tickets from the ticket agent. Times, tickets and questions about the journey are the heart of this card, so the numbers and question forms need to be clean.',
    tasks: [
      {
        taskId: 1,
        answer: "Bonjour, je voudrais un billet pour Lyon, pour demain matin, s'il vous plaît.",
        note: 'Destination and time in one sentence: « pour » twice is perfectly correct.',
      },
      {
        taskId: 2,
        answer: "Un aller-retour, s'il vous plaît. Est-ce qu'il y a une première classe et une deuxième classe ?",
        note: 'A short answer for the first half, then a full question for the second half.',
      },
      {
        taskId: 3,
        answer: "Je voudrais partir à dix heures. Le voyage dure combien de temps ?",
        note: 'Choose a time and ask: a plain question with « combien de temps » is fully acceptable.',
      },
      {
        taskId: 4,
        answer: "Oui, je voudrais une place près de la fenêtre, dans un wagon non-fumeurs, s'il vous plaît.",
        note: 'Both details of the request (window, non-smoking) are present.',
      },
      {
        taskId: 5,
        answer: "Je vais payer par carte. Est-ce que le train est à l'heure, s'il vous plaît ?",
        note: '« Je vais payer » (near future) and a question: payment method and punctuality are both covered.',
      },
    ],
    phrases: [
      { fr: 'un aller simple / un aller-retour', en: 'a single / return ticket' },
      { fr: 'une place près de la fenêtre', en: 'a window seat' },
      { fr: 'Le voyage dure combien de temps ?', en: 'How long is the journey?' },
      { fr: 'payer par carte', en: 'to pay by card' },
      { fr: "Le train est à l'heure ?", en: 'Is the train on time?' },
    ],
    related: ['tourist-office', 'lost-property'],
  },
  {
    slug: 'campsite',
    cardId: 'rp_camping_01',
    title: 'Arriving at a campsite',
    register: 'vous',
    intro:
      'You arrive at a campsite without a reservation and ask the manager for a pitch. This card is full of practical questions, so it is a good place to practise « est-ce que » and « où est… ».',
    tasks: [
      {
        taskId: 1,
        answer: "Non, je n'ai pas de réservation. Est-ce qu'il vous reste de la place, s'il vous plaît ?",
        note: '« Je n\'ai pas de réservation »: after a negative, « de » replaces « une ». A small point examiners notice.',
      },
      {
        taskId: 2,
        answer: "Nous avons une tente. Nous sommes quatre personnes : mes parents, ma sœur et moi.",
        note: 'What you have and how many you are: two facts, both given.',
      },
      {
        taskId: 3,
        answer: "Nous voulons rester cinq nuits. Quels services y a-t-il au camping ?",
        note: 'The task asks for the length of the stay and a question about facilities: both are present.',
      },
      {
        taskId: 4,
        answer: "Super ! À quelle heure l'épicerie ouvre-t-elle le matin, et à quelle heure ferme-t-elle le soir ?",
        note: 'Opening and closing times are two separate pieces of information: ask for both.',
      },
      {
        taskId: 5,
        answer: "Où sont les douches, s'il vous plaît ? Et je voudrais payer par carte.",
        note: 'One question and one statement: both parts of the task are communicated.',
      },
    ],
    phrases: [
      { fr: "Il vous reste de la place ?", en: 'Do you have space left?' },
      { fr: 'Nous sommes quatre personnes', en: 'There are four of us' },
      { fr: 'rester cinq nuits', en: 'to stay five nights' },
      { fr: "À quelle heure ouvre… ?", en: 'What time does… open?' },
      { fr: 'Où sont les douches ?', en: 'Where are the showers?' },
    ],
    related: ['hotel', 'lost-property'],
  },
  {
    slug: 'lost-property',
    cardId: 'rp_lost_property_01',
    title: 'At the lost property office',
    register: 'vous',
    intro:
      'You lost your bag at a French station and go to the lost property office. This card needs the past tense (what happened) and description (what the bag looks like), so keep your verbs tidy and your adjectives agreeing.',
    tasks: [
      {
        taskId: 1,
        answer: "Bonjour, monsieur. J'ai perdu mon sac, je pense dans le train de Paris ou à la gare.",
        note: 'The perfect tense for what happened, with « je pense » to say where you think it was.',
      },
      {
        taskId: 2,
        answer: "C'est un grand sac à dos noir, avec une poche rouge devant.",
        note: 'Size, type and colour in one sentence. « Un grand sac noir »: the adjectives agree with « sac ».',
      },
      {
        taskId: 3,
        answer: "Il y avait mon portable, mon portefeuille, un livre et une bouteille d'eau.",
        note: '« Il y avait » (the imperfect) lists what was inside: a short list is enough.',
      },
      {
        taskId: 4,
        answer: "Je l'avais encore ce matin vers dix heures, dans le train, avant d'arriver à la gare.",
        note: "« Je l'avais encore » (the imperfect: I still had it) says when it was last with you, and « dans le train » says where.",
      },
      {
        taskId: 5,
        answer: "Voici mon numéro de téléphone et mon adresse e-mail. Combien de temps faut-il attendre, s'il vous plaît ?",
        note: 'Contact details, then the question: both halves of the task are covered.',
      },
    ],
    phrases: [
      { fr: "J'ai perdu mon sac", en: 'I lost my bag' },
      { fr: 'un sac à dos noir', en: 'a black rucksack' },
      { fr: 'Il y avait…', en: 'There was / were…' },
      { fr: 'Je pense que…', en: 'I think that…' },
      { fr: 'Combien de temps faut-il attendre ?', en: 'How long do I need to wait?' },
    ],
    related: ['train-station', 'tourist-office'],
  },
];

export function getRolePlayExample(slug: string): RolePlayExample | undefined {
  return ROLE_PLAY_EXAMPLES.find((r) => r.slug === slug);
}
