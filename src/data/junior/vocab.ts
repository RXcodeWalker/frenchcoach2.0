/**
 * Picture choices for the pilot themes. Gender and article are authored here once;
 * the lint checks they agree. No gendered adjective describes the kid (the kid's
 * gender is never asked); colour adjectives are only ever used after « c'est »,
 * and list their other form as an accepted variant.
 */
import { adj, noun, num } from './build';

export const AGES = [
  num('huit', 'huit', '8️⃣', '8'),
  num('neuf', 'neuf', '9️⃣', '9'),
  num('dix', 'dix', '🔟', '10'),
  num('onze', 'onze', '1️⃣1️⃣', '11'),
  num('douze', 'douze', '1️⃣2️⃣', '12'),
  num('treize', 'treize', '1️⃣3️⃣', '13'),
];

export const FOODS = [
  noun('chocolat', 'chocolat', '🍫', 'le', 'm', 'chocolate'),
  noun('pizza', 'pizza', '🍕', 'la', 'f', 'pizza'),
  noun('pommes', 'pommes', '🍎', 'les', 'pl', 'apples'),
  noun('fromage', 'fromage', '🧀', 'le', 'm', 'cheese'),
];

export const LIKES = [
  noun('foot', 'foot', '⚽', 'le', 'm', 'football'),
  noun('danse', 'danse', '💃', 'la', 'f', 'dancing'),
  noun('dessin', 'dessin', '✏️', 'le', 'm', 'drawing'),
  noun('musique', 'musique', '🎵', 'la', 'f', 'music'),
  noun('jeux', 'jeux vidéo', '🎮', 'les', 'pl', 'video games'),
];

export const HOMES = [
  noun('maison', 'maison', '🏠', 'une', 'f', 'a house'),
  noun('appartement', 'appartement', '🏢', 'un', 'm', 'a flat'),
  noun('ville', 'ville', '🏙️', 'une', 'f', 'a city'),
  noun('village', 'village', '🏘️', 'un', 'm', 'a village'),
];

export const PETS = [
  noun('chat', 'chat', '🐱', 'un', 'm', 'a cat'),
  noun('chien', 'chien', '🐶', 'un', 'm', 'a dog'),
  noun('poisson', 'poisson', '🐟', 'un', 'm', 'a fish'),
  noun('oiseau', 'oiseau', '🐦', 'un', 'm', 'a bird'),
  noun('tortue', 'tortue', '🐢', 'une', 'f', 'a turtle'),
];

export const SEASONS = [
  noun('ete', 'été', '☀️', "l'", 'm', 'summer'),
  noun('hiver', 'hiver', '❄️', "l'", 'm', 'winter'),
  noun('printemps', 'printemps', '🌸', 'le', 'm', 'spring'),
  noun('automne', 'automne', '🍂', "l'", 'm', 'autumn'),
];

/** Colour names as nouns (« le bleu »). */
export const COLOUR_NOUNS = {
  bleu: noun('bleu', 'bleu', '🔵', 'le', 'm', 'blue'),
  rouge: noun('rouge', 'rouge', '🔴', 'le', 'm', 'red'),
  vert: noun('vert', 'vert', '🟢', 'le', 'm', 'green'),
  jaune: noun('jaune', 'jaune', '🟡', 'le', 'm', 'yellow'),
  rose: noun('rose', 'rose', '🎀', 'le', 'm', 'pink'),
  violet: noun('violet', 'violet', '🟣', 'le', 'm', 'purple'),
  noir: noun('noir', 'noir', '⚫', 'le', 'm', 'black'),
  blanc: noun('blanc', 'blanc', '⚪', 'le', 'm', 'white'),
  marron: noun('marron', 'marron', '🟤', 'le', 'm', 'brown'),
};

/** Colour names as adjectives after « c'est »; a colour with a distinct feminine form lists it. */
export const COLOUR_ADJS = {
  bleu: adj('bleu', 'bleu', '🔵', 'blue', ['bleue']),
  rouge: adj('rouge', 'rouge', '🔴', 'red'),
  vert: adj('vert', 'vert', '🟢', 'green', ['verte']),
  jaune: adj('jaune', 'jaune', '🟡', 'yellow'),
  violet: adj('violet', 'violet', '🟣', 'purple', ['violette']),
  noir: adj('noir', 'noir', '⚫', 'black', ['noire']),
  blanc: adj('blanc', 'blanc', '⚪', 'white', ['blanche']),
  orange: adj('orange', 'orange', '🟠', 'orange'),
};
