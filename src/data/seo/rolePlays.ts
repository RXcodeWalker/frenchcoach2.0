import type { RolePlayExample } from './types';

/**
 * Model replies for six of the Role-play drill's exam-style cards
 * (src/data/rolePlayDrill/: original practice cards written for the app in
 * the current role-play format — five simple examiner questions, some in two
 * parts — not exam papers). The examiner's French lines and the English task
 * descriptions are read from the cards, never retyped here;
 * `publicContent.test.ts` fails if a card gains or loses a task without a
 * matching reply. The slugs are the pages' original URLs (2026-11-23: rebound
 * from the six older task cards to exam-style ones, same addresses).
 *
 * Every reply is deliberately short: the role play is marked on whether each
 * question is answered fully and correctly, so a complete one-sentence reply
 * is the target (exam guide, "Role play").
 */
export const ROLE_PLAY_EXAMPLES: readonly RolePlayExample[] = [
  {
    slug: 'tourist-office',
    cardId: 'rpc_24_01',
    title: 'At the tourist office',
    situation: 'You are on holiday in Nice, in the south of France, and you call in at the tourist office. The examiner plays the person who works there.',
    register: 'vous',
    intro:
      'The examiner asks about your stay: how long, where you are staying, what you like doing, what you have seen and what you will do next. Simple questions, so give a clear answer to each and stop.',
    tasks: [
      { taskId: 1, answer: 'Je reste à Nice pendant une semaine.', note: 'The question is « combien de temps »: a length of time answers it completely.' },
      { taskId: 2, answer: 'Je loge dans un petit hôtel près de la plage.', note: '« Je loge dans… » reuses the verb from the question, which keeps the reply correct and easy.' },
      {
        taskId: 3,
        answer: "J'aime aller à la plage parce que c'est reposant.",
        note: 'Two parts: what you like doing and why. « Parce que » makes sure the reason is heard.',
      },
      {
        taskId: 4,
        answer: "J'ai visité la vieille ville et c'était très beau.",
        note: 'A past question needs a past answer: « j\'ai visité » for what you did, « c\'était » for what it was like.',
      },
      { taskId: 5, answer: 'Demain, je vais aller au marché aux fleurs.', note: '« Je vais » + infinitive is the simplest way to talk about tomorrow.' },
    ],
    phrases: [
      { fr: 'Je reste… pendant une semaine', en: 'I am staying… for a week' },
      { fr: 'Je loge dans un hôtel', en: 'I am staying in a hotel' },
      { fr: "J'aime… parce que…", en: 'I like… because…' },
      { fr: "J'ai visité… et c'était…", en: 'I visited… and it was…' },
      { fr: 'Demain, je vais…', en: 'Tomorrow, I am going to…' },
    ],
    related: ['hotel', 'train-station'],
  },
  {
    slug: 'hotel',
    cardId: 'rpe_hotel_01',
    title: 'Checking in at a hotel',
    situation: 'You arrive at a hotel in France with your family. The examiner plays the receptionist.',
    register: 'vous',
    intro:
      'The receptionist asks how long you are staying, how many of you there are, how the journey went, what you will visit and when you want breakfast. Each answer needs one clear piece of information, or two for a two-part question.',
    tasks: [
      { taskId: 1, answer: 'Nous restons ici trois nuits.', note: 'A number and « nuits »: that is the whole answer, and nothing is missing.' },
      { taskId: 2, answer: 'Nous sommes quatre : mes parents, ma sœur et moi.', note: '« Nous sommes » + a number answers « Vous êtes combien ? »; naming who is a bonus, not a need.' },
      {
        taskId: 3,
        answer: "Nous sommes venus en voiture et c'était long.",
        note: 'Two parts, both in the past: how you came (« venus », with être) and what it was like (« c\'était »).',
      },
      {
        taskId: 4,
        answer: "Nous allons visiter le château parce que j'aime l'histoire.",
        note: 'What and why: « nous allons visiter » for the plan, « parce que » for the reason.',
      },
      { taskId: 5, answer: 'Je voudrais prendre le petit-déjeuner à huit heures.', note: 'A clock time answers « à quelle heure »; « je voudrais » keeps it polite.' },
    ],
    phrases: [
      { fr: 'Nous restons… nuits', en: 'We are staying… nights' },
      { fr: 'Nous sommes quatre', en: 'There are four of us' },
      { fr: 'Nous sommes venus en voiture', en: 'We came by car' },
      { fr: 'Nous allons visiter…', en: 'We are going to visit…' },
      { fr: 'Je voudrais… à huit heures', en: 'I would like… at eight o’clock' },
    ],
    related: ['tourist-office', 'campsite'],
  },
  {
    slug: 'restaurant',
    cardId: 'rpe_restaurant_01',
    title: 'Eating at a restaurant',
    situation: 'You are in a restaurant in France. The examiner plays the waiter or waitress.',
    register: 'vous',
    intro:
      'The waiter asks how many you are, what you want to drink and eat, what you ate last night and what you will do after the meal. « Je voudrais » and « je prends » cover the ordering; the other questions need a past and a future.',
    tasks: [
      { taskId: 1, answer: "Nous sommes deux, s'il vous plaît.", note: 'The number is the answer; « s\'il vous plaît » keeps the tone right for a waiter.' },
      { taskId: 2, answer: "Je voudrais une carafe d'eau, s'il vous plaît.", note: '« Je voudrais » + a drink: polite and complete.' },
      {
        taskId: 3,
        answer: "Je prends le poulet parce que j'adore ça.",
        note: 'The dish and a reason. « Je prends » is what French speakers say when they order.',
      },
      {
        taskId: 4,
        answer: "Hier soir, j'ai mangé une pizza et c'était délicieux.",
        note: 'A past question: « j\'ai mangé » for what you ate and « c\'était » for what it was like.',
      },
      { taskId: 5, answer: 'Après le repas, je vais me promener en ville.', note: 'The future with « je vais » + infinitive; « me promener » is a reflexive verb, so « me » stays.' },
    ],
    phrases: [
      { fr: 'Nous sommes deux', en: 'There are two of us' },
      { fr: 'Je voudrais…, s’il vous plaît', en: 'I would like…, please' },
      { fr: 'Je prends…', en: 'I will have…' },
      { fr: "Hier soir, j'ai mangé…", en: 'Last night I ate…' },
      { fr: 'Après le repas, je vais…', en: 'After the meal I am going to…' },
    ],
    related: ['hotel', 'train-station'],
  },
  {
    slug: 'train-station',
    cardId: 'rpc_23_06',
    title: 'Buying train tickets',
    situation: 'You are at a station in Paris and want to buy train tickets to Lyon. The examiner plays the ticket agent.',
    register: 'vous',
    intro:
      'The agent asks when you are leaving, how many tickets you need, when you prefer to travel and why, why you are going and for how long, and what you did in Paris. Most answers are a few words: say them clearly.',
    tasks: [
      { taskId: 1, answer: 'Je veux partir vendredi matin.', note: 'A day answers « quel jour »; adding the time of day is fine but not needed.' },
      { taskId: 2, answer: "Il me faut deux billets, s'il vous plaît.", note: '« Il me faut » echoes the question, which makes a correct reply easy.' },
      {
        taskId: 3,
        answer: "Je préfère voyager le matin parce que c'est moins cher.",
        note: 'Choosing one option is only half: the second part asks why, so give a reason.',
      },
      {
        taskId: 4,
        answer: 'Je vais à Lyon pour voir ma tante, et je reste une semaine.',
        note: 'Two parts: « pour » + infinitive gives the reason, then the length of the stay.',
      },
      { taskId: 5, answer: "À Paris, j'ai visité la tour Eiffel et le Louvre.", note: '« Qu\'est-ce que vous avez fait ? » is past, so the reply uses « j\'ai visité ».' },
    ],
    phrases: [
      { fr: 'Je veux partir…', en: 'I want to leave…' },
      { fr: 'Il me faut deux billets', en: 'I need two tickets' },
      { fr: 'Je préfère… parce que…', en: 'I prefer… because…' },
      { fr: 'Je vais à… pour voir…', en: 'I am going to… to see…' },
      { fr: "J'ai visité…", en: 'I visited…' },
    ],
    related: ['tourist-office', 'lost-property'],
  },
  {
    slug: 'campsite',
    cardId: 'rpe_campsite_01',
    title: 'Arriving at a campsite',
    situation: 'You arrive at a campsite in France. The examiner plays the campsite manager.',
    register: 'vous',
    intro:
      'The manager asks how long you are staying, how many you are, what you want to do there and why, where you went before and what it was like, and what you will eat tonight. Answer each question, past and future included.',
    tasks: [
      { taskId: 1, answer: 'Je voudrais rester cinq nuits.', note: 'A length of time is all « combien de temps » needs.' },
      { taskId: 2, answer: 'Nous sommes trois dans notre groupe.', note: '« Nous sommes » + a number: the simplest complete reply.' },
      {
        taskId: 3,
        answer: "Je veux nager à la piscine parce qu'il fait très chaud.",
        note: 'What you want to do, then why. « Parce qu\'il fait chaud » is an easy, natural reason.',
      },
      {
        taskId: 4,
        answer: "Nous sommes allés à Paris et c'était super.",
        note: '« Aller » takes être in the past: « nous sommes allés ». Then « c\'était » for the second part.',
      },
      { taskId: 5, answer: 'Ce soir, nous allons manger des grillades au barbecue.', note: '« Nous allons » + infinitive for tonight\'s plan.' },
    ],
    phrases: [
      { fr: 'Je voudrais rester… nuits', en: 'I would like to stay… nights' },
      { fr: 'Nous sommes trois', en: 'There are three of us' },
      { fr: "Je veux… parce qu'il fait chaud", en: 'I want to… because it is hot' },
      { fr: 'Nous sommes allés à…', en: 'We went to…' },
      { fr: 'Ce soir, nous allons…', en: 'This evening we are going to…' },
    ],
    related: ['hotel', 'lost-property'],
  },
  {
    slug: 'lost-property',
    cardId: 'rpc_24_02',
    title: 'Reporting a lost phone',
    situation: 'You are on holiday at a campsite in France and you have lost your phone. The examiner plays the campsite receptionist.',
    register: 'vous',
    intro:
      'The receptionist asks what you lost, what colour it is, where and when you lost it, how long you are staying and how to reach you. Several answers are in the past: « j\'ai perdu » does most of the work.',
    tasks: [
      { taskId: 1, answer: "J'ai perdu mon téléphone portable.", note: '« Perdu » repeats the examiner\'s verb, in the same past tense.' },
      { taskId: 2, answer: 'Il est noir, avec une coque bleue.', note: 'A colour answers it; « il est » agrees with « le portable ».' },
      {
        taskId: 3,
        answer: "Je l'ai perdu à la piscine hier soir.",
        note: 'Two parts in one sentence: where (« à la piscine ») and when (« hier soir »).',
      },
      { taskId: 4, answer: "Je reste au camping jusqu'à samedi.", note: '« Jusqu\'à » + a day is the natural answer to « jusqu\'à quand ».' },
      {
        taskId: 5,
        answer: "Vous pouvez m'envoyer un e-mail, et je suis à l'emplacement douze.",
        note: 'Your phone is lost, so offer another way to reach you, then the pitch number.',
      },
    ],
    phrases: [
      { fr: "J'ai perdu mon…", en: 'I have lost my…' },
      { fr: 'Il est noir', en: 'It is black' },
      { fr: "Je l'ai perdu à…", en: 'I lost it at…' },
      { fr: "Je reste jusqu'à…", en: 'I am staying until…' },
      { fr: "Vous pouvez m'envoyer un e-mail", en: 'You can send me an email' },
    ],
    related: ['train-station', 'tourist-office'],
  },
];

export function getRolePlayExample(slug: string): RolePlayExample | undefined {
  return ROLE_PLAY_EXAMPLES.find((r) => r.slug === slug);
}
