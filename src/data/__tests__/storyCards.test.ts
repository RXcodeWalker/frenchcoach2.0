import { describe, expect, it } from 'vitest';
import { STORY_CARDS, type StoryCard, type StoryTask } from '../storyCards';
import { ROLEPLAY_CARDS } from '../roleplayCards';
import { checkAnswerParts, normalizeAnswer } from '../../features/rolePlayDrill/answerKey';

/** Ids are permanent: drill progress and homework are keyed on them. */
const CARD_IDS = [
  'rpc_24_01', 'rpc_24_02', 'rpc_24_03', 'rpc_24_04', 'rpc_24_05', 'rpc_24_06', 'rpc_24_07', 'rpc_24_08', 'rpc_24_09',
  'rpc_23_01', 'rpc_23_02', 'rpc_23_03', 'rpc_23_04', 'rpc_23_05', 'rpc_23_06',
  'rpe_hotel_01', 'rpe_restaurant_01', 'rpe_campsite_01', 'rpe_exchange_01', 'rpe_school_01', 'rpe_pharmacy_01',
  'rpe_clothes_01', 'rpe_cinema_01', 'rpe_party_01', 'rpe_beach_clean_01', 'rpe_careers_01', 'rpe_neighbour_01',
  'rp_tourism_01', 'rp_hotel_01', 'rp_restaurant_01', 'rp_train_01', 'rp_camping_01', 'rp_lost_property_01',
];

/**
 * One more reasonable, correct answer per task, worded differently from both
 * model answers — so the accept patterns are shown to be loose enough, not
 * only to match the answers they were written from.
 */
