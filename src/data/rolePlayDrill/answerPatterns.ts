/**
 * Shared accept patterns for the role-play drill's answer keys
 * (`StoryTask.parts`, matcher in src/features/rolePlayDrill/answerKey.ts).
 *
 * Every RegExp here is tested against a NORMALISED answer: lower case, no
 * accents, and apostrophes/hyphens/punctuation turned into single spaces
 * (« J'arrive à 10h30, l'après-midi » → `j arrive a 10h30 l apres midi`).
 * So patterns are written unaccented, with a space where French has an
 * apostrophe or hyphen. Numbers are accepted as digits or as words, because
 * the recogniser may give either.
 */

/** Builds one whole-word alternation from normalised fragments. */
export function words(...alternatives: string[]): RegExp {
  return new RegExp(`\\b(?:${alternatives.join('|')})\\b`);
}

const NUM_WORDS = [
  'dix sept', 'dix huit', 'dix neuf', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'cent', 'mille',
  'un', 'une', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
  'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
];

/** A number: digits or a number word (« un », « une » included). */
export const NUM = `(?:\\d+|${NUM_WORDS.join('|')})`;
/** A number above one — « un/une » left out, so "une chambre" is not read as a count. */
export const NUM_2_PLUS = `(?:\\d+|${NUM_WORDS.filter((w) => w !== 'un' && w !== 'une').join('|')})`;

export const DAY = '(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)';
export const MONTH = '(?:janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)';
export const SEASON = '(?:printemps|ete|automne|hiver)';

/** "A number + a unit of time", or the common single-word durations. */
export const DURATION = words(
  `${NUM}\\s+(?:nuits?|jours?|semaines?|heures?|mois|ans?|minutes?|soirs?)`,
  `(?:une|la|toute la|pour la) (?:journee|matinee|soiree|apres midi|semaine|nuit)`,
  'demi journee',
  'quinze jours',
  '(?:le|un|ce) week end',
  `${NUM}\\s*h\\b`,
  'longtemps',
  'peu de temps',
);

/** A clock time: « 10h », « 10h30 », « dix heures », « midi ». */
export const CLOCK = words(
  `\\d{1,2}\\s*h(?:\\s*\\d{1,2})?`,
  `${NUM}\\s+heures?`,
  'midi',
  'minuit',
);

/** A part of the day: « le matin », « l'après-midi », « ce soir ». */
export const DAY_PART = words('matin', 'matinee', 'apres midi', 'soir', 'soiree', 'nuit', 'tot', 'tard');

/** A point in time for something still to come. */
export const WHEN_FUTURE = words(
  DAY,
  MONTH,
  SEASON,
  'demain',
  'apres demain',
  'aujourd hui',
  'ce soir',
  'ce matin',
  'cet apres midi',
  'maintenant',
  'tout de suite',
  'bientot',
  '(?:la|cette) semaine(?: prochaine)?',
  '(?:le|ce) week end(?: prochain)?',
  'le mois prochain',
  '(?:l|cet|en) (?:ete|hiver|automne)',
  'au printemps',
  'les vacances',
  'pendant les vacances',
  'dans \\w+ (?:jours?|semaines?|mois)',
  'des que possible',
  'le \\d{1,2}',
  `le ${NUM}`,
  'prochain',
  'prochaine',
);

/** A point in time already past. */
export const WHEN_PAST = words(
  DAY,
  MONTH,
  SEASON,
  'hier',
  'avant hier',
  'ce matin',
  'cet apres midi',
  'tout a l heure',
  'il y a \\w+',
  '(?:la|le) (?:semaine|week end|mois) dernier(?:e)?',
  'l (?:ete|hiver|annee) dernier(?:e)?',
  'l annee derniere',
  'en vacances',
  'pendant les vacances',
  'quand j etais',
  `en (?:19|20)\\d\\d`,
  'dernier',
  'derniere',
);

/** A way to pay. */
export const PAYMENT = words('carte', 'cartes', 'cb', 'especes', 'liquide', 'cash', 'cheque', 'telephone', 'portable', 'mobile', 'en ligne', 'apple pay', 'paypal', 'billets?', 'monnaie');

