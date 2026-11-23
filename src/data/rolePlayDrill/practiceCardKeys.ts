/**
 * Answer keys for the six original practice cards in src/data/roleplayCards.ts.
 *
 * Those cards' French lines and English tasks stay in roleplayCards.ts; this
 * file adds only what the drill needs on top: what each task asks for
 * (`parts`), and a short and a full model answer. (The public role-play pages
 * used to read these cards; since 2026-11-23 they read exam-style cards.)
 *
 * These are the older "task card" style: the English task tells the candidate
 * what to say, and several tasks ask the candidate to ask a question. A part
 * that asks for a question is matched on its content (« l'ascenseur »), not on
 * the question form. TN p.6 (PRINCIPLE_RP_CONCISE) still applies: a short
 * answer that does every part of the task fully and correctly is worth 2 marks.
 */
import type { AnswerPart } from '../../features/rolePlayDrill/answerKey';
import type { TimeFrame } from '../storyCards';
import {
  CITY,
  CLOCK,
  COLOUR,
  CONTACT,
  COUNT,
  DAY_PART,
  DRINK,
  DURATION,
  FOOD,
  NAME,
  NUM,
  PAYMENT,
  PLACE,
  REASON,
  THING,
  ARTICLE_NOUN,
  TRANSPORT,
  WHEN_FUTURE,
  WHEN_PAST,
  words,
} from './answerPatterns';

export interface TaskKey {
  parts: AnswerPart[];
  timeFrame?: TimeFrame;
  modelShort: string;
  modelFull: string;
}

function part(label: string, ...accept: AnswerPart['accept']): AnswerPart {
  return { label, accept };
}

const WHY = part('a reason', REASON);
const THANKS = part('thank you', words('merci'));
const HAS_RESERVATION = part('has a reservation', words('oui', 'reservation', 'reserve\\w*', 'j ai reserve'));
const NIGHTS = part('how many nights', words(`${NUM} nuits?`), DURATION);