const OTHER_GOOD_ANSWERS: Record<string, string> = {
  'rp_tourism_01#1': "Bonsoir monsieur, qu'est-ce qu'il y a à faire en ville ?",
  'rp_tourism_01#2': 'Le week-end prochain, pour trois jours.',
  'rp_tourism_01#3': "Je préfère le sport, car j'aime être dehors.",
  'rp_tourism_01#4': "Est-ce qu'il y a un métro ou un tram ?",
  'rp_tourism_01#5': 'Je peux avoir une carte de la ville ? Merci !',
  'rp_hotel_01#1': "Oui, c'est au nom de Smith.",
  'rp_hotel_01#2': 'Deux nuits, une chambre pour deux personnes.',
  'rp_hotel_01#3': "Celle avec vue sur le jardin, car c'est plus calme.",
  'rp_hotel_01#4': "Vous avez internet ? Et où est-ce que je peux garer ma voiture ?",
  'rp_hotel_01#5': "L'ascenseur est où ? Merci bien.",
  'rp_restaurant_01#1': 'Oui, une table pour deux au nom de Patel.',
  'rp_restaurant_01#2': "La soupe, et un coca s'il vous plaît.",
  'rp_restaurant_01#3': "Un steak frites. C'est quoi, le plat du jour ?",
  'rp_restaurant_01#4': 'Je suis végétarien.',
  'rp_restaurant_01#5': 'Une crêpe au chocolat, et je voudrais payer.',
  'rp_train_01#1': 'Pour Marseille, samedi matin.',
  'rp_train_01#2': "Aller-retour, s'il vous plaît. Il y a une première classe ?",
  'rp_train_01#3': 'Le train de quatorze heures. Le trajet est long ?',
  'rp_train_01#4': 'Je voudrais être à côté de la fenêtre, en non-fumeur.',
  'rp_train_01#5': 'En espèces. Il y a du retard ?',
  'rp_camping_01#1': "Je n'ai pas réservé. Il y a un emplacement libre ?",
  'rp_camping_01#2': 'Un camping-car, et nous sommes deux.',
  'rp_camping_01#3': 'Cinq nuits. Il y a une piscine ?',
  'rp_camping_01#4': 'Le magasin ouvre quand, et il ferme quand ?',
  'rp_camping_01#5': 'Les sanitaires sont où ? Je vais payer avec ma carte.',
  'rp_lost_property_01#1': "J'ai oublié ma valise sur le quai.",
  'rp_lost_property_01#2': "C'est une petite valise rouge.",
  'rp_lost_property_01#3': 'Il y avait mon passeport et un livre.',
  'rp_lost_property_01#4': 'Hier soir, au buffet de la gare.',
  'rp_lost_property_01#5': "Je m'appelle Sam, mon e-mail est sam@mail.com. Ce sera long ?",
  'rpc_24_01#1': "Jusqu'à dimanche.",
  'rpc_24_01#2': 'Chez des amis.',
  'rpc_24_01#3': "Faire du vélo, car j'aime le sport.",
  'rpc_24_01#4': "Le musée Matisse, c'était intéressant.",
  'rpc_24_01#5': 'Je vais faire du shopping.',
  'rpc_24_02#1': 'Mon téléphone.',
  'rpc_24_02#2': 'Il est rose.',
  'rpc_24_02#3': 'Au restaurant, vers midi.',
  'rpc_24_02#4': 'Encore cinq jours.',
  'rpc_24_02#5': "Appelez ma mère. Je suis à l'emplacement trente.",
  'rpc_24_03#1': 'Trois heures.',
  'rpc_24_03#2': 'Nous sommes deux.',
  'rpc_24_03#3': "Des dauphins, car c'est rare.",
  'rpc_24_03#4': "Je suis allé au marché, c'était sympa.",
  'rpc_24_03#5': 'En espèces.',
  'rpc_24_04#1': 'Trois billets.',
  'rpc_24_04#2': 'Pour vendredi.',
  'rpc_24_04#3': 'Assis, parce que je suis fatigué.',
  'rpc_24_04#4': 'En voiture, avec mes parents.',
  'rpc_24_04#5': "L'année dernière.",
  'rpc_24_05#1': 'À Bordeaux.',
  'rpc_24_05#2': 'À neuf heures et demie.',
  'rpc_24_05#3': 'Le train de seize heures, car je dois manger avant.',
  'rpc_24_05#4': 'Boire un café, au buffet.',
  'rpc_24_05#5': 'Je vais à un mariage.',
  'rpc_24_06#1': 'Pour mon frère.',
  'rpc_24_06#2': "C'est pour Noël.",
  'rpc_24_06#3': 'Il adore les jeux vidéo, mais il déteste lire.',
  'rpc_24_06#4': 'Trente euros maximum, en espèces.',
  'rpc_24_06#5': 'Je lui ai offert un tee-shirt.',
  'rpc_24_07#1': 'Vers vingt heures.',
  'rpc_24_07#2': 'À la gare.',
  'rpc_24_07#3': "Le PSG, car j'aime les joueurs.",
  'rpc_24_07#4': 'Je suis allé au cinéma avec des copains.',
  'rpc_24_07#5': "On va boire un verre, parce qu'il fera chaud.",
  'rpc_24_08#1': 'On est cinq.',
  'rpc_24_08#2': 'Je suis écossais.',
  'rpc_24_08#3': 'Non, pas trop, je trouve ça ennuyeux.',
  'rpc_24_08#4': "Le musée de la ville, c'était super.",
  'rpc_24_08#5': 'Un porte-clés pour moi.',
  'rpc_24_09#1': "J'ai quinze ans.",
  'rpc_24_09#2': 'Tous les jours sauf le lundi.',
  'rpc_24_09#3': "Parce que j'aime le contact avec les gens. Dès le premier juillet.",
  'rpc_24_09#4': "J'ai travaillé dans un magasin, c'était intéressant.",
  'rpc_24_09#5': 'Je parle anglais et ourdou.',
  'rpc_23_01#1': 'La semaine prochaine.',
  'rpc_23_01#2': 'Dix jours.',
  'rpc_23_01#3': 'De la crème solaire, car il va faire beau.',
  'rpc_23_01#4': "Je suis allée en Espagne, c'était fantastique.",
  'rpc_23_01#5': 'Des saucisses au barbecue.',
  'rpc_23_02#1': "C'est la première fois.",
  'rpc_23_02#2': 'Une heure.',
  'rpc_23_02#3': 'Un coca et des frites.',
  'rpc_23_02#4': "J'ai fait de la natation, c'était bien.",
  'rpc_23_02#5': "L'escalade, parce que ça a l'air amusant.",
  'rpc_23_03#1': 'Deux vélos.',
  'rpc_23_03#2': 'Pour cet après-midi.',
  'rpc_23_03#3': "Une demi-journée, jusqu'au phare.",
  'rpc_23_03#4': "Non, rarement, parce qu'il y a trop de voitures.",
  'rpc_23_03#5': 'Je suis allé à la plage.',
  'rpc_23_04#1': 'Du basket.',
  'rpc_23_04#2': 'Le week-end.',
  'rpc_23_04#3': 'Le matin, car je suis en forme.',
  'rpc_23_04#4': "Quand j'avais dix ans, au club de ma ville.",
  'rpc_23_04#5': 'Parce que vos entraîneurs sont très bons.',
  'rpc_23_05#1': 'Une part de pizza.',
  'rpc_23_05#2': "De l'eau minérale.",
  'rpc_23_05#3': "Sur place, car j'ai le temps.",
  'rpc_23_05#4': 'À Lille, pour le travail.',
  'rpc_23_05#5': "J'ai pris le métro.",
  'rpc_23_06#1': 'Dimanche.',
  'rpc_23_06#2': 'Un seul billet.',
  'rpc_23_06#3': "L'après-midi, parce que je me lève tard.",
  'rpc_23_06#4': 'Pour un match de foot. Trois jours.',
  'rpc_23_06#5': "J'ai mangé dans un bon restaurant.",
  'rpe_hotel_01#1': 'Deux nuits.',
  'rpe_hotel_01#2': 'On est trois.',
  'rpe_hotel_01#3': "En train. C'était fatigant.",
  'rpe_hotel_01#4': 'Le musée, car il est célèbre.',
  'rpe_hotel_01#5': 'Vers sept heures et demie.',
  'rpe_restaurant_01#1': 'Nous sommes cinq.',
  'rpe_restaurant_01#2': 'Un jus de pomme.',
  'rpe_restaurant_01#3': 'Le poisson, car je ne mange pas de viande.',
  'rpe_restaurant_01#4': "Du riz avec des légumes. C'était bon.",
  'rpe_restaurant_01#5': 'On va aller au cinéma.',
  'rpe_campsite_01#1': 'Une semaine.',
  'rpe_campsite_01#2': 'Nous sommes six.',
  'rpe_campsite_01#3': 'Faire du vélo, parce que la région est belle.',
  'rpe_campsite_01#4': "Nous étions à la montagne. C'était magnifique.",
  'rpe_campsite_01#5': 'Des pâtes.',
  'rpe_exchange_01#1': 'Une journée entière.',
  'rpe_exchange_01#2': 'Le poulet et les frites.',
  'rpe_exchange_01#3': "Dans un petit village. C'est calme.",
  'rpe_exchange_01#4': "Nous sommes allés au cinéma. C'était bien.",
  'rpe_exchange_01#5': 'Je voudrais voir la tour Eiffel.',
  'rpe_school_01#1': 'Je suis en Year 10.',
  'rpe_school_01#2': "J'adore l'histoire.",
  'rpe_school_01#3': "Je suis contre, car c'est moche.",
  'rpe_school_01#4': "J'ai joué au basket en EPS. C'était amusant.",
  'rpe_school_01#5': "Travailler, parce que je veux gagner de l'argent.",
  'rpe_pharmacy_01#1': "J'ai mal au ventre.",
  'rpe_pharmacy_01#2': 'Depuis deux jours.',
  'rpe_pharmacy_01#3': 'Je suis allé à la plage.',
  'rpe_pharmacy_01#4': 'Dix jours, au camping.',
  'rpe_pharmacy_01#5': 'Rester dans ma chambre.',
  'rpe_clothes_01#1': 'Une veste.',
  'rpe_clothes_01#2': 'En noir.',
  'rpe_clothes_01#3': 'Du L. Moins de cinquante euros.',
  'rpe_clothes_01#4': 'Au centre commercial, car il y a beaucoup de choix.',
  'rpe_clothes_01#5': 'Un jean et une chemise blanche.',
  'rpe_cinema_01#1': "Un film d'horreur.",
  'rpe_cinema_01#2': 'Vers dix-neuf heures.',
  'rpe_cinema_01#3': "À la maison, car c'est moins cher.",
  'rpe_cinema_01#4': "Un match de foot. C'était nul.",
  'rpe_cinema_01#5': "Chez moi, parce que c'est tout près.",
  'rpe_party_01#1': 'Vendredi prochain.',
  'rpe_party_01#2': 'Toute la classe.',
  'rpe_party_01#3': 'Un gâteau au chocolat et de la limonade.',
  'rpe_party_01#4': "Je suis allée au restaurant avec ma famille. C'était super.",
  'rpe_party_01#5': "De la pop, parce que tout le monde aime ça.",
  'rpe_beach_clean_01#1': 'Samedi prochain.',
  'rpe_beach_clean_01#2': 'Toute la journée.',
  'rpe_beach_clean_01#3': "Parce que j'aime la nature. Je vais au collège à pied.",
  'rpe_beach_clean_01#4': 'Les bouteilles, car on ne les met pas à la poubelle.',
  'rpe_beach_clean_01#5': "J'ai recyclé des bouteilles.",
  'rpe_careers_01#1': "L'histoire, l'espagnol et les sciences.",
  'rpe_careers_01#2': 'Je voudrais devenir professeur.',
  'rpe_careers_01#3': 'Parce que je veux aider les gens. Il faut un diplôme.',
  'rpe_careers_01#4': "Dans mon pays, car ma famille est là-bas.",
  'rpe_careers_01#5': 'Je vais faire un stage.',
  'rpe_neighbour_01#1': 'Depuis une semaine.',
  'rpe_neighbour_01#2': 'Avec ma mère et mes deux sœurs.',
  'rpe_neighbour_01#3': "Les magasins. Je déteste la pluie.",
  'rpe_neighbour_01#4': 'Je suis allé au parc avec mon père.',
  'rpe_neighbour_01#5': 'Je vais jouer au foot dans un club.',
};