/** A colour, any gender or number. */
export const COLOUR = words(
  'noir(?:e|s|es)?',
  'blanc(?:he|s|hes)?',
  'gris(?:e|es)?',
  'bleu(?:e|s|es)?',
  'rouge(?:s)?',
  'vert(?:e|s|es)?',
  'jaune(?:s)?',
  'rose(?:s)?',
  'violet(?:te|s|tes)?',
  'orange',
  'marron',
  'beige(?:s)?',
  'dore(?:e|s|es)?',
  'argent(?:e|ee)?',
  'clair',
  'fonce(?:e)?',
);

/**
 * A reason: « parce que… », « car… », « pour + infinitive », « c'est… ». A bare « j'aime » is not one
 * (« Oui, j'aime ça » answers "do you like it?" but gives no reason).
 */
export const REASON = words(
  'parce que?',
  'car',
  'comme',
  'puisque?',
  'a cause de?',
  'grace a',
  'pour (?:\\w+er|\\w+ir|\\w+re|voir|me|m|ne pas)',
  'c est (?!tout\\b)\\w+',
  'ca a l air',
  'je trouve',
  'je suis',
);

/** A place reached with a preposition: « à Lyon », « au musée », « en ville », « chez moi ». */
export const PLACE = words('(?:a la|a l|a|au|aux|en|chez|dans|vers|pres de?|pres de la|a cote de?|devant|derriere|sous|sur|pres du) \\w+');

/** A name given: « je m'appelle… », « c'est… », « au nom de… », « mon nom est… ». */
export const NAME = words('je m appelle', 'm appelle', 'au nom de?', 'mon nom', 'nom de famille', 'c est', 'je suis');

/** A phone number or an email or address, for "contact details". */
export const CONTACT = words('numero', 'telephone', 'portable', 'e ?mail', 'mail', 'courriel', 'adresse', 'arobase', '\\d{2}(?: \\d{2}){3,}', '0\\d{9}', 'appel\\w*', 'texto', 'sms', 'message');

/** Any determiner + noun: « un livre », « des pâtes », « mon sac ». Loose by design — pair it with a list. */
export const ARTICLE_NOUN = words('(?:un|une|des|du|de la|de l|le|la|les|l|mon|ma|mes|son|sa|ses|ton|ta|tes) \\w+');

/** An opinion word or phrase: « génial », « c'était nul », « j'ai adoré ». */
export const OPINION = words(
  'genial(?:e)?', 'super', 'bien', 'beau', 'belle', 'beaux', 'joli(?:e)?', 'interessant(?:e)?', 'magnifique', 'sympa',
  'nul(?:le)?', 'ennuyeux', 'ennuyeuse', 'fantastique', 'amusant(?:e)?', 'cool', 'pas mal', 'incroyable', 'formidable',
  'superbe', 'bof', 'excellent(?:e)?', 'delicieux', 'delicieuse', 'bon(?:ne)?', 'mauvais(?:e)?', 'fatigant(?:e)?',
  'difficile', 'facile', 'drole', 'passionnant(?:e)?', 'impressionnant(?:e)?', 'top', 'horrible', 'affreux', 'chouette',
  'marrant(?:e)?', 'extra', 'parfait(?:e)?', 'agreable', 'relaxant(?:e)?', 'reposant(?:e)?', 'calme', 'genial',
  'j ai (?:adore|aime|deteste|bien aime)', 'adore', 'aime', 'deteste', 'plu', 'trop bien', 'trop', 'tres', 'c etait \\w+',
);

/** Something done: an activity noun, an infinitive after a verb of wanting/going, or a passé composé. */
export const ACTIVITY = words(
  // A verb of going/wanting/liking + an infinitive or a place/thing — never « j'aime ça ».
  '(?:vais|va|vas|allons|allez|vont|voudrais|veux|veut|voulons|aimerais|aime|aimes|adore|prefere|aimons|peux|pouvons) (?:bien |beaucoup |)(?:\\w+(?:er|ir|re|oir)|(?:au|aux|a la|a l|a|en|du|de la|de l|des|le|la|les|l|un|une) \\w+)',
  '(?:j ai|tu as|on a|nous avons|il a|elle a|je suis|on est|nous sommes|je me suis|on s est) (?:\\w+ )?\\w+',
  'faire (?:du|de la|de l|des) \\w+',
  'jouer (?:au|a la|aux|du|de la|de l) \\w+',
  'nager', 'natation', 'plage', 'musees?', 'visiter', 'visites?', 'shopping', 'magasins?', 'achats', 'courses',
  'marcher', 'promener', 'promenades?', 'randonnees?', 'velo', 'football', 'foot', 'tennis', 'lire', 'bronzer',
  'restaurants?', 'photos', 'danser', 'concerts?', 'cinema', 'films?', 'musique', 'reposer', 'dormir', 'sortir',
  'manger', 'marches?', 'chateaux?', 'monuments?', 'excursions?', 'bateau', 'plongee', 'surf', 'ski', 'patiner',
  'jeux', 'regarder', 'ecouter', 'voir', 'rester', 'rendre visite', 'cuisiner', 'chanter', 'acheter', 'boire',
  'prendre', 'attendre', 'telephoner', 'appeler', 'travailler', 'etudier', 'reviser', 'jouer', 'sport', 'rien',
);