/** Keyed by card id, then in task order (task_id 1–5). */
export const PRACTICE_CARD_KEYS: Record<string, readonly TaskKey[]> = {
  rp_tourism_01: [
    {
      parts: [
        part('a greeting', words('bonjour', 'bonsoir', 'salut', 'madame', 'monsieur')),
        part('asks for things to do', words('liste', 'activites?', 'choses a faire', 'quoi faire', 'a faire', 'visiter', 'brochures?', 'depliants?', 'programme', 'idees')),
      ],
      modelShort: "Bonjour. Une liste des activités, s'il vous plaît.",
      modelFull: "Bonjour, je voudrais une liste des activités à faire dans la ville, s'il vous plaît.",
    },
    {
      parts: [part('when', WHEN_FUTURE), part('how long', DURATION, words('jusqu a \\w+'))],
      modelShort: 'En août, pour une semaine.',
      modelFull: 'Je voudrais visiter la région en août, pendant une semaine.',
    },
    {
      parts: [
        part(
          'type of activity',
          words('sporti\\w*', 'culturel\\w*', 'sports?', 'musees?', 'histoire', 'plage', 'nature', 'randonnees?', 'velo', 'nager', 'natation', 'monuments?', 'art', 'theatre', 'concerts?', 'les deux'),
        ),
        WHY,
      ],
      timeFrame: 'present',
      modelShort: "Culturelles, parce que j'aime les musées.",
      modelFull: "Je préfère les activités culturelles parce que j'adore les musées.",
    },
    {
      parts: [part('asks about transport', TRANSPORT)],
      modelShort: 'Il y a des bus ?',
      modelFull: "Oui, quels transports est-ce qu'il y a dans la région ?",
    },
    {
      parts: [part('asks for a map', words('plan', 'carte')), THANKS],
      modelShort: "Un plan, s'il vous plaît. Merci.",
      modelFull: "Vous avez un plan de la ville, s'il vous plaît ? Merci beaucoup.",
    },
  ],
  rp_hotel_01: [
    {
      parts: [HAS_RESERVATION, part('their name', NAME)],
      modelShort: 'Oui, au nom de Martin.',
      modelFull: "Oui, j'ai une réservation au nom de Martin.",
    },
    {
      parts: [
        NIGHTS,
        part(
          'type of room',
          words('simple', 'double', 'individuelle', 'familiale', 'pour (?:une|deux|\\w+) personnes?', 'avec (?:une |un )?(?:douche|salle de bains?|balcon|vue|baignoire|bain|deux lits|grand lit)', 'grand lit', 'deux lits', 'lits jumeaux', 'suite', 'chambre \\w+'),
        ),
      ],
      modelShort: 'Trois nuits, une chambre double.',
      modelFull: 'Je reste trois nuits et je voudrais une chambre double.',
    },
    {
      parts: [part('which room', words('mer', 'jardin', 'premiere', 'deuxieme', 'seconde', 'plage')), WHY],
      timeFrame: 'present',
      modelShort: "La mer, parce que c'est beau.",
      modelFull: "Je préfère la chambre avec vue sur la mer parce que c'est plus joli.",
    },
    {
      parts: [
        part('asks about WiFi', words('wi ?fi', 'wifi', 'internet', 'connexion')),
        part('asks about parking', words('parking', 'garer', 'stationnement', 'garage', 'voiture')),
      ],
      modelShort: 'Il y a le wifi et un parking ?',
      modelFull: "Est-ce qu'il y a le wifi, et est-ce qu'il y a un parking ?",
    },
    {
      parts: [part('asks where the lift is', words('ascenseur')), THANKS],
      modelShort: "Où est l'ascenseur ? Merci.",
      modelFull: "Où est l'ascenseur, s'il vous plaît ? Merci beaucoup.",
    },
  ],
  rp_restaurant_01: [
    {
      parts: [
        HAS_RESERVATION,
        part('for two people', words('deux', '2', 'pour deux')),
        part('their name', NAME),
      ],
      modelShort: 'Oui, pour deux, au nom de Dubois.',
      modelFull: "Oui, j'ai réservé une table pour deux personnes au nom de Dubois.",
    },
    {
      parts: [
        part('a starter', FOOD, words('entree')),
        part('a drink', DRINK),
      ],
      modelShort: "Une salade et de l'eau.",
      modelFull: "Je voudrais une salade verte et une carafe d'eau, s'il vous plaît.",
    },
    {
      parts: [part('a main course', FOOD), part('asks for the dish of the day', words('plat du jour'))],
      modelShort: 'Le poulet. Quel est le plat du jour ?',
      modelFull: "Je vais prendre le poulet frites. Quel est le plat du jour, s'il vous plaît ?",
    },
    {
      parts: [
        part(
          'an allergy, or none',
          words('allergi\\w*', 'intolerant\\w*', 'intolerances?', 'aucune', 'aucun', 'pas d allergies?', 'non', 'rien', 'vegetarien\\w*', 'vegan\\w*', 'sans gluten', 'gluten', 'lactose', 'arachides', 'cacahuetes', 'noix', 'fruits de mer', 'oeufs?', 'lait'),
        ),
      ],
      modelShort: 'Non, aucune.',
      modelFull: "Non, je n'ai pas d'allergies.",
    },
    {
      parts: [
        part(
          'a dessert',
          FOOD,
          words('glaces?', 'gateau', 'mousse', 'tartes?', 'creme brulee', 'fruits?', 'crepes?', 'sorbet', 'fondant', 'cafe', 'yaourt', 'fromage', 'profiteroles', 'ile flottante', 'tiramisu', 'chocolat', 'dessert', 'rien'),
        ),
        part('asks for the bill', words('addition', 'payer', 'note', 'facture')),
      ],
      modelShort: "Une glace. L'addition, s'il vous plaît.",
      modelFull: "Je voudrais une mousse au chocolat, et l'addition, s'il vous plaît.",
    },
  ],
  rp_train_01: [
    {
      parts: [part('where to', CITY, PLACE), part('when', WHEN_FUTURE, CLOCK, DAY_PART)],
      modelShort: 'À Lyon, demain.',
      modelFull: 'Je voudrais aller à Lyon demain matin.',
    },
    {
      parts: [
        part('a return ticket', words('aller retour', 'retour')),
        part('asks about the class', words('classes?', 'premiere', 'seconde', 'deuxieme')),
      ],
      modelShort: 'Un aller-retour. Quelle classe ?',
      modelFull: "Je voudrais un aller-retour. Il y a quelles classes ?",
    },
    {
      parts: [
        part('a departure time', CLOCK, DAY_PART, words('le premier', 'le prochain', 'le dernier')),
        part('asks how long the journey takes', words('combien de temps', 'duree', 'dure', 'long', 'arrive\\w*')),
      ],
      modelShort: 'À dix heures. Le voyage dure combien de temps ?',
      modelFull: 'Je voudrais partir à dix heures. Combien de temps dure le voyage ?',
    },
    {
      parts: [
        part('a window seat', words('fenetre', 'hublot')),
        part('non-smoking', words('non fumeurs?', 'sans fumee', 'fumeurs?')),
      ],
      modelShort: 'Une place côté fenêtre, non-fumeur.',
      modelFull: "Je voudrais une place côté fenêtre dans une voiture non-fumeur, s'il vous plaît.",
    },
    {
      parts: [
        part('how they will pay', PAYMENT),
        part('asks whether the train is on time', words('a l heure', 'en retard', 'retards?', 'ponctuel', 'a temps', 'annule')),
      ],
      modelShort: "Par carte. Le train est à l'heure ?",
      modelFull: "Je vais payer par carte. Est-ce que le train est à l'heure ?",
    },
  ],
  rp_camping_01: [
    {
      parts: [
        part('no reservation', words('non', 'pas de reservation', 'pas reserve', 'sans reservation', 'pas de \\w+')),
        part('asks if there is space', words('places?', 'emplacements?', 'libres?', 'disponibles?', 'de la place', 'reste')),
      ],
      modelShort: 'Non. Vous avez de la place ?',
      modelFull: "Non, je n'ai pas de réservation. Est-ce que vous avez des places libres ?",
    },
    {
      parts: [
        part('what they have', words('tente', 'camping car', 'caravane', 'van', 'camionnette', 'voiture', 'mobil home')),
        part('how many people', COUNT),
      ],
      modelShort: 'Une tente, pour quatre personnes.',
      modelFull: "J'ai une tente et nous sommes quatre personnes.",
    },
    {
      parts: [
        NIGHTS,
        part(
          'asks about facilities',
          words('installations', 'equipements', 'services', 'piscine', 'douches?', 'toilettes', 'sanitaires', 'restaurant', 'magasin', 'epicerie', 'wifi', 'activites', 'qu est ce qu il y a', 'il y a quoi', 'il y a (?:un|une|des|le|la)', 'est ce qu il y a'),
        ),
      ],
      modelShort: "Trois nuits. Qu'est-ce qu'il y a au camping ?",
      modelFull: "Nous voulons rester trois nuits. Quelles installations est-ce qu'il y a ?",
    },
    {
      parts: [
        part('asks when it opens', words('ouvre', 'ouverture', 'ouvert(?:e)?', 'ouvrez')),
        part('asks when it closes', words('ferme', 'fermeture', 'fermez')),
      ],
      modelShort: "L'épicerie ouvre et ferme à quelle heure ?",
      modelFull: "À quelle heure est-ce que l'épicerie ouvre et ferme, s'il vous plaît ?",
    },
    {
      parts: [
        part('asks where the showers are', words('douches?', 'sanitaires', 'bloc sanitaire')),
        part('pays by card', words('carte', 'cb')),
      ],
      modelShort: 'Où sont les douches ? Je paie par carte.',
      modelFull: "Où sont les douches, s'il vous plaît ? Je vais payer par carte.",
    },
  ],
  rp_lost_property_01: [
    {
      parts: [
        part('lost their bag', words('sacs?', 'sac a dos', 'valise', 'bagages?', 'cartable', 'sacoche')),
        part(
          'where',
          PLACE,
          words('train', 'quai', 'gare', 'toilettes', 'cafe', 'salle d attente', 'bus', 'taxi', 'guichet', 'metro', 'banc', 'buffet', 'restaurant', 'magasin'),
        ),
      ],
      timeFrame: 'past',
      modelShort: "J'ai perdu mon sac dans le train.",
      modelFull: "J'ai perdu mon sac, et je pense que je l'ai laissé dans le train.",
    },
    {
      parts: [
        part('colour', COLOUR),
        part('size', words('grand(?:e)?', 'petit(?:e)?', 'moyen(?:ne)?', 'enorme', 'taille', 'gros(?:se)?', 'leger')),
        part('type', words('sac a dos', 'sac a main', 'valise', 'cartable', 'sacoche', 'sac de sport', 'sac de voyage', 'pochette', 'cabas', 'en cuir', 'en tissu', 'sac')),
      ],
      timeFrame: 'present',
      modelShort: 'Un grand sac à dos noir.',
      modelFull: "C'est un grand sac à dos noir.",
    },
    {
      parts: [part('what was inside', THING, ARTICLE_NOUN)],
      timeFrame: 'past',
      modelShort: 'Mon portefeuille et mes clés.',
      modelFull: 'Dans le sac, il y avait mon portefeuille et mes clés.',
    },
    {
      parts: [
        part('when', WHEN_PAST, CLOCK, DAY_PART),
        part('where', PLACE, words('train', 'quai', 'gare', 'toilettes', 'cafe', 'salle d attente', 'bus', 'taxi', 'guichet', 'metro', 'banc', 'buffet')),
      ],
      timeFrame: 'past',
      modelShort: 'Ce matin, dans le train.',
      modelFull: "Je l'avais encore ce matin, dans le train.",
    },
    {
      parts: [
        part('contact details', CONTACT, NAME),
        part('asks how long it will take', words('combien de temps', 'quand', 'long(?:temps)?', 'delai', 'duree', 'prendre', 'bientot')),
      ],
      modelShort: "Mon numéro, c'est le 06 12 34 56 78. Ça prend combien de temps ?",
      modelFull: 'Mon numéro de portable est le 06 12 34 56 78. Combien de temps est-ce que ça va prendre ?',
    },
  ],
};