/**
 * Answers that communicate nothing: no task may be complete with one of these.
 * (« Non. » is not here: it fully answers "any allergies?".)
 */
const EMPTY_ANSWERS = ['Je ne sais pas.', 'Bonjour.', 'Oui.', 'Euh…', 'Pardon ?', "Je n'ai pas compris.", "Oui, j'aime ça.", "C'est tout."];

// Sanity markers for `modelFull` against its task's time frame, on the normalised text.
const PAST =
  /\b(?:ai|as|a|avons|avez|ont|suis|es|est|sommes|etes|sont)(?: \w+){0,2} (?:visite|nage|perdu|fait|joue|regarde|mange|travaille|achete|offert|ecoute|vu|commence|laisse|allee?s?|venue?s?|reserve|pris|eu|garde|lu|dure|invite|porte|recycle)\b|\b(?:c etait|partait|avais|avait)\b/;
const FUTURE = /\b(?:vais|vas|va|allons|allez|vont)(?: \w+)? \w+(?:er|ir|re|oir)\b|\b(?:voudrais|aimerais|serons|serai|sera)\b/;

const TU_FORMS = /\b(?:tu|ton|ta|tes|toi|t)\b/;
const VOUS_FORMS = /\b(?:vous|votre|vos)\b/;

const allTasks: [string, StoryCard, StoryTask][] = STORY_CARDS.flatMap((card) =>
  card.tasks.map((task) => [`${card.id}#${task.taskId}`, card, task] as [string, StoryCard, StoryTask]),
);
const examStyle = STORY_CARDS.filter((c) => !c.guided);