/** How someone travels. */
export const TRANSPORT = words(
  'bus', 'autobus', 'metro', 'trains?', 'tram(?:way)?', 'voitures?', 'taxi', 'velos?', 'a pied', 'moto', 'scooter',
  'car', 'rer', 'navette', 'transports?', 'bateau', 'avion', 'trottinette', 'covoiturage', 'mes parents', 'ma mere',
  'mon pere', 'location de \\w+',
);

/** Who with / for whom: « avec mon frère », « seul », « pour ma mère ». */
export const WHO = words(
  'avec \\w+', 'seul(?:e)?', 'tout seul', 'toute seule', 'personne',
  '(?:mon|ma|mes|un|une|son|sa|ses|ton|ta) (?:\\w+ )?(?:amis?|amies?|copains?|copines?|famille|freres?|soeurs?|cousins?|cousines?|parents|pere|mere|grand mere|grand pere|grands parents|oncle|tante|correspondant(?:e)?|classe|voisin(?:e)?|petit ami|petite amie|mari|femme|fils|fille|prof\\w*|camarades?)',
  'amis?', 'amies?', 'copains?', 'copines?', 'famille', 'freres?', 'soeurs?', 'cousins?', 'cousines?', 'parents',
  'pere', 'mere', 'maman', 'papa', 'grand mere', 'grand pere', 'oncle', 'tante', 'correspondant(?:e)?',
);

/** How many people: « quatre », « nous sommes deux », « seul », « ma famille ». « un/une » alone is not a count. */
export const COUNT = words(
  NUM_2_PLUS, 'personnes?', 'seul(?:e)?', 'tout seul', 'toute seule', 'adultes?', 'enfants?', 'moi et \\w+',
  'ma famille', 'mes parents', 'avec \\w+', 'une personne', 'un adulte', 'un enfant',
);

export const SPORT = words(
  'football', 'foot', 'tennis', 'basket(?:ball)?', 'natation', 'nage\\w*', 'velo', 'cyclisme', 'course', 'courir', 'jogging',
  'danse', 'rugby', 'volley(?:ball)?', 'handball', 'hand', 'badminton', 'ski', 'equitation', 'cheval', 'judo', 'karate',
  'boxe', 'gym\\w*', 'yoga', 'escalade', 'athletisme', 'golf', 'hockey', 'patin\\w*', 'surf', 'skate(?:board)?',
  'musculation', 'ping pong', 'tennis de table', 'randonnee', 'cricket', 'baseball', 'fitness', 'sport', 'piscine',
  'plongee', 'voile', 'canoe', 'kayak', 'aviron', 'escrime', 'snowboard', 'marche', 'rien', 'aucun',
);

export const FOOD = words(
  'pates', 'pizzas?', 'sandwichs?', 'frites', 'barbecue', 'grillades', 'saucisses?', 'hamburgers?', 'burgers?', 'poulet',
  'poisson', 'viande', 'steak', 'salades?', 'soupe', 'potage', 'riz', 'legumes', 'fruits?', 'pommes?', 'bananes?',
  'fromage', 'pain', 'baguette', 'croissants?', 'crepes?', 'gateaux?', 'glaces?', 'chocolat', 'omelette', 'oeufs?',
  'jambon', 'quiche', 'tartes?', 'croque monsieur', 'croque', 'yaourts?', 'cereales', 'chips', 'curry', 'tacos',
  'kebab', 'sushis?', 'lasagnes', 'couscous', 'paella', 'raclette', 'fondue', 'boeuf', 'porc', 'agneau', 'canard',
  'saumon', 'thon', 'moules', 'fruits de mer', 'crudites', 'melon', 'tomates?', 'carottes?', 'pate', 'terrine',
  'escargots', 'veloute', 'steak frites', 'plat du jour', 'menu', 'vegetarien\\w*', 'biscuits?', 'bonbons',
  'pain au chocolat', 'chausson', 'brioche', 'wrap', 'panini', 'hot dog', 'nouilles', 'pique nique', 'rien',
);

