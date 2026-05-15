// Copied verbatim from engine/intentMatcher.js — minimal TS wrapper only

const INTENT_DICTIONARY: Record<string, string[]> = {
  "yes": ["oui", "ouais", "d'accord", "effectivement", "certainement", "yes", "ok", "okay", "volontiers", "bien sûr", "tout à fait", "absolument", "parfait", "ça marche", "je veux bien", "avec plaisir", "pourquoi pas", "c'est ça", "c'est correct", "exactement", "je confirme", "j'ai une reservation", "il y a une reservation", "au nom de"],
  "no": ["non", "pas du tout", "aucunement", "no", "nope", "pas vraiment", "rien", "ce sera tout", "jamais", "pas merci", "c'est bon", "je n'en ai pas", "pas de reservation", "pas encore"],
  "help": ["aide", "help", "aider", "secours", "je suis perdu", "comment faire", "je ne sais pas", "que dois-je dire", "une suggestion", "donnez moi un indice"],
  "restart": ["recommencer", "restart", "début", "reprendre au début", "reset"],
  "stop": ["arrêter", "stop", "quitter", "finir", "pause"],
  "window": ["fenêtre", "bord de la fenêtre", "window", "vitre", "vue"],
  "terrace": ["terrasse", "dehors", "extérieur", "terrace", "outside", "en plein air"],
  "inside": ["intérieur", "dedans", "inside", "en salle", "salle"],
  "soup": ["soupe", "potage", "oignon", "soup", "bouillon", "velouté"],
  "salad": ["salade", "niçoise", "entrée froide", "salad", "crudités", "verte"],
  "rare": ["saignant", "bleu", "rare", "peu cuit", "rouge"],
  "medium": ["à point", "medium", "rosé", "moyen"],
  "well_done": ["bien cuit", "well done", "cuit", "très cuit", "semelle", "à coeur"],
  "dessert": ["dessert", "sucré", "tarte", "mousse", "gâteau", "sweet", "glace", "crème", "chocolat", "fruit", "fromage"],
  "coffee": ["café", "express", "expresso", "coffee", "allongé", "crème", "noir", "cappuccino", "décaféiné", "déca", "thé", "infusion"],
  "table": ["table", "une table", "place", "manger", "dejeuner", "diner"],
  "reservation": ["reservation", "reserve", "reserver", "booking", "book"],
  "water": ["eau", "carafe", "verre d'eau", "water", "soif"],
  "bill": ["addition", "facture", "payer", "regler", "compte", "bill", "check"],
  "menu": ["carte", "menu", "ardoise", "choisir"],
  "birthday": ["anniversaire", "fête", "bougies", "gateau", "birthday"],
  "kids": ["enfant", "chaise haute", "menu enfant", "kids", "bebe"],
  "hurry": ["presse", "vite", "rapide", "depecher", "hurry", "urgent"],
  "complaint": ["probleme", "sale", "cheveu", "froid", "mauvais", "plainte", "pas content"],
  "wifi": ["wifi", "internet", "code", "connexion"],
  "restroom": ["toilettes", "wc", "lavabos", "toilets", "salle de bain"],
  "recommendation": ["recommander", "conseiller", "specialite", "bon", "recommande"],
  "sea_view": ["mer", "vue sur mer", "suite", "sea view", "océan", "plage", "balcon"],
  "standard": ["standard", "simple", "classique", "basique", "une personne", "solo"],
  "double": ["double", "grand lit", "deux lits", "jumeaux", "couple", "twin"],
  "tent": ["tente", "emplacement", "tent", "toile", "camper"],
  "caravan": ["caravane", "camping-car", "caravan", "van", "fourgon", "camping car"],
  "checkin": ["arriver", "check in", "clef", "cle", "enregistrement"],
  "checkout": ["partir", "quitter", "check out", "rendre la cle"],
  "taxi": ["taxi", "chauffeur", "uber", "voiture"],
  "fruit": ["fruit", "pomme", "fraise", "orange", "banane", "raisin", "poire", "pêche", "citron"],
  "vegetable": ["légume", "carotte", "tomate", "oignon", "vegetable", "courgette", "poireau", "salade", "chou", "pomme de terre"],
  "clothing": ["vêtement", "habits", "pull", "jean", "veste", "clothing", "pantalon", "chemise", "t-shirt", "robe", "jupe", "manteau"],
  "shoes": ["chaussure", "basket", "botte", "shoes", "sandale", "talon", "mocassin", "sneakers", "pointure"],
  "gift": ["cadeau", "anniversaire", "souvenir", "gift", "offrir", "présent"],
  "return": ["rendre", "remboursement", "changer", "retourner", "trompe"],
  "discount": ["reduction", "moins cher", "promotion", "solde", "rabais"],
  "price": ["prix", "combien", "coute", "cher"],
  "prescription": ["ordonnance", "prescription", "papier du médecin", "médecin", "docteur"],
  "sick": ["malade", "symptôme", "fièvre", "toux", "douleur", "sick", "mal", "rhume", "angine", "grippe", "fatigue", "vomir", "nausée", "mal à la tête", "mal au ventre"],
  "advice": ["conseil", "aide", "advice", "recommandation", "quoi prendre", "que faire", "suggestion", "médicament", "pilule", "cachet", "sirop"],
  "appointment": ["rendez-vous", "voir le docteur", "consultation"],
  "train": ["train", "gare", "billet", "ticket", "tgv", "ter", "sncf", "aller", "retour", "voyage", "guichet"],
  "destination": ["destination", "aller a", "ou va", "direction"],
  "lost": ["perdu", "oublie", "objets trouves", "sac"],
  "platform": ["quai", "voie", "depart"],
  "premiere": ["première", "first class", "1ère", "1ere", "un", "classe 1"],
  "deuxieme": ["deuxième", "seconde", "second class", "2ème", "2eme", "deux", "classe 2", "standard", "normal"],
  "card": ["carte", "cb", "visa", "mastercard", "card", "sans contact", "bleue", "bancaire", "crédit", "par carte"],
  "cash": ["espèces", "liquide", "cash", "argent", "billet", "monnaie", "pièces", "en espèces"],
};