function questionMarks(text: string): number {
  return (text.match(/\?/g) ?? []).length;
}

describe('role-play drill cards', () => {
  it('keeps every card id, in order, with no duplicates', () => {
    expect(STORY_CARDS.map((c) => c.id)).toEqual(CARD_IDS);
  });

  it('has five numbered tasks on every card, and claims no card is an exam paper', () => {
    for (const card of STORY_CARDS) {
      expect(card.tasks.map((t) => t.taskId), card.id).toEqual([1, 2, 3, 4, 5]);
      expect(card.paperId, card.id).toBeNull();
      expect(card.title.trim().length, card.id).toBeGreaterThan(0);
      expect(card.scenario.trim().length, card.id).toBeGreaterThan(0);
    }
  });

  it('leaves the six original practice cards exactly as roleplayCards.ts has them (the public pages read those)', () => {
    for (const rp of ROLEPLAY_CARDS) {
      const card = STORY_CARDS.find((c) => c.id === rp.id)!;
      expect(card.guided).toBe(true);
      expect(card.tasks.map((t) => [t.promptFr, t.promptEn])).toEqual(rp.tasks.map((t) => [t.prompt_fr, t.prompt_en]));
    }
  });

  it.each(allTasks)('%s: has an English task, an answer key and no stage directions', (_key, _card, task) => {
    expect(task.promptFr.trim().length).toBeGreaterThan(0);
    expect(task.promptEn.trim().length).toBeGreaterThan(0);
    for (const text of [task.promptFr, task.promptEn, task.modelShort, task.modelFull]) {
      expect(text).not.toMatch(/[[\]]/);
    }
    expect(task.parts.length).toBeGreaterThanOrEqual(1);
    for (const part of task.parts) {
      expect(part.label.trim().length).toBeGreaterThan(0);
      expect(part.accept.length).toBeGreaterThan(0);
      for (const p of part.accept) {
        if (typeof p === 'string') expect(p).toBe(p.toLowerCase());
        else expect(p.flags).not.toMatch(/[gy]/);
      }
    }
    expect(task.modelShort.trim().length).toBeGreaterThan(0);
    expect(task.modelFull.trim().length).toBeGreaterThan(0);
    expect(task.modelShort.split(/\s+/).length).toBeLessThanOrEqual(task.modelFull.split(/\s+/).length);
  });

  it.each(allTasks)('%s: both model answers, and another good answer, communicate every part', (key, _card, task) => {
    for (const answer of [task.modelShort, task.modelFull, OTHER_GOOD_ANSWERS[key]]) {
      expect(answer, `${key} has no other good answer in this test`).toBeTruthy();
      const result = checkAnswerParts(answer, task.parts);
      expect(result.parts.filter((p) => !p.found).map((p) => p.label), `${key}: « ${answer} »`).toEqual([]);
    }
  });

  it.each(allTasks)('%s: an answer that says nothing does not complete the task', (key, _card, task) => {
    for (const answer of EMPTY_ANSWERS) {
      expect(checkAnswerParts(answer, task.parts).complete, `${key}: « ${answer} »`).toBe(false);
    }
  });

  it.each(allTasks.filter(([, , t]) => t.timeFrame))('%s: the full model answer is in the time frame the question asks for', (key, _card, task) => {
    const full = normalizeAnswer(task.modelFull);
    if (task.timeFrame === 'past') expect(full, key).toMatch(PAST);
    if (task.timeFrame === 'future') expect(full, key).toMatch(FUTURE);
    if (task.timeFrame === 'present') {
      expect(full, key).not.toMatch(PAST);
      expect(full, key).not.toMatch(FUTURE);
    }
  });

  it('every OTHER_GOOD_ANSWERS entry names a real task', () => {
    const keys = new Set(allTasks.map(([k]) => k));
    for (const k of Object.keys(OTHER_GOOD_ANSWERS)) expect(keys.has(k), k).toBe(true);
  });
});