export const DRINK = words(
  'eau', 'eau minerale', 'jus', 'jus d \\w+', 'coca(?: cola)?', 'limonade', 'lait', 'chocolat chaud', 'cafe', 'the',
  'sirop', 'orangina', 'soda', 'boissons?', 'smoothie', 'milkshake', 'tisane', 'diabolo', 'perrier', 'ice tea',
  'carafe', 'rien',
);

/** Things people carry, buy or give. */
export const THING = words(
  'livres?', 'bd', 'bande dessinee', 'jeux?(?: video)?', 't shirts?', 'tee shirts?', 'pulls?', 'vetements?', 'bijoux?',
  'colliers?', 'bracelets?', 'montres?', 'parfum', 'chocolats?', 'fleurs', 'carte cadeau', 'cartes? postales?',
  'souvenirs?', 'sacs?', 'ballons?', 'maillots?', 'casquettes?', 'ecouteurs', 'posters?', 'affiches?', 'billets?',
  'places?', 'cd', 'disques?', 'vinyles?', 'peluches?', 'bougies?', 'tasses?', 'mugs?', 'plantes?', 'stylos?',
  'carnets?', 'albums?', 'chaussures', 'baskets', 'echarpes?', 'lunettes(?: de soleil)?', 'creme solaire', 'maillot de bain',
  'shorts?', 'pantalons?', 'jeans?', 'vestes?', 'manteaux?', 'impermeable', 'bottes', 'sandales', 'chapeaux?',
  'serviettes?', 'sac de couchage', 'lampe(?: de poche)?', 'tente', 'appareil photo', 'chargeur', 'portable',
  'telephone', 'brosse a dents', 'trousse(?: de toilette)?', 'medicaments', 'portefeuille', 'porte monnaie', 'cles?',
  'passeport', 'ordinateur', 'tablette', 'argent', 'parapluie', 'cahiers?', 'magnets?', 'porte cles', 'confiture',
  'gateaux?', 'biscuits', 'rien',
);

export const CITY = words(
  'paris', 'lyon', 'marseille', 'nice', 'bordeaux', 'lille', 'toulouse', 'nantes', 'strasbourg', 'montpellier', 'rennes',
  'grenoble', 'dijon', 'avignon', 'tours', 'rouen', 'reims', 'brest', 'nimes', 'cannes', 'la rochelle', 'biarritz',
  'annecy', 'geneve', 'bruxelles', 'londres', 'calais', 'caen', 'orleans', 'le havre', 'metz', 'nancy', 'angers',
  'limoges', 'perpignan', 'toulon', 'aix(?: en provence)?', 'chamonix', 'bayonne', 'pau', 'clermont(?: ferrand)?',
  'saint etienne', 'amiens', 'poitiers', 'besancon', 'saint malo', 'quimper', 'vannes', 'carcassonne', 'arles',
  'lourdes', 'versailles', 'chartres', 'colmar', 'mulhouse', 'le mans', 'la baule', 'deauville', 'disneyland',
);

export const COUNTRY = words(
  'angleterre', 'ecosse', 'pays de galles', 'irlande', 'royaume uni', 'grande bretagne', 'etats unis', 'amerique',
  'canada', 'australie', 'inde', 'pakistan', 'bangladesh', 'chine', 'japon', 'coree', 'espagne', 'italie',
  'allemagne', 'portugal', 'belgique', 'suisse', 'maroc', 'algerie', 'tunisie', 'senegal', 'nigeria', 'kenya',
  'egypte', 'bresil', 'mexique', 'argentine', 'pologne', 'russie', 'turquie', 'grece', 'pays bas', 'hollande',
  'singapour', 'malaisie', 'indonesie', 'thailande', 'vietnam', 'philippines', 'emirats', 'dubai', 'qatar',
  'arabie saoudite', 'afrique du sud', 'nouvelle zelande', 'sri lanka', 'nepal', 'londres', 'manchester',
  '(?:anglais|ecossais|gallois|irlandais|americain|canadien|australien|indien|pakistanais|chinois|japonais|espagnol|italien|allemand|portugais|belge|suisse|marocain|britannique|francais|nigerian|kenyan|egyptien|bresilien|mexicain|polonais|russe|turc|grec)(?:e|s|es|ne|nes)?',
  'de \\w+', 'd \\w+', 'du \\w+', 'des \\w+', 'je viens',
);