// Sørensen–Dice coefficient (copied verbatim)
function getBigrams(str: string): Set<string> {
  const bigrams = new Set<string>();
  for (let i = 0; i < str.length - 1; i++) bigrams.add(str.substring(i, i + 2));
  return bigrams;
}

function diceCoefficient(str1: string, str2: string): number {
  if (str1.length < 2 || str2.length < 2) return str1 === str2 ? 1 : 0;
  const bg1 = getBigrams(str1);
  const bg2 = getBigrams(str2);
  let intersection = 0;
  for (const bg of bg1) { if (bg2.has(bg)) intersection++; }
  return (2.0 * intersection) / (bg1.size + bg2.size);
}

function removeAccents(str: string) {
  return str.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normalize(str: string) {
  return removeAccents(str.toLowerCase().trim())
    .replace(/[.,!?'\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractEntities(input: string): Record<string, string | number> {
  const entities: Record<string, string | number> = {};
  const lower = input.toLowerCase();

  const numMatch = lower.match(/\b(\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|vingt)\b/);
  if (numMatch) {
    const wordMap: Record<string, number> = { un:1, une:1, deux:2, trois:3, quatre:4, cinq:5, six:6, sept:7, huit:8, neuf:9, dix:10, onze:11, douze:12, treize:13, quatorze:14, quinze:15, vingt:20 };
    entities.number = isNaN(parseInt(numMatch[1])) ? wordMap[numMatch[1]] : parseInt(numMatch[1]);
  }

  const timeMatch = lower.match(/\b(\d{1,2})\s*(h|heure|heures)\s*(\d{2})?\b/);
  if (timeMatch) {
    entities.time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[3] || '00'}`;
  } else if (lower.includes("midi")) {
    entities.time = "12:00";
  } else if (lower.includes("minuit")) {
    entities.time = "00:00";
  }

  const nameMatch = input.match(/(?:m'appelle|nom est|nom de|suis|monsieur|madame|mr|mme)\s+([A-ZÀ-Ÿ][a-zà-ÿ]+)/);
  if (nameMatch) entities.name = nameMatch[1];

  const days = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche", "demain", "aujourd'hui", "ce soir"];
  for (const day of days) { if (lower.includes(day)) { entities.day = day; break; } }

  return entities;
}

export function detectIntents(input: string, expectedIntents: string[] = [], limit = 1): string[] {
  if (!input) return [];
  const cleanInput = normalize(input);
  const words = cleanInput.split(" ");
  const scores: Record<string, number> = {};

  for (const [intent, keywords] of Object.entries(INTENT_DICTIONARY)) {
    let maxIntentScore = 0;
    for (const kw of keywords) {
      const cleanKw = normalize(kw);
      let kwScore = 0;
      if (cleanInput === cleanKw)                            kwScore = 20;
      else if (` ${cleanInput} `.includes(` ${cleanKw} `)) kwScore = 15;
      else {
        const dice = diceCoefficient(cleanInput, cleanKw);
        if (dice > 0.4) {
          kwScore = 12 * dice;
        } else {
          const kwWords = cleanKw.split(" ");
          for (const kwWord of kwWords) {
            if (kwWord.length <= 2) continue;
            for (const inputWord of words) {
              const wDice = diceCoefficient(inputWord, kwWord);
              if (wDice > 0.6) kwScore += 5 * wDice;
            }
          }
        }
      }
      if (kwScore > maxIntentScore) maxIntentScore = kwScore;
    }

    if (maxIntentScore < 10) {
      const lowerIntent = intent.toLowerCase();
      if (cleanInput.includes(lowerIntent)) maxIntentScore = 12;
      else if (lowerIntent.includes("_")) {
        for (const part of lowerIntent.split("_")) {
          if (part.length > 3 && cleanInput.includes(part)) { maxIntentScore = 10; break; }
        }
      }
    }

    if (maxIntentScore > 0) {
      if (expectedIntents.includes(intent)) maxIntentScore *= 3.0;
      else {
        for (const expected of expectedIntents) {
          if (expected.includes(intent) || intent.includes(expected)) maxIntentScore *= 2.0;
        }
      }
      scores[intent] = maxIntentScore;
    }
  }

  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .filter(([, score]) => score >= 3.0)
    .map(([intent]) => intent)
    .slice(0, limit);
}

export function detectIntent(input: string): string {
  const intents = detectIntents(input, [], 1);
  return intents.length > 0 ? intents[0] : "unknown";
}