describe('exam-style cards (current 0520 format)', () => {
  it('are the 27 exam-style cards, each scenario in French', () => {
    expect(examStyle).toHaveLength(27);
    for (const card of examStyle) expect(card.scenarioLang, card.id).toBe('fr');
  });

  it.each(examStyle.map((c) => [c.id, c] as const))('%s: 2–3 two-part questions, only among tasks 3–5, one part per question', (_id, card) => {
    const twoPart = card.tasks.filter((t) => t.parts.length === 2);
    expect(twoPart.length).toBeGreaterThanOrEqual(2);
    expect(twoPart.length).toBeLessThanOrEqual(3);
    for (const task of card.tasks) {
      expect(task.parts.length, `${card.id}#${task.taskId}`).toBeLessThanOrEqual(2);
      expect(questionMarks(task.promptFr), `${card.id}#${task.taskId}: one question per part`).toBe(task.parts.length);
      if (task.taskId <= 2) expect(task.parts.length, `${card.id}#${task.taskId}`).toBe(1);
    }
  });

  it.each(examStyle.map((c) => [c.id, c] as const))('%s: never a bare "X ou Y ?" the candidate can answer by echoing a word', (_id, card) => {
    for (const task of card.tasks) {
      if (task.parts.length === 1) expect(task.promptFr, `${card.id}#${task.taskId}`).not.toMatch(/\sou\s[^?]*\?$/);
    }
  });

  it.each(examStyle.map((c) => [c.id, c] as const))('%s: keeps one register (tu with a friend, vous otherwise)', (_id, card) => {
    for (const task of card.tasks) {
      const prompt = normalizeAnswer(task.promptFr);
      if (card.register === 'vous') {
        expect(prompt, `${card.id}#${task.taskId}`).not.toMatch(TU_FORMS);
        for (const m of [task.modelShort, task.modelFull]) expect(normalizeAnswer(m), `${card.id}#${task.taskId}`).not.toMatch(TU_FORMS);
      } else {
        expect(prompt, `${card.id}#${task.taskId}`).not.toMatch(VOUS_FORMS);
      }
    }
  });
});