export const LANGUAGE = words(
  'anglais', 'francais', 'espagnol', 'allemand', 'italien', 'chinois', 'mandarin', 'cantonais', 'arabe', 'portugais',
  'hindi', 'ourdou', 'urdu', 'russe', 'japonais', 'neerlandais', 'polonais', 'turc', 'gujarati', 'tamoul', 'bengali',
  'punjabi', 'pendjabi', 'coreen', 'grec', 'swahili', 'malais', 'gallois', 'langues?', 'un peu',
);

export const SUBJECT = words(
  'maths', 'mathematiques', 'francais', 'anglais', 'histoire', 'geographie', 'histoire geo', 'sciences?', 'physique',
  'chimie', 'biologie', 'svt', 'eps', 'sport', 'dessin', 'arts?(?: plastiques)?', 'musique', 'informatique', 'espagnol',
  'allemand', 'italien', 'chinois', 'technologie', 'theatre', 'langues?', 'economie', 'religion', 'latin', 'philosophie',
  'cuisine', 'commerce', 'psychologie', 'sociologie',
);

export const JOB = words(
  'medecin', 'docteur', 'infirmier\\w*', 'professeur\\w*', 'prof', 'avocat\\w*', 'ingenieur\\w*', 'veterinaire', 'architecte',
  'journaliste', 'acteur', 'actrice', 'chanteur\\w*', 'footballeur\\w*', 'policier\\w*', 'pompier', 'pilote',
  'informaticien\\w*', 'developpeur\\w*', 'cuisinier\\w*', 'chef', 'coiffeur\\w*', 'dentiste', 'pharmacien\\w*',
  'vendeur\\w*', 'comptable', 'programmeur\\w*', 'scientifique', 'musicien\\w*', 'artiste', 'photographe', 'designer',
  'mecanicien\\w*', 'electricien\\w*', 'banquier\\w*', 'homme d affaires', 'femme d affaires', 'chercheur\\w*',
  'ne sais pas encore', 'pas encore', 'aucune idee', 'travailler (?:dans|avec|comme|a) \\w+', 'etre \\w+', 'devenir \\w+',
);

export const SYMPTOM = words(
  'mal (?:a la|au|aux|a l) \\w+', 'mal', 'tete', 'gorge', 'ventre', 'dos', 'dents', 'oreilles?', 'fievre', 'rhume', 'grippe',
  'tousse', 'toux', 'malade', 'fatigue\\w*', 'vomi\\w*', 'nausee', 'allergi\\w*', 'piqure', 'coup de soleil', 'brule\\w*',
  'blesse\\w*', 'enrhume\\w*', 'chaud', 'froid', 'jambe', 'bras', 'pied', 'main', 'genou', 'yeux', 'oeil',
);

export const FILM_GENRE = words(
  'comedies?', 'action', 'horreur', 'aventure', 'science fiction', 'dessins? animes?', 'animation', 'romantique',
  'policiers?', 'thriller', 'drames?', 'documentaires?', 'fantastique', 'super heros', 'film d \\w+', 'film de \\w+',
  'n importe', 'films? \\w+',
);

export const MUSIC = words(
  'pop', 'rock', 'rap', 'hip hop', 'jazz', 'classique', 'electro', 'reggae', 'k pop', 'r b', 'country', 'musique \\w+',
  'chansons?', 'de tout', 'variete', 'disco', 'metal', 'techno', 'house', 'bollywood', 'afro\\w*', 'latino',
);

/** What someone does for the environment. */
export const GREEN_ACTION = words(
  'recycl\\w*', 'trie', 'trier', 'velo', 'a pied', 'transports?(?: en commun)?', 'eteins', 'eteindre', 'economis\\w*',
  'eau', 'electricite', 'douches?', 'plastique', 'gourde', 'sacs?', 'compost', 'legumes', 'bio', 'rien', 'pas grand chose',
  'evit\\w*', 'marche', 'bus', 'train', 'ramass\\w*', 'nettoy\\w*', 'plante\\w*', 'arbres?', 'lumiere',
);
