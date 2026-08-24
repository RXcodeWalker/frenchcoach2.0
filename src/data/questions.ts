import type { Question, Topic } from '../types';

// Topic metadata — keys match old repo so question topicKeys are consistent
export const TOPICS: Topic[] = [
  { key: 'school',      label: "L'école",          labelEn: 'School & Education',         icon: '🎓', color: '#3b82f6', description: "Parle de l'école, tes matières et ta routine.",         questionsCount: 0 },
  { key: 'hobbies',     label: 'Les loisirs',       labelEn: 'Hobbies & Free Time',        icon: '⚽', color: '#10b981', description: 'Tes activités préférées et comment tu passes ton temps.', questionsCount: 0 },
  { key: 'family',      label: 'La famille',        labelEn: 'Family & Friends',           icon: '👨‍👩‍👧‍👦', color: '#f59e0b', description: 'Décris ta famille et tes amis proches.',               questionsCount: 0 },
  { key: 'holidays',    label: 'Les vacances',      labelEn: 'Holidays & Travel',          icon: '✈️', color: '#8b5cf6', description: 'Tes voyages, destinations et vacances idéales.',        questionsCount: 0 },
  { key: 'home',        label: 'La maison',         labelEn: 'Home & Town',                icon: '🏠', color: '#ec4899', description: 'Parle de chez toi et de ta ville ou région.',           questionsCount: 0 },
  { key: 'future',      label: "L'avenir",          labelEn: 'Future Plans',               icon: '🚀', color: '#0ea5e9', description: 'Tes projets pour le futur et ta carrière.',             questionsCount: 0 },
  { key: 'food',        label: 'La nourriture',     labelEn: 'Food & Health',              icon: '🥐', color: '#f97316', description: 'Ce que tu manges, ta santé et tes habitudes.',          questionsCount: 0 },
  { key: 'environment', label: "L'environnement",   labelEn: 'Environment & Technology',   icon: '🌍', color: '#14b8a6', description: "L'environnement, la technologie et la société.",        questionsCount: 0 },
  { key: 'clothes',     label: 'Les vêtements',     labelEn: 'Clothing & Fashion',         icon: '👕', color: '#d946ef', description: 'La mode, les vêtements et le style personnel.',         questionsCount: 0 },
  { key: 'animals',     label: 'Les animaux',       labelEn: 'Animals & Nature',           icon: '🐾', color: '#84cc16', description: 'Les animaux domestiques, sauvages et la nature.',       questionsCount: 0 },
  { key: 'transport',   label: 'Les transports',    labelEn: 'Transport & Getting Around', icon: '🚆', color: '#6366f1', description: 'Les moyens de transport et les déplacements.',         questionsCount: 0 },
  { key: 'jobs',        label: 'Les métiers',       labelEn: 'Jobs & Professions',         icon: '👔', color: '#0891b2', description: 'Les métiers, le monde du travail et les ambitions.',    questionsCount: 0 },
  { key: 'sports',      label: 'Les sports',        labelEn: 'Sports & Fitness',           icon: '🏅', color: '#22c55e', description: 'Le sport, la forme physique et la compétition.',       questionsCount: 0 },
  { key: 'emotions',    label: 'Les émotions',      labelEn: 'Emotions & Feelings',        icon: '💛', color: '#eab308', description: 'Exprimer tes sentiments et ton état d\'esprit.',       questionsCount: 0 },
  { key: 'arts',        label: 'Les arts',          labelEn: 'Arts & Entertainment',       icon: '🎨', color: '#e11d48', description: 'La musique, le cinéma, la lecture et la créativité.',  questionsCount: 0 },
  { key: 'shopping',    label: 'Les achats',        labelEn: 'Shopping & Money',           icon: '🛍️', color: '#7c3aed', description: 'Faire des courses, l\'argent et la consommation.',     questionsCount: 0 },

  // Advanced Topics
  { key: 'pro',         label: "L'Espace Pro",      labelEn: 'Professional French',        icon: '💼', color: '#64748b', description: 'Le monde du travail, les entretiens et la carrière.', isAdvanced: true, questionsCount: 0 },
  { key: 'culture',     label: 'Francophonie',      labelEn: 'Culture & Traditions',       icon: '🎭', color: '#a855f7', description: 'Les traditions, les festivals et la culture francophone.', isAdvanced: true, questionsCount: 0 },
  { key: 'lifestyle',   label: 'Mode de Vie',       labelEn: 'Lifestyle & Trends',         icon: '👗', color: '#ec4899', description: 'La mode, les tendances et le style de vie moderne.', isAdvanced: true, questionsCount: 0 },
  { key: 'news',        label: 'Actualités',        labelEn: 'Current Affairs',            icon: '🗞️', color: '#f59e0b', description: 'Les infos, les débats et les enjeux de société.', isAdvanced: true, questionsCount: 0 },
  { key: 'slang',       label: "L'Argot",           labelEn: 'Slang & Idioms',             icon: '💬', color: '#ef4444', description: 'Apprends le français familier et les expressions.', isAdvanced: true, questionsCount: 0 },
  { key: 'survival',    label: 'Survie',            labelEn: 'Survival French',            icon: '🚨', color: '#f43f5e', description: 'Gère les situations urgentes et imprévues.', isAdvanced: true, questionsCount: 0 },
  { key: 'debate',      label: 'Le Grand Débat',    labelEn: 'Rhetoric & Debate',          icon: '⚖️', color: '#10b981', description: 'Apprends à argumenter et à convaincre.', isAdvanced: true, questionsCount: 0 },
  { key: 'art',         label: 'Art & Tableaux',    labelEn: 'Visual Storytelling',        icon: '🖼️', color: '#06b6d4', description: 'Décris des œuvres d\'art et des scènes visuelles.', isAdvanced: true, questionsCount: 0 },
];

export interface ExamSet {
  id: string;
  label: string;
  questions: string[];
}

export const QUESTIONS: Question[] = [

  // ── L'ÉCOLE ──────────────────────────────────────────────────────────────
  {
    id: "sch_01",
    topicKey: "school",
    text: "Parle-moi de ton école.",
    hint: "Talk about your school — size, subjects, teachers, uniform, facilities.",
    difficulty: 1,
    followUps: [
      "Quel est ton professeur préféré et pourquoi ?",
      "Combien d'élèves y a-t-il dans ton école ?",
      "Est-ce que tu portes un uniforme scolaire ?",
    ],
    modelAnswer: "Mon école s'appelle City Academy et se trouve en ville. C'est une grande école avec environ mille élèves. J'aime bien mon école parce que les professeurs sont sympathiques et il y a beaucoup d'activités parascolaires. Mes matières préférées sont les maths et les sciences. On porte un uniforme — un pantalon noir et un pull bleu marine — ce qui, à mon avis, est pratique.",
    keyVocab: [
      { fr: "le/la proviseur(e)", en: "headteacher" },
      { fr: "la cour de récréation", en: "playground" },
      { fr: "la bibliothèque", en: "library" },
      { fr: "le couloir", en: "corridor" },
      { fr: "la salle de classe", en: "classroom" },
      { fr: "les activités parascolaires", en: "extracurricular activities" },
    ],
  },
  {
    id: "sch_02",
    topicKey: "school",
    text: "Quelles sont tes matières préférées et pourquoi ?",
    hint: "Describe 2-3 favourite subjects, give reasons, compare with subjects you dislike.",
    difficulty: 1,
    followUps: [
      "À quelle heure commencent tes cours ?",
      "Est-ce que les cours sont difficiles pour toi ?",
      "Qu'est-ce que tu fais pendant la récréation ?",
    ],
    modelAnswer: "Ma matière préférée, c'est le français parce que j'aime beaucoup les langues étrangères et je trouve que c'est utile pour voyager. J'aime aussi les sciences car les expériences sont fascinantes. Par contre, je n'aime pas trop l'EPS parce que je ne suis pas très sportif(ve). En revanche, je pense que toutes les matières sont importantes pour notre avenir.",
    keyVocab: [
      { fr: "utile/inutile", en: "useful/useless" },
      { fr: "fascinant(e)", en: "fascinating" },
      { fr: "difficile/facile", en: "difficult/easy" },
      { fr: "je trouve que...", en: "I find that..." },
      { fr: "par contre", en: "on the other hand" },
      { fr: "en revanche", en: "however / on the other hand" },
    ],
  },
  {
    id: "sch_03",
    topicKey: "school",
    text: "Comment tu vas à l'école chaque matin ?",
    hint: "Explain your journey to school — transport, how long it takes, who you go with.",
    difficulty: 1,
    followUps: [
      "À quelle heure tu pars de chez toi ?",
      "Est-ce que le trajet est long ?",
      "Tu préfères quel moyen de transport et pourquoi ?",
    ],
    modelAnswer: "Le matin, je prends le bus scolaire pour aller à l'école. Le trajet dure environ vingt minutes. Je retrouve mes amis à l'arrêt de bus et on discute pendant le voyage. Parfois, quand il fait beau, mon père me dépose en voiture. À mon avis, le bus, c'est bien parce que je peux parler avec mes camarades, mais c'est parfois bruyant.",
    keyVocab: [
      { fr: "le trajet", en: "the journey / commute" },
      { fr: "le bus scolaire", en: "school bus" },
      { fr: "à pied", en: "on foot" },
      { fr: "déposer quelqu'un", en: "to drop someone off" },
      { fr: "bruyant(e)", en: "noisy" },
      { fr: "en retard", en: "late" },
    ],
  },
  {
    id: "sch_04",
    topicKey: "school",
    text: "Est-ce que tu aimes ton école ? Pourquoi ou pourquoi pas ?",
    hint: "Give a balanced opinion with both positives and negatives, plus reasons.",
    difficulty: 2,
    followUps: [
      "Qu'est-ce que tu changerais dans ton école si tu pouvais ?",
      "Les règles de ton école sont-elles strictes ?",
      "Quel est le meilleur souvenir que tu as de ton école ?",
    ],
    modelAnswer: "Dans l'ensemble, j'aime bien mon école. Les professeurs sont compétents et bienveillants, et les installations sont modernes — il y a une salle informatique et un gymnase. Cependant, je pense que les journées sont trop longues et les devoirs excessifs. Si je pouvais changer quelque chose, je réduirais les examens et j'organiserais plus de sorties scolaires. Malgré tout, je suis content(e) d'aller dans cette école.",
    keyVocab: [
      { fr: "dans l'ensemble", en: "on the whole" },
      { fr: "bienveillant(e)", en: "kind / caring" },
      { fr: "les installations", en: "facilities" },
      { fr: "les devoirs excessifs", en: "excessive homework" },
      { fr: "malgré tout", en: "despite everything" },
      { fr: "réduire", en: "to reduce" },
    ],
  },
  {
    id: "sch_05",
    topicKey: "school",
    text: "Qu'est-ce que tu as fait à l'école la semaine dernière ?",
    hint: "Use passé composé to describe specific events — a lesson, a test, a school trip.",
    difficulty: 2,
    followUps: [
      "Est-ce que tu as eu des examens récemment ?",
      "Tu as fait quelque chose de spécial avec ta classe ?",
      "Comment ça s'est passé ?",
    ],
    modelAnswer: "La semaine dernière, j'ai eu un contrôle de maths assez difficile. J'avais bien révisé la veille, donc je pense que j'ai réussi. On a aussi fait une sortie scolaire au musée des sciences, ce qui était vraiment intéressant. Le jeudi, on a commencé un nouveau projet en groupe pour le cours d'anglais. Dans l'ensemble, c'était une semaine chargée mais productive.",
    keyVocab: [
      { fr: "un contrôle", en: "a test / assessment" },
      { fr: "réviser", en: "to revise / study" },
      { fr: "une sortie scolaire", en: "a school trip" },
      { fr: "un projet en groupe", en: "a group project" },
      { fr: "chargé(e)", en: "busy / hectic" },
      { fr: "la veille", en: "the day before" },
    ],
  },
  {
    id: "sch_06",
    topicKey: "school",
    text: "Décris ta journée scolaire typique.",
    hint: "Walk through your day from morning to end of school using time phrases.",
    difficulty: 1,
    followUps: [
      "Tu manges à la cantine ou tu apportes ton repas ?",
      "Combien de cours as-tu par jour ?",
      "À quelle heure finissent tes cours ?",
    ],
    modelAnswer: "Ma journée scolaire commence à huit heures et demie. D'abord, on fait l'appel en classe de base, puis on va en cours. On a six cours par jour, chacun d'une heure. À midi, je mange à la cantine avec mes amis — la nourriture est correcte mais pas extraordinaire. Les cours se terminent à seize heures. Le soir, je fais mes devoirs pendant environ une heure avant de me détendre.",
    keyVocab: [
      { fr: "l'appel", en: "the register / roll call" },
      { fr: "la cantine", en: "the canteen / cafeteria" },
      { fr: "se terminer", en: "to finish / end" },
      { fr: "se détendre", en: "to relax" },
      { fr: "d'abord... puis... ensuite...", en: "first... then... next..." },
      { fr: "pendant environ", en: "for about / approximately" },
    ],
  },

  // ── LES LOISIRS ──────────────────────────────────────────────────────────
  {
    id: "hob_01",
    topicKey: "hobbies",
    text: "Qu'est-ce que tu fais pendant ton temps libre ?",
    hint: "Describe 2-3 hobbies in detail — how often, who with, why you enjoy them.",
    difficulty: 1,
    followUps: [
      "Depuis combien de temps tu fais cette activité ?",
      "Tu préfères les activités en plein air ou à l'intérieur ?",
      "Est-ce que tu voudrais essayer un nouveau passe-temps ?",
    ],
    modelAnswer: "Pendant mon temps libre, j'aime surtout jouer de la guitare. Je joue depuis trois ans et je prends des cours le samedi. En plus, j'aime lire des romans — surtout les thrillers et la science-fiction. Le week-end, je retrouve mes amis pour aller au cinéma ou faire du shopping en ville. J'essaie aussi de faire du sport régulièrement pour rester en forme.",
    keyVocab: [
      { fr: "surtout", en: "especially / above all" },
      { fr: "depuis", en: "since / for (duration)" },
      { fr: "régulièrement", en: "regularly" },
      { fr: "rester en forme", en: "to stay fit / healthy" },
      { fr: "un passe-temps", en: "a hobby / pastime" },
      { fr: "j'essaie de...", en: "I try to..." },
    ],
  },
  {
    id: "hob_02",
    topicKey: "hobbies",
    text: "Tu fais du sport ? Quel sport tu préfères et pourquoi ?",
    hint: "Talk about sports you play or watch. Include how often and where.",
    difficulty: 1,
    followUps: [
      "Tu fais partie d'une équipe ?",
      "Quel sport voudrais-tu apprendre à pratiquer ?",
      "Tu préfères regarder le sport à la télé ou y participer ?",
    ],
    modelAnswer: "Oui, je suis assez sportif(ve). Mon sport préféré, c'est le football — je joue dans l'équipe scolaire depuis deux ans. On s'entraîne le mercredi après-midi et on a des matchs le samedi. J'adore l'esprit d'équipe et la compétition. J'aime aussi nager pendant les vacances. À mon avis, pratiquer un sport est essentiel pour la santé physique et mentale.",
    keyVocab: [
      { fr: "s'entraîner", en: "to train / practise" },
      { fr: "l'esprit d'équipe", en: "team spirit" },
      { fr: "un match", en: "a match / game" },
      { fr: "faire partie de", en: "to be part of" },
      { fr: "la compétition", en: "competition" },
      { fr: "essentiel pour", en: "essential for" },
    ],
  },
  {
    id: "hob_03",
    topicKey: "hobbies",
    text: "Est-ce que tu joues d'un instrument de musique ou tu chantes ?",
    hint: "Discuss any musical activity — playing, singing, concerts, favourite music genres.",
    difficulty: 1,
    followUps: [
      "Quel est ton genre de musique préféré ?",
      "Tu écoutes de la musique française ?",
      "Tu es déjà allé(e) à un concert ?",
    ],
    modelAnswer: "Je joue du piano depuis l'âge de sept ans. Au début, c'était difficile, mais maintenant j'en joue avec plaisir. Je m'entraîne environ trente minutes chaque jour. Concernant la musique que j'écoute, je préfère le pop et le rock. Mon groupe préféré est Arctic Monkeys. L'année dernière, je suis allé(e) à mon premier concert et c'était une expérience inoubliable.",
    keyVocab: [
      { fr: "jouer de (+ instrument)", en: "to play (an instrument)" },
      { fr: "au début", en: "at first / in the beginning" },
      { fr: "inoubliable", en: "unforgettable" },
      { fr: "un genre musical", en: "a music genre" },
      { fr: "concernant", en: "regarding / concerning" },
      { fr: "avec plaisir", en: "with pleasure / happily" },
    ],
  },
  {
    id: "hob_04",
    topicKey: "hobbies",
    text: "Tu lis beaucoup ? Qu'est-ce que tu aimes lire ?",
    hint: "Describe your reading habits, favourite genres, specific books or authors.",
    difficulty: 2,
    followUps: [
      "Tu préfères les livres électroniques ou les livres papier ?",
      "Quel livre tu recommanderais à un ami ?",
      "Tu lis des livres en français ?",
    ],
    modelAnswer: "Je lis assez souvent, surtout avant de dormir. J'aime beaucoup les romans d'aventure et les histoires de fantasy. En ce moment, je lis une série de livres qui s'appelle « Percy Jackson » — c'est captivant. Je pense que la lecture est très bénéfique parce qu'elle améliore le vocabulaire et stimule l'imagination. J'ai aussi lu quelques nouvelles en français pour pratiquer la langue.",
    keyVocab: [
      { fr: "un roman", en: "a novel" },
      { fr: "captivant(e)", en: "gripping / captivating" },
      { fr: "bénéfique", en: "beneficial" },
      { fr: "améliorer", en: "to improve" },
      { fr: "stimuler", en: "to stimulate" },
      { fr: "en ce moment", en: "at the moment / currently" },
    ],
  },
  {
    id: "hob_05",
    topicKey: "hobbies",
    text: "Est-ce que tu regardes beaucoup la télévision ou des vidéos en ligne ?",
    hint: "Discuss screen time habits — TV shows, YouTube, streaming, how much time per day.",
    difficulty: 2,
    followUps: [
      "Quelle est ton émission préférée en ce moment ?",
      "Tu penses que les jeunes regardent trop la télé ?",
      "Est-ce que tu as regardé des films ou séries en français ?",
    ],
    modelAnswer: "Je regarde des vidéos en ligne tous les jours, surtout sur YouTube où je suis des chaînes de science et de comédie. Je regarde aussi des séries en streaming — ma préférée en ce moment est une série coréenne avec des sous-titres français. Cependant, j'essaie de limiter mon temps d'écran à deux heures par jour pour ne pas négliger mes études. Je pense que c'est important de trouver un équilibre.",
    keyVocab: [
      { fr: "le temps d'écran", en: "screen time" },
      { fr: "les sous-titres", en: "subtitles" },
      { fr: "négliger", en: "to neglect" },
      { fr: "un équilibre", en: "a balance" },
      { fr: "limiter", en: "to limit" },
      { fr: "une chaîne", en: "a channel" },
    ],
  },

  // ── LA FAMILLE ────────────────────────────────────────────────────────────
  {
    id: "fam_01",
    topicKey: "family",
    text: "Décris ta famille.",
    hint: "Describe family members — their appearance, personality, job, and your relationship.",
    difficulty: 1,
    followUps: [
      "Tu t'entends bien avec tes frères et sœurs ?",
      "Qu'est-ce que ta famille fait ensemble le week-end ?",
      "Tu ressembles plus à ta mère ou à ton père ?",
    ],
    modelAnswer: "Je vis avec mes parents et ma sœur cadette, qui a douze ans. Mon père est grand et brun — il travaille comme ingénieur. Ma mère a les cheveux châtains et elle est très créative — elle est professeure d'art. Ma sœur est un peu timide mais très gentille. Nous nous entendons bien en général, même si on se dispute parfois. La famille est très importante pour moi.",
    keyVocab: [
      { fr: "cadet/cadette", en: "younger (sibling)" },
      { fr: "s'entendre (bien)", en: "to get along (well)" },
      { fr: "se disputer", en: "to argue / quarrel" },
      { fr: "les cheveux châtains", en: "brown hair" },
      { fr: "même si", en: "even if / even though" },
      { fr: "en général", en: "in general / usually" },
    ],
  },
  {
    id: "fam_02",
    topicKey: "family",
    text: "Comment est ta relation avec tes parents ?",
    hint: "Explain how you get along — what you do together, any conflicts, how they support you.",
    difficulty: 2,
    followUps: [
      "Est-ce que tes parents sont stricts ?",
      "Qu'est-ce que tes parents font pour te soutenir à l'école ?",
      "Tu as déjà eu un conflit avec tes parents ? Comment ça s'est résolu ?",
    ],
    modelAnswer: "Dans l'ensemble, j'ai une très bonne relation avec mes parents. Ils me soutiennent beaucoup, surtout avec mes études. Mon père m'aide avec les maths et ma mère m'encourage à être créatif(ve). Parfois, on n'est pas d'accord sur des choses comme l'heure du coucher ou le temps que je passe sur mon téléphone. Cependant, on discute toujours calmement et on trouve un compromis. Je les respecte beaucoup.",
    keyVocab: [
      { fr: "soutenir", en: "to support" },
      { fr: "être d'accord", en: "to agree" },
      { fr: "l'heure du coucher", en: "bedtime" },
      { fr: "un compromis", en: "a compromise" },
      { fr: "respecter", en: "to respect" },
      { fr: "calmement", en: "calmly" },
    ],
  },
  {
    id: "fam_03",
    topicKey: "family",
    text: "Décris ton meilleur ami ou ta meilleure amie.",
    hint: "Describe their appearance, personality, how you met, what you do together.",
    difficulty: 1,
    followUps: [
      "Depuis combien de temps tu connais cette personne ?",
      "Qu'est-ce que vous aimez faire ensemble ?",
      "Qu'est-ce qui est important pour toi dans une amitié ?",
    ],
    modelAnswer: "Mon meilleur ami s'appelle Liam. Il est grand, avec des cheveux blonds et des yeux verts. On se connaît depuis l'école primaire — ça fait donc environ huit ans. Il est vraiment drôle et loyal — je peux toujours compter sur lui. On partage les mêmes goûts musicaux et on adore jouer aux jeux vidéo ensemble. Pour moi, la confiance et le sens de l'humour sont les qualités les plus importantes dans une amitié.",
    keyVocab: [
      { fr: "compter sur quelqu'un", en: "to rely on someone" },
      { fr: "partager", en: "to share" },
      { fr: "les goûts", en: "tastes / preferences" },
      { fr: "loyal(e)", en: "loyal" },
      { fr: "la confiance", en: "trust / confidence" },
      { fr: "l'école primaire", en: "primary school" },
    ],
  },
  {
    id: "fam_04",
    topicKey: "family",
    text: "Qu'est-ce que tu fais avec tes amis le week-end ?",
    hint: "Talk about typical weekend activities with friends — where you go, what you do.",
    difficulty: 1,
    followUps: [
      "Tu préfères rester à la maison ou sortir avec des amis ?",
      "Est-ce que tu utilises les réseaux sociaux pour rester en contact avec tes amis ?",
      "Tu as déjà eu un problème avec un ami ? Comment tu l'as résolu ?",
    ],
    modelAnswer: "Le week-end, j'aime retrouver mes amis en ville. On va souvent au cinéma ou dans un café pour bavarder. L'été, on se retrouve au parc pour faire du sport ou un pique-nique. Le soir, parfois on se retrouve chez quelqu'un pour jouer à des jeux de société ou regarder des films. C'est toujours très sympa. Je pense que passer du temps avec ses amis est essentiel pour le bien-être.",
    keyVocab: [
      { fr: "bavarder", en: "to chat / natter" },
      { fr: "un pique-nique", en: "a picnic" },
      { fr: "un jeu de société", en: "a board game" },
      { fr: "le bien-être", en: "well-being / welfare" },
      { fr: "sympa (= sympathique)", en: "nice / pleasant" },
      { fr: "se retrouver", en: "to meet up / get together" },
    ],
  },

  // ── LES VACANCES ──────────────────────────────────────────────────────────
  {
    id: "hol_01",
    topicKey: "holidays",
    text: "Où es-tu allé(e) pendant les dernières vacances ?",
    hint: "Describe a recent holiday — where, who with, what you did, how you felt.",
    difficulty: 1,
    followUps: [
      "Comment tu as voyagé — en avion, en voiture ou en train ?",
      "Qu'est-ce que tu as fait là-bas ?",
      "Est-ce que tu as mangé des spécialités locales ?",
    ],
    modelAnswer: "L'été dernier, je suis allé(e) en Espagne avec ma famille. On a pris l'avion depuis Londres — le vol a duré environ deux heures. On a séjourné dans un hôtel au bord de la mer, à Barcelone. Pendant les vacances, j'ai visité la Sagrada Família, j'ai profité de la plage et j'ai goûté des tapas, ce qui était délicieux. C'était des vacances inoubliables et j'aimerais y retourner un jour.",
    keyVocab: [
      { fr: "séjourner", en: "to stay (at a hotel etc.)" },
      { fr: "profiter de", en: "to enjoy / make the most of" },
      { fr: "goûter", en: "to taste / try (food)" },
      { fr: "au bord de la mer", en: "at the seaside" },
      { fr: "un vol", en: "a flight" },
      { fr: "inoubliable", en: "unforgettable" },
    ],
  },
  {
    id: "hol_02",
    topicKey: "holidays",
    text: "Tu préfères les vacances à la mer ou à la montagne ? Pourquoi ?",
    hint: "Compare both types of holiday, give strong reasons for your preference.",
    difficulty: 2,
    followUps: [
      "Qu'est-ce qu'on peut faire à la montagne en été ?",
      "Tu as peur de la mer ou tu adores nager ?",
      "Est-ce que les vacances à la campagne t'intéressent ?",
    ],
    modelAnswer: "Je préfère nettement les vacances à la mer. J'adore me baigner, faire du snorkeling et me détendre sur la plage. Le soleil et la mer ont un effet très relaxant sur moi. La montagne peut être belle en hiver pour faire du ski, mais en été je la trouve un peu monotone. Cependant, je reconnais que la montagne offre de beaux paysages et de bonnes randonnées. Mais pour moi, rien ne vaut une belle plage méditerranéenne !",
    keyVocab: [
      { fr: "nettement", en: "clearly / decidedly" },
      { fr: "se baigner", en: "to swim / bathe" },
      { fr: "la randonnée", en: "hiking / trekking" },
      { fr: "les paysages", en: "landscapes / scenery" },
      { fr: "monotone", en: "monotonous / dull" },
      { fr: "rien ne vaut", en: "nothing beats" },
    ],
  },
  {
    id: "hol_03",
    topicKey: "holidays",
    text: "Décris des vacances idéales.",
    hint: "Paint a picture of your dream holiday — use conditional tense (j'irais, je ferais).",
    difficulty: 3,
    followUps: [
      "Avec qui est-ce que tu voyagerais dans l'idéal ?",
      "Tu préfères les hôtels de luxe ou le camping ?",
      "Quel pays voudrais-tu absolument visiter ?",
    ],
    modelAnswer: "Pour mes vacances idéales, j'irais au Japon avec mes meilleurs amis. On séjournerait dans un ryokan — une auberge traditionnelle japonaise. On visiterait Tokyo, Kyoto et le Mont Fuji. Je goûterais des sushis authentiques et j'assisterais à une cérémonie du thé. On se déplacerait en Shinkansen — le train à grande vitesse. Ce voyage serait parfait parce que le Japon mélange modernité et tradition de façon unique.",
    keyVocab: [
      { fr: "dans l'idéal", en: "ideally" },
      { fr: "un(e) auberge", en: "an inn / hostel" },
      { fr: "assister à", en: "to attend" },
      { fr: "se déplacer", en: "to travel / get around" },
      { fr: "mélanger", en: "to mix / combine" },
      { fr: "la modernité", en: "modernity" },
    ],
  },
  {
    id: "hol_04",
    topicKey: "holidays",
    text: "Est-ce que tu voudrais voyager dans d'autres pays ? Lesquels ?",
    hint: "Name specific countries, explain what appeals to you about each one.",
    difficulty: 2,
    followUps: [
      "Pourquoi est-ce que voyager est important, selon toi ?",
      "Est-ce que tu parles des langues étrangères qui t'aideraient à voyager ?",
      "Les voyages t'ont-ils déjà changé ou appris quelque chose d'important ?",
    ],
    modelAnswer: "Oui, j'adorerais voyager beaucoup plus. J'aimerais visiter le Canada pour ses grands espaces sauvages et le bilinguisme anglais-français. J'aimerais aussi découvrir le Maroc pour sa culture riche et sa cuisine épicée. À long terme, je rêve de faire le tour du monde. Je crois que voyager ouvre l'esprit, permet de découvrir d'autres cultures et aide à comprendre le monde dans lequel on vit.",
    keyVocab: [
      { fr: "les grands espaces", en: "wide open spaces" },
      { fr: "le bilinguisme", en: "bilingualism" },
      { fr: "épicé(e)", en: "spicy" },
      { fr: "ouvrir l'esprit", en: "to broaden the mind" },
      { fr: "à long terme", en: "in the long term" },
      { fr: "rêver de", en: "to dream of" },
    ],
  },

  // ── LA MAISON ─────────────────────────────────────────────────────────────
  {
    id: "hom_01",
    topicKey: "home",
    text: "Décris ta maison ou ton appartement.",
    hint: "Describe rooms, size, location, what you like or dislike about it.",
    difficulty: 1,
    followUps: [
      "Ta chambre est comment ?",
      "Est-ce que tu partages une chambre avec quelqu'un ?",
      "Qu'est-ce que tu ferais si tu pouvais refaire ta chambre ?",
    ],
    modelAnswer: "J'habite dans une maison semi-individuelle en banlieue. C'est une maison à deux étages avec quatre chambres, un salon, une cuisine moderne et un jardin. J'aime beaucoup notre jardin parce qu'on y passe du temps en été. Ma chambre se trouve au premier étage — elle est assez grande avec un bureau, une armoire et mon lit. Je l'ai décorée avec des affiches de mes groupes préférés. Je me sens vraiment bien chez moi.",
    keyVocab: [
      { fr: "semi-individuel(le)", en: "semi-detached" },
      { fr: "en banlieue", en: "in the suburbs" },
      { fr: "à deux étages", en: "two-storey" },
      { fr: "le premier étage", en: "the first floor (UK: first floor)" },
      { fr: "une armoire", en: "a wardrobe" },
      { fr: "une affiche", en: "a poster" },
    ],
  },
  {
    id: "hom_02",
    topicKey: "home",
    text: "Comment est la ville ou le village où tu habites ?",
    hint: "Describe your area — facilities, atmosphere, pros and cons for young people.",
    difficulty: 2,
    followUps: [
      "Est-ce qu'il y a des problèmes dans ta ville ?",
      "Qu'est-ce qui manque dans ta ville pour les jeunes ?",
      "Tu préférerais habiter à la campagne ou en ville ? Pourquoi ?",
    ],
    modelAnswer: "J'habite dans une ville de taille moyenne dans le nord de l'Angleterre. Il y a un centre commercial, plusieurs parcs, des cinémas et de bonnes liaisons de transport. Pour les jeunes, il y a un centre sportif et des clubs. Cependant, il manque des espaces culturels comme des musées ou des galeries d'art. La ville est sûre et propre en général. Personnellement, je l'aime bien, même si parfois je préfèrerais vivre dans une grande ville comme Londres.",
    keyVocab: [
      { fr: "de taille moyenne", en: "medium-sized" },
      { fr: "les liaisons de transport", en: "transport links" },
      { fr: "il manque", en: "there is a lack of" },
      { fr: "sûr(e)", en: "safe" },
      { fr: "propre", en: "clean" },
      { fr: "une galerie d'art", en: "an art gallery" },
    ],
  },
  {
    id: "hom_03",
    topicKey: "home",
    text: "Qu'est-ce qu'il y a à faire pour les jeunes dans ta région ?",
    hint: "Talk about leisure options — what's available, what's missing, what you'd add.",
    difficulty: 2,
    followUps: [
      "Est-ce que tu penses que ta ville fait assez pour les jeunes ?",
      "Quel type de centre jeunesse tu aimerais voir dans ta ville ?",
      "Les transports en commun sont-ils bien développés dans ta région ?",
    ],
    modelAnswer: "Dans ma région, il y a assez de choses à faire pour les jeunes. Il y a un parc aquatique, plusieurs terrains de sport, une patinoire et des cafés. Le week-end, beaucoup de jeunes se retrouvent dans le parc ou au centre commercial. Cependant, je pense qu'il manque un espace artistique — un endroit où les jeunes pourraient faire de la danse, du théâtre ou des arts visuels. Ce serait vraiment bénéfique pour la communauté.",
    keyVocab: [
      { fr: "un parc aquatique", en: "a water park" },
      { fr: "une patinoire", en: "an ice rink" },
      { fr: "les arts visuels", en: "visual arts" },
      { fr: "la communauté", en: "the community" },
      { fr: "bénéfique", en: "beneficial" },
      { fr: "un endroit", en: "a place / spot" },
    ],
  },

  // ── L'AVENIR ──────────────────────────────────────────────────────────────
  {
    id: "fut_01",
    topicKey: "future",
    text: "Qu'est-ce que tu veux faire dans l'avenir ?",
    hint: "Discuss future career or study plans. Use future tense and conditional.",
    difficulty: 2,
    followUps: [
      "Pourquoi tu as choisi cette carrière ?",
      "Qu'est-ce que tu dois faire pour réaliser ce rêve ?",
      "Est-ce que tu as un plan B si ça ne marche pas ?",
    ],
    modelAnswer: "Dans l'avenir, j'aimerais devenir médecin. Je suis passionné(e) par les sciences et j'aime aider les autres, donc je pense que c'est la carrière parfaite pour moi. Pour réaliser ce rêve, je devrai obtenir de bonnes notes aux examens et faire des études de médecine pendant plusieurs années. C'est un chemin long et difficile, mais je suis déterminé(e). Si ça ne marche pas, j'envisagerais peut-être une carrière dans la recherche scientifique.",
    keyVocab: [
      { fr: "passionné(e) par", en: "passionate about" },
      { fr: "réaliser", en: "to achieve / fulfil" },
      { fr: "déterminé(e)", en: "determined" },
      { fr: "envisager", en: "to consider / envisage" },
      { fr: "la recherche", en: "research" },
      { fr: "plusieurs années", en: "several years" },
    ],
  },
  {
    id: "fut_02",
    topicKey: "future",
    text: "Tu voudrais aller à l'université ? Pourquoi ou pourquoi pas ?",
    hint: "Give a clear opinion on university with pros/cons and alternatives.",
    difficulty: 3,
    followUps: [
      "Qu'est-ce que tu voudrais étudier à l'université ?",
      "La dette étudiante te fait-elle peur ?",
      "Tu penses que l'apprentissage est une bonne alternative à l'université ?",
    ],
    modelAnswer: "Oui, j'aimerais beaucoup aller à l'université. Je voudrais étudier l'informatique parce que c'est un domaine en pleine croissance avec de nombreuses opportunités. Je sais que les frais de scolarité sont élevés et que l'on accumule des dettes, mais je pense que c'est un investissement dans l'avenir. Cependant, je comprends que l'université n'est pas la bonne voie pour tout le monde — certains préfèrent faire un apprentissage ou créer leur propre entreprise, ce qui est tout à fait valable.",
    keyVocab: [
      { fr: "les frais de scolarité", en: "tuition fees" },
      { fr: "une dette", en: "a debt" },
      { fr: "en pleine croissance", en: "rapidly growing" },
      { fr: "un apprentissage", en: "an apprenticeship" },
      { fr: "une voie", en: "a path / route" },
      { fr: "tout à fait valable", en: "completely valid / worthwhile" },
    ],
  },
  {
    id: "fut_03",
    topicKey: "future",
    text: "Quel métier voudrais-tu faire plus tard ?",
    hint: "Describe your dream job, why it appeals, what skills are needed.",
    difficulty: 2,
    followUps: [
      "Qu'est-ce qui t'a inspiré à vouloir ce métier ?",
      "Quelles qualités faut-il pour réussir dans ce domaine ?",
      "Tu penses que tu seras heureux/heureuse dans ce métier ?",
    ],
    modelAnswer: "Plus tard, je voudrais travailler comme architecte. J'ai toujours été fasciné(e) par les bâtiments et j'adore dessiner. Ce métier me permettrait de combiner ma passion pour l'art et pour les sciences. Pour réussir, il faut être créatif(ve), précis(e) et avoir de bonnes compétences en maths. Je me vois en train de concevoir des bâtiments durables et écologiques — c'est un domaine d'avenir. Je suis convaincu(e) que ce serait un métier épanouissant.",
    keyVocab: [
      { fr: "un bâtiment", en: "a building" },
      { fr: "concevoir", en: "to design / conceive" },
      { fr: "durable", en: "sustainable" },
      { fr: "écologique", en: "eco-friendly / ecological" },
      { fr: "épanouissant(e)", en: "fulfilling / rewarding" },
      { fr: "les compétences", en: "skills" },
    ],
  },

  // ── LA NOURRITURE ─────────────────────────────────────────────────────────
  {
    id: "foo_01",
    topicKey: "food",
    text: "Qu'est-ce que tu manges normalement au déjeuner ?",
    hint: "Describe your typical lunch — what, where, with whom. Include a past example.",
    difficulty: 1,
    followUps: [
      "Tu apportes ton déjeuner de chez toi ou tu manges à la cantine ?",
      "Est-ce que tu penses que l'alimentation des jeunes est saine ?",
      "C'est quoi ton repas préféré de la journée ?",
    ],
    modelAnswer: "En général, je mange à la cantine avec mes amis. Je prends souvent un sandwich au fromage ou un repas chaud comme des pâtes ou du riz avec des légumes. Hier, par exemple, j'ai mangé un curry de poulet avec du riz — c'était vraiment bon. Je bois de l'eau ou du jus d'orange. Je pense qu'il est important de bien manger à midi pour avoir de l'énergie pour les cours de l'après-midi.",
    keyVocab: [
      { fr: "l'alimentation", en: "diet / nutrition" },
      { fr: "sain(e)", en: "healthy" },
      { fr: "les légumes", en: "vegetables" },
      { fr: "un repas chaud", en: "a hot meal" },
      { fr: "avoir de l'énergie", en: "to have energy" },
      { fr: "par exemple", en: "for example" },
    ],
  },
  {
    id: "foo_02",
    topicKey: "food",
    text: "Est-ce que tu fais attention à ta santé ?",
    hint: "Discuss healthy habits — diet, exercise, sleep, screen time. Be honest!",
    difficulty: 2,
    followUps: [
      "Tu fais de l'exercice régulièrement ?",
      "Est-ce que tu manges cinq fruits et légumes par jour ?",
      "La santé mentale est-elle aussi importante que la santé physique, selon toi ?",
    ],
    modelAnswer: "J'essaie de faire attention à ma santé, même si ce n'est pas toujours facile. Je fais du sport trois fois par semaine — principalement du football et de la natation. Concernant l'alimentation, je mange assez équilibré, mais j'avoue que j'aime trop le chocolat et les chips. Je dors environ huit heures par nuit, ce qui est bien. Je pense que la santé mentale est aussi importante que la santé physique — c'est pourquoi je prends le temps de me détendre et de voir mes amis.",
    keyVocab: [
      { fr: "équilibré(e)", en: "balanced" },
      { fr: "j'avoue que", en: "I admit that" },
      { fr: "la natation", en: "swimming" },
      { fr: "principalement", en: "mainly / primarily" },
      { fr: "la santé mentale", en: "mental health" },
      { fr: "c'est pourquoi", en: "that is why" },
    ],
  },
  {
    id: "foo_03",
    topicKey: "food",
    text: "Quel est ton plat préféré ? Est-ce que tu sais le préparer ?",
    hint: "Describe your favourite dish, its ingredients, whether you can cook it.",
    difficulty: 1,
    followUps: [
      "Tu aimes cuisiner ? Qu'est-ce que tu sais faire ?",
      "Quelle cuisine étrangère tu préfères ?",
      "Qu'est-ce que tu manges pour un repas de fête ?",
    ],
    modelAnswer: "Mon plat préféré, c'est la lasagne. J'adore le mélange de sauce bolognaise, de béchamel et de pâtes. Ma mère la prépare souvent le dimanche et toute la famille se retrouve à table. J'ai essayé de la faire moi-même l'année dernière — c'était assez réussi ! En ce qui concerne la cuisine étrangère, j'aime beaucoup la cuisine japonaise, surtout les sushis et les ramens. Je pense que cuisiner est une compétence importante que tout le monde devrait apprendre.",
    keyVocab: [
      { fr: "la sauce bolognaise", en: "bolognese sauce" },
      { fr: "réussi(e)", en: "successful / well done" },
      { fr: "en ce qui concerne", en: "as for / regarding" },
      { fr: "une compétence", en: "a skill" },
      { fr: "tout le monde devrait", en: "everyone should" },
      { fr: "se retrouver à table", en: "to gather at the table" },
    ],
  },

  // ── L'ENVIRONNEMENT ───────────────────────────────────────────────────────
  {
    id: "env_01",
    topicKey: "environment",
    text: "Qu'est-ce que tu fais pour protéger l'environnement ?",
    hint: "Discuss specific eco-friendly actions you take at home, school, or in your community.",
    difficulty: 2,
    followUps: [
      "Penses-tu que les gouvernements font assez pour l'environnement ?",
      "Le changement climatique t'inquiète-t-il ?",
      "Est-ce que tu penses que les individus peuvent vraiment faire une différence ?",
    ],
    modelAnswer: "Je fais plusieurs choses pour protéger l'environnement. Je recycle toujours le papier, le plastique et le verre. Je préfère aller à l'école à vélo plutôt qu'en voiture pour réduire les émissions de carbone. Chez moi, on essaie de réduire la consommation d'énergie en éteignant les lumières. Cependant, je pense que les gouvernements doivent aussi prendre des mesures plus strictes contre la pollution industrielle. Les individus peuvent aider, mais ce n'est pas suffisant seul.",
    keyVocab: [
      { fr: "recycler", en: "to recycle" },
      { fr: "les émissions de carbone", en: "carbon emissions" },
      { fr: "la consommation d'énergie", en: "energy consumption" },
      { fr: "prendre des mesures", en: "to take measures / steps" },
      { fr: "la pollution industrielle", en: "industrial pollution" },
      { fr: "suffisant", en: "sufficient / enough" },
    ],
  },
  {
    id: "env_02",
    topicKey: "environment",
    text: "Est-ce que la technologie joue un rôle important dans ta vie ?",
    hint: "Discuss how technology affects your daily life — positives and negatives.",
    difficulty: 2,
    followUps: [
      "Tu penses que les jeunes sont trop dépendants de la technologie ?",
      "L'intelligence artificielle — est-ce une bonne ou mauvaise chose ?",
      "Comment la technologie a-t-elle changé l'éducation ?",
    ],
    modelAnswer: "Oui, la technologie joue un rôle énorme dans ma vie. J'utilise mon téléphone chaque jour pour communiquer avec mes amis, faire des recherches et écouter de la musique. À l'école, on utilise des tablettes et des ordinateurs pour apprendre. Les avantages sont évidents — accès à l'information, communication facile. Cependant, je pense que la dépendance aux écrans peut être néfaste, surtout pour la santé mentale des jeunes. Il faut trouver un équilibre sain.",
    keyVocab: [
      { fr: "dépendant(e) de", en: "dependent on" },
      { fr: "néfaste", en: "harmful / damaging" },
      { fr: "les avantages", en: "advantages / benefits" },
      { fr: "les inconvénients", en: "disadvantages" },
      { fr: "accès à l'information", en: "access to information" },
      { fr: "un équilibre sain", en: "a healthy balance" },
    ],
  },

  // --- SCHOOL (Continued) ---
  {
    id: "sch_07",
    topicKey: "school",
    text: "Quelle est ta matière la moins préférée et pourquoi ?",
    hint: "Identify your least favorite subject, explain why (boring, difficult, teacher), and compare it to others.",
    difficulty: 1,
    followUps: [
      "Est-ce que tu penses que c'est une matière importante ?",
      "Est-ce que tes parents sont d'accord avec toi ?",
      "Depuis combien de temps est-ce que tu étudies cette matière ?"
    ],
    modelAnswer: "Ma matière la moins préférée est la physique. Je trouve que c'est extrêmement difficile et je ne comprends pas toujours les formules complexes. À mon avis, c'est un peu barbant par rapport aux langues vivantes comme le français ou l'espagnol, qui sont plus interactives. Bien que je sache que les sciences sont essentielles pour certaines carrières, je préfère nettement les matières littéraires.",
    keyVocab: [
      { fr: "la moins préférée", en: "least favorite" },
      { fr: "barbant(e)", en: "boring / tedious" },
      { fr: "les formules", en: "formulas" },
      { fr: "par rapport à", en: "compared to" },
      { fr: "les matières littéraires", en: "humanities / literary subjects" },
      { fr: "nettement", en: "clearly / much" }
    ],
  },
  {
    id: "sch_08",
    topicKey: "school",
    text: "Décris un professeur que tu admires.",
    hint: "Describe a teacher you admire — their subject, personality, and why they are a good teacher.",
    difficulty: 2,
    followUps: [
      "Quelles sont les qualités d'un bon professeur selon toi ?",
      "Est-ce que tu aimerais être professeur un jour ?",
      "Comment ce professeur aide-t-il les élèves ?"
    ],
    modelAnswer: "J'admire énormément mon professeur d'histoire, Monsieur Martin. Il est passionné par sa matière et il raconte les événements historiques comme si c'étaient des histoires passionnantes. Il est toujours patient et prend le temps d'expliquer les choses quand on ne comprend pas. Grâce à lui, j'ai fait beaucoup de progrès cette année. Il nous encourage à donner notre avis et à être critiques, ce que je trouve très motivant.",
    keyVocab: [
      { fr: "admirer", en: "to admire" },
      { fr: "faire des progrès", en: "to make progress" },
      { fr: "passionnant(e)", en: "exciting / fascinating" },
      { fr: "encourager", en: "to encourage" },
      { fr: "donner son avis", en: "to give one's opinion" },
      { fr: "grâce à", en: "thanks to" }
    ],
  },
  {
    id: "sch_09",
    topicKey: "school",
    text: "Que penses-tu du règlement scolaire ?",
    hint: "Discuss school rules — uniform, phone usage, punctuality — and give your opinion on whether they are fair.",
    difficulty: 2,
    followUps: [
      "Quelle règle est la plus difficile à suivre ?",
      "Est-ce que tu penses que l'uniforme est une bonne idée ?",
      "Qu'est-ce qui se passe si on ne respecte pas les règles ?"
    ],
    modelAnswer: "À mon avis, le règlement scolaire est nécessaire pour maintenir la discipline, mais certaines règles sont trop strictes. Par exemple, il est interdit d'utiliser nos téléphones portables même pendant la récréation, ce qui est frustrant. Cependant, je comprends l'importance de la ponctualité et du respect envers les professeurs. Quant à l'uniforme, je pense que c'est une bonne chose car cela réduit les inégalités sociales entre les élèves.",
    keyVocab: [
      { fr: "le règlement scolaire", en: "school rules / regulations" },
      { fr: "maintenir la discipline", en: "to maintain discipline" },
      { fr: "interdit", en: "forbidden / prohibited" },
      { fr: "la ponctualité", en: "punctuality" },
      { fr: "les inégalités", en: "inequalities" },
      { fr: "frustrant(e)", en: "frustrating" }
    ],
  },
  {
    id: "sch_10",
    topicKey: "school",
    text: "Si tu étais le proviseur, qu'est-ce que tu changerais ?",
    hint: "Use conditional tense to describe changes you would make to school life, facilities, or schedule.",
    difficulty: 3,
    followUps: [
      "Est-ce que tu changerais les horaires scolaires ?",
      "Quelles nouvelles installations ferais-tu construire ?",
      "Est-ce que tu penses que les élèves seraient plus heureux avec ces changements ?"
    ],
    modelAnswer: "Si j'étais le proviseur, je changerais plusieurs choses pour améliorer le bien-être des élèves. Tout d'abord, je raccourcirais les journées scolaires car je trouve qu'on finit trop tard. Ensuite, je ferais construire une nouvelle salle de détente avec des canapés et des jeux. Enfin, j'abolirais l'uniforme scolaire pour permettre aux élèves d'exprimer leur personnalité. Je crois que ces mesures rendraient l'école plus attrayante et moins stressante pour tout le monde.",
    keyVocab: [
      { fr: "le proviseur", en: "the headteacher" },
      { fr: "raccourcir", en: "to shorten" },
      { fr: "une salle de détente", en: "a common room / relaxation room" },
      { fr: "abolir", en: "to abolish" },
      { fr: "exprimer sa personnalité", en: "to express one's personality" },
      { fr: "attrayant(e)", en: "attractive / appealing" }
    ],
  },

  // --- HOBBIES (Continued) ---
  {
    id: "hob_06",
    topicKey: "hobbies",
    text: "Qu'est-ce que tu as fait le week-end dernier pour te détendre ?",
    hint: "Describe your recent weekend activities using the past tense (passé composé).",
    difficulty: 2,
    followUps: [
      "Avec qui as-tu passé ton temps ?",
      "Est-ce que tu as fait tes devoirs aussi ?",
      "Quel était le meilleur moment de ton week-end ?"
    ],
    modelAnswer: "Le week-end dernier, j'ai décidé de me reposer après une semaine chargée. Samedi matin, je suis allé courir dans le parc pour prendre l'air. L'après-midi, j'ai retrouvé mes amis au centre-ville et nous avons regardé un nouveau film de science-fiction au cinéma. Dimanche, j'ai passé la journée à lire un roman et j'ai cuisiné un gâteau avec ma mère. C'était un week-end très relaxant et j'ai pu recharger mes batteries.",
    keyVocab: [
      { fr: "se détendre / se reposer", en: "to relax / to rest" },
      { fr: "prendre l'air", en: "to get some fresh air" },
      { fr: "recharger ses batteries", en: "to recharge one's batteries" },
      { fr: "une semaine chargée", en: "a busy week" },
      { fr: "retrouver des amis", en: "to meet up with friends" },
      { fr: "cuisiner", en: "to cook" }
    ],
  },
  {
    id: "hob_07",
    topicKey: "hobbies",
    text: "Est-ce qu'il y a une activité que tu aimerais essayer à l'avenir ?",
    hint: "Talk about a new hobby or sport you want to try, explain why it interests you.",
    difficulty: 2,
    followUps: [
      "Pourquoi est-ce que tu ne l'as pas encore fait ?",
      "Est-ce que c'est une activité dangereuse ou chère ?",
      "Tu préférerais l'essayer seul ou avec des amis ?"
    ],
    modelAnswer: "À l'avenir, j'aimerais vraiment essayer le surf. J'ai toujours été fasciné par l'océan et je pense que ce serait une expérience incroyable. Je voudrais aller en France, peut-être à Biarritz, pour prendre des cours pendant les vacances d'été. C'est un sport qui semble difficile mais très gratifiant. Bien que ce soit un peu cher à cause de l'équipement, je crois que les sensations fortes en valent la peine.",
    keyVocab: [
      { fr: "essayer", en: "to try" },
      { fr: "gratifiant(e)", en: "rewarding" },
      { fr: "les sensations fortes", en: "thrills" },
      { fr: "en valoir la peine", en: "to be worth it" },
      { fr: "l'équipement", en: "equipment" },
      { fr: "fasciné(e) par", en: "fascinated by" }
    ],
  },
  {
    id: "hob_08",
    topicKey: "hobbies",
    text: "Tu préfères les sports individuels ou d'équipe ?",
    hint: "Compare individual and team sports, giving advantages and disadvantages of each.",
    difficulty: 1,
    followUps: [
      "Quel sport d'équipe est le plus populaire dans ton pays ?",
      "Est-ce que tu es quelqu'un de compétitif ?",
      "Quel sport individuel aimerais-tu pratiquer ?"
    ],
    modelAnswer: "Je préfère nettement les sports d'équipe comme le basket ou le rugby. Ce que j'aime par-dessus tout, c'est l'esprit de camaraderie et le fait de travailler ensemble pour atteindre un but commun. Les sports individuels, comme le tennis, peuvent être intéressants car on apprend la discipline personnelle, mais je trouve cela un peu solitaire. Pour moi, le sport est avant tout un moyen de socialiser et de s'amuser avec les autres.",
    keyVocab: [
      { fr: "un sport d'équipe", en: "a team sport" },
      { fr: "par-dessus tout", en: "above all" },
      { fr: "la camaraderie", en: "camaraderie / friendship" },
      { fr: "un but commun", en: "a common goal" },
      { fr: "solitaire", en: "lonely / solitary" },
      { fr: "socialiser", en: "to socialise" }
    ],
  },
  {
    id: "hob_09",
    topicKey: "hobbies",
    text: "Est-ce que tu penses que les jeunes passent trop de temps sur leurs écrans ?",
    hint: "Discuss the impact of technology and social media on young people's leisure time.",
    difficulty: 3,
    followUps: [
      "Quels sont les dangers des réseaux sociaux ?",
      "Est-ce que tu utilises souvent ton téléphone portable ?",
      "Comment peut-on encourager les jeunes à sortir plus ?"
    ],
    modelAnswer: "Il est indéniable que les jeunes passent énormément de temps devant les écrans, que ce soit sur les réseaux sociaux ou en jouant aux jeux vidéo. D'un côté, c'est un excellent moyen de rester connecté avec le monde. De l'autre côté, cela peut nuire à la santé physique et réduire les interactions réelles. Je pense qu'il est crucial de limiter ce temps pour favoriser des activités plus actives et créatives. Un équilibre est nécessaire pour éviter la dépendance numérique.",
    keyVocab: [
      { fr: "indéniable", en: "undeniable" },
      { fr: "énormément", en: "enormously / a lot" },
      { fr: "nuire à", en: "to harm / be harmful to" },
      { fr: "crucial(e)", en: "crucial" },
      { fr: "favoriser", en: "to encourage / promote" },
      { fr: "la dépendance numérique", en: "digital addiction" }
    ],
  },

  // --- FAMILY (Continued) ---
  {
    id: "fam_05",
    topicKey: "family",
    text: "Est-ce que tu as un animal domestique ? Décris-le.",
    hint: "Describe your pet (or one you would like), its name, appearance, and personality.",
    difficulty: 1,
    followUps: [
      "Qui s'occupe de l'animal chez toi ?",
      "Est-ce qu'il est important pour les enfants d'avoir un animal ?",
      "Où dort ton animal ?"
    ],
    modelAnswer: "Oui, j'ai un petit chien qui s'appelle Rex. C'est un terrier avec des poils blancs et frisés. Il est extrêmement énergique et adore jouer à la balle dans le jardin. Je m'en occupe tous les jours : je lui donne à manger et je le promène après l'école. Il fait vraiment partie de la famille et il nous rend tous très heureux. Si je ne pouvais pas avoir de chien, j'aimerais bien avoir un chat parce qu'ils sont plus indépendants.",
    keyVocab: [
      { fr: "un animal domestique", en: "a pet" },
      { fr: "frisé(e)", en: "curly" },
      { fr: "s'occuper de", en: "to look after" },
      { fr: "donner à manger", en: "to feed" },
      { fr: "promener", en: "to walk (an animal)" },
      { fr: "faire partie de", en: "to be part of" }
    ],
  },
  {
    id: "fam_06",
    topicKey: "family",
    text: "Comment est-ce que tu aides tes parents à la maison ?",
    hint: "Talk about household chores you do to help your family.",
    difficulty: 1,
    followUps: [
      "Est-ce que tu reçois de l'argent de poche pour ton aide ?",
      "Quelle tâche ménagère détestes-tu le plus ?",
      "Est-ce que tes frères ou sœurs aident aussi ?"
    ],
    modelAnswer: "Pour aider mes parents, je fais plusieurs petites tâches ménagères chaque semaine. Par exemple, je dois ranger ma chambre tous les matins et mettre la table pour le dîner. Le week-end, j'aide souvent mon père à laver la voiture ou à passer l'aspirateur dans le salon. Je pense qu'il est juste de partager les corvées pour que tout le monde ait du temps libre. Même si c'est parfois ennuyeux, c'est important d'être responsable.",
    keyVocab: [
      { fr: "les tâches ménagères", en: "household chores" },
      { fr: "ranger", en: "to tidy up" },
      { fr: "mettre la table", en: "to set the table" },
      { fr: "passer l'aspirateur", en: "to hoover / vacuum" },
      { fr: "les corvées", en: "chores" },
      { fr: "juste", en: "fair" }
    ],
  },
  {
    id: "fam_07",
    topicKey: "family",
    text: "Qu'est-ce que tu as fait avec ta famille récemment ?",
    hint: "Describe a recent family outing or activity using the past tense.",
    difficulty: 2,
    followUps: [
      "C'était à quelle occasion ?",
      "Quel temps faisait-il ?",
      "Qu'est-ce que vous allez faire le week-end prochain ?"
    ],
    modelAnswer: "Le week-end dernier, nous sommes allés au bord de la mer pour fêter l'anniversaire de ma grand-mère. Nous avons déjeuné dans un petit restaurant traditionnel qui servait des fruits de mer délicieux. Après le repas, nous nous sommes promenés sur la plage malgré le vent assez fort. C'était une excellente journée car nous avons pu passer du temps de qualité ensemble et discuter de plein de choses. J'adore ces moments en famille car ils renforcent nos liens.",
    keyVocab: [
      { fr: "fêter", en: "to celebrate" },
      { fr: "les fruits de mer", en: "seafood" },
      { fr: "malgré", en: "despite" },
      { fr: "temps de qualité", en: "quality time" },
      { fr: "renforcer les liens", en: "to strengthen bonds" },
      { fr: "se promener", en: "to go for a walk" }
    ],
  },
  {
    id: "fam_08",
    topicKey: "family",
    text: "Est-il plus important d'avoir beaucoup d'amis ou quelques amis proches ?",
    hint: "Express and justify your opinion on friendship, quality vs quantity.",
    difficulty: 3,
    followUps: [
      "Comment as-tu rencontré ton meilleur ami ?",
      "Qu'est-ce que tu fais quand tu as un désaccord avec un ami ?",
      "Peut-on rester ami avec quelqu'un qui vit loin ?"
    ],
    modelAnswer: "Selon moi, il est bien plus important d'avoir quelques amis proches que d'avoir une multitude de connaissances. Les vrais amis sont ceux sur qui on peut compter dans les moments difficiles et avec qui on peut être soi-même. Une amitié profonde demande du temps et de la confiance, ce qui est impossible à maintenir avec trop de personnes. Je préfère avoir deux ou trois amis fidèles plutôt que des centaines d'amis sur les réseaux sociaux qui ne me connaissent pas vraiment.",
    keyVocab: [
      { fr: "une multitude de", en: "a multitude of" },
      { fr: "les connaissances", en: "acquaintances" },
      { fr: "compter sur", en: "to rely on" },
      { fr: "être soi-même", en: "to be oneself" },
      { fr: "fidèle", en: "loyal / faithful" },
      { fr: "la confiance", en: "trust" }
    ],
  },

  // --- HOLIDAYS (Continued) ---
  {
    id: "hol_05",
    topicKey: "holidays",
    text: "Où vas-tu passer tes prochaines vacances ?",
    hint: "Use future tense to describe your upcoming holiday plans.",
    difficulty: 1,
    followUps: [
      "Avec qui vas-tu partir ?",
      "Qu'est-ce que tu vas mettre dans ta valise ?",
      "Est-ce que tu as hâte d'y aller ?"
    ],
    modelAnswer: "Pour mes prochaines vacances, je vais aller en Italie avec mes parents et mon frère. Nous allons passer une semaine à Rome pour visiter les monuments historiques comme le Colisée. J'ai vraiment hâte de goûter aux vraies pizzas italiennes et de voir les musées. Nous allons loger dans un petit appartement près du centre-ville pour être proches de tout. Ce sera fantastique car j'adore l'histoire et la culture méditerranéenne.",
    keyVocab: [
      { fr: "prochain(e)", en: "next" },
      { fr: "avoir hâte de", en: "to look forward to" },
      { fr: "loger", en: "to stay / lodge" },
      { fr: "une valise", en: "a suitcase" },
      { fr: "près de", en: "near to" },
      { fr: "fantastique", en: "fantastic" }
    ],
  },
  {
    id: "hol_06",
    topicKey: "holidays",
    text: "Tu préfères partir en vacances avec ta famille ou avec tes amis ? Pourquoi ?",
    hint: "Compare traveling with family vs. friends, mentioning pros and cons.",
    difficulty: 2,
    followUps: [
      "Est-ce que tu as déjà voyagé sans tes parents ?",
      "Quelles sont les activités que tu préfères faire avec tes amis ?",
      "Qui paie pour tes vacances d'habitude ?"
    ],
    modelAnswer: "C'est une question difficile. J'aime partir avec ma famille car mes parents paient pour tout et nous allons souvent dans des hôtels confortables. C'est plus relaxant et sûr. Cependant, je préfère partir avec mes amis car on a plus de liberté et on peut faire des activités plus dynamiques. On a les mêmes goûts et on s'amuse beaucoup plus. Dans l'idéal, j'aimerais faire un petit voyage avec mes amis l'été prochain pour fêter la fin des examens.",
    keyVocab: [
      { fr: "d'habitude", en: "usually" },
      { fr: "confortable", en: "comfortable" },
      { fr: "la liberté", en: "freedom" },
      { fr: "dynamique", en: "dynamic / energetic" },
      { fr: "les mêmes goûts", en: "the same tastes" },
      { fr: "s'amuser", en: "to have fun" }
    ],
  },
  {
    id: "hol_07",
    topicKey: "holidays",
    text: "Parle-moi d'une ville française que tu aimerais visiter.",
    hint: "Choose a French city (Paris, Nice, Lyon, etc.) and explain why you want to go there.",
    difficulty: 2,
    followUps: [
      "Est-ce que tu connais déjà la France ?",
      "Quels monuments voudrais-tu voir ?",
      "Est-ce que tu aimerais y habiter un jour ?"
    ],
    modelAnswer: "J'aimerais beaucoup visiter Nice, dans le sud de la France. J'ai vu des photos de la Promenade des Anglais et je trouve ça magnifique. La mer est d'un bleu incroyable et j'adore le climat ensoleillé. Je voudrais aussi explorer le vieux Nice pour goûter les spécialités locales comme la socca. À mon avis, c'est la destination parfaite pour combiner culture et détente au bord de la Méditerranée.",
    keyVocab: [
      { fr: "ensoleillé(e)", en: "sunny" },
      { fr: "magnifique", en: "magnificent / beautiful" },
      { fr: "explorer", en: "to explore" },
      { fr: "les spécialités locales", en: "local specialities" },
      { fr: "en bord de", en: "on the edge of" },
      { fr: "le climat", en: "the climate" }
    ],
  },
  {
    id: "hol_08",
    topicKey: "holidays",
    text: "Quels sont les avantages et les inconvénients du tourisme ?",
    hint: "Discuss the impact of tourism on the economy and the environment.",
    difficulty: 3,
    followUps: [
      "Est-ce que ta région est touristique ?",
      "Que penses-tu du tourisme de masse ?",
      "Comment peut-on être un touriste responsable ?"
    ],
    modelAnswer: "Le tourisme a des avantages considérables, notamment pour l'économie locale car il crée des emplois et apporte de l'argent. Cela permet aussi de découvrir de nouvelles cultures. Cependant, il y a des inconvénients majeurs comme la pollution et la dégradation des sites historiques. Le tourisme de masse peut transformer des villes paisibles en endroits bruyants et chers. Je pense qu'il est essentiel de promouvoir un tourisme plus durable et respectueux de l'environnement pour protéger notre planète.",
    keyVocab: [
      { fr: "considérable", en: "considerable / significant" },
      { fr: "notamment", en: "notably / especially" },
      { fr: "apporter", en: "to bring" },
      { fr: "majeur(e)", en: "major" },
      { fr: "le tourisme de masse", en: "mass tourism" },
      { fr: "paisible", en: "peaceful" }
    ],
  },

  // --- HOME (Continued) ---
  {
    id: "hom_04",
    topicKey: "home",
    text: "Comment est ta chambre idéale ?",
    hint: "Use conditional tense to describe your dream bedroom — furniture, colors, technology.",
    difficulty: 2,
    followUps: [
      "Quelle est ta couleur préférée pour une chambre ?",
      "Est-ce que tu préférerais avoir une grande fenêtre ou un balcon ?",
      "Où serait située cette chambre ?"
    ],
    modelAnswer: "Ma chambre idéale serait très spacieuse et lumineuse. Les murs seraient peints en bleu clair et il y aurait une grande baie vitrée donnant sur la mer. J'aurais un lit immense et très confortable, ainsi qu'un système de son haute fidélité pour écouter ma musique. Il y aurait aussi un coin lecture avec un fauteuil moelleux et une bibliothèque remplie de livres. Ce serait mon refuge personnel où je pourrais me détendre en toute tranquillité.",
    keyVocab: [
      { fr: "spacieux / spacieuse", en: "spacious" },
      { fr: "lumineux / lumineuse", en: "bright / luminous" },
      { fr: "une baie vitrée", en: "a large glass door / window" },
      { fr: "moelleux / moelleuse", en: "soft / plush" },
      { fr: "un refuge", en: "a refuge / hideaway" },
      { fr: "en toute tranquillité", en: "in total peace" }
    ],
  },
  {
    id: "hom_05",
    topicKey: "home",
    text: "Où voudrais-tu habiter plus tard ?",
    hint: "Talk about your future home location — city, countryside, abroad — and give reasons.",
    difficulty: 2,
    followUps: [
      "Préférerais-tu habiter dans une maison moderne ou ancienne ?",
      "Est-ce que tu aimerais habiter près de ta famille ?",
      "Quels sont les avantages d'habiter à l'étranger ?"
    ],
    modelAnswer: "Plus tard, j'aimerais habiter à l'étranger, peut-être au Canada ou en France. J'aime l'idée de découvrir une nouvelle culture et de pratiquer une autre langue au quotidien. Je préférerais vivre dans une grande ville dynamique car il y a toujours quelque chose à faire : des musées, des cinémas et des restaurants. Cependant, j'aimerais que ma maison soit dans un quartier calme et vert. C'est important pour moi d'avoir un équilibre entre l'agitation urbaine et la tranquillité de la nature.",
    keyVocab: [
      { fr: "à l'étranger", en: "abroad" },
      { fr: "au quotidien", en: "on a daily basis" },
      { fr: "un quartier", en: "a neighborhood / district" },
      { fr: "l'agitation urbaine", en: "urban bustle" },
      { fr: "un équilibre", en: "a balance" },
      { fr: "vert(e)", en: "green / leafy" }
    ],
  },
  {
    id: "hom_06",
    topicKey: "home",
    text: "Qu'est-ce que tu as fait dans ta ville le week-end dernier ?",
    hint: "Describe your recent activities in your local area using the past tense.",
    difficulty: 2,
    followUps: [
      "Est-ce que tu es allé au centre commercial ?",
      "Avec qui étais-tu ?",
      "Est-ce que tu as mangé en ville ?"
    ],
    modelAnswer: "Le week-end dernier, je suis allé au centre-ville avec mon meilleur ami. Nous avons d'abord visité une nouvelle exposition d'art moderne à la galerie municipale, ce qui était très intéressant. Ensuite, nous avons mangé un burger dans un petit café sympa. L'après-midi, nous avons fait un peu de lèche-vitrines avant d'aller voir un match de foot au stade local. C'était une journée très animée et j'ai beaucoup apprécié l'ambiance de la ville.",
    keyVocab: [
      { fr: "une exposition", en: "an exhibition" },
      { fr: "faire du lèche-vitrines", en: "to go window-shopping" },
      { fr: "animé(e)", en: "busy / lively" },
      { fr: "l'ambiance", en: "atmosphere" },
      { fr: "apprécier", en: "to enjoy / appreciate" },
      { fr: "ensuite", en: "then / afterwards" }
    ],
  },
  {
    id: "hom_07",
    topicKey: "home",
    text: "Préfères-tu vivre dans une maison ou dans un appartement ? Pourquoi ?",
    hint: "Compare houses and apartments, giving your preference and reasons.",
    difficulty: 1,
    followUps: [
      "Quels sont les avantages d'avoir un jardin ?",
      "Est-ce que c'est plus facile de nettoyer un appartement ?",
      "Où habites-tu en ce moment ?"
    ],
    modelAnswer: "Je préfère nettement vivre dans une maison. L'avantage principal est d'avoir plus d'espace et, surtout, un jardin où l'on peut faire des barbecues en été ou jouer avec son chien. Dans un appartement, on a souvent des voisins bruyants au-dessus ou en-dessous, ce qui peut être agaçant. Cependant, je reconnais que les appartements sont souvent situés plus près du centre-ville, ce qui est pratique pour les transports. Mais pour moi, l'indépendance d'une maison est primordiale.",
    keyVocab: [
      { fr: "principal(e)", en: "main / principal" },
      { fr: "au-dessus", en: "above" },
      { fr: "en-dessous", en: "below" },
      { fr: "agaçant(e)", en: "annoying" },
      { fr: "pratique", en: "practical / convenient" },
      { fr: "primordial(e)", en: "essential / paramount" }
    ],
  },

  // --- FUTURE (Continued) ---
  {
    id: "fut_04",
    topicKey: "future",
    text: "Qu'est-ce que tu vas faire l'année prochaine après tes examens ?",
    hint: "Talk about your immediate post-exam plans — holidays, summer job, next year's studies.",
    difficulty: 2,
    followUps: [
      "Est-ce que tu vas continuer à étudier les mêmes matières ?",
      "Vas-tu prendre une année sabbatique ?",
      "Qu'est-ce que tes parents pensent de tes projets ?"
    ],
    modelAnswer: "Après mes examens, je vais d'abord prendre de longues vacances pour me reposer. J'ai l'intention de partir en voyage avec mes amis en Europe, peut-être en faisant du camping. En septembre, je vais retourner au lycée pour commencer mon baccalauréat. Je vais me spécialiser en mathématiques, physique et informatique car je veux devenir ingénieur plus tard. J'ai un peu peur de la charge de travail, mais je suis motivé pour réussir mes études supérieures.",
    keyVocab: [
      { fr: "avoir l'intention de", en: "to intend to" },
      { fr: "le lycée", en: "sixth form / high school" },
      { fr: "se spécialiser en", en: "to specialise in" },
      { fr: "la charge de travail", en: "workload" },
      { fr: "les études supérieures", en: "higher education / university" },
      { fr: "réussir", en: "to succeed" }
    ],
  },
  {
    id: "fut_05",
    topicKey: "future",
    text: "Est-ce que tu voudrais travailler à l'étranger un jour ?",
    hint: "Discuss the pros and cons of working in another country, mention a specific place if you have one in mind.",
    difficulty: 2,
    followUps: [
      "Dans quel pays aimerais-tu travailler ?",
      "Quelles sont les difficultés de travailler dans une autre langue ?",
      "Est-ce que ta famille te manquerait ?"
    ],
    modelAnswer: "Oui, c'est un de mes rêves. J'aimerais beaucoup travailler aux États-Unis ou en Australie. Je pense que c'est une opportunité fantastique de découvrir une nouvelle culture de travail et d'élargir ses horizons. Travailler à l'étranger permet d'apprendre à être plus indépendant et adaptable. Certes, ma famille me manquerait, mais avec la technologie d'aujourd'hui, il est facile de rester en contact. Je crois que c'est une expérience qui enrichit énormément la vie professionnelle et personnelle.",
    keyVocab: [
      { fr: "un rêve", en: "a dream" },
      { fr: "élargir ses horizons", en: "to broaden one's horizons" },
      { fr: "adaptable", en: "adaptable" },
      { fr: "certes", en: "admittedly / certainly" },
      { fr: "manquer à quelqu'un", en: "to be missed by someone" },
      { fr: "enrichir", en: "to enrich" }
    ],
  },
  {
    id: "fut_06",
    topicKey: "future",
    text: "Quel est l'emploi de tes rêves et pourquoi ?",
    hint: "Describe your ideal job, what you'd do daily, and why it's your dream.",
    difficulty: 2,
    followUps: [
      "Quelles études dois-tu faire pour cet emploi ?",
      "Est-ce que c'est un métier bien payé ?",
      "Est-ce que c'est un métier stressant ?"
    ],
    modelAnswer: "L'emploi de mes rêves serait d'être journaliste sportif. J'adore le sport et j'aime écrire, donc ce serait la combinaison parfaite. Je voyagerais partout dans le monde pour couvrir des événements comme les Jeux Olympiques ou la Coupe du Monde de football. Je rencontrerais des athlètes célèbres et je partagerais leurs histoires avec le public. C'est un métier passionnant qui demande beaucoup de créativité et de réactivité. Même si c'est parfois stressant, je ne m'ennuierais jamais.",
    keyVocab: [
      { fr: "journaliste sportif", en: "sports journalist" },
      { fr: "partout dans le monde", en: "all over the world" },
      { fr: "couvrir un événement", en: "to cover an event" },
      { fr: "célèbre", en: "famous" },
      { fr: "la réactivité", en: "responsiveness / reactivity" },
      { fr: "s'ennuyer", en: "to be bored" }
    ],
  },

  // --- FOOD (Continued) ---
  {
    id: "foo_04",
    topicKey: "food",
    text: "Qu'est-ce que tu as mangé hier soir ?",
    hint: "Describe your dinner from last night using the past tense.",
    difficulty: 1,
    followUps: [
      "C'était bon ?",
      "Qui a préparé le repas ?",
      "Qu'est-ce que tu as bu avec ton repas ?"
    ],
    modelAnswer: "Hier soir, j'ai mangé un repas délicieux avec ma famille à la maison. Ma mère a préparé un poulet rôti avec des pommes de terre au four et des haricots verts. En dessert, nous avons mangé une salade de fruits frais. C'était très savoureux et nous avons passé un bon moment à discuter de notre journée. Pour boire, j'ai pris un grand verre d'eau minérale. J'essaie de manger sainement le soir pour mieux dormir ensuite.",
    keyVocab: [
      { fr: "le poulet rôti", en: "roast chicken" },
      { fr: "les pommes de terre", en: "potatoes" },
      { fr: "au four", en: "baked / in the oven" },
      { fr: "savoureux / savoureuse", en: "tasty / flavourful" },
      { fr: "frais / fraîche", en: "fresh" },
      { fr: "sainement", en: "healthily" }
    ],
  },
  {
    id: "foo_05",
    topicKey: "food",
    text: "Est-ce que tu préfères manger à la maison ou au restaurant ?",
    hint: "Compare eating at home and dining out, giving reasons for your preference.",
    difficulty: 2,
    followUps: [
      "Quel est ton restaurant préféré ?",
      "Est-ce que tu aimes cuisiner ?",
      "Est-ce que c'est plus cher de manger au restaurant ?"
    ],
    modelAnswer: "D'un côté, j'aime manger au restaurant parce qu'on peut découvrir de nouveaux plats et on n'a pas besoin de faire la vaisselle après ! L'ambiance est souvent sympa et c'est une occasion spéciale. D'un autre côté, je préfère manger à la maison car c'est plus économique et, à mon avis, plus sain car on sait exactement ce qu'il y a dans notre assiette. Ma mère cuisine très bien, donc je suis souvent plus content de manger ses plats que ceux d'un restaurant.",
    keyVocab: [
      { fr: "faire la vaisselle", en: "to do the dishes" },
      { fr: "une occasion spéciale", en: "a special occasion" },
      { fr: "économique", en: "economical / cheap" },
      { fr: "dans notre assiette", en: "on our plate" },
      { fr: "cuisiner", en: "to cook" },
      { fr: "à mon avis", en: "in my opinion" }
    ],
  },
  {
    id: "foo_06",
    topicKey: "food",
    text: "Qu'est-ce que tu penses des fast-foods ?",
    hint: "Give your opinion on fast food — convenience vs. health concerns.",
    difficulty: 2,
    followUps: [
      "À quelle fréquence manges-tu du fast-food ?",
      "Quel est ton fast-food préféré ?",
      "Pourquoi les jeunes aiment-ils tant le fast-food ?"
    ],
    modelAnswer: "Je pense que les fast-foods sont très pratiques quand on est pressé ou quand on veut manger quelque chose de rapide et pas cher avec ses amis. Cependant, je sais que ce n'est pas bon pour la santé car c'est souvent trop gras, trop sucré et trop salé. Si on en mange trop souvent, on risque de prendre du poids et d'avoir des problèmes de santé. Personnellement, j'en mange rarement, peut-être une fois par mois, car je préfère une alimentation équilibrée.",
    keyVocab: [
      { fr: "être pressé(e)", en: "to be in a hurry" },
      { fr: "pas cher", en: "cheap" },
      { fr: "gras", en: "fatty / oily" },
      { fr: "sucré", en: "sugary" },
      { fr: "salé", en: "salty" },
      { fr: "prendre du poids", en: "to gain weight" }
    ],
  },
  {
    id: "foo_07",
    topicKey: "food",
    text: "Est-il important d'apprendre à cuisiner à l'école ?",
    hint: "Discuss whether cooking should be a mandatory subject in school.",
    difficulty: 3,
    followUps: [
      "Est-ce que tu avez des cours de cuisine dans ton école ?",
      "Quelles sont les autres compétences essentielles qu'on devrait apprendre ?",
      "Sais-tu préparer un repas complet ?"
    ],
    modelAnswer: "Absolument, je pense que cuisiner est une compétence de vie fondamentale. Apprendre à cuisiner à l'école permettrait aux jeunes de comprendre l'importance d'une alimentation saine et de devenir plus indépendants. Aujourd'hui, beaucoup de gens comptent trop sur les plats préparés qui sont mauvais pour la santé. Si les élèves apprenaient les bases de la cuisine dès le plus jeune âge, ils feraient de meilleurs choix alimentaires à l'avenir. C'est aussi un excellent moyen de découvrir d'autres cultures à travers la gastronomie.",
    keyVocab: [
      { fr: "fondamental(e)", en: "fundamental" },
      { fr: "une compétence de vie", en: "a life skill" },
      { fr: "compter sur", en: "to rely on" },
      { fr: "les plats préparés", en: "ready meals" },
      { fr: "dès le plus jeune âge", en: "from a young age" },
      { fr: "la gastronomie", en: "gastronomy / cooking" }
    ],
  },

  // --- ENVIRONMENT (Continued) ---
  {
    id: "env_03",
    topicKey: "environment",
    text: "Quels sont les plus grands problèmes environnementaux aujourd'hui ?",
    hint: "Identify and discuss major environmental issues like climate change, pollution, or deforestation.",
    difficulty: 3,
    followUps: [
      "Lequel de ces problèmes t'inquiète le plus ?",
      "Qu'est-ce qu'on peut faire au niveau mondial ?",
      "Est-ce qu'il est trop tard pour sauver la planète ?"
    ],
    modelAnswer: "À mon avis, le plus grand problème est le réchauffement climatique causé par les émissions de gaz à effet de serre. Cela entraîne la fonte des glaciers et l'augmentation des catastrophes naturelles. Un autre problème majeur est la pollution plastique dans les océans, qui détruit la vie marine. Enfin, la déforestation massive menace la biodiversité de notre planète. Il est urgent que les gouvernements et les citoyens agissent ensemble pour réduire notre empreinte écologique avant qu'il ne soit trop tard.",
    keyVocab: [
      { fr: "le réchauffement climatique", en: "global warming" },
      { fr: "l'effet de serre", en: "greenhouse effect" },
      { fr: "la fonte des glaciers", en: "melting of glaciers" },
      { fr: "les catastrophes naturelles", en: "natural disasters" },
      { fr: "la déforestation", en: "deforestation" },
      { fr: "l'empreinte écologique", en: "ecological footprint" }
    ],
  },
  {
    id: "env_04",
    topicKey: "environment",
    text: "Est-ce que tu utilises souvent les transports en commun ? Pourquoi ?",
    hint: "Discuss your use of bus, train, or metro, and its environmental impact.",
    difficulty: 1,
    followUps: [
      "Quels transports en commun y a-t-il dans ta ville ?",
      "Est-ce que les transports en commun sont chers ?",
      "Préfères-tu le train ou l'avion pour les longs trajets ?"
    ],
    modelAnswer: "J'utilise le bus presque tous les jours pour aller à l'école. C'est très pratique car l'arrêt est juste devant chez moi. J'utilise aussi le train pour aller voir mes grands-parents le week-end. Je pense que c'est une bonne chose car c'est plus écologique que d'utiliser la voiture individuelle. Les transports en commun permettent de réduire les embouteillages et la pollution de l'air en ville. Même si c'est parfois bondé, je préfère cette option car elle est plus durable.",
    keyVocab: [
      { fr: "les transports en commun", en: "public transport" },
      { fr: "presque", en: "almost" },
      { fr: "individuel(le)", en: "individual / private" },
      { fr: "les embouteillages", en: "traffic jams" },
      { fr: "bondé(e)", en: "crowded" },
      { fr: "durable", en: "sustainable" }
    ],
  },
  {
    id: "env_05",
    topicKey: "environment",
    text: "Que penses-tu du recyclage ?",
    hint: "Give your opinion on recycling, explain what you recycle and why it's important.",
    difficulty: 2,
    followUps: [
      "Est-ce que c'est facile de recycler dans ton quartier ?",
      "Que fait ton école pour le recyclage ?",
      "Que pourrait-on recycler de plus ?"
    ],
    modelAnswer: "Je pense que le recyclage est absolument essentiel pour protéger l'environnement et économiser les ressources naturelles. Chez moi, nous trions soigneusement nos déchets : nous avons des poubelles séparées pour le papier, le plastique, le verre et les déchets organiques. C'est un geste simple qui peut faire une grande différence. Cependant, je crois que les entreprises devraient aussi réduire les emballages inutiles. Le recyclage est une bonne étape, mais réduire notre consommation est encore plus important.",
    keyVocab: [
      { fr: "le recyclage", en: "recycling" },
      { fr: "trier les déchets", en: "to sort waste" },
      { fr: "une poubelle", en: "a bin" },
      { fr: "les déchets organiques", en: "organic waste" },
      { fr: "un geste", en: "an action / gesture" },
      { fr: "les emballages", en: "packaging" }
    ],
  },

  // --- SCHOOL (Extended) ---
  {
    id: "sch_11",
    topicKey: "school",
    text: "Tu préfères travailler seul ou en groupe ? Pourquoi ?",
    hint: "Discuss the pros and cons of individual vs. group work in school.",
    difficulty: 2,
    followUps: [
      "Quels sont les avantages du travail en équipe ?",
      "Est-ce que c'est difficile de se concentrer seul ?",
      "Quel type de projet préfères-tu faire en groupe ?"
    ],
    modelAnswer: "Je préfère travailler en groupe pour les projets créatifs car on peut partager des idées et s'entraider. C'est plus motivant et on apprend beaucoup des autres. Cependant, pour réviser mes examens, je préfère être seul pour rester concentré et travailler à mon propre rythme. Je pense qu'un mélange des deux est idéal pour réussir ses études.",
    keyVocab: [
      { fr: "travailler en groupe", en: "to work in a group" },
      { fr: "s'entraider", en: "to help each other" },
      { fr: "se concentrer", en: "to concentrate" },
      { fr: "à son propre rythme", en: "at one's own pace" },
      { fr: "un mélange", en: "a mix / blend" },
      { fr: "motivant(e)", en: "motivating" }
    ],
  },
  {
    id: "sch_12",
    topicKey: "school",
    text: "Parle-moi de ton uniforme scolaire. Est-ce une bonne idée ?",
    hint: "Describe your uniform and give your opinion on whether it should be mandatory.",
    difficulty: 1,
    followUps: [
      "Qu'est-ce que tu portes exactement ?",
      "Est-ce que ton uniforme est confortable ?",
      "Si tu pouvais, qu'est-ce que tu changerais dans ton uniforme ?"
    ],
    modelAnswer: "Je porte un pantalon gris, une chemise blanche et une cravate rayée. Je pense que l'uniforme est une bonne idée car on ne perd pas de temps le matin à choisir ses vêtements. Cela crée aussi un sentiment d'appartenance à l'école. Par contre, je trouve que le tissu n'est pas très confortable en été quand il fait chaud. Si je pouvais, je choisirais des vêtements plus décontractés.",
    keyVocab: [
      { fr: "une cravate rayée", en: "a striped tie" },
      { fr: "perdre du temps", en: "to waste time" },
      { fr: "un sentiment d'appartenance", en: "a sense of belonging" },
      { fr: "décontracté(e)", en: "casual / relaxed" },
      { fr: "le tissu", en: "the fabric" },
      { fr: "obligatoire", en: "mandatory / compulsory" }
    ],
  },
  {
    id: "sch_13",
    topicKey: "school",
    text: "Qu'est-ce que tu penses des devoirs ? Est-ce qu'ils sont utiles ?",
    hint: "Give a balanced view on the necessity and amount of homework.",
    difficulty: 2,
    followUps: [
      "Combien de temps passes-tu sur tes devoirs chaque soir ?",
      "Quelles matières donnent le plus de devoirs ?",
      "Est-ce que tes parents t'aident avec tes devoirs ?"
    ],
    modelAnswer: "Je pense que les devoirs sont utiles pour consolider ce qu'on a appris en classe, mais parfois il y en a trop. Je passe environ deux heures chaque soir à faire mes exercices, ce qui est fatigant après une longue journée. Je préférerais avoir plus de temps pour mes loisirs. À mon avis, la qualité des devoirs est plus importante que la quantité. Les professeurs devraient mieux coordonner pour ne pas tout donner en même temps.",
    keyVocab: [
      { fr: "consolider", en: "to consolidate / reinforce" },
      { fr: "fatigant(e)", en: "tiring" },
      { fr: "la quantité", en: "quantity" },
      { fr: "coordonner", en: "to coordinate" },
      { fr: "en même temps", en: "at the same time" },
      { fr: "utile", en: "useful" }
    ],
  },
  {
    id: "sch_14",
    topicKey: "school",
    text: "Décris une journée scolaire idéale.",
    hint: "Imagine your perfect school day — subjects, breaks, food, and duration.",
    difficulty: 2,
    followUps: [
      "À quelle heure commencerait l'école ?",
      "Quelles matières aurais-tu au programme ?",
      "Qu'est-ce qu'on mangerait à la cantine ?"
    ],
    modelAnswer: "Ma journée idéale commencerait plus tard, vers dix heures, pour pouvoir dormir plus. On n'aurait que mes matières préférées comme le français et le dessin. La pause-déjeuner durerait deux heures et on mangerait de la pizza et des glaces à la cantine. L'après-midi, on ferait des activités sportives ou des sorties culturelles. L'école finirait à quatorze heures pour avoir tout le reste de la journée libre.",
    keyVocab: [
      { fr: "vers", en: "around / towards" },
      { fr: "le dessin", en: "art / drawing" },
      { fr: "la glace", en: "ice cream" },
      { fr: "culturel(le)", en: "cultural" },
      { fr: "libre", en: "free" },
      { fr: "le programme", en: "the timetable / curriculum" }
    ],
  },
  {
    id: "sch_15",
    topicKey: "school",
    text: "Est-ce que tu participes à des clubs après l'école ?",
    hint: "Talk about extracurricular activities and their benefits.",
    difficulty: 1,
    followUps: [
      "Quel club préfères-tu ?",
      "Pourquoi est-il bon de faire des activités extrascolaires ?",
      "Est-ce que tu as rencontré de nouveaux amis dans ces clubs ?"
    ],
    modelAnswer: "Oui, je fais partie du club de théâtre et de l'équipe de natation. On se réunit deux fois par semaine après les cours. J'adore le théâtre parce que ça m'aide à avoir plus de confiance en moi. La natation me permet de rester en forme et de décompresser après une journée stressante. C'est aussi un excellent moyen de rencontrer des gens qui partagent les mêmes passions que moi.",
    keyVocab: [
      { fr: "faire partie de", en: "to be part of" },
      { fr: "la confiance en soi", en: "self-confidence" },
      { fr: "décompresser", en: "to unwind / de-stress" },
      { fr: "une passion", en: "a passion" },
      { fr: "se réunir", en: "to meet up" },
      { fr: "extrascolaire", en: "extracurricular" }
    ],
  },

  // --- HOBBIES (Extended) ---
  {
    id: "hob_10",
    topicKey: "hobbies",
    text: "Quel est le dernier film que tu as vu ? C'était comment ?",
    hint: "Describe a recent movie experience — plot, opinion, and actors.",
    difficulty: 1,
    followUps: [
      "Tu es allé au cinéma ou tu l'as regardé chez toi ?",
      "Quel est ton genre de film préféré ?",
      "Est-ce que tu recommanderais ce film à tes amis ?"
    ],
    modelAnswer: "Le week-end dernier, j'ai regardé un film d'action qui s'appelle « Top Gun ». Je l'ai vu chez moi sur Netflix avec mon frère. C'était absolument incroyable parce que les effets spéciaux étaient impressionnants et l'histoire était très émouvante. Je recommande vivement ce film car les acteurs jouent très bien. D'habitude, je préfère les comédies, mais ce film était vraiment une bonne surprise.",
    keyVocab: [
      { fr: "les effets spéciaux", en: "special effects" },
      { fr: "impressionnant(e)", en: "impressive" },
      { fr: "émouvant(e)", en: "moving / touching" },
      { fr: "recommander vivement", en: "to highly recommend" },
      { fr: "une surprise", en: "a surprise" },
      { fr: "jouer un rôle", en: "to play a role" }
    ],
  },
  {
    id: "hob_11",
    topicKey: "hobbies",
    text: "Est-ce que tu joues aux jeux vidéo ? Pourquoi (pas) ?",
    hint: "Discuss your gaming habits or why you don't enjoy gaming.",
    difficulty: 2,
    followUps: [
      "Quel est ton jeu préféré ?",
      "Tu joues en ligne avec des amis ?",
      "Est-ce que les jeux vidéo sont une perte de temps selon toi ?"
    ],
    modelAnswer: "Oui, je joue aux jeux vidéo presque tous les soirs pendant environ une heure. Mon jeu préféré est Minecraft parce qu'on peut être très créatif et construire des mondes incroyables. Je joue souvent en ligne avec mes copains d'école, ce qui est très amusant. Je ne pense pas que ce soit une perte de temps si on ne joue pas trop longtemps, car cela aide à développer la stratégie et la coordination.",
    keyVocab: [
      { fr: "construire", en: "to build" },
      { fr: "un copain / une copine", en: "a friend" },
      { fr: "une perte de temps", en: "a waste of time" },
      { fr: "la stratégie", en: "strategy" },
      { fr: "la coordination", en: "coordination" },
      { fr: "en ligne", en: "online" }
    ],
  },
  {
    id: "hob_12",
    topicKey: "hobbies",
    text: "Tu préfères lire un livre ou regarder un film ? Pourquoi ?",
    hint: "Compare reading and watching films, giving your preference.",
    difficulty: 2,
    followUps: [
      "Quel est le dernier livre que tu as lu ?",
      "Est-ce que les films sont toujours fidèles aux livres ?",
      "Qu'est-ce qui est plus relaxant pour toi ?"
    ],
    modelAnswer: "C'est difficile à dire, mais je pense que je préfère lire un livre. Quand on lit, on peut imaginer les personnages et les décors à sa façon, ce qui est plus personnel. Les films sont souvent trop rapides et on perd beaucoup de détails de l'histoire originale. Cependant, regarder un film est plus relaxant après une longue journée car on n'a pas besoin de faire d'effort. Mais pour l'émotion, rien ne vaut un bon roman.",
    keyVocab: [
      { fr: "imaginer", en: "to imagine" },
      { fr: "les décors", en: "scenery / settings" },
      { fr: "un détail", en: "a detail" },
      { fr: "original(e)", en: "original" },
      { fr: "faire un effort", en: "to make an effort" },
      { fr: "fidèle", en: "faithful / true" }
    ],
  },
  {
    id: "hob_13",
    topicKey: "hobbies",
    text: "Qu'est-ce que tu aimes faire le soir après l'école ?",
    hint: "Describe your evening routine and leisure activities after school.",
    difficulty: 1,
    followUps: [
      "À quelle heure manges-tu le dîner ?",
      "Est-ce que tu écoutes de la musique ?",
      "Est-ce que tu te couches tôt ou tard ?"
    ],
    modelAnswer: "Après l'école, je commence par prendre un goûter et je me repose un peu. Ensuite, je fais mes devoirs avant de dîner avec ma famille vers dix-neuf heures. Le soir, j'aime bien écouter des podcasts ou regarder des vidéos sur YouTube pour me détendre. Parfois, je lis quelques pages de mon livre avant de m'éteindre les lumières vers vingt-deux heures. J'essaie de me coucher tôt pour être en forme le lendemain.",
    keyVocab: [
      { fr: "prendre un goûter", en: "to have a snack" },
      { fr: "un podcast", en: "a podcast" },
      { fr: "éteindre les lumières", en: "to turn off the lights" },
      { fr: "le lendemain", en: "the next day" },
      { fr: "se reposer", en: "to rest" },
      { fr: "vers", en: "around / at approximately" }
    ],
  },

  // --- FAMILY (Extended) ---
  {
    id: "fam_09",
    topicKey: "family",
    text: "Qui est la personne la plus drôle dans ta famille ? Pourquoi ?",
    hint: "Describe a funny family member and give examples of their humor.",
    difficulty: 1,
    followUps: [
      "Est-ce qu'elle raconte des blagues ?",
      "Est-ce que tu lui ressembles ?",
      "Qu'est-ce que vous faites ensemble pour vous amuser ?"
    ],
    modelAnswer: "La personne la plus drôle dans ma famille est sans aucun doute mon oncle Thomas. Il a toujours une blague à raconter et il fait des imitations hilarantes des membres de la famille pendant les repas de fête. Il est très spontané et sait comment nous faire rire quand on est triste. Je ne lui ressemble pas beaucoup physiquement, mais j'espère avoir hérité de son sens de l'humour car c'est une grande qualité.",
    keyVocab: [
      { fr: "sans aucun doute", en: "without a doubt" },
      { fr: "une blague", en: "a joke" },
      { fr: "une imitation", en: "an impression / imitation" },
      { fr: "hilarant(e)", en: "hilarious" },
      { fr: "hériter de", en: "to inherit" },
      { fr: "le sens de l'humour", en: "sense of humour" }
    ],
  },
  {
    id: "fam_10",
    topicKey: "family",
    text: "Est-ce que tu partages les mêmes intérêts que tes parents ?",
    hint: "Discuss common hobbies or differences between you and your parents.",
    difficulty: 2,
    followUps: [
      "Quelles activités fais-tu avec tes parents ?",
      "Y a-t-il quelque chose que tu n'aimes pas faire avec eux ?",
      "Est-ce important d'avoir les mêmes passions ?"
    ],
    modelAnswer: "Je partage pas mal de centres d'intérêt avec mon père, notamment la passion pour le sport et les voitures anciennes. On va souvent voir des matchs ensemble le week-end. Par contre, ma mère adore le jardinage et l'opéra, ce qui ne m'intéresse pas du tout. Je pense qu'il n'est pas nécessaire d'avoir exactement les mêmes passions, mais c'est bien d'avoir au moins une activité commune pour passer du temps ensemble et discuter.",
    keyVocab: [
      { fr: "les centres d'intérêt", en: "interests" },
      { fr: "ancien(ne)", en: "old / vintage" },
      { fr: "le jardinage", en: "gardening" },
      { fr: "l'opéra", en: "opera" },
      { fr: "au moins", en: "at least" },
      { fr: "commune", en: "common / shared" }
    ],
  },
  {
    id: "fam_11",
    topicKey: "family",
    text: "Parle-moi d'une célébration familiale récente.",
    hint: "Describe a family event like a birthday, wedding, or festival using the past tense.",
    difficulty: 2,
    followUps: [
      "Qu'est-ce que vous avez mangé ?",
      "Qui était présent ?",
      "C'était où ?"
    ],
    modelAnswer: "Le mois dernier, nous avons fêté les soixante ans de mariage de mes grands-parents. C'était une grande fête dans une salle de réception avec toute la famille — on était plus de cinquante personnes ! Nous avons mangé un buffet énorme et il y avait une grande pièce montée. J'ai revu des cousins que je n'avais pas vus depuis des années. C'était un moment très émouvant et on a dansé jusqu'à minuit. C'est un souvenir précieux.",
    keyVocab: [
      { fr: "fêter", en: "to celebrate" },
      { fr: "une salle de réception", en: "a reception hall" },
      { fr: "une pièce montée", en: "a tiered cake / wedding cake" },
      { fr: "depuis des années", en: "for years" },
      { fr: "précieux / précieuse", en: "precious" },
      { fr: "le mariage", en: "marriage / wedding" }
    ],
  },
  {
    id: "fam_12",
    topicKey: "family",
    text: "Est-il important de passer du temps en famille ? Pourquoi ?",
    hint: "Explain the importance of family time for relationships and well-being.",
    difficulty: 3,
    followUps: [
      "Quels sont les dangers si on ne voit pas assez sa famille ?",
      "Est-ce que la technologie aide à rester en contact ?",
      "Préfères-tu les petites ou les grandes familles ?"
    ],
    modelAnswer: "Je crois qu'il est primordial de passer du temps en famille car cela renforce les liens affectifs et donne un sentiment de sécurité. Dans notre monde moderne où tout va très vite, ces moments permettent de se ressourcer et de partager ses problèmes. La famille est notre premier soutien en cas de difficulté. Cependant, avec les réseaux sociaux, on a tendance à être distrait même quand on est ensemble, donc il faut faire l'effort d'être vraiment présent.",
    keyVocab: [
      { fr: "primordial(e)", en: "essential / vital" },
      { fr: "les liens affectifs", en: "emotional bonds" },
      { fr: "se ressourcer", en: "to recharge / refresh oneself" },
      { fr: "le soutien", en: "support" },
      { fr: "avoir tendance à", en: "to have a tendency to" },
      { fr: "être présent(e)", en: "to be present" }
    ],
  },

  // --- HOLIDAYS (Extended) ---
  {
    id: "hol_09",
    topicKey: "holidays",
    text: "Tu préfères les vacances actives ou relaxantes ? Pourquoi ?",
    hint: "Contrast sightseeing/sports holidays with beach/rest holidays.",
    difficulty: 2,
    followUps: [
      "Qu'est-ce que tu fais pendant des vacances actives ?",
      "Où irais-tu pour te relaxer ?",
      "Quel type de vacances tes parents préfèrent-ils ?"
    ],
    modelAnswer: "Je préfère nettement les vacances actives. J'aime visiter des monuments, explorer de nouvelles villes et faire du sport comme de la randonnée ou du vélo. Je trouve que rester sur une plage toute la journée est un peu ennuyeux. Pour moi, les vacances sont l'occasion de découvrir des choses que je ne vois pas d'habitude. Cependant, je comprends que certaines personnes aient besoin de se relaxer après une année de travail stressante.",
    keyVocab: [
      { fr: "nettement", en: "clearly / much" },
      { fr: "ennuyeux / ennuyeuse", en: "boring" },
      { fr: "l'occasion de", en: "the opportunity to" },
      { fr: "découvrir", en: "to discover" },
      { fr: "stresser", en: "to stress out" },
      { fr: "le monument", en: "monument / landmark" }
    ],
  },
  {
    id: "hol_10",
    topicKey: "holidays",
    text: "Où es-tu allé l'hiver dernier ?",
    hint: "Describe a winter trip or activity using the past tense.",
    difficulty: 1,
    followUps: [
      "Quel temps faisait-il ?",
      "Est-ce que tu as fait du ski ?",
      "Avec qui es-tu allé ?"
    ],
    modelAnswer: "L'hiver dernier, je suis allé à la montagne, dans les Alpes françaises, avec mon club de sport. Nous avons passé une semaine dans un chalet en bois. Il y avait beaucoup de neige et il faisait très froid, mais c'était magnifique. J'ai fait du ski tous les jours et j'ai beaucoup progressé. Le soir, on mangeait de la raclette et on jouait à des jeux de société. C'était une expérience géniale et j'ai hâte d'y retourner l'année prochaine.",
    keyVocab: [
      { fr: "un chalet", en: "a chalet / cabin" },
      { fr: "la neige", en: "snow" },
      { fr: "progresser", en: "to improve / progress" },
      { fr: "la raclette", en: "raclette (cheese dish)" },
      { fr: "génial(e)", en: "great / awesome" },
      { fr: "froid", en: "cold" }
    ],
  },
  {
    id: "hol_11",
    topicKey: "holidays",
    text: "Quel est le pays que tu as le plus aimé visiter ? Pourquoi ?",
    hint: "Discuss your favorite travel destination and what made it special.",
    difficulty: 2,
    followUps: [
      "Qu'est-ce que tu as aimé là-bas ?",
      "Est-ce que les gens étaient accueillants ?",
      "Est-ce que tu aimerais y vivre ?"
    ],
    modelAnswer: "Le pays que j'ai préféré visiter est le Portugal. J'ai adoré la ville de Lisbonne avec ses vieux tramways et ses rues colorées. La nourriture est délicieuse, surtout les petits gâteaux à la crème. Les gens sont extrêmement accueillants et le climat est parfait, pas trop chaud mais très ensoleillé. Ce qui m'a le plus marqué, c'est l'ambiance décontractée et la beauté des paysages côtiers. C'est un pays où je me sens vraiment bien.",
    keyVocab: [
      { fr: "un tramway", en: "a tram" },
      { fr: "accueillant(e)", en: "welcoming" },
      { fr: "marquer", en: "to leave an impression on" },
      { fr: "côtier / côtière", en: "coastal" },
      { fr: "ensoleillé(e)", en: "sunny" },
      { fr: "la beauté", en: "beauty" }
    ],
  },
  {
    id: "hol_12",
    topicKey: "holidays",
    text: "Est-ce que tu as déjà fait du camping ? C'était comment ?",
    hint: "Describe a camping experience or your opinion on it.",
    difficulty: 1,
    followUps: [
      "Préfères-tu dormir sous une tente ou dans une caravane ?",
      "Quels sont les avantages du camping ?",
      "Quel est l'inconvénient principal ?"
    ],
    modelAnswer: "Oui, j'ai fait du camping l'été dernier avec mes scouts. Nous avons dormi sous une tente dans une forêt près d'un lac. C'était une aventure incroyable parce qu'on cuisinait sur un feu de camp et on dormait à la belle étoile. L'avantage du camping est d'être proche de la nature et de vivre une expérience simple. L'inconvénient principal est le manque de confort, surtout quand il pleut et que tout devient humide. Mais c'est très formateur !",
    keyVocab: [
      { fr: "une tente", en: "a tent" },
      { fr: "à la belle étoile", en: "under the stars / outdoors" },
      { fr: "un feu de camp", en: "a campfire" },
      { fr: "humide", en: "damp / wet" },
      { fr: "formateur / formatrice", en: "educational / character-building" },
      { fr: "un inconvénient", en: "a disadvantage / drawback" }
    ],
  },

  // --- HOME (Extended) ---
  {
    id: "hom_08",
    topicKey: "home",
    text: "Qu'est-ce qu'il y a pour les touristes dans ta ville ?",
    hint: "Describe local tourist attractions and why they are worth visiting.",
    difficulty: 2,
    followUps: [
      "Quel est le monument le plus célèbre ?",
      "Est-ce qu'il y a de bons restaurants pour les étrangers ?",
      "Ta ville est-elle trop touristique ?"
    ],
    modelAnswer: "Dans ma ville, il y a beaucoup de choses à voir pour les touristes. Le monument le plus célèbre est la vieille cathédrale gothique qui date du douzième siècle. Il y a aussi un musée d'histoire locale très intéressant et un grand parc botanique. Pour ceux qui aiment le shopping, notre centre-ville possède de nombreuses boutiques artisanales. Ma ville n'est pas trop touristique, donc l'ambiance reste authentique et agréable pour les visiteurs.",
    keyVocab: [
      { fr: "une cathédrale", en: "a cathedral" },
      { fr: "gothique", en: "Gothic" },
      { fr: "botanique", en: "botanical" },
      { fr: "artisanal(e)", en: "handcrafted / artisanal" },
      { fr: "authentique", en: "authentic" },
      { fr: "agréable", en: "pleasant" }
    ],
  },
  {
    id: "hom_09",
    topicKey: "home",
    text: "Comment as-tu décoré ta chambre ?",
    hint: "Describe the colors, furniture, and personal touches in your room.",
    difficulty: 1,
    followUps: [
      "Quelle est ta couleur préférée pour les murs ?",
      "Est-ce que tu as beaucoup d'affiches ?",
      "Où as-tu acheté tes meubles ?"
    ],
    modelAnswer: "J'ai décoré ma chambre de façon assez moderne. Les murs sont blancs mais j'ai un pan de mur bleu foncé. J'ai mis beaucoup d'affiches de mes groupes de musique préférés et des photos de mes amis. Sur mon bureau, il y a une lampe design et quelques plantes vertes. J'ai acheté la plupart de mes meubles chez IKEA car c'est pratique et pas trop cher. Ma chambre est l'endroit où je me sens le plus à l'aise pour travailler et me détendre.",
    keyVocab: [
      { fr: "un pan de mur", en: "a section of wall" },
      { fr: "une affiche", en: "a poster" },
      { fr: "design", en: "stylish / design" },
      { fr: "une plante verte", en: "a houseplant" },
      { fr: "à l'aise", en: "comfortable / at ease" },
      { fr: "la plupart de", en: "most of" }
    ],
  },
  {
    id: "hom_10",
    topicKey: "home",
    text: "Si tu pouvais déménager, où irais-tu ?",
    hint: "Use conditional to describe where you would move and why.",
    difficulty: 3,
    followUps: [
      "Préférerais-tu une ville ou la campagne ?",
      "Dans quel pays aimerais-tu vivre ?",
      "Qu'est-ce qui te manquerait de ta maison actuelle ?"
    ],
    modelAnswer: "Si je pouvais déménager, j'irais vivre dans le sud de la France, peut-être près de Montpellier. J'aimerais être proche de la mer et profiter d'un climat plus chaud et ensoleillé qu'en Angleterre. Je choisirais une maison moderne avec une grande terrasse et une piscine. Cependant, mes amis et ma famille me manqueraient beaucoup. Je pense que ce serait une expérience enrichissante de vivre dans un autre pays, même si c'est seulement pour quelques années.",
    keyVocab: [
      { fr: "déménager", en: "to move house" },
      { fr: "une terrasse", en: "a terrace / patio" },
      { fr: "une piscine", en: "a swimming pool" },
      { fr: "manquer à quelqu'un", en: "to be missed by someone" },
      { fr: "actuel(le)", en: "current / present" },
      { fr: "enrichissant(e)", en: "enriching" }
    ],
  },

  // --- FUTURE (Extended) ---
  {
    id: "fut_07",
    topicKey: "future",
    text: "Est-ce que tu voudrais avoir ta propre entreprise plus tard ?",
    hint: "Discuss the pros and cons of being an entrepreneur vs. an employee.",
    difficulty: 3,
    followUps: [
      "Quel type d'entreprise créerais-tu ?",
      "Quelles sont les qualités d'un bon chef d'entreprise ?",
      "Est-ce que c'est trop risqué selon toi ?"
    ],
    modelAnswer: "Oui, j'aimerais beaucoup créer ma propre entreprise dans le domaine de la technologie. Je trouve que c'est passionnant d'être son propre patron et d'avoir la liberté de réaliser ses idées. Un bon chef d'entreprise doit être travailleur, créatif et savoir prendre des décisions difficiles. Certes, c'est risqué car on peut échouer, mais je pense que le défi en vaut la peine. Je préfère essayer de construire quelque chose de nouveau plutôt que d'avoir un travail monotone.",
    keyVocab: [
      { fr: "une entreprise", en: "a company / business" },
      { fr: "son propre patron", en: "one's own boss" },
      { fr: "risqué", en: "risky" },
      { fr: "échouer", en: "to fail" },
      { fr: "un défi", en: "a challenge" },
      { fr: "monotone", en: "monotonous / dull" }
    ],
  },
  {
    id: "fut_08",
    topicKey: "future",
    text: "Quel est le métier que tu ne voudrais jamais faire ? Pourquoi ?",
    hint: "Identify a job you dislike and explain the reasons (stress, boredom, danger).",
    difficulty: 2,
    followUps: [
      "Est-ce que tu as peur du sang ou du danger ?",
      "Quelles sont les conditions de travail que tu détestes ?",
      "Est-ce que le salaire est important pour toi ?"
    ],
    modelAnswer: "Je ne voudrais jamais être comptable. Je trouve que travailler avec des chiffres toute la journée dans un bureau serait extrêmement barbant pour moi. J'ai besoin de bouger et de voir des gens. Je ne voudrais pas non plus être chirurgien parce que j'ai horreur du sang et c'est un métier beaucoup trop stressant. Pour moi, le bonheur au travail est plus important qu'un salaire élevé, donc je choisirais toujours une carrière qui me passionne.",
    keyVocab: [
      { fr: "comptable", en: "accountant" },
      { fr: "barbant(e)", en: "boring / tedious" },
      { fr: "avoir horreur de", en: "to hate / loathe" },
      { fr: "le sang", en: "blood" },
      { fr: "le bonheur", en: "happiness" },
      { fr: "élevé", en: "high" }
    ],
  },
  {
    id: "fut_09",
    topicKey: "future",
    text: "Comment vois-tu ta vie dans dix ans ?",
    hint: "Use future tense to describe your personal and professional situation in 10 years.",
    difficulty: 3,
    followUps: [
      "Où habiteras-tu ?",
      "Est-ce que tu seras marié(e) ?",
      "Quel sera ton plus grand succès ?"
    ],
    modelAnswer: "Dans dix ans, j'aurai terminé mes études universitaires et j'aurai un bon emploi dans le marketing. J'habiterai probablement dans une grande ville européenne comme Paris ou Berlin. J'espère que je serai indépendant(e) financièrement et que j'aurai déjà beaucoup voyagé à travers le monde. Je ne sais pas si je serai marié(e), mais j'aimerais avoir un cercle d'amis fidèles et être heureux dans ce que je fais. Mon plus grand succès serait d'avoir un équilibre parfait entre ma vie pro et ma vie perso.",
    keyVocab: [
      { fr: "probablement", en: "probably" },
      { fr: "financièrement", en: "financially" },
      { fr: "un cercle d'amis", en: "a circle of friends" },
      { fr: "fidèle", en: "loyal / faithful" },
      { fr: "le succès", en: "success" },
      { fr: "pro / perso", en: "professional / personal" }
    ],
  },

  // --- FOOD (Extended) ---
  {
    id: "foo_08",
    topicKey: "food",
    text: "Qu'est-ce que tu n'aimes pas manger ? Pourquoi ?",
    hint: "Discuss foods you dislike — taste, texture, or health reasons.",
    difficulty: 1,
    followUps: [
      "Y a-t-il un légume que tu détestes ?",
      "Est-ce que tu es allergique à quelque chose ?",
      "Est-ce que tu goûtes quand même aux nouveaux plats ?"
    ],
    modelAnswer: "Je déteste les choux de Bruxelles parce que je trouve que l'odeur et le goût sont trop forts. Je n'aime pas non plus les fruits de mer, surtout les huîtres, car la texture me dégoûte. Heureusement, je n'ai aucune allergie alimentaire, donc je peux manger presque tout. J'essaie toujours de goûter une petite bouchée quand on me propose un nouveau plat, car parfois on a de bonnes surprises. Mais pour les choux, c'est définitif : c'est non !",
    keyVocab: [
      { fr: "les choux de Bruxelles", en: "Brussels sprouts" },
      { fr: "une huître", en: "an oyster" },
      { fr: "dégoûter", en: "to disgust" },
      { fr: "une bouchée", en: "a mouthful / bite" },
      { fr: "définitif / définitive", en: "final / definite" },
      { fr: "l'odeur", en: "the smell" }
    ],
  },
  {
    id: "foo_09",
    topicKey: "food",
    text: "Est-ce que tu manges souvent des produits bio ?",
    hint: "Discuss organic food — health benefits, cost, and environment.",
    difficulty: 2,
    followUps: [
      "Est-ce que c'est plus cher ?",
      "Est-ce que le goût est différent ?",
      "Où achètes-tu tes fruits et légumes ?"
    ],
    modelAnswer: "Mes parents essaient d'acheter des produits bio quand c'est possible, surtout pour les fruits et les légumes. Je pense que c'est meilleur pour la santé car il n'y a pas de pesticides. Cependant, c'est souvent beaucoup plus cher que les produits normaux, donc on ne peut pas tout acheter en bio. Je trouve que les tomates bio ont plus de goût et sont plus juteuses. On va souvent au marché local le samedi matin pour trouver des produits frais et naturels.",
    keyVocab: [
      { fr: "bio (biologique)", en: "organic" },
      { fr: "un pesticide", en: "a pesticide" },
      { fr: "jouteux / juteuse", en: "juicy" },
      { fr: "frais / fraîche", en: "fresh" },
      { fr: "naturel(le)", en: "natural" },
      { fr: "le marché local", en: "local market" }
    ],
  },
  {
    id: "foo_10",
    topicKey: "food",
    text: "Quel est le dessert français que tu préfères ?",
    hint: "Talk about French pastries or desserts you enjoy.",
    difficulty: 1,
    followUps: [
      "Tu préfères les gâteaux ou les tartes ?",
      "As-tu déjà mangé des macarons ?",
      "Sais-tu préparer un dessert français ?"
    ],
    modelAnswer: "Mon dessert français préféré est la tarte Tatin. J'adore le mélange des pommes caramélisées et de la pâte croustillante. J'aime aussi beaucoup les éclairs au chocolat et les macarons à la framboise. L'année dernière, j'ai essayé de faire des crêpes pour la Chandeleur et c'était très réussi. La pâtisserie française est mondialement connue pour sa finesse et ses saveurs délicates. C'est toujours un régal d'aller dans une boulangerie en France.",
    keyVocab: [
      { fr: "la tarte Tatin", en: "upside-down apple tart" },
      { fr: "caramélisé(e)", en: "caramelised" },
      { fr: "croustillant(e)", en: "crunchy / crispy" },
      { fr: "la framboise", en: "raspberry" },
      { fr: "un régal", en: "a treat / delight" },
      { fr: "la finesse", en: "finesse / delicacy" }
    ],
  },
  {
    id: "foo_11",
    topicKey: "food",
    text: "Parle-moi d'un repas spécial que tu as mangé récemment.",
    hint: "Describe a special meal — celebration, restaurant, or home-cooked (past tense).",
    difficulty: 2,
    followUps: [
      "C'était pour quelle occasion ?",
      "Qui a cuisiné ?",
      "Quel était le plat principal ?"
    ],
    modelAnswer: "Récemment, j'ai mangé un repas exceptionnel pour fêter la fin de l'année scolaire. Nous sommes allés dans un restaurant italien très réputé. J'ai pris des lasagnes faites maison qui étaient absolument divines. En plat principal, mon père a mangé un risotto aux champignons sauvages. L'ambiance était très festive et le service était impeccable. Pour finir, on a partagé un grand tiramisu. C'était un moment de pur plaisir après tout le stress des examens.",
    keyVocab: [
      { fr: "réputé(e)", en: "renowned / famous" },
      { fr: "divin(e)", en: "divine / heavenly" },
      { fr: "un champignon sauvage", en: "a wild mushroom" },
      { fr: "impeccable", en: "faultless / impeccable" },
      { fr: "festif / festive", en: "festive" },
      { fr: "le plat principal", en: "the main course" }
    ],
  },

  // --- ENVIRONMENT (Extended) ---
  {
    id: "env_06",
    topicKey: "environment",
    text: "Que penses-tu des voitures électriques ?",
    hint: "Discuss the pros and cons of electric vehicles for the environment.",
    difficulty: 2,
    followUps: [
      "Est-ce que tes parents ont une voiture électrique ?",
      "Est-ce que c'est l'avenir du transport ?",
      "Quels sont les problèmes avec les voitures électriques ?"
    ],
    modelAnswer: "Je pense que les voitures électriques sont une excellente initiative pour réduire la pollution en ville et lutter contre le réchauffement climatique. Elles sont silencieuses et ne rejettent pas de gaz toxiques. Cependant, la fabrication des batteries est encore très polluante et il n'y a pas assez de bornes de recharge dans certaines régions. Je crois que c'est une étape nécessaire, mais nous devrions aussi privilégier les transports en commun et le vélo pour être vraiment écologiques.",
    keyVocab: [
      { fr: "une initiative", en: "an initiative" },
      { fr: "silencieux / silencieuse", en: "quiet / silent" },
      { fr: "rejeter", en: "to emit / reject" },
      { fr: "une borne de recharge", en: "a charging point" },
      { fr: "privilégier", en: "to favour / prioritize" },
      { fr: "toxique", en: "toxic" }
    ],
  },
  {
    id: "env_07",
    topicKey: "environment",
    text: "Est-ce que ton école est écologique ?",
    hint: "Talk about environmental initiatives at your school.",
    difficulty: 2,
    followUps: [
      "Qu'est-ce que ton école fait pour recycler ?",
      "Y a-t-il des panneaux solaires ?",
      "Qu'est-ce que tu aimerais changer ?"
    ],
    modelAnswer: "Mon école fait des efforts, mais elle pourrait faire mieux. On a des bacs de recyclage dans chaque classe pour le papier et le plastique. On nous encourage aussi à éteindre les ordinateurs à la fin de la journée. Par contre, il n'y a pas encore de panneaux solaires sur les toits et la cantine utilise trop d'emballages en plastique jetables. J'aimerais qu'on installe un jardin potager pour faire pousser nos propres légumes et qu'on réduise le gaspillage alimentaire.",
    keyVocab: [
      { fr: "un bac de recyclage", en: "a recycling bin" },
      { fr: "un panneau solaire", en: "a solar panel" },
      { fr: "jetable", en: "disposable" },
      { fr: "un jardin potager", en: "a vegetable garden" },
      { fr: "le gaspillage alimentaire", en: "food waste" },
      { fr: "faire pousser", en: "to grow" }
    ],
  },
  {
    id: "env_08",
    topicKey: "environment",
    text: "Qu'est-ce qu'on peut faire pour économiser l'eau à la maison ?",
    hint: "Suggest practical ways to reduce water consumption at home.",
    difficulty: 1,
    followUps: [
      "Prends-tu des douches ou des bains ?",
      "Utilises-tu l'eau de pluie pour le jardin ?",
      "Pourquoi est-il important d'économiser l'eau ?"
    ],
    modelAnswer: "Pour économiser l'eau, on peut faire plusieurs choses simples. Par exemple, il vaut mieux prendre une douche rapide plutôt qu'un bain, car on utilise beaucoup moins de litres. Il faut aussi fermer le robinet quand on se brosse les dents. Dans mon jardin, mon père utilise un réservoir pour récupérer l'eau de pluie pour arroser les plantes. L'eau est une ressource précieuse et limitée, donc il est de notre devoir de ne pas la gaspiller pour les générations futures.",
    keyVocab: [
      { fr: "économiser", en: "to save / economize" },
      { fr: "le robinet", en: "the tap" },
      { fr: "arroser", en: "to water" },
      { fr: "une ressource", en: "a resource" },
      { fr: "le devoir", en: "duty" },
      { fr: "gaspiller", en: "to waste" }
    ],
  },

  // --- SCHOOL (Final Expansion) ---
  {
    id: "sch_16",
    topicKey: "school",
    text: "Comment est-ce que tu utilises la technologie à l'école ?",
    hint: "Talk about laptops, tablets, and the internet in your lessons.",
    difficulty: 2,
    followUps: [
      "Est-ce que tu préfères les livres papier ou numériques ?",
      "Quels sont les avantages d'utiliser internet pour les devoirs ?",
      "Y a-t-il des inconvénients à la technologie en classe ?"
    ],
    modelAnswer: "À l'école, on utilise des tablettes dans presque tous les cours pour faire des recherches et accéder à des manuels numériques. C'est très pratique car c'est plus léger que de porter dix livres dans son sac. Cependant, je trouve que c'est parfois distrayant car on a tendance à vouloir aller sur les réseaux sociaux. Je pense que la technologie est un outil formidable si on l'utilise de façon responsable.",
    keyVocab: [
      { fr: "un manuel numérique", en: "a digital textbook" },
      { fr: "léger / légère", en: "light (weight)" },
      { fr: "distrayant(e)", en: "distracting" },
      { fr: "un outil", en: "a tool" },
      { fr: "responsable", en: "responsible" },
      { fr: "accéder à", en: "to access" }
    ],
  },
  {
    id: "sch_17",
    topicKey: "school",
    text: "Où aimerais-tu aller pour ton prochain voyage scolaire ?",
    hint: "Describe your dream school trip and what you would do there.",
    difficulty: 2,
    followUps: [
      "Pourquoi as-tu choisi cette destination ?",
      "Quelles activités ferais-tu là-bas ?",
      "Avec qui aimerais-tu partager cette expérience ?"
    ],
    modelAnswer: "J'aimerais beaucoup aller à Paris avec ma classe de français. On pourrait visiter le Louvre, monter en haut de la tour Eiffel et pratiquer notre français avec les habitants. Ce serait une occasion unique de découvrir la culture française en vrai et pas seulement dans les livres. On irait aussi manger dans des vraies boulangeries. Je pense que ce serait un voyage inoubliable qui nous motiverait tous à apprendre davantage.",
    keyVocab: [
      { fr: "en vrai", en: "in real life / for real" },
      { fr: "davantage", en: "more / further" },
      { fr: "une occasion", en: "an opportunity / occasion" },
      { fr: "monter en haut", en: "to go to the top" },
      { fr: "infrançais", en: "French (language)" },
      { fr: "inhabituel(le)", en: "unusual" }
    ],
  },
  {
    id: "sch_18",
    topicKey: "school",
    text: "Pourquoi est-il important d'apprendre des langues étrangères ?",
    hint: "Discuss the benefits of bilingualism for travel, work, and culture.",
    difficulty: 3,
    followUps: [
      "Quelles langues apprends-tu à l'école ?",
      "Est-ce que tu penses que tout le monde devrait parler anglais ?",
      "Comment les langues aident-elles à comprendre d'autres cultures ?"
    ],
    modelAnswer: "Apprendre une langue étrangère est essentiel pour ouvrir son esprit sur le monde. Cela permet non seulement de voyager plus facilement, mais aussi d'avoir de meilleures opportunités de carrière à l'international. De plus, on comprend mieux sa propre langue en en étudiant une autre. Je crois que parler plusieurs langues favorise la tolérance car on découvre des façons différentes de penser et de vivre.",
    keyVocab: [
      { fr: "ouvrir son esprit", en: "to open one's mind" },
      { fr: "à l'international", en: "internationally" },
      { fr: "la tolérance", en: "tolerance" },
      { fr: "plusieurs", en: "several" },
      { fr: "favoriser", en: "to encourage / promote" },
      { fr: "étranger / étrangère", en: "foreign" }
    ],
  },
  {
    id: "sch_19",
    topicKey: "school",
    text: "Comment sont les relations entre les élèves dans ton école ?",
    hint: "Talk about friendships, atmosphere, and how students get along.",
    difficulty: 2,
    followUps: [
      "Est-ce que tu as beaucoup d'amis à l'école ?",
      "Y a-t-il une bonne ambiance dans ta classe ?",
      "Qu'est-ce qu'on fait dans ton école pour lutter contre le harcèlement ?"
    ],
    modelAnswer: "En général, les relations sont très bonnes. Il y a une atmosphère de camaraderie et de respect mutuel. Bien sûr, il y a parfois des petits conflits, mais on essaie de les résoudre par la discussion. Mon école est très stricte contre le harcèlement scolaire et organise des ateliers pour nous sensibiliser. Je me sens en sécurité et soutenu par mes camarades, ce qui est très important pour bien travailler.",
    keyVocab: [
      { fr: "le respect mutuel", en: "mutual respect" },
      { fr: "le harcèlement", en: "bullying" },
      { fr: "sensibiliser", en: "to raise awareness" },
      { fr: "soutenu(e)", en: "supported" },
      { fr: "un atelier", en: "a workshop" },
      { fr: "résoudre", en: "to resolve" }
    ],
  },
  {
    id: "sch_20",
    topicKey: "school",
    text: "Quelles sont les différences entre ton école primaire et ton lycée ?",
    hint: "Compare your current school with your previous one (past vs present).",
    difficulty: 2,
    followUps: [
      "Laquelle préférais-tu et pourquoi ?",
      "Est-ce que les matières sont plus difficiles maintenant ?",
      "As-tu plus de liberté au lycée ?"
    ],
    modelAnswer: "Mon école primaire était beaucoup plus petite et plus familiale. On avait le même professeur pour toutes les matières, alors qu'au lycée, on change de salle et de prof à chaque heure. Les cours sont nettement plus difficiles maintenant et la charge de travail est plus lourde. Cependant, j'apprécie d'avoir plus de liberté et de pouvoir choisir mes options. C'est un passage nécessaire pour devenir plus indépendant et responsable.",
    keyVocab: [
      { fr: "familial(e)", en: "family-like / intimate" },
      { fr: "alors que", en: "whereas / while" },
      { fr: "lourd(e)", en: "heavy" },
      { fr: "apprécier", en: "to enjoy / appreciate" },
      { fr: "un passage", en: "a transition / stage" },
      { fr: "nettement", en: "clearly / significantly" }
    ],
  },

  // --- HOBBIES (Final Expansion) ---
  {
    id: "hob_14",
    topicKey: "hobbies",
    text: "Tu préfères faire du shopping en ligne ou dans des magasins ?",
    hint: "Compare online shopping with going to physical stores.",
    difficulty: 2,
    followUps: [
      "Quels sont les avantages du shopping en ligne ?",
      "Pourquoi est-il bon d'aller dans les magasins ?",
      "À quelle fréquence fais-tu du shopping ?"
    ],
    modelAnswer: "Je préfère faire du shopping en ligne parce que c'est plus rapide et on peut comparer les prix facilement sans bouger de chez soi. Il y a aussi plus de choix. Par contre, j'aime aller dans les magasins avec mes amis pour essayer les vêtements et voir la qualité des produits en vrai. C'est aussi une sortie sympa. Je dirais que j'achète mes gadgets en ligne mais mes vêtements plutôt en magasin.",
    keyVocab: [
      { fr: "sans bouger de chez soi", en: "without leaving home" },
      { fr: "plutôt", en: "rather" },
      { fr: "comparer", en: "to compare" },
      { fr: "essayer", en: "to try on" },
      { fr: "un gadget", en: "a gadget" },
      { fr: "le prix", en: "price" }
    ],
  },
  {
    id: "hob_15",
    topicKey: "hobbies",
    text: "Quelle personne célèbre aimerais-tu rencontrer un jour ?",
    hint: "Talk about an actor, singer, or athlete you admire.",
    difficulty: 2,
    followUps: [
      "Pourquoi admires-tu cette personne ?",
      "Qu'est-ce que tu lui demanderais ?",
      "Où aimerais-tu la rencontrer ?"
    ],
    modelAnswer: "J'aimerais énormément rencontrer Kylian Mbappé car c'est mon joueur de football préféré. Je l'admire pour son talent incroyable et sa détermination sur le terrain. Si je le rencontrais, je lui demanderais des conseils pour devenir un meilleur attaquant et je le remercierais pour tout ce qu'il fait pour le sport. On se rencontrerait au Parc des Princes après un match. Ce serait un rêve qui deviendrait réalité !",
    keyVocab: [
      { fr: "le terrain", en: "the pitch / field" },
      { fr: "un attaquant", en: "a striker / forward" },
      { fr: "remercier", en: "to thank" },
      { fr: "un rêve", en: "a dream" },
      { fr: "réalité", en: "reality" },
      { fr: "joueur", en: "player" }
    ],
  },
  {
    id: "hob_16",
    topicKey: "hobbies",
    text: "Est-ce que tu aimes aller aux musées ou aux galeries d'art ?",
    hint: "Discuss your interest in culture and exhibitions.",
    difficulty: 2,
    followUps: [
      "Quel est le dernier musée que tu as visité ?",
      "Quel genre d'art préfères-tu ?",
      "Penses-tu que les musées devraient être gratuits pour les jeunes ?"
    ],
    modelAnswer: "Oui, j'adore aller aux musées, surtout quand il y a des expositions interactives. Le dernier musée que j'ai visité était le Musée d'Orsay à Paris — les tableaux impressionnistes étaient magnifiques. Je préfère l'art moderne car je trouve ça plus surprenant. Je pense absolument que les musées devraient être gratuits pour les jeunes car cela encourage la culture et l'apprentissage en dehors de l'école. C'est une source d'inspiration inépuisable.",
    keyVocab: [
      { fr: "interactif / interactive", en: "interactive" },
      { fr: "gratuit(e)", en: "free (of charge)" },
      { fr: "en dehors de", en: "outside of" },
      { fr: "inépuisable", en: "endless / inexhaustible" },
      { fr: "un tableau", en: "a painting" },
      { fr: "surprenant(e)", en: "surprising" }
    ],
  },
  {
    id: "hob_17",
    topicKey: "hobbies",
    text: "Pourquoi est-il important d'avoir des passe-temps pour la santé mentale ?",
    hint: "Discuss how hobbies help reduce stress and improve well-being.",
    difficulty: 3,
    followUps: [
      "Quel passe-temps te relaxe le plus ?",
      "Que se passe-t-il si on n'a pas de loisirs ?",
      "Comment peut-on trouver un nouveau passe-temps ?"
    ],
    modelAnswer: "Avoir des passe-temps est crucial pour évacuer le stress accumulé pendant la semaine. Cela permet de déconnecter du travail ou des études et de se concentrer sur quelque chose qui nous passionne vraiment. C'est essentiel pour le bien-être mental car cela procure un sentiment d'accomplissement et de plaisir. Sans loisirs, la vie deviendrait vite monotone et épuisante. Personnellement, jouer de la musique est ma thérapie pour rester zen.",
    keyVocab: [
      { fr: "évacuer", en: "to release / get rid of" },
      { fr: "accumulé(e)", en: "built up / accumulated" },
      { fr: "procure", en: "to provide / give" },
      { fr: "l'accomplissement", en: "achievement / fulfillment" },
      { fr: "épuisant(e)", en: "exhausting" },
      { fr: "déconnecter", en: "to disconnect / switch off" }
    ],
  },
  {
    id: "hob_18",
    topicKey: "hobbies",
    text: "Qu'est-ce que tu fais quand il pleut et que tu ne peux pas sortir ?",
    hint: "Talk about indoor activities like reading, watching movies, or games.",
    difficulty: 1,
    followUps: [
      "Est-ce que tu aimes la pluie ?",
      "Quel est ton film préféré pour un jour de pluie ?",
      "Est-ce que tu en profites pour faire tes devoirs ?"
    ],
    modelAnswer: "Quand il pleut, j'en profite pour rester bien au chaud à la maison. Je regarde souvent des séries sur Netflix ou je joue aux jeux de société avec ma sœur. Parfois, je lis un bon livre avec une tasse de chocolat chaud. Même si j'aime être dehors, j'apprécie ces moments de tranquillité à l'intérieur. C'est l'occasion parfaite pour se reposer et être un peu paresseux sans culpabiliser !",
    keyVocab: [
      { fr: "bien au chaud", en: "nice and warm" },
      { fr: "paresseux / paresseuse", en: "lazy" },
      { fr: "culpabiliser", en: "to feel guilty" },
      { fr: "en profiter", en: "to take advantage / make the most of it" },
      { fr: "dedans / à l'intérieur", en: "inside / indoors" },
      { fr: "la tranquillité", en: "peace / quiet" }
    ],
  },

  // --- FAMILY (Final Expansion) ---
  {
    id: "fam_13",
    topicKey: "family",
    text: "Est-ce que tu as beaucoup de cousins ? Tu les vois souvent ?",
    hint: "Talk about your extended family and your relationship with them.",
    difficulty: 1,
    followUps: [
      "Où habitent tes cousins ?",
      "Qu'est-ce que vous faites quand vous êtes ensemble ?",
      "As-tu un cousin ou une cousine préféré(e) ?"
    ],
    modelAnswer: "Oui, j'ai une famille assez nombreuse ! J'ai six cousins et quatre cousines. La plupart habitent dans la même ville que moi, donc on se voit presque tous les week-ends chez mes grands-parents. On s'entend super bien et on joue souvent au foot ensemble dans le jardin. Ma cousine préférée s'appelle Léa, elle a le même âge que moi et on se confie tout. C'est génial d'avoir des cousins car c'est comme avoir des frères et sœurs en plus.",
    keyVocab: [
      { fr: "nombreux / nombreuse", en: "large (family)" },
      { fr: "se confier", en: "to confide in each other" },
      { fr: "en plus", en: "extra / in addition" },
      { fr: "le cousin / la cousine", en: "cousin" },
      { fr: "s'entendre", en: "to get along" },
      { fr: "presque", en: "almost" }
    ],
  },
  {
    id: "fam_14",
    topicKey: "family",
    text: "À qui est-ce que tu parles quand tu as un problème ?",
    hint: "Identify the family member or friend you trust most.",
    difficulty: 2,
    followUps: [
      "Pourquoi as-tu confiance en cette personne ?",
      "Est-ce qu'elle te donne de bons conseils ?",
      "Est-ce plus facile de parler à un ami ou à un parent ?"
    ],
    modelAnswer: "Quand j'ai un problème, je parle d'abord à ma mère car elle est très à l'écoute et ne me juge jamais. Elle a toujours des paroles rassurantes et me donne des conseils très avisés. Cependant, si c'est un problème avec mes amis, je préfère en parler à mon meilleur ami car il comprend mieux ma situation. Je pense qu'il est crucial d'avoir quelqu'un de confiance pour ne pas garder ses soucis pour soi.",
    keyVocab: [
      { fr: "à l'écoute", en: "a good listener" },
      { fr: "juger", en: "to judge" },
      { fr: "rassurant(e)", en: "reassuring" },
      { fr: "avisé(e)", en: "wise / sensible" },
      { fr: "les soucis", en: "worries / troubles" },
      { fr: "garder pour soi", en: "to keep to oneself" }
    ],
  },
  {
    id: "fam_15",
    topicKey: "family",
    text: "Est-il préférable d'être enfant unique ou d'avoir des frères et sœurs ?",
    hint: "Compare the two situations and give your opinion.",
    difficulty: 3,
    followUps: [
      "Quels sont les avantages d'être enfant unique ?",
      "Qu'est-ce qui est difficile quand on a des frères et sœurs ?",
      "Et toi, quelle est ta situation ?"
    ],
    modelAnswer: "À mon avis, il est préférable d'avoir des frères et sœurs car on ne se sent jamais seul et on apprend très tôt à partager et à être patient. Même si on se dispute parfois pour des bêtises, on sait qu'on peut toujours compter les uns sur les autres. L'avantage d'être enfant unique est d'avoir toute l'attention de ses parents, mais je pense que la complicité entre frères et sœurs est irremplaçable. Personnellement, je ne pourrais pas vivre sans ma petite sœur.",
    keyVocab: [
      { fr: "enfant unique", en: "only child" },
      { fr: "partager", en: "to share" },
      { fr: "une bêtise", en: "nonsense / silly thing" },
      { fr: "la complicité", en: "bond / closeness" },
      { fr: "irremplaçable", en: "irreplaceable" },
      { fr: "tôt", en: "early" }
    ],
  },
  {
    id: "fam_16",
    topicKey: "family",
    text: "Décris un dimanche typique avec ta famille.",
    hint: "Walk through your family's Sunday routine — meals, activities, relaxation.",
    difficulty: 1,
    followUps: [
      "À quelle heure vous levez-vous ?",
      "Qu'est-ce que vous mangez pour le déjeuner ?",
      "Est-ce que vous sortez ou restez à la maison ?"
    ],
    modelAnswer: "Le dimanche, on se lève tard et on prend un grand petit-déjeuner tous ensemble. C'est le moment où on discute de notre semaine. Ensuite, si le temps le permet, on va faire une longue promenade en forêt ou au bord de la mer. Vers quatorze heures, on mange un repas traditionnel préparé par mon père. L'après-midi est plus calme : chacun se repose, lit ou regarde un film. C'est ma journée préférée car c'est vraiment relaxant et familial.",
    keyVocab: [
      { fr: "se lever tard", en: "to get up late" },
      { fr: "si le temps le permet", en: "weather permitting" },
      { fr: "une promenade", en: "a walk / stroll" },
      { fr: "chacun", en: "each one / everyone" },
      { fr: "traditionnel(le)", en: "traditional" },
      { fr: "le dimanche", en: "Sunday" }
    ],
  },
  {
    id: "fam_17",
    topicKey: "family",
    text: "Penses-tu que les jeunes devraient écouter davantage leurs grands-parents ?",
    hint: "Discuss the value of elderly people's experience and wisdom.",
    difficulty: 3,
    followUps: [
      "Vois-tu souvent tes grands-parents ?",
      "Qu'est-ce que tes grands-parents t'ont appris ?",
      "Pourquoi est-il parfois difficile de se comprendre ?"
    ],
    modelAnswer: "Absolument. Les grands-parents ont une expérience de la vie inestimable et peuvent nous donner des perspectives très différentes. Ils ont vécu à une époque sans technologie et peuvent nous apprendre la patience et le sens des vraies valeurs. Je vois mes grands-parents tous les quinze jours et j'adore écouter leurs histoires de jeunesse. Même si le monde a changé, les sentiments humains restent les mêmes et leurs conseils sont souvent très pertinents pour nous aujourd'hui.",
    keyVocab: [
      { fr: "inestimable", en: "priceless" },
      { fr: "une époque", en: "an era / time" },
      { fr: "le sens des valeurs", en: "sense of values" },
      { fr: "la jeunesse", en: "youth" },
      { fr: "pertinent(e)", en: "relevant" },
      { fr: "tous les quinze jours", en: "every fortnight" }
    ],
  },

  // --- HOLIDAYS (Final Expansion) ---
  {
    id: "hol_13",
    topicKey: "holidays",
    text: "Tu préfères les vacances d'été ou d'hiver ? Pourquoi ?",
    hint: "Compare beach/sun holidays with skiing/snow holidays.",
    difficulty: 2,
    followUps: [
      "Qu'est-ce que tu aimes faire en été ?",
      "Est-ce que tu aimes le froid et la neige ?",
      "Quelle est ta destination préférée pour chaque saison ?"
    ],
    modelAnswer: "Je préfère les vacances d'été car j'adore la chaleur, le soleil et pouvoir me baigner dans la mer. En été, les journées sont plus longues et on a plus d'énergie pour faire des activités en plein air. Cependant, j'apprécie aussi une semaine au ski en hiver pour les sensations fortes. Mais si je devais choisir, je prendrais toujours une destination ensoleillée comme la Grèce ou l'Espagne pour me ressourcer totalement.",
    keyVocab: [
      { fr: "la chaleur", en: "heat" },
      { fr: "se baigner", en: "to swim / bathe" },
      { fr: "en plein air", en: "outdoors" },
      { fr: "les sensations fortes", en: "thrills" },
      { fr: "ensoleillé(e)", en: "sunny" },
      { fr: "choisir", en: "to choose" }
    ],
  },
  {
    id: "hol_14",
    topicKey: "holidays",
    text: "As-tu déjà eu une mauvaise expérience en vacances ?",
    hint: "Describe a trip that went wrong — delays, weather, or illness (past tense).",
    difficulty: 2,
    followUps: [
      "Qu'est-ce qui s'est passé exactement ?",
      "Comment as-tu résolu le problème ?",
      "Est-ce que tu retournerais à cet endroit ?"
    ],
    modelAnswer: "Oui, malheureusement. Il y a deux ans, nous sommes allés en Bretagne et il a plu pendant toute la semaine ! En plus, notre valise a été perdue à l'aéroport et on a dû attendre trois jours pour la récupérer. On a dû acheter des vêtements de rechange en catastrophe. C'était très stressant au début, mais finalement on a pris ça avec humour et on a visité beaucoup de musées à l'abri de la pluie. Maintenant, c'est une anecdote drôle qu'on raconte souvent.",
    keyVocab: [
      { fr: "en catastrophe", en: "as a last resort / in a rush" },
      { fr: "vêtements de rechange", en: "change of clothes" },
      { fr: "à l'abri de", en: "sheltered from" },
      { fr: "une anecdote", en: "an anecdote / story" },
      { fr: "récupérer", en: "to recover / get back" },
      { fr: "malheureusement", en: "unfortunately" }
    ],
  },
  {
    id: "hol_15",
    topicKey: "holidays",
    text: "Si tu gagnais à la loterie, où irais-tu en vacances ?",
    hint: "Use conditional to describe your ultimate luxury dream trip.",
    difficulty: 3,
    followUps: [
      "Avec qui partirais-tu ?",
      "Dans quel genre d'hôtel logerais-tu ?",
      "Qu'est-ce que tu achèterais là-bas ?"
    ],
    modelAnswer: "Si je gagnais à la loterie, je ferais le tour du monde pendant un an ! J'irais d'abord en Polynésie française pour loger dans un bungalow sur l'eau. Ensuite, je visiterais les grandes métropoles comme New York, Tokyo et Sydney. Je voyagerais en première classe et je logerais dans les hôtels les plus luxueux. J'inviterais toute ma famille et mes meilleurs amis à me rejoindre pour partager ces moments incroyables. Ce serait l'aventure de ma vie !",
    keyVocab: [
      { fr: "gagner à la loterie", en: "to win the lottery" },
      { fr: "le tour du monde", en: "world tour" },
      { fr: "un bungalow", en: "a bungalow / hut" },
      { fr: "rejoindre", en: "to join" },
      { fr: "luxueux / luxueuse", en: "luxurious" },
      { fr: "première classe", en: "first class" }
    ],
  },
  {
    id: "hol_16",
    topicKey: "holidays",
    text: "Pourquoi est-il important de goûter la nourriture locale à l'étranger ?",
    hint: "Discuss the link between food, culture, and travel experience.",
    difficulty: 2,
    followUps: [
      "Quelle est la meilleure chose que tu as mangée à l'étranger ?",
      "Y a-t-il des plats que tu refuses de goûter ?",
      "Penses-tu que la nourriture est le meilleur moyen de découvrir une culture ?"
    ],
    modelAnswer: "Je pense que la gastronomie fait partie intégrante de la culture d'un pays. Goûter les spécialités locales permet de mieux comprendre l'histoire et les traditions des habitants. C'est une expérience sensorielle unique qui rend le voyage plus authentique. Si on mange la même chose qu'à la maison, on perd une grande partie du dépaysement. Personnellement, j'adore découvrir de nouvelles saveurs et épices, même si c'est parfois surprenant.",
    keyVocab: [
      { fr: "partie intégrante", en: "integral part" },
      { fr: "sensoriel(le)", en: "sensory" },
      { fr: "le dépaysement", en: "change of scenery / culture shock" },
      { fr: "une saveur", en: "a flavor" },
      { fr: "une épice", en: "a spice" },
      { fr: "authentique", en: "authentic" }
    ],
  },
  {
    id: "hol_17",
    topicKey: "holidays",
    text: "Tu préfères voyager en avion ou en train ? Pourquoi ?",
    hint: "Compare the convenience, cost, and environmental impact of both.",
    difficulty: 2,
    followUps: [
      "Quel est l'avantage du train ?",
      "Est-ce que tu as peur de l'avion ?",
      "Penses-tu qu'on devrait limiter les vols pour sauver la planète ?"
    ],
    modelAnswer: "Pour les longs trajets, l'avion est imbattable car c'est beaucoup plus rapide. Cependant, je préfère le train pour voyager en Europe. C'est plus relaxant car on peut voir les paysages défiler et il n'y a pas les contrôles de sécurité interminables de l'aéroport. De plus, le train est bien plus écologique, ce qui est important pour moi. Je crois qu'on devrait privilégier le rail dès que c'est possible pour réduire notre empreinte carbone.",
    keyVocab: [
      { fr: "imbattable", en: "unbeatable" },
      { fr: "défiler", en: "to pass by / scroll" },
      { fr: "interminable", en: "endless" },
      { fr: "le rail", en: "rail / train travel" },
      { fr: "une empreinte carbone", en: "carbon footprint" },
      { fr: "un trajet", en: "a journey / trip" }
    ],
  },

  // --- HOME (Final Expansion) ---
  {
    id: "hom_11",
    topicKey: "home",
    text: "Est-ce qu'il y a un parc près de chez toi ? Tu y vas souvent ?",
    hint: "Describe local green spaces and how you use them.",
    difficulty: 1,
    followUps: [
      "Qu'est-ce qu'on peut faire dans ce parc ?",
      "Est-ce qu'il est propre et bien entretenu ?",
      "Avec qui y vas-tu ?"
    ],
    modelAnswer: "Oui, il y a un grand parc magnifique à seulement cinq minutes à pied de ma maison. J'y vais presque tous les jours après l'école pour me détendre ou faire un peu de jogging. Le parc est très bien entretenu avec beaucoup de fleurs et un petit lac. Le week-end, je retrouve mes amis là-bas pour discuter ou faire un pique-nique quand il fait beau. C'est mon endroit préféré dans mon quartier pour prendre l'air.",
    keyVocab: [
      { fr: "entretenu(e)", en: "maintained" },
      { fr: "le jogging", en: "jogging" },
      { fr: "prendre l'air", en: "to get some fresh air" },
      { fr: "un pique-nique", en: "a picnic" },
      { fr: "le quartier", en: "neighborhood" },
      { fr: "magnifique", en: "beautiful" }
    ],
  },
  {
    id: "hom_12",
    topicKey: "home",
    text: "Qu'est-ce que tu aimerais changer dans ta ville ?",
    hint: "Discuss improvements like transport, facilities, or environment.",
    difficulty: 2,
    followUps: [
      "Y a-t-il assez de pistes cyclables ?",
      "Est-ce qu'il manque des centres de loisirs ?",
      "Penses-tu que ta ville est trop polluée ?"
    ],
    modelAnswer: "Si je pouvais, j'ajouterais beaucoup plus de pistes cyclables car je trouve que c'est dangereux de faire du vélo en ville actuellement. J'aimerais aussi qu'il y ait plus de centres de jeunesse avec des activités gratuites comme de la musique ou du sport. Enfin, je pense qu'on devrait planter plus d'arbres pour rendre la ville plus verte et moins bruyante. Ma ville est sympa, mais elle pourrait être beaucoup plus moderne et écologique.",
    keyVocab: [
      { fr: "une piste cyclable", en: "a cycle path" },
      { fr: "actuellement", en: "currently / at the moment" },
      { fr: "planter", en: "to plant" },
      { fr: "bruyant(e)", en: "noisy" },
      { fr: "un centre de jeunesse", en: "a youth center" },
      { fr: "écologique", en: "eco-friendly" }
    ],
  },
  {
    id: "hom_13",
    topicKey: "home",
    text: "Est-ce que tu connais bien tes voisins ?",
    hint: "Talk about the people living next door and your relationship with them.",
    difficulty: 1,
    followUps: [
      "Sont-ils sympathiques ?",
      "Est-ce que vous vous aidez parfois ?",
      "Y a-t-il beaucoup de bruit dans ton quartier ?"
    ],
    modelAnswer: "On connaît assez bien nos voisins de droite, c'est un couple âgé très gentil. On discute souvent par-dessus la haie et ils gardent parfois nos clés quand on part en vacances. Par contre, on ne connaît pas du tout les nouveaux voisins de gauche car ils travaillent beaucoup et sont rarement là. Je pense qu'il est important d'avoir de bonnes relations avec ses voisins pour créer un sentiment de sécurité et de communauté.",
    keyVocab: [
      { fr: "le voisin / la voisine", en: "neighbor" },
      { fr: "par-dessus la haie", en: "over the hedge" },
      { fr: "garder les clés", en: "to keep the keys" },
      { fr: "rarement", en: "rarely" },
      { fr: "la haie", en: "hedge" },
      { fr: "le couple", en: "couple" }
    ],
  },
  {
    id: "hom_14",
    topicKey: "home",
    text: "Décris ta cuisine. Est-ce un endroit important chez toi ?",
    hint: "Describe the kitchen's look and its role in family life.",
    difficulty: 1,
    followUps: [
      "Qui cuisine le plus à la maison ?",
      "Est-ce que vous mangez dans la cuisine ?",
      "Quelles sont les couleurs de ta cuisine ?"
    ],
    modelAnswer: "Ma cuisine est assez moderne avec des meubles blancs et un plan de travail en bois noir. C'est l'endroit le plus important de la maison car c'est là qu'on se retrouve tous pour préparer les repas et discuter de notre journée. Il y a une grande table au milieu où on prend tous nos repas. Ma mère adore cuisiner et elle passe beaucoup de temps à essayer de nouvelles recettes. C'est une pièce très chaleureuse et lumineuse.",
    keyVocab: [
      { fr: "le plan de travail", en: "worktop / counter" },
      { fr: "au milieu", en: "in the middle" },
      { fr: "une recette", en: "a recipe" },
      { fr: "chaleureux / chaleureuse", en: "warm / cozy" },
      { fr: "la pièce", en: "the room" },
      { fr: "lumineux / lumineuse", en: "bright / light" }
    ],
  },
  {
    id: "hom_15",
    topicKey: "home",
    text: "Quels sont les avantages de vivre dans un village par rapport à une grande ville ?",
    hint: "Compare country life with city life.",
    difficulty: 3,
    followUps: [
      "Où préférerais-tu vivre plus tard ?",
      "Le calme te dérange-t-il ou te plaît-il ?",
      "Y a-t-il assez de choses à faire dans un village pour les jeunes ?"
    ],
    modelAnswer: "Vivre dans un village offre une qualité de vie incomparable : c'est calme, il y a moins de pollution et on est proche de la nature. Tout le monde se connaît, ce qui est rassurant. Par contre, dans une grande ville, il y a beaucoup plus de services, de magasins et de sorties culturelles. Personnellement, je préfère la ville pour mes études car c'est plus dynamique, mais je rêve d'une maison à la campagne pour mes vieux jours afin de profiter de la tranquillité.",
    keyVocab: [
      { fr: "par rapport à", en: "compared to" },
      { fr: "le calme", en: "peace / quiet" },
      { fr: "dynamique", en: "dynamic / lively" },
      { fr: "mes vieux jours", en: "my old age" },
      { fr: "incomparable", en: "incomparable" },
      { fr: "rassurant(e)", en: "reassuring" }
    ],
  },

  // --- FUTURE (Final Expansion) ---
  {
    id: "fut_10",
    topicKey: "future",
    text: "Est-ce que tu aimerais écrire un livre un jour ?",
    hint: "Talk about your creative ambitions and what you'd write about.",
    difficulty: 2,
    followUps: [
      "Quel serait le sujet de ton livre ?",
      "Penses-tu que c'est un métier difficile ?",
      "Est-ce que tu aimes écrire à l'école ?"
    ],
    modelAnswer: "Oui, j'ai toujours rêvé d'écrire un roman de science-fiction. J'adore imaginer des mondes futuristes et des nouvelles technologies. Je pense que c'est un métier passionnant mais très exigeant car il faut beaucoup de discipline et d'imagination. À l'école, j'apprécie beaucoup les rédactions car c'est le moment où je peux exprimer ma créativité. Même si je ne deviens pas écrivain professionnel, j'aimerais publier au moins un livre pour partager mes idées.",
    keyVocab: [
      { fr: "exigeant(e)", en: "demanding" },
      { fr: "une rédaction", en: "an essay / piece of writing" },
      { fr: "publier", en: "to publish" },
      { fr: "futuriste", en: "futuristic" },
      { fr: "un écrivain", en: "a writer" },
      { fr: "dream", en: "rêver" }
    ],
  },
  {
    id: "fut_11",
    topicKey: "future",
    text: "Qu'est-ce qui est le plus important : la satisfaction au travail ou l'argent ?",
    hint: "Discuss your priorities for your future career.",
    difficulty: 3,
    followUps: [
      "Peut-on être heureux sans argent ?",
      "Travaillerais-tu gratuitement pour une cause ?",
      "Qu'est-ce qu'un bon salaire selon toi ?"
    ],
    modelAnswer: "Pour moi, la satisfaction au travail est bien plus importante que le salaire. On passe la majeure partie de sa vie au travail, donc il est essentiel d'aimer ce que l'on fait pour être épanoui. Bien sûr, on a besoin d'assez d'argent pour vivre confortablement, mais je ne choisirais jamais un métier ennuyeux juste pour être riche. Je crois que si on est passionné par son travail, le succès et l'argent viendront naturellement après. Le bonheur ne s'achète pas.",
    keyVocab: [
      { fr: "la majeure partie", en: "the major part / most of" },
      { fr: "épanoui(e)", en: "fulfilled / happy" },
      { fr: "naturellement", en: "naturally" },
      { fr: "s'acheter", en: "to be bought" },
      { fr: "la satisfaction", en: "satisfaction" },
      { fr: "confortablement", en: "comfortably" }
    ],
  },
  {
    id: "fut_12",
    topicKey: "future",
    text: "Est-ce que tu voudrais avoir des enfants plus tard ?",
    hint: "Talk about your family plans for the future.",
    difficulty: 2,
    followUps: [
      "Combien d'enfants aimerais-tu avoir ?",
      "Est-ce que c'est une grande responsabilité ?",
      "Quelles valeurs aimerais-tu leur transmettre ?"
    ],
    modelAnswer: "Oui, j'aimerais fonder une famille dans l'avenir. Je voudrais avoir deux enfants, un garçon et une fille si possible. C'est une énorme responsabilité, mais je pense que c'est une expérience magnifique. J'aimerais leur transmettre des valeurs comme l'honnêteté, le respect et la curiosité. Je veux être un parent présent qui encourage ses enfants à réaliser leurs rêves. Pour l'instant, je me concentre sur mes études, mais c'est un projet qui me tient à cœur.",
    keyVocab: [
      { fr: "fonder une famille", en: "to start a family" },
      { fr: "transmettre", en: "to pass on / transmit" },
      { fr: "l'honnêteté", en: "honesty" },
      { fr: "tenir à cœur", en: "to be important to one's heart" },
      { fr: "un garçon", en: "a boy" },
      { fr: "une fille", en: "a girl" }
    ],
  },
  {
    id: "fut_13",
    topicKey: "future",
    text: "Où te vois-tu vivre dans vingt ans ?",
    hint: "Describe your ideal living situation in the distant future.",
    difficulty: 3,
    followUps: [
      "Seras-tu toujours dans le même pays ?",
      "Habiteras-tu en ville ou à la campagne ?",
      "Comment sera ta maison ?"
    ],
    modelAnswer: "Dans vingt ans, je me vois vivre dans une maison écologique en bord de mer, peut-être au Portugal ou en Italie. J'aurai une vie paisible loin de l'agitation des grandes métropoles. Ma maison sera autonome en énergie avec beaucoup de lumière naturelle. Je travaillerai peut-être à distance, ce qui me permettra de profiter de la nature au quotidien. J'espère que je serai en bonne santé et entouré de mes proches. Ce serait mon petit coin de paradis.",
    keyVocab: [
      { fr: "autonome", en: "autonomous / self-sufficient" },
      { fr: "à distance", en: "remotely" },
      { fr: "entouré(e) de", en: "surrounded by" },
      { fr: "un coin de paradis", en: "a corner of paradise" },
      { fr: "paisible", en: "peaceful" },
      { fr: "au quotidien", en: "daily" }
    ],
  },
  {
    id: "fut_14",
    topicKey: "future",
    text: "Quel impact l'intelligence artificielle aura-t-elle sur ta future carrière ?",
    hint: "Discuss the role of AI and automation in your chosen field.",
    difficulty: 3,
    followUps: [
      "As-tu peur que l'IA remplace ton travail ?",
      "Comment l'IA peut-elle t'aider ?",
      "Est-ce une menace ou une opportunité ?"
    ],
    modelAnswer: "Je pense que l'IA va transformer radicalement ma future carrière, mais je ne pense pas qu'elle va me remplacer. C'est plutôt un outil puissant qui nous permettra d'être plus efficaces et créatifs. Par exemple, l'IA pourra gérer les tâches répétitives, nous laissant plus de temps pour la résolution de problèmes complexes. C'est à la fois une opportunité et un défi car nous devrons apprendre à collaborer avec ces nouvelles technologies tout au long de notre vie.",
    keyVocab: [
      { fr: "radicalement", en: "radically" },
      { fr: "gérer", en: "to manage" },
      { fr: "répétitif / répétitive", en: "repetitive" },
      { fr: "une menace", en: "a threat" },
      { fr: "tout au long de", en: "throughout" },
      { fr: "puissant(e)", en: "powerful" }
    ],
  },

  // --- FOOD (Final Expansion) ---
  {
    id: "foo_12",
    topicKey: "food",
    text: "Est-ce que tu bois assez d'eau chaque jour ?",
    hint: "Discuss your hydration habits and why water is important.",
    difficulty: 1,
    followUps: [
      "Combien de litres bois-tu environ ?",
      "Préfères-tu l'eau plate ou gazeuse ?",
      "Bois-tu beaucoup de sodas ?"
    ],
    modelAnswer: "J'essaie de boire au moins un litre et demi d'eau par jour. J'emporte toujours une gourde avec moi à l'école pour rester hydraté. Je préfère l'eau plate, mais j'aime bien l'eau gazeuse avec un peu de citron le week-end. Je limite les sodas car c'est trop sucré et mauvais pour les dents. Boire assez d'eau m'aide à rester concentré en cours et à avoir plus d'énergie. C'est une habitude santé indispensable.",
    keyVocab: [
      { fr: "une gourde", en: "a water bottle" },
      { fr: "plate", en: "still (water)" },
      { fr: "gazeuse", en: "sparkling (water)" },
      { fr: "un citron", en: "a lemon" },
      { fr: "indispensable", en: "essential / indispensable" },
      { fr: "hydraté(e)", en: "hydrated" }
    ],
  },
  {
    id: "foo_13",
    topicKey: "food",
    text: "Quel est ton petit-déjeuner préféré ?",
    hint: "Describe what you eat and drink in the morning.",
    difficulty: 1,
    followUps: [
      "Est-ce que tu manges salé ou sucré le matin ?",
      "À quelle heure prends-tu ton petit-déjeuner ?",
      "Est-ce que tu manges la même chose le week-end ?"
    ],
    modelAnswer: "Mon petit-déjeuner préféré est un bol de céréales avec du lait froid et un grand verre de jus d'orange pressé. Parfois, je mange aussi un yaourt aux fruits. Le week-end, on prend plus de temps et on mange des croissants ou des tartines avec de la confiture de fraise. Je ne peux pas commencer ma journée sans manger, sinon je me sens faible. C'est vraiment le repas le plus important pour moi.",
    keyVocab: [
      { fr: "jus d'orange pressé", en: "freshly squeezed orange juice" },
      { fr: "une tartine", en: "a slice of bread with spread" },
      { fr: "la confiture de fraise", en: "strawberry jam" },
      { fr: "faible", en: "weak" },
      { fr: "salé(e)", en: "savory / salty" },
      { fr: "sucré(e)", en: "sweet" }
    ],
  },
  {
    id: "foo_14",
    topicKey: "food",
    text: "Penses-tu que les repas à la cantine sont équilibrés ?",
    hint: "Evaluate the nutritional value of your school lunches.",
    difficulty: 2,
    followUps: [
      "Qu'est-ce qu'on mange d'habitude ?",
      "Est-ce qu'il y a assez de légumes ?",
      "Si tu pouvais, qu'est-ce que tu ajouterais au menu ?"
    ],
    modelAnswer: "D'un côté, on a toujours une entrée, un plat principal et un dessert, donc c'est assez complet. D'un autre côté, je trouve que les plats sont parfois trop gras et qu'il n'y a pas assez de légumes verts. Si je pouvais, j'ajouterais plus d'options végétariennes et des fruits frais de saison. Je pense que la cantine devrait faire plus d'efforts pour nous apprendre à manger sainement tout en proposant des choses savoureuses.",
    keyVocab: [
      { fr: "une entrée", en: "a starter" },
      { fr: "de saison", en: "in season" },
      { fr: "sainement", en: "healthily" },
      { fr: "gras", en: "fatty / oily" },
      { fr: "équilibré(e)", en: "balanced" },
      { fr: "savoureux / savoureuse", en: "tasty" }
    ],
  },
  {
    id: "foo_15",
    topicKey: "food",
    text: "As-tu déjà essayé un régime végétarien ou végan ?",
    hint: "Talk about your experience or opinion on meat-free diets.",
    difficulty: 2,
    followUps: [
      "Pourquoi les gens choisissent-ils d'être végétariens ?",
      "Est-ce que c'est difficile de ne pas manger de viande ?",
      "Penses-tu que c'est bon pour l'environnement ?"
    ],
    modelAnswer: "Je n'ai jamais essayé un régime strictement végétarien, mais on mange de moins en moins de viande à la maison pour protéger la planète. Je pense que c'est une bonne initiative car l'élevage industriel consomme beaucoup d'eau. Il est tout à fait possible d'avoir une alimentation équilibrée sans viande si on mange assez de protéines végétales. C'est un choix personnel qui demande de la discipline mais qui est bénéfique pour la santé et l'écologie.",
    keyVocab: [
      { fr: "un régime", en: "a diet" },
      { fr: "la viande", en: "meat" },
      { fr: "l'élevage industriel", en: "factory farming" },
      { fr: "protéines végétales", en: "plant proteins" },
      { fr: "strictement", en: "strictly" },
      { fr: "consommer", en: "to consume" }
    ],
  },
  {
    id: "foo_16",
    topicKey: "food",
    text: "Parle-moi d'une recette que tu sais préparer tout(e) seul(e).",
    hint: "Explain the steps and ingredients of a dish you can cook.",
    difficulty: 2,
    followUps: [
      "C'est difficile à faire ?",
      "Qui t'a appris cette recette ?",
      "À qui as-tu déjà préparé ce plat ?"
    ],
    modelAnswer: "Je sais préparer des crêpes tout seul. Il faut de la farine, des œufs, du lait et un peu de beurre. On mélange tout dans un saladier pour faire une pâte lisse. C'est ma grand-mère qui m'a appris la recette quand j'étais petit. J'en prépare souvent pour mes amis le samedi après-midi. On les mange avec du sucre, de la confiture ou du chocolat. C'est très simple mais tout le monde adore ça, c'est un vrai régal !",
    keyVocab: [
      { fr: "la farine", en: "flour" },
      { fr: "un saladier", en: "a mixing bowl" },
      { fr: "une pâte lisse", en: "a smooth batter" },
      { fr: "un régal", en: "a treat / delight" },
      { fr: "mélanger", en: "to mix" },
      { fr: "seul(e)", en: "alone / by oneself" }
    ],
  },

  // --- ENVIRONMENT (Final Expansion) ---
  {
    id: "env_09",
    topicKey: "environment",
    text: "Est-ce qu'il y a beaucoup de déchets dans ta ville ?",
    hint: "Talk about littering and cleanliness in your area.",
    difficulty: 1,
    followUps: [
      "Y a-t-il assez de poubelles publiques ?",
      "Qui doit nettoyer les rues ?",
      "Que penses-tu des gens qui jettent leurs déchets par terre ?"
    ],
    modelAnswer: "Malheureusement, on voit souvent des déchets par terre dans le centre-ville, surtout le week-end. Je trouve ça honteux car il y a des poubelles partout. Les services municipaux font de leur mieux pour nettoyer, mais c'est la responsabilité de chacun de respecter son environnement. Jeter un papier par terre est un manque de respect total envers les autres et envers la nature. On devrait avoir des amendes plus lourdes pour lutter contre cela.",
    keyVocab: [
      { fr: "un déchet", en: "a piece of litter / waste" },
      { fr: "honteux / honteuse", en: "shameful" },
      { fr: "jeter par terre", en: "to throw on the ground" },
      { fr: "une amende", en: "a fine" },
      { fr: "lutter contre", en: "to fight against" },
      { fr: "partout", en: "everywhere" }
    ],
  },
  {
    id: "env_10",
    topicKey: "environment",
    text: "Penses-tu qu'on devrait interdire les sacs en plastique ?",
    hint: "Discuss the impact of single-use plastics and possible alternatives.",
    difficulty: 2,
    followUps: [
      "Qu'est-ce qu'on peut utiliser à la place ?",
      "Est-ce que tu as toujours un sac réutilisable avec toi ?",
      "Pourquoi le plastique est-il dangereux pour les animaux ?"
    ],
    modelAnswer: "Je pense qu'interdire les sacs en plastique à usage unique est une excellente décision. Ils polluent nos océans pendant des siècles et tuent des milliers d'animaux marins qui les confondent avec de la nourriture. On devrait tous utiliser des sacs en tissu ou en papier recyclé qui sont bien plus durables. Personnellement, j'ai toujours un sac à dos ou un sac réutilisable avec moi quand je vais faire les courses. C'est un petit changement d'habitude pour un grand impact.",
    keyVocab: [
      { fr: "interdire", en: "to ban / forbid" },
      { fr: "à usage unique", en: "single-use" },
      { fr: "un sac en tissu", en: "a cloth bag / tote bag" },
      { fr: "durable", en: "sustainable" },
      { fr: "confondre", en: "to mistake / confuse" },
      { fr: "un siècle", en: "a century" }
    ],
  },
  {
    id: "env_11",
    topicKey: "environment",
    text: "Que peut-on faire pour protéger les animaux en voie de disparition ?",
    hint: "Suggest ways to save species like pandas, polar bears, or bees.",
    difficulty: 3,
    followUps: [
      "Quel animal aimerais-tu sauver en priorité ?",
      "Est-ce que les zoos sont utiles pour la conservation ?",
      "Pourquoi la biodiversité est-elle importante ?"
    ],
    modelAnswer: "Pour protéger les espèces menacées, il faut avant tout préserver leur habitat naturel en luttant contre la déforestation et le changement climatique. On peut aussi soutenir des organisations qui luttent contre le braconnage. Je pense que la sensibilisation est la clé : plus les gens connaissent l'importance de chaque animal, plus ils feront attention. La biodiversité est essentielle pour l'équilibre de notre planète et si une espèce disparaît, c'est tout l'écosystème qui est en danger.",
    keyVocab: [
      { fr: "en voie de disparition", en: "endangered" },
      { fr: "préserver", en: "to preserve" },
      { fr: "le braconnage", en: "poaching" },
      { fr: "la sensibilisation", en: "awareness" },
      { fr: "un écosystème", en: "an ecosystem" },
      { fr: "menacé(e)", en: "threatened" }
    ],
  },
  {
    id: "env_12",
    topicKey: "environment",
    text: "As-tu déjà participé à un projet écologique ?",
    hint: "Describe any green activity like planting trees or a beach clean-up (past tense).",
    difficulty: 2,
    followUps: [
      "C'était quoi exactement ?",
      "C'était avec qui ?",
      "Qu'est-ce que tu as appris ?"
    ],
    modelAnswer: "L'année dernière, j'ai participé à une journée de nettoyage sur la plage avec mon club de scoutisme. On a ramassé des kilos de plastique et de mégots de cigarettes. C'était choquant de voir autant de saletés dans un endroit si beau. J'ai appris que même les petits gestes comptent et que si tout le monde s'y mettait, on pourrait vraiment faire une différence. Depuis ce jour-là, je fais beaucoup plus attention à ne rien laisser derrière moi quand je vais dans la nature.",
    keyVocab: [
      { fr: "un nettoyage", en: "a clean-up" },
      { fr: "un mégot de cigarette", en: "a cigarette butt" },
      { fr: "ramasser", en: "to pick up" },
      { fr: "saletés", en: "dirt / filth" },
      { fr: "compter", en: "to count / matter" },
      { fr: "s'y mettre", en: "to get involved / start" }
    ],
  },
  {
    id: "env_13",
    topicKey: "environment",
    text: "Penses-tu que le réchauffement climatique est la plus grande menace pour l'humanité ?",
    hint: "Give your opinion on the gravity of climate change.",
    difficulty: 3,
    followUps: [
      "Pourquoi est-ce une menace ?",
      "Est-ce qu'il y a d'autres problèmes plus urgents ?",
      "Es-tu optimiste ou pessimiste pour l'avenir ?"
    ],
    modelAnswer: "Je pense que c'est effectivement la menace la plus grave car elle affecte absolument tout : notre nourriture, notre eau, notre santé et notre sécurité. Les catastrophes naturelles deviennent plus fréquentes et intenses. Cependant, je reste optimiste car je vois que ma génération est très engagée et que les technologies propres progressent vite. C'est une course contre la montre, mais si on agit maintenant de façon globale, on peut encore éviter le pire pour les générations futures.",
    keyVocab: [
      { fr: "effectivement", en: "indeed / actually" },
      { fr: "affecter", en: "to affect" },
      { fr: "engagé(e)", en: "committed / involved" },
      { fr: "une course contre la montre", en: "a race against time" },
      { fr: "agir", en: "to act" },
      { fr: "le pire", en: "the worst" }
    ],
  },

  // --- SCHOOL (Final Polish) ---
  {
    id: "sch_21",
    topicKey: "school",
    text: "Qu'est-ce que tu penses de la mixité à l'école ?",
    hint: "Discuss the pros and cons of mixed-gender schools vs. single-sex schools.",
    difficulty: 3,
    followUps: [
      "Préfères-tu les écoles mixtes ou non-mixtes ?",
      "Est-ce que cela change la façon dont on travaille ?",
      "Y a-t-il plus de distractions dans les écoles mixtes ?"
    ],
    modelAnswer: "Je suis tout à fait en faveur de la mixité car cela reflète la réalité de la société et du monde du travail. Apprendre à collaborer avec tout le monde dès le plus jeune âge favorise le respect et l'égalité. Je ne pense pas que ce soit plus distrayant ; au contraire, cela rend l'ambiance plus naturelle et équilibrée. Les écoles non-mixtes me semblent un peu démodées par rapport aux besoins actuels des jeunes.",
    keyVocab: [
      { fr: "la mixité", en: "mixed-gender education" },
      { fr: "refléter la réalité", en: "to reflect reality" },
      { fr: "démodé(e)", en: "old-fashioned" },
      { fr: "en faveur de", en: "in favour of" },
      { fr: "l'égalité", en: "equality" },
      { fr: "non-mixte", en: "single-sex" }
    ],
  },
  {
    id: "sch_22",
    topicKey: "school",
    text: "Quels sont les avantages d'avoir une bibliothèque dans ton école ?",
    hint: "Talk about the resources, quiet space, and benefits for students.",
    difficulty: 1,
    followUps: [
      "Vas-tu souvent à la bibliothèque ?",
      "Qu'est-ce que tu y fais d'habitude ?",
      "Est-ce qu'il y a assez d'ordinateurs ?"
    ],
    modelAnswer: "Avoir une bibliothèque est un immense avantage pour nous. C'est un endroit calme où on peut vraiment se concentrer pour faire ses recherches ou ses devoirs. On a accès à des centaines de livres, mais aussi à des journaux et des magazines. J'y vais souvent pendant la pause-déjeuner pour lire en toute tranquillité. C'est aussi très pratique car il y a des ordinateurs et une imprimante à notre disposition.",
    keyVocab: [
      { fr: "un avantage", en: "an advantage" },
      { fr: "en toute tranquillité", en: "in total peace" },
      { fr: "une imprimante", en: "a printer" },
      { fr: "à disposition", en: "available" },
      { fr: "se concentrer", en: "to concentrate" },
      { fr: "faire des recherches", en: "to do research" }
    ],
  },
  {
    id: "sch_23",
    topicKey: "school",
    text: "Comment est-ce que tu gères ton stress pendant les examens ?",
    hint: "Share your tips for staying calm and organized during test periods.",
    difficulty: 2,
    followUps: [
      "Es-tu une personne stressée d'habitude ?",
      "Que fais-tu pour te détendre après un examen ?",
      "Est-ce que tu révises à la dernière minute ?"
    ],
    modelAnswer: "Pour gérer mon stress, j'essaie d'être très organisé(e). Je commence mes révisions plusieurs semaines à l'avance pour ne pas être débordé(e) à la fin. Je fais aussi de courtes pauses régulières pour m'aérer l'esprit. Pendant la période des examens, je m'assure de dormir suffisamment et de bien manger. Après un gros test, je m'offre une petite récompense, comme regarder un film ou sortir avec mes amis, pour décompresser totalement.",
    keyVocab: [
      { fr: "gérer le stress", en: "to manage stress" },
      { fr: "débordé(e)", en: "overwhelmed" },
      { fr: "m'aérer l'esprit", en: "to clear my mind" },
      { fr: "une récompense", en: "a reward" },
      { fr: "à l'avance", en: "in advance" },
      { fr: "régulier / régulière", en: "regular" }
    ],
  },
  {
    id: "sch_24",
    topicKey: "school",
    text: "Si tu pouvais créer une nouvelle matière scolaire, laquelle serait-ce ?",
    hint: "Think about something practical or fun that isn't currently taught.",
    difficulty: 2,
    followUps: [
      "Pourquoi cette matière serait-elle utile ?",
      "Est-ce que ce serait une matière obligatoire ?",
      "Comment se passerait un cours typique ?"
    ],
    modelAnswer: "Si je pouvais, je créerais une matière appelée « Compétences de Vie ». On y apprendrait des choses pratiques comme gérer un budget, cuisiner des plats simples, ou comprendre comment fonctionne le monde du travail. Je pense que ce serait extrêmement utile pour nous préparer à la vie d'adulte. Les cours seraient très interactifs, avec des simulations et des ateliers pratiques. Ce ne serait pas une matière avec des examens stressants, mais plutôt une préparation concrète pour l'avenir.",
    keyVocab: [
      { fr: "gérer un budget", en: "to manage a budget" },
      { fr: "vie d'adulte", en: "adult life" },
      { fr: "concrète", en: "concrete / practical" },
      { fr: "une simulation", en: "a simulation" },
      { fr: "utile", en: "useful" },
      { fr: "préparer", en: "to prepare" }
    ],
  },
  {
    id: "sch_25",
    topicKey: "school",
    text: "Quel est l'impact des sorties scolaires sur ton apprentissage ?",
    hint: "Discuss the benefits of learning outside the traditional classroom setting.",
    difficulty: 3,
    followUps: [
      "Quelle a été ta meilleure sortie scolaire ?",
      "Préfères-tu apprendre en classe ou à l'extérieur ?",
      "Pourquoi est-il important de voir les choses en vrai ?"
    ],
    modelAnswer: "Les sorties scolaires ont un impact énorme car elles rendent l'apprentissage beaucoup plus concret et mémorable. Par exemple, visiter un site historique ou un musée permet de mieux comprendre ce qu'on a étudié dans les livres d'histoire. C'est aussi un excellent moyen de renforcer la cohésion de groupe au sein de la classe. On apprend en s'amusant et on découvre des choses qu'il serait impossible de reproduire dans une salle de classe traditionnelle.",
    keyVocab: [
      { fr: "mémorable", en: "memorable" },
      { fr: "la cohésion de groupe", en: "group cohesion" },
      { fr: "en s'amusant", en: "while having fun" },
      { fr: "reproduire", en: "to reproduce / replicate" },
      { fr: "un impact", en: "an impact" },
      { fr: "traditionnel(le)", en: "traditional" }
    ],
  },

  // --- HOBBIES (Final Polish) ---
  {
    id: "hob_19",
    topicKey: "hobbies",
    text: "Est-ce que tu préfères les activités calmes ou dynamiques ?",
    hint: "Compare hobbies like reading/drawing with sports/dancing.",
    difficulty: 1,
    followUps: [
      "Pourquoi préfères-tu ce type d'activité ?",
      "Est-ce que cela change selon ton humeur ?",
      "Quelle activité dynamique aimerais-tu essayer ?"
    ],
    modelAnswer: "D'habitude, je préfère les activités dynamiques comme le basket ou la danse car j'ai besoin de bouger pour me sentir bien. Cela me donne beaucoup d'énergie et j'aime l'aspect social de ces loisirs. Cependant, quand je suis fatigué(e) après une longue semaine, j'apprécie aussi de faire quelque chose de calme comme dessiner ou écouter de la musique. Je pense que l'équilibre entre les deux est important pour rester en bonne santé.",
    keyVocab: [
      { fr: "bouger", en: "to move" },
      { fr: "selon l'humeur", en: "depending on the mood" },
      { fr: "l'aspect social", en: "the social aspect" },
      { fr: "dynamique", en: "dynamic / energetic" },
      { fr: "équilibre", en: "balance" },
      { fr: "humeur", en: "mood" }
    ],
  },
  {
    id: "hob_20",
    topicKey: "hobbies",
    text: "Est-ce que tu aimes collectionner des objets ?",
    hint: "Talk about any collections you have — stamps, coins, posters, digital items.",
    difficulty: 1,
    followUps: [
      "Qu'est-ce que tu collectionnes ?",
      "Pourquoi as-tu commencé cette collection ?",
      "Où gardes-tu tes objets de collection ?"
    ],
    modelAnswer: "Quand j'étais plus petit(e), je collectionnais les cartes Pokémon et j'en avais des centaines ! C'était très amusant de les échanger avec mes amis à la récréation. Aujourd'hui, je ne collectionne plus vraiment d'objets physiques, mais je collectionne des vinyles de mes groupes préférés. J'adore le son et les belles pochettes. Je les garde précieusement sur une étagère dans ma chambre. C'est une passion qui me permet de me souvenir de bons moments.",
    keyVocab: [
      { fr: "collectionner", en: "to collect" },
      { fr: "échanger", en: "to exchange / swap" },
      { fr: "un vinyle", en: "a vinyl record" },
      { fr: "une pochette", en: "a cover (sleeve)" },
      { fr: "précieusement", en: "carefully / preciously" },
      { fr: "une étagère", en: "a shelf" }
    ],
  },
  {
    id: "hob_21",
    topicKey: "hobbies",
    text: "Quel est ton genre de musique préféré et pourquoi ?",
    hint: "Discuss your musical tastes and how they make you feel.",
    difficulty: 2,
    followUps: [
      "Quel est ton chanteur ou groupe préféré ?",
      "Est-ce que tu écoutes de la musique pour travailler ?",
      "Joues-tu d'un instrument ou aimerais-tu en apprendre un ?"
    ],
    modelAnswer: "Mon genre de musique préféré est le pop-rock car je trouve que c'est très entraînant et les paroles me parlent souvent. Mon groupe préféré est Imagine Dragons, j'adore la voix du chanteur. J'écoute de la musique tout le temps : dans le bus, quand je fais mes devoirs et pour me détendre le soir. Pour moi, la musique est indispensable car elle peut changer mon humeur en un instant et me motiver quand je suis un peu triste.",
    keyVocab: [
      { fr: "entraînant(e)", en: "catchy / upbeat" },
      { fr: "les paroles", en: "lyrics" },
      { fr: "la voix", en: "voice" },
      { fr: "indispensable", en: "essential / indispensable" },
      { fr: "en un instant", en: "in an instant" },
      { fr: "parler à quelqu'un", en: "to speak to (resonate with) someone" }
    ],
  },
  {
    id: "hob_22",
    topicKey: "hobbies",
    text: "Qu'est-ce que tu penses du bénévolat comme passe-temps ?",
    hint: "Discuss the benefits of volunteering for others and for oneself.",
    difficulty: 3,
    followUps: [
      "As-tu déjà fait du bénévolat ?",
      "Quelles causes aimerais-tu soutenir ?",
      "Est-ce que les jeunes devraient être encouragés à aider les autres ?"
    ],
    modelAnswer: "Je pense que le bénévolat est un passe-temps exceptionnel qui apporte beaucoup de satisfaction personnelle. Cela permet de se sentir utile et d'aider ceux qui en ont besoin, que ce soit des personnes âgées, des animaux ou l'environnement. On apprend aussi des compétences importantes comme l'empathie et la patience. Je pense que tous les jeunes devraient essayer au moins une fois, car cela nous fait sortir de notre bulle et nous fait découvrir des réalités différentes.",
    keyVocab: [
      { fr: "le bénévolat", en: "volunteering" },
      { fr: "utile", en: "useful" },
      { fr: "l'empathie", en: "empathy" },
      { fr: "sortir de sa bulle", en: "to get out of one's bubble" },
      { fr: "une cause", en: "a cause" },
      { fr: "la satisfaction", en: "satisfaction" }
    ],
  },
  {
    id: "hob_23",
    topicKey: "hobbies",
    text: "Comment est-ce que tes loisirs ont changé depuis que tu es petit(e) ?",
    hint: "Compare your childhood activities with your current hobbies.",
    difficulty: 2,
    followUps: [
      "Qu'est-ce que tu faisais avant et que tu ne fais plus ?",
      "Pourquoi as-tu arrêté certaines activités ?",
      "Es-tu devenu(e) plus sérieux/sérieuse dans tes loisirs ?"
    ],
    modelAnswer: "Quand j'étais petit(e), je passais tout mon temps à jouer aux Legos ou à courir dans le jardin avec mes amis. C'était très simple et insouciant. Aujourd'hui, mes loisirs sont plus variés et parfois plus intellectuels : je lis plus de romans, je m'intéresse à la photographie et je passe plus de temps sur les réseaux sociaux. Je suis devenu(e) plus passionné(e) par certains domaines, comme la musique, et j'y consacre plus d'efforts et de temps pour m'améliorer.",
    keyVocab: [
      { fr: "insouciant(e)", en: "carefree" },
      { fr: "varié(e)", en: "varied" },
      { fr: "consacrer", en: "to devote / dedicate" },
      { fr: "s'améliorer", en: "to improve" },
      { fr: "depuis que", en: "since" },
      { fr: "avant", en: "before" }
    ],
  },

  // --- FAMILY (Final Polish) ---
  {
    id: "fam_18",
    topicKey: "family",
    text: "As-tu des traditions familiales spéciales pour les fêtes ?",
    hint: "Describe what your family usually does for Christmas, Eid, or other celebrations.",
    difficulty: 1,
    followUps: [
      "Qu'est-ce que vous mangez ?",
      "Est-ce que vous décorez la maison ?",
      "Quelle est ta tradition préférée ?"
    ],
    modelAnswer: "Pour Noël, on a une tradition immuable : on décore le sapin tous ensemble le premier dimanche de décembre avec de la musique de fête. Le soir du réveillon, on mange une dinde rôtie et une bûche au chocolat. Ma tradition préférée est d'ouvrir un petit cadeau après le dîner, juste avant d'aller se coucher. C'est un moment magique où toute la famille est réunie et on oublie tous nos soucis du quotidien.",
    keyVocab: [
      { fr: "immuable", en: "unchanging" },
      { fr: "le sapin", en: "Christmas tree" },
      { fr: "le réveillon", en: "festive evening / Christmas Eve" },
      { fr: "la dinde", en: "turkey" },
      { fr: "la bûche", en: "Yule log (cake)" },
      { fr: "magique", en: "magical" }
    ],
  },
  {
    id: "fam_19",
    topicKey: "family",
    text: "Est-ce que tes parents sont stricts sur les horaires ?",
    hint: "Talk about rules regarding bedtime or returning home in the evening.",
    difficulty: 2,
    followUps: [
      "À quelle heure dois-tu rentrer le week-end ?",
      "Est-ce que tu penses que c'est juste ?",
      "As-tu déjà bravé les interdits ?"
    ],
    modelAnswer: "Mes parents sont assez flexibles, mais ils insistent sur la ponctualité. Le week-end, je dois être rentré(e) à vingt-deux heures. Si je suis en retard, ils s'inquiètent, donc j'essaie de toujours les prévenir. Je pense que leurs règles sont justes car elles sont là pour ma sécurité. On en discute souvent ensemble et ils sont prêts à faire des exceptions pour des occasions spéciales comme l'anniversaire d'un ami.",
    keyVocab: [
      { fr: "flexible", en: "flexible" },
      { fr: "s'inquiéter", en: "to worry" },
      { fr: "prévenir", en: "to warn / notify" },
      { fr: "juste", en: "fair" },
      { fr: "une exception", en: "an exception" },
      { fr: "braver les interdits", en: "to defy the rules" }
    ],
  },
  {
    id: "fam_20",
    topicKey: "family",
    text: "Décris un membre de ta famille que tu n'as pas vu depuis longtemps.",
    hint: "Describe a relative who lives far away or you haven't visited recently.",
    difficulty: 1,
    followUps: [
      "Où habite cette personne ?",
      "Pourquoi ne vous voyez-vous pas souvent ?",
      "Qu'est-ce que tu aimerais faire avec elle quand tu la reverras ?"
    ],
    modelAnswer: "Je n'ai pas vu mon cousin Antoine depuis trois ans car il habite au Canada pour ses études. C'est une personne très dynamique et sportive. Il me manque beaucoup car on s'entendait vraiment bien quand on était plus petits. Quand il reviendra cet été, j'aimerais qu'on aille passer une journée à la plage pour discuter et faire du surf. On se parle souvent sur Skype, mais ce n'est pas la même chose que de se voir en vrai.",
    keyVocab: [
      { fr: "manquer à quelqu'un", en: "to be missed by someone" },
      { fr: "en vrai", en: "in person / for real" },
      { fr: "depuis longtemps", en: "for a long time" },
      { fr: "revoir", en: "to see again" },
      { fr: "loin", en: "far" },
      { fr: "dynamic", en: "dynamique" }
    ],
  },
  {
    id: "fam_21",
    topicKey: "family",
    text: "Penses-tu que les parents et les adolescents peuvent être amis ?",
    hint: "Discuss the balance between authority and friendship in family relationships.",
    difficulty: 3,
    followUps: [
      "Considères-tu tes parents comme des amis ?",
      "Pourquoi est-il important qu'il y ait des limites ?",
      "Comment la relation change-t-elle avec l'âge ?"
    ],
    modelAnswer: "Je pense qu'il est possible d'avoir une relation très proche et complice, mais les parents ne peuvent pas être des « amis » au sens strict car ils ont un rôle d'autorité et de protection. Ils doivent parfois dire « non » pour notre bien, ce que les amis ne font pas forcément. Cependant, j'apprécie de pouvoir discuter de tout avec mes parents, comme avec un ami, tout en respectant leur expérience et leur place dans la famille. C'est un équilibre délicat à trouver.",
    keyVocab: [
      { fr: "complice", en: "close / having a bond" },
      { fr: "au sens strict", en: "in the strict sense" },
      { fr: "l'autorité", en: "authority" },
      { fr: "forcément", en: "necessarily" },
      { fr: "un équilibre délicat", en: "a delicate balance" },
      { fr: "la protection", en: "protection" }
    ],
  },
  {
    id: "fam_22",
    topicKey: "family",
    text: "Quelles sont les qualités les plus importantes pour être un bon parent ?",
    hint: "Discuss traits like patience, support, honesty, and listening.",
    difficulty: 3,
    followUps: [
      "Tes parents possèdent-ils ces qualités ?",
      "Est-ce difficile d'être un bon parent aujourd'hui ?",
      "Comment peut-on s'améliorer en tant que parent ?"
    ],
    modelAnswer: "À mon avis, la patience et l'écoute sont les qualités essentielles. Un bon parent doit savoir encourager ses enfants, même quand ils font des erreurs, et être présent pour les soutenir. L'honnêteté et la bienveillance sont aussi primordiales pour créer un climat de confiance. Mes parents essaient toujours de me comprendre et de m'aider à grandir, même si ce n'est pas toujours facile pour eux. Être parent demande beaucoup d'abnégation et d'amour inconditionnel.",
    keyVocab: [
      { fr: "la bienveillance", en: "kindness / benevolence" },
      { fr: "l'abnégation", en: "selflessness" },
      { fr: "inconditionnel(le)", en: "unconditional" },
      { fr: "posséder", en: "to possess / have" },
      { fr: "primordial(e)", en: "essential / paramount" },
      { fr: "soutenir", en: "to support" }
    ],
  },

  // --- HOLIDAYS (Final Polish) ---
  {
    id: "hol_18",
    topicKey: "holidays",
    text: "Préfères-tu les grandes villes ou les petits villages pour tes vacances ?",
    hint: "Compare the energy and activities of a city with the peace of a village.",
    difficulty: 1,
    followUps: [
      "Qu'est-ce que tu aimes faire dans une ville ?",
      "Le calme d'un village est-il ennuyeux pour toi ?",
      "Quelle est ta ville préférée au monde ?"
    ],
    modelAnswer: "Je préfère nettement les grandes villes car j'adore l'agitation, les musées, les magasins et la diversité culturelle. Il y a toujours quelque chose de nouveau à découvrir et j'aime l'énergie qui s'en dégage. Ma ville préférée est Londres car c'est un mélange incroyable d'histoire et de modernité. Les petits villages peuvent être charmants pour un week-end, mais je finis vite par m'ennuyer car il n'y a pas assez d'activités pour moi.",
    keyVocab: [
      { fr: "l'agitation", en: "bustle / excitement" },
      { fr: "la diversité", en: "diversity" },
      { fr: "se dégager", en: "to emanate / come from" },
      { fr: "charmant(e)", en: "charming" },
      { fr: "mélange", en: "mix / blend" },
      { fr: "modernité", en: "modernity" }
    ],
  },
  {
    id: "hol_19",
    topicKey: "holidays",
    text: "Quel est l'objet le plus important dans ton sac de voyage ?",
    hint: "Talk about something essential you always take with you.",
    difficulty: 1,
    followUps: [
      "Est-ce que c'est ton téléphone ?",
      "Pourquoi est-ce si important ?",
      "Qu'est-ce qui se passerait si tu l'oubliais ?"
    ],
    modelAnswer: "L'objet le plus important dans mon sac est sans aucun doute mon appareil photo. J'adore capturer des moments spéciaux et les paysages magnifiques que je découvre. Pour moi, les photos sont les meilleurs souvenirs car elles permettent de revivre le voyage des années plus tard. Si je l'oubliais, je serais vraiment triste car mon téléphone ne fait pas d'aussi belles photos. C'est l'outil indispensable pour immortaliser mes aventures !",
    keyVocab: [
      { fr: "capturer", en: "to capture" },
      { fr: "immortaliser", en: "to immortalize / capture forever" },
      { fr: "un appareil photo", en: "a camera" },
      { fr: "revivre", en: "to relive" },
      { fr: "indispensable", en: "essential" },
      { fr: "sans aucun doute", en: "without a doubt" }
    ],
  },
  {
    id: "hol_20",
    topicKey: "holidays",
    text: "Penses-tu que voyager rend plus intelligent ?",
    hint: "Discuss how exposure to new cultures and experiences helps us grow.",
    difficulty: 3,
    followUps: [
      "Qu'as-tu appris lors de ton dernier voyage ?",
      "Est-ce que voyager change notre façon de voir le monde ?",
      "Peut-on apprendre autant dans les livres ?"
    ],
    modelAnswer: "Absolument. Voyager nous force à sortir de notre zone de confort et à nous adapter à des situations imprévues. On apprend à être plus tolérant et ouvert d'esprit en découvrant des modes de vie différents du nôtre. On apprend aussi l'histoire et la géographie de façon beaucoup plus concrète qu'à l'école. Pour moi, le voyage est la meilleure école car il nous enseigne l'autonomie et nous donne une perspective globale sur le monde.",
    keyVocab: [
      { fr: "zone de confort", en: "comfort zone" },
      { fr: "imprévu(e)", en: "unforeseen / unexpected" },
      { fr: "enseigner", en: "to teach" },
      { fr: "perspective globale", en: "global perspective" },
      { fr: "concrète", en: "concrete / real" },
      { fr: "autonomie", en: "autonomy / independence" }
    ],
  },
  {
    id: "hol_21",
    topicKey: "holidays",
    text: "Quel est le meilleur moment pour partir en vacances selon toi ?",
    hint: "Discuss your preferred season or time of year for traveling.",
    difficulty: 2,
    followUps: [
      "Préfères-tu les vacances scolaires ou hors saison ?",
      "Pourquoi aimes-tu partir à cette période ?",
      "Est-ce que c'est plus cher d'habitude ?"
    ],
    modelAnswer: "Pour moi, le meilleur moment est le mois de juin, juste avant les grandes vacances scolaires. Le temps est souvent magnifique, les journées sont les plus longues et il y a moins de monde que pendant l'été. C'est aussi souvent moins cher que pendant les vacances d'été. J'apprécie cette période car on peut vraiment profiter de la nature et de la tranquillité avant l'agitation du mois d'août. C'est le moment idéal pour se ressourcer.",
    keyVocab: [
      { fr: "hors saison", en: "off-season" },
      { fr: "une période", en: "a period / time" },
      { fr: "profiter de", en: "to enjoy / make the most of" },
      { fr: "août", en: "August" },
      { fr: "moins de monde", en: "fewer people" },
      { fr: "magnifique", en: "beautiful" }
    ],
  },
  {
    id: "hol_22",
    topicKey: "holidays",
    text: "As-tu déjà fait un voyage humanitaire ou aimerais-tu en faire un ?",
    hint: "Discuss combining travel with helping a community or environmental project.",
    difficulty: 3,
    followUps: [
      "Quelle cause aimerais-tu aider ?",
      "Penses-tu que c'est une expérience enrichissante ?",
      "Où aimerais-tu aller pour ce projet ?"
    ],
    modelAnswer: "Je n'en ai jamais fait, mais j'aimerais beaucoup participer à un projet de protection de l'environnement en Amérique du Sud, par exemple pour aider à la reforestation de l'Amazonie. Je pense que c'est une expérience extrêmement enrichissante car cela permet d'être utile tout en découvrant une nouvelle culture. C'est une façon de voyager plus responsable et humaine qui donne du sens à nos vacances. J'espère pouvoir réaliser ce projet l'année prochaine.",
    keyVocab: [
      { fr: "un voyage humanitaire", en: "humanitarian / volunteer trip" },
      { fr: "donner du sens", en: "to give meaning" },
      { fr: "enrichissant(e)", en: "enriching" },
      { fr: "utile", en: "useful" },
      { fr: "la reforestation", en: "reforestation" },
      { fr: "responsable", en: "responsible" }
    ],
  },

  // --- HOME (Final Polish) ---
  {
    id: "hom_16",
    topicKey: "home",
    text: "Comment est-ce que ta ville a changé ces dernières années ?",
    hint: "Talk about new buildings, shops, or changes in transport.",
    difficulty: 2,
    followUps: [
      "Y a-t-il plus de monde maintenant ?",
      "Les changements sont-ils positifs selon toi ?",
      "Qu'est-ce qui a disparu et que tu regrettes ?"
    ],
    modelAnswer: "Ma ville a énormément changé récemment. On a construit un nouveau centre commercial très moderne et plusieurs pistes cyclables. De plus, les transports en commun sont devenus plus fréquents et plus propres. Je pense que ces changements sont positifs car ils facilitent la vie des habitants. Cependant, je regrette la fermeture d'un petit cinéma indépendant qui a été remplacé par un fast-food. C'est dommage que la ville perde un peu de son caractère ancien.",
    keyVocab: [
      { fr: "ces dernières années", en: "in recent years" },
      { fr: "récemment", en: "recently" },
      { fr: "faciliter", en: "to make easier / facilitate" },
      { fr: "regretter", en: "to regret" },
      { fr: "disparaître", en: "to disappear" },
      { fr: "le caractère ancien", en: "old-fashioned character" }
    ],
  },
  {
    id: "hom_17",
    topicKey: "home",
    text: "Où se trouve ton endroit préféré pour faire du shopping dans ta ville ?",
    hint: "Describe a specific street, mall, or market you like.",
    difficulty: 1,
    followUps: [
      "Qu'est-ce que tu aimes acheter là-bas ?",
      "Est-ce que c'est souvent bondé ?",
      "Y vas-tu seul(e) ou avec des amis ?"
    ],
    modelAnswer: "Mon endroit préféré est une petite rue piétonne au centre-ville où il y a beaucoup de boutiques indépendantes et de cafés sympas. J'adore y aller le samedi après-midi avec mes copines pour faire du lèche-vitrines et prendre un goûter. C'est souvent bondé, mais l'ambiance est très joyeuse et animée. On peut y trouver des vêtements originaux et des accessoires qu'on ne voit nulle part ailleurs. C'est vraiment le cœur de la ville pour moi.",
    keyVocab: [
      { fr: "une rue piétonne", en: "a pedestrian street" },
      { fr: "faire du lèche-vitrines", en: "to go window-shopping" },
      { fr: "joyeux / joyeuse", en: "joyful / happy" },
      { fr: "nulle part ailleurs", en: "nowhere else" },
      { fr: "le cœur de la ville", en: "the heart of the city" },
      { fr: "bondé(e)", en: "crowded" }
    ],
  },
  {
    id: "hom_18",
    topicKey: "home",
    text: "Est-ce que ta ville est sûre le soir ?",
    hint: "Discuss the safety and security of your area at night.",
    difficulty: 2,
    followUps: [
      "As-tu peur de sortir seul(e) le soir ?",
      "Y a-t-il beaucoup de lumières dans les rues ?",
      "Est-ce que la police est présente ?"
    ],
    modelAnswer: "Dans l'ensemble, je pense que ma ville est assez sûre car les rues sont bien éclairées et il y a toujours du monde. Personnellement, je ne sors pas seul(e) très tard par précaution, mais je ne me sens pas en danger. Il y a souvent des patrouilles de police qui circulent, ce qui est rassurant. Le quartier où j'habite est particulièrement tranquille et familial, donc on peut s'y promener sans crainte, même après le coucher du soleil.",
    keyVocab: [
      { fr: "bien éclairé(e)", en: "well-lit" },
      { fr: "par précaution", en: "as a precaution" },
      { fr: "en danger", en: "in danger" },
      { fr: "une patrouille", en: "a patrol" },
      { fr: "sans crainte", en: "without fear" },
      { fr: "coucher du soleil", en: "sunset" }
    ],
  },
  {
    id: "hom_19",
    topicKey: "home",
    text: "Qu'est-ce que tu penses de l'architecture de ta ville ?",
    hint: "Compare old and new styles of buildings in your area.",
    difficulty: 3,
    followUps: [
      "Quel est le plus beau bâtiment ?",
      "Préfères-tu le style moderne ou classique ?",
      "Y a-t-il trop de constructions nouvelles ?"
    ],
    modelAnswer: "L'architecture de ma ville est un mélange intéressant de styles. Il y a une partie historique avec des bâtiments en pierre magnifique et une cathédrale gothique. À côté de cela, on a construit des immeubles très modernes en verre et en acier. Je préfère le style ancien car je trouve qu'il a plus de charme et d'histoire. Cependant, je pense que les nouvelles constructions sont nécessaires pour la croissance de la ville, à condition qu'elles respectent l'environnement.",
    keyVocab: [
      { fr: "un mélange", en: "a mixture / blend" },
      { fr: "en pierre", en: "made of stone" },
      { fr: "en acier", en: "made of steel" },
      { fr: "le charme", en: "charm" },
      { fr: "une condition", en: "a condition" },
      { fr: "un immeuble", en: "a building / apartment block" }
    ],
  },
  {
    id: "hom_20",
    topicKey: "home",
    text: "Est-ce qu'il y a assez d'activités culturelles dans ta ville ?",
    hint: "Discuss cinemas, theatres, festivals, and other cultural events.",
    difficulty: 2,
    followUps: [
      "Quel est le dernier événement culturel auquel tu as assisté ?",
      "Est-ce que c'est cher d'aller au théâtre ?",
      "Qu'est-ce qu'on pourrait améliorer ?"
    ],
    modelAnswer: "Oui, ma ville est assez dynamique sur le plan culturel. On a plusieurs cinémas, un théâtre municipal et on organise souvent des festivals de musique en été. Récemment, je suis allé(e) voir une pièce de théâtre moderne et c'était fantastique. Par contre, je trouve que les prix sont parfois trop élevés pour les jeunes. On devrait organiser plus d'événements gratuits dans les parcs pour permettre à tout le monde d'en profiter. La culture doit être accessible à tous.",
    keyVocab: [
      { fr: "sur le plan culturel", en: "culturally / in terms of culture" },
      { fr: "un événement", en: "an event" },
      { fr: "accessible", en: "accessible" },
      { fr: "fantastique", en: "fantastic" },
      { fr: "municipal(e)", en: "municipal / city" },
      { fr: "élevé(e)", en: "high" }
    ],
  },

  // --- FUTURE (Final Polish) ---
  {
    id: "fut_15",
    topicKey: "future",
    text: "Penses-tu que les robots feront tous les travaux ménagers à l'avenir ?",
    hint: "Discuss the role of automation in our daily home lives.",
    difficulty: 2,
    followUps: [
      "En as-tu déjà chez toi ?",
      "Qu'est-ce que cela changerait dans ta vie ?",
      "Est-ce une bonne ou une mauvaise chose ?"
    ],
    modelAnswer: "Je pense que c'est inévitable. On a déjà des robots aspirateurs qui font un excellent travail. Dans le futur, on aura sûrement des robots pour cuisiner, repasser le linge et même s'occuper du jardin. Ce serait une bonne chose car cela nous donnerait plus de temps libre pour nos loisirs et notre famille. Cependant, il ne faut pas devenir trop paresseux et perdre le sens de l'effort. La technologie doit nous aider, pas nous remplacer complètement.",
    keyVocab: [
      { fr: "inévitable", en: "inevitable" },
      { fr: "aspirateur", en: "vacuum cleaner" },
      { fr: "repasser le linge", en: "to iron the laundry" },
      { fr: "paresseux / paresseuse", en: "lazy" },
      { fr: "sûrement", en: "surely / probably" },
      { fr: "le sens de l'effort", en: "the value of effort" }
    ],
  },
  {
    id: "fut_16",
    topicKey: "future",
    text: "Comment la technologie changera-t-elle notre façon de voyager ?",
    hint: "Think about faster transport, virtual reality, or space travel.",
    difficulty: 3,
    followUps: [
      "Aimerais-tu aller sur la Lune ?",
      "Penses-tu que les avions seront plus rapides ?",
      "Le voyage virtuel remplacera-t-il le voyage réel ?"
    ],
    modelAnswer: "La technologie va rendre les voyages beaucoup plus rapides et écologiques. On aura peut-être des trains ultra-rapides qui relieront les continents en quelques heures. On pourra aussi explorer des endroits inaccessibles grâce à la réalité virtuelle, même si cela ne remplacera jamais l'émotion de découvrir un pays en vrai. Le tourisme spatial deviendra peut-être possible pour les gens ordinaires, ce qui serait une aventure extraordinaire, mais il faudra faire attention à l'impact environnemental.",
    keyVocab: [
      { fr: "relier", en: "to connect / link" },
      { fr: "réalité virtuelle", en: "virtual reality" },
      { fr: "ordinaire", en: "ordinary" },
      { fr: "extraordinaire", en: "extraordinary" },
      { fr: "un continent", en: "a continent" },
      { fr: "inaccessible", en: "inaccessible" }
    ],
  },
  {
    id: "fut_17",
    topicKey: "future",
    text: "Quel est ton plus grand défi pour l'avenir ?",
    hint: "Talk about a personal goal or obstacle you want to overcome.",
    difficulty: 3,
    followUps: [
      "Es-tu confiant(e) pour réussir ?",
      "Qui peut t'aider à atteindre tes buts ?",
      "Qu'est-ce qui te fait le plus peur ?"
    ],
    modelAnswer: "Mon plus grand défi est de réussir mes études supérieures et de trouver un métier qui me passionne vraiment. C'est un long chemin qui demande beaucoup de travail et de persévérance. Je suis confiant(e) car je suis très motivé(e), mais j'ai peur de ne pas être à la hauteur parfois. Mes parents et mes professeurs m'encouragent énormément, ce qui m'aide à rester focalisé(e) sur mes objectifs. L'essentiel est de ne jamais baisser les bras face aux difficultés.",
    keyVocab: [
      { fr: "un défi", en: "a challenge" },
      { fr: "études supérieures", en: "higher education" },
      { fr: "la persévérance", en: "perseverance" },
      { fr: "être à la hauteur", en: "to be up to the task / standard" },
      { fr: "baisser les bras", en: "to give up" },
      { fr: "focalisé(e)", en: "focused" }
    ],
  },
  {
    id: "fut_18",
    topicKey: "future",
    text: "Penses-tu que le monde sera meilleur dans cinquante ans ?",
    hint: "Discuss environmental, social, and technological progress.",
    difficulty: 3,
    followUps: [
      "Es-tu optimiste pour la planète ?",
      "Quels problèmes seront résolus selon toi ?",
      "Que pouvons-nous faire dès maintenant ?"
    ],
    modelAnswer: "Je veux être optimiste. J'espère que grâce à la technologie et à une prise de conscience globale, on aura réussi à résoudre les problèmes environnementaux majeurs. Le monde sera peut-être plus juste et solidaire grâce à une meilleure éducation pour tous. Cependant, de nouveaux défis apparaîtront sûrement. C'est à notre génération d'agir dès maintenant pour construire cet avenir meilleur. On a le pouvoir de changer les choses si on travaille ensemble avec détermination.",
    keyVocab: [
      { fr: "prise de conscience", en: "awareness / realization" },
      { fr: "solidaire", en: "supportive / united" },
      { fr: "apparaître", en: "to appear" },
      { fr: "détermination", en: "determination" },
      { fr: "global(e)", en: "global" },
      { fr: "majeur(e)", en: "major" }
    ],
  },
  {
    id: "fut_19",
    topicKey: "future",
    text: "Aimerais-tu être célèbre plus tard ? Pourquoi ?",
    hint: "Discuss the advantages and disadvantages of fame.",
    difficulty: 2,
    followUps: [
      "Dans quel domaine serais-tu célèbre ?",
      "La célébrité est-elle dangereuse ?",
      "Penses-tu que la vie privée est plus importante ?"
    ],
    modelAnswer: "Franchement, non. La célébrité semble avoir beaucoup d'avantages, comme l'argent et le succès, mais elle détruit souvent la vie privée. On est constamment observé et jugé par tout le monde, ce qui doit être très stressant. Je préfère avoir une vie tranquille et épanouie, entouré de mes vrais amis, plutôt que d'être connu(e) par des millions d'inconnus. Pour moi, le bonheur est dans les choses simples et authentiques, pas dans les paillettes de la célébrité.",
    keyVocab: [
      { fr: "la célébrité", en: "fame" },
      { fr: "vie privée", en: "private life" },
      { fr: "constamment", en: "constantly" },
      { fr: "inconnu(e)", en: "unknown / stranger" },
      { fr: "les paillettes", en: "glamour / glitter" },
      { fr: "authentique", en: "authentic" }
    ],
  },

  // --- FOOD (Final Polish) ---
  {
    id: "foo_17",
    topicKey: "food",
    text: "Est-ce que tu manges beaucoup de collations entre les repas ?",
    hint: "Talk about your snacking habits and if they are healthy.",
    difficulty: 1,
    followUps: [
      "Qu'est-ce que tu manges d'habitude ?",
      "Est-ce que c'est sain ?",
      "Pourquoi as-tu faim entre les repas ?"
    ],
    modelAnswer: "J'essaie de ne pas trop grignoter, mais j'ai souvent une petite faim vers seize heures. D'habitude, je mange un fruit ou une barre de céréales pour avoir de l'énergie avant mes activités sportives. Parfois, je craque pour quelques biscuits, mais j'essaie de limiter car je sais que c'est trop sucré. Je pense qu'une petite collation saine est nécessaire pour rester concentré(e) et ne pas arriver affamé(e) au dîner.",
    keyVocab: [
      { fr: "une collation", en: "a snack" },
      { fr: "grignoter", en: "to snack / nibble" },
      { fr: "avoir faim", en: "to be hungry" },
      { fr: "affamé(e)", en: "starving" },
      { fr: "craquer pour", en: "to give in to / fall for" },
      { fr: "sain(e)", en: "healthy" }
    ],
  },
  {
    id: "foo_18",
    topicKey: "food",
    text: "Quel est le plat le plus étrange que tu as déjà goûté ?",
    hint: "Describe a food experience that was unusual or surprising (past tense).",
    difficulty: 2,
    followUps: [
      "C'était où ?",
      "Est-ce que tu as aimé ?",
      "Voudrais-tu en remanger ?"
    ],
    modelAnswer: "Le plat le plus étrange était des escargots au beurre d'ail quand je suis allé(e) en France l'été dernier. Au début, j'avais un peu peur de goûter, mais finalement c'était plutôt bon ! La texture est un peu élastique mais le goût de l'ail et du persil est délicieux. Je n'en mangerais pas tous les jours, mais c'était une expérience culturelle intéressante. J'aime bien tester des choses nouvelles même si elles semblent bizarres au premier abord.",
    keyVocab: [
      { fr: "étrange", en: "strange" },
      { fr: "un escargot", en: "a snail" },
      { fr: "beurre d'ail", en: "garlic butter" },
      { fr: "élastique", en: "rubbery / elastic" },
      { fr: "au premier abord", en: "at first glance" },
      { fr: "bizarre", en: "weird" }
    ],
  },
  {
    id: "foo_19",
    topicKey: "food",
    text: "Pourquoi est-il important de manger en famille sans écrans ?",
    hint: "Discuss the benefits of conversation and social bonding during meals.",
    difficulty: 2,
    followUps: [
      "Manges-tu souvent devant la télé ?",
      "De quoi parlez-vous à table ?",
      "Est-ce difficile de poser son téléphone ?"
    ],
    modelAnswer: "Il est crucial de manger sans écrans pour vraiment profiter de la compagnie des autres et avoir des conversations de qualité. C'est le moment idéal pour partager les événements de la journée et se détendre ensemble. Sans téléphone, on est plus attentif à ce que l'on mange, ce qui est meilleur pour la digestion. C'est une règle d'or chez moi : pas de portables à table pour préserver ce moment de convivialité familiale.",
    keyVocab: [
      { fr: "une règle d'or", en: "a golden rule" },
      { fr: "la convivialité", en: "friendliness / conviviality" },
      { fr: "posé", en: "put down" },
      { fr: "profiter de", en: "to enjoy" },
      { fr: "la digestion", en: "digestion" },
      { fr: "qualité", en: "quality" }
    ],
  },
  {
    id: "foo_20",
    topicKey: "food",
    text: "Penses-tu que les émissions de cuisine à la télé sont utiles ?",
    hint: "Discuss if shows like Top Chef or Masterchef inspire people to cook.",
    difficulty: 2,
    followUps: [
      "Regardes-tu ce genre d'émissions ?",
      "Est-ce que cela te donne envie de cuisiner ?",
      "Qu'est-ce qu'on y apprend ?"
    ],
    modelAnswer: "Oui, je trouve ces émissions très inspirantes car elles montrent que cuisiner est un art et une passion. On y apprend des techniques nouvelles et on découvre des ingrédients originaux. Cela donne envie de se mettre aux fourneaux et de tester ses propres recettes. Même si c'est parfois un peu trop dramatique pour la télé, cela encourage les gens à manger des produits frais et à être plus créatifs dans leur cuisine au quotidien.",
    keyVocab: [
      { fr: "inspirant(e)", en: "inspiring" },
      { fr: "se mettre aux fourneaux", en: "to start cooking / get in the kitchen" },
      { fr: "une recette", en: "a recipe" },
      { fr: "dramatique", en: "dramatic" },
      { fr: "technique", en: "technique" },
      { fr: "au quotidien", en: "daily" }
    ],
  },
  {
    id: "foo_21",
    topicKey: "food",
    text: "Comment peut-on réduire le gaspillage alimentaire au niveau mondial ?",
    hint: "Discuss solutions like better planning, donating leftovers, or buying 'ugly' fruit.",
    difficulty: 3,
    followUps: [
      "Est-ce que tu jettes beaucoup de nourriture ?",
      "Que fait ton supermarché avec les produits invendus ?",
      "Pourquoi est-ce un problème grave ?"
    ],
    modelAnswer: "On peut réduire le gaspillage en planifiant mieux ses repas et en n'achetant que le nécessaire. Il faut aussi apprendre à utiliser les restes pour faire de nouveaux plats. Au niveau mondial, les supermarchés devraient donner les invendus à des associations caritatives plutôt que de les jeter. Le gaspillage est un scandale alors que des millions de gens ont faim. C'est aussi un désastre écologique car produire de la nourriture consomme énormément d'énergie et d'eau.",
    keyVocab: [
      { fr: "le gaspillage alimentaire", en: "food waste" },
      { fr: "les restes", en: "leftovers" },
      { fr: "une association caritative", en: "a charity" },
      { fr: "un invendu", en: "unsold item" },
      { fr: "planifier", en: "to plan" },
      { fr: "un scandale", en: "a scandal" }
    ],
  },

  // --- ENVIRONMENT (Final Polish) ---
  {
    id: "env_14",
    topicKey: "environment",
    text: "Est-ce que tu penses que la mode éthique est importante ?",
    hint: "Discuss the impact of fast fashion on the environment and workers.",
    difficulty: 2,
    followUps: [
      "Achètes-tu souvent des vêtements ?",
      "Connais-tu les marques éthiques ?",
      "Est-ce que c'est trop cher pour les jeunes ?"
    ],
    modelAnswer: "Oui, c'est primordial. La « fast fashion » est l'une des industries les plus polluantes au monde et les conditions de travail sont souvent affreuses. J'essaie d'acheter moins de vêtements et de choisir des marques plus responsables, ou même d'acheter d'occasion. C'est parfois plus cher, mais les vêtements durent plus longtemps. On doit tous réfléchir à l'impact de nos achats et privilégier la qualité plutôt que la quantité pour protéger notre planète.",
    keyVocab: [
      { fr: "mode éthique", en: "ethical fashion" },
      { fr: "d'occasion", en: "second-hand" },
      { fr: "affreux / affreuse", en: "awful / terrible" },
      { fr: "durer", en: "to last" },
      { fr: "un achat", en: "a purchase" },
      { fr: "privilégier", en: "to favor / prioritize" }
    ],
  },
  {
    id: "env_15",
    topicKey: "environment",
    text: "Quel est l'impact du tourisme sur l'environnement ?",
    hint: "Discuss flights, hotel waste, and the destruction of natural sites.",
    difficulty: 3,
    followUps: [
      "Peut-on voyager de façon écologique ?",
      "Faut-il limiter le nombre de touristes dans certains endroits ?",
      "Est-ce que tu fais attention quand tu es en vacances ?"
    ],
    modelAnswer: "Le tourisme a un impact énorme, surtout à cause des vols qui rejettent beaucoup de CO2. De plus, les hôtels consomment énormément d'eau et produisent beaucoup de déchets. Le tourisme de masse peut aussi détruire des écosystèmes fragiles. Je pense qu'on devrait privilégier le tourisme local et durable, et respecter la nature quand on visite de nouveaux endroits. Voyager est magnifique, mais on ne doit pas le faire au détriment de l'environnement.",
    keyVocab: [
      { fr: "au détriment de", en: "at the expense of" },
      { fr: "fragile", en: "fragile" },
      { fr: "le CO2", en: "CO2" },
      { fr: "durable", en: "sustainable" },
      { fr: "le tourisme de masse", en: "mass tourism" },
      { fr: "rejeter", en: "to emit / reject" }
    ],
  },
  {
    id: "env_16",
    topicKey: "environment",
    text: "Penses-tu que les énergies renouvelables sont la solution ?",
    hint: "Discuss solar, wind, and hydraulic energy vs. fossil fuels.",
    difficulty: 3,
    followUps: [
      "Y a-t-il des éoliennes dans ta région ?",
      "Est-ce que c'est suffisant pour nos besoins ?",
      "Pourquoi est-ce difficile de changer ?"
    ],
    modelAnswer: "Oui, les énergies renouvelables sont indispensables pour arrêter notre dépendance aux énergies fossiles. L'énergie solaire et éolienne sont des solutions propres et infinies. Dans ma région, on voit de plus en plus d'éoliennes et je trouve ça très positif. C'est un défi technologique et économique car on doit adapter tout notre système, mais c'est le seul moyen d'avoir un avenir durable et de lutter efficacement contre le réchauffement climatique.",
    keyVocab: [
      { fr: "énergies renouvelables", en: "renewable energies" },
      { fr: "une éolienne", en: "a wind turbine" },
      { fr: "fossile", en: "fossil" },
      { fr: "la dépendance", en: "dependence" },
      { fr: "propre", en: "clean" },
      { fr: "efficacement", en: "effectively" }
    ],
  },
  {
    id: "env_17",
    topicKey: "environment",
    text: "Comment peut-on encourager les gens à recycler davantage ?",
    hint: "Suggest ideas like better education, more bins, or financial incentives.",
    difficulty: 2,
    followUps: [
      "Est-ce que tu recycles tout ce que tu peux ?",
      "Le système de recyclage est-il clair dans ta ville ?",
      "Faut-il punir ceux qui ne recyclent pas ?"
    ],
    modelAnswer: "On peut encourager les gens par l'éducation dès l'école primaire et en rendant le recyclage plus facile avec plus de poubelles de tri dans les rues. Certains pays utilisent un système de consigne pour les bouteilles, ce qui fonctionne très bien. Je pense que la sensibilisation est plus efficace que la punition, car les gens doivent comprendre l'intérêt du geste. Quand on sait que nos déchets peuvent avoir une seconde vie, on est plus motivé pour faire l'effort.",
    keyVocab: [
      { fr: "poubelle de tri", en: "sorting bin" },
      { fr: "un système de consigne", en: "a deposit system" },
      { fr: "la punition", en: "punishment" },
      { fr: "seconde vie", en: "second life" },
      { fr: "l'intérêt", en: "the interest / benefit" },
      { fr: "davantage", en: "more" }
    ],
  },
  {
    id: "env_18",
    topicKey: "environment",
    text: "Si tu étais ministre de l'Environnement, quelle serait ta première mesure ?",
    hint: "Use conditional to describe a bold environmental policy.",
    difficulty: 3,
    followUps: [
      "Interdirais-tu les voitures en ville ?",
      "Donnerais-tu plus d'argent pour la nature ?",
      "Penses-tu que ce serait un métier difficile ?"
    ],
    modelAnswer: "Si j'étais ministre, ma première mesure serait de rendre les transports en commun totalement gratuits pour tout le monde afin de réduire massivement l'utilisation de la voiture. Je lancerais aussi un grand programme de reforestation nationale et je taxerais lourdement les entreprises les plus polluantes. Ce serait un métier très difficile à cause des pressions économiques, mais je serais déterminé(e) car l'urgence climatique est absolue. On doit agir avec courage pour l'avenir.",
    keyVocab: [
      { fr: "une mesure", en: "a measure" },
      { fr: "taxer lourdement", en: "to tax heavily" },
      { fr: "l'urgence climatique", en: "climate emergency" },
      { fr: "une pression", en: "pressure" },
      { fr: "massivement", en: "massively" },
      { fr: "le courage", en: "courage" }
    ],
  },

  // --- SCHOOL (Extended 2) ---
  {
    id: "sch_26",
    topicKey: "school",
    text: "Quelles sont les qualités d'un bon professeur selon toi ?",
    hint: "Discuss the traits that make a teacher effective and inspiring.",
    difficulty: 2,
    followUps: [
      "As-tu un professeur préféré ? Pourquoi ?",
      "Est-ce qu'un professeur doit être strict ?",
      "Comment un prof peut-il rendre sa matière plus intéressante ?"
    ],
    modelAnswer: "Selon moi, un bon professeur doit avant tout être passionné par sa matière et avoir beaucoup de patience. Il doit savoir expliquer les choses de façon claire et être à l'écoute de ses élèves. Un prof qui a le sens de l'humour est aussi très apprécié car cela rend le cours plus détendu. Pour moi, le plus important est qu'il nous encourage à donner le meilleur de nous-mêmes et qu'il nous donne envie d'apprendre.",
    keyVocab: [
      { fr: "à l'écoute", en: "attentive / a good listener" },
      { fr: "le sens de l'humour", en: "sense of humour" },
      { fr: "détendu(e)", en: "relaxed" },
      { fr: "encourager", en: "to encourage" },
      { fr: "donner le meilleur de soi", en: "to do one's best" },
      { fr: "donner envie de", en: "to make someone want to" }
    ],
  },
  {
    id: "sch_27",
    topicKey: "school",
    text: "Que penses-tu de la triche aux examens ?",
    hint: "Discuss the ethics of cheating and its consequences.",
    difficulty: 3,
    followUps: [
      "Pourquoi certains élèves trichent-ils ?",
      "Quelles sont les sanctions dans ton école ?",
      "Est-ce que la triche aide vraiment à réussir dans la vie ?"
    ],
    modelAnswer: "Je pense que la triche est un problème grave car c'est injuste pour les élèves qui travaillent dur. Même si cela peut sembler une solution facile pour avoir de bonnes notes, cela ne permet pas d'acquérir de vraies connaissances. À long terme, c'est contre-productif car on finit par manquer de bases solides. Je crois que l'honnêteté est une valeur fondamentale et qu'il vaut mieux avoir une note moyenne honnêtement que de tricher.",
    keyVocab: [
      { fr: "la triche", en: "cheating" },
      { fr: "injuste", en: "unfair" },
      { fr: "acquérir", en: "to acquire" },
      { fr: "contre-productif", en: "counter-productive" },
      { fr: "manquer de", en: "to lack" },
      { fr: "fondamental(e)", en: "fundamental" }
    ],
  },
  {
    id: "sch_28",
    topicKey: "school",
    text: "Est-ce que les compétitions sportives sont importantes à l'école ?",
    hint: "Talk about school sports days and their impact on students.",
    difficulty: 2,
    followUps: [
      "Participes-tu aux journées sportives de ton école ?",
      "Qu'est-ce qu'on apprend grâce à la compétition ?",
      "Est-ce que c'est trop stressant pour certains ?"
    ],
    modelAnswer: "Oui, je crois que les compétitions sportives sont essentielles car elles renforcent l'esprit d'équipe et apprennent la persévérance. C'est l'occasion de se dépasser physiquement et de représenter fièrement son école. On apprend aussi à gérer la victoire avec modestie et la défaite avec dignité. Même pour ceux qui ne sont pas très sportifs, c'est une journée festive qui crée de bons souvenirs et encourage un mode de vie sain.",
    keyVocab: [
      { fr: "esprit d'équipe", en: "team spirit" },
      { fr: "se dépasser", en: "to go beyond one's limits" },
      { fr: "fièrement", en: "proudly" },
      { fr: "gérer", en: "to manage / handle" },
      { fr: "la victoire / la défaite", en: "victory / defeat" },
      { fr: "festif / festive", en: "festive" }
    ],
  },
  {
    id: "sch_29",
    topicKey: "school",
    text: "L'école devrait-elle commencer plus tard le matin ?",
    hint: "Discuss the benefits and drawbacks of a later start time for students.",
    difficulty: 2,
    followUps: [
      "À quelle heure commences-tu d'habitude ?",
      "Serais-tu plus concentré(e) si tu dormais plus ?",
      "Est-ce que cela finirait trop tard l'après-midi ?"
    ],
    modelAnswer: "À mon avis, commencer une heure plus tard serait très bénéfique pour les adolescents. Les études montrent que les jeunes ont besoin de plus de sommeil pour être attentifs et performants. Si on commençait à neuf heures au lieu de huit heures, on serait moins fatigués et plus productifs en classe. Par contre, cela signifierait finir plus tard le soir, ce qui laisserait moins de temps pour les devoirs et les loisirs. C'est un dilemme difficile.",
    keyVocab: [
      { fr: "bénéfique", en: "beneficial" },
      { fr: "le sommeil", en: "sleep" },
      { fr: "performant(e)", en: "efficient / successful" },
      { fr: "signifier", en: "to mean" },
      { fr: "productif / productive", en: "productive" },
      { fr: "un dilemme", en: "a dilemma" }
    ],
  },

  // --- HOBBIES (Extended 2) ---
  {
    id: "hob_24",
    topicKey: "hobbies",
    text: "Considères-tu les réseaux sociaux comme un passe-temps ?",
    hint: "Discuss your use of TikTok, Instagram, etc., as a leisure activity.",
    difficulty: 2,
    followUps: [
      "Combien de temps passes-tu sur ton téléphone ?",
      "Qu'est-ce que tu aimes regarder sur les réseaux ?",
      "Est-ce que c'est une perte de temps selon toi ?"
    ],
    modelAnswer: "Oui, pour beaucoup de jeunes, scroller sur les réseaux sociaux est devenu le passe-temps principal. C'est un moyen de se détendre, de s'informer et de rester en contact avec ses amis. Personnellement, j'aime bien regarder des vidéos de cuisine ou des tutoriels de dessin. Cependant, il faut faire attention à ne pas y passer trop d'heures car cela peut vite devenir addictif et nous empêcher de faire des activités plus productives ou physiques.",
    keyVocab: [
      { fr: "scroller", en: "to scroll" },
      { fr: "s'informer", en: "to keep oneself informed" },
      { fr: "rester en contact", en: "to stay in touch" },
      { fr: "un tutoriel", en: "a tutorial" },
      { fr: "addictif / addictive", en: "addictive" },
      { fr: "empêcher de", en: "to prevent from" }
    ],
  },
  {
    id: "hob_25",
    topicKey: "hobbies",
    text: "Aimes-tu bricoler ou faire du bricolage ?",
    hint: "Talk about making things, crafts, or DIY projects.",
    difficulty: 2,
    followUps: [
      "Qu'as-tu fabriqué récemment ?",
      "Préfères-tu acheter ou fabriquer tes objets ?",
      "Est-ce que tu es habile de tes mains ?"
    ],
    modelAnswer: "J'adore faire du bricolage car je trouve ça très gratifiant de créer quelque chose de ses propres mains. Récemment, j'ai fabriqué un cadre photo en bois pour l'anniversaire de ma mère. J'aime aussi personnaliser mes vêtements ou réparer des objets cassés. Cela demande de la patience et de la précision, mais c'est une excellente façon d'exprimer sa créativité et de se sentir fier du résultat final. C'est aussi plus écologique que d'acheter du neuf.",
    keyVocab: [
      { fr: "le bricolage / bricoler", en: "DIY / to do DIY" },
      { fr: "gratifiant(e)", en: "rewarding / gratifying" },
      { fr: "un cadre", en: "a frame" },
      { fr: "habile", en: "skillful / handy" },
      { fr: "du neuf", en: "new things" },
      { fr: "le résultat final", en: "the final result" }
    ],
  },
  {
    id: "hob_26",
    topicKey: "hobbies",
    text: "Aimerais-tu essayer un sport extrême un jour ?",
    hint: "Discuss activities like skydiving, bungee jumping, or rock climbing.",
    difficulty: 2,
    followUps: [
      "Quel sport extrême te tente le plus ?",
      "As-tu peur du vide ou du danger ?",
      "Est-ce que c'est trop risqué selon toi ?"
    ],
    modelAnswer: "Je serais très tenté(e) par le saut en parachute car j'ai toujours rêvé de voler. J'aime les sensations fortes et l'adrénaline. Bien sûr, j'aurais un peu peur avant de sauter, mais je pense que l'expérience serait inoubliable. Par contre, certains sports comme l'escalade sans corde me semblent beaucoup trop dangereux. Il faut savoir faire la part des choses entre le défi personnel et le risque inutile pour sa vie.",
    keyVocab: [
      { fr: "le saut en parachute", en: "skydiving" },
      { fr: "sensations fortes", en: "thrills" },
      { fr: "le vide", en: "heights / the void" },
      { fr: "tenter", en: "to tempt / try" },
      { fr: "risqué", en: "risky" },
      { fr: "faire la part des choses", en: "to find a balance / put things into perspective" }
    ],
  },
  {
    id: "hob_27",
    topicKey: "hobbies",
    text: "Tu préfères regarder le sport à la télé ou le pratiquer ?",
    hint: "Contrast watching matches with participating in physical activities.",
    difficulty: 2,
    followUps: [
      "Quel sport aimes-tu regarder ?",
      "Est-ce que l'ambiance au stade est meilleure ?",
      "Pourquoi est-il important de rester actif ?"
    ],
    modelAnswer: "Sans hésiter, je préfère pratiquer le sport. C'est bien plus gratifiant de faire l'effort soi-même et de sentir son corps progresser. J'aime l'action et l'interaction avec mes coéquipiers. Regarder le sport à la télé est sympa pour les grands événements comme la Coupe du Monde, mais je trouve que c'est parfois un peu passif. Rien ne remplace l'adrénaline du terrain et le plaisir de marquer un point par ses propres moyens.",
    keyVocab: [
      { fr: "sans hésiter", en: "without hesitation" },
      { fr: "pratiquer", en: "to practice / do" },
      { fr: "un coéquipier", en: "a teammate" },
      { fr: "passif / passive", en: "passive" },
      { fr: "rien ne remplace", en: "nothing replaces" },
      { fr: "marquer un point", en: "to score a point" }
    ],
  },

  // --- FAMILY (Extended 2) ---
  {
    id: "fam_23",
    topicKey: "family",
    text: "Quelle place occupent les animaux domestiques dans ta famille ?",
    hint: "Talk about your pets and how they are treated like family members.",
    difficulty: 1,
    followUps: [
      "As-tu un chien ou un chat ?",
      "Qui s'occupe de l'animal à la maison ?",
      "Penses-tu qu'un animal aide à être plus responsable ?"
    ],
    modelAnswer: "Dans ma famille, notre chien Max est considéré comme un membre à part entière. Il apporte beaucoup de joie et de réconfort à tout le monde. Je m'occupe de le promener tous les soirs et de lui donner à manger. Je pense qu'avoir un animal est excellent pour les jeunes car cela nous apprend la responsabilité et l'empathie. C'est une présence fidèle qui rend la maison beaucoup plus vivante et chaleureuse.",
    keyVocab: [
      { fr: "un membre à part entière", en: "a full-fledged member" },
      { fr: "le réconfort", en: "comfort / solace" },
      { fr: "promener", en: "to walk (an animal)" },
      { fr: "fidèle", en: "loyal / faithful" },
      { fr: "vivant(e)", en: "lively" },
      { fr: "chaleureux / chaleureuse", en: "warm / cozy" }
    ],
  },
  {
    id: "fam_24",
    topicKey: "family",
    text: "Comment sont les règles et la discipline chez toi ?",
    hint: "Discuss house rules, punishments, and how your parents maintain order.",
    difficulty: 2,
    followUps: [
      "Quelles sont les règles les plus importantes ?",
      "Est-ce que tes parents sont sévères ?",
      "Y a-v-il des conséquences si tu ne respectes pas les règles ?"
    ],
    modelAnswer: "Chez moi, les règles sont assez claires mais justes. Les plus importantes concernent l'heure du coucher et le temps passé sur les écrans. Mes parents ne sont pas extrêmement sévères, mais ils insistent sur le respect mutuel et l'honnêteté. Si je ne respecte pas un engagement, je peux être privé de sortie le week-end. Je pense que c'est nécessaire pour avoir une bonne ambiance et pour nous apprendre à être disciplinés et responsables.",
    keyVocab: [
      { fr: "la discipline", en: "discipline" },
      { fr: "sévère", en: "strict / severe" },
      { fr: "un engagement", en: "a commitment / promise" },
      { fr: "privé(e) de", en: "deprived of / banned from" },
      { fr: "juste", en: "fair" },
      { fr: "mutuel(le)", en: "mutual" }
    ],
  },
  {
    id: "fam_25",
    topicKey: "family",
    text: "Penses-tu que ce sera difficile de quitter ta famille pour l'université ?",
    hint: "Discuss the emotional and practical aspects of moving away from home.",
    difficulty: 3,
    followUps: [
      "Aimerais-tu étudier loin de chez toi ?",
      "Qu'est-ce qui te manquerait le plus ?",
      "Es-tu prêt(e) à être indépendant(e) ?"
    ],
    modelAnswer: "Je pense que ce sera un mélange d'excitation et d'appréhension. D'un côté, j'ai hâte de découvrir l'indépendance et de vivre de nouvelles aventures. D'un autre côté, le confort de la maison et les repas de mes parents me manqueront énormément. Je devrai apprendre à tout gérer seul(e) : la cuisine, le ménage et mon budget. Ce sera un grand défi, mais c'est une étape indispensable pour grandir et devenir un adulte autonome.",
    keyVocab: [
      { fr: "l'appréhension", en: "apprehension / fear" },
      { fr: "l'indépendance", en: "independence" },
      { fr: "hâte de", en: "can't wait to" },
      { fr: "gérer", en: "to manage" },
      { fr: "indispensable", en: "essential / indispensable" },
      { fr: "autonome", en: "self-sufficient / autonomous" }
    ],
  },
  {
    id: "fam_26",
    topicKey: "family",
    text: "Qu'est-ce que tu penses du fossé des générations ?",
    hint: "Discuss the differences in ideas and values between young people and older relatives.",
    difficulty: 3,
    followUps: [
      "Comprends-tu toujours tes grands-parents ?",
      "Sur quels sujets êtes-vous en désaccord ?",
      "Est-ce que la technologie accentue ce fossé ?"
    ],
    modelAnswer: "Je crois que le fossé des générations est réel, surtout à cause de la rapidité des changements technologiques. Mes grands-parents ont parfois du mal à comprendre l'importance des réseaux sociaux ou de l'IA dans nos vies. Sur certains sujets sociaux, nos valeurs peuvent aussi diverger. Cependant, je pense qu'on peut beaucoup apprendre les uns des autres : nous leur apportons la modernité et ils nous transmettent leur sagesse et leur expérience. Le dialogue est la clé.",
    keyVocab: [
      { fr: "le fossé des générations", en: "generation gap" },
      { fr: "diverger", en: "to differ / diverge" },
      { fr: "transmettre", en: "to pass on / transmit" },
      { fr: "la sagesse", en: "wisdom" },
      { fr: "réel(le)", en: "real" },
      { fr: "accentuer", en: "to emphasize / accentuate" }
    ],
  },

  // --- HOLIDAYS (Extended 2) ---
  {
    id: "hol_23",
    topicKey: "holidays",
    text: "Tu préfères voyager seul(e) ou avec d'autres personnes ? Pourquoi ?",
    hint: "Contrast solo travel with group or family trips.",
    difficulty: 2,
    followUps: [
      "Quels sont les avantages de voyager en groupe ?",
      "Est-ce que voyager seul est dangereux ?",
      "Avec qui aimes-tu le plus partir ?"
    ],
    modelAnswer: "Pour l'instant, je préfère voyager avec mes amis ou ma famille car c'est plus convivial et rassurant. On peut partager les frais, les souvenirs et s'entraider en cas de problème. Voyager seul peut être une expérience très formatrice car on a une liberté totale, mais cela peut aussi être un peu solitaire. Je pense qu'un jour j'essaierai un voyage en solo pour me découvrir moi-même, mais pour de vraies vacances, je préfère la compagnie de mes proches.",
    keyVocab: [
      { fr: "convivial(e)", en: "friendly / sociable" },
      { fr: "les frais", en: "costs / expenses" },
      { fr: "s'entraider", en: "to help each other" },
      { fr: "formateur / formatrice", en: "character-building / educational" },
      { fr: "solitaire", en: "lonely / solitary" },
      { fr: "rassurant(e)", en: "reassuring" }
    ],
  },
  {
    id: "hol_24",
    topicKey: "holidays",
    text: "Comment est-ce que tu planifies tes vacances ?",
    hint: "Talk about booking, research, and organizing your trips.",
    difficulty: 2,
    followUps: [
      "Utilises-tu des sites internet ou des agences de voyage ?",
      "Préfères-tu tout organiser à l'avance ou improviser ?",
      "Qui décide de la destination finale ?"
    ],
    modelAnswer: "Je passe beaucoup de temps sur internet à lire des blogs et à regarder des vidéos sur YouTube pour trouver les meilleures destinations. J'utilise des sites comme Booking ou Airbnb pour réserver le logement. Je préfère organiser les grandes lignes à l'avance — comme les vols et l'hôtel — mais je laisse toujours une place à l'improvisation une fois sur place. En général, on discute tous ensemble en famille pour choisir le lieu final afin que tout le monde soit content.",
    keyVocab: [
      { fr: "planifier", en: "to plan" },
      { fr: "réserver", en: "to book" },
      { fr: "le logement", en: "accommodation" },
      { fr: "les grandes lignes", en: "the main points / outline" },
      { fr: "l'improvisation", en: "improvisation" },
      { fr: "sur place", en: "there / on the spot" }
    ],
  },
  {
    id: "hol_25",
    topicKey: "holidays",
    text: "Est-ce que tu achètes souvent des souvenirs quand tu es en vacances ?",
    hint: "Discuss what items you bring back and why they are important.",
    difficulty: 1,
    followUps: [
      "Quel est ton souvenir préféré ?",
      "Achètes-tu des cadeaux pour tes amis ?",
      "Est-ce que c'est un gaspillage d'argent selon toi ?"
    ],
    modelAnswer: "Oui, j'adore ramener des petits objets qui me rappellent le voyage, comme des magnets pour le frigo ou des cartes postales. J'achète aussi souvent des spécialités locales pour mes amis. Mon souvenir préféré est un petit bracelet que j'ai acheté sur un marché en Grèce. Je ne pense pas que ce soit un gaspillage d'argent si l'objet a une valeur sentimentale. C'est une façon de prolonger le plaisir du voyage une fois rentré à la maison.",
    keyVocab: [
      { fr: "ramener", en: "to bring back" },
      { fr: "un magnet", en: "a magnet" },
      { fr: "une spécialité locale", en: "a local specialty" },
      { fr: "valeur sentimentale", en: "sentimental value" },
      { fr: "prolonger", en: "to prolong / extend" },
      { fr: "un souvenir", en: "a souvenir / memory" }
    ],
  },
  {
    id: "hol_26",
    topicKey: "holidays",
    text: "Aimes-tu rendre visite à ta famille qui habite à l'étranger ?",
    hint: "Talk about trips to see relatives in other countries.",
    difficulty: 2,
    followUps: [
      "Où habite ta famille à l'étranger ?",
      "Est-ce que tu y vas souvent ?",
      "Est-ce que c'est différent de vraies vacances ?"
    ],
    modelAnswer: "Oui, j'aime beaucoup aller voir mes cousins qui habitent en Espagne. C'est l'occasion de passer du temps ensemble et de découvrir leur mode de vie quotidien. C'est un peu différent de vraies vacances car on ne loge pas à l'hôtel et on ne fait pas toujours des activités de touristes. On partage des repas en famille et on discute beaucoup. Pour moi, es'est très important de garder ces liens familiaux malgré la distance géographique.",
    keyVocab: [
      { fr: "rendre visite à", en: "to visit (a person)" },
      { fr: "étranger", en: "foreign country / abroad" },
      { fr: "quotidien(ne)", en: "daily" },
      { fr: "garder les liens", en: "to keep in touch / maintain bonds" },
      { fr: "la distance", en: "distance" },
      { fr: "malgré", en: "despite" }
    ],
  },

  // --- HOME (Extended 2) ---
  {
    id: "hom_21",
    topicKey: "home",
    text: "Comment sont réparties les tâches ménagères chez toi ?",
    hint: "Discuss who does the cooking, cleaning, laundry, etc.",
    difficulty: 2,
    followUps: [
      "Quelles tâches fais-tu toi-même ?",
      "Penses-tu que la répartition est juste ?",
      "Tes parents te paient-ils pour aider ?"
    ],
    modelAnswer: "Chez moi, on essaie de se partager les tâches de façon équitable. Ma mère s'occupe souvent de la cuisine et mon père du bricolage et du jardin. Personnellement, je dois ranger ma chambre, mettre la table et vider le lave-vaisselle. Je ne suis pas payé(e) pour le faire car je pense que c'est normal de contribuer à la vie de la maison. Je crois que la répartition est assez juste, même si je n'aime pas trop faire le ménage !",
    keyVocab: [
      { fr: "répartir / la répartition", en: "to distribute / distribution" },
      { fr: "équitable", en: "fair / equal" },
      { fr: "le lave-vaisselle", en: "dishwasher" },
      { fr: "contribuer", en: "to contribute" },
      { fr: "le ménage", en: "housework / cleaning" },
      { fr: "juste", en: "fair" }
    ],
  },
  {
    id: "hom_22",
    topicKey: "home",
    text: "Décris ta maison idéale.",
    hint: "Use the conditional to talk about your dream home.",
    difficulty: 2,
    followUps: [
      "Où se trouverait cette maison ?",
      "Combien de pièces y aurait-il ?",
      "Y aurait-il une piscine ou un grand jardin ?"
    ],
    modelAnswer: "Ma maison idéale se trouverait au bord de l'océan, avec une vue magnifique sur la mer. Ce serait une villa moderne et lumineuse avec de grandes baies vitrées. Il y aurait au moins cinq chambres, un home-cinéma et, bien sûr, une piscine à débordement. Le jardin serait rempli de plantes exotiques et de hamacs pour se détendre. Ce serait un véritable havre de paix où je pourrais inviter tous mes amis et ma famille.",
    keyVocab: [
      { fr: "une baie vitrée", en: "a large glass door / window" },
      { fr: "une piscine à débordement", en: "infinity pool" },
      { fr: "exotique", en: "exotic" },
      { fr: "un hamac", en: "a hammock" },
      { fr: "un havre de paix", en: "a haven of peace" },
      { fr: "lumineux / lumineuse", en: "bright / light" }
    ],
  },
  {
    id: "hom_23",
    topicKey: "home",
    text: "Préfères-tu vivre dans un appartement ou dans une maison ?",
    hint: "Contrast living in a flat/apartment with a detached/semi-detached house.",
    difficulty: 2,
    followUps: [
      "Quels sont les avantages d'un appartement ?",
      "Pourquoi les gens préfèrent-ils les maisons ?",
      "Et toi, où habites-tu actuellement ?"
    ],
    modelAnswer: "Je préfère nettement vivre dans une maison car on a plus d'espace et souvent un jardin privé. On n'a pas non plus de voisins directement au-dessus ou en dessous, donc c'est plus calme. Cependant, vivre dans un appartement en centre-ville est très pratique car tout est à proximité : les magasins, les transports et les loisirs. Actuellement, j'habite dans une maison de banlieue et j'apprécie beaucoup la tranquillité du quartier.",
    keyVocab: [
      { fr: "nettement", en: "clearly / much" },
      { fr: "privé(e)", en: "private" },
      { fr: "à proximité", en: "nearby" },
      { fr: "banlieue", en: "suburbs" },
      { fr: "tranquillité", en: "peace / quiet" },
      { fr: "actuellement", en: "currently" }
    ],
  },
  {
    id: "hom_24",
    topicKey: "home",
    text: "Y a-t-il des marchés locaux dans ton quartier ?",
    hint: "Talk about open-air markets and what they sell.",
    difficulty: 1,
    followUps: [
      "À quelle fréquence y vas-tu ?",
      "Préfères-tu le marché ou le supermarché ?",
      "Qu'est-ce qu'on peut y acheter de spécial ?"
    ],
    modelAnswer: "Oui, il y a un marché fermier tous les samedis matins sur la place principale. J'adore l'ambiance : c'est très vivant et coloré. On y trouve des fruits et légumes frais, du fromage artisanal et parfois des fleurs. Je préfère le marché au supermarché car les produits sont de meilleure qualité et on peut discuter directement avec les producteurs. C'est un moment convivial qui permet de soutenir l'économie locale.",
    keyVocab: [
      { fr: "un marché fermier", en: "a farmers' market" },
      { fr: "artisanal(e)", en: "artisanal / handcrafted" },
      { fr: "frais / fraîche", en: "fresh" },
      { fr: "un producteur", en: "a producer / farmer" },
      { fr: "vivant(e)", en: "lively / vibrant" },
      { fr: "soutenir", en: "to support" }
    ],
  },

  // --- FUTURE (Extended 2) ---
  {
    id: "fut_20",
    topicKey: "future",
    text: "Que penses-tu du mariage ? Est-ce important pour toi ?",
    hint: "Discuss your views on traditional marriage vs. other forms of commitment.",
    difficulty: 2,
    followUps: [
      "Veux-tu te marier un jour ?",
      "Penses-tu que c'est une institution démodée ?",
      "Qu'est-ce qui est le plus important pour un couple heureux ?"
    ],
    modelAnswer: "Je pense que le mariage est une belle tradition qui symbolise l'engagement envers une personne. Pour moi, c'est important car cela crée une base solide pour fonder une famille. Cependant, je respecte tout à fait ceux qui préfèrent vivre ensemble sans se marier officiellement. Je ne crois pas que ce soit démodé, mais c'est devenu un choix personnel plutôt qu'une obligation sociale. Le plus important est le respect et la communication.",
    keyVocab: [
      { fr: "le mariage", en: "marriage" },
      { fr: "l'engagement", en: "commitment" },
      { fr: "démodé(e)", en: "old-fashioned" },
      { fr: "officiellement", en: "officially" },
      { fr: "une obligation", en: "an obligation" },
      { fr: "symboliser", en: "to symbolize" }
    ],
  },
  {
    id: "fut_21",
    topicKey: "future",
    text: "Penses-tu que les humains habiteront sur d'autres planètes ?",
    hint: "Discuss space colonization and living on Mars or the Moon.",
    difficulty: 3,
    followUps: [
      "Aimerais-tu vivre sur Mars ?",
      "Quels seraient les plus grands défis ?",
      "Est-ce une solution aux problèmes de la Terre ?"
    ],
    modelAnswer: "Je pense que c'est une possibilité fascinante, mais pas pour un futur proche. La technologie progresse vite, mais les défis sont énormes : le manque d'air, d'eau et les radiations extrêmes. Personnellement, je n'aimerais pas vivre sur Mars car le confort et la nature de la Terre me manqueraient trop. Je crois qu'on devrait d'abord se concentrer sur la protection de notre propre planète plutôt que de chercher à s'enfuir ailleurs.",
    keyVocab: [
      { fr: "fascinant(e)", en: "fascinating" },
      { fr: "futur proche", en: "near future" },
      { fr: "les radiations", en: "radiation" },
      { fr: "s'enfuir", en: "to flee / escape" },
      { fr: "ailleurs", en: "elsewhere" },
      { fr: "le manque de", en: "the lack of" }
    ],
  },
  {
    id: "fut_22",
    topicKey: "future",
    text: "Est-ce que tu penses changer de carrière plusieurs fois dans ta vie ?",
    hint: "Discuss the modern idea of career mobility vs. having one job for life.",
    difficulty: 3,
    followUps: [
      "Est-ce que c'est stressant de changer de métier ?",
      "Quels sont les avantages de la polyvalence ?",
      "Est-ce difficile d'apprendre de nouvelles choses à 40 ans ?"
    ],
    modelAnswer: "Oui, je crois que c'est la réalité du monde du travail aujourd'hui. Il est rare de garder le même emploi pendant quarante ans. Je trouve que c'est une opportunité de se renouveler et de ne pas s'ennuyer. La polyvalence est une grande qualité car elle permet de s'adapter à différentes situations. Bien sûr, cela demande de se former tout au long de sa vie, mais c'est stimulant intellectuellement et cela permet d'avoir des expériences variées.",
    keyVocab: [
      { fr: "changer de carrière", en: "to change career" },
      { fr: "se renouveler", en: "to reinvent oneself" },
      { fr: "la polyvalence", en: "versatility" },
      { fr: "stimulant(e)", en: "stimulating" },
      { fr: "se former", en: "to train / educate oneself" },
      { fr: "rare", en: "rare" }
    ],
  },
  {
    id: "fut_23",
    topicKey: "future",
    text: "Comment imagines-tu ta retraite ?",
    hint: "Talk about your plans for your late years (travel, relaxation, hobbies).",
    difficulty: 2,
    followUps: [
      "À quel âge aimerais-tu t'arrêter de travailler ?",
      "Où habiterais-tu ?",
      "Quelles activités ferais-tu ?"
    ],
    modelAnswer: "J'imagine ma retraite comme un moment de liberté totale pour voyager et profiter de mes passions. J'aimerais habiter dans une petite maison au bord de la mer et passer mes journées à jardiner, lire et cuisiner de bons repas pour ma famille. J'aimerais aussi faire du bénévolat pour rester actif socialement. Pour moi, la retraite n'est pas la fin de tout, mais le début d'une nouvelle étape de vie plus paisible et sereine.",
    keyVocab: [
      { fr: "la retraite", en: "retirement" },
      { fr: "jardiner", en: "to garden" },
      { fr: "paisible", en: "peaceful" },
      { fr: "serein(e)", en: "serene / calm" },
      { fr: "le début", en: "the beginning" },
      { fr: "profiter de", en: "to enjoy / make the most of" }
    ],
  },

  // --- FOOD (Extended 2) ---
  {
    id: "foo_22",
    topicKey: "food",
    text: "Tu préfères le fast-food ou les repas faits maison ?",
    hint: "Compare quick takeaway food with home-cooked meals.",
    difficulty: 1,
    followUps: [
      "Pourquoi le fast-food est-il si populaire ?",
      "Est-ce que tu sais cuisiner ?",
      "Lequel est meilleur pour la santé ?"
    ],
    modelAnswer: "Je préfère nettement les repas faits maison car ils ont plus de goût et on sait exactement quels ingrédients sont utilisés. C'est beaucoup plus sain et équilibré. Le fast-food est sympa de temps en temps pour dépanner car c'est rapide et pas cher, mais c'est souvent trop gras et trop salé. J'aime bien aider mes parents en cuisine et apprendre de nouvelles recettes ; c'est un moment convivial et créatif.",
    keyVocab: [
      { fr: "fait maison", en: "home-made" },
      { fr: "de temps en temps", en: "from time to time" },
      { fr: "dépanner", en: "to help out / as a backup" },
      { fr: "trop gras / trop salé", en: "too fatty / too salty" },
      { fr: "une recette", en: "a recipe" },
      { fr: "équilibré(e)", en: "balanced" }
    ],
  },
  {
    id: "foo_23",
    topicKey: "food",
    text: "Quelle est l'importance du café et du thé dans ta culture ?",
    hint: "Discuss beverage culture and social habits around coffee/tea.",
    difficulty: 2,
    followUps: [
      "Que bois-tu le matin ?",
      "Est-ce que c'est une occasion de se retrouver ?",
      "Lequel préfères-tu ?"
    ],
    modelAnswer: "Le café et le thé sont des éléments essentiels de la vie sociale. C'est souvent l'excuse parfaite pour se retrouver entre amis ou en famille et discuter. Le matin, beaucoup de gens ne peuvent pas commencer leur journée sans un café bien fort. Personnellement, je préfère le thé l'après-midi car je trouve ça plus relaxant. C'est un rituel quotidien qui permet de faire une pause dans une journée bien remplie.",
    keyVocab: [
      { fr: "bien fort", en: "strong (coffee)" },
      { fr: "se retrouver", en: "to meet up" },
      { fr: "un rituel", en: "a ritual" },
      { fr: "bien remplie", en: "busy / full" },
      { fr: "quotidien(ne)", en: "daily" },
      { fr: "relaxant(e)", en: "relaxing" }
    ],
  },
  {
    id: "foo_24",
    topicKey: "food",
    text: "Comment est-ce que tes habitudes alimentaires ont changé ?",
    hint: "Compare what you ate as a child with your diet now.",
    difficulty: 2,
    followUps: [
      "Mangeais-tu plus de bonbons avant ?",
      "Es-tu devenu(e) plus difficile ou plus ouvert(e) ?",
      "Pourquoi manges-tu différemment maintenant ?"
    ],
    modelAnswer: "Quand j'étais petit(e), je ne voulais manger que des pâtes et des nuggets de poulet ! J'avais horreur des légumes verts. Aujourd'hui, je suis beaucoup plus ouvert(e) et j'adore tester des saveurs exotiques comme la cuisine thaïlandaise ou libanaise. J'essaie aussi de manger plus sainement car j'ai compris que l'alimentation a un impact direct sur mon énergie et ma santé. Je fais plus attention à la qualité des produits.",
    keyVocab: [
      { fr: "habitudes alimentaires", en: "eating habits" },
      { fr: "avoir horreur de", en: "to hate / loathe" },
      { fr: "saveurs", en: "flavors" },
      { fr: "differemment", en: "differently" },
      { fr: "exotique", en: "exotic" },
      { fr: "un impact", en: "an impact" }
    ],
  },

  // --- ENVIRONMENT (Extended 2) ---
  {
    id: "env_19",
    topicKey: "environment",
    text: "Pourquoi est-il crucial de protéger les océans ?",
    hint: "Discuss plastic pollution, marine life, and the role of oceans in the climate.",
    difficulty: 3,
    followUps: [
      "Quelles sont les plus grandes menaces ?",
      "Que peut-on faire individuellement ?",
      "Est-ce que tu avez déjà vu une plage polluée ?"
    ],
    modelAnswer: "Les océans sont les poumons de la planète car ils produisent une grande partie de l'oxygène. Il est crucial de les protéger contre la pollution plastique et le réchauffement des eaux qui détruit les coraux. Individuellement, on peut réduire notre consommation de plastique à usage unique et faire attention à ne rien jeter sur les plages. Si les océans meurent, c'est tout l'écosystème terrestre qui sera menacé de disparition.",
    keyVocab: [
      { fr: "les poumons de la planète", en: "the lungs of the planet" },
      { fr: "oxygène", en: "oxygen" },
      { fr: "coraux", en: "corals" },
      { fr: "à usage unique", en: "single-use" },
      { fr: "terrestre", en: "terrestrial / on land" },
      { fr: "menacé de disparition", en: "threatened with extinction" }
    ],
  },
  {
    id: "env_20",
    topicKey: "environment",
    text: "Que penses-tu du verdissement urbain ?",
    hint: "Discuss planting more trees and parks in cities.",
    difficulty: 2,
    followUps: [
      "Y a-t-il assez de parcs dans ta ville ?",
      "Quels sont les avantages des arbres en ville ?",
      "Aimerais-tu avoir un jardin sur ton toit ?"
    ],
    modelAnswer: "Je pense que c'est une nécessité absolue pour rendre nos villes vivables. Planter plus d'arbres permet de réduire la pollution de l'air et de créer des îlots de fraîcheur pendant les canicules. C'est aussi très bon pour le moral des habitants d'avoir accès à des espaces verts. J'adorerais que ma ville installe plus de jardins partagés et de murs végétalisés ; cela rendrait le paysage urbain beaucoup plus beau et agréable au quotidien.",
    keyVocab: [
      { fr: "verdissement urbain", en: "urban greening" },
      { fr: "îlot de fraîcheur", en: "cooling island" },
      { fr: "canicule", en: "heatwave" },
      { fr: "végétalisé", en: "covered in plants" },
      { fr: "vivable", en: "livable" },
      { fr: "au quotidien", en: "daily" }
    ],
  },
  {
    id: "env_21",
    topicKey: "environment",
    text: "Comment essaies-tu de réduire ton empreinte carbone ?",
    hint: "Talk about your personal actions like transport, diet, and consumption.",
    difficulty: 3,
    followUps: [
      "Utilises-tu moins la voiture ?",
      "Manges-tu moins de viande ?",
      "Achètes-tu moins de choses neuves ?"
    ],
    modelAnswer: "J'essaie de faire de petits gestes chaque jour. Par exemple, je me déplace au maximum à vélo ou à pied au lieu de prendre la voiture. J'ai aussi réduit ma consommation de viande car l'élevage industriel pollue énormément. Enfin, j'évite de commander trop de choses en ligne pour limiter les emballages et le transport. Je crois que si tout le monde faisait un petit effort, on pourrait vraiment ralentir le changement climatique ensemble.",
    keyVocab: [
      { fr: "empreinte carbone", en: "carbon footprint" },
      { fr: "se déplacer", en: "to get around / travel" },
      { fr: "au maximum", en: "as much as possible" },
      { fr: "l'élevage industriel", en: "factory farming" },
      { fr: "ralentir", en: "to slow down" },
      { fr: "un petit geste", en: "a small action / gesture" }
    ],
  },
  {
    id: "sch_30",
    topicKey: "school",
    text: "Préfères-tu être interne ou externe à l'école ?",
    hint: "Discuss the pros and cons of being a boarding student vs. a day student.",
    difficulty: 2,
    followUps: [
      "Quels sont les avantages de vivre à l'école ?",
      "Est-ce que ta famille te manquerait si tu étais interne ?",
      "Penses-tu que l'internat aide à devenir plus indépendant ?"
    ],
    modelAnswer: "Je préfère être externe car j'aime retrouver le confort de ma maison et passer du temps avec ma famille après les cours. Cependant, je comprends que l'internat puisse être bénéfique pour se concentrer sur ses études et se faire des amis proches. À mon avis, être externe permet de garder un meilleur équilibre entre la vie scolaire et la vie personnelle.",
    keyVocab: [
      { fr: "interne", en: "boarding student" },
      { fr: "externe", en: "day student" },
      { fr: "l'internat", en: "boarding school" },
      { fr: "le confort", en: "comfort" },
      { fr: "indépendant(e)", en: "independent" },
      { fr: "se concentrer", en: "to concentrate" }
    ],
  },
  {
    id: "sch_31",
    topicKey: "school",
    text: "Pourquoi est-il important d'apprendre des langues étrangères à l'école ?",
    hint: "Explain the benefits of language learning for travel, career, and culture.",
    difficulty: 1,
    followUps: [
      "Quelle autre langue aimerais-tu apprendre ?",
      "Est-ce que c'est difficile d'apprendre le français ?",
      "Penses-tu que les langues aident à trouver un bon travail ?"
    ],
    modelAnswer: "Il est essentiel d'apprendre des langues étrangères car cela permet de communiquer avec des gens du monde entier et de découvrir de nouvelles cultures. De plus, parler plusieurs langues est un grand avantage pour ma future carrière. À l'école, j'apprends le français et l'espagnol, et je trouve que c'est très enrichissant pour l'esprit.",
    keyVocab: [
      { fr: "une langue étrangère", en: "a foreign language" },
      { fr: "communiquer", en: "to communicate" },
      { fr: "un avantage", en: "an advantage" },
      { fr: "enrichissant(e)", en: "enriching" },
      { fr: "le monde entier", en: "the whole world" },
      { fr: "la carrière", en: "career" }
    ],
  },
  {
    id: "sch_32",
    topicKey: "school",
    text: "Que penses-tu de l'utilisation des tablettes et ordinateurs en classe ?",
    hint: "Discuss how technology helps or hinders learning in the classroom.",
    difficulty: 2,
    followUps: [
      "Utilises-tu souvent une tablette pour faire tes devoirs ?",
      "Est-ce que la technologie peut être une distraction ?",
      "Préfères-tu les livres en papier ou les versions numériques ?"
    ],
    modelAnswer: "Je pense que l'utilisation des tablettes est une excellente chose car elle rend les cours plus interactifs et permet d'accéder rapidement à beaucoup d'informations. Cependant, il faut faire attention car cela peut aussi être une source de distraction si on ne reste pas concentré sur le travail. Dans l'ensemble, la technologie est un outil indispensable pour l'éducation moderne.",
    keyVocab: [
      { fr: "une tablette", en: "a tablet" },
      { fr: "interactif / interactive", en: "interactive" },
      { fr: "une source de distraction", en: "a source of distraction" },
      { fr: "accéder à", en: "to access" },
      { fr: "indispensable", en: "indispensable / essential" },
      { fr: "un outil", en: "a tool" }
    ],
  },
  {
    id: "sch_33",
    topicKey: "school",
    text: "As-tu déjà participé à un échange scolaire à l'étranger ?",
    hint: "Talk about a school exchange trip or your desire to participate in one.",
    difficulty: 2,
    followUps: [
      "Dans quel pays aimerais-tu faire un échange ?",
      "Quels sont les bénéfices de vivre dans une famille d'accueil ?",
      "Est-ce que tu aurais peur de parler une autre langue toute la journée ?"
    ],
    modelAnswer: "Je n'ai pas encore participé à un échange, mais j'aimerais beaucoup aller en France l'année prochaine. Ce serait une opportunité incroyable pour améliorer mon français et découvrir le mode de vie des lycéens français. Je pense que vivre dans une famille d'accueil est le meilleur moyen de progresser rapidement et de gagner en confiance.",
    keyVocab: [
      { fr: "un échange scolaire", en: "a school exchange" },
      { fr: "une famille d'accueil", en: "a host family" },
      { fr: "le mode de vie", en: "lifestyle" },
      { fr: "améliorer", en: "to improve" },
      { fr: "gagner en confiance", en: "to gain confidence" },
      { fr: "lycéen(ne)", en: "high school student" }
    ],
  },
  {
    id: "sch_34",
    topicKey: "school",
    text: "Est-ce que tu ressens beaucoup de pression à cause des notes ?",
    hint: "Discuss academic pressure, competition, and how you cope with it.",
    difficulty: 3,
    followUps: [
      "Tes parents sont-ils exigeants avec tes résultats ?",
      "Que fais-tu pour te détendre pendant les périodes d'examens ?",
      "Penses-tu que les notes reflètent vraiment l'intelligence d'un élève ?"
    ],
    modelAnswer: "Oui, je ressens parfois une pression énorme, surtout avant les examens importants. La compétition entre les élèves peut être stressante car tout le monde veut obtenir les meilleures notes pour aller à l'université. Pour gérer ce stress, j'essaie d'organiser mon temps de révision à l'avance et de faire du sport régulièrement. Je crois qu'il est important de ne pas se focaliser uniquement sur les résultats.",
    keyVocab: [
      { fr: "la pression", en: "pressure" },
      { fr: "exigeant(e)", en: "demanding" },
      { fr: "les résultats", en: "results / grades" },
      { fr: "gérer le stress", en: "to manage stress" },
      { fr: "se focaliser sur", en: "to focus on" },
      { fr: "refléter", en: "to reflect" }
    ],
  },
  {
    id: "sch_35",
    topicKey: "school",
    text: "Comment sont tes relations avec tes camarades de classe ?",
    hint: "Describe your social life at school and how you get along with others.",
    difficulty: 1,
    followUps: [
      "As-tu un grand groupe d'amis à l'école ?",
      "Est-ce qu'il y a une bonne ambiance dans ta classe ?",
      "Que fais-tu si tu as un désaccord avec un camarade ?"
    ],
    modelAnswer: "En général, je m'entends très bien avec mes camarades de classe. Il y a une ambiance chaleureuse et on s'entraide souvent pour les devoirs difficiles. J'ai un petit groupe d'amis proches avec qui je passe tout mon temps pendant la récréation. Je pense qu'avoir de bons rapports avec les autres rend la vie scolaire beaucoup plus agréable et moins monotone.",
    keyVocab: [
      { fr: "un(e) camarade", en: "a classmate" },
      { fr: "s'entendre bien", en: "to get along well" },
      { fr: "une ambiance chaleureuse", en: "a warm atmosphere" },
      { fr: "s'entraider", en: "to help each other" },
      { fr: "un rapport", en: "a relationship" },
      { fr: "agréable", en: "pleasant" }
    ],
  },
  {
    id: "sch_36",
    topicKey: "school",
    text: "Est-ce que tu ton école t'aide pour ton orientation professionnelle ?",
    hint: "Talk about career advice, internships, or guidance you receive at school.",
    difficulty: 2,
    followUps: [
      "As-tu déjà rencontré un conseiller d'orientation ?",
      "As-tu fait un stage en entreprise avec ton école ?",
      "Sais-tu déjà ce que tu veux faire après le lycée ?"
    ],
    modelAnswer: "Oui, mon école organise régulièrement des forums des métiers où l'on peut rencontrer des professionnels. J'ai aussi eu un entretien avec un conseiller d'orientation pour discuter de mes choix de matières pour l'année prochaine. L'été dernier, j'ai fait un stage d'une semaine dans un cabinet d'architecte, ce qui m'a beaucoup aidé à préciser mon projet d'avenir.",
    keyVocab: [
      { fr: "l'orientation professionnelle", en: "career guidance" },
      { fr: "un conseiller d'orientation", en: "a career advisor" },
      { fr: "un stage", en: "an internship / work placement" },
      { fr: "un forum des métiers", en: "a career fair" },
      { fr: "préciser", en: "to clarify / specify" },
      { fr: "un entretien", en: "an interview / meeting" }
    ],
  },
  {
    id: "sch_37",
    topicKey: "school",
    text: "Penses-tu que le bénévolat devrait être obligatoire à l'école ?",
    hint: "Discuss the value of community service and volunteering for students.",
    difficulty: 3,
    followUps: [
      "As-tu déjà fait du bénévolat dans ton école ?",
      "Qu'est-ce que cela peut apporter aux jeunes ?",
      "Quelles activités de bénévolat aimerais-tu organiser ?"
    ],
    modelAnswer: "Je pense que le bénévolat est une excellente initiative car cela apprend aux élèves à être solidaires et à s'impliquer dans la communauté. Cependant, je ne crois pas qu'il faille le rendre obligatoire, car le principe même du bénévolat est d'être volontaire. Personnellement, j'aide parfois à la bibliothèque de l'école et je trouve cela très gratifiant.",
    keyVocab: [
      { fr: "le bénévolat", en: "volunteering" },
      { fr: "obligatoire", en: "mandatory" },
      { fr: "solidaire", en: "supportive / solidary" },
      { fr: "s'impliquer", en: "to get involved" },
      { fr: "volontaire", en: "voluntary / a volunteer" },
      { fr: "gratifiant(e)", en: "rewarding" }
    ],
  },
  {
    id: "sch_38",
    topicKey: "school",
    text: "Qu'est-ce que tu penses des prix et des récompenses scolaires ?",
    hint: "Discuss if rewards for good grades or behavior are a good motivation.",
    difficulty: 2,
    followUps: [
      "As-tu déjà reçu un prix à l'école ?",
      "Est-ce que cela encourage les élèves à travailler plus ?",
      "Penses-tu que c'est injuste pour ceux qui ont des difficultés ?"
    ],
    modelAnswer: "À mon avis, les prix scolaires sont une bonne source de motivation pour certains élèves car ils valorisent le travail acharné et les efforts. D'un autre côté, cela peut créer une compétition malsaine et décourager ceux qui ont des difficultés d'apprentissage malgré leurs efforts. Je pense qu'on devrait aussi récompenser la persévérance et le progrès personnel, pas seulement les meilleures notes.",
    keyVocab: [
      { fr: "une récompense", en: "a reward" },
      { fr: "valoriser", en: "to value / promote" },
      { fr: "le travail acharné", en: "hard work" },
      { fr: "malsain(e)", en: "unhealthy" },
      { fr: "la persévérance", en: "perseverance" },
      { fr: "le progrès", en: "progress" }
    ],
  },
  {
    id: "sch_39",
    topicKey: "school",
    text: "Comment sont les infrastructures sportives de ton école ?",
    hint: "Describe the sports facilities like gym, fields, or pool at your school.",
    difficulty: 1,
    followUps: [
      "Est-ce qu'il y a une piscine dans ton école ?",
      "Les installations sont-elles modernes ou anciennes ?",
      "Quelle infrastructure utilises-tu le plus souvent ?"
    ],
    modelAnswer: "Mon école possède de très bonnes infrastructures sportives. Nous avons un grand gymnase moderne, plusieurs terrains de football et des courts de tennis. Malheureusement, il n'y a pas de piscine, donc nous devons aller à la piscine municipale pour les cours de natation. J'utilise surtout le terrain de basket pendant la pause de midi avec mes amis car c'est mon sport préféré.",
    keyVocab: [
      { fr: "les infrastructures", en: "facilities / infrastructure" },
      { fr: "le gymnase", en: "gymnasium" },
      { fr: "un terrain de foot", en: "a football pitch" },
      { fr: "un court de tennis", en: "a tennis court" },
      { fr: "moderne", en: "modern" },
      { fr: "municipal(e)", en: "municipal / city-owned" }
    ],
  },
  {
    id: "sch_40",
    topicKey: "school",
    text: "Comment ton école lutte-t-elle contre le harcèlement ?",
    hint: "Discuss school safety and policies regarding bullying.",
    difficulty: 3,
    followUps: [
      "Est-ce que tu te sens en sécurité dans ton école ?",
      "À qui peux-tu parler si tu as un problème ?",
      "Penses-tu que les réseaux sociaux aggravent le harcèlement ?"
    ],
    modelAnswer: "Mon école prend le harcèlement très au sérieux et a mis en place une politique de tolérance zéro. Il y a des affiches partout pour nous encourager à parler aux professeurs ou aux conseillers si nous sommes témoins de comportements inacceptables. Je pense que le cyberharcèlement est le plus grand défi aujourd'hui car il est plus difficile à surveiller. Heureusement, je me sens en sécurité car l'ambiance générale est respectueuse.",
    keyVocab: [
      { fr: "le harcèlement", en: "bullying" },
      { fr: "lutter contre", en: "to fight against" },
      { fr: "la tolérance zéro", en: "zero tolerance" },
      { fr: "être témoin de", en: "to be a witness to" },
      { fr: "inacceptable", en: "unacceptable" },
      { fr: "le cyberharcèlement", en: "cyberbullying" }
    ],
  },
  {
    id: "sch_41",
    topicKey: "school",
    text: "Es-tu satisfait(e) de la qualité des repas à la cantine ?",
    hint: "Review the school food — taste, variety, and healthiness.",
    difficulty: 1,
    followUps: [
      "Quel est ton plat préféré à la cantine ?",
      "Est-ce qu'il y a assez d'options végétariennes ?",
      "Penses-tu que la nourriture est trop chère ?"
    ],
    modelAnswer: "Pour être honnête, je suis assez partagé(e). Certains jours, les repas sont délicieux, comme le vendredi quand on a du poisson et des frites. Cependant, je trouve qu'il manque souvent de fruits frais et de légumes variés. Les options végétariennes sont aussi un peu limitées. Je pense que l'école devrait essayer de servir des repas plus équilibrés et moins industriels.",
    keyVocab: [
      { fr: "satisfait(e)", en: "satisfied" },
      { fr: "la qualité", en: "quality" },
      { fr: "végétarien(ne)", en: "vegetarian" },
      { fr: "équilibré(e)", en: "balanced" },
      { fr: "industriel(le)", en: "industrial / processed" },
      { fr: "varié(e)", en: "varied" }
    ],
  },
  {
    id: "sch_42",
    topicKey: "school",
    text: "Devrait-on apprendre plus de compétences pratiques à l'école ?",
    hint: "Discuss learning life skills like cooking, DIY, or personal finance at school.",
    difficulty: 2,
    followUps: [
      "Sais-tu cuisiner ou réparer quelque chose ?",
      "Quelle compétence pratique aimerais-tu apprendre ?",
      "Penses-tu que c'est plus important que les maths ?"
    ],
    modelAnswer: "Oui, je suis convaincu(e) qu'on devrait apprendre des choses concrètes comme la cuisine, le bricolage ou comment gérer un budget. Ces compétences sont essentielles pour la vie adulte et nous aideraient à être plus autonomes après le lycée. Bien que les matières académiques soient importantes, un équilibre avec des cours pratiques rendrait l'éducation beaucoup plus complète et utile au quotidien.",
    keyVocab: [
      { fr: "une compétence", en: "a skill" },
      { fr: "pratique", en: "practical" },
      { fr: "le bricolage", en: "DIY / home repairs" },
      { fr: "gérer un budget", en: "to manage a budget" },
      { fr: "autonome", en: "independent / autonomous" },
      { fr: "concret / concrète", en: "concrete / real-life" }
    ],
  },
  {
    id: "sch_43",
    topicKey: "school",
    text: "Aimerais-tu participer à un club de débat dans ton école ?",
    hint: "Discuss the benefits of public speaking and debating clubs.",
    difficulty: 2,
    followUps: [
      "Es-tu à l'aise pour parler en public ?",
      "Sur quel sujet aimerais-tu débattre ?",
      "Penses-tu que débattre aide à mieux comprendre les autres ?"
    ],
    modelAnswer: "J'aimerais beaucoup essayer le club de débat car je pense que c'est un excellent moyen d'améliorer son éloquence et d'apprendre à structurer ses arguments. Pour l'instant, je suis un peu timide quand je dois parler devant toute la classe, donc ce serait un bon défi. Débattre sur des sujets d'actualité comme l'environnement ou la technologie me semble passionnant et très utile.",
    keyVocab: [
      { fr: "un club de débat", en: "a debating club" },
      { fr: "l'éloquence", en: "eloquence / public speaking" },
      { fr: "un argument", en: "an argument / point" },
      { fr: "un défi", en: "a challenge" },
      { fr: "l'actualité", en: "current events" },
      { fr: "structurer", en: "to structure" }
    ],
  },
  {
    id: "sch_44",
    topicKey: "school",
    text: "Quels sont tes meilleurs souvenirs de l'école primaire ?",
    hint: "Reflect on your early education and how it differs from secondary school.",
    difficulty: 1,
    followUps: [
      "Quelle était ta matière préférée quand tu étais petit(e) ?",
      "Est-ce que l'école était plus facile à l'époque ?",
      "As-tu gardé des amis de ton école primaire ?"
    ],
    modelAnswer: "Mes meilleurs souvenirs sont les moments passés à jouer dans la cour de récréation avec mes amis. L'école était beaucoup moins stressante car nous n'avions pas d'examens importants et les journées étaient plus courtes. Je me souviens surtout de ma maîtresse de CM2 qui était très gentille et nous racontait des histoires fantastiques. Aujourd'hui, le travail est plus sérieux, mais j'aime quand même apprendre de nouvelles choses.",
    keyVocab: [
      { fr: "un souvenir", en: "a memory" },
      { fr: "l'école primaire", en: "primary school" },
      { fr: "à l'époque", en: "at the time" },
      { fr: "une maîtresse / un maître", en: "a primary teacher" },
      { fr: "la cour de récréation", en: "the playground" },
      { fr: "moins stressant(e)", en: "less stressful" }
    ],
  },
  {
    id: "sch_45",
    topicKey: "school",
    text: "Que penses-tu des cours de soutien scolaire ?",
    hint: "Discuss the role of extra tutoring or catch-up classes for students.",
    difficulty: 2,
    followUps: [
      "As-tu déjà pris des cours particuliers ?",
      "Est-ce que c'est nécessaire pour réussir ses examens ?",
      "Penses-tu que c'est injuste pour ceux qui ne peuvent pas payer ?"
    ],
    modelAnswer: "Je pense que les cours de soutien peuvent être très utiles si on a des difficultés dans une matière spécifique, comme les maths ou la physique. Cela permet de prendre le temps d'expliquer les concepts plus calmement. Cependant, je crois que l'école devrait offrir ces services gratuitement pour éviter que seuls les élèves riches puissent en bénéficier. Réussir ne devrait pas dépendre de l'argent de ses parents.",
    keyVocab: [
      { fr: "le soutien scolaire", en: "tutoring / academic support" },
      { fr: "un cours particulier", en: "a private lesson" },
      { fr: "calmement", en: "calmly" },
      { fr: "bénéficier de", en: "to benefit from" },
      { fr: "gratuitement", en: "for free" },
      { fr: "dépendre de", en: "to depend on" }
    ],
  },
  {
    id: "sch_46",
    topicKey: "school",
    text: "Est-ce que ton école organise des spectacles ou des fêtes ?",
    hint: "Describe school events like plays, concerts, or end-of-year parties.",
    difficulty: 1,
    followUps: [
      "As-tu déjà joué dans une pièce de théâtre à l'école ?",
      "Y a-t-il une fête pour célébrer la fin des examens ?",
      "Préfères-tu les événements sportifs ou culturels ?"
    ],
    modelAnswer: "Oui, chaque année avant les vacances de Noël, nous organisons un grand concert de musique et une pièce de théâtre. C'est un moment très joyeux où tous les élèves se réunissent pour montrer leurs talents. À la fin de l'année scolaire, il y a aussi un bal de promo pour les plus grands. J'adore ces événements car cela renforce l'esprit d'équipe et nous permet de décompresser après une année de travail.",
    keyVocab: [
      { fr: "un spectacle", en: "a show / performance" },
      { fr: "une fête", en: "a party / celebration" },
      { fr: "un bal de promo", en: "a school prom" },
      { fr: "se réunir", en: "to gather / meet" },
      { fr: "montrer son talent", en: "to show one's talent" },
      { fr: "décompresser", en: "to unwind / de-stress" }
    ],
  },
  {
    id: "sch_47",
    topicKey: "school",
    text: "Quel est le rôle des délégués de classe dans ton école ?",
    hint: "Discuss student representation and how students can voice their opinions.",
    difficulty: 2,
    followUps: [
      "Aimerais-tu être délégué(e) de classe ?",
      "Comment les délégués sont-ils élus ?",
      "Penses-tu que les professeurs écoutent vraiment les élèves ?"
    ],
    modelAnswer: "Les délégués de classe représentent les intérêts des élèves lors des conseils de classe. Ils servent de lien entre nous et l'administration pour discuter des problèmes comme les devoirs excessifs ou les infrastructures sportives. Pour devenir délégué, il faut faire une petite campagne et être élu par ses camarades. Je pense que c'est un rôle important pour apprendre la démocratie et la responsabilité dès le plus jeune âge.",
    keyVocab: [
      { fr: "un délégué / une déléguée", en: "a class representative" },
      { fr: "le conseil de classe", en: "the class council / meeting" },
      { fr: "être élu(e)", en: "to be elected" },
      { fr: "un lien", en: "a link / connection" },
      { fr: "représenter", en: "to represent" },
      { fr: "la responsabilité", en: "responsibility" }
    ],
  },
  {
    id: "sch_48",
    topicKey: "school",
    text: "Comment imagines-tu l'école du futur ?",
    hint: "Use the future tense to describe changes in technology, subjects, or school life.",
    difficulty: 3,
    followUps: [
      "Y aura-t-il encore des professeurs humains ou des robots ?",
      "Est-ce que les élèves étudieront toujours dans des bâtiments ?",
      "Quelles matières seront les plus importantes selon toi ?"
    ],
    modelAnswer: "Dans le futur, je pense que l'école sera complètement numérique. Les élèves n'auront plus de manuels en papier et utiliseront la réalité virtuelle pour explorer l'histoire ou les sciences. Les cours seront peut-être plus flexibles et personnalisés selon les intérêts de chaque enfant. Cependant, je crois que la présence d'un professeur humain restera essentielle pour nous guider et nous encourager, ce qu'un robot ne pourra jamais faire parfaitement.",
    keyVocab: [
      { fr: "le futur / l'avenir", en: "the future" },
      { fr: "numérique", en: "digital" },
      { fr: "la réalité virtuelle", en: "virtual reality" },
      { fr: "flexible", en: "flexible" },
      { fr: "guider", en: "to guide" },
      { fr: "encourager", en: "to encourage" }
    ],
  },
  {
    id: "sch_49",
    topicKey: "school",
    text: "Que penses-tu de l'importance de l'éducation physique à l'école ?",
    hint: "Discuss the balance between academic subjects and physical education.",
    difficulty: 2,
    followUps: [
      "Combien d'heures d'EPS as-tu par semaine ?",
      "Est-ce que l'EPS devrait compter pour les notes finales ?",
      "Préfères-tu les sports collectifs ou individuels en cours d'EPS ?"
    ],
    modelAnswer: "Je pense que l'éducation physique est aussi importante que les maths car elle nous aide à rester en bonne santé et à réduire le stress. Faire de l'exercice permet de mieux se concentrer pendant les autres cours. À mon école, nous avons deux heures d'EPS par semaine, ce qui est un bon début mais peut-être pas suffisant. L'essentiel est d'apprendre aux jeunes à aimer bouger pour qu'ils gardent cette habitude toute leur vie.",
    keyVocab: [
      { fr: "l'education physique (EPS)", en: "P.E. (Physical Education)" },
      { fr: "rester en bonne santé", en: "to stay healthy" },
      { fr: "se concentrer", en: "to concentrate" },
      { fr: "suffisant", en: "sufficient" },
      { fr: "une habitude", en: "a habit" },
      { fr: "bouger", en: "to move" }
    ],
  },
  {
    id: "hob_28",
    topicKey: "hobbies",
    text: "Est-ce que tu t'intéresses à la photographie ?",
    hint: "Talk about taking photos, your equipment, and what you like to capture.",
    difficulty: 1,
    followUps: [
      "Utilises-tu ton téléphone ou un véritable appareil photo ?",
      "Quel genre de photos préfères-tu prendre (paysages, portraits) ?",
      "Partages-tu tes photos sur les réseaux sociaux ?"
    ],
    modelAnswer: "Oui, j'adore prendre des photos, surtout quand je voyage ou quand je sors avec mes amis. J'utilise principalement mon smartphone car il est pratique et la qualité est excellente. Je préfère photographier les paysages naturels et les monuments historiques. De temps en temps, je poste mes meilleures photos sur Instagram car j'aime recevoir les avis de mes abonnés. C'est un moyen créatif de garder des souvenirs.",
    keyVocab: [
      { fr: "la photographie", en: "photography" },
      { fr: "un appareil photo", en: "a camera" },
      { fr: "un paysage", en: "a landscape" },
      { fr: "un portrait", en: "a portrait" },
      { fr: "garder des souvenirs", en: "to keep memories" },
      { fr: "pratique", en: "practical / convenient" }
    ],
  },
  {
    id: "hob_29",
    topicKey: "hobbies",
    text: "Aimes-tu cuisiner ou faire de la pâtisserie pendant ton temps libre ?",
    hint: "Discuss cooking as a hobby, your favorite recipes, and who you cook for.",
    difficulty: 2,
    followUps: [
      "Quelle est ta spécialité en cuisine ?",
      "Cuisines-tu souvent pour ta famille ?",
      "Préfères-tu les plats salés ou les desserts sucrés ?"
    ],
    modelAnswer: "Je suis passionné(e) par la pâtisserie. Le week-end, j'aime préparer des gâteaux au chocolat ou des tartes aux fruits pour ma famille. C'est très relaxant de suivre une recette et de voir le résultat final. Ma spécialité est le fondant au chocolat car tout le monde l'adore chez moi. À l'avenir, j'aimerais apprendre à cuisiner des plats plus complexes, comme des spécialités françaises ou italiennes.",
    keyVocab: [
      { fr: "la pâtisserie", en: "baking / pastry making" },
      { fr: "une recette", en: "a recipe" },
      { fr: "préparer", en: "to prepare" },
      { fr: "salé / sucré", en: "salty / sweet" },
      { fr: "relaxant", en: "relaxing" },
      { fr: "le fondant au chocolat", en: "lava cake / chocolate fondant" }
    ],
  },
  {
    id: "hob_30",
    topicKey: "hobbies",
    text: "Y a-t-il un centre de jeunesse dans ta ville ? Qu'est-ce qu'on peut y faire ?",
    hint: "Describe local youth facilities and the activities they offer.",
    difficulty: 2,
    followUps: [
      "Est-ce que tu y vas souvent ?",
      "Quelles nouvelles activités aimerais-tu voir là-bas ?",
      "Est-ce que c'est un bon endroit pour rencontrer de nouvelles personnes ?"
    ],
    modelAnswer: "Oui, il y a une maison des jeunes près du centre-ville. On peut y faire beaucoup de choses : jouer au billard, faire de l'informatique ou participer à des ateliers de danse. C'est un endroit génial car c'est gratuit et sécurisé pour les adolescents. J'y vais parfois le mercredi après-midi pour retrouver mes amis et discuter. Je pense qu'il devrait y avoir plus de centres comme celui-ci dans toutes les villes.",
    keyVocab: [
      { fr: "un centre de jeunesse", en: "a youth centre" },
      { fr: "la maison des jeunes", en: "youth house" },
      { fr: "un atelier", en: "a workshop" },
      { fr: "le billard", en: "billiards / pool" },
      { fr: "sécurisé", en: "safe / secure" },
      { fr: "gratuit", en: "free" }
    ],
  },
  {
    id: "hob_31",
    topicKey: "hobbies",
    text: "Est-ce que tu es doué(e) pour le dessin ou la peinture ?",
    hint: "Talk about your creative arts hobbies and your favorite style.",
    difficulty: 1,
    followUps: [
      "Préfères-tu dessiner au crayon ou peindre avec des couleurs ?",
      "Où trouves-tu ton inspiration ?",
      "As-tu déjà exposé tes œuvres quelque part ?"
    ],
    modelAnswer: "Je ne suis pas un grand artiste, mais j'aime beaucoup dessiner au crayon dans mon carnet de croquis. C'est une activité calme qui m'aide à me vider l'esprit après l'école. Mon inspiration vient souvent de la nature ou des personnages de mangas que j'admire. J'ai exposé une de mes peintures lors de la fête de l'école l'année dernière et j'en étais très fier(ère) même si c'était un peu intimidant.",
    keyVocab: [
      { fr: "doué(e)", en: "gifted / talented" },
      { fr: "le dessin", en: "drawing" },
      { fr: "la peinture", en: "painting" },
      { fr: "un carnet de croquis", en: "a sketchbook" },
      { fr: "se vider l'esprit", en: "to clear one's mind" },
      { fr: "intimidant", en: "intimidating" }
    ],
  },
  {
    id: "hob_32",
    topicKey: "hobbies",
    text: "Aimes-tu la danse ? Quel style préfères-tu ?",
    hint: "Discuss dancing as a hobby, whether you take lessons or dance for fun.",
    difficulty: 2,
    followUps: [
      "Prends-tu des cours de danse ?",
      "Penses-tu que la danse est un sport ou un art ?",
      "Aimerais-tu danser dans un spectacle un jour ?"
    ],
    modelAnswer: "J'adore la danse moderne car c'est une activité très dynamique et expressive. Je prends des cours deux fois par semaine dans un studio local. Pour moi, la danse est à la fois un sport car c'est physiquement exigeant, et un art car on exprime des émotions. Mon rêve serait de participer à un spectacle de fin d'année devant un grand public. C'est un excellent moyen de rester en forme tout en s'amusant.",
    keyVocab: [
      { fr: "la danse", en: "dancing" },
      { fr: "dynamique", en: "dynamic" },
      { fr: "expressif / expressive", en: "expressive" },
      { fr: "un studio", en: "a studio" },
      { fr: "physiquement exigeant", en: "physically demanding" },
      { fr: "exprimer des émotions", en: "to express emotions" }
    ],
  },
  {
    id: "hob_33",
    topicKey: "hobbies",
    text: "Est-ce que tu aides tes parents avec le jardinage ?",
    hint: "Talk about gardening, plants, or spending time in the garden.",
    difficulty: 1,
    followUps: [
      "As-tu des fleurs ou des légumes dans ton jardin ?",
      "Aimes-tu passer du temps à l'extérieur ?",
      "Préfères-tu les jardins sauvages ou les jardins très organisés ?"
    ],
    modelAnswer: "Oui, j'aide souvent mon père à arroser les plantes et à tondre la pelouse en été. Nous avons un petit potager où nous faisons pousser des tomates, des fraises et des salades. Je trouve que c'est très gratifiant de manger ce qu'on a cultivé soi-même. J'aime le jardinage parce que c'est une activité paisible qui permet d'être en contact avec la nature et de profiter du grand air.",
    keyVocab: [
      { fr: "le jardinage", en: "gardening" },
      { fr: "un potager", en: "a vegetable patch" },
      { fr: "arroser les plantes", en: "to water the plants" },
      { fr: "tondre la pelouse", en: "to mow the lawn" },
      { fr: "cultiver", en: "to grow / cultivate" },
      { fr: "le grand air", en: "the great outdoors" }
    ],
  },
  {
    id: "hob_34",
    topicKey: "hobbies",
    text: "Quelles sont les responsabilités liées au fait d'avoir un animal de compagnie ?",
    hint: "Discuss looking after pets as a daily commitment and hobby.",
    difficulty: 2,
    followUps: [
      "As-tu un animal à la maison ?",
      "Est-ce que c'est un bon passe-temps pour les jeunes ?",
      "Quel animal est le plus facile à soigner ?"
    ],
    modelAnswer: "Avoir un animal demande beaucoup de temps et d'engagement. Par exemple, il faut promener son chien tous les jours, nettoyer sa cage ou sa litière, et s'assurer qu'il mange sainement. C'est une excellente façon pour les jeunes d'apprendre la responsabilité. J'ai un chat et je passe beaucoup de temps à jouer avec lui après mes devoirs. C'est un compagnon fidèle qui m'aide à me relaxer quand je suis stressé(e).",
    keyVocab: [
      { fr: "une responsabilité", en: "a responsibility" },
      { fr: "un animal de compagnie", en: "a pet" },
      { fr: "l'engagement", en: "commitment" },
      { fr: "promener", en: "to walk (an animal)" },
      { fr: "nettoyer", en: "to clean" },
      { fr: "fidèle", en: "loyal" }
    ],
  },
  {
    id: "hob_35",
    topicKey: "hobbies",
    text: "Pourquoi est-il important d'avoir des loisirs pour réduire le stress ?",
    hint: "Discuss the mental health benefits of having hobbies outside of school.",
    difficulty: 3,
    followUps: [
      "Quel loisir te détend le plus ?",
      "Penses-tu que les jeunes ont assez de temps libre aujourd'hui ?",
      "Qu'est-ce qui se passe si on travaille tout le temps sans s'amuser ?"
    ],
    modelAnswer: "Il est crucial d'avoir des loisirs pour garder un bon équilibre mental car l'école peut être épuisante. Les activités créatives ou sportives permettent de s'évader du quotidien et d'oublier la pression des examens. Si on ne prend pas de temps pour soi, on risque de faire un burn-out ou d'être constamment anxieux. Pour moi, le dessin est mon refuge personnel où je peux me ressourcer et retrouver mon énergie.",
    keyVocab: [
      { fr: "réduire le stress", en: "to reduce stress" },
      { fr: "l'équilibre mental", en: "mental balance" },
      { fr: "épuisant(e)", en: "exhausting" },
      { fr: "s'évader", en: "to escape" },
      { fr: "un refuge", en: "a refuge / haven" },
      { fr: "se ressourcer", en: "to recharge one's batteries" }
    ],
  },
  {
    id: "hob_36",
    topicKey: "hobbies",
    text: "Est-ce que tu t'intéresses au théâtre ou à l'art dramatique ?",
    hint: "Talk about acting, watching plays, or participating in drama workshops.",
    difficulty: 2,
    followUps: [
      "Préfères-tu être sur scène ou dans le public ?",
      "Quel est le dernier spectacle que tu as vu ?",
      "Penses-tu que le théâtre aide à avoir plus de confiance en soi ?"
    ],
    modelAnswer: "Je m'intéresse beaucoup au théâtre car j'aime interpréter différents personnages et explorer diverses émotions. Je fais partie du club de théâtre de mon quartier et c'est passionnant. Le mois dernier, nous avons joué une comédie et c'était hilarant de voir la réaction du public. Je crois que l'art dramatique est un excellent moyen de vaincre sa timidité et d'apprendre à mieux communiquer avec les autres.",
    keyVocab: [
      { fr: "le théâtre", en: "theatre / drama" },
      { fr: "l'art dramatique", en: "dramatic arts" },
      { fr: "sur scène", en: "on stage" },
      { fr: "interpréter un personnage", en: "to play a character" },
      { fr: "vaincre sa timidité", en: "to overcome one's shyness" },
      { fr: "hilarant", en: "hilarious" }
    ],
  },
  {
    id: "hob_37",
    topicKey: "hobbies",
    text: "As-tu déjà essayé le yoga ou la méditation ?",
    hint: "Discuss wellness activities and how they affect your physical/mental state.",
    difficulty: 2,
    followUps: [
      "Penses-tu que c'est ennuyeux ou relaxant ?",
      "Est-ce que tu le fais seul ou en groupe ?",
      "À quelle fréquence pratiques-tu ces activités ?"
    ],
    modelAnswer: "J'ai commencé la méditation l'année dernière pour mieux dormir. Au début, je trouvais ça un peu difficile de rester immobile, mais maintenant je trouve ça très apaisant. Je pratique pendant dix minutes chaque matin avant d'aller à l'école. Cela m'aide à commencer la journée avec calme and concentration. Je pense que de plus en plus de jeunes devraient essayer car cela aide vraiment à gérer l'anxiété scolaire.",
    keyVocab: [
      { fr: "la méditation", en: "meditation" },
      { fr: "immobile", en: "still / motionless" },
      { fr: "apaisant", en: "soothing / calming" },
      { fr: "la concentration", en: "concentration" },
      { fr: "gérer l'anxiété", en: "to manage anxiety" },
      { fr: "au début", en: "at first" }
    ],
  },
  {
    id: "hob_38",
    topicKey: "hobbies",
    text: "Est-ce que tu t'intéresses au codage informatique ou à la robotique ?",
    hint: "Talk about technology-based hobbies and creating software or machines.",
    difficulty: 3,
    followUps: [
      "Sais-tu créer un site web ou une application ?",
      "Penses-tu que c'est une compétence utile pour ton futur métier ?",
      "As-tu déjà construit un robot ?"
    ],
    modelAnswer: "Je suis fasciné(e) par le codage depuis que j'ai dix ans. J'apprends le langage Python en suivant des tutoriels en ligne et j'ai déjà créé un petit jeu vidéo simple. C'est un loisir qui demande beaucoup de logique et de patience. Je pense que c'est une compétence indispensable pour l'avenir, quel que soit le métier que je choisirai. J'aimerais aussi rejoindre un club de robotique pour apprendre à construire des machines intelligentes.",
    keyVocab: [
      { fr: "le codage", en: "coding" },
      { fr: "la robotique", en: "robotics" },
      { fr: "un tutoriel", en: "a tutorial" },
      { fr: "la logique", en: "logic" },
      { fr: "indispensable", en: "essential" },
      { fr: "créer", en: "to create" }
    ],
  },
  {
    id: "hob_39",
    topicKey: "hobbies",
    text: "Est-ce que la mode et la création de vêtements t'intéressent ?",
    hint: "Discuss fashion as a creative outlet, sewing, or following trends.",
    difficulty: 1,
    followUps: [
      "Aimes-tu faire du shopping pour trouver des vêtements originaux ?",
      "Sais-tu coudre ou personnaliser tes habits ?",
      "Suis-tu les dernières tendances de la mode sur les réseaux sociaux ?"
    ],
    modelAnswer: "J'adore la mode parce que c'est une façon d'exprimer ma personnalité. Je ne sais pas encore coudre, mais j'aime beaucoup personnaliser mes vieux jeans avec des écussons ou de la peinture. Je passe pas mal de temps sur Pinterest pour trouver de l'inspiration et créer mes propres styles. Pour moi, la mode ne consiste pas seulement à suivre les tendances, mais à être créatif et à se sentir bien dans ses vêtements.",
    keyVocab: [
      { fr: "la mode", en: "fashion" },
      { fr: "exprimer sa personnalité", en: "to express one's personality" },
      { fr: "coudre", en: "to sew" },
      { fr: "une tendance", en: "a trend" },
      { fr: "personnaliser", en: "to personalize" },
      { fr: "l'inspiration", en: "inspiration" }
    ],
  },
  {
    id: "hob_40",
    topicKey: "hobbies",
    text: "Aimes-tu observer les étoiles ou t'intéresses-tu à l'astronomie ?",
    hint: "Talk about space, planets, and using a telescope.",
    difficulty: 2,
    followUps: [
      "As-tu un télescope chez toi ?",
      "Quelle est ta planète préférée et pourquoi ?",
      "Aimerais-tu voyager dans l'espace un jour ?"
    ],
    modelAnswer: "L'astronomie est un passe-temps fascinant. Quand le ciel est dégagé, j'aime bien observer les étoiles et essayer d'identifier les constellations avec une application sur mon téléphone. Mon père a un vieux télescope et on regarde parfois la Lune, c'est impressionnant de voir tous les cratères. Je trouve que l'espace est mystérieux et j'adore lire des livres sur les trous noirs et les galaxies lointaines. Voyager dans l'espace serait l'aventure ultime !",
    keyVocab: [
      { fr: "l'astronomie", en: "astronomy" },
      { fr: "une étoile", en: "a star" },
      { fr: "un télescope", en: "a telescope" },
      { fr: "dégagé", en: "clear (sky)" },
      { fr: "une constellation", en: "a constellation" },
      { fr: "impressionnant", en: "impressive" }
    ],
  },
  {
    id: "hob_41",
    topicKey: "hobbies",
    text: "Fais-tu du bénévolat dans ta communauté locale ?",
    hint: "Talk about helping others, charity work, or local community events.",
    difficulty: 3,
    followUps: [
      "Pour quelle organisation travailles-tu ?",
      "Combien de temps y consacres-tu par semaine ?",
      "Penses-tu que c'est important d'aider les autres sans être payé ?"
    ],
    modelAnswer: "Oui, je fais du bénévolat dans une association locale qui aide les personnes âgées. J'y vais le samedi matin pour discuter avec eux ou les aider avec leur ordinateur. Je pense que c'est une expérience humaine très riche car cela permet de sortir de sa bulle et de se sentir utile. Même si je ne suis pas payé(e), la satisfaction d'avoir aidé quelqu'un est la meilleure des récompenses. C'est un loisir qui donne du sens à mon temps libre.",
    keyVocab: [
      { fr: "le bénévolat", en: "volunteering" },
      { fr: "une association", en: "an organization / charity" },
      { fr: "les personnes âgées", en: "elderly people" },
      { fr: "se sentir utile", en: "to feel useful" },
      { fr: "une récompense", en: "a reward" },
      { fr: "donner du sens", en: "to give meaning" }
    ],
  },
  {
    id: "hob_42",
    topicKey: "hobbies",
    text: "Aimes-tu visiter des sites historiques ou des monuments ?",
    hint: "Talk about cultural trips, museums, and historical interests.",
    difficulty: 2,
    followUps: [
      "Quel est le monument le plus intéressant que tu as visité ?",
      "Préfères-tu les châteaux ou les églises anciennes ?",
      "Est-ce que l'histoire est une de tes passions ?"
    ],
    modelAnswer: "J'adore visiter les vieux châteaux car cela me permet d'imaginer la vie à l'époque médiévale. L'été dernier, j'ai visité le Mont Saint-Michel en France et c'était absolument magnifique. Je trouve que les monuments historiques ont une âme et nous apprennent beaucoup sur nos racines. Pour moi, c'est une activité passionnante qui combine marche à pied et culture. Je préfère largement cela à rester dans un centre commercial.",
    keyVocab: [
      { fr: "un site historique", en: "a historical site" },
      { fr: "un monument", en: "a monument / landmark" },
      { fr: "le Moyen Âge / médiéval", en: "the Middle Ages / medieval" },
      { fr: "un château", en: "a castle" },
      { fr: "magnifique", en: "magnificent" },
      { fr: "les racines", en: "roots" }
    ],
  },
  {
    id: "hob_43",
    topicKey: "hobbies",
    text: "Préfères-tu les jeux de société simples ou les jeux de stratégie complexes ?",
    hint: "Discuss board games, rules, and playing with family or friends.",
    difficulty: 2,
    followUps: [
      "Quel est ton jeu de société préféré ?",
      "Es-tu un(e) mauvais(e) perdant(e) ?",
      "Joues-tu souvent en famille le week-end ?"
    ],
    modelAnswer: "Je préfère nettement les jeux de stratégie complexes comme les échecs ou « Les Aventuriers du Rail ». J'aime le fait de devoir réfléchir et planifier ses coups pour gagner. On y joue souvent en famille le dimanche après-midi quand il pleut. Par contre, je dois admettre que je suis un peu mauvais(e) perdant(e), donc l'ambiance devient parfois électrique ! C'est un excellent moyen de s'amuser tout en stimulant son cerveau.",
    keyVocab: [
      { fr: "un jeu de société", en: "a board game" },
      { fr: "un jeu de stratégie", en: "a strategy game" },
      { fr: "les échecs", en: "chess" },
      { fr: "réfléchir", en: "to think / reflect" },
      { fr: "un(e) mauvais(e) perdant(e)", en: "a sore loser" },
      { fr: "stimuler", en: "to stimulate" }
    ],
  },
  {
    id: "hob_44",
    topicKey: "hobbies",
    text: "Aimes-tu regarder des matchs de sport au stade ?",
    hint: "Discuss the atmosphere of live sports vs. watching on TV.",
    difficulty: 1,
    followUps: [
      "Quel est le dernier match que tu as vu en direct ?",
      "Préfères-tu l'ambiance du stade ou le confort du salon ?",
      "Quel sport est le plus impressionnant à voir en vrai ?"
    ],
    modelAnswer: "Rien ne bat l'ambiance d'un stade de football ! Le bruit de la foule et l'énergie des supporters sont incroyables. Je suis allé(e) voir mon équipe locale le mois dernier et nous avons gagné deux à zéro. Bien que regarder à la télé soit plus confortable et gratuit, je préfère aller au stade car on se sent vraiment impliqué dans le match. C'est une expérience inoubliable que j'adore partager avec mon père ou mes amis.",
    keyVocab: [
      { fr: "un match en direct", en: "a live match" },
      { fr: "le stade", en: "the stadium" },
      { fr: "la foule", en: "the crowd" },
      { fr: "les supporters", en: "the fans / supporters" },
      { fr: "l'énergie", en: "energy" },
      { fr: "s'impliquer", en: "to get involved" }
    ],
  },
  {
    id: "hob_45",
    topicKey: "hobbies",
    text: "Sais-tu faire des tours de magie ou as-tu un talent particulier ?",
    hint: "Talk about learning unique skills or talents for entertainment.",
    difficulty: 2,
    followUps: [
      "Comment as-tu appris ce talent ?",
      "Fais-tu des spectacles pour tes amis ou ta famille ?",
      "Combien de temps faut-il s'entraîner pour réussir ?"
    ],
    modelAnswer: "Je m'entraîne à faire des tours de cartes depuis quelques mois. J'ai appris les bases en regardant des vidéos sur YouTube. Ce n'est pas facile et cela demande beaucoup de dextérité et de patience, mais j'adore voir la surprise sur le visage des gens. Je fais parfois des petits spectacles pendant les fêtes de famille. C'est un passe-temps original qui permet de briser la glace et d'amuser la galerie.",
    keyVocab: [
      { fr: "un tour de magie", en: "a magic trick" },
      { fr: "un talent", en: "a talent" },
      { fr: "la dextérité", en: "dexterity" },
      { fr: "la surprise", en: "surprise" },
      { fr: "briser la glace", en: "to break the ice" },
      { fr: "amuser la galerie", en: "to entertain people / show off" }
    ],
  },
  {
    id: "hob_46",
    topicKey: "hobbies",
    text: "Aimes-tu faire de la randonnée ou des marches en forêt ?",
    hint: "Discuss walking in nature, equipment, and how it makes you feel.",
    difficulty: 1,
    followUps: [
      "Quel est ton endroit préféré pour marcher ?",
      "Marches-tu souvent avec tes parents ou avec un club ?",
      "Qu'est-ce que tu emportes dans ton sac à dos ?"
    ],
    modelAnswer: "J'adore faire de la randonnée en montagne car l'air est pur et les paysages sont époustouflants. Le week-end, ma famille et moi partons souvent marcher en forêt pendant plusieurs heures. J'emporte toujours une bouteille d'eau, des fruits et une carte dans mon sac à dos. C'est une activité qui me permet de déconnecter de la technologie et de me sentir en harmonie avec la nature. C'est excellent pour la santé physique !",
    keyVocab: [
      { fr: "la randonnée", en: "hiking" },
      { fr: "la forêt", en: "the forest" },
      { fr: "l'air pur", en: "fresh air" },
      { fr: "époustouflant(e)", en: "breathtaking" },
      { fr: "déconnecter", en: "to disconnect" },
      { fr: "un sac à dos", en: "a backpack" }
    ],
  },
  {
    id: "hob_47",
    topicKey: "hobbies",
    text: "Écoutes-tu souvent des podcasts ou des livres audio pendant tes loisirs ?",
    hint: "Discuss modern ways of consuming stories or information.",
    difficulty: 2,
    followUps: [
      "Quel est ton sujet de podcast préféré ?",
      "Préfères-tu écouter une histoire ou la lire dans un livre ?",
      "Est-ce que tu écoutes des podcasts en français pour pratiquer ?"
    ],
    modelAnswer: "J'écoute des podcasts presque tous les jours, surtout quand je suis dans le bus ou quand je range ma chambre. Je m'intéresse beaucoup aux podcasts sur la technologie et sur l'histoire. Je trouve que c'est un moyen très pratique d'apprendre de nouvelles choses tout en faisant autre chose. Parfois, j'écoute des podcasts en français pour améliorer ma compréhension orale. C'est beaucoup plus divertissant que de faire des exercices de grammaire !",
    keyVocab: [
      { fr: "un podcast", en: "a podcast" },
      { fr: "un livre audio", en: "an audiobook" },
      { fr: "la compréhension orale", en: "listening comprehension" },
      { fr: "pratique", en: "practical / convenient" },
      { fr: "divertissant", en: "entertaining" },
      { fr: "améliorer", en: "to improve" }
    ],
  },
  {
    id: "hob_48",
    topicKey: "hobbies",
    text: "Aimes-tu le bricolage ou créer des choses de tes propres mains ?",
    hint: "Talk about DIY projects, making things at home, or fixing things.",
    difficulty: 2,
    followUps: [
      "Quel est ton dernier projet de bricolage ?",
      "Préfères-tu acheter quelque chose de neuf ou le fabriquer ?",
      "Est-ce que le bricolage est populaire dans ton pays ?"
    ],
    modelAnswer: "J'adore le bricolage car cela me permet d'être créatif et de me détendre. Le week-end dernier, j'ai fabriqué une petite étagère pour ma chambre avec du bois de récupération. Je trouve qu'il est beaucoup plus gratifiant de créer quelque chose de ses propres mains que de l'acheter tout fait au magasin. En plus, c'est souvent plus écologique et économique.",
    keyVocab: [
      { fr: "le bricolage", en: "DIY / tinkering" },
      { fr: "de récupération", en: "salvaged / recycled" },
      { fr: "gratifiant", en: "rewarding" },
      { fr: "tout fait", en: "ready-made" },
      { fr: "économique", en: "economical" },
      { fr: "une étagère", en: "a shelf" }
    ]
  },
  {
    id: "hob_49",
    topicKey: "hobbies",
    text: "T'intéresses-tu au jardinage pendant ton temps libre ?",
    hint: "Discuss growing plants, flowers, or vegetables in a garden or on a balcony.",
    difficulty: 2,
    followUps: [
      "As-tu un jardin chez toi ?",
      "Quelles plantes aimes-tu cultiver ?",
      "Penses-tu que le jardinage aide à réduire le stress ?"
    ],
    modelAnswer: "Oui, le jardinage est l'un de mes passe-temps préférés. Même si je n'ai qu'un petit balcon, j'y cultive des herbes aromatiques comme le basilic et la menthe, ainsi que quelques tomates. Passer du temps à prendre soin des plantes m'aide vraiment à évacuer le stress après une longue journée de cours. C'est très satisfaisant de voir ses plantes pousser et de manger ce qu'on a cultivé.",
    keyVocab: [
      { fr: "le jardinage", en: "gardening" },
      { fr: "cultiver", en: "to grow / cultivate" },
      { fr: "les herbes aromatiques", en: "herbs" },
      { fr: "évacuer le stress", en: "to relieve stress" },
      { fr: "prendre soin de", en: "to take care of" },
      { fr: "pousser", en: "to grow (plants)" }
    ]
  },
  {
    id: "hob_50",
    topicKey: "hobbies",
    text: "Fais-tu de la programmation ou du codage comme loisir ?",
    hint: "Talk about coding, making websites, or game development as a hobby.",
    difficulty: 3,
    followUps: [
      "Quels langages de programmation connais-tu ?",
      "As-tu déjà créé ton propre jeu vidéo ou site web ?",
      "Pourquoi penses-tu que coder est une compétence utile ?"
    ],
    modelAnswer: "Absolument, la programmation est une véritable passion pour moi. J'ai commencé à apprendre le Python il y a deux ans en regardant des tutoriels sur Internet. Récemment, j'ai même développé un petit jeu vidéo en 2D pour m'amuser avec mes amis. Je pense que le codage est une compétence essentielle pour l'avenir, et c'est génial de pouvoir transformer ses idées en réalité sur un écran.",
    keyVocab: [
      { fr: "la programmation", en: "programming / coding" },
      { fr: "un langage de programmation", en: "a programming language" },
      { fr: "un tutoriel", en: "a tutorial" },
      { fr: "développer", en: "to develop" },
      { fr: "une compétence", en: "a skill" },
      { fr: "l'avenir", en: "the future" }
    ]
  },
  {
    id: "hob_51",
    topicKey: "hobbies",
    text: "Aimes-tu faire de la pâtisserie le week-end ?",
    hint: "Discuss baking cakes, cookies, or bread.",
    difficulty: 1,
    followUps: [
      "Quel est ton dessert préféré à préparer ?",
      "Cuisines-tu souvent avec ta famille ?",
      "Préfères-tu les desserts au chocolat ou aux fruits ?"
    ],
    modelAnswer: "J'adore faire de la pâtisserie, surtout le dimanche après-midi. Ma spécialité, c'est le gâteau au chocolat fondant. J'aime chercher de nouvelles recettes sur Internet et les essayer. Parfois, ma petite sœur m'aide à mélanger les ingrédients. Ce que je préfère, c'est l'odeur délicieuse qui remplit la maison quand le gâteau est dans le four. C'est un loisir très gourmand !",
    keyVocab: [
      { fr: "la pâtisserie", en: "baking / pastry" },
      { fr: "fondant", en: "melting / soft-centered" },
      { fr: "une recette", en: "a recipe" },
      { fr: "mélanger", en: "to mix" },
      { fr: "le four", en: "the oven" },
      { fr: "gourmand(e)", en: "food-loving / greedy" }
    ]
  },
  {
    id: "hob_52",
    topicKey: "hobbies",
    text: "Écris-tu des histoires ou des poèmes pendant ton temps libre ?",
    hint: "Talk about creative writing, journaling, or writing poems.",
    difficulty: 2,
    followUps: [
      "Quel genre d'histoires aimes-tu écrire ?",
      "As-tu déjà pensé à publier un livre un jour ?",
      "Est-ce que tu tiens un journal intime ?"
    ],
    modelAnswer: "L'écriture créative est mon échappatoire. J'aime inventer des mondes fantastiques et écrire des nouvelles de science-fiction. Quand j'écris, je perds complètement la notion du temps. Je tiens aussi un journal intime où je note mes pensées et les événements de ma journée, ce qui m'aide à réfléchir. Un jour, j'aimerais publier mon propre roman, même si je sais que ce sera difficile.",
    keyVocab: [
      { fr: "l'écriture créative", en: "creative writing" },
      { fr: "une échappatoire", en: "an escape / outlet" },
      { fr: "une nouvelle", en: "a short story" },
      { fr: "perdre la notion du temps", en: "to lose track of time" },
      { fr: "un journal intime", en: "a diary" },
      { fr: "publier", en: "to publish" }
    ]
  },
  {
    id: "hob_53",
    topicKey: "hobbies",
    text: "As-tu déjà essayé la poterie ou la céramique ?",
    hint: "Discuss making pottery, working with clay, or taking art classes.",
    difficulty: 2,
    followUps: [
      "Qu'est-ce que tu as fabriqué en poterie ?",
      "Trouves-tu que travailler l'argile est relaxant ?",
      "Aimerais-tu prendre des cours d'art à l'avenir ?"
    ],
    modelAnswer: "J'ai commencé la poterie l'année dernière en prenant des cours du soir. C'est incroyablement relaxant de travailler l'argile avec ses mains. J'ai déjà fabriqué plusieurs bols, des tasses et même un petit vase pour ma mère. Au début, c'était très salissant et difficile de centrer l'argile sur le tour, mais avec de la pratique, je me suis beaucoup amélioré(e).",
    keyVocab: [
      { fr: "la poterie", en: "pottery" },
      { fr: "l'argile", en: "clay" },
      { fr: "un cours du soir", en: "an evening class" },
      { fr: "salissant(e)", en: "messy" },
      { fr: "le tour (de potier)", en: "the potter's wheel" },
      { fr: "un bol", en: "a bowl" }
    ]
  },
  {
    id: "hob_54",
    topicKey: "hobbies",
    text: "Pratiques-tu le yoga ou la méditation pour te détendre ?",
    hint: "Talk about yoga, stretching, mindfulness, or meditation practices.",
    difficulty: 2,
    followUps: [
      "À quelle fréquence fais-tu du yoga ?",
      "Suis-tu des cours en ligne ou vas-tu dans un studio ?",
      "Est-ce que ça t'aide à mieux te concentrer à l'école ?"
    ],
    modelAnswer: "Je fais du yoga trois fois par semaine, généralement le matin avant d'aller au lycée. Je suis des vidéos sur YouTube dans ma chambre. Cela m'aide énormément à m'étirer et à réveiller mon corps en douceur. De plus, les exercices de respiration me permettent de rester calme et de mieux gérer le stress des examens. C'est une habitude saine que je recommande à tout le monde.",
    keyVocab: [
      { fr: "le yoga", en: "yoga" },
      { fr: "la méditation", en: "meditation" },
      { fr: "s'étirer", en: "to stretch" },
      { fr: "en douceur", en: "gently" },
      { fr: "la respiration", en: "breathing" },
      { fr: "gérer le stress", en: "to manage stress" }
    ]
  },
  {
    id: "hob_55",
    topicKey: "hobbies",
    text: "Aimes-tu jouer aux jeux de société avec tes amis ou ta famille ?",
    hint: "Discuss board games, strategy games, or family game nights.",
    difficulty: 1,
    followUps: [
      "Quel est ton jeu de société préféré ?",
      "Es-tu un(e) bon(ne) perdant(e) ?",
      "Préfères-tu les jeux de stratégie ou les jeux de hasard ?"
    ],
    modelAnswer: "Oui, les jeux de société sont une tradition dans ma famille. Tous les vendredis soirs, on se réunit autour de la table pour jouer. Mon jeu préféré est Les Colons de Catane car j'adore la stratégie et la négociation. Je dois avouer que je suis parfois un peu mauvais perdant, mais c'est surtout pour rire. C'est une excellente façon de passer du temps ensemble sans regarder un écran.",
    keyVocab: [
      { fr: "un jeu de société", en: "a board game" },
      { fr: "la stratégie", en: "strategy" },
      { fr: "un(e) mauvais(e) perdant(e)", en: "a sore loser" },
      { fr: "se réunir", en: "to gather / meet up" },
      { fr: "autour de", en: "around" },
      { fr: "le hasard", en: "chance / luck" }
    ]
  },
  {
    id: "hob_56",
    topicKey: "hobbies",
    text: "As-tu déjà fait un jeu d'évasion (escape room) ?",
    hint: "Talk about escape rooms, solving puzzles, and teamwork.",
    difficulty: 2,
    followUps: [
      "Avec qui es-tu allé(e) faire ce jeu d'évasion ?",
      "Avez-vous réussi à sortir avant la fin du temps ?",
      "Qu'est-ce qui est le plus important pour gagner ?"
    ],
    modelAnswer: "J'ai découvert les jeux d'évasion l'année dernière pour mon anniversaire et j'ai adoré ! J'y suis allé avec trois amis. On a été enfermés dans une pièce sur le thème des pirates et on devait résoudre des énigmes pour s'échapper. L'esprit d'équipe et la communication sont absolument essentiels pour réussir. Malheureusement, on a manqué de temps, mais c'était quand même une expérience palpitante.",
    keyVocab: [
      { fr: "un jeu d'évasion", en: "an escape room" },
      { fr: "être enfermé(e)", en: "to be locked in" },
      { fr: "résoudre", en: "to solve" },
      { fr: "une énigme", en: "a puzzle / riddle" },
      { fr: "s'échapper", en: "to escape" },
      { fr: "palpitant(e)", en: "thrilling / exciting" }
    ]
  },
  {
    id: "hob_57",
    topicKey: "hobbies",
    text: "T'intéresses-tu aux tours de magie ou à l'illusionnisme ?",
    hint: "Discuss learning magic tricks, card tricks, and entertaining others.",
    difficulty: 3,
    followUps: [
      "Quel est ton tour de magie préféré ?",
      "Où as-tu appris à faire de la magie ?",
      "Aimes-tu faire des spectacles pour ta famille ?"
    ],
    modelAnswer: "Depuis que j'ai vu un magicien à la télévision, je suis fasciné par l'illusionnisme. J'ai acheté quelques livres et je regarde des vidéos pour apprendre des tours de cartes. C'est un passe-temps qui demande beaucoup d'habileté et de pratique devant le miroir. J'aime surprendre mes amis lors des fêtes, même si parfois mes tours ratent un peu. C'est toujours amusant de voir leurs réactions.",
    keyVocab: [
      { fr: "un tour de magie", en: "a magic trick" },
      { fr: "l'illusionnisme", en: "illusionism / magic" },
      { fr: "un tour de cartes", en: "a card trick" },
      { fr: "l'habileté", en: "skill / dexterity" },
      { fr: "surprendre", en: "to surprise" },
      { fr: "rater", en: "to fail / mess up" }
    ]
  },
  {
    id: "hob_58",
    topicKey: "hobbies",
    text: "Fais-tu de l'astronomie en observant les étoiles ?",
    hint: "Talk about stargazing, telescopes, and learning about space.",
    difficulty: 3,
    followUps: [
      "As-tu un télescope chez toi ?",
      "Quelle est ta planète ou constellation préférée ?",
      "Aimerais-tu voyager dans l'espace un jour ?"
    ],
    modelAnswer: "L'astronomie me passionne profondément. Mon grand-père m'a offert un télescope pour Noël, et depuis, je passe de nombreuses nuits claires à observer le ciel. J'ai appris à reconnaître plusieurs constellations, comme la Grande Ourse et Orion. L'immensité de l'univers me fascine. Si j'en avais l'occasion, je rêverais d'aller dans l'espace pour voir la Terre depuis là-haut.",
    keyVocab: [
      { fr: "l'astronomie", en: "astronomy" },
      { fr: "un télescope", en: "a telescope" },
      { fr: "observer", en: "to observe" },
      { fr: "le ciel", en: "the sky" },
      { fr: "une constellation", en: "a constellation" },
      { fr: "l'immensité", en: "the immensity / vastness" }
    ]
  },
  {
    id: "hob_59",
    topicKey: "hobbies",
    text: "Aimes-tu faire voler un drone pendant ton temps libre ?",
    hint: "Discuss flying drones, taking aerial photos, or racing drones.",
    difficulty: 2,
    followUps: [
      "Depuis combien de temps as-tu un drone ?",
      "Préfères-tu prendre des photos ou faire des courses ?",
      "Est-ce difficile de piloter un drone ?"
    ],
    modelAnswer: "J'ai acheté un drone l'été dernier et c'est devenu ma nouvelle passion. J'adore l'emmener quand je pars en balade à la campagne pour filmer des paysages vus d'en haut. Les images aériennes sont souvent spectaculaires. Au début, c'était un peu difficile à piloter et j'avais peur de le crasher dans un arbre, mais maintenant je maîtrise plutôt bien les commandes.",
    keyVocab: [
      { fr: "un drone", en: "a drone" },
      { fr: "aérien(ne)", en: "aerial" },
      { fr: "piloter", en: "to pilot / fly" },
      { fr: "spectaculaire", en: "spectacular" },
      { fr: "maîtriser", en: "to master / control" },
      { fr: "les commandes", en: "the controls" }
    ]
  },
  {
    id: "hob_60",
    topicKey: "hobbies",
    text: "Fais-tu du skate (planche à roulettes) ?",
    hint: "Talk about skateboarding, skateparks, learning tricks, and skate culture.",
    difficulty: 2,
    followUps: [
      "Vas-tu souvent au skatepark de ta ville ?",
      "Quel est le plus difficile quand on apprend le skate ?",
      "T'es-tu déjà blessé(e) en faisant du skate ?"
    ],
    modelAnswer: "Oui, je fais du skate presque tous les jours après l'école. Je retrouve mes amis au skatepark du quartier pour m'entraîner à faire de nouvelles figures. C'est un sport très exigeant qui demande de la persévérance. Je tombe souvent, et j'ai déjà eu quelques bleus et égratignures, mais la sensation de réussite quand on passe une figure difficile vaut vraiment la peine.",
    keyVocab: [
      { fr: "le skate / la planche à roulettes", en: "skateboarding" },
      { fr: "un skatepark", en: "a skatepark" },
      { fr: "une figure", en: "a trick (skate/BMX)" },
      { fr: "la persévérance", en: "perseverance" },
      { fr: "tomber", en: "to fall" },
      { fr: "un bleu", en: "a bruise" }
    ]
  },
  {
    id: "hob_61",
    topicKey: "hobbies",
    text: "Aimes-tu la couture ou fabriquer tes propres vêtements ?",
    hint: "Discuss sewing, making clothes, fashion, or upcycling fabrics.",
    difficulty: 2,
    followUps: [
      "As-tu une machine à coudre ?",
      "Qu'as-tu cousu récemment ?",
      "Préfères-tu créer de nouveaux vêtements ou réparer d'anciens ?"
    ],
    modelAnswer: "La couture est une de mes activités favorites. J'ai appris avec ma grand-mère sur sa vieille machine à coudre. J'aime particulièrement le fait de pouvoir créer des vêtements uniques qui correspondent exactement à mon style. Récemment, j'ai cousu un sac fourre-tout à partir de vieux jeans. C'est très créatif et, de nos jours, c'est aussi un bon moyen de lutter contre la fast-fashion.",
    keyVocab: [
      { fr: "la couture", en: "sewing" },
      { fr: "une machine à coudre", en: "a sewing machine" },
      { fr: "coudre", en: "to sew" },
      { fr: "un sac fourre-tout", en: "a tote bag" },
      { fr: "un(e) couturier(ère)", en: "a tailor / dressmaker" },
      { fr: "la mode éphémère", en: "fast fashion" }
    ]
  },
  {
    id: "hob_62",
    topicKey: "hobbies",
    text: "Joues-tu à des jeux de rôle sur table (comme Donjons et Dragons) ?",
    hint: "Talk about tabletop RPGs, creating characters, and storytelling.",
    difficulty: 3,
    followUps: [
      "Es-tu plutôt joueur ou maître du jeu ?",
      "Comment décrirais-tu ton personnage préféré ?",
      "Pourquoi aimes-tu ce genre de jeu ?"
    ],
    modelAnswer: "J'adore les jeux de rôle sur table, particulièrement Donjons et Dragons. On se réunit avec mon groupe d'amis une fois par mois pour jouer pendant des heures. Je suis souvent le maître du jeu, ce qui signifie que je dois inventer l'histoire et les obstacles. J'apprécie l'immersion totale et la liberté de choix. C'est comme écrire un livre d'aventure, mais ensemble et en temps réel.",
    keyVocab: [
      { fr: "un jeu de rôle", en: "a role-playing game (RPG)" },
      { fr: "le maître du jeu", en: "the game master" },
      { fr: "un personnage", en: "a character" },
      { fr: "l'immersion", en: "immersion" },
      { fr: "en temps réel", en: "in real time" },
      { fr: "un obstacle", en: "an obstacle / challenge" }
    ]
  },
  {
    id: "hob_63",
    topicKey: "hobbies",
    text: "Fais-tu du bénévolat ou aides-tu des associations pendant ton temps libre ?",
    hint: "Discuss volunteering, helping charities, or community service.",
    difficulty: 2,
    followUps: [
      "Pour quelle association fais-tu du bénévolat ?",
      "Pourquoi as-tu décidé de t'engager ?",
      "Que fais-tu exactement pour les aider ?"
    ],
    modelAnswer: "Je considère le bénévolat comme un loisir très important. Le samedi matin, j'aide dans un refuge pour animaux de ma ville. Je m'occupe de promener les chiens et de nettoyer les cages. J'ai décidé de m'engager car j'adore les animaux et je voulais me sentir utile dans ma communauté. C'est très gratifiant de voir que l'on peut faire une différence dans la vie des autres.",
    keyVocab: [
      { fr: "le bénévolat", en: "volunteering" },
      { fr: "une association", en: "a charity / association" },
      { fr: "un refuge pour animaux", en: "an animal shelter" },
      { fr: "s'engager", en: "to commit / get involved" },
      { fr: "se sentir utile", en: "to feel useful" },
      { fr: "la communauté", en: "the community" }
    ]
  },
  {
    id: "hob_64",
    topicKey: "hobbies",
    text: "Apprends-tu une autre langue étrangère comme passe-temps (à part le français) ?",
    hint: "Talk about language learning apps, motivation, and which languages you study.",
    difficulty: 2,
    followUps: [
      "Quelle autre langue apprends-tu ?",
      "Utilises-tu des applications comme Duolingo ?",
      "Pourquoi penses-tu qu'il est utile de parler plusieurs langues ?"
    ],
    modelAnswer: "En plus du français à l'école, j'apprends l'espagnol en autodidacte pendant mon temps libre. J'utilise des applications mobiles tous les jours pendant environ vingt minutes. J'adore écouter de la musique espagnole, ce qui m'aide à améliorer ma prononciation. Je trouve que connaître plusieurs langues ouvre l'esprit, permet de découvrir de nouvelles cultures et sera très utile pour ma future carrière.",
    keyVocab: [
      { fr: "une langue étrangère", en: "a foreign language" },
      { fr: "en autodidacte", en: "self-taught" },
      { fr: "une application mobile", en: "a mobile app" },
      { fr: "la prononciation", en: "pronunciation" },
      { fr: "ouvrir l'esprit", en: "to broaden one's mind" },
      { fr: "polyglotte", en: "multilingual / polyglot" }
    ]
  },
  {
    id: "hob_65",
    topicKey: "hobbies",
    text: "Fais-tu du théâtre ou de la comédie ?",
    hint: "Discuss acting, drama club, stage fright, and performances.",
    difficulty: 2,
    followUps: [
      "As-tu déjà joué dans une pièce de théâtre ?",
      "As-tu le trac (stage fright) avant de monter sur scène ?",
      "Quel type de rôle préfères-tu jouer ?"
    ],
    modelAnswer: "Je fais partie du club de théâtre de mon lycée et c'est ma passion. On répète tous les mercredis. J'adore jouer des rôles comiques car faire rire le public est une sensation géniale. Bien sûr, j'ai toujours un peu le trac avant que le rideau se lève, mais dès que je dis ma première réplique, le stress disparaît. Le théâtre m'a donné beaucoup de confiance en moi.",
    keyVocab: [
      { fr: "le théâtre", en: "theatre / drama" },
      { fr: "une pièce de théâtre", en: "a play" },
      { fr: "avoir le trac", en: "to have stage fright" },
      { fr: "monter sur scène", en: "to go on stage" },
      { fr: "répéter", en: "to rehearse" },
      { fr: "une réplique", en: "a line (in a play)" }
    ]
  },
  {
    id: "hob_66",
    topicKey: "hobbies",
    text: "Aimes-tu le recyclage créatif (upcycling) ou redonner vie à de vieux objets ?",
    hint: "Talk about DIY upcycling, restoring old furniture, or transforming clothes.",
    difficulty: 3,
    followUps: [
      "Où trouves-tu les objets que tu transformes ?",
      "Quelle est ta plus belle création ?",
      "Pourquoi le recyclage est-il important pour toi ?"
    ],
    modelAnswer: "Le recyclage créatif est un loisir qui me tient vraiment à cœur. J'adore fouiner dans les brocantes pour trouver de vieux objets ou des meubles abîmés. Ensuite, je les peins, je les répare et je leur donne une seconde vie. Par exemple, j'ai transformé une vieille valise en table de chevet. C'est à la fois écologique, créatif et très tendance. Ça évite de jeter des choses qui peuvent encore servir.",
    keyVocab: [
      { fr: "le recyclage créatif", en: "upcycling" },
      { fr: "une brocante", en: "a flea market" },
      { fr: "fouiner", en: "to snoop / rummage" },
      { fr: "redonner vie à", en: "to bring back to life" },
      { fr: "une table de chevet", en: "a bedside table" },
      { fr: "jeter", en: "to throw away" }
    ]
  },
  {
    id: "hob_67",
    topicKey: "hobbies",
    text: "Sais-tu jongler ou pratiques-tu les arts du cirque ?",
    hint: "Discuss juggling, circus skills, acrobatics, and coordination.",
    difficulty: 3,
    followUps: [
      "Avec combien de balles sais-tu jongler ?",
      "Est-ce difficile d'apprendre à jongler ?",
      "Pratiques-tu d'autres arts du cirque ?"
    ],
    modelAnswer: "J'ai appris à jongler pendant le confinement. J'ai commencé avec des paires de chaussettes, puis j'ai acheté de vraies balles de jonglage. Maintenant, je sais jongler avec trois balles et je m'entraîne pour y arriver avec quatre. C'est un exercice incroyable pour la coordination des yeux et des mains. Ça demande beaucoup de patience, car au début on passe son temps à ramasser les balles par terre !",
    keyVocab: [
      { fr: "jongler", en: "to juggle" },
      { fr: "les arts du cirque", en: "circus arts" },
      { fr: "une balle", en: "a ball" },
      { fr: "la coordination", en: "coordination" },
      { fr: "ramasser", en: "to pick up" },
      { fr: "par terre", en: "on the ground / floor" }
    ]
  },
  {
    id: "hob_68",
    topicKey: "hobbies",
    text: "Pratiques-tu des arts martiaux (judo, karaté, taekwondo) ?",
    hint: "Talk about martial arts, belts, discipline, and physical fitness.",
    difficulty: 1,
    followUps: [
      "Quel art martial pratiques-tu et depuis quand ?",
      "Quelle couleur de ceinture as-tu ?",
      "Penses-tu que cela aide à se défendre ou plutôt à se discipliner ?"
    ],
    modelAnswer: "Je fais du judo depuis que j'ai huit ans et je suis sur le point de passer ma ceinture marron. Je m'entraîne deux soirs par semaine au dojo local. J'aime les arts martiaux car ils ne développent pas seulement la force physique, mais aussi le respect, la discipline et la maîtrise de soi. Ce n'est pas pour se battre, mais pour apprendre à se défendre et à respecter son adversaire.",
    keyVocab: [
      { fr: "les arts martiaux", en: "martial arts" },
      { fr: "une ceinture", en: "a belt (martial arts)" },
      { fr: "la discipline", en: "discipline" },
      { fr: "la maîtrise de soi", en: "self-control" },
      { fr: "se défendre", en: "to defend oneself" },
      { fr: "un adversaire", en: "an opponent" }
    ]
  },
  {
    id: "hob_69",
    topicKey: "hobbies",
    text: "Aimes-tu faire de la peinture ou du dessin créatif ?",
    hint: "Discuss painting, drawing, watercolors, and artistic expression.",
    difficulty: 2,
    followUps: [
      "Préfères-tu la peinture à l'huile, l'aquarelle ou le dessin au crayon ?",
      "Quels sujets aimes-tu peindre (paysages, portraits) ?",
      "Exposes-tu tes œuvres ou les gardes-tu pour toi ?"
    ],
    modelAnswer: "La peinture est ma façon de m'exprimer. J'utilise surtout l'aquarelle car j'aime la douceur des couleurs et la façon dont l'eau se mélange sur le papier. Je peins souvent des paysages que je vois lors de mes promenades. Je garde la plupart de mes carnets de croquis pour moi, mais j'ai offert quelques tableaux à ma famille. Peindre m'aide à voir la beauté dans les petits détails du quotidien.",
    keyVocab: [
      { fr: "la peinture", en: "painting" },
      { fr: "le dessin", en: "drawing" },
      { fr: "l'aquarelle", en: "watercolor" },
      { fr: "un carnet de croquis", en: "a sketchbook" },
      { fr: "un tableau", en: "a painting (object)" },
      { fr: "s'exprimer", en: "to express oneself" }
    ]
  },
  {
    id: "hob_70",
    topicKey: "hobbies",
    text: "Est-ce que tu collectionnes quelque chose (timbres, pièces, cartes) ?",
    hint: "Talk about collecting items, finding rare pieces, and organizing the collection.",
    difficulty: 1,
    followUps: [
      "Que collectionnes-tu exactement ?",
      "Quelle est la pièce la plus rare de ta collection ?",
      "Pourquoi aimes-tu collectionner ces objets ?"
    ],
    modelAnswer: "Depuis mon enfance, je collectionne les pièces de monnaie des pays étrangers. À chaque fois qu'un ami ou un membre de la famille voyage, je leur demande de me rapporter quelques pièces. J'ai une grande boîte pleine de monnaies d'Asie et d'Amérique. Je trouve que c'est fascinant car chaque pièce raconte une histoire et représente la culture et l'histoire d'un pays différent.",
    keyVocab: [
      { fr: "collectionner", en: "to collect" },
      { fr: "une pièce de monnaie", en: "a coin" },
      { fr: "un timbre", en: "a stamp" },
      { fr: "rare", en: "rare" },
      { fr: "rapporter", en: "to bring back" },
      { fr: "raconter une histoire", en: "to tell a story" }
    ]
  },
  {
    id: "hob_71",
    topicKey: "hobbies",
    text: "T'intéresses-tu à l'ornithologie (l'observation des oiseaux) ?",
    hint: "Discuss bird watching, nature walks, binoculars, and identifying species.",
    difficulty: 3,
    followUps: [
      "As-tu des jumelles pour observer les oiseaux ?",
      "Quel est l'oiseau le plus rare que tu aies vu ?",
      "Où vas-tu généralement pour faire de l'observation ?"
    ],
    modelAnswer: "L'observation des oiseaux est un passe-temps très paisible que je partage avec mon père. Le dimanche, on se lève tôt, on prend nos jumelles et on va dans une réserve naturelle près de chez nous. On utilise une application pour identifier les chants des oiseaux. Ça demande d'être silencieux et patient. Mon meilleur souvenir est le jour où nous avons aperçu un martin-pêcheur, ses couleurs étaient magnifiques.",
    keyVocab: [
      { fr: "l'ornithologie", en: "ornithology / bird watching" },
      { fr: "l'observation des oiseaux", en: "bird watching" },
      { fr: "des jumelles", en: "binoculars" },
      { fr: "une réserve naturelle", en: "a nature reserve" },
      { fr: "un chant d'oiseau", en: "a birdsong" },
      { fr: "apercevoir", en: "to catch a glimpse of" }
    ]
  },
  {
    id: "hob_72",
    topicKey: "hobbies",
    text: "Participes-tu à des tournois d'e-sport (compétitions de jeux vidéo) ?",
    hint: "Talk about competitive gaming, e-sports, team communication, and practice.",
    difficulty: 2,
    followUps: [
      "À quel jeu joues-tu en compétition ?",
      "Fais-tu partie d'une équipe en ligne ?",
      "Penses-tu que l'e-sport est un vrai sport ?"
    ],
    modelAnswer: "L'e-sport est ma plus grande passion. Je joue à des jeux de tir stratégiques en équipe, et nous participons à des tournois en ligne le week-end. On s'entraîne presque tous les soirs pour améliorer notre communication et nos réflexes. Je considère que c'est un vrai sport car cela demande autant de concentration, d'esprit d'équipe et de stratégie que le football ou le basket.",
    keyVocab: [
      { fr: "l'e-sport", en: "e-sports" },
      { fr: "un tournoi", en: "a tournament" },
      { fr: "un jeu de tir", en: "a shooting game" },
      { fr: "en ligne", en: "online" },
      { fr: "les réflexes", en: "reflexes" },
      { fr: "la concentration", en: "concentration" }
    ]
  },
  {
    id: "hob_73",
    topicKey: "hobbies",
    text: "As-tu déjà fait du géocaching (chasse au trésor par GPS) ?",
    hint: "Discuss geocaching, outdoor treasure hunts, using a phone GPS, and hiding small items.",
    difficulty: 3,
    followUps: [
      "Où cherches-tu des 'caches' en général ?",
      "As-tu déjà laissé un objet pour les autres dans une boîte ?",
      "Qu'est-ce qui te plaît dans cette activité ?"
    ],
    modelAnswer: "Le géocaching est parfait pour découvrir de nouveaux endroits. C'est comme une chasse au trésor moderne ! J'utilise mon téléphone pour trouver les coordonnées géographiques des boîtes cachées dans la ville ou la forêt. Parfois, elles sont très difficiles à trouver. Quand on en trouve une, on signe le petit carnet et on peut échanger un petit objet. C'est une façon très amusante de se promener à l'extérieur.",
    keyVocab: [
      { fr: "le géocaching", en: "geocaching" },
      { fr: "une chasse au trésor", en: "a treasure hunt" },
      { fr: "caché(e)", en: "hidden" },
      { fr: "un carnet", en: "a notebook / logbook" },
      { fr: "échanger", en: "to exchange" },
      { fr: "les coordonnées", en: "coordinates" }
    ]
  },
  {
    id: "hob_74",
    topicKey: "hobbies",
    text: "Pratiques-tu la calligraphie ou le lettrage artistique ?",
    hint: "Talk about beautiful handwriting, calligraphy pens, ink, and artistic writing.",
    difficulty: 3,
    followUps: [
      "Quels outils utilises-tu pour la calligraphie ?",
      "As-tu appris avec un professeur ou tout seul ?",
      "Aimes-tu faire des cartes d'anniversaire pour tes amis ?"
    ],
    modelAnswer: "J'ai découvert la calligraphie en regardant des vidéos apaisantes sur les réseaux sociaux. J'ai acheté des feutres spéciaux et de l'encre, et j'ai commencé à m'entraîner à former de belles lettres. C'est une activité très méticuleuse qui demande beaucoup de concentration. J'adore utiliser mes compétences pour créer des cartes de vœux personnalisées pour l'anniversaire de mes amis, ils apprécient toujours beaucoup.",
    keyVocab: [
      { fr: "la calligraphie", en: "calligraphy" },
      { fr: "le lettrage", en: "lettering" },
      { fr: "un feutre", en: "a felt-tip pen / marker" },
      { fr: "l'encre", en: "ink" },
      { fr: "méticuleux(euse)", en: "meticulous" },
      { fr: "une carte de vœux", en: "a greeting card" }
    ]
  },
  {
    id: "hob_75",
    topicKey: "hobbies",
    text: "Aimes-tu le scrapbooking pour conserver tes souvenirs ?",
    hint: "Discuss making memory albums, photos, decorating pages, and crafting.",
    difficulty: 2,
    followUps: [
      "Quels types de souvenirs mets-tu dans ton scrapbook ?",
      "Aimes-tu utiliser des autocollants ou des rubans ?",
      "Préfères-tu les photos imprimées ou les photos sur ton téléphone ?"
    ],
    modelAnswer: "Le scrapbooking est ma façon de conserver mes souvenirs de vacances et de moments passés avec mes amis. J'imprime mes photos préférées et je les colle dans un grand album. Ensuite, je décore les pages avec des autocollants, des petits dessins et des billets de cinéma ou de train. C'est tellement agréable à feuilleter quelques mois plus tard, c'est bien mieux que de laisser des centaines de photos dans son téléphone.",
    keyVocab: [
      { fr: "le scrapbooking", en: "scrapbooking" },
      { fr: "un souvenir", en: "a memory / souvenir" },
      { fr: "imprimer", en: "to print" },
      { fr: "un album", en: "an album" },
      { fr: "un autocollant", en: "a sticker" },
      { fr: "feuilleter", en: "to flip through (a book/album)" }
    ]
  },
  {
    id: "hob_76",
    topicKey: "hobbies",
    text: "Fais-tu du surf ou des sports nautiques pendant les vacances ?",
    hint: "Talk about surfing, beach holidays, water sports, and waves.",
    difficulty: 1,
    followUps: [
      "Où vas-tu habituellement pour faire du surf ?",
      "Est-ce difficile de se tenir debout sur la planche ?",
      "Préfères-tu la mer ou la piscine ?"
    ],
    modelAnswer: "Pendant les vacances d'été, j'adore faire du surf sur la côte ouest. Prendre une vague et réussir à se tenir debout sur la planche procure une sensation de liberté incroyable. Bien sûr, ça demande de l'équilibre et beaucoup de force pour nager, mais j'adore être dans l'océan. C'est l'un des meilleurs moyens de se rafraîchir et de faire de l'exercice en même temps.",
    keyVocab: [
      { fr: "le surf", en: "surfing" },
      { fr: "un sport nautique", en: "a water sport" },
      { fr: "une vague", en: "a wave" },
      { fr: "se tenir debout", en: "to stand up" },
      { fr: "une planche", en: "a board" },
      { fr: "se rafraîchir", en: "to cool down / refresh oneself" }
    ]
  },
  {
    id: "hob_77",
    topicKey: "hobbies",
    text: "Fais-tu de l'origami (l'art de plier le papier) ?",
    hint: "Discuss origami, paper folding, patience, and Japanese culture.",
    difficulty: 3,
    followUps: [
      "Quelle est la figure la plus difficile que tu as réalisée ?",
      "Utilises-tu du papier spécial pour origami ?",
      "Pourquoi aimes-tu cette activité minutieuse ?"
    ],
    modelAnswer: "J'ai découvert l'origami en lisant un livre sur la culture japonaise. C'est l'art de plier le papier pour créer des formes variées. Je connais par cœur les plis pour faire une grue en papier, symbole de paix. J'utilise des papiers carrés très colorés avec des motifs traditionnels. C'est une activité qui m'apaise, car elle demande de se concentrer sur chaque pli de façon très précise et de ne pas se presser.",
    keyVocab: [
      { fr: "l'origami", en: "origami" },
      { fr: "plier", en: "to fold" },
      { fr: "le papier", en: "paper" },
      { fr: "une grue (oiseau)", en: "a crane (bird)" },
      { fr: "apaiser", en: "to soothe / calm" },
      { fr: "précis(e)", en: "precise / accurate" }
    ]
  },
  {
    id: "fam_27",
    topicKey: "family",
    text: "Penses-tu que les réseaux sociaux nuisent à la vie de famille ?",
    hint: "Discuss the impact of social media on family interactions and quality time.",
    difficulty: 3,
    followUps: [
      "Est-ce que vous utilisez vos téléphones à table ?",
      "Comment la technologie aide-t-elle à rester en contact avec la famille éloignée ?",
      "Quelles sont les règles chez toi concernant les écrans ?"
    ],
    modelAnswer: "À mon avis, les réseaux sociaux peuvent nuire à la vie de famille s'ils sont utilisés de manière excessive. Parfois, on est ensemble physiquement mais chacun est sur son écran, ce qui réduit les conversations réelles. Cependant, c'est aussi un outil formidable pour partager des photos et des nouvelles avec les membres de la famille qui vivent loin.",
    keyVocab: [
      { fr: "nuire à", en: "to harm / be harmful to" },
      { fr: "de manière excessive", en: "excessively" },
      { fr: "un outil", en: "a tool" },
      { fr: "éloigné(e)", en: "distant / far away" },
      { fr: "la vie quotidienne", en: "daily life" },
      { fr: "réduire", en: "to reduce" }
    ],
  },
  {
    id: "fam_28",
    topicKey: "family",
    text: "Parle-moi d'un souvenir d'enfance précieux avec ta famille.",
    hint: "Describe a happy memory from when you were younger involving your family members.",
    difficulty: 2,
    followUps: [
      "Quel âge avais-tu ?",
      "Où étiez-vous ?",
      "Pourquoi ce souvenir est-il spécial pour toi ?"
    ],
    modelAnswer: "Je me souviens très bien d'un été où nous sommes allés camper près d'un lac. J'avais huit ans et mon père m'a appris à pêcher pour la première fois. Nous avons passé la soirée à faire griller des guimauves sur un feu de camp en racontant des histoires. C'est un souvenir précieux parce que c'était un moment de pure simplicité et de complicité.",
    keyVocab: [
      { fr: "précieux / précieuse", en: "precious" },
      { fr: "pêcher", en: "to fish" },
      { fr: "une guimauve", en: "a marshmallow" },
      { fr: "la complicité", en: "bond / closeness" },
      { fr: "se souvenir de", en: "to remember" },
      { fr: "l'enfance", en: "childhood" }
    ],
  },
  {
    id: "fam_29",
    topicKey: "family",
    text: "Est-il important d'avoir des frères et sœurs selon toi ?",
    hint: "Discuss the advantages and disadvantages of having siblings versus being an only child.",
    difficulty: 2,
    followUps: [
      "Quels sont les avantages d'être l'aîné(e) ou le/la cadet(te) ?",
      "Est-ce que tu te disputes souvent avec tes frères ou sœurs ?",
      "Aimerais-tu avoir une famille nombreuse plus tard ?"
    ],
    modelAnswer: "Je pense qu'avoir des frères et sœurs est très bénéfique car on apprend à partager et à être patient dès le plus jeune âge. On a toujours quelqu'un avec qui jouer et se confier. Par contre, il peut y avoir des rivalités ou un manque d'intimité dans la maison. Dans l'ensemble, je préfère ne pas être seul car mes frères sont mes meilleurs amis.",
    keyVocab: [
      { fr: "l'aîné(e)", en: "the eldest" },
      { fr: "se confier", en: "to confide in" },
      { fr: "la rivalité", en: "rivalry" },
      { fr: "l'intimité", en: "privacy" },
      { fr: "apprendre à", en: "to learn to" },
      { fr: "bénéfique", en: "beneficial" }
    ],
  },
  {
    id: "fam_30",
    topicKey: "family",
    text: "Y a-t-il un membre de ta famille qui est un modèle pour toi ?",
    hint: "Describe a family member you look up to and explain why they inspire you.",
    difficulty: 2,
    followUps: [
      "Quelles qualités possèdes-tu en commun avec cette personne ?",
      "Qu'est-ce qu'elle t'a appris d'important ?",
      "Est-ce qu'elle a un métier qui t'intéresse ?"
    ],
    modelAnswer: "Mon modèle est ma tante Marie car elle est extrêmement courageuse et travailleuse. Elle a créé sa propre entreprise tout en élevant trois enfants, ce que je trouve admirable. Elle est toujours positive et me donne d'excellents conseils pour mes études. J'aimerais avoir sa détermination et son sens de l'organisation à l'avenir.",
    keyVocab: [
      { fr: "un modèle", en: "a role model" },
      { fr: "regarder avec admiration", en: "to look up to" },
      { fr: "la détermination", en: "determination" },
      { fr: "inspirer", en: "to inspire" },
      { fr: "élever des enfants", en: "to raise children" },
      { fr: "travailleur / travailleuse", en: "hardworking" }
    ],
  },
  {
    id: "fam_31",
    topicKey: "family",
    text: "Quels sont les avantages de vivre avec ses grands-parents ?",
    hint: "Discuss multigenerational living and what younger people can learn from older generations.",
    difficulty: 3,
    followUps: [
      "Vois-tu tes grands-parents souvent ?",
      "Quelles histoires te racontent-ils ?",
      "Penses-tu que le fossé des générations est un problème ?"
    ],
    modelAnswer: "Vivre avec ses grands-parents permet de maintenir un lien fort avec son héritage culturel et d'apprendre de leur expérience de vie. Ils ont souvent beaucoup de patience et de sagesse à partager avec les jeunes. Cependant, cela peut parfois causer des tensions à cause de visions différentes sur l'éducation ou la discipline. C'est un équilibre à trouver pour que tout le monde se sente respecté.",
    keyVocab: [
      { fr: "l'héritage", en: "heritage" },
      { fr: "la sagesse", en: "wisdom" },
      { fr: "le fossé des générations", en: "generation gap" },
      { fr: "une vision", en: "a view / perspective" },
      { fr: "maintenir", en: "to maintain" },
      { fr: "apprendre de", en: "to learn from" }
    ],
  },
  {
    id: "fam_32",
    topicKey: "family",
    text: "Vers qui te tournes-tu quand tu as besoin de conseils ?",
    hint: "Explain who in your family gives the best advice and why you trust them.",
    difficulty: 1,
    followUps: [
      "Préfères-tu les conseils de tes parents ou de tes amis ?",
      "Sur quels sujets demandes-tu de l'aide ?",
      "Est-ce que tu écoutes toujours ce qu'on te dit ?"
    ],
    modelAnswer: "Quand j'ai un problème, je me tourne généralement vers ma mère car elle est très à l'écoute et ne me juge jamais. Elle a beaucoup d'expérience et sait toujours trouver les mots pour me rassurer. Parfois, je demande aussi l'avis de mon grand frère pour les questions scolaires. Je pense qu'il est essentiel d'avoir des personnes de confiance dans sa famille.",
    keyVocab: [
      { fr: "se tourner vers", en: "to turn to" },
      { fr: "être à l'écoute", en: "to be a good listener" },
      { fr: "rassurer", en: "to reassure" },
      { fr: "un avis", en: "an opinion" },
      { fr: "juger", en: "to judge" },
      { fr: "la confiance", en: "trust" }
    ],
  },
  {
    id: "fam_33",
    topicKey: "family",
    text: "Y a-t-il une recette spéciale que ta famille prépare souvent ?",
    hint: "Talk about a traditional family dish and its significance to you.",
    difficulty: 1,
    followUps: [
      "Qui cuisine le mieux chez toi ?",
      "Quels sont les ingrédients principaux ?",
      "Est-ce que tu sais cuisiner ce plat ?"
    ],
    modelAnswer: "Ma famille prépare souvent un gâteau au chocolat secret selon la recette de mon arrière-grand-mère. C'est une tradition de le faire pour chaque anniversaire. C'est un moment convivial où nous cuisinons tous ensemble dans la cuisine. Le gâteau est délicieux car il est très fondant et nous le servons avec de la crème. Pour moi, ce plat représente l'amour et l'unité de ma famille.",
    keyVocab: [
      { fr: "une recette", en: "a recipe" },
      { fr: "convivial(e)", en: "convivial / friendly" },
      { fr: "fondant(e)", en: "melting / soft" },
      { fr: "représenter", en: "to represent" },
      { fr: "l'unité", en: "unity" },
      { fr: "un ingrédient", en: "an ingredient" }
    ],
  },
  {
    id: "fam_34",
    topicKey: "family",
    text: "Comment ta famille a-t-elle changé au cours des cinq dernières années ?",
    hint: "Reflect on how your family dynamics or situation has evolved recently.",
    difficulty: 2,
    followUps: [
      "Y a-t-il eu de nouveaux membres dans la famille ?",
      "Est-ce que tu as plus de responsabilités maintenant ?",
      "Est-ce que vous passez plus ou moins de temps ensemble ?"
    ],
    modelAnswer: "Au cours des cinq dernières années, ma famille a beaucoup évolué car ma sœur aînée a quitté la maison pour aller à l'université. Nous avons également adopté un chien, ce qui a apporté beaucoup de joie. Personnellement, j'ai grandi et mes parents me font plus confiance, donc j'ai plus de liberté. Même si nous sommes plus occupés, nous essayons toujours de dîner ensemble le soir.",
    keyVocab: [
      { fr: "évoluer", en: "to evolve / change" },
      { fr: "quitter la maison", en: "to leave home" },
      { fr: "adopter", en: "to adopt" },
      { fr: "apporter", en: "to bring" },
      { fr: "faire confiance", en: "to trust" },
      { fr: "la liberté", en: "freedom" }
    ],
  },
  {
    id: "fam_35",
    topicKey: "family",
    text: "Est-ce que tu aimerais élever ta propre famille à l'étranger plus tard ?",
    hint: "Consider the pros and cons of raising a family in another country.",
    difficulty: 3,
    followUps: [
      "Quelles langues parlerais-tu à tes enfants ?",
      "Qu'est-ce qui te manquerait de ton pays d'origine ?",
      "Quels sont les avantages pour les enfants de vivre à l'étranger ?"
    ],
    modelAnswer: "Oui, je pense que ce serait une expérience enrichissante d'élever une famille à l'étranger. Cela permettrait à mes futurs enfants de devenir bilingues et d'avoir une ouverture d'esprit sur le monde. Cependant, ce serait difficile d'être loin des grands-parents et des cousins. Je choisirais probablement un pays avec un bon système éducatif et une qualité de vie élevée.",
    keyVocab: [
      { fr: "élever une famille", en: "to raise a family" },
      { fr: "enrichissant(e)", en: "enriching" },
      { fr: "bilingue", en: "bilingual" },
      { fr: "l'ouverture d'esprit", en: "open-mindedness" },
      { fr: "le pays d'origine", en: "home country" },
      { fr: "la qualité de vie", en: "quality of life" }
    ],
  },
  {
    id: "fam_36",
    topicKey: "family",
    text: "Qu'est-ce qui définit une 'famille heureuse' selon toi ?",
    hint: "Give your opinion on the most important values for a happy family life.",
    difficulty: 2,
    followUps: [
      "Est-ce que l'argent est nécessaire pour être heureux en famille ?",
      "Quelle est l'importance du respect mutuel ?",
      "Comment peut-on résoudre les conflits calmement ?"
    ],
    modelAnswer: "Pour moi, une famille heureuse est définie par l'amour, la communication et le soutien mutuel. Il est essentiel que chaque membre se sente écouté et respecté, peu importe son âge. On n'a pas besoin de beaucoup d'argent pour être heureux, tant qu'on passe du temps de qualité ensemble. La capacité à rire ensemble et à se pardonner est également fondamentale pour l'harmonie familiale.",
    keyVocab: [
      { fr: "définir", en: "to define" },
      { fr: "le soutien mutuel", en: "mutual support" },
      { fr: "peu importe", en: "no matter / regardless of" },
      { fr: "se pardonner", en: "to forgive each other" },
      { fr: "l'harmonie", en: "harmony" },
      { fr: "fondamental(e)", en: "fundamental" }
    ],
  },
  {
    id: "fam_37",
    topicKey: "family",
    text: "Quelle influence tes frères et sœurs ont-ils sur ton propre caractère ?",
    hint: "Discuss how siblings shape your personality — being responsible, funny, or competitive.",
    difficulty: 3,
    followUps: [
      "Qui est le plus sérieux entre vous ?",
      "Est-ce que tu es parfois jaloux ou jalouse d'eux ?",
      "Comment est-ce que vous vous entraidez au quotidien ?"
    ],
    modelAnswer: "Je pense que mes frères et sœurs ont une grande influence sur moi car on passe énormément de temps ensemble. Ma grande sœur est très organisée, ce qui m'encourage à être plus responsable. D'un autre côté, mon petit frère est très drôle et il m'apprend à ne pas prendre les choses trop au sérieux.",
    keyVocab: [
      { fr: "l'influence", en: "influence" },
      { fr: "le caractère", en: "character / personality" },
      { fr: "s'entraider", en: "to help each other" },
      { fr: "responsable", en: "responsible" },
      { fr: "jaloux / jalouse", en: "jealous" },
      { fr: "au quotidien", en: "daily" }
    ],
  },
  {
    id: "fam_38",
    topicKey: "family",
    text: "Quels sont les sujets de dispute les plus fréquents dans ta famille ?",
    hint: "Talk about common sources of conflict — chores, screen time, or sharing things.",
    difficulty: 2,
    followUps: [
      "Avec qui te disputes-tu le plus souvent ?",
      "Comment est-ce que vous vous réconciliez après une dispute ?",
      "Tes parents sont-ils souvent les médiateurs ?"
    ],
    modelAnswer: "En général, on se dispute pour des choses sans importance, comme le choix du film à regarder ou qui doit faire la vaisselle. Parfois, mes parents ne sont pas d'accord sur mon temps passé sur les réseaux sociaux. Cependant, on essaie toujours de discuter calmement après pour retrouver une bonne ambiance.",
    keyVocab: [
      { fr: "une dispute", en: "an argument / dispute" },
      { fr: "sans importance", en: "unimportant" },
      { fr: "faire la vaisselle", en: "to do the dishes" },
      { fr: "se réconcilier", en: "to make up / reconcile" },
      { fr: "calmement", en: "calmly" },
      { fr: "la bonne ambiance", en: "good atmosphere" }
    ],
  },
  {
    id: "fam_39",
    topicKey: "family",
    text: "Quelles activités fais-tu spécifiquement avec tes parents pour vous amuser ?",
    hint: "Describe shared fun activities like hobbies, sports, or games.",
    difficulty: 1,
    followUps: [
      "Est-ce que vous sortez souvent au restaurant ensemble ?",
      "Est-ce que vous jouez à des jeux de société le week-end ?",
      "Qui gagne d'habitude quand vous jouez ensemble ?"
    ],
    modelAnswer: "Avec mes parents, nous aimons beaucoup aller faire des randonnées en forêt le dimanche après-midi. Parfois, nous jouons aussi à des jeux de société le soir après le dîner. C'est un moment très sympa qui nous permet de rire et de nous détendre ensemble.",
    keyVocab: [
      { fr: "s'amuser", en: "to have fun" },
      { fr: "une randonnée", en: "a hike" },
      { fr: "un jeu de société", en: "a board game" },
      { fr: "d'habitude", en: "usually" },
      { fr: "rire", en: "to laugh" },
      { fr: "se détendre", en: "to relax" }
    ],
  },
  {
    id: "fam_40",
    topicKey: "family",
    text: "Pourquoi est-il important de prendre les repas en famille tous les soirs ?",
    hint: "Discuss the social and emotional benefits of shared family meals.",
    difficulty: 2,
    followUps: [
      "De quoi parlez-vous d'habitude à table ?",
      "Est-ce que vous regardez la télé en mangeant ?",
      "Qui prépare le repas chez toi la plupart du temps ?"
    ],
    modelAnswer: "Oui, je pense que c'est essentiel car c'est le seul moment de la journée où tout le monde est réuni. On en profite pour discuter de notre journée et partager nos problèmes ou nos réussites. Sans ce moment, je crois qu'on se parlerait beaucoup moins.",
    keyVocab: [
      { fr: "un repas", en: "a meal" },
      { fr: "essentiel(le)", en: "essential" },
      { fr: "réuni(e)", en: "gathered / together" },
      { fr: "en profiter pour", en: "to take the opportunity to" },
      { fr: "une réussite", en: "a success" },
      { fr: "à table", en: "at the table" }
    ],
  },
  {
    id: "fam_41",
    topicKey: "family",
    text: "Est-ce que tu aimerais fonder ta propre famille plus tard ?",
    hint: "Talk about your future family aspirations — marriage, children, lifestyle.",
    difficulty: 3,
    followUps: [
      "Combien d'enfants voudrais-tu avoir dans l'idéal ?",
      "Aimerais-tu habiter près de tes parents plus tard ?",
      "Quelles valeurs aimerais-tu transmettre à tes enfants ?"
    ],
    modelAnswer: "Plus tard, j'aimerais beaucoup avoir deux ou trois enfants car j'aime l'idée d'avoir une maison pleine de vie. Je voudrais être un parent encourageant et patient, comme les miens. Je pense que fonder une famille est une étape importante pour s'épanouir dans la vie.",
    keyVocab: [
      { fr: "fonder une famille", en: "to start a family" },
      { fr: "plus tard", en: "later on" },
      { fr: "pleine de vie", en: "full of life" },
      { fr: "encourageant(e)", en: "encouraging" },
      { fr: "s'épanouir", en: "to blossom / find fulfillment" },
      { fr: "transmettre", en: "to pass on / transmit" }
    ],
  },
  {
    id: "fam_42",
    topicKey: "family",
    text: "Quels sont les avantages de vivre dans une famille nombreuse ?",
    hint: "Discuss the pros (company, support) and cons (noise, lack of space) of a big family.",
    difficulty: 1,
    followUps: [
      "Est-ce que c'est souvent bruyant chez toi ?",
      "As-tu assez d'espace personnel ou une chambre à toi ?",
      "Est-ce que vous vous entraidez pour les devoirs ?"
    ],
    modelAnswer: "Vivre dans une famille nombreuse est génial parce qu'on ne s'ennuie jamais et il y a toujours quelqu'un à qui parler. On apprend très tôt à partager et à être solidaire avec les autres. Par contre, il faut avouer que la maison est souvent bruyante et qu'on manque parfois d'intimité.",
    keyVocab: [
      { fr: "nombreux / nombreuse", en: "large (family)" },
      { fr: "s'ennuyer", en: "to get bored" },
      { fr: "partager", en: "to share" },
      { fr: "solidaire", en: "supportive / united" },
      { fr: "bruyant(e)", en: "noisy" },
      { fr: "l'intimité", en: "privacy" }
    ],
  },
  {
    id: "fam_43",
    topicKey: "family",
    text: "Est-il important de connaître l'histoire et les origines de sa famille ?",
    hint: "Discuss the importance of heritage, ancestry, and family stories.",
    difficulty: 3,
    followUps: [
      "As-tu déjà fait des recherches sur tes ancêtres ?",
      "Est-ce que tes grands-parents te racontent des histoires du passé ?",
      "Où habitaient tes ancêtres il y a cent ans ?"
    ],
    modelAnswer: "Je crois que c'est fondamental pour comprendre qui on est et d'où on vient. Connaître le parcours de ses ancêtres permet d'apprécier les traditions qui nous ont été transmises. Cela crée un sentiment de fierté et renforce notre identité personnelle au sein de la société.",
    keyVocab: [
      { fr: "les origines", en: "origins / background" },
      { fr: "fondamental(e)", en: "fundamental" },
      { fr: "un ancêtre", en: "an ancestor" },
      { fr: "une fierté", en: "a sense of pride" },
      { fr: "l'identity", en: "identity" },
      { fr: "au sein de", en: "within" }
    ],
  },
  {
    id: "fam_44",
    topicKey: "family",
    text: "Comment ta famille influence-t-elle tes choix pour l'avenir professionnel ?",
    hint: "Talk about family expectations, support, or pressure regarding your career.",
    difficulty: 2,
    followUps: [
      "Est-ce que tes parents veulent que tu fasses le même métier qu'eux ?",
      "Est-ce qu'ils te mettent la pression pour avoir de bonnes notes ?",
      "À qui d'autre demandes-tu conseil pour ton avenir ?"
    ],
    modelAnswer: "Mes parents m'encouragent à suivre ma passion, mais ils me donnent aussi des conseils pratiques sur le marché du travail. Leur expérience m'aide à éviter certaines erreurs et à choisir une voie qui me correspond vraiment. Ils ne me mettent pas la pression, mais leur avis compte énormément pour moi.",
    keyVocab: [
      { fr: "l'avenir professionnel", en: "professional future / career" },
      { fr: "le marché du travail", en: "job market" },
      { fr: "une voie", en: "a path / route" },
      { fr: "mettre la pression", en: "to put pressure" },
      { fr: "un avis", en: "an opinion / advice" },
      { fr: "compter", en: "to count / matter" }
    ],
  },
  {
    id: "fam_45",
    topicKey: "family",
    text: "Quel est le rôle des grands-parents dans la société actuelle selon toi ?",
    hint: "Discuss the evolution of grandparents' roles — childcare, wisdom, or modern connection.",
    difficulty: 3,
    followUps: [
      "Est-ce que tes grands-parents s'occupent souvent de toi ?",
      "Apportent-ils une sagesse particulière selon toi ?",
      "Penses-tu qu'ils sont plus connectés technologiquement qu'avant ?"
    ],
    modelAnswer: "Aujourd'hui, les grands-parents jouent souvent un rôle de soutien en s'occupant des enfants quand les parents travaillent. Ils transmettent aussi des valeurs et une sagesse que l'on ne trouve pas dans les livres. Je pense qu'ils sont le lien indispensable entre le passé et le présent.",
    keyVocab: [
      { fr: "le rôle", en: "role" },
      { fr: "la société actuelle", en: "modern society" },
      { fr: "la sagesse", en: "wisdom" },
      { fr: "un lien", en: "a link / bond" },
      { fr: "indispensable", en: "essential / indispensable" },
      { fr: "s'occuper de", en: "to look after" }
    ],
  },
  {
    id: "fam_46",
    topicKey: "family",
    text: "Comment restes-tu en contact avec les membres de ta famille qui habitent loin ?",
    hint: "Discuss technology, visits, or letters to stay close with distant relatives.",
    difficulty: 1,
    followUps: [
      "Utilises-tu souvent les appels vidéo pour leur parler ?",
      "À quelle fréquence vous voyez-vous en personne ?",
      "Est-ce que c'est difficile de garder le lien malgré la distance ?"
    ],
    modelAnswer: "J'utilise principalement les appels vidéo pour parler à mes cousins qui vivent à l'étranger. On a aussi un groupe sur WhatsApp où on partage des photos et des nouvelles tous les jours. Même si la distance est difficile, la technologie nous permet de rester très proches.",
    keyVocab: [
      { fr: "rester en contact", en: "to stay in touch" },
      { fr: "loin", en: "far away" },
      { fr: "un appel vidéo", en: "a video call" },
      { fr: "à l'étranger", en: "abroad" },
      { fr: "la distance", en: "distance" },
      { fr: "partager", en: "to share" }
    ],
  },
  {
    id: "hol_27",
    topicKey: "holidays",
    text: "Est-il important de parler la langue locale quand on voyage ?",
    hint: "Discuss the benefits of knowing the local language for cultural immersion and practical reasons.",
    difficulty: 2,
    followUps: [
      "As-tu déjà utilisé ton français en vacances ?",
      "Est-ce que les gens sont plus accueillants si on fait un effort ?",
      "Quels sont les problèmes si on ne parle pas du tout la langue ?"
    ],
    modelAnswer: "Je pense qu'il est très important d'apprendre au moins quelques phrases de base comme « bonjour » et « merci ». Cela montre du respect pour la culture locale et les habitants sont souvent beaucoup plus chaleureux. Cela aide aussi pour lire les menus ou demander son chemin dans les endroits moins touristiques. Pour moi, parler la langue fait partie intégrante de l'expérience du voyage.",
    keyVocab: [
      { fr: "la langue locale", en: "local language" },
      { fr: "faire un effort", en: "to make an effort" },
      { fr: "chaleureux / chaleureuse", en: "warm / friendly" },
      { fr: "demander son chemin", en: "to ask for directions" },
      { fr: "faire partie intégrante de", en: "to be an integral part of" },
      { fr: "les habitants", en: "locals / inhabitants" }
    ],
  },
  {
    id: "hol_28",
    topicKey: "holidays",
    text: "Que penses-tu du tourisme durable et de son impact sur l'environnement ?",
    hint: "Discuss eco-friendly travel options and how to reduce your carbon footprint while on holiday.",
    difficulty: 3,
    followUps: [
      "Préfères-tu prendre le train ou l'avion pour protéger la planète ?",
      "Est-ce que tu évites les plastiques jetables en vacances ?",
      "Comment peut-on aider l'économie locale sans détruire l'environnement ?"
    ],
    modelAnswer: "Le tourisme durable est essentiel aujourd'hui pour protéger les paysages magnifiques que nous aimons visiter. On peut essayer de voyager en train plutôt qu'en avion et choisir des hébergements écologiques. Il est aussi important de respecter la faune et la flore locales et de ne pas laisser de déchets derrière soi. À mon avis, nous devons voyager de manière plus responsable pour que les générations futures puissent aussi découvrir le monde.",
    keyVocab: [
      { fr: "durable", en: "sustainable" },
      { fr: "l'empreinte carbone", en: "carbon footprint" },
      { fr: "un hébergement", en: "accommodation" },
      { fr: "la faune et la flore", en: "wildlife and plants" },
      { fr: "les déchets", en: "waste / rubbish" },
      { fr: "responsable", en: "responsible" }
    ],
  },
  {
    id: "hol_29",
    topicKey: "holidays",
    text: "Préfères-tu les vacances dans ton propre pays ou à l'étranger ?",
    hint: "Compare 'staycations' (holidays at home) with traveling abroad.",
    difficulty: 1,
    followUps: [
      "Quels sont les avantages de rester près de chez soi ?",
      "Est-ce que c'est moins cher ?",
      "Y a-t-il des endroits magnifiques à visiter dans ta région ?"
    ],
    modelAnswer: "J'aime les deux, mais j'ai une préférence pour les vacances à l'étranger car c'est un dépaysement total. J'adore découvrir de nouvelles cultures, des paysages différents et une nourriture exotique. Cependant, rester dans son propre pays est beaucoup plus simple et écologique. On peut découvrir des trésors cachés juste à côté de chez soi sans avoir le stress des aéroports ou des visas.",
    keyVocab: [
      { fr: "le dépaysement", en: "change of scenery" },
      { fr: "exotique", en: "exotic" },
      { fr: "un trésor caché", en: "a hidden gem / treasure" },
      { fr: "le stress", en: "stress" },
      { fr: "un visa", en: "a visa" },
      { fr: "à l'étranger", en: "abroad" }
    ],
  },
  {
    id: "hol_30",
    topicKey: "holidays",
    text: "Y a-t-il un festival ou un événement culturel que tu voudrais voir à l'étranger ?",
    hint: "Talk about a specific event like Carnival in Rio, Bastille Day in France, or Holi in India.",
    difficulty: 2,
    followUps: [
      "Pourquoi cet événement t'intéresse-t-il ?",
      "Avec qui aimerais-tu y aller ?",
      "Qu'est-ce que tu porterais pour l'occasion ?"
    ],
    modelAnswer: "J'aimerais énormément assister au Carnaval de Nice en France. Les défilés de chars fleuris et l'ambiance festive sur la Côte d'Azur doivent être incroyables. C'est une occasion unique de voir les traditions locales et de s'amuser dans une ville magnifique. Je voudrais y aller avec mes amis pour profiter de la musique et de la bataille de fleurs. Je pense que ce serait un souvenir inoubliable et très coloré.",
    keyVocab: [
      { fr: "assister à", en: "to attend" },
      { fr: "un défilé", en: "a parade" },
      { fr: "un char", en: "a float (in a parade)" },
      { fr: "festif / festive", en: "festive" },
      { fr: "inoubliable", en: "unforgettable" },
      { fr: "coloré(e)", en: "colourful" }
    ],
  },
  {
    id: "hol_31",
    topicKey: "holidays",
    text: "Qu'est-ce qu'il y a d'absolument essentiel dans ta valise ?",
    hint: "List the items you cannot travel without and explain why.",
    difficulty: 1,
    followUps: [
      "Est-ce que tu emportes trop de vêtements d'habitude ?",
      "Préfères-tu un sac à dos ou une valise à roulettes ?",
      "Qu'est-ce que tu achètes toujours au magasin de l'aéroport ?"
    ],
    modelAnswer: "Dans ma valise, l'objet le plus essentiel est mon appareil photo car j'adore capturer tous les moments spéciaux. J'emporte aussi toujours mes écouteurs pour écouter de la musique pendant le trajet. Bien sûr, je n'oublie jamais ma crème solaire car j'ai la peau sensible. J'essaie de voyager léger, mais j'ai tendance à prendre trop de livres que je ne finis jamais de lire !",
    keyVocab: [
      { fr: "essentiel(le)", en: "essential" },
      { fr: "un appareil photo", en: "a camera" },
      { fr: "la crème solaire", en: "sunscreen" },
      { fr: "voyager léger", en: "to travel light" },
      { fr: "avoir tendance à", en: "to have a tendency to" },
      { fr: "un écouteur", en: "an earphone / headphone" }
    ],
  },
  {
    id: "hol_32",
    topicKey: "holidays",
    text: "Aimerais-tu faire un voyage spécial pour pratiquer un sport ?",
    hint: "Discuss holidays focused on activities like skiing, surfing, or hiking.",
    difficulty: 2,
    followUps: [
      "Quel sport choisirais-tu ?",
      "Où irais-tu pour pratiquer ce sport ?",
      "Est-ce que c'est plus fatigant que des vacances normales ?"
    ],
    modelAnswer: "J'aimerais beaucoup faire un voyage de surf au Portugal ou au Maroc. Ce serait génial de passer toute la journée dans l'eau et d'apprendre avec des professionnels. Je trouve que les vacances sportives sont très motivantes car on reste actif tout en découvrant de nouveaux paysages. Même si c'est physiquement fatigant, on se sent vraiment en forme et on rencontre des gens qui partagent la même passion.",
    keyVocab: [
      { fr: "pratiquer un sport", en: "to do / practice a sport" },
      { fr: "génial(e)", en: "great / awesome" },
      { fr: "motivant(e)", en: "motivating" },
      { fr: "fatigant(e)", en: "tiring" },
      { fr: "une passion", en: "a passion" },
      { fr: "actif / active", en: "active" }
    ],
  },
  {
    id: "hol_33",
    topicKey: "holidays",
    text: "Quelle est la meilleure façon d'explorer une nouvelle ville, selon toi ?",
    hint: "Compare walking, bus tours, cycling, or using public transport to see a city.",
    difficulty: 2,
    followUps: [
      "Préfères-tu utiliser une carte papier ou une application sur ton téléphone ?",
      "Est-ce que tu aimes te perdre dans les petites rues ?",
      "Est-ce qu'il vaut mieux visiter les musées ou simplement se promener ?"
    ],
    modelAnswer: "À mon avis, la meilleure façon d'explorer une ville est de marcher. On peut voir beaucoup plus de détails, s'arrêter dans des petits cafés et découvrir des endroits secrets que les bus touristiques ne voient pas. Si la ville est grande, j'aime aussi louer un vélo car c'est rapide et amusant. Je pense qu'il est important de prendre son temps et de s'imprégner de l'atmosphère locale sans trop se presser.",
    keyVocab: [
      { fr: "explorer", en: "to explore" },
      { fr: "s'imprégner de", en: "to soak up / immerse oneself in" },
      { fr: "louer un vélo", en: "to rent a bike" },
      { fr: "un endroit secret", en: "a secret spot" },
      { fr: "se presser", en: "to hurry" },
      { fr: "à pied", en: "on foot" }
    ],
  },
  {
    id: "hol_34",
    topicKey: "holidays",
    text: "Comment la technologie a-t-elle changé ta façon de voyager ?",
    hint: "Discuss the use of apps for maps, translation, booking, and social media on holiday.",
    difficulty: 3,
    followUps: [
      "Utilises-tu Google Maps pour t'orienter ?",
      "Est-ce que tu réserves tes hôtels en ligne ?",
      "Penses-tu qu'on regarde trop nos écrans au lieu de profiter du paysage ?"
    ],
    modelAnswer: "La technologie a rendu les voyages beaucoup plus faciles et moins stressants. Grâce aux applications, je peux traduire des panneaux instantanément ou trouver le meilleur restaurant du quartier en quelques secondes. On peut aussi réserver tout son voyage sur son téléphone, ce qui est très pratique. Cependant, il faut faire attention à ne pas rester trop connecté et à profiter réellement du moment présent sans toujours chercher le Wi-Fi.",
    keyVocab: [
      { fr: "traduire", en: "to translate" },
      { fr: "instantanément", en: "instantly" },
      { fr: "réserver", en: "to book" },
      { fr: "le moment présent", en: "the present moment" },
      { fr: "pratique", en: "practical / convenient" },
      { fr: "un panneau", en: "a sign" }
    ],
  },
  {
    id: "hol_35",
    topicKey: "holidays",
    text: "Préfères-tu les vacances de luxe ou les vacances à petit budget ?",
    hint: "Contrast high-end hotels and dining with hostels, camping, and budget travel.",
    difficulty: 2,
    followUps: [
      "Quels sont les inconvénients des hôtels bon marché ?",
      "Est-ce qu'on peut s'amuser autant sans dépenser beaucoup d'argent ?",
      "Si tu gagnais au loto, quel type de vacances choisirais-tu ?"
    ],
    modelAnswer: "Personnellement, je préfère les vacances à petit budget car c'est souvent plus authentique et aventureux. On rencontre des gens plus intéressants dans les auberges de jeunesse et on apprend à être débrouillard. Bien sûr, un hôtel de luxe est très confortable, mais on reste parfois dans une bulle sans vraiment voir la réalité du pays. Je pense que le plus important est l'expérience et les souvenirs, pas le prix de la chambre.",
    keyVocab: [
      { fr: "à petit budget", en: "budget / low cost" },
      { fr: "débrouillard(e)", en: "resourceful" },
      { fr: "une auberge de jeunesse", en: "a youth hostel" },
      { fr: "une bulle", en: "a bubble" },
      { fr: "authentique", en: "authentic" },
      { fr: "dépenser", en: "to spend (money)" }
    ],
  },
  {
    id: "hol_36",
    topicKey: "holidays",
    text: "Pourquoi est-il important de prendre des photos pendant ses vacances ?",
    hint: "Discuss the role of photography in preserving memories and sharing experiences.",
    difficulty: 2,
    followUps: [
      "Est-ce que tu partages tes photos sur Instagram ou Facebook ?",
      "Préfères-tu les photos numériques ou les albums papier ?",
      "Est-ce que tu passes trop de temps à prendre des photos ?"
    ],
    modelAnswer: "Prendre des photos est essentiel pour moi car cela permet de garder des souvenirs précis de moments heureux. Quand je regarde mes photos quelques années plus tard, je me rappelle des détails que j'aurais oubliés. C'est aussi un excellent moyen de partager mes aventures avec ma famille et mes amis. Cependant, il faut savoir poser l'appareil de temps en temps pour vivre l'expérience avec ses propres yeux et pas seulement à travers un objectif.",
    keyVocab: [
      { fr: "se rappeler", en: "to remember" },
      { fr: "un objectif", en: "a lens" },
      { fr: "numérique", en: "digital" },
      { fr: "précis / précise", en: "precise / accurate" },
      { fr: "garder des souvenirs", en: "to keep memories" },
      { fr: "de temps en temps", en: "from time to time" }
    ],
  },
  {
    id: "hol_37",
    topicKey: "holidays",
    text: "Préfères-tu loger dans un hôtel ou dans une location comme Airbnb en vacances ?",
    hint: "Compare hotel services with the local feel of a rental apartment.",
    difficulty: 2,
    followUps: [
      "Quel est l'avantage principal de l'hôtel selon toi ?",
      "Aimes-tu cuisiner tes propres repas pendant tes vacances ?",
      "Où as-tu logé lors de ton dernier voyage ?"
    ],
    modelAnswer: "Je préfère les locations Airbnb parce que c'est plus authentique et on se sent comme un habitant local. On a plus d'espace et on peut cuisiner ses propres repas, ce qui est plus économique. Cependant, l'hôtel est plus confortable si on veut se reposer sans rien faire.",
    keyVocab: [
      { fr: "loger", en: "to stay / lodge" },
      { fr: "une location", en: "a rental" },
      { fr: "authentique", en: "authentic" },
      { fr: "habitant local", en: "local resident" },
      { fr: "économique", en: "economical / cheap" },
      { fr: "se reposer", en: "to rest" }
    ],
  },
  {
    id: "hol_38",
    topicKey: "holidays",
    text: "Pourquoi est-il important de découvrir de nouvelles cultures en voyageant ?",
    hint: "Discuss broadening horizons, tolerance, and learning different ways of life.",
    difficulty: 3,
    followUps: [
      "Qu'est-ce que tu as appris de nouveau lors d'un voyage récent ?",
      "Est-ce que cela change ta façon de penser au quotidien ?",
      "Est-il facile de s'adapter à une culture très différente de la tienne ?"
    ],
    modelAnswer: "Voyager permet de sortir de sa zone de confort et de comprendre que le monde est très diversifié. En découvrant de nouvelles traditions, on devient plus tolérant et ouvert d'esprit. C'est une expérience qui nous enrichit personnellement bien plus que n'importe quel cours à l'école.",
    keyVocab: [
      { fr: "découvrir", en: "to discover" },
      { fr: "zone de confort", en: "comfort zone" },
      { fr: "diversifié(e)", en: "diverse / varied" },
      { fr: "ouvert d'esprit", en: "open-minded" },
      { fr: "enrichir", en: "to enrich" },
      { fr: "tolérant(e)", en: "tolerant" }
    ],
  },
  {
    id: "hol_39",
    topicKey: "holidays",
    text: "Est-ce que tu aimes visiter des monuments historiques en vacances ?",
    hint: "Talk about your interest in history, architecture, and landmarks.",
    difficulty: 1,
    followUps: [
      "Quel est le monument le plus impressionnant que tu as vu ?",
      "Préfères-tu les châteaux ou les musées d'art ?",
      "Est-ce que tu prends le temps de lire les informations sur les panneaux ?"
    ],
    modelAnswer: "Oui, j'adore ça car j'aime l'histoire et je trouve fascinant de voir des bâtiments qui ont des siècles. Ça permet d'imaginer comment les gens vivaient autrefois. Mon monument préféré est la Tour de Londres car il y a tellement d'histoires sombres et intéressantes.",
    keyVocab: [
      { fr: "un monument", en: "a monument / landmark" },
      { fr: "historique", en: "historical" },
      { fr: "fascinant(e)", en: "fascinating" },
      { fr: "autrefois", en: "in the past / formerly" },
      { fr: "sombre", en: "dark" },
      { fr: "un bâtiment", en: "a building" }
    ],
  },
  {
    id: "hol_40",
    topicKey: "holidays",
    text: "As-tu déjà eu un petit boulot ou un job d'été pendant les vacances ?",
    hint: "Describe work experiences during the holidays and what you learned.",
    difficulty: 1,
    followUps: [
      "Qu'est-ce que tu as fait exactement comme travail ?",
      "Est-ce que c'était difficile physiquement ou mentalement ?",
      "Qu'est-ce que tu as fait avec l'argent que tu as gagné ?"
    ],
    modelAnswer: "L'été dernier, j'ai travaillé comme serveur dans un petit café près de chez moi. C'était assez fatigant car il y avait beaucoup de clients, mais j'ai appris à être plus organisé. Avec l'argent que j'ai gagné, j'ai pu m'acheter un nouvel ordinateur pour l'école.",
    keyVocab: [
      { fr: "un job d'été", en: "a summer job" },
      { fr: "un serveur / une serveuse", en: "a waiter / waitress" },
      { fr: "fatigant(e)", en: "tiring" },
      { fr: "gagner de l'argent", en: "to earn money" },
      { fr: "organisé(e)", en: "organized" },
      { fr: "s'acheter", en: "to buy for oneself" }
    ],
  },
  {
    id: "hol_41",
    topicKey: "holidays",
    text: "Quel est ton moyen de transport préféré pour explorer une nouvelle ville ?",
    hint: "Talk about walking, cycling, or public transport in a city environment.",
    difficulty: 1,
    followUps: [
      "Est-ce que tu aimes beaucoup marcher en vacances ?",
      "Prends-tu souvent le métro ou le bus ?",
      "Préfères-tu louer un vélo ou une trottinette électrique ?"
    ],
    modelAnswer: "Je préfère explorer les villes à pied ou à vélo car on peut s'arrêter quand on veut pour prendre des photos. On découvre souvent des petits endroits cachés qu'on ne verrait pas en bus ou en métro. Pour moi, c'est la meilleure façon de vraiment ressentir l'ambiance d'un quartier.",
    keyVocab: [
      { fr: "moyen de transport", en: "means of transport" },
      { fr: "explorer", en: "to explore" },
      { fr: "à pied", en: "on foot" },
      { fr: "caché(e)", en: "hidden" },
      { fr: "ressentir", en: "to feel / sense" },
      { fr: "un quartier", en: "a neighborhood" }
    ],
  },
  {
    id: "hol_42",
    topicKey: "holidays",
    text: "Quelle est, selon toi, la meilleure saison pour partir en voyage ?",
    hint: "Discuss seasons (spring, summer, etc.) and the pros/cons of weather and crowds.",
    difficulty: 2,
    followUps: [
      "Aimes-tu voyager quand il fait très chaud ?",
      "Préfères-tu la neige ou le soleil pour tes vacances ?",
      "Est-ce qu'il y a trop de touristes pendant l'été selon toi ?"
    ],
    modelAnswer: "À mon avis, le printemps est la meilleure saison car il ne fait ni trop chaud ni trop froid. La nature est magnifique avec les fleurs et il y a moins de touristes qu'en juillet ou en août. C'est le moment idéal pour faire des visites culturelles sans souffrir de la chaleur.",
    keyVocab: [
      { fr: "la saison", en: "season" },
      { fr: "le printemps", en: "spring" },
      { fr: "magnifique", en: "magnificent / beautiful" },
      { fr: "idéal(e)", en: "ideal" },
      { fr: "souffrir", en: "to suffer" },
      { fr: "la chaleur", en: "the heat" }
    ],
  },
  {
    id: "hol_43",
    topicKey: "holidays",
    text: "Est-ce que les réseaux sociaux influencent tes choix de destinations ?",
    hint: "Discuss the impact of Instagram, TikTok, or travel blogs on your plans.",
    difficulty: 3,
    followUps: [
      "Regardes-tu des photos sur Instagram avant de choisir où partir ?",
      "Suis-tu des blogueurs de voyage célèbres ?",
      "Est-ce que les photos correspondent toujours à la réalité sur place ?"
    ],
    modelAnswer: "Oui, je dois avouer que je regarde souvent des photos sur Instagram pour trouver des endroits magnifiques à visiter. Les vidéos sur TikTok me donnent aussi beaucoup d'idées pour des activités originales. Cependant, je sais que les photos sont parfois plus belles que la réalité, donc je reste prudent ou prudente.",
    keyVocab: [
      { fr: "les réseaux sociaux", en: "social media" },
      { fr: "influencer", en: "to influence" },
      { fr: "avouer", en: "to admit" },
      { fr: "original / originale", en: "original / unique" },
      { fr: "la réalité", en: "reality" },
      { fr: "prudent(e)", en: "cautious" }
    ],
  },
  {
    id: "hol_44",
    topicKey: "holidays",
    text: "Aimerais-tu voyager pour assister à un grand événement sportif ou musical ?",
    hint: "Talk about going to the World Cup, Olympics, or a big concert abroad.",
    difficulty: 2,
    followUps: [
      "Quel événement t'intéresserait le plus ?",
      "Avec qui aimerais-tu partir pour ce genre de voyage ?",
      "Est-ce que c'est trop cher pour un étudiant d'après toi ?"
    ],
    modelAnswer: "J'adorerais voyager pour aller voir un match de la Coupe du Monde de football ou un concert de mon groupe préféré. L'ambiance doit être incroyable avec des gens venant du monde entier. Même si c'est un peu cher, je pense que les souvenirs d'un tel événement restent gravés pour toujours.",
    keyVocab: [
      { fr: "assister à", en: "to attend" },
      { fr: "un événement", en: "an event" },
      { fr: "sportif / sportive", en: "sporting" },
      { fr: "l'ambiance", en: "atmosphere" },
      { fr: "monde entier", en: "entire world" },
      { fr: "gravé(e)", en: "engraved / etched (in memory)" }
    ],
  },
  {
    id: "hol_45",
    topicKey: "holidays",
    text: "Quelles précautions prends-tu pour rester en sécurité quand tu voyages ?",
    hint: "Discuss safety measures like keeping passports safe and staying vigilant.",
    difficulty: 3,
    followUps: [
      "Est-ce que tu gardes toujours ton passeport avec toi ?",
      "Fais-tu attention à tes affaires dans les transports en commun ?",
      "Est-ce que tu évites de visiter certains quartiers le soir ?"
    ],
    modelAnswer: "Je fais toujours attention à mes affaires personnelles dans les endroits bondés pour éviter les pickpockets. Je garde une copie de mon passeport en ligne et je préviens toujours mes parents de l'endroit où je me trouve. Il est important d'être vigilant tout en profitant du voyage sans être trop stressé.",
    keyVocab: [
      { fr: "une précaution", en: "a precaution" },
      { fr: "la sécurité", en: "safety / security" },
      { fr: "bondé(e)", en: "crowded" },
      { fr: "un pickpocket", en: "a pickpocket" },
      { fr: "vigilant(e)", en: "vigilant / watchful" },
      { fr: "prévenir", en: "to warn / notify" }
    ],
  },
  {
    id: "hol_46",
    topicKey: "holidays",
    text: "Est-il nécessaire de partir loin de chez soi pour passer de bonnes vacances ?",
    hint: "Discuss the benefits of local tourism (staycations) vs. international travel.",
    difficulty: 1,
    followUps: [
      "Connais-tu bien ta propre région ?",
      "Quels sont les avantages de rester près de chez soi ?",
      "Est-ce que c'est moins stressant de ne pas prendre l'avion ?"
    ],
    modelAnswer: "Pas du tout ! On peut passer d'excellentes vacances en explorant sa propre région ou son propre pays. Ça permet de découvrir des endroits magnifiques sans passer des heures dans les transports. C'est aussi souvent plus écologique et plus économique que de partir à l'autre bout du monde.",
    keyVocab: [
      { fr: "loin de chez soi", en: "far from home" },
      { fr: "nécessaire", en: "necessary" },
      { fr: "propre", en: "own (e.g., own country)" },
      { fr: "écologique", en: "eco-friendly" },
      { fr: "économique", en: "economical" },
      { fr: "l'autre bout du monde", en: "the other side of the world" }
    ],
  },
  {
    id: "hom_25",
    topicKey: "home",
    text: "Qu'est-ce qu'il y a de plus intéressant à voir dans ta région pour un amoureux de la nature ?",
    hint: "Talk about parks, forests, lakes, or mountains nearby.",
    difficulty: 2,
    followUps: [
      "Tu préfères te promener en forêt ou au bord de l'eau ?",
      "Y a-t-il des animaux sauvages que l'on peut apercevoir ?",
      "Est-ce que les gens respectent la nature dans ton coin ?"
    ],
    modelAnswer: "Dans ma région, le plus intéressant est sans doute la forêt domaniale qui se trouve à vingt minutes de chez moi. C'est un endroit magnifique avec des sentiers de randonnée et des arbres centenaires. On peut aussi visiter une réserve naturelle où l'on protège les oiseaux migrateurs. C'est le lieu idéal pour se ressourcer loin du bruit de la ville.",
    keyVocab: [
      { fr: "amoureux de la nature", en: "nature lover" },
      { fr: "une forêt domaniale", en: "state forest" },
      { fr: "un sentier de randonnée", en: "hiking trail" },
      { fr: "centenaire", en: "century-old" },
      { fr: "oiseaux migrateurs", en: "migratory birds" },
      { fr: "se ressourcer", en: "to recharge one's batteries" }
    ],
  },
  {
    id: "hom_26",
    topicKey: "home",
    text: "Décris la vue depuis la fenêtre de ta chambre.",
    hint: "What can you see? Buildings, trees, people, the street?",
    difficulty: 1,
    followUps: [
      "Est-ce que tu aimes cette vue ?",
      "Est-ce que c'est bruyant quand tu ouvres la fenêtre ?",
      "Qu'est-ce que tu aimerais voir à la place ?"
    ],
    modelAnswer: "Depuis ma fenêtre, je peux voir notre petit jardin et quelques grands chênes au fond. Au loin, on aperçoit les toits des maisons voisines et le clocher de l'église. C'est une vue très apaisante, surtout le matin quand les oiseaux chantent. Parfois, je vois aussi des gens qui promènent leur chien dans la rue.",
    keyVocab: [
      { fr: "au loin", en: "in the distance" },
      { fr: "un chêne", en: "an oak tree" },
      { fr: "le clocher", en: "church tower" },
      { fr: "apaisant", en: "soothing / peaceful" },
      { fr: "voisin", en: "neighboring" },
      { fr: "apercevoir", en: "to catch sight of" }
    ],
  },
  {
    id: "hom_27",
    topicKey: "home",
    text: "Comment est-ce que tu aides à entretenir le jardin ou la maison ?",
    hint: "Specific chores like watering plants, mowing the lawn, or cleaning.",
    difficulty: 1,
    followUps: [
      "Est-ce que tu aimes le jardinage ?",
      "Quel est l'outil le plus difficile à utiliser ?",
      "Tes parents te récompensent-ils pour ton aide ?"
    ],
    modelAnswer: "J'aide souvent mon père dans le jardin le week-end. Je m'occupe d'arroser les fleurs et d'enlever les mauvaises herbes dans les massifs. Parfois, je passe la tondeuse sur la pelouse, même si c'est un peu fatigant. À l'intérieur, je passe l'aspirateur dans le salon pour aider ma mère à garder la maison propre.",
    keyVocab: [
      { fr: "entretenir", en: "to maintain" },
      { fr: "arroser", en: "to water" },
      { fr: "mauvaise herbe", en: "weed" },
      { fr: "la tondeuse", en: "lawnmower" },
      { fr: "la pelouse", en: "lawn" },
      { fr: "passer l'aspirateur", en: "to vacuum" }
    ],
  },
  {
    id: "hom_28",
    topicKey: "home",
    text: "Quels sont les problèmes de pollution dans ta ville ?",
    hint: "Air quality, noise, litter, or water pollution.",
    difficulty: 3,
    followUps: [
      "Quelle est la cause principale de cette pollution ?",
      "Que fait la mairie pour lutter contre ce problème ?",
      "Est-ce que la situation s'améliore ?"
    ],
    modelAnswer: "Malheureusement, ma ville souffre beaucoup de la pollution de l'air à cause de la circulation automobile intense au centre-ville. Il y a souvent des embouteillages qui rejettent des gaz d'échappement nocifs. Un autre problème est la pollution sonore, surtout la nuit à cause des travaux. Je pense qu'il faudrait limiter le nombre de voitures pour améliorer la qualité de vie.",
    keyVocab: [
      { fr: "souffrir de", en: "to suffer from" },
      { fr: "circulation automobile", en: "road traffic" },
      { fr: "gaz d'échappement", en: "exhaust fumes" },
      { fr: "nocif", en: "harmful" },
      { fr: "pollution sonore", en: "noise pollution" },
      { fr: "investir", en: "to invest" }
    ],
  },
  {
    id: "hom_29",
    topicKey: "home",
    text: "Quels sont les avantages d'habiter en banlieue par rapport au centre-ville ?",
    hint: "Space, noise, safety, cost, access to shops.",
    difficulty: 2,
    followUps: [
      "Où est-ce que tu préférerais habiter quand tu seras adulte ?",
      "Est-ce que les transports sont faciles depuis la banlieue ?",
      "Est-ce que c'est plus sûr pour les familles ?"
    ],
    modelAnswer: "Habiter en banlieue permet d'avoir plus d'espace et souvent un jardin, ce qui est impossible au centre-ville. C'est aussi beaucoup plus calme et moins pollué, donc meilleur pour la santé. En revanche, au centre-ville, tout est à proximité comme les cinémas et les magasins. La banlieue est idéale pour les familles, alors que le centre-ville convient mieux aux jeunes actifs.",
    keyVocab: [
      { fr: "banlieue", en: "suburbs" },
      { fr: "par rapport à", en: "compared to" },
      { fr: "à proximité", en: "nearby" },
      { fr: "convenir à", en: "to suit" },
      { fr: "jeune actif", en: "young professional" },
      { fr: "en revanche", en: "on the other hand" }
    ],
  },
  {
    id: "hom_30",
    topicKey: "home",
    text: "Décris un festival ou un événement local dans ta ville.",
    hint: "Carnival, music festival, market, or fair.",
    difficulty: 2,
    followUps: [
      "À quelle période de l'année cela a-t-il lieu ?",
      "Est-ce que tu y participes chaque année ?",
      "Pourquoi est-ce important pour la communauté ?"
    ],
    modelAnswer: "Chaque année en juillet, il y a un festival de musique traditionnelle sur la place du marché. C'est un événement très joyeux où les gens dansent et portent des costumes typiques. On installe aussi des stands qui vendent des spécialités gastronomiques locales. C'est un moment fort qui renforce les liens entre les habitants et attire beaucoup de touristes chaque été.",
    keyVocab: [
      { fr: "traditionnel", en: "traditional" },
      { fr: "un stand", en: "a stall" },
      { fr: "gastronomique", en: "gastronomic / gourmet" },
      { fr: "renforcer les liens", en: "to strengthen bonds" },
      { fr: "festif", en: "festive" },
      { fr: "régner", en: "to reign / prevail" }
    ],
  },
  {
    id: "hom_31",
    topicKey: "home",
    text: "Qu'est-ce que tu changerais dans ton quartier pour le rendre plus sûr pour les enfants ?",
    hint: "Better lighting, more parks, slower cars, security.",
    difficulty: 3,
    followUps: [
      "Est-ce que tu penses que les enfants sont en sécurité actuellement ?",
      "Y a-t-il assez d'espaces de jeux ?",
      "Quel est le plus grand danger selon toi ?"
    ],
    modelAnswer: "Si je pouvais, j'installerais plus de passages piétons sécurisés et je limiterais la vitesse des voitures à trente kilomètres par heure. Je ferais aussi construire un parc clôturé où les enfants pourraient jouer sans risque. Enfin, je pense qu'il faudrait améliorer l'éclairage public le soir. La sécurité des plus jeunes doit être une priorité absolue pour la municipalité de ma ville.",
    keyVocab: [
      { fr: "passage piéton", en: "pedestrian crossing" },
      { fr: "sécurisé", en: "secured / safe" },
      { fr: "limiter la vitesse", en: "to speed limit" },
      { fr: "clôturé", en: "fenced" },
      { fr: "éclairage public", en: "street lighting" },
      { fr: "municipalité", en: "municipality / town council" }
    ],
  },
  {
    id: "hom_32",
    topicKey: "home",
    text: "Est-ce qu'il est facile de trouver un emploi dans ta ville ?",
    hint: "Industries, local businesses, unemployment, opportunities for young people.",
    difficulty: 3,
    followUps: [
      "Quels secteurs recrutent le plus ?",
      "Est-ce que les jeunes doivent partir ailleurs pour travailler ?",
      "Quel genre de petit boulot peut-on faire l'été ?"
    ],
    modelAnswer: "Dans ma ville, le marché de l'emploi est assez dynamique, surtout dans le secteur des services et du commerce. Grâce au grand centre commercial, il y a beaucoup d'opportunités pour les jeunes qui cherchent un premier travail. Cependant, pour les métiers plus spécialisés, il est parfois nécessaire de se déplacer vers les grandes métropoles. Le chômage reste relativement faible ici.",
    keyVocab: [
      { fr: "le marché de l'emploi", en: "job market" },
      { fr: "recruter", en: "to recruit" },
      { fr: "opportunité", en: "opportunity" },
      { fr: "spécialisé", en: "specialized" },
      { fr: "la métropole", en: "metropolis / city" },
      { fr: "le chômage", en: "unemployment" }
    ],
  },
  {
    id: "hom_33",
    topicKey: "home",
    text: "Décris la rue où tu habites.",
    hint: "Narrow/wide, busy/quiet, trees, neighbors, shops.",
    difficulty: 1,
    followUps: [
      "Ta rue est-elle longue ?",
      "Y a-t-il beaucoup d'arbres ou de fleurs ?",
      "Est-ce que les voitures circulent vite ?"
    ],
    modelAnswer: "J'habite dans une petite impasse très calme, loin de la route principale. La rue est bordée d'arbres et chaque maison a un petit jardinet devant l'entrée. Il n'y a pas de commerces, seulement des habitations, donc c'est très paisible toute la journée. Mes voisins sont sympathiques et on se salue toujours quand on se croise.",
    keyVocab: [
      { fr: "une impasse", en: "dead end / cul-de-sac" },
      { fr: "bordé de", en: "lined with" },
      { fr: "un jardinet", en: "small garden" },
      { fr: "une habitation", en: "dwelling / house" },
      { fr: "paisible", en: "peaceful" },
      { fr: "se saluer", en: "to greet each other" }
    ],
  },
  {
    id: "hom_34",
    topicKey: "home",
    text: "Où vas-tu d'habitude quand tu veux être seul(e) dans ta ville ?",
    hint: "A quiet park, library, café, or a bench somewhere.",
    difficulty: 2,
    followUps: [
      "Qu'est-ce que tu fais là-bas ?",
      "Est-ce que c'est un endroit secret ?",
      "Pourquoi aimes-tu cet endroit ?"
    ],
    modelAnswer: "Quand j'ai besoin de calme, je vais souvent m'asseoir sur un banc dans le vieux parc qui surplombe la rivière. C'est un endroit assez caché que peu de gens connaissent vraiment. J'y vais pour lire un livre ou simplement pour réfléchir en écoutant le bruit de l'eau. Cela m'aide à évacuer le stress et à me sentir plus serein.",
    keyVocab: [
      { fr: "surplomber", en: "to overlook" },
      { fr: "caché", en: "hidden" },
      { fr: "réfléchir", en: "to think / reflect" },
      { fr: "évacuer le stress", en: "to relieve stress" },
      { fr: "serein", en: "serene" },
      { fr: "un refuge", en: "a refuge / haven" }
    ],
  },
  {
    id: "hom_35",
    topicKey: "home",
    text: "Est-ce que tu connais bien tes voisins ?",
    hint: "Talk about your relationship with neighbors — do you say hello, help each other, or are they strangers?",
    difficulty: 1,
    followUps: [
      "Est-ce que tes voisins sont sympathiques ?",
      "Est-ce que tu as déjà aidé un voisin ?",
      "Est-ce qu'il y a beaucoup de bruit à cause de tes voisins ?"
    ],
    modelAnswer: "Oui, je connais assez bien mes voisins. Ils sont très polis et on se dit bonjour tous les matins. Parfois, ils nous apportent des gâteaux ou nous aident à arroser les plantes quand nous sommes en vacances. Je pense que c'est important d'avoir de bonnes relations de voisinage pour se sentir en sécurité.",
    keyVocab: [
      { fr: "poli(e)", en: "polite" },
      { fr: "se dire bonjour", en: "to say hello" },
      { fr: "arroser les plantes", en: "to water the plants" },
      { fr: "s'entraider", en: "to help each other" },
      { fr: "un étranger", en: "a stranger" },
      { fr: "le voisinage", en: "the neighborhood/neighbors" }
    ],
  },
  {
    id: "hom_36",
    topicKey: "home",
    text: "Est-ce que ton quartier est bruyant ou calme ?",
    hint: "Describe the noise levels in your area — traffic, nature, people — and how it affects you.",
    difficulty: 2,
    followUps: [
      "Qu'est-ce qui cause le plus de bruit dans ta rue ?",
      "Tu préfères le silence ou l'animation ?",
      "Est-ce que tu dors bien malgré le bruit ?"
    ],
    modelAnswer: "Mon quartier est généralement très calme car j'habite dans une impasse, loin de la circulation. On entend surtout le chant des oiseaux et le vent dans les arbres, ce que je trouve relaxant. Cependant, le samedi matin, c'est un peu plus bruyant parce que les gens tondent leur pelouse. J'apprécie beaucoup ce silence pour étudier sereinement.",
    keyVocab: [
      { fr: "bruyant(e)", en: "noisy" },
      { fr: "une impasse", en: "a cul-de-sac/dead end" },
      { fr: "la circulation", en: "traffic" },
      { fr: "le chant des oiseaux", en: "birdsong" },
      { fr: "tondre la pelouse", en: "to mow the lawn" },
      { fr: "sereinement", en: "serenely/peacefully" }
    ],
  },
  {
    id: "hom_37",
    topicKey: "home",
    text: "Quels sont les espaces verts près de chez toi ?",
    hint: "Talk about parks, forests, or gardens nearby and what you do there.",
    difficulty: 1,
    followUps: [
      "Est-ce que tu vas souvent au parc ?",
      "Qu'est-ce qu'on peut faire dans ces espaces verts ?",
      "Est-ce qu'il y a assez d'arbres dans ta ville ?"
    ],
    modelAnswer: "Il y a un grand parc public à seulement cinq minutes de ma maison. Il possède une forêt de chênes, un petit lac et beaucoup de sentiers pour se promener. J'y vais souvent le dimanche pour faire du jogging ou pique-niquer avec mes amis. Je pense que ces espaces sont essentiels pour respirer de l'air pur en ville.",
    keyVocab: [
      { fr: "un espace vert", en: "a green space" },
      { fr: "un sentier", en: "a path/trail" },
      { fr: "se promener", en: "to go for a walk" },
      { fr: "respirer", en: "to breathe" },
      { fr: "l'air pur", en: "fresh air" },
      { fr: "un chêne", en: "an oak tree" }
    ],
  },
  {
    id: "hom_38",
    topicKey: "home",
    text: "Est-ce que tu connais l'histoire de ton quartier ou de ta ville ?",
    hint: "Discuss any historical facts, old buildings, or how the area has changed over time.",
    difficulty: 3,
    followUps: [
      "Y a-t-il des monuments historiques importants ?",
      "Comment était la ville il y a cinquante ans ?",
      "Est-ce que tu penses que c'est important de préserver le patrimoine ?"
    ],
    modelAnswer: "Ma ville a une histoire très riche qui remonte à l'époque romaine. On peut encore voir les ruines d'un ancien théâtre dans le centre historique. Autrefois, c'était un petit village de pêcheurs, mais elle s'est beaucoup développée grâce au commerce maritime. Je trouve fascinant de voir comment l'architecture ancienne se mélange aux bâtiments modernes d'aujourd'hui.",
    keyVocab: [
      { fr: "remonter à", en: "to date back to" },
      { fr: "le patrimoine", en: "heritage" },
      { fr: "autrefois", en: "formerly/in the past" },
      { fr: "un pêcheur", en: "a fisherman" },
      { fr: "maritime", en: "maritime/sea-related" },
      { fr: "se mélanger", en: "to mix" }
    ],
  },
  {
    id: "hom_39",
    topicKey: "home",
    text: "Quel est le commerce le plus utile dans ton quartier ?",
    hint: "Identify a local shop (bakery, pharmacy, etc.) and explain why it's important for residents.",
    difficulty: 1,
    followUps: [
      "Est-ce que tu y vas souvent ?",
      "Qu'est-ce que tu y achètes d'habitude ?",
      "Est-ce que les vendeurs sont accueillants ?"
    ],
    modelAnswer: "Pour moi, le commerce le plus utile est la boulangerie au coin de la rue. J'y vais tous les matins pour acheter du pain frais et des croissants pour le petit-déjeuner. C'est un endroit très convivial où tout le monde se retrouve. Sans cette boulangerie, nous devrions prendre la voiture pour aller au supermarché, ce qui serait moins pratique.",
    keyVocab: [
      { fr: "utile", en: "useful" },
      { fr: "au coin de la rue", en: "on the corner" },
      { fr: "le pain frais", en: "fresh bread" },
      { fr: "convivial(e)", en: "friendly/convivial" },
      { fr: "un vendeur", en: "a shop assistant" },
      { fr: "pratique", en: "convenient/practical" }
    ],
  },
  {
    id: "hom_40",
    topicKey: "home",
    text: "Comment est l'aspect de ta ville pendant les différentes saisons ?",
    hint: "Describe how your town looks in winter vs. summer (flowers, snow, lights, atmosphere).",
    difficulty: 2,
    followUps: [
      "Quelle est ta saison préférée dans ta ville ?",
      "Est-ce qu'il y a des décorations spéciales en hiver ?",
      "Qu'est-ce que les gens font différemment en été ?"
    ],
    modelAnswer: "Ma ville change beaucoup selon les saisons. En automne, les feuilles des arbres deviennent rouges et dorées, ce qui est magnifique. En hiver, on installe des illuminations de Noël dans les rues principales, alors qu'en été, les terrasses des cafés sont pleines de monde. Je préfère le printemps car tous les jardins sont en fleurs et l'air sent très bon.",
    keyVocab: [
      { fr: "l'aspect", en: "appearance" },
      { fr: "doré(e)", en: "golden" },
      { fr: "les illuminations", en: "lights/decorations" },
      { fr: "en fleurs", en: "in bloom" },
      { fr: "sentir", en: "to smell" },
      { fr: "selon", en: "according to" }
    ],
  },
  {
    id: "hom_41",
    topicKey: "home",
    text: "Quels animaux peut-on voir dans ton quartier ?",
    hint: "Talk about wildlife (birds, foxes, squirrels) or domestic pets you see around.",
    difficulty: 1,
    followUps: [
      "Est-ce que tu aimes les animaux sauvages ?",
      "Est-ce que tes voisins ont des chiens ?",
      "As-tu déjà vu un animal inhabituel près de chez toi ?"
    ],
    modelAnswer: "On voit souvent des écureuils et beaucoup d'oiseaux différents dans les jardins. Parfois, le soir, on peut même apercevoir un renard qui traverse la route. Beaucoup de mes voisins promènent leurs chiens dans le quartier, ce qui rend l'ambiance très vivante. J'aime beaucoup observer la nature sauvage qui arrive à vivre au milieu des habitations.",
    keyVocab: [
      { fr: "un écureuil", en: "a squirrel" },
      { fr: "un renard", en: "a fox" },
      { fr: "apercevoir", en: "to catch a glimpse of" },
      { fr: "sauvage", en: "wild" },
      { fr: "promener", en: "to walk (an animal)" },
      { fr: "vivant(e)", en: "lively" }
    ],
  },
  {
    id: "hom_42",
    topicKey: "home",
    text: "Quel est l'objet le plus précieux dans ta maison ?",
    hint: "Describe a possession that means a lot to you (an heirloom, a gift, a device) and explain why.",
    difficulty: 3,
    followUps: [
      "Depuis combien de temps as-tu cet objet ?",
      "Où est-ce qu'il se trouve dans ta maison ?",
      "Est-ce que tu l'emporterais si tu devais déménager ?"
    ],
    modelAnswer: "L'objet le plus précieux chez moi est un vieil appareil photo qui appartenait à mon grand-père. Ce n'est pas un objet qui a une grande valeur financière, mais il a une immense valeur sentimentale. Il est posé sur une étagère dans le salon. Cet objet me rappelle les histoires que mon grand-père me racontait sur ses voyages autour du monde.",
    keyVocab: [
      { fr: "précieux / précieuse", en: "precious" },
      { fr: "appartenir à", en: "to belong to" },
      { fr: "une valeur sentimentale", en: "sentimental value" },
      { fr: "une étagère", en: "a shelf" },
      { fr: "rappeler", en: "to remind" },
      { fr: "emporter", en: "to take (with oneself)" }
    ],
  },
  {
    id: "hom_43",
    topicKey: "home",
    text: "Quelles sont les activités possibles en soirée dans ta ville ?",
    hint: "Discuss what people do at night — restaurants, cinemas, clubs, or quiet walks.",
    difficulty: 2,
    followUps: [
      "Est-ce que la ville est animée le soir ?",
      "Qu'est-ce que tu as fait en ville samedi dernier ?",
      "Est-ce que c'est sûr de sortir tard ?"
    ],
    modelAnswer: "En soirée, ma ville est assez animée, surtout dans le centre-ville. On peut aller au cinéma pour voir les derniers films ou dîner dans des restaurants de spécialités étrangères. Pour les jeunes, il y a aussi quelques bowlings et des salles de jeux. Si on préfère le calme, on peut se promener le long de la rivière car les ponts sont magnifiquement éclairés la nuit.",
    keyVocab: [
      { fr: "en soirée", en: "in the evening" },
      { fr: "animé(e)", en: "lively" },
      { fr: "un bowling", en: "a bowling alley" },
      { fr: "éclairé(e)", en: "lit/illuminated" },
      { fr: "la rivière", en: "the river" },
      { fr: "sortir", en: "to go out" }
    ],
  },
  {
    id: "hom_44",
    topicKey: "home",
    text: "Quels sont tes meilleurs souvenirs d'enfance liés à ta maison ?",
    hint: "Reflect on activities or events that happened at home when you were younger.",
    difficulty: 2,
    followUps: [
      "Est-ce que tu habites dans la même maison depuis ta naissance ?",
      "Qu'est-ce qui a changé dans la maison depuis ton enfance ?",
      "Est-ce que tu aimerais que tes enfants grandissent dans une maison similaire ?"
    ],
    modelAnswer: "Mon meilleur souvenir est celui des anniversaires que nous fêtions dans le jardin avec tous mes cousins. On installait une grande tente et on jouait à cache-cache jusqu'à la tombée de la nuit. Je me souviens aussi des hivers où nous lisions des histoires près de la cheminée. Ces moments simples ont rendu ma maison très chaleureuse et pleine de bonheur.",
    keyVocab: [
      { fr: "un souvenir", en: "a memory" },
      { fr: "fêter", en: "to celebrate" },
      { fr: "jouer à cache-cache", en: "to play hide and seek" },
      { fr: "la tombée de la nuit", en: "nightfall" },
      { fr: "la cheminée", en: "fireplace" },
      { fr: "chaleureux / chaleureuse", en: "warm/welcoming" }
    ],
  },
  {
    id: "fut_24",
    topicKey: "future",
    text: "Pourquoi est-il important d'apprendre des langues étrangères pour ta future carrière ?",
    hint: "International travel, communication, competitive advantage.",
    difficulty: 1,
    followUps: [
      "Quelles langues voudrais-tu maîtriser parfaitement ?",
      "Penses-tu que l'anglais suffit aujourd'hui ?",
      "Comment vas-tu utiliser tes langues au travail ?"
    ],
    modelAnswer: "Je crois que parler plusieurs langues est un atout majeur dans le monde du travail actuel. Cela permet de travailler avec des entreprises internationales et de communiquer facilement avec des clients du monde entier. Dans certains métiers comme le tourisme, c'est même indispensable. En apprenant le français, j'espère avoir plus d'opportunités professionnelles à l'avenir.",
    keyVocab: [
      { fr: "un atout majeur", en: "major asset" },
      { fr: "actuel", en: "current / present-day" },
      { fr: "le monde du travail", en: "the world of work" },
      { fr: "international", en: "international" },
      { fr: "indispensable", en: "essential" },
      { fr: "francophone", en: "French-speaking" }
    ],
  },
  {
    id: "fut_25",
    topicKey: "future",
    text: "Préférerais-tu travailler à la maison ou dans un bureau à l'avenir ?",
    hint: "Pros and cons: flexibility, socialization, distraction, concentration.",
    difficulty: 2,
    followUps: [
      "Quels sont les dangers du télétravail ?",
      "Est-ce que l'ambiance de bureau est importante pour toi ?",
      "Pourrais-tu être productif seul chez toi ?"
    ],
    modelAnswer: "Dans l'idéal, j'aimerais avoir un mélange des deux. Le télétravail est génial pour la flexibilité et pour gagner du temps en évitant les transports quotidiens. Cependant, je pense qu'il est essentiel d'aller au bureau pour voir ses collègues et échanger des idées. Le contact humain est important pour garder la motivation et se sentir intégré dans une équipe.",
    keyVocab: [
      { fr: "le télétravail", en: "teleworking / remote work" },
      { fr: "la flexibilité", en: "flexibility" },
      { fr: "gagner du temps", en: "to save time" },
      { fr: "échanger des idées", en: "to exchange ideas" },
      { fr: "intégré", en: "integrated / part of" },
      { fr: "solitaire", en: "lonely" }
    ],
  },
  {
    id: "fut_26",
    topicKey: "future",
    text: "Est-ce que tu aimerais prendre une année sabbatique avant d'aller à l'université ?",
    hint: "Traveling, volunteering, working, maturing.",
    difficulty: 2,
    followUps: [
      "Que ferais-tu pendant cette année ?",
      "Est-ce que tes parents seraient d'accord ?",
      "Quels sont les risques de s'arrêter d'étudier pendant un an ?"
    ],
    modelAnswer: "Oui, j'adorerais prendre une année sabbatique pour voyager et découvrir de nouvelles cultures. J'aimerais faire du bénévolat dans une association humanitaire à l'étranger pour me sentir utile et gagner en maturité. Je pense que cela permet de prendre du recul avant de s'engager dans des études longues. C'est une expérience enrichissante qui aide à mieux se connaître.",
    keyVocab: [
      { fr: "année sabbatique", en: "gap year" },
      { fr: "humanitaire", en: "humanitarian" },
      { fr: "gagner en maturité", en: "to gain in maturity" },
      { fr: "prendre du recul", en: "to gain perspective" },
      { fr: "s'engager", en: "to commit oneself" },
      { fr: "enrichissant", en: "enriching" }
    ],
  },
  {
    id: "fut_27",
    topicKey: "future",
    text: "Est-ce que tu prévois de faire du bénévolat ou du travail caritatif plus tard ?",
    hint: "Helping others, causes you care about (environment, animals, poverty).",
    difficulty: 1,
    followUps: [
      "Quelle cause te tient le plus à cœur ?",
      "Combien de temps pourrais-tu y consacrer ?",
      "Penses-tu que tout le monde devrait aider les autres ?"
    ],
    modelAnswer: "Oui, j'aimerais beaucoup consacrer une partie de mon temps libre à aider les animaux dans un refuge. Je suis très sensible à la protection de la biodiversité et je pense qu'il est important de donner de son temps pour une cause noble. On peut aussi aider les personnes âgées en leur rendant visite. Le bénévolat apporte beaucoup de bonheur à tout le monde.",
    keyVocab: [
      { fr: "prévoir", en: "to plan / foresee" },
      { fr: "caritatif", en: "charitable" },
      { fr: "tenir à cœur", en: "to be close to one's heart" },
      { fr: "consacrer", en: "to devote / dedicate" },
      { fr: "un refuge", en: "a shelter" },
      { fr: "noble", en: "noble" }
    ],
  },
  {
    id: "fut_28",
    topicKey: "future",
    text: "Quel impact les réseaux sociaux auront-ils sur les métiers de demain ?",
    hint: "New careers, digital marketing, the importance of online presence.",
    difficulty: 3,
    followUps: [
      "Aimerais-tu être influenceur ou créateur de contenu ?",
      "Est-ce que c'est un métier stable selon toi ?",
      "Comment les entreprises utilisent-elles ces plateformes ?"
    ],
    modelAnswer: "Les réseaux sociaux transforment complètement le monde du travail en créant de nouveaux métiers comme community manager. Aujourd'hui, avoir une présence numérique est devenu indispensable pour presque toutes les entreprises. À l'avenir, je pense que la communication digitale sera au cœur de chaque carrière. Cependant, il faudra faire attention à protéger sa vie privée et ne pas être trop dépendant.",
    keyVocab: [
      { fr: "transformer", en: "to transform" },
      { fr: "community manager", en: "social media manager" },
      { fr: "présence numérique", en: "digital presence" },
      { fr: "digital", en: "digital" },
      { fr: "vie privée", en: "private life" },
      { fr: "dépendant", en: "dependent" }
    ],
  },
  {
    id: "fut_29",
    topicKey: "future",
    text: "Comment penses-tu que nous mangerons dans le futur ?",
    hint: "Environmental impact of food, synthetic products, local consumption.",
    difficulty: 3,
    followUps: [
      "Serais-tu prêt(e) à manger de la viande synthétique ou des insectes ?",
      "Pourquoi nos habitudes alimentaires doivent-elles changer ?",
      "La nourriture sera-t-elle plus saine ?"
    ],
    modelAnswer: "Je pense que nos habitudes alimentaires vont changer radicalement pour protéger l'environnement. On mangera sans doute moins de viande rouge et plus de protéines végétales ou de la viande produite en laboratoire. Le bio et le local deviendront la norme car transporter de la nourriture n'est plus durable. On utilisera peut-être aussi plus de technologies pour cultiver nos légumes.",
    keyVocab: [
      { fr: "radicalement", en: "radically" },
      { fr: "viande synthétique", en: "synthetic meat" },
      { fr: "protéine végétale", en: "plant protein" },
      { fr: "en laboratoire", en: "in a laboratory" },
      { fr: "la norme", en: "the norm" },
      { fr: "durable", en: "sustainable" }
    ],
  },
  {
    id: "fut_30",
    topicKey: "future",
    text: "Selon toi, quelles sont les compétences les plus importantes pour réussir à l'avenir ?",
    hint: "Adaptability, creativity, technical skills, languages.",
    difficulty: 2,
    followUps: [
      "Est-ce que les diplômes sont plus importants que l'expérience ?",
      "Quelle compétence voudrais-tu apprendre en priorité ?",
      "L'école nous prépare-t-elle bien à la vie active ?"
    ],
    modelAnswer: "À mon avis, l'adaptabilité sera la compétence la plus cruciale car le monde change de plus en plus vite. Il faudra être capable d'apprendre de nouvelles choses tout au long de sa vie. La créativité et la résolution de problèmes complexes seront aussi très demandées par les entreprises. Enfin, savoir bien communiquer et travailler en équipe restera fondamental dans tout domaine professionnel.",
    keyVocab: [
      { fr: "une compétence", en: "a skill" },
      { fr: "adaptabilité", en: "adaptability" },
      { fr: "crucial", en: "crucial" },
      { fr: "résolution de problèmes", en: "problem solving" },
      { fr: "fondamental", en: "fundamental" },
      { fr: "domaine professionnel", en: "professional field" }
    ],
  },
  {
    id: "fut_31",
    topicKey: "future",
    text: "Aimerais-tu habiter dans une maison intelligente à l'avenir ?",
    hint: "Automation, energy saving, security, privacy.",
    difficulty: 1,
    followUps: [
      "Quels seraient les avantages pour l'environnement ?",
      "As-tu peur que la technologie surveille ta vie privée ?",
      "Quel gadget technologique serait le plus utile ?"
    ],
    modelAnswer: "J'aimerais beaucoup habiter dans une maison connectée car cela permettrait d'économiser de l'énergie de façon automatique. Par exemple, le chauffage s'éteindrait quand je quitte une pièce. Cela apporterait aussi plus de sécurité avec des alarmes intelligentes. Cependant, je ne voudrais pas que tout soit contrôlé par ordinateur par peur des pannes ou du piratage informatique.",
    keyVocab: [
      { fr: "maison intelligente", en: "smart home" },
      { fr: "connecté", en: "connected / smart" },
      { fr: "économiser l'énergie", en: "to save energy" },
      { fr: "une panne", en: "a breakdown / failure" },
      { fr: "piratage informatique", en: "hacking" },
      { fr: "une habitation", en: "a dwelling / home" }
    ],
  },
  {
    id: "fut_32",
    topicKey: "future",
    text: "Est-ce que tu penses que l'environnement influencera ton choix de carrière ?",
    hint: "Sustainable energy, ecology, social responsibility.",
    difficulty: 3,
    followUps: [
      "Voudrais-tu travailler dans le secteur des énergies renouvelables ?",
      "Est-ce qu'une entreprise doit être écologique pour que tu y travailles ?",
      "Quels sont les métiers verts de demain ?"
    ],
    modelAnswer: "Absolument, je veux que mon futur travail ait un impact positif sur la planète. Je ne pourrais pas travailler pour une entreprise qui pollue sans remords. J'envisage de m'orienter vers les énergies renouvelables ou la protection de la biodiversité. Je pense que les métiers verts vont se multiplier à l'avenir. C'est une responsabilité que nous avons envers les générations futures.",
    keyVocab: [
      { fr: "influencer", en: "to influence" },
      { fr: "sans remords", en: "remorselessly" },
      { fr: "s'orienter vers", en: "to move towards / specialize in" },
      { fr: "se multiplier", en: "to multiply" },
      { fr: "durable", en: "sustainable" },
      { fr: "envers", en: "towards" }
    ],
  },
  {
    id: "fut_33",
    topicKey: "future",
    text: "Comment imagines-tu l'équilibre entre ton travail et ta vie de famille plus tard ?",
    hint: "Working hours, leisure time, priorities.",
    difficulty: 3,
    followUps: [
      "Travailleras-tu autant que tes parents ?",
      "Est-ce que le temps libre est plus précieux que le succès ?",
      "Comment partageras-tu les responsabilités à la maison ?"
    ],
    modelAnswer: "Pour moi, l'équilibre entre vie professionnelle et vie privée est la clé du bonheur. Je ne veux pas sacrifier ma famille pour ma carrière, même si je suis ambitieux. J'espère que les entreprises proposeront des horaires plus flexibles à l'avenir. Je prévois de partager équitablement toutes les tâches ménagères avec mon partenaire pour avoir du temps libre ensemble.",
    keyVocab: [
      { fr: "l'équilibre", en: "balance" },
      { fr: "vie professionnelle", en: "professional life" },
      { fr: "vie privée", en: "private life" },
      { fr: "sacrifier", en: "to sacrifice" },
      { fr: "ambitieux", en: "ambitious" },
      { fr: "équitablement", en: "fairly / equally" }
    ],
  },
  {
    id: "fut_34",
    topicKey: "future",
    text: "Comment penses-tu que nous nous déplacerons dans le futur ?",
    hint: "Discuss future transportation methods — flying cars, high-speed trains, electric planes.",
    difficulty: 2,
    followUps: [
      "Est-ce que tu aimerais avoir une voiture volante ?",
      "Penses-tu que les voyages en avion seront plus écologiques ?",
      "Est-ce que les voitures autonomes sont une bonne idée ?"
    ],
    modelAnswer: "Je pense que les transports seront beaucoup plus rapides et écologiques à l'avenir. On utilisera probablement des trains à très grande vitesse, comme l'Hyperloop, pour voyager entre les pays. Les voitures seront toutes électriques et autonomes, ce qui réduira les accidents de la route. Peut-être même que les drones transporteront les gens sur de courtes distances en ville pour éviter les bouchons.",
    keyVocab: [
      { fr: "se déplacer", en: "to move/get around" },
      { fr: "volant(e)", en: "flying" },
      { fr: "autonome", en: "autonomous/self-driving" },
      { fr: "réduire", en: "to reduce" },
      { fr: "les bouchons", en: "traffic jams" },
      { fr: "probablement", en: "probably" }
    ],
  },
  {
    id: "fut_35",
    topicKey: "future",
    text: "À quoi ressemblera l'école de l'avenir selon toi ?",
    hint: "Imagine future classrooms — technology, subjects, or if schools will even exist physically.",
    difficulty: 2,
    followUps: [
      "Est-ce que les professeurs seront remplacés par des robots ?",
      "Aimerais-tu étudier depuis chez toi avec la réalité virtuelle ?",
      "Quelles nouvelles matières apprendra-t-on ?"
    ],
    modelAnswer: "L'école de l'avenir sera très différente grâce à la technologie. On utilisera la réalité virtuelle pour visiter des lieux historiques ou explorer l'espace sans quitter la classe. Les élèves auront peut-être des tuteurs personnalisés basés sur l'intelligence artificielle pour les aider à progresser. Cependant, je crois que le contact humain avec les professeurs restera essentiel pour apprendre à vivre ensemble.",
    keyVocab: [
      { fr: "ressembler à", en: "to look like" },
      { fr: "la réalité virtuelle", en: "virtual reality" },
      { fr: "remplacer", en: "to replace" },
      { fr: "un tuteur / une tutrice", en: "a tutor" },
      { fr: "progresser", en: "to progress/improve" },
      { fr: "quitter", en: "to leave" }
    ],
  },
  {
    id: "fut_36",
    topicKey: "future",
    text: "Aimerais-tu faire du tourisme spatial un jour ?",
    hint: "Discuss the possibility of visiting the Moon or Mars as a tourist.",
    difficulty: 3,
    followUps: [
      "Penses-tu que ce sera abordable pour tout le monde ?",
      "Quels seraient les dangers d'un voyage dans l'espace ?",
      "Est-ce que tu préférerais visiter une autre planète ou rester sur Terre ?"
    ],
    modelAnswer: "L'idée de voyager dans l'espace me fascine énormément. J'adorerais voir la Terre depuis la Lune et ressentir l'absence de gravité. Cependant, je pense que ce genre de tourisme sera réservé aux gens très riches pendant longtemps. C'est aussi un défi technologique risqué car le corps humain n'est pas habitué aux conditions spatiales. Malgré cela, c'est une aventure incroyable que je ne refuserais pas.",
    keyVocab: [
      { fr: "le tourisme spatial", en: "space tourism" },
      { fr: "abordable", en: "affordable" },
      { fr: "la gravité", en: "gravity" },
      { fr: "un défi", en: "a challenge" },
      { fr: "risqué", en: "risky" },
      { fr: "s'habituer à", en: "to get used to" }
    ],
  },
  {
    id: "fut_37",
    topicKey: "future",
    text: "Penses-tu que les livres papier vont disparaître dans le futur ?",
    hint: "Compare digital reading with traditional books and predict which will survive.",
    difficulty: 2,
    followUps: [
      "Préfères-tu lire sur une tablette ou un livre physique ?",
      "Quels sont les avantages des livres numériques ?",
      "Est-ce que les bibliothèques existeront encore dans 50 ans ?"
    ],
    modelAnswer: "Je ne pense pas que les livres papier disparaîtront complètement. Même si les liseuses numériques sont pratiques pour voyager, beaucoup de gens aiment encore l'odeur du papier et la sensation de tourner les pages. Les livres physiques sont aussi des objets de décoration qu'on aime garder chez soi. À mon avis, les deux formats continueront de coexister car ils offrent des expériences de lecture différentes.",
    keyVocab: [
      { fr: "disparaître", en: "to disappear" },
      { fr: "une liseuse", en: "an e-reader" },
      { fr: "pratique", en: "convenient" },
      { fr: "la sensation", en: "sensation/feeling" },
      { fr: "garder", en: "to keep" },
      { fr: "coexister", en: "to coexist" }
    ],
  },
  {
    id: "fut_38",
    topicKey: "future",
    text: "Est-ce que tu aimerais avoir un robot comme compagnon à la maison ?",
    hint: "Talk about robots helping with daily life or providing company.",
    difficulty: 1,
    followUps: [
      "Quelles tâches est-ce que le robot pourrait faire pour toi ?",
      "Est-ce qu'un robot peut être un véritable ami ?",
      "Est-ce que les robots te font peur ?"
    ],
    modelAnswer: "Oui, j'aimerais bien avoir un petit robot pour m'aider avec les tâches ennuyeuses comme ranger ma chambre ou préparer mon sac. Ce serait aussi amusant de pouvoir discuter avec lui et de lui poser des questions. Cependant, je ne pense pas qu'un robot puisse remplacer un vrai ami car il n'a pas de sentiments réels. Ce serait juste un outil technologique très perfectionné et utile au quotidien.",
    keyVocab: [
      { fr: "un compagnon", en: "a companion" },
      { fr: "ennuyeux / ennuyeuse", en: "boring" },
      { fr: "un sentiment", en: "a feeling/emotion" },
      { fr: "perfectionné(e)", en: "advanced/sophisticated" },
      { fr: "un outil", en: "a tool" },
      { fr: "ranger", en: "to tidy up" }
    ],
  },
  {
    id: "fut_39",
    topicKey: "future",
    text: "Quels seront les nouveaux loisirs des jeunes dans 50 ans ?",
    hint: "Predict future hobbies — eSports, virtual reality games, or new sports.",
    difficulty: 1,
    followUps: [
      "Est-ce que les sports traditionnels comme le foot existeront encore ?",
      "Penses-tu que les jeunes sortiront moins de chez eux ?",
      "Quel nouveau jeu aimerais-tu inventer ?"
    ],
    modelAnswer: "Je pense que les loisirs seront de plus en plus numériques. Les jeunes passeront beaucoup de temps dans des mondes virtuels pour jouer ou rencontrer des amis. Il y aura peut-être des sports extrêmes avec des jet-packs ou des compétitions de jeux vidéo encore plus populaires qu'aujourd'hui. Mais j'espère que les gens continueront aussi à faire des activités en plein air pour rester en contact avec la nature.",
    keyVocab: [
      { fr: "un loisir", en: "a hobby/pastime" },
      { fr: "numérique", en: "digital" },
      { fr: "virtuel(le)", en: "virtual" },
      { fr: "une compétition", en: "a competition" },
      { fr: "populaire", en: "popular" },
      { fr: "en plein air", en: "outdoors" }
    ],
  },
  {
    id: "fut_40",
    topicKey: "future",
    text: "Comment la médecine va-t-elle changer notre vie à l'avenir ?",
    hint: "Discuss medical advances — living longer, curing diseases, nanotechnology.",
    difficulty: 3,
    followUps: [
      "Est-ce que tu aimerais vivre jusqu'à 150 ans ?",
      "Penses-tu que nous pourrons soigner toutes les maladies ?",
      "Est-ce que la technologie peut améliorer notre santé mentale ?"
    ],
    modelAnswer: "La médecine du futur sera incroyable grâce aux progrès de la génétique et de la nanotechnologie. On pourra probablement détecter les maladies très tôt et les soigner avec des traitements personnalisés. L'espérance de vie va sans doute augmenter, et on pourra peut-être remplacer des organes malades par des organes imprimés en 3D. Cela changera notre façon de voir la vieillesse et la santé en général.",
    keyVocab: [
      { fr: "soigner", en: "to treat/cure" },
      { fr: "une maladie", en: "a disease/illness" },
      { fr: "l'espérance de vie", en: "life expectancy" },
      { fr: "un organe", en: "an organ" },
      { fr: "augmenter", en: "to increase" },
      { fr: "la vieillesse", en: "old age" }
    ],
  },
  {
    id: "fut_41",
    topicKey: "future",
    text: "À quoi ressembleront nos vêtements dans le futur ?",
    hint: "Imagine smart clothing — self-cleaning, temperature-controlled, or eco-friendly materials.",
    difficulty: 2,
    followUps: [
      "Est-ce que les vêtements seront plus écologiques ?",
      "Aimerais-tu porter des vêtements qui changent de couleur ?",
      "Penses-tu que la mode sera la même pour tout le monde ?"
    ],
    modelAnswer: "Les vêtements du futur seront très technologiques et intelligents. Ils pourront changer de température selon le temps qu'il fait ou même changer de couleur selon notre humeur. On utilisera aussi des matières plus durables, comme des tissus fabriqués à partir de plantes ou de matériaux recyclés. La mode sera peut-être moins jetable qu'aujourd'hui, car les vêtements seront plus solides et multifonctions.",
    keyVocab: [
      { fr: "un vêtement", en: "a piece of clothing" },
      { fr: "intelligent(e)", en: "smart/intelligent" },
      { fr: "la température", en: "temperature" },
      { fr: "l'humeur", en: "mood" },
      { fr: "durable", en: "sustainable" },
      { fr: "jetable", en: "disposable" }
    ],
  },
  {
    id: "fut_42",
    topicKey: "future",
    text: "Comment ferons-nous nos courses dans le futur ?",
    hint: "Discuss the future of shopping — drones, no physical stores, virtual fitting rooms.",
    difficulty: 2,
    followUps: [
      "Est-ce que les magasins physiques vont disparaître ?",
      "Penses-tu que les drones livreront tous nos colis ?",
      "Est-ce que faire du shopping sera encore une activité sociale ?"
    ],
    modelAnswer: "À mon avis, faire les courses sera beaucoup plus automatisé. On n'ira plus au supermarché car tout sera livré à domicile par des robots ou des drones en quelques minutes. On utilisera la réalité augmentée pour essayer des vêtements virtuellement devant son miroir. Cependant, je pense que les petits commerces de quartier resteront importants pour garder un lien social et acheter des produits artisanaux de qualité.",
    keyVocab: [
      { fr: "faire les courses", en: "to go shopping (groceries)" },
      { fr: "automatisé(e)", en: "automated" },
      { fr: "livrer", en: "to deliver" },
      { fr: "à domicile", en: "to one's home" },
      { fr: "un colis", en: "a parcel/package" },
      { fr: "virtuellement", en: "virtually" }
    ],
  },
  {
    id: "fut_43",
    topicKey: "future",
    text: "Quel sera le rôle de l'art et de la musique dans le futur ?",
    hint: "Discuss AI-generated art, virtual concerts, and if human creativity will still be valued.",
    difficulty: 3,
    followUps: [
      "Est-ce que l'intelligence artificielle peut être créative ?",
      "Aimerais-tu assister à un concert en hologramme ?",
      "L'art humain sera-t-il plus précieux que l'art technologique ?"
    ],
    modelAnswer: "L'art et la musique vont beaucoup évoluer avec l'intelligence artificielle. On pourra créer des œuvres magnifiques en collaborant avec des ordinateurs, et les concerts se passeront peut-être dans des mondes virtuels avec des hologrammes d'artistes. Pourtant, je crois que la créativité humaine restera irremplaçable car elle exprime des émotions réelles et une expérience de vie unique. L'art fait par les humains aura probablement une valeur encore plus grande.",
    keyVocab: [
      { fr: "une œuvre", en: "a work (of art)" },
      { fr: "évoluer", en: "to evolve" },
      { fr: "un hologramme", en: "a hologram" },
      { fr: "irremplaçable", en: "irreplaceable" },
      { fr: "la créativité", en: "creativity" },
      { fr: "exprimer", en: "to express" }
    ],
  },
  {
    id: "foo_25",
    topicKey: "food",
    text: "Où préfères-tu faire les courses alimentaires et pourquoi ?",
    hint: "Compare supermarkets and local markets for food shopping.",
    difficulty: 2,
    followUps: [
      "Est-ce que les marchés sont plus chers que les supermarchés ?",
      "Qu'est-ce qu'on peut acheter au marché qu'on ne trouve pas ailleurs ?",
      "Tu aimes faire les courses avec tes parents ?"
    ],
    modelAnswer: "Je préfère faire les courses au marché local car les produits sont plus frais et souvent de meilleure qualité que ceux du supermarché. C'est aussi une ambiance plus agréable où on peut discuter avec les producteurs. Cependant, le supermarché est plus pratique car on y trouve tout au même endroit et c'est ouvert plus tard.",
    keyVocab: [
      { fr: "faire les courses", en: "to go food shopping" },
      { fr: "le producteur", en: "producer / farmer" },
      { fr: "frais / fraîche", en: "fresh" },
      { fr: "agréable", en: "pleasant" },
      { fr: "pratique", en: "practical / convenient" },
      { fr: "au même endroit", en: "in the same place" }
    ]
  },
  {
    id: "foo_26",
    topicKey: "food",
    text: "Quelle est ta boisson préférée et quand la bois-tu ?",
    hint: "Talk about your favorite non-alcoholic drink and when you enjoy it.",
    difficulty: 1,
    followUps: [
      "Est-ce que tu bois beaucoup de boissons sucrées ?",
      "Tu préfères les boissons chaudes ou froides ?",
      "Qu'est-ce que tu bois quand tu fais du sport ?"
    ],
    modelAnswer: "Ma boisson préférée est le jus de pomme frais. J'aime son goût sucré et rafraîchissant, surtout quand il fait chaud en été. Parfois, je bois aussi du thé glacé maison avec un peu de menthe. Je trouve que c'est bien meilleur pour la santé que les sodas qui contiennent trop de sucre.",
    keyVocab: [
      { fr: "le jus de pomme", en: "apple juice" },
      { fr: "rafraîchissant", en: "refreshing" },
      { fr: "le thé glacé", en: "iced tea" },
      { fr: "la menthe", en: "mint" },
      { fr: "le soda", en: "fizzy drink / soda" },
      { fr: "contenir", en: "to contain" }
    ]
  },
  {
    id: "foo_27",
    topicKey: "food",
    text: "Quels plats spéciaux prépares-tu pour les fêtes comme Noël ou l'Aïd ?",
    hint: "Discuss traditional or festive meals in your culture or family.",
    difficulty: 2,
    followUps: [
      "Quelle est ta fête préférée pour la nourriture ?",
      "Qui cuisine les repas de fête dans ta famille ?",
      "Est-ce que tu aides à préparer la table pour les invités ?"
    ],
    modelAnswer: "Pour les fêtes, nous préparons souvent des plats traditionnels comme une dinde rôtie ou des pâtisseries orientales. Toute la famille se réunit pour partager un grand buffet avec beaucoup de saveurs différentes. C'est un moment très joyeux et la nourriture joue un rôle central dans nos célébrations. J'adore aider ma mère à décorer les gâteaux avant l'arrivée des invités.",
    keyVocab: [
      { fr: "les fêtes", en: "festivals / celebrations" },
      { fr: "traditionnel(le)", en: "traditional" },
      { fr: "se réunir", en: "to gather / meet up" },
      { fr: "le buffet", en: "buffet" },
      { fr: "une saveur", en: "a flavor" },
      { fr: "un invité", en: "a guest" }
    ]
  },
  {
    id: "foo_28",
    topicKey: "food",
    text: "Que penses-tu de la cuisine de rue (le street food) et des food trucks ?",
    hint: "Give your opinion on street food — variety, speed, and quality.",
    difficulty: 2,
    followUps: [
      "As-tu déjà mangé dans un food truck ?",
      "Quels types de street food sont populaires dans ta ville ?",
      "Penses-tu que c'est moins sain que la cuisine traditionnelle ?"
    ],
    modelAnswer: "Je trouve que la cuisine de rue est une excellente façon de goûter des plats variés et originaux sans dépenser beaucoup d'argent. Les food trucks proposent souvent des concepts innovants comme des tacos fusion ou des burgers gourmets. C'est très pratique quand on veut manger rapidement en ville. Cependant, il faut faire attention à l'hygiène et ne pas en manger trop souvent car cela peut être un peu gras.",
    keyVocab: [
      { fr: "la cuisine de rue", en: "street food" },
      { fr: "varié(e)", en: "varied" },
      { fr: "innovant(e)", en: "innovative" },
      { fr: "gourmet", en: "gourmet" },
      { fr: "l'hygiène", en: "hygiene" },
      { fr: "gras", en: "fatty / oily" }
    ]
  },
  {
    id: "foo_29",
    topicKey: "food",
    text: "Y a-t-il un plat que tu adorais quand tu étais petit et que tu aimes toujours ?",
    hint: "Talk about a childhood favorite dish that you still enjoy today.",
    difficulty: 1,
    followUps: [
      "Qui cuisinait ce plat pour toi ?",
      "Est-ce que c'est un plat sucré ou salé ?",
      "Sais-tu le cuisiner toi-même maintenant ?"
    ],
    modelAnswer: "Quand j'étais petit, j'adorer les pâtes à la sauce tomate que mon père préparait le mercredi. C'est un plat très simple mais il me rappelle de bons souvenirs d'enfance. Aujourd'hui, j'aime toujours autant ça, surtout avec beaucoup de fromage râpé. C'est ma nourriture de réconfort préférée quand je suis fatigué après l'école.",
    keyVocab: [
      { fr: "quand j'étais petit", en: "when I was little" },
      { fr: "un souvenir d'enfance", en: "a childhood memory" },
      { fr: "toujours autant", en: "just as much" },
      { fr: "le fromage râpé", en: "grated cheese" },
      { fr: "la nourriture de réconfort", en: "comfort food" },
      { fr: "se rappeler", en: "to remember" }
    ]
  },
  {
    id: "foo_30",
    topicKey: "food",
    text: "Quel est ton ingrédient ou ton épice préférée en cuisine ?",
    hint: "Identify one specific ingredient you love using when you cook.",
    difficulty: 1,
    followUps: [
      "Dans quels plats utilises-tu cet ingrédient ?",
      "Tu préfères les plats épicés ou doux ?",
      "Est-ce que tu aimes découvrir de nouvelles saveurs ?"
    ],
    modelAnswer: "Mon ingrédient préféré est l'ail car je trouve qu'il donne énormément de goût à n'importe quel plat. J'en utilise presque partout : dans les pâtes, avec les légumes et même dans les marinades pour le poulet. J'aime aussi beaucoup la cannelle pour les desserts car elle a une odeur délicieuse. Je pense que les épices sont le secret d'une cuisine réussie et savoureuse.",
    keyVocab: [
      { fr: "un ingrédient", en: "an ingredient" },
      { fr: "l'ail", en: "garlic" },
      { fr: "la cannelle", en: "cinnamon" },
      { fr: "une marinade", en: "a marinade" },
      { fr: "savoureux / savoureuse", en: "tasty / flavourful" },
      { fr: "réussi(e)", en: "successful / well-done" }
    ]
  },
  {
    id: "foo_31",
    topicKey: "food",
    text: "Que penses-tu du futur de la nourriture, comme la viande cultivée en laboratoire ?",
    hint: "Discuss modern food technology and its ethical or environmental benefits.",
    difficulty: 3,
    followUps: [
      "Serais-tu prêt à goûter de la viande de laboratoire ?",
      "Penses-tu que manger des insectes est une bonne solution pour la planète ?",
      "Comment l'alimentation va-t-elle changer dans 50 ans ?"
    ],
    modelAnswer: "Je pense que la viande cultivée en laboratoire est une invention fascinante qui pourrait réduire la souffrance animale et l'impact écologique de l'élevage. C'est une solution durable pour nourrir une population mondiale croissante sans détruire la planète. Cependant, beaucoup de gens ont peur de ces nouvelles technologies et préfèrent la nourriture naturelle. À mon avis, nous devrons tous adapter nos habitudes alimentaires à l'avenir pour survivre.",
    keyVocab: [
      { fr: "cultivé en laboratoire", en: "lab-grown" },
      { fr: "la souffrance animale", en: "animal suffering" },
      { fr: "l'élevage", en: "farming / livestock breeding" },
      { fr: "croissant(e)", en: "growing" },
      { fr: "survivre", en: "to survive" },
      { fr: "adapter", en: "to adapt" }
    ]
  },
  {
    id: "foo_32",
    topicKey: "food",
    text: "Est-ce que tu aimes inviter des amis à dîner chez toi ? Qu'est-ce que tu prépares ?",
    hint: "Talk about hosting friends and what you like to cook for them.",
    difficulty: 2,
    followUps: [
      "Préfères-tu cuisiner seul ou avec tes amis ?",
      "Quelle ambiance aimes-tu créer pour un dîner ?",
      "Est-ce que tu préfères être l'invité ou celui qui reçoit ?"
    ],
    modelAnswer: "J'adore inviter mes amis car c'est un moment très convivial et chaleureux. D'habitude, je prépare quelque chose de simple comme des pizzas maison ou un grand plat de pâtes pour que tout le monde soit content. On met de la musique et on discute pendant des heures. Je pense que partager un repas est le meilleur moyen de renforcer une amitié et de passer une bonne soirée.",
    keyVocab: [
      { fr: "inviter", en: "to invite" },
      { fr: "chaleureux / chaleureuse", en: "warm / cozy" },
      { fr: "convivial", en: "sociable / friendly" },
      { fr: "partager un repas", en: "to share a meal" },
      { fr: "renforcer", en: "to strengthen" },
      { fr: "celui qui reçoit", en: "the host" }
    ]
  },
  {
    id: "foo_33",
    topicKey: "food",
    text: "Pourquoi est-il important de manger des produits de saison ?",
    hint: "Discuss the benefits of eating fruits and vegetables that are currently in season.",
    difficulty: 2,
    followUps: [
      "Quels sont tes fruits préférés en été et en hiver ?",
      "Est-ce que les produits de saison ont meilleur goût ?",
      "C'est plus écologique de manger de saison ?"
    ],
    modelAnswer: "Il est important de manger de saison car les produits ont beaucoup plus de goût et contiennent plus de vitamines. C'est aussi bien meilleur pour l'environnement car on évite les transports lointains en avion ou en camion. En plus, les fruits et légumes de saison sont souvent moins chers au marché. Je crois que respecter le rythme de la nature est essentiel pour une alimentation saine et responsable.",
    keyVocab: [
      { fr: "de saison", en: "seasonal / in season" },
      { fr: "lointain(e)", en: "distant" },
      { fr: "le rythme", en: "rhythm / pace" },
      { fr: "respecter", en: "to respect" },
      { fr: "les vitamines", en: "vitamins" },
      { fr: "essentiel", en: "essential" }
    ]
  },
  {
    id: "foo_34",
    topicKey: "food",
    text: "Préfères-tu acheter des produits locaux ou des produits importés ?",
    hint: "Discuss your preference for local food vs. food from other countries.",
    difficulty: 3,
    followUps: [
      "Quels sont les avantages des produits locaux ?",
      "Y a-t-il des produits importés que tu ne pourrais pas arrêter de manger ?",
      "Le prix influence-t-il ton choix ?"
    ],
    modelAnswer: "Je préfère nettement acheter local pour soutenir les agriculteurs de ma région et réduire mon empreinte carbone. Les produits n'ont pas voyagé des milliers de kilomètres, donc ils sont plus frais. Cependant, je reconnais que j'achète aussi des produits importés comme les bananes ou le café car on ne peut pas les produire ici. À mon avis, il faut trouver un équilibre et privilégier le local dès que c'est possible.",
    keyVocab: [
      { fr: "local / locaux", en: "local" },
      { fr: "importé(e)", en: "imported" },
      { fr: "l'agriculteur", en: "farmer" },
      { fr: "l'empreinte carbone", en: "carbon footprint" },
      { fr: "privilégier", en: "to prioritize / favor" },
      { fr: "influencer", en: "to influence" }
    ]
  },
  {
    id: "foo_35",
    topicKey: "food",
    text: "Que penses-tu des applications de livraison de nourriture comme UberEats ?",
    hint: "Discuss the convenience versus the cost and health impact of delivery apps.",
    difficulty: 2,
    followUps: [
      "Est-ce que tu les utilises souvent ?",
      "Quels sont les avantages pour les gens pressés ?",
      "Penses-tu que cela encourage de mauvaises habitudes ?"
    ],
    modelAnswer: "Je pense que les applications de livraison sont très pratiques, surtout quand on n'a pas le temps de cuisiner après une longue journée. C'est génial d'avoir autant de choix de restaurants à portée de main. Cependant, cela peut devenir très cher à cause des frais de livraison et c'est souvent moins sain que de préparer un repas à la maison.",
    keyVocab: [
      { fr: "la livraison", en: "delivery" },
      { fr: "à portée de main", en: "at one's fingertips" },
      { fr: "les frais", en: "fees / costs" },
      { fr: "commander", en: "to order" },
      { fr: "pressé(e)", en: "in a hurry" },
      { fr: "gagner du temps", en: "to save time" }
    ],
  },
  {
    id: "foo_36",
    topicKey: "food",
    text: "Est-ce que tu aimes la nourriture épicée ? Pourquoi ?",
    hint: "Talk about your tolerance for spicy food and any specific dishes you like.",
    difficulty: 1,
    followUps: [
      "Quelle est la chose la plus épicée que tu as mangée ?",
      "Est-ce que la cuisine de ton pays est épicée ?",
      "Quels ingrédients rendent un plat piquant ?"
    ],
    modelAnswer: "J'adore la nourriture épicée car je trouve que cela donne beaucoup de saveur aux plats. Mon plat préféré est le curry indien très piquant. Au début, c'est un peu fort, mais on s'habitue vite. Par contre, ma sœur déteste ça car elle trouve que ça brûle la bouche !",
    keyVocab: [
      { fr: "épicé(e)", en: "spicy" },
      { fr: "piquant(e)", en: "hot / spicy" },
      { fr: "la saveur", en: "flavour" },
      { fr: "s'habituer", en: "to get used to" },
      { fr: "brûler", en: "to burn" },
      { fr: "relever un plat", en: "to spice up a dish" }
    ],
  },
  {
    id: "foo_37",
    topicKey: "food",
    text: "Est-ce que tu aimes faire des pique-niques ? Où vas-tu d'habitude ?",
    hint: "Describe an outdoor eating experience, the food you take, and the location.",
    difficulty: 1,
    followUps: [
      "Qu'est-ce que tu mets dans ton panier de pique-nique ?",
      "Tu préfères pique-niquer à la plage ou au parc ?",
      "Quel temps fait-il d'habitude quand tu y vas ?"
    ],
    modelAnswer: "J'adore pique-niquer en été avec mes amis au parc local. On apporte souvent des baguettes, du fromage, des fruits et des boissons fraîches. C'est très relaxant d'être en plein air et de profiter du soleil tout en mangeant. Parfois, on joue au frisbee après le repas.",
    keyVocab: [
      { fr: "un panier", en: "a basket" },
      { fr: "en plein air", en: "outdoors" },
      { fr: "profiter de", en: "to enjoy" },
      { fr: "la nappe", en: "tablecloth" },
      { fr: "se détendre", en: "to relax" },
      { fr: "frais / fraîche", en: "cool / fresh" }
    ],
  },
  {
    id: "foo_38",
    topicKey: "food",
    text: "Est-ce que tu cuisines souvent avec tes parents ou tes grands-parents ?",
    hint: "Discuss learning to cook from family members and sharing traditional recipes.",
    difficulty: 2,
    followUps: [
      "Quelle recette t'ont-ils apprise ?",
      "Est-ce un moment important pour toi ?",
      "Qui est le meilleur cuisinier dans ta famille ?"
    ],
    modelAnswer: "Je cuisine souvent le dimanche avec ma grand-mère. Elle m'apprend à préparer des recettes traditionnelles qui se transmettent de génération en génération. C'est un moment privilégié où on discute beaucoup. Récemment, nous avons fait une tarte aux pommes délicieuse selon sa recette secrète.",
    keyVocab: [
      { fr: "transmettre", en: "to pass on" },
      { fr: "une recette", en: "a recipe" },
      { fr: "privilégié(e)", en: "special / privileged" },
      { fr: "apprendre à", en: "to learn to" },
      { fr: "de génération en génération", en: "from generation to generation" },
      { fr: "le goût", en: "taste" }
    ],
  },
  {
    id: "foo_39",
    topicKey: "food",
    text: "Penses-tu qu'il y a trop de sucre et de sel dans notre alimentation ?",
    hint: "Discuss the health risks of processed foods and hidden additives.",
    difficulty: 3,
    followUps: [
      "Quels sont les dangers pour la santé ?",
      "Est-ce que tu regardes les étiquettes sur les produits ?",
      "Comment peut-on réduire notre consommation de sel ?"
    ],
    modelAnswer: "À mon avis, l'industrie alimentaire ajoute beaucoup trop de sucre et de sel dans les plats préparés pour améliorer le goût. C'est dangereux car cela peut causer de l'obésité ou des problèmes cardiaques. J'essaie de cuisiner avec des produits frais et d'utiliser des herbes aromatiques à la place du sel pour rester en bonne santé.",
    keyVocab: [
      { fr: "l'alimentation", en: "diet / nutrition" },
      { fr: "les plats préparés", en: "ready meals" },
      { fr: "une étiquette", en: "a label" },
      { fr: "cardiaque", en: "cardiac / heart-related" },
      { fr: "les herbes aromatiques", en: "herbs" },
      { fr: "la santé", en: "health" }
    ],
  },
  {
    id: "foo_40",
    topicKey: "food",
    text: "Connais-tu quelqu'un qui a des allergies alimentaires ? Comment font-ils ?",
    hint: "Talk about food intolerances or allergies and how they affect daily life.",
    difficulty: 2,
    followUps: [
      "Es-tu allergique à quelque chose ?",
      "Est-ce difficile de manger au restaurant avec une allergie ?",
      "Quelles sont les allergies les plus communes ?"
    ],
    modelAnswer: "Mon meilleur ami est allergique aux noix, donc il doit faire très attention quand nous sortons manger. Il demande toujours la liste des ingrédients au serveur pour éviter tout risque. À l'école, la cantine propose des repas spéciaux pour les élèves qui ont des allergies, ce qui est très rassurant.",
    keyVocab: [
      { fr: "une allergie", en: "an allergy" },
      { fr: "les noix", en: "nuts" },
      { fr: "faire attention", en: "to be careful" },
      { fr: "le serveur", en: "waiter" },
      { fr: "éviter", en: "to avoid" },
      { fr: "rassurant(e)", en: "reassuring" }
    ],
  },
  {
    id: "foo_41",
    topicKey: "food",
    text: "Aimes-tu les fruits exotiques ? Lesquels ?",
    hint: "Discuss fruits that aren't native to your area and their availability.",
    difficulty: 1,
    followUps: [
      "Quel est le fruit le plus bizarre que tu as goûté ?",
      "Est-ce que les fruits exotiques sont chers dans ton pays ?",
      "Préfères-tu les fruits locaux ou importés ?"
    ],
    modelAnswer: "J'adore les fruits exotiques, surtout la mangue et l'ananas. Je trouve qu'ils ont un goût beaucoup plus sucré et intense que les pommes ou les poires. Cependant, je sais qu'ils sont souvent importés par avion, ce qui n'est pas très bon pour l'environnement. J'essaie donc d'en manger seulement pour les occasions spéciales.",
    keyVocab: [
      { fr: "exotique", en: "exotic" },
      { fr: "la mangue", en: "mango" },
      { fr: "l'ananas", en: "pineapple" },
      { fr: "importé(e)", en: "imported" },
      { fr: "intense", en: "intense" },
      { fr: "le transport", en: "transport" }
    ],
  },
  {
    id: "foo_42",
    topicKey: "food",
    text: "Décris un plat traditionnel de ton pays à un étranger.",
    hint: "Explain the ingredients and preparation of a culturally significant dish.",
    difficulty: 2,
    followUps: [
      "À quelle occasion mange-t-on ce plat ?",
      "Est-ce difficile à préparer ?",
      "Est-ce que tout le monde aime ce plat dans ton pays ?"
    ],
    modelAnswer: "Un plat typique de chez moi est le 'Roast Dinner'. C'est de la viande rôtie servie avec des pommes de terre au four, des légumes et une sauce épaisse appelée 'gravy'. On le mange traditionnellement le dimanche en famille. C'est un repas très copieux et réconfortant, surtout en hiver quand il fait froid dehors.",
    keyVocab: [
      { fr: "typique", en: "typical" },
      { fr: "rôti(e)", en: "roast" },
      { fr: "copieux / copieuse", en: "hearty / filling" },
      { fr: "réconfortant(e)", en: "comforting" },
      { fr: "la viande", en: "meat" },
      { fr: "épais / épaisse", en: "thick" }
    ],
  },
  {
    id: "foo_43",
    topicKey: "food",
    text: "Qu'est-ce que tu mangerais pour un petit-déjeuner de fête ?",
    hint: "Describe a special morning meal for a birthday or holiday.",
    difficulty: 1,
    followUps: [
      "Qui préparerait ce repas ?",
      "Préfères-tu le sucré ou le salé le matin ?",
      "Qu'est-ce que tu boirais ?"
    ],
    modelAnswer: "Pour mon anniversaire, j'adorerais manger des pancakes avec du sirop d'érable et des fruits rouges. Je boirais aussi un grand chocolat chaud avec de la crème chantilly. C'est beaucoup plus gourmand que mes céréales habituelles ! D'habitude, c'est mon père qui prépare ce petit-déjeuner spécial pour toute la famille.",
    keyVocab: [
      { fr: "le sirop d'érable", en: "maple syrup" },
      { fr: "les fruits rouges", en: "berries" },
      { fr: "gourmand(e)", en: "delicious / sweet-toothed" },
      { fr: "la crème chantilly", en: "whipped cream" },
      { fr: "habituel(le)", en: "usual" },
      { fr: "fêter", en: "to celebrate" }
    ],
  },
  {
    id: "foo_44",
    topicKey: "food",
    text: "Penses-tu que la sécurité dans la cuisine est importante ?",
    hint: "Discuss hygiene and safety measures when preparing food.",
    difficulty: 2,
    followUps: [
      "Quelles sont les règles de base dans la cuisine ?",
      "As-tu déjà eu un petit accident en cuisinant ?",
      "Pourquoi faut-il se laver les mains avant de toucher la nourriture ?"
    ],
    modelAnswer: "La sécurité est primordiale en cuisine pour éviter les accidents et les intoxications alimentaires. Il faut toujours se laver les mains et faire attention avec les couteaux bien aiguisés. De plus, il est important de bien nettoyer les surfaces après avoir préparé de la viande crue. C'est une question d'hygiène fondamentale pour rester en bonne santé.",
    keyVocab: [
      { fr: "la sécurité", en: "safety" },
      { fr: "une intoxication alimentaire", en: "food poisoning" },
      { fr: "aiguisé(e)", en: "sharp" },
      { fr: "cru(e)", en: "raw" },
      { fr: "l'hygiène", en: "hygiene" },
      { fr: "fondamental(e)", en: "fundamental" }
    ],
  },
  {
    id: "env_22",
    topicKey: "environment",
    text: "Pourquoi les abeilles et les insectes sont-ils importants pour notre planète ?",
    hint: "Discuss the role of insects in pollination and the food chain.",
    difficulty: 3,
    followUps: [
      "Qu'est-ce qui menace les abeilles aujourd'hui ?",
      "Que se passerait-il si les insectes disparaissaient ?",
      "Est-ce que tu as peur des insectes ou tu les respectes ?"
    ],
    modelAnswer: "Les abeilles sont essentielles car elles assurent la pollinisation de la plupart de nos fruits et légumes. Sans elles, la biodiversité diminuerait et nous aurions beaucoup de mal à produire assez de nourriture. Elles sont à la base de la chaîne alimentaire mondiale. Il est donc crucial de protéger leur habitat et d'arrêter l'utilisation de pesticides toxiques qui les tuent massivement.",
    keyVocab: [
      { fr: "une abeille", en: "a bee" },
      { fr: "la pollinisation", en: "pollination" },
      { fr: "la chaîne alimentaire", en: "food chain" },
      { fr: "diminuer", en: "to decrease" },
      { fr: "un pesticide", en: "a pesticide" },
      { fr: "massivement", en: "massively" }
    ]
  },
  {
    id: "env_23",
    topicKey: "environment",
    text: "Que penses-tu de la pollution sonore et lumineuse dans les villes ?",
    hint: "Discuss how noise and too much light affect people and wildlife in cities.",
    difficulty: 2,
    followUps: [
      "Est-ce que ton quartier est bruyant le soir ?",
      "Comment la lumière artificielle affecte-t-elle les animaux ?",
      "Que pourrait-on faire pour réduire le bruit en ville ?"
    ],
    modelAnswer: "La pollution sonore est un problème grave car elle peut causer du stress et des troubles du sommeil chez les habitants. Quant à la pollution lumineuse, elle empêche de voir les étoiles et perturbe le rythme biologique des oiseaux et des insectes. Je pense qu'on devrait éteindre les enseignes lumineuses la nuit et encourager l'utilisation de véhicules électriques plus silencieux pour améliorer notre qualité de vie.",
    keyVocab: [
      { fr: "la pollution sonore", en: "noise pollution" },
      { fr: "la pollution lumineuse", en: "light pollution" },
      { fr: "le sommeil", en: "sleep" },
      { fr: "perturber", en: "to disturb / disrupt" },
      { fr: "une enseigne", en: "a sign / billboard" },
      { fr: "éteindre", en: "to turn off" }
    ]
  },
  {
    id: "env_24",
    topicKey: "environment",
    text: "As-tu déjà participé à une manifestation ou une campagne pour l'environnement ?",
    hint: "Talk about environmental activism, protests, or school campaigns.",
    difficulty: 2,
    followUps: [
      "Quelles sont les causes qui te tiennent le plus à cœur ?",
      "Penses-tu que les jeunes ont le pouvoir de changer les choses ?",
      "Que penses-tu des activistes comme Greta Thunberg ?"
    ],
    modelAnswer: "L'année dernière, j'ai participé à une grève scolaire pour le climat avec mes amis. Nous voulions attirer l'attention des politiciens sur l'urgence écologique. C'était une expérience très forte de voir autant de jeunes unis pour la même cause. Je crois que même si on est jeune, on peut faire entendre sa voix et influencer les décisions pour notre futur. L'activisme est nécessaire pour faire bouger les lignes.",
    keyVocab: [
      { fr: "une manifestation", en: "a protest / demonstration" },
      { fr: "une grève", en: "a strike" },
      { fr: "attirer l'attention", en: "to attract attention" },
      { fr: "tenir à cœur", en: "to be important to one" },
      { fr: "faire entendre sa voix", en: "to make one's voice heard" },
      { fr: "l'urgence", en: "emergency / urgency" }
    ]
  },
  {
    id: "env_25",
    topicKey: "environment",
    text: "Comment est la qualité de l'air dans ta ville ou ton village ?",
    hint: "Discuss air pollution levels where you live and what causes them.",
    difficulty: 2,
    followUps: [
      "Est-ce qu'il y a beaucoup de smog ou de fumée ?",
      "Quelles sont les sources principales de pollution de l'air ?",
      "Est-ce que tu penses que planter des arbres peut aider ?"
    ],
    modelAnswer: "Dans ma ville, la qualité de l'air est parfois mauvaise à cause du trafic intense et des usines à proximité. En hiver, on voit souvent un nuage de pollution au-dessus du centre-ville. C'est inquiétant pour la santé, surtout pour les enfants et les personnes âgées. Je pense que la municipalité devrait créer plus de zones piétonnes et investir dans des bus à hydrogène pour purifier l'air que nous respirons tous les jours.",
    keyVocab: [
      { fr: "la qualité de l'air", en: "air quality" },
      { fr: "le trafic", en: "traffic" },
      { fr: "une usine", en: "a factory" },
      { fr: "inquiétant(e)", en: "worrying" },
      { fr: "purifier", en: "to purify" },
      { fr: "à proximité", en: "nearby" }
    ]
  },
  {
    id: "env_26",
    topicKey: "environment",
    text: "Comment pouvons-nous réduire notre consommation de papier à l'ère numérique ?",
    hint: "Discuss ways to use less paper at home or school using technology.",
    difficulty: 1,
    followUps: [
      "Utilises-tu des cahiers en papier ou une tablette à l'école ?",
      "Est-ce que tu imprimes souvent tes documents ?",
      "Que fais-tu des vieux journaux et magazines ?"
    ],
    modelAnswer: "À l'ère numérique, il est plus facile de réduire le papier en utilisant des tablettes pour prendre des notes au lieu de cahiers. On peut aussi lire les journaux en ligne et recevoir ses factures par e-mail. À la maison, nous essayons d'éviter d'imprimer des documents inutiles. C'est un geste simple qui permet de sauver des arbres et de réduire les déchets. Le recyclage du papier reste important, mais consommer moins est encore mieux.",
    keyVocab: [
      { fr: "l'ère numérique", en: "digital age" },
      { fr: "prendre des notes", en: "to take notes" },
      { fr: "une facture", en: "a bill" },
      { fr: "imprimer", en: "to print" },
      { fr: "inutile", en: "useless / unnecessary" },
      { fr: "sauver", en: "to save" }
    ]
  },
  {
    id: "env_27",
    topicKey: "environment",
    text: "À quoi ressemblerait une maison écologique idéale selon toi ?",
    hint: "Describe the features of a sustainable house using the conditional.",
    difficulty: 3,
    followUps: [
      "Quels matériaux utiliserais-tu ?",
      "Comment produirais-tu de l'énergie ?",
      "Est-ce que ce genre de maison est trop cher pour la plupart des gens ?"
    ],
    modelAnswer: "Ma maison écologique idéale serait construite avec des matériaux naturels comme le bois et la paille pour une isolation parfaite. Elle aurait des panneaux solaires sur le toit pour être autonome en électricité et un système pour récupérer l'eau de pluie. Il y aurait aussi un grand jardin potager pour faire pousser nos propres légumes. Bien que le coût initial soit élevé, je pense que c'est un investissement indispensable pour un futur durable.",
    keyVocab: [
      { fr: "une maison écologique", en: "an eco-friendly house" },
      { fr: "l'isolation", en: "insulation" },
      { fr: "la paille", en: "straw" },
      { fr: "autonome", en: "self-sufficient" },
      { fr: "récupérer l'eau", en: "to collect water" },
      { fr: "le coût initial", en: "initial cost" }
    ]
  },
  {
    id: "env_28",
    topicKey: "environment",
    text: "Comment peux-tu encourager tes amis à être plus respectueux de l'environnement ?",
    hint: "Discuss how you can influence your peers to adopt greener habits.",
    difficulty: 2,
    followUps: [
      "Est-ce difficile de changer les habitudes des autres ?",
      "Quels petits gestes proposes-tu à tes amis ?",
      "Penses-tu que l'exemple personnel est le plus efficace ?"
    ],
    modelAnswer: "Je pense que le meilleur moyen est de montrer l'exemple en faisant des gestes simples au quotidien, comme utiliser une gourde ou recycler ses déchets. J'essaie d'expliquer à mes amis pourquoi c'est important sans être trop sévère. On peut aussi organiser des activités sympas, comme aller dans des magasins d'occasion ensemble. Je crois que si on rend l'écologie amusante et accessible, les gens sont plus motivés pour changer leurs habitudes.",
    keyVocab: [
      { fr: "encourager", en: "to encourage" },
      { fr: "montrer l'exemple", en: "to lead by example" },
      { fr: "respectueux", en: "respectful" },
      { fr: "un magasin d'occasion", en: "a second-hand shop" },
      { fr: "efficace", en: "effective" },
      { fr: "au quotidien", en: "daily" }
    ]
  },
  {
    id: "env_29",
    topicKey: "environment",
    text: "Que penses-tu de l'économie de partage (comme Uber ou Airbnb) pour l'environnement ?",
    hint: "Discuss if sharing resources like cars or homes helps the planet.",
    difficulty: 2,
    followUps: [
      "As-tu déjà utilisé un service de partage ?",
      "Quels sont les avantages de partager au lieu de posséder ?",
      "Est-ce que cela réduit vraiment la consommation mondiale ?"
    ],
    modelAnswer: "L'économie de partage est une bonne idée car elle permet d'optimiser l'utilisation des ressources existantes au lieu d'en produire de nouvelles. Par exemple, le covoiturage réduit le nombre de voitures sur la route et donc les émissions de CO2. C'est souvent plus économique pour les utilisateurs aussi. Cependant, il faut s'assurer que ces services ne poussent pas à consommer encore plus. À mon avis, partager est une étape vers une société plus durable et moins matérialiste.",
    keyVocab: [
      { fr: "l'économie de partage", en: "sharing economy" },
      { fr: "optimiser", en: "to optimize" },
      { fr: "le covoiturage", en: "car-sharing / carpooling" },
      { fr: "posséder", en: "to own / possess" },
      { fr: "matérialiste", en: "materialistic" },
      { fr: "existant(e)", en: "existing" }
    ]
  },
  {
    id: "env_30",
    topicKey: "environment",
    text: "Quelle est l'importance des parcs nationaux dans ton pays ?",
    hint: "Discuss the role of protected areas for nature and tourism.",
    difficulty: 1,
    followUps: [
      "As-tu déjà visité un parc national ?",
      "Quelles activités peut-on y faire ?",
      "Est-il important de protéger la vie sauvage ?"
    ],
    modelAnswer: "Les parcs nationaux sont cruciaux pour protéger la vie sauvage et les paysages naturels contre l'urbanisation. Ils permettent aussi aux gens de se reconnecter avec la nature et de pratiquer des activités saines comme la randonnée. C'est un refuge pour beaucoup d'espèces menacées. Je pense que nous devons préserver ces endroits intacts pour que les générations futures puissent aussi en profiter et apprécier la beauté de notre planète.",
    keyVocab: [
      { fr: "un parc national", en: "a national park" },
      { fr: "l'urbanisation", en: "urbanization" },
      { fr: "la vie sauvage", en: "wildlife" },
      { fr: "un refuge", en: "a refuge / haven" },
      { fr: "intact(e)", en: "intact / untouched" },
      { fr: "préserver", en: "to preserve" }
    ]
  },
  {
    id: "env_31",
    topicKey: "environment",
    text: "Que penses-tu du concept de 'réparer au lieu de remplacer' ?",
    hint: "Discuss upcycling and fixing broken items instead of buying new ones.",
    difficulty: 2,
    followUps: [
      "Sais-tu réparer tes vêtements ou tes appareils ?",
      "Pourquoi est-il plus facile d'acheter du neuf aujourd'hui ?",
      "Est-ce que tu aimes les objets qui ont une histoire ?"
    ],
    modelAnswer: "Je trouve que réparer ses objets est un acte de résistance contre la surconsommation. Cela permet de réduire les déchets et d'économiser de l'argent. Souvent, on jette des choses qui pourraient encore fonctionner avec une petite réparation. J'essaie d'apprendre à recoudre mes vêtements ou à réparer mon vélo moi-même. À mon avis, redonner vie à un vieil objet est très gratifiant et bien plus écologique que de toujours acheter du neuf.",
    keyVocab: [
      { fr: "réparer", en: "to repair / fix" },
      { fr: "remplacer", en: "to replace" },
      { fr: "la surconsommation", en: "overconsumption" },
      { fr: "recoudre", en: "to sew back / mend" },
      { fr: "gratifiant(e)", en: "rewarding" },
      { fr: "redonner vie", en: "to give new life to" }
    ]
  },
  {
    id: "env_32",
    topicKey: "environment",
    text: "Que penses-tu du suremballage des produits dans les supermarchés ?",
    hint: "Discuss the excessive use of plastic packaging and its impact.",
    difficulty: 2,
    followUps: [
      "Est-ce que cela t'énerve quand tu fais les courses ?",
      "Quelles sont les alternatives au plastique ?",
      "Penses-tu que les entreprises devraient payer une taxe ?"
    ],
    modelAnswer: "Le suremballage est un énorme problème car il génère des tonnes de déchets plastiques inutiles. Je trouve ça ridicule de voir des fruits individuels emballés dans du plastique. Les supermarchés devraient proposer plus de produits en vrac. Personnellement, j'essaie d'acheter des produits avec le moins d'emballage possible pour protéger la planète.",
    keyVocab: [
      { fr: "le suremballage", en: "over-packaging" },
      { fr: "en vrac", en: "in bulk" },
      { fr: "inutile", en: "useless / unnecessary" },
      { fr: "générer", en: "to generate" },
      { fr: "un déchet", en: "waste" },
      { fr: "énerver", en: "to annoy" }
    ],
  },
  {
    id: "env_33",
    topicKey: "environment",
    text: "Est-ce que tu fais du compostage chez toi ?",
    hint: "Explain what composting is and how it helps reduce landfill waste.",
    difficulty: 1,
    followUps: [
      "Quels déchets peut-on mettre dans le compost ?",
      "Est-ce que c'est bon pour le jardin ?",
      "Si tu n'en fais pas, pourquoi ?"
    ],
    modelAnswer: "Oui, nous avons un petit bac à compost dans notre jardin. On y met les épluchures de légumes, le marc de café et les restes de fruits. Cela permet de réduire la quantité de déchets qui partent à la décharge. En plus, après quelques mois, on obtient un excellent engrais naturel pour nos fleurs et notre potager.",
    keyVocab: [
      { fr: "le compostage", en: "composting" },
      { fr: "les épluchures", en: "peelings" },
      { fr: "le marc de café", en: "coffee grounds" },
      { fr: "un engrais", en: "fertilizer" },
      { fr: "le potager", en: "vegetable garden" },
      { fr: "la décharge", en: "landfill" }
    ],
  },
  {
    id: "env_34",
    topicKey: "environment",
    text: "Penses-tu qu'il est possible de vivre un mode de vie 'zéro déchet' ?",
    hint: "Discuss the challenges and benefits of trying to eliminate waste completely.",
    difficulty: 3,
    followUps: [
      "Quels sont les plus gros obstacles ?",
      "Est-ce que c'est plus cher de vivre ainsi ?",
      "Quels petits changements as-tu déjà faits ?"
    ],
    modelAnswer: "Vivre totalement sans déchets est un défi incroyable mais très difficile dans notre société actuelle. Cela demande beaucoup d'organisation, comme apporter ses propres contenants au magasin. Cependant, chaque petit geste compte, comme utiliser une gourde réutilisable ou refuser les pailles en plastique. Je pense que c'est un objectif noble vers lequel nous devrions tous tendre.",
    keyVocab: [
      { fr: "zéro déchet", en: "zero waste" },
      { fr: "un défi", en: "a challenge" },
      { fr: "un contenant", en: "a container" },
      { fr: "une gourde", en: "water bottle" },
      { fr: "réutilisable", en: "reusable" },
      { fr: "tendre vers", en: "to strive towards" }
    ],
  },
  {
    id: "env_35",
    topicKey: "environment",
    text: "Entends-tu souvent parler de 'l'éco-anxiété' chez les jeunes ?",
    hint: "Talk about the mental health impact of climate change on the younger generation.",
    difficulty: 3,
    followUps: [
      "Est-ce que tu t'inquiètes pour l'avenir de la planète ?",
      "Comment peut-on rester optimiste ?",
      "Quelles actions te font te sentir mieux ?"
    ],
    modelAnswer: "L'éco-anxiété est très réelle car beaucoup de jeunes ont peur de l'avenir à cause de la crise climatique. Les nouvelles sont souvent alarmantes et on se sent parfois impuissant. Pour lutter contre cela, je pense qu'il est important de passer à l'action, par exemple en rejoignant des projets écologiques locaux. Cela donne un sentiment de contrôle et d'espoir pour changer les choses.",
    keyVocab: [
      { fr: "l'éco-anxiété", en: "eco-anxiety" },
      { fr: "alarmant(e)", en: "alarming" },
      { fr: "impuissant(e)", en: "powerless" },
      { fr: "l'espoir", en: "hope" },
      { fr: "passer à l'action", en: "to take action" },
      { fr: "la crise climatique", en: "climate crisis" }
    ],
  },
  {
    id: "env_36",
    topicKey: "environment",
    text: "Savais-tu qu'Internet a une empreinte carbone ? Qu'en penses-tu ?",
    hint: "Discuss digital pollution, such as energy used by data centers and streaming.",
    difficulty: 3,
    followUps: [
      "Est-ce que tu supprimes tes vieux e-mails ?",
      "Faut-il limiter le temps de streaming vidéo ?",
      "Comment la technologie peut-elle devenir plus verte ?"
    ],
    modelAnswer: "C'est surprenant, mais les centres de données consomment énormément d'électricité. Chaque recherche Google ou vidéo regardée en streaming a un coût énergétique. Pour réduire ma pollution numérique, j'essaie de supprimer mes vieux e-mails et de limiter la résolution des vidéos. On oublie souvent que le monde virtuel a un impact bien réel sur l'environnement.",
    keyVocab: [
      { fr: "l'empreinte carbone", en: "carbon footprint" },
      { fr: "numérique", en: "digital" },
      { fr: "un centre de données", en: "data center" },
      { fr: "consommer", en: "to consume" },
      { fr: "supprimer", en: "to delete" },
      { fr: "virtuel(le)", en: "virtual" }
    ],
  },
  {
    id: "env_37",
    topicKey: "environment",
    text: "Pourquoi est-il important de protéger les forêts contre la déforestation ?",
    hint: "Discuss the role of trees in absorbing CO2 and protecting biodiversity.",
    difficulty: 2,
    followUps: [
      "Y a-t-il beaucoup de forêts dans ton pays ?",
      "Quelles sont les causes de la déforestation ?",
      "As-tu déjà planté un arbre ?"
    ],
    modelAnswer: "Les forêts sont les poumons de la Terre car elles absorbent le CO2 et produisent de l'oxygène. La déforestation détruit l'habitat de milliers d'espèces d'animaux et aggrave le réchauffement climatique. Il est crucial de planter plus d'arbres et de protéger les zones naturelles. L'année dernière, j'ai participé à une journée de reboisement avec mon école.",
    keyVocab: [
      { fr: "la déforestation", en: "deforestation" },
      { fr: "les poumons", en: "lungs" },
      { fr: "absorber", en: "to absorb" },
      { fr: "l'oxygène", en: "oxygen" },
      { fr: "aggraver", en: "to worsen" },
      { fr: "le reboisement", en: "reforestation" }
    ],
  },
  {
    id: "env_38",
    topicKey: "environment",
    text: "Que penses-tu de l'usage des pesticides dans l'agriculture ?",
    hint: "Discuss the impact of chemicals on bees, biodiversity, and human health.",
    difficulty: 2,
    followUps: [
      "Est-ce que les produits bio sont une bonne solution ?",
      "Quel est l'effet sur les abeilles ?",
      "Est-ce que tu laves toujours tes fruits avant de les manger ?"
    ],
    modelAnswer: "L'usage intensif de pesticides est inquiétant car cela pollue les sols et les nappes phréatiques. De plus, cela tue les abeilles qui sont essentielles pour la pollinisation. Je pense que nous devrions encourager une agriculture plus naturelle et biologique. C'est plus sain pour nous et pour l'écosystème en général, même si les produits sont un peu plus chers.",
    keyVocab: [
      { fr: "les pesticides", en: "pesticides" },
      { fr: "la nappe phréatique", en: "groundwater" },
      { fr: "la pollinisation", en: "pollination" },
      { fr: "inquiétant(e)", en: "worrying" },
      { fr: "le sol", en: "soil" },
      { fr: "tuer", en: "to kill" }
    ],
  },
  {
    id: "env_39",
    topicKey: "environment",
    text: "Que penses-tu des jardins verticaux et des fermes urbaines ?",
    hint: "Discuss the trend of growing food and plants in city centers or on buildings.",
    difficulty: 2,
    followUps: [
      "Est-ce qu'il y en a dans ta ville ?",
      "Quels sont les avantages pour la qualité de l'air ?",
      "Aimerais-tu avoir un jardin sur ton toit ?"
    ],
    modelAnswer: "Je trouve que les jardins verticaux sont une idée brillante pour ramener la nature en ville. Cela permet de rafraîchir l'air et de cultiver des légumes localement, ce qui réduit le transport. Les villes deviennent plus belles et plus respirables. Si j'avais le choix, j'installerais des plantes sur tous les murs de mon immeuble pour créer un environnement plus vert.",
    keyVocab: [
      { fr: "vertical(e)", en: "vertical" },
      { fr: "urbain(e)", en: "urban" },
      { fr: "rafraîchir", en: "to cool down" },
      { fr: "respirable", en: "breathable" },
      { fr: "cultiver", en: "to grow / cultivate" },
      { fr: "ramener", en: "to bring back" }
    ],
  },
  {
    id: "env_40",
    topicKey: "environment",
    text: "Savais-tu qu'est-ce que c'est la 'fast fashion' ? Quel est son impact sur l'environnement ?",
    hint: "Discuss the environmental cost of the mass production of cheap clothing.",
    difficulty: 2,
    followUps: [
      "Achètes-tu souvent de nouveaux vêtements ?",
      "Préfères-tu acheter d'occasion ?",
      "Pourquoi les vêtements sont-ils si peu chers parfois ?"
    ],
    modelAnswer: "La 'fast fashion' est catastrophique car l'industrie textile consomme énormément d'eau et utilise des produits chimiques toxiques. De plus, beaucoup de vêtements finissent à la décharge après avoir été portés seulement quelques fois. J'essaie d'acheter moins de vêtements et de privilégier les magasins d'occasion ou les marques éthiques pour réduire mon impact.",
    keyVocab: [
      { fr: "la fast fashion", en: "fast fashion" },
      { fr: "textile", en: "textile" },
      { fr: "d'occasion", en: "second-hand" },
      { fr: "une marque", en: "a brand" },
      { fr: "catastrophique", en: "catastrophic" },
      { fr: "finir", en: "to end up" }
    ],
  },
  {
    id: "env_41",
    topicKey: "environment",
    text: "Est-ce qu'il est facile d'installer de l'énergie renouvelable à la maison ?",
    hint: "Talk about solar panels, heat pumps, or insulation improvements.",
    difficulty: 2,
    followUps: [
      "Est-ce que ta maison a des panneaux solaires ?",
      "Est-ce que c'est un bon investissement ?",
      "Quelles sont les aides du gouvernement dans ton pays ?"
    ],
    modelAnswer: "L'installation de panneaux solaires devient de plus en plus populaire, mais cela coûte encore assez cher au début. C'est un excellent investissement à long terme car on réduit ses factures d'électricité et on utilise une énergie propre. Ma famille réfléchit à en installer l'année prochaine. Je pense que le gouvernement devrait aider financièrement les citoyens pour rendre ces technologies accessibles à tous.",
    keyVocab: [
      { fr: "renouvelable", en: "renewable" },
      { fr: "un panneau solaire", en: "solar panel" },
      { fr: "une facture", en: "a bill" },
      { fr: "un investissement", en: "an investment" },
      { fr: "propre", en: "clean" },
      { fr: "accessible", en: "accessible" }
    ],
  },

  // ── LES VÊTEMENTS ────────────────────────────────────────────────────────
  {
    id: "clo_01",
    topicKey: "clothes",
    text: "Qu'est-ce que tu portes aujourd'hui ?",
    hint: "Describe what you're wearing right now — items, colours, materials.",
    difficulty: 1,
    followUps: [
      "Tu aimes cette tenue ?",
      "Où as-tu acheté ces vêtements ?",
      "Quelle est ta couleur préférée pour les vêtements ?",
    ],
    modelAnswer: "Aujourd'hui, je porte un jean bleu, un tee-shirt blanc et des baskets noires. J'ai aussi un pull gris parce qu'il fait un peu froid. J'aime bien cette tenue parce qu'elle est confortable et simple. Ma couleur préférée pour les vêtements, c'est le bleu marine, parce que ça va avec presque tout.",
    keyVocab: [
      { fr: "porter", en: "to wear" },
      { fr: "une tenue", en: "an outfit" },
      { fr: "confortable", en: "comfortable" },
      { fr: "des baskets", en: "trainers/sneakers" },
      { fr: "un pull", en: "a jumper/sweater" },
      { fr: "aller avec", en: "to go with/match" },
    ],
  },
  {
    id: "clo_02",
    topicKey: "clothes",
    text: "Décris ton vêtement préféré.",
    hint: "Pick one item, describe its appearance and why you like wearing it.",
    difficulty: 1,
    followUps: [
      "Depuis quand as-tu ce vêtement ?",
      "Où le portes-tu d'habitude ?",
      "Est-ce que c'était cher ?",
    ],
    modelAnswer: "Mon vêtement préféré, c'est ma veste en jean. Elle est bleue avec des boutons argentés et elle me va très bien. Je l'ai depuis deux ans et je la porte presque tous les week-ends avec un tee-shirt et un jean. Elle n'était pas très chère, mais elle est vraiment confortable et à la mode.",
    keyVocab: [
      { fr: "une veste", en: "a jacket" },
      { fr: "un bouton", en: "a button" },
      { fr: "aller bien à quelqu'un", en: "to suit someone" },
      { fr: "à la mode", en: "fashionable" },
      { fr: "d'habitude", en: "usually" },
      { fr: "cher/chère", en: "expensive" },
    ],
  },
  {
    id: "clo_03",
    topicKey: "clothes",
    text: "Qu'est-ce que tu portes pour aller à l'école ?",
    hint: "Talk about your uniform or everyday school clothes.",
    difficulty: 1,
    followUps: [
      "Est-ce que tu aimes ton uniforme ?",
      "Qu'est-ce que tu préfères porter le week-end ?",
      "Est-ce que les règles vestimentaires sont strictes ?",
    ],
    modelAnswer: "Pour aller à l'école, je porte un uniforme obligatoire : un pantalon noir, une chemise blanche et un pull bleu marine avec le logo de l'école. Honnêtement, je n'aime pas trop l'uniforme parce qu'il n'est pas très confortable. Le week-end, je préfère porter un jogging et un sweat, c'est beaucoup plus décontracté.",
    keyVocab: [
      { fr: "un uniforme", en: "a uniform" },
      { fr: "obligatoire", en: "compulsory" },
      { fr: "une chemise", en: "a shirt" },
      { fr: "décontracté(e)", en: "casual" },
      { fr: "un jogging", en: "tracksuit bottoms" },
      { fr: "honnêtement", en: "honestly" },
    ],
  },
  {
    id: "clo_04",
    topicKey: "clothes",
    text: "Tu préfères porter des vêtements décontractés ou élégants ?",
    hint: "Compare casual vs smart clothing and when you wear each.",
    difficulty: 1,
    followUps: [
      "Quand portes-tu des vêtements élégants ?",
      "Est-ce que tu te sens différent selon ce que tu portes ?",
      "Qu'est-ce que tu portes pour une fête ?",
    ],
    modelAnswer: "En général, je préfère les vêtements décontractés comme un jean et un tee-shirt, parce que je me sens plus à l'aise. Cependant, pour les occasions spéciales, comme un mariage ou une fête, j'aime bien m'habiller élégamment. Je pense que porter de beaux vêtements me donne plus de confiance en moi.",
    keyVocab: [
      { fr: "élégant(e)", en: "smart/elegant" },
      { fr: "à l'aise", en: "comfortable/at ease" },
      { fr: "une occasion spéciale", en: "a special occasion" },
      { fr: "s'habiller", en: "to get dressed" },
      { fr: "la confiance en soi", en: "self-confidence" },
      { fr: "un mariage", en: "a wedding" },
    ],
  },
  {
    id: "clo_05",
    topicKey: "clothes",
    text: "Où fais-tu du shopping pour acheter des vêtements ?",
    hint: "Name shops, in-store vs online, and why you choose them.",
    difficulty: 1,
    followUps: [
      "Tu préfères acheter en ligne ou en magasin ?",
      "Est-ce que tu fais du shopping seul(e) ou avec des amis ?",
      "Combien de fois par mois achètes-tu des vêtements ?",
    ],
    modelAnswer: "Je fais souvent du shopping dans les grands centres commerciaux avec mes amis. J'aime essayer les vêtements avant de les acheter, donc je préfère les magasins aux achats en ligne. Cependant, parfois c'est plus pratique de commander sur internet quand je cherche quelque chose de précis. J'achète des vêtements environ une fois par mois.",
    keyVocab: [
      { fr: "un centre commercial", en: "a shopping centre" },
      { fr: "essayer", en: "to try on" },
      { fr: "en ligne", en: "online" },
      { fr: "commander", en: "to order" },
      { fr: "pratique", en: "practical/convenient" },
      { fr: "précis(e)", en: "specific" },
    ],
  },
  {
    id: "clo_06",
    topicKey: "clothes",
    text: "Décris les vêtements que porte une personne de ta famille.",
    hint: "Describe someone's typical style — colours, items, occasions.",
    difficulty: 1,
    followUps: [
      "Est-ce que son style te plaît ?",
      "Partagez-vous des vêtements ?",
      "Qui a le meilleur style dans ta famille ?",
    ],
    modelAnswer: "Ma sœur adore la mode. Elle porte souvent des robes colorées et des accessoires originaux, comme des boucles d'oreilles ou des colliers. Elle aime aussi les chaussures à talons pour sortir. Personnellement, j'aime bien son style parce qu'il est unique, même si je préfère quelque chose de plus simple pour moi-même.",
    keyVocab: [
      { fr: "une robe", en: "a dress" },
      { fr: "des boucles d'oreilles", en: "earrings" },
      { fr: "un collier", en: "a necklace" },
      { fr: "des chaussures à talons", en: "high heels" },
      { fr: "original(e)", en: "original/quirky" },
      { fr: "unique", en: "unique" },
    ],
  },
  {
    id: "clo_07",
    topicKey: "clothes",
    text: "Quels vêtements portes-tu quand il fait froid ?",
    hint: "Describe cold-weather clothing layers.",
    difficulty: 1,
    followUps: [
      "Et quand il fait chaud, qu'est-ce que tu portes ?",
      "As-tu un manteau d'hiver préféré ?",
      "Est-ce que tu détestes le froid ?",
    ],
    modelAnswer: "Quand il fait froid, je porte plusieurs couches : un tee-shirt, un pull épais et un gros manteau. Je mets aussi une écharpe, des gants et un bonnet pour ne pas avoir froid. Mon manteau d'hiver préféré est noir avec une capuche. J'aime bien l'hiver, mais je n'aime pas quand il fait vraiment glacial.",
    keyVocab: [
      { fr: "une couche", en: "a layer" },
      { fr: "épais(se)", en: "thick" },
      { fr: "une écharpe", en: "a scarf" },
      { fr: "des gants", en: "gloves" },
      { fr: "un bonnet", en: "a beanie hat" },
      { fr: "glacial(e)", en: "freezing" },
    ],
  },
  {
    id: "clo_08",
    topicKey: "clothes",
    text: "Est-ce que tu suis les tendances de la mode ?",
    hint: "Say whether you follow trends and give an example.",
    difficulty: 2,
    followUps: [
      "Où trouves-tu de l'inspiration pour t'habiller ?",
      "Penses-tu que les réseaux sociaux influencent la mode ?",
      "Quelle tendance actuelle n'aimes-tu pas ?",
    ],
    modelAnswer: "Je suis un peu les tendances, mais je n'achète pas tout ce qui est à la mode. Je trouve de l'inspiration sur les réseaux sociaux, surtout sur Instagram, où je suis quelques influenceurs mode. Je pense que les réseaux sociaux ont énormément d'influence sur la façon dont les jeunes s'habillent aujourd'hui. Il y a une tendance actuelle que je n'aime pas trop, ce sont les vêtements trop larges.",
    keyVocab: [
      { fr: "une tendance", en: "a trend" },
      { fr: "l'inspiration", en: "inspiration" },
      { fr: "un(e) influenceur/euse", en: "an influencer" },
      { fr: "les réseaux sociaux", en: "social media" },
      { fr: "large", en: "baggy/loose" },
      { fr: "influencer", en: "to influence" },
    ],
  },
  {
    id: "clo_09",
    topicKey: "clothes",
    text: "Est-ce que la mode est importante pour toi ?",
    hint: "Give a balanced opinion on how much fashion matters to you.",
    difficulty: 2,
    followUps: [
      "Est-ce que tu dépenses beaucoup d'argent en vêtements ?",
      "Penses-tu que l'apparence physique compte trop dans la société ?",
      "Qu'est-ce qui est plus important : le style ou le confort ?",
    ],
    modelAnswer: "La mode est assez importante pour moi, mais ce n'est pas ma priorité absolue. J'aime bien avoir un style personnel, mais je ne dépense pas énormément d'argent en vêtements. Je pense que la société accorde parfois trop d'importance à l'apparence physique, ce qui peut créer de la pression, surtout chez les jeunes. Pour moi, le confort compte autant que le style.",
    keyVocab: [
      { fr: "une priorité", en: "a priority" },
      { fr: "dépenser", en: "to spend" },
      { fr: "l'apparence physique", en: "physical appearance" },
      { fr: "la pression", en: "pressure" },
      { fr: "accorder de l'importance à", en: "to give importance to" },
      { fr: "le confort", en: "comfort" },
    ],
  },
  {
    id: "clo_10",
    topicKey: "clothes",
    text: "Décris une tenue que tu as portée pour une occasion spéciale.",
    hint: "Use passé composé to describe an outfit worn to an event.",
    difficulty: 2,
    followUps: [
      "Pour quelle occasion c'était ?",
      "Comment t'es-tu senti(e) dans cette tenue ?",
      "As-tu reçu des compliments ?",
    ],
    modelAnswer: "Le mois dernier, je suis allé(e) à l'anniversaire de ma cousine et j'ai porté une chemise bleue avec un pantalon noir élégant. J'ai aussi mis des chaussures en cuir que j'avais achetées spécialement pour l'occasion. Je me suis senti(e) très bien habillé(e) et confiant(e). Plusieurs personnes m'ont fait des compliments sur ma tenue, ce qui m'a fait plaisir.",
    keyVocab: [
      { fr: "le cuir", en: "leather" },
      { fr: "spécialement", en: "specially" },
      { fr: "un compliment", en: "a compliment" },
      { fr: "confiant(e)", en: "confident" },
      { fr: "bien habillé(e)", en: "well-dressed" },
      { fr: "faire plaisir à quelqu'un", en: "to please someone" },
    ],
  },
  {
    id: "clo_11",
    topicKey: "clothes",
    text: "Qu'est-ce que tu penses de la mode rapide (fast fashion) ?",
    hint: "Discuss pros and cons of cheap, fast-changing fashion.",
    difficulty: 2,
    followUps: [
      "Est-ce que tu achètes souvent des vêtements bon marché ?",
      "Quels sont les problèmes de la fast fashion ?",
      "Que pourrais-tu faire différemment ?",
    ],
    modelAnswer: "La fast fashion permet d'acheter des vêtements tendance à petit prix, ce qui est pratique pour les jeunes qui ont un budget limité. Cependant, je pense que c'est un vrai problème parce que ces vêtements sont souvent de mauvaise qualité et ne durent pas longtemps. En plus, la production est mauvaise pour l'environnement. Je devrais peut-être acheter moins mais mieux à l'avenir.",
    keyVocab: [
      { fr: "bon marché", en: "cheap" },
      { fr: "un budget limité", en: "a limited budget" },
      { fr: "la qualité", en: "quality" },
      { fr: "durer", en: "to last" },
      { fr: "la production", en: "production" },
      { fr: "à l'avenir", en: "in the future" },
    ],
  },
  {
    id: "clo_12",
    topicKey: "clothes",
    text: "Comment choisis-tu tes vêtements le matin ?",
    hint: "Describe your morning routine for picking an outfit.",
    difficulty: 1,
    followUps: [
      "Est-ce que la météo influence ton choix ?",
      "Combien de temps passes-tu à choisir ta tenue ?",
      "Prépares-tu tes vêtements la veille ?",
    ],
    modelAnswer: "Le matin, je choisis mes vêtements selon la météo et selon ce que je vais faire ce jour-là. S'il pleut, je prends un imperméable et des bottes. Je ne passe pas beaucoup de temps à choisir ma tenue, environ cinq minutes. Parfois, je prépare mes vêtements la veille pour gagner du temps le matin.",
    keyVocab: [
      { fr: "la météo", en: "the weather" },
      { fr: "un imperméable", en: "a raincoat" },
      { fr: "des bottes", en: "boots" },
      { fr: "gagner du temps", en: "to save time" },
      { fr: "selon", en: "according to" },
      { fr: "la veille", en: "the day before" },
    ],
  },
  {
    id: "clo_13",
    topicKey: "clothes",
    text: "Est-ce que tu as déjà acheté un vêtement que tu as regretté ?",
    hint: "Use passé composé — describe a clothing purchase mistake.",
    difficulty: 2,
    followUps: [
      "Pourquoi l'as-tu regretté ?",
      "Qu'est-ce que tu en as fait après ?",
      "As-tu appris quelque chose de cette expérience ?",
    ],
    modelAnswer: "Oui, une fois j'ai acheté une veste très à la mode, mais elle était trop petite et pas très confortable. Je l'ai portée seulement une fois avant de réaliser que je ne l'aimais pas vraiment. Finalement, je l'ai donnée à une association caritative. Depuis, j'essaie toujours les vêtements avant de les acheter pour éviter ce genre d'erreur.",
    keyVocab: [
      { fr: "regretter", en: "to regret" },
      { fr: "réaliser", en: "to realise" },
      { fr: "une association caritative", en: "a charity" },
      { fr: "éviter", en: "to avoid" },
      { fr: "une erreur", en: "a mistake" },
      { fr: "finalement", en: "eventually/in the end" },
    ],
  },
  {
    id: "clo_14",
    topicKey: "clothes",
    text: "Penses-tu que les écoles devraient obliger le port de l'uniforme ?",
    hint: "Discuss both sides of the school uniform debate.",
    difficulty: 2,
    followUps: [
      "Quels sont les avantages de l'uniforme ?",
      "Quels sont les inconvénients ?",
      "Que préférerais-tu personnellement ?",
    ],
    modelAnswer: "D'un côté, l'uniforme scolaire réduit les inégalités entre les élèves et évite la pression liée à la mode. D'un autre côté, certains pensent qu'il empêche les élèves d'exprimer leur personnalité. Personnellement, je pense que l'uniforme est une bonne idée parce qu'il simplifie les choses le matin et crée un sentiment d'appartenance à l'école.",
    keyVocab: [
      { fr: "les inégalités", en: "inequalities" },
      { fr: "empêcher", en: "to prevent" },
      { fr: "exprimer", en: "to express" },
      { fr: "la personnalité", en: "personality" },
      { fr: "simplifier", en: "to simplify" },
      { fr: "un sentiment d'appartenance", en: "a sense of belonging" },
    ],
  },
  {
    id: "clo_15",
    topicKey: "clothes",
    text: "Est-ce que tu achètes des vêtements d'occasion ?",
    hint: "Discuss second-hand clothing — thrifting, vintage shops.",
    difficulty: 2,
    followUps: [
      "Pourquoi est-ce que les vêtements d'occasion deviennent populaires ?",
      "As-tu déjà trouvé une bonne affaire ?",
      "Préfères-tu le neuf ou l'occasion ?",
    ],
    modelAnswer: "Oui, j'achète de plus en plus de vêtements d'occasion, surtout dans les friperies. C'est devenu très populaire chez les jeunes parce que c'est moins cher et plus écologique que d'acheter neuf. Une fois, j'ai trouvé une veste en cuir de très bonne qualité pour presque rien. Je pense que je préfère l'occasion maintenant, pour des raisons économiques et environnementales.",
    keyVocab: [
      { fr: "d'occasion", en: "second-hand" },
      { fr: "une friperie", en: "a thrift/vintage shop" },
      { fr: "écologique", en: "eco-friendly" },
      { fr: "une bonne affaire", en: "a bargain" },
      { fr: "neuf/neuve", en: "brand new" },
      { fr: "économique", en: "economical" },
    ],
  },
  {
    id: "clo_16",
    topicKey: "clothes",
    text: "Comment penses-tu que la mode va changer dans le futur ?",
    hint: "Speculate using the future tense about fashion trends.",
    difficulty: 3,
    followUps: [
      "Est-ce que la technologie va jouer un rôle dans la mode ?",
      "Penses-tu que les vêtements seront plus durables ?",
      "Porterons-nous encore des vêtements traditionnels ?",
    ],
    modelAnswer: "Je pense que la mode deviendra de plus en plus durable, avec des matériaux recyclés et des méthodes de production plus respectueuses de l'environnement. La technologie jouera sans doute un rôle important, avec par exemple des vêtements connectés ou imprimés en 3D. Cependant, je crois que certains styles traditionnels resteront toujours populaires malgré ces changements.",
    keyVocab: [
      { fr: "durable", en: "sustainable" },
      { fr: "recyclé(e)", en: "recycled" },
      { fr: "respectueux de l'environnement", en: "environmentally friendly" },
      { fr: "connecté(e)", en: "connected (tech)" },
      { fr: "imprimé(e) en 3D", en: "3D printed" },
      { fr: "malgré", en: "despite" },
    ],
  },
  {
    id: "clo_17",
    topicKey: "clothes",
    text: "Dans quelle mesure les vêtements reflètent-ils notre identité ?",
    hint: "Discuss how clothing choices express personality and identity.",
    difficulty: 3,
    followUps: [
      "Est-ce que tu changes de style selon ton humeur ?",
      "Penses-tu qu'on juge les gens selon leurs vêtements ?",
      "Est-ce que c'est juste de juger quelqu'un sur son apparence ?",
    ],
    modelAnswer: "Je pense que les vêtements reflètent en grande partie notre identité, nos goûts et parfois même notre humeur du moment. Par exemple, je porte des couleurs vives quand je me sens joyeux et des tons plus sombres quand je suis fatigué. Malheureusement, les gens jugent souvent les autres selon leur apparence, ce qui n'est pas juste, car le style vestimentaire ne définit pas la personnalité profonde de quelqu'un.",
    keyVocab: [
      { fr: "refléter", en: "to reflect" },
      { fr: "l'identité", en: "identity" },
      { fr: "l'humeur", en: "mood" },
      { fr: "juger", en: "to judge" },
      { fr: "vestimentaire", en: "relating to clothing" },
      { fr: "définir", en: "to define" },
    ],
  },
  {
    id: "clo_18",
    topicKey: "clothes",
    text: "Quel est l'impact environnemental de l'industrie de la mode ?",
    hint: "Discuss pollution, waste, and water use in fashion production.",
    difficulty: 3,
    followUps: [
      "Quelles solutions existent pour réduire cet impact ?",
      "Est-ce que les consommateurs ont une responsabilité ?",
      "Les marques font-elles assez d'efforts selon toi ?",
    ],
    modelAnswer: "L'industrie de la mode est l'une des plus polluantes au monde : elle consomme énormément d'eau et produit une quantité énorme de déchets textiles chaque année. Je pense que les consommateurs ont une part de responsabilité, mais les grandes marques devraient surtout changer leurs méthodes de production. À mon avis, il faudrait davantage de réglementation pour forcer l'industrie à devenir plus responsable.",
    keyVocab: [
      { fr: "polluant(e)", en: "polluting" },
      { fr: "consommer", en: "to consume" },
      { fr: "les déchets textiles", en: "textile waste" },
      { fr: "la responsabilité", en: "responsibility" },
      { fr: "une marque", en: "a brand" },
      { fr: "la réglementation", en: "regulation" },
    ],
  },
  {
    id: "clo_19",
    topicKey: "clothes",
    text: "Si tu pouvais créer ta propre ligne de vêtements, à quoi ressemblerait-elle ?",
    hint: "Use conditional to describe a hypothetical fashion line.",
    difficulty: 3,
    followUps: [
      "Quel serait le style de ta marque ?",
      "Utiliserais-tu des matériaux durables ?",
      "Qui serait ton client idéal ?",
    ],
    modelAnswer: "Si je créais ma propre ligne de vêtements, elle serait simple, confortable et abordable pour tout le monde. J'utiliserais uniquement des matériaux durables et recyclés parce que je crois que la mode doit devenir plus responsable. Ma marque s'adresserait surtout aux jeunes qui cherchent un style décontracté sans nuire à la planète. Je proposerais aussi des vêtements unisexes pour tous.",
    keyVocab: [
      { fr: "une ligne de vêtements", en: "a clothing line" },
      { fr: "abordable", en: "affordable" },
      { fr: "s'adresser à", en: "to be aimed at" },
      { fr: "nuire à", en: "to harm" },
      { fr: "unisexe", en: "unisex" },
      { fr: "proposer", en: "to offer" },
    ],
  },
  {
    id: "clo_20",
    topicKey: "clothes",
    text: "Penses-tu que les publicités de mode donnent une image irréaliste du corps ?",
    hint: "Discuss body image and fashion advertising critically.",
    difficulty: 3,
    followUps: [
      "Comment cela affecte-t-il les jeunes ?",
      "Est-ce que les choses changent, selon toi ?",
      "Que devraient faire les marques différemment ?",
    ],
    modelAnswer: "Absolument, je pense que la plupart des publicités de mode présentent des corps parfaits et souvent retouchés, ce qui donne une image très irréaliste. Cela peut avoir un impact négatif sur l'estime de soi des jeunes, en particulier des adolescentes. Heureusement, certaines marques commencent à utiliser des mannequins de toutes tailles, mais il reste encore beaucoup de progrès à faire dans l'industrie entière.",
    keyVocab: [
      { fr: "irréaliste", en: "unrealistic" },
      { fr: "retouché(e)", en: "photoshopped/edited" },
      { fr: "l'estime de soi", en: "self-esteem" },
      { fr: "un(e) adolescent(e)", en: "a teenager" },
      { fr: "un mannequin", en: "a model" },
      { fr: "le progrès", en: "progress" },
    ],
  },
  {
    id: "clo_21",
    topicKey: "clothes",
    text: "Quels vêtements portes-tu pour faire du sport ?",
    hint: "Describe sportswear items and materials.",
    difficulty: 1,
    followUps: [
      "As-tu des chaussures de sport spéciales ?",
      "Est-ce que les vêtements de sport sont chers ?",
      "Portes-tu une marque en particulier ?",
    ],
    modelAnswer: "Pour faire du sport, je porte généralement un short, un tee-shirt en matière respirante et des baskets de sport confortables. Ces vêtements sont souvent assez chers, surtout les grandes marques, mais ils sont de bonne qualité et durent longtemps. Je préfère les vêtements amples pour bouger facilement pendant l'entraînement.",
    keyVocab: [
      { fr: "un short", en: "shorts" },
      { fr: "respirant(e)", en: "breathable" },
      { fr: "ample", en: "loose-fitting" },
      { fr: "bouger", en: "to move" },
      { fr: "un entraînement", en: "a training session" },
      { fr: "une marque", en: "a brand" },
    ],
  },
  {
    id: "clo_22",
    topicKey: "clothes",
    text: "Est-ce que tu prêtes tes vêtements à d'autres personnes ?",
    hint: "Talk about sharing/lending clothes with friends or siblings.",
    difficulty: 2,
    followUps: [
      "À qui prêtes-tu tes vêtements ?",
      "Est-ce que ça te dérange de prêter tes affaires ?",
      "As-tu déjà eu un problème avec un vêtement prêté ?",
    ],
    modelAnswer: "Oui, je prête parfois mes vêtements à ma meilleure amie, surtout quand elle a besoin d'une tenue pour une soirée spéciale. Ça ne me dérange pas de partager, tant qu'elle en prend soin. Une fois, elle a taché mon pull préféré, ce qui m'a un peu énervé(e), mais globalement, j'aime bien échanger des vêtements entre amis.",
    keyVocab: [
      { fr: "prêter", en: "to lend" },
      { fr: "déranger", en: "to bother" },
      { fr: "prendre soin de", en: "to take care of" },
      { fr: "tacher", en: "to stain" },
      { fr: "énerver", en: "to annoy" },
      { fr: "échanger", en: "to swap/exchange" },
    ],
  },
  {
    id: "clo_23",
    topicKey: "clothes",
    text: "Quelle est la différence entre le style vestimentaire des jeunes et celui des adultes ?",
    hint: "Compare generational fashion differences.",
    difficulty: 2,
    followUps: [
      "Pourquoi penses-tu qu'il y a cette différence ?",
      "Est-ce que tes parents aiment ton style ?",
      "Ton style va-t-il changer en vieillissant, à ton avis ?",
    ],
    modelAnswer: "Je trouve que les jeunes suivent davantage les tendances actuelles et osent porter des couleurs vives ou des styles originaux, tandis que les adultes préfèrent souvent des vêtements plus classiques et sobres. Mes parents trouvent parfois que mon style est trop décontracté, mais je pense que chacun devrait s'habiller comme il se sent bien. Je suppose que mon style deviendra plus formel en vieillissant, surtout pour le travail.",
    keyVocab: [
      { fr: "oser", en: "to dare" },
      { fr: "sobre", en: "plain/understated" },
      { fr: "classique", en: "classic" },
      { fr: "formel(le)", en: "formal" },
      { fr: "supposer", en: "to suppose" },
      { fr: "vieillir", en: "to grow older" },
    ],
  },
  {
    id: "clo_24",
    topicKey: "clothes",
    text: "As-tu déjà offert des vêtements en cadeau ?",
    hint: "Use passé composé to describe giving clothing as a gift.",
    difficulty: 2,
    followUps: [
      "À qui as-tu offert ce cadeau ?",
      "Comment as-tu choisi la taille et le style ?",
      "Est-ce que la personne a aimé le cadeau ?",
    ],
    modelAnswer: "Oui, pour l'anniversaire de mon frère l'année dernière, je lui ai offert un sweat à capuche de sa marque préférée. C'était assez difficile de choisir la bonne taille sans qu'il le sache, donc j'ai demandé discrètement à ma mère. Heureusement, il a adoré le cadeau et il le porte encore très souvent aujourd'hui.",
    keyVocab: [
      { fr: "offrir", en: "to give (as a gift)" },
      { fr: "un sweat à capuche", en: "a hoodie" },
      { fr: "la taille", en: "the size" },
      { fr: "discrètement", en: "discreetly" },
      { fr: "adorer", en: "to love" },
      { fr: "encore", en: "still" },
    ],
  },
  {
    id: "clo_25",
    topicKey: "clothes",
    text: "Comment les vêtements traditionnels sont-ils différents des vêtements modernes ?",
    hint: "Compare traditional cultural dress with modern fashion.",
    difficulty: 3,
    followUps: [
      "Y a-t-il des vêtements traditionnels dans ta culture ?",
      "Quand porte-t-on ces vêtements aujourd'hui ?",
      "Penses-tu que ces traditions vont disparaître ?",
    ],
    modelAnswer: "Les vêtements traditionnels sont souvent fabriqués à la main avec des tissus spécifiques et portent une signification culturelle ou religieuse, contrairement aux vêtements modernes qui sont produits en masse. Dans ma culture, on porte des tenues traditionnelles surtout lors des mariages ou des fêtes religieuses. J'espère que ces traditions ne disparaîtront pas, car elles font partie de notre patrimoine et de notre identité.",
    keyVocab: [
      { fr: "fabriqué(e) à la main", en: "handmade" },
      { fr: "un tissu", en: "a fabric" },
      { fr: "la signification", en: "the meaning/significance" },
      { fr: "produit(e) en masse", en: "mass-produced" },
      { fr: "disparaître", en: "to disappear" },
      { fr: "le patrimoine", en: "heritage" },
    ],
  },
  {
    id: "clo_26",
    topicKey: "clothes",
    text: "Penses-tu que les hommes et les femmes devraient pouvoir porter les mêmes vêtements ?",
    hint: "Discuss gender-neutral fashion and changing norms.",
    difficulty: 3,
    followUps: [
      "Est-ce que cette idée est acceptée dans ta société ?",
      "Connais-tu des marques de vêtements unisexes ?",
      "Comment penses-tu que les normes vont évoluer ?",
    ],
    modelAnswer: "Personnellement, je pense que tout le monde devrait pouvoir porter ce qu'il veut, sans distinction de genre, tant que cela le rend heureux et à l'aise. Les normes évoluent progressivement, et de plus en plus de marques proposent des collections unisexes. Cependant, dans certaines sociétés plus traditionnelles, cette idée n'est pas encore totalement acceptée, ce qui peut créer des jugements injustes envers ceux qui s'habillent différemment.",
    keyVocab: [
      { fr: "sans distinction de", en: "regardless of" },
      { fr: "le genre", en: "gender" },
      { fr: "évoluer", en: "to evolve" },
      { fr: "une collection", en: "a collection" },
      { fr: "un jugement", en: "a judgement" },
      { fr: "injuste", en: "unfair" },
    ],
  },
  {
    id: "clo_27",
    topicKey: "clothes",
    text: "As-tu déjà participé ou assisté à un défilé de mode ?",
    hint: "Describe an experience with a fashion show, real or hypothetical.",
    difficulty: 2,
    followUps: [
      "Comment était l'ambiance ?",
      "Qu'est-ce que les mannequins portaient ?",
      "Aimerais-tu travailler dans la mode ?",
    ],
    modelAnswer: "Je n'ai jamais assisté à un vrai défilé de mode, mais mon école a organisé un petit défilé caritatif l'année dernière et j'y ai participé comme mannequin. L'ambiance était très excitante, avec de la musique et beaucoup de spectateurs. J'ai porté des vêtements créés par des élèves de la classe de mode. C'était une expérience amusante que je n'oublierai jamais.",
    keyVocab: [
      { fr: "un défilé de mode", en: "a fashion show" },
      { fr: "l'ambiance", en: "the atmosphere" },
      { fr: "un spectateur", en: "a spectator" },
      { fr: "caritatif/ve", en: "charitable" },
      { fr: "excitant(e)", en: "exciting" },
      { fr: "oublier", en: "to forget" },
    ],
  },
  {
    id: "clo_28",
    topicKey: "clothes",
    text: "Quel rôle jouent les célébrités dans les tendances de la mode ?",
    hint: "Discuss celebrity influence on fashion choices.",
    difficulty: 3,
    followUps: [
      "Y a-t-il une célébrité dont tu admires le style ?",
      "Est-ce que c'est sain de vouloir copier le style de quelqu'un ?",
      "Comment les marques utilisent-elles les célébrités ?",
    ],
    modelAnswer: "Les célébrités ont une influence énorme sur les tendances de la mode, car beaucoup de gens veulent leur ressembler et achètent les mêmes vêtements qu'elles portent. Les marques collaborent souvent avec des célébrités pour promouvoir leurs produits, ce qui augmente considérablement les ventes. Je ne pense pas que ce soit très sain de vouloir copier exactement le style de quelqu'un, car il est important de développer sa propre identité.",
    keyVocab: [
      { fr: "une célébrité", en: "a celebrity" },
      { fr: "ressembler à", en: "to look like/resemble" },
      { fr: "collaborer", en: "to collaborate" },
      { fr: "promouvoir", en: "to promote" },
      { fr: "les ventes", en: "sales" },
      { fr: "développer", en: "to develop" },
    ],
  },
  {
    id: "clo_29",
    topicKey: "clothes",
    text: "Si tu devais choisir seulement cinq vêtements pour toute une année, lesquels choisirais-tu ?",
    hint: "Use conditional to justify a minimalist wardrobe.",
    difficulty: 3,
    followUps: [
      "Pourquoi as-tu choisi ces vêtements précisément ?",
      "Est-ce que ce serait difficile pour toi ?",
      "Penses-tu qu'on a besoin d'autant de vêtements qu'on en possède ?",
    ],
    modelAnswer: "Si je devais choisir seulement cinq vêtements, je prendrais un jean confortable, deux tee-shirts basiques, un pull chaud et une veste imperméable, car ces pièces sont polyvalentes et peuvent se combiner facilement. Ce serait assez difficile au début, mais je pense que cela m'apprendrait à consommer de manière plus raisonnable. Honnêtement, je crois qu'on possède souvent bien plus de vêtements que nécessaire.",
    keyVocab: [
      { fr: "polyvalent(e)", en: "versatile" },
      { fr: "se combiner", en: "to combine/mix" },
      { fr: "consommer", en: "to consume" },
      { fr: "raisonnable", en: "reasonable" },
      { fr: "posséder", en: "to own/possess" },
      { fr: "nécessaire", en: "necessary" },
    ],
  },
  {
    id: "clo_30",
    topicKey: "clothes",
    text: "Comment la mode a-t-elle changé au cours des dernières décennies ?",
    hint: "Discuss how fashion has evolved historically.",
    difficulty: 3,
    followUps: [
      "Quelle époque de la mode préfères-tu ?",
      "Est-ce que les vieilles tendances reviennent parfois ?",
      "Comment imagines-tu la mode dans cinquante ans ?",
    ],
    modelAnswer: "La mode a énormément changé au cours des dernières décennies, en devenant plus rapide, plus accessible et plus influencée par les réseaux sociaux. Je remarque que beaucoup de tendances des années 90 et 2000 reviennent aujourd'hui, ce qui prouve que la mode est cyclique. J'imagine que dans cinquante ans, la mode sera encore plus technologique, avec peut-être des vêtements intelligents adaptés à notre environnement.",
    keyVocab: [
      { fr: "une décennie", en: "a decade" },
      { fr: "accessible", en: "accessible" },
      { fr: "remarquer", en: "to notice" },
      { fr: "cyclique", en: "cyclical" },
      { fr: "intelligent(e)", en: "smart (technology)" },
      { fr: "adapté(e)", en: "adapted" },
    ],
  },

  // ── LES ANIMAUX ──────────────────────────────────────────────────────────
  {
    id: "ani_01",
    topicKey: "animals",
    text: "As-tu un animal de compagnie ?",
    hint: "Describe a pet you have or would like — type, name, appearance.",
    difficulty: 1,
    followUps: [
      "Comment s'appelle ton animal ?",
      "Depuis quand l'as-tu ?",
      "Qui s'occupe de lui à la maison ?",
    ],
    modelAnswer: "Oui, j'ai un chat qui s'appelle Minou. Il est noir et blanc et il a trois ans. Je l'ai depuis qu'il était tout petit. C'est surtout moi qui m'occupe de lui : je lui donne à manger et je joue avec lui tous les jours. Il est très affectueux et il dort souvent sur mon lit.",
    keyVocab: [
      { fr: "un animal de compagnie", en: "a pet" },
      { fr: "s'occuper de", en: "to look after" },
      { fr: "affectueux/euse", en: "affectionate" },
      { fr: "donner à manger", en: "to feed" },
      { fr: "un chat", en: "a cat" },
      { fr: "dormir", en: "to sleep" },
    ],
  },
  {
    id: "ani_02",
    topicKey: "animals",
    text: "Quel est ton animal préféré et pourquoi ?",
    hint: "Name a favourite animal and give reasons for liking it.",
    difficulty: 1,
    followUps: [
      "Est-ce que tu l'as déjà vu en vrai ?",
      "Où vit cet animal ?",
      "Qu'est-ce qui le rend spécial ?",
    ],
    modelAnswer: "Mon animal préféré, c'est le dauphin, parce qu'il est intelligent et joueur. Je l'ai vu une fois dans un zoo marin pendant les vacances, et c'était incroyable de le regarder nager. Les dauphins vivent dans les océans et communiquent entre eux avec des sons spéciaux. Ce qui les rend spéciaux, c'est leur intelligence et leur sens social très développé.",
    keyVocab: [
      { fr: "un dauphin", en: "a dolphin" },
      { fr: "joueur/joueuse", en: "playful" },
      { fr: "nager", en: "to swim" },
      { fr: "communiquer", en: "to communicate" },
      { fr: "incroyable", en: "incredible" },
      { fr: "développé(e)", en: "developed" },
    ],
  },
  {
    id: "ani_03",
    topicKey: "animals",
    text: "Préfères-tu les chats ou les chiens ? Pourquoi ?",
    hint: "Compare cats and dogs and give a preference.",
    difficulty: 1,
    followUps: [
      "As-tu déjà eu les deux ?",
      "Quel animal est plus facile à s'occuper ?",
      "Un ami à toi a-t-il un animal intéressant ?",
    ],
    modelAnswer: "Je préfère les chiens parce qu'ils sont très loyaux et joueurs, et on peut les promener, ce qui est bon pour l'exercice. Les chats sont plus indépendants et demandent moins d'attention, ce qui peut être un avantage pour les gens occupés. Personnellement, je trouve les chiens plus faciles à s'occuper parce qu'ils montrent clairement leurs émotions.",
    keyVocab: [
      { fr: "loyal(e)", en: "loyal" },
      { fr: "promener", en: "to walk (an animal)" },
      { fr: "indépendant(e)", en: "independent" },
      { fr: "demander de l'attention", en: "to require attention" },
      { fr: "occupé(e)", en: "busy" },
      { fr: "montrer", en: "to show" },
    ],
  },
  {
    id: "ani_04",
    topicKey: "animals",
    text: "Quels animaux peut-on voir dans un zoo ?",
    hint: "List animals typically found at a zoo, describe one.",
    difficulty: 1,
    followUps: [
      "Aimes-tu aller au zoo ?",
      "Quel animal préfères-tu regarder au zoo ?",
      "Penses-tu que les zoos sont une bonne idée ?",
    ],
    modelAnswer: "Dans un zoo, on peut voir toutes sortes d'animaux, comme des lions, des éléphants, des girafes et des singes. J'aime bien aller au zoo, surtout pour observer les éléphants parce qu'ils sont énormes et fascinants. Cependant, je me demande parfois si c'est vraiment juste de garder des animaux sauvages en captivité.",
    keyVocab: [
      { fr: "un lion", en: "a lion" },
      { fr: "un éléphant", en: "an elephant" },
      { fr: "une girafe", en: "a giraffe" },
      { fr: "un singe", en: "a monkey" },
      { fr: "sauvage", en: "wild" },
      { fr: "la captivité", en: "captivity" },
    ],
  },
  {
    id: "ani_05",
    topicKey: "animals",
    text: "Décris un animal que tu as vu récemment.",
    hint: "Use passé composé to describe a recent animal sighting.",
    difficulty: 1,
    followUps: [
      "Où l'as-tu vu ?",
      "Qu'est-ce qu'il faisait ?",
      "As-tu eu peur ou étais-tu content(e) ?",
    ],
    modelAnswer: "Le week-end dernier, j'ai vu un écureuil dans le jardin de mes grands-parents. Il grimpait rapidement sur un arbre pour récupérer des noix. J'étais très content(e) de l'observer parce que c'est rare de voir des animaux sauvages de si près. Il n'avait pas du tout peur de nous.",
    keyVocab: [
      { fr: "un écureuil", en: "a squirrel" },
      { fr: "grimper", en: "to climb" },
      { fr: "une noix", en: "a nut" },
      { fr: "récupérer", en: "to fetch/get" },
      { fr: "de près", en: "closely/up close" },
      { fr: "rare", en: "rare" },
    ],
  },
  {
    id: "ani_06",
    topicKey: "animals",
    text: "Aimerais-tu avoir un animal de compagnie exotique ?",
    hint: "Discuss exotic pets and whether you'd want one.",
    difficulty: 2,
    followUps: [
      "Quel animal exotique choisirais-tu ?",
      "Quels seraient les défis d'avoir un tel animal ?",
      "Penses-tu que c'est éthique de garder des animaux exotiques chez soi ?",
    ],
    modelAnswer: "Personnellement, je n'aimerais pas avoir un animal exotique parce que je pense que ce n'est pas naturel pour eux de vivre enfermés dans une maison. Cependant, si je devais en choisir un, je choisirais peut-être un perroquet, car ils sont intelligents et peuvent apprendre à parler. Je pense que ce n'est pas toujours éthique de garder des animaux sauvages comme animaux de compagnie.",
    keyVocab: [
      { fr: "exotique", en: "exotic" },
      { fr: "enfermé(e)", en: "shut in/confined" },
      { fr: "un perroquet", en: "a parrot" },
      { fr: "apprendre", en: "to learn" },
      { fr: "éthique", en: "ethical" },
      { fr: "naturel(le)", en: "natural" },
    ],
  },
  {
    id: "ani_07",
    topicKey: "animals",
    text: "Pourquoi est-il important de protéger les espèces en voie de disparition ?",
    hint: "Discuss endangered species conservation.",
    difficulty: 2,
    followUps: [
      "Connais-tu une espèce en voie de disparition ?",
      "Quelles sont les causes principales de leur disparition ?",
      "Que peut faire une personne pour aider ?",
    ],
    modelAnswer: "Il est essentiel de protéger les espèces en voie de disparition parce que chaque animal joue un rôle important dans l'écosystème. Par exemple, le tigre est menacé à cause de la chasse illégale et de la destruction de son habitat. Si une espèce disparaît, cela peut déséquilibrer toute la chaîne alimentaire. Chacun peut aider en soutenant des associations de protection de la nature.",
    keyVocab: [
      { fr: "une espèce en voie de disparition", en: "an endangered species" },
      { fr: "un écosystème", en: "an ecosystem" },
      { fr: "menacé(e)", en: "threatened" },
      { fr: "la chasse illégale", en: "illegal hunting/poaching" },
      { fr: "déséquilibrer", en: "to unbalance" },
      { fr: "soutenir", en: "to support" },
    ],
  },
  {
    id: "ani_08",
    topicKey: "animals",
    text: "As-tu déjà adopté un animal dans un refuge ?",
    hint: "Discuss adopting animals from shelters, real or hypothetical.",
    difficulty: 2,
    followUps: [
      "Pourquoi est-ce important d'adopter plutôt que d'acheter ?",
      "Quels animaux se trouvent souvent dans les refuges ?",
      "Comment se passe le processus d'adoption ?",
    ],
    modelAnswer: "Non, je n'ai jamais adopté d'animal moi-même, mais ma tante a adopté un chien dans un refuge il y a deux ans. Je pense que c'est très important d'adopter plutôt que d'acheter, car il y a beaucoup d'animaux abandonnés qui ont besoin d'une famille. Le processus d'adoption implique généralement un entretien pour vérifier que l'animal ira dans un bon foyer.",
    keyVocab: [
      { fr: "adopter", en: "to adopt" },
      { fr: "un refuge", en: "a shelter" },
      { fr: "abandonné(e)", en: "abandoned" },
      { fr: "un entretien", en: "an interview" },
      { fr: "un foyer", en: "a home" },
      { fr: "impliquer", en: "to involve" },
    ],
  },
  {
    id: "ani_09",
    topicKey: "animals",
    text: "Quelle est la différence entre un animal domestique et un animal sauvage ?",
    hint: "Compare domesticated and wild animals.",
    difficulty: 2,
    followUps: [
      "Peut-on apprivoiser un animal sauvage ?",
      "Est-ce dangereux d'approcher un animal sauvage ?",
      "Quel animal sauvage aimerais-tu observer dans la nature ?",
    ],
    modelAnswer: "Un animal domestique vit avec les humains et dépend d'eux pour se nourrir et être protégé, tandis qu'un animal sauvage vit de manière autonome dans son habitat naturel. Il est possible d'apprivoiser certains animaux sauvages, mais cela peut être dangereux et n'est généralement pas recommandé. J'aimerais beaucoup observer des loups dans la nature, à distance bien sûr, car ce sont des animaux fascinants mais imprévisibles.",
    keyVocab: [
      { fr: "domestique", en: "domesticated" },
      { fr: "dépendre de", en: "to depend on" },
      { fr: "autonome", en: "self-sufficient/independent" },
      { fr: "apprivoiser", en: "to tame" },
      { fr: "un loup", en: "a wolf" },
      { fr: "imprévisible", en: "unpredictable" },
    ],
  },
  {
    id: "ani_10",
    topicKey: "animals",
    text: "As-tu peur de certains animaux ?",
    hint: "Discuss animal phobias or fears.",
    difficulty: 1,
    followUps: [
      "Depuis quand as-tu cette peur ?",
      "Qu'est-ce qui provoque cette peur, à ton avis ?",
      "Comment réagis-tu quand tu vois cet animal ?",
    ],
    modelAnswer: "Oui, j'ai très peur des araignées depuis que je suis petit(e). Je pense que cette peur vient d'un mauvais souvenir d'enfance quand une grosse araignée est tombée sur moi. Quand j'en vois une, je crie et je quitte immédiatement la pièce. Mes parents trouvent ça amusant, mais pour moi, c'est vraiment terrifiant.",
    keyVocab: [
      { fr: "avoir peur de", en: "to be afraid of" },
      { fr: "une araignée", en: "a spider" },
      { fr: "un souvenir", en: "a memory" },
      { fr: "crier", en: "to scream" },
      { fr: "quitter", en: "to leave" },
      { fr: "terrifiant(e)", en: "terrifying" },
    ],
  },
  {
    id: "ani_11",
    topicKey: "animals",
    text: "Comment les animaux nous aident-ils dans la vie quotidienne ?",
    hint: "Discuss working/service animals and their roles.",
    difficulty: 2,
    followUps: [
      "Connais-tu un exemple de chien guide ?",
      "Comment les animaux aident-ils les fermiers ?",
      "Penses-tu que les animaux méritent plus de reconnaissance ?",
    ],
    modelAnswer: "Les animaux nous aident de nombreuses façons : les chiens guides aident les personnes aveugles à se déplacer en sécurité, et les chevaux ou les bœufs aident encore les fermiers dans certains pays. Certains animaux, comme les chiens de thérapie, apportent aussi un soutien émotionnel important aux personnes malades ou âgées. Je pense que ces animaux méritent vraiment plus de reconnaissance pour leur travail essentiel.",
    keyVocab: [
      { fr: "un chien guide", en: "a guide dog" },
      { fr: "aveugle", en: "blind" },
      { fr: "se déplacer", en: "to get around" },
      { fr: "un fermier", en: "a farmer" },
      { fr: "un soutien émotionnel", en: "emotional support" },
      { fr: "la reconnaissance", en: "recognition" },
    ],
  },
  {
    id: "ani_12",
    topicKey: "animals",
    text: "Qu'est-ce que tu ferais si tu trouvais un animal blessé dans la rue ?",
    hint: "Use conditional to describe hypothetical actions helping an injured animal.",
    difficulty: 2,
    followUps: [
      "As-tu déjà vécu cette situation ?",
      "Qui appellerais-tu pour de l'aide ?",
      "Penses-tu que c'est notre responsabilité d'aider les animaux ?",
    ],
    modelAnswer: "Si je trouvais un animal blessé dans la rue, j'essaierais de rester calme et je l'approcherais doucement pour ne pas lui faire plus peur. Ensuite, j'appellerais un vétérinaire ou un refuge local pour demander de l'aide. Je pense que c'est notre responsabilité en tant qu'êtres humains d'aider les animaux qui souffrent, surtout quand c'est facile de le faire.",
    keyVocab: [
      { fr: "blessé(e)", en: "injured" },
      { fr: "approcher", en: "to approach" },
      { fr: "doucement", en: "gently" },
      { fr: "un vétérinaire", en: "a vet" },
      { fr: "souffrir", en: "to suffer" },
      { fr: "en tant que", en: "as (in the role of)" },
    ],
  },
  {
    id: "ani_13",
    topicKey: "animals",
    text: "Penses-tu que les gens devraient manger moins de viande pour protéger les animaux ?",
    hint: "Discuss diet, animal welfare, and ethical eating.",
    difficulty: 3,
    followUps: [
      "Es-tu végétarien(ne) ou végan(e) ?",
      "Quels sont les arguments pour et contre le végétarisme ?",
      "Penses-tu que l'élevage industriel est cruel ?",
    ],
    modelAnswer: "Je pense que manger moins de viande pourrait vraiment améliorer le bien-être des animaux, car l'élevage industriel est souvent très cruel envers eux. Personnellement, je ne suis pas végétarien(ne), mais j'essaie de réduire ma consommation de viande pour des raisons éthiques et environnementales. Certains diraient que c'est une question de choix personnel, mais je crois que nous devrions tous réfléchir à l'impact de notre alimentation.",
    keyVocab: [
      { fr: "le bien-être", en: "welfare" },
      { fr: "l'élevage industriel", en: "factory farming" },
      { fr: "cruel(le)", en: "cruel" },
      { fr: "végétarien(ne)", en: "vegetarian" },
      { fr: "la consommation", en: "consumption" },
      { fr: "l'alimentation", en: "diet/food" },
    ],
  },
  {
    id: "ani_14",
    topicKey: "animals",
    text: "Quel est l'impact du changement climatique sur les animaux sauvages ?",
    hint: "Discuss climate change effects on wildlife and habitats.",
    difficulty: 3,
    followUps: [
      "Quels animaux sont les plus touchés ?",
      "Que peuvent faire les gouvernements pour aider ?",
      "Es-tu optimiste concernant l'avenir de la biodiversité ?",
    ],
    modelAnswer: "Le changement climatique a un impact dévastateur sur les animaux sauvages : la fonte des glaces menace les ours polaires, tandis que la déforestation détruit l'habitat de nombreuses espèces tropicales. Les gouvernements devraient investir davantage dans la protection des habitats naturels et réduire les émissions de gaz à effet de serre. Malheureusement, je ne suis pas très optimiste, car les changements nécessaires prennent du temps à se mettre en place.",
    keyVocab: [
      { fr: "dévastateur/trice", en: "devastating" },
      { fr: "la fonte des glaces", en: "melting ice" },
      { fr: "un ours polaire", en: "a polar bear" },
      { fr: "la déforestation", en: "deforestation" },
      { fr: "les gaz à effet de serre", en: "greenhouse gases" },
      { fr: "la biodiversité", en: "biodiversity" },
    ],
  },
  {
    id: "ani_15",
    topicKey: "animals",
    text: "As-tu déjà visité une ferme ? Décris cette expérience.",
    hint: "Use passé composé to describe a farm visit.",
    difficulty: 2,
    followUps: [
      "Quels animaux as-tu vus ?",
      "Qu'est-ce que tu as appris sur la vie à la ferme ?",
      "Aimerais-tu vivre à la campagne un jour ?",
    ],
    modelAnswer: "Oui, quand j'étais plus jeune, ma classe a visité une ferme pédagogique. On a vu des vaches, des cochons, des poules et des moutons. On a appris comment on trait les vaches et comment on fabrique le fromage. C'était une expérience vraiment enrichissante, et depuis, j'aimerais bien vivre à la campagne un jour, entouré(e) d'animaux.",
    keyVocab: [
      { fr: "une vache", en: "a cow" },
      { fr: "un cochon", en: "a pig" },
      { fr: "une poule", en: "a hen" },
      { fr: "un mouton", en: "a sheep" },
      { fr: "traire", en: "to milk (an animal)" },
      { fr: "enrichissant(e)", en: "enriching" },
    ],
  },
  {
    id: "ani_16",
    topicKey: "animals",
    text: "Penses-tu que les cirques devraient utiliser des animaux dans leurs spectacles ?",
    hint: "Debate the ethics of animals in circuses.",
    difficulty: 3,
    followUps: [
      "As-tu déjà vu un spectacle avec des animaux ?",
      "Quels pays ont interdit cette pratique ?",
      "Que penses-tu des cirques sans animaux ?",
    ],
    modelAnswer: "Personnellement, je suis fermement contre l'utilisation d'animaux dans les cirques, car je pense que les forcer à effectuer des tours va à l'encontre de leur bien-être naturel. Plusieurs pays ont d'ailleurs interdit cette pratique ces dernières années, ce qui montre un changement positif des mentalités. Je préfère largement les cirques modernes, comme le Cirque du Soleil, qui n'utilisent que des artistes humains.",
    keyVocab: [
      { fr: "fermement", en: "firmly" },
      { fr: "forcer", en: "to force" },
      { fr: "un tour", en: "a trick" },
      { fr: "aller à l'encontre de", en: "to go against" },
      { fr: "interdire", en: "to ban" },
      { fr: "les mentalités", en: "attitudes/mindsets" },
    ],
  },
  {
    id: "ani_17",
    topicKey: "animals",
    text: "Quel rôle jouent les abeilles dans notre écosystème ?",
    hint: "Discuss the importance of bees and pollinators.",
    difficulty: 3,
    followUps: [
      "Pourquoi le nombre d'abeilles diminue-t-il ?",
      "Que se passerait-il si les abeilles disparaissaient ?",
      "Que peut-on faire pour les protéger ?",
    ],
    modelAnswer: "Les abeilles jouent un rôle absolument essentiel dans notre écosystème car elles pollinisent la majorité des plantes que nous consommons. Malheureusement, leur nombre diminue à cause des pesticides et de la perte d'habitat. Si les abeilles disparaissaient complètement, cela aurait des conséquences catastrophiques sur notre production alimentaire mondiale. On peut les protéger en plantant des fleurs locales et en évitant les pesticides chimiques dans nos jardins.",
    keyVocab: [
      { fr: "une abeille", en: "a bee" },
      { fr: "polliniser", en: "to pollinate" },
      { fr: "un pesticide", en: "a pesticide" },
      { fr: "catastrophique", en: "catastrophic" },
      { fr: "mondial(e)", en: "global" },
      { fr: "chimique", en: "chemical" },
    ],
  },
  {
    id: "ani_18",
    topicKey: "animals",
    text: "Si tu pouvais te transformer en animal pendant une journée, lequel choisirais-tu ?",
    hint: "Use conditional for a hypothetical/imaginative answer.",
    difficulty: 2,
    followUps: [
      "Pourquoi as-tu choisi cet animal ?",
      "Qu'est-ce que tu ferais pendant cette journée ?",
      "Qu'est-ce qui te manquerait de ta vie humaine ?",
    ],
    modelAnswer: "Si je pouvais me transformer en animal, je choisirais un aigle parce que j'aimerais énormément savoir ce que ça fait de voler librement dans le ciel. Je survolerais les montagnes et les océans pour découvrir le monde d'un point de vue complètement différent. Ce qui me manquerait le plus, ce serait probablement de pouvoir parler avec mes amis et ma famille.",
    keyVocab: [
      { fr: "se transformer en", en: "to turn into" },
      { fr: "un aigle", en: "an eagle" },
      { fr: "voler", en: "to fly" },
      { fr: "librement", en: "freely" },
      { fr: "survoler", en: "to fly over" },
      { fr: "manquer à quelqu'un", en: "to be missed by someone" },
    ],
  },
  {
    id: "ani_19",
    topicKey: "animals",
    text: "Quels animaux trouve-t-on typiquement dans la nature près de chez toi ?",
    hint: "Describe local wildlife in your area/region.",
    difficulty: 1,
    followUps: [
      "Les as-tu déjà vus toi-même ?",
      "Est-ce que ces animaux sont en danger ?",
      "Y a-t-il un parc naturel près de chez toi ?",
    ],
    modelAnswer: "Près de chez moi, on trouve souvent des renards, des hérissons et beaucoup d'oiseaux différents, comme des merles et des pigeons. J'ai vu un renard une fois tard le soir dans notre jardin, ce qui était assez surprenant. Il y a aussi un petit parc naturel à quelques kilomètres où on peut observer encore plus d'espèces locales.",
    keyVocab: [
      { fr: "un renard", en: "a fox" },
      { fr: "un hérisson", en: "a hedgehog" },
      { fr: "un oiseau", en: "a bird" },
      { fr: "un merle", en: "a blackbird" },
      { fr: "surprenant(e)", en: "surprising" },
      { fr: "un parc naturel", en: "a nature reserve" },
    ],
  },
  {
    id: "ani_20",
    topicKey: "animals",
    text: "Comment les animaux communiquent-ils entre eux ?",
    hint: "Discuss animal communication methods.",
    difficulty: 2,
    followUps: [
      "Connais-tu un exemple intéressant de communication animale ?",
      "Penses-tu que les animaux peuvent ressentir des émotions ?",
      "Aimerais-tu pouvoir comprendre le langage des animaux ?",
    ],
    modelAnswer: "Les animaux communiquent de nombreuses façons différentes : certains utilisent des sons, comme les baleines qui chantent sous l'eau, d'autres utilisent des gestes ou des odeurs. Je trouve fascinant que les abeilles communiquent en dansant pour indiquer où trouver de la nourriture. Je pense vraiment que les animaux ressentent des émotions, comme la joie ou la peur, même s'ils ne peuvent pas les exprimer avec des mots.",
    keyVocab: [
      { fr: "une baleine", en: "a whale" },
      { fr: "chanter", en: "to sing" },
      { fr: "un geste", en: "a gesture" },
      { fr: "une odeur", en: "a smell" },
      { fr: "danser", en: "to dance" },
      { fr: "ressentir", en: "to feel (an emotion)" },
    ],
  },
  {
    id: "ani_21",
    topicKey: "animals",
    text: "Est-ce que tu es allergique à des animaux ?",
    hint: "Discuss pet allergies.",
    difficulty: 1,
    followUps: [
      "Comment as-tu découvert cette allergie ?",
      "Est-ce que ça t'empêche d'avoir un animal ?",
      "Connais-tu quelqu'un avec une allergie plus grave ?",
    ],
    modelAnswer: "Oui, je suis légèrement allergique aux chats. Quand je suis près d'un chat, mes yeux deviennent rouges et j'éternue beaucoup. J'ai découvert cette allergie quand j'étais petit(e), chez ma tante qui a plusieurs chats. Cela ne m'empêche pas complètement de les approcher, mais je dois faire attention et prendre parfois des médicaments.",
    keyVocab: [
      { fr: "allergique à", en: "allergic to" },
      { fr: "éternuer", en: "to sneeze" },
      { fr: "empêcher", en: "to prevent" },
      { fr: "un médicament", en: "medicine" },
      { fr: "léger/légère", en: "slight/mild" },
      { fr: "découvrir", en: "to discover" },
    ],
  },
  {
    id: "ani_22",
    topicKey: "animals",
    text: "Penses-tu que les tests sur les animaux devraient être interdits ?",
    hint: "Debate animal testing ethics, especially in cosmetics/science.",
    difficulty: 3,
    followUps: [
      "Y a-t-il des alternatives aux tests sur les animaux ?",
      "Dans quels cas ces tests sont-ils encore utilisés ?",
      "Comment peux-tu, en tant que consommateur, agir contre cette pratique ?",
    ],
    modelAnswer: "Je pense que les tests sur les animaux devraient être interdits, surtout pour les cosmétiques, car il existe maintenant des alternatives comme les tests sur des tissus artificiels ou des simulations informatiques. Cependant, dans le domaine médical, certains tests restent nécessaires pour développer des traitements qui sauvent des vies humaines. En tant que consommateur, je peux choisir d'acheter des produits qui ne sont pas testés sur les animaux.",
    keyVocab: [
      { fr: "interdit(e)", en: "banned" },
      { fr: "les cosmétiques", en: "cosmetics" },
      { fr: "un tissu artificiel", en: "artificial tissue" },
      { fr: "un traitement", en: "a treatment" },
      { fr: "sauver des vies", en: "to save lives" },
      { fr: "un consommateur", en: "a consumer" },
    ],
  },
  {
    id: "ani_23",
    topicKey: "animals",
    text: "Quel animal représenterait le mieux ta personnalité ?",
    hint: "Compare your personality traits to an animal's characteristics.",
    difficulty: 2,
    followUps: [
      "Pourquoi as-tu choisi cet animal ?",
      "Est-ce que tes amis seraient d'accord avec ton choix ?",
      "Quel animal représenterait un membre de ta famille ?",
    ],
    modelAnswer: "Je pense qu'un chien me représenterait bien parce que je suis quelqu'un de loyal, sociable et énergique. Comme un chien, j'aime être entouré(e) de mes amis et je suis toujours prêt(e) à aider les autres. Mes amis seraient probablement d'accord, car ils me disent souvent que je suis très fidèle et enthousiaste dans tout ce que je fais.",
    keyVocab: [
      { fr: "représenter", en: "to represent" },
      { fr: "sociable", en: "sociable" },
      { fr: "énergique", en: "energetic" },
      { fr: "entouré(e) de", en: "surrounded by" },
      { fr: "fidèle", en: "loyal/faithful" },
      { fr: "enthousiaste", en: "enthusiastic" },
    ],
  },
  {
    id: "ani_24",
    topicKey: "animals",
    text: "Comment la déforestation affecte-t-elle les animaux qui vivent dans la forêt ?",
    hint: "Discuss habitat loss due to deforestation.",
    difficulty: 3,
    followUps: [
      "Quels animaux sont les plus touchés par la déforestation ?",
      "Pourquoi la déforestation continue-t-elle malgré les avertissements ?",
      "Que pourrait-on faire pour ralentir ce phénomène ?",
    ],
    modelAnswer: "La déforestation détruit l'habitat naturel de millions d'animaux, les forçant à se déplacer ou à disparaître complètement. Les orangs-outans, par exemple, sont particulièrement menacés à cause de la déforestation en Indonésie pour créer des plantations de palmiers à huile. Malgré les nombreux avertissements des scientifiques, la déforestation continue pour des raisons économiques. On pourrait ralentir ce phénomène en consommant des produits plus responsables.",
    keyVocab: [
      { fr: "détruire", en: "to destroy" },
      { fr: "un orang-outan", en: "an orangutan" },
      { fr: "une plantation", en: "a plantation" },
      { fr: "l'huile de palme", en: "palm oil" },
      { fr: "un avertissement", en: "a warning" },
      { fr: "ralentir", en: "to slow down" },
    ],
  },
  {
    id: "ani_25",
    topicKey: "animals",
    text: "As-tu déjà fait du bénévolat pour aider des animaux ?",
    hint: "Discuss volunteering with animals, real or hypothetical.",
    difficulty: 2,
    followUps: [
      "Qu'est-ce que tu as fait exactement ?",
      "Qu'est-ce que cette expérience t'a appris ?",
      "Recommanderais-tu cette expérience à d'autres ?",
    ],
    modelAnswer: "L'été dernier, j'ai fait du bénévolat dans un refuge pour animaux près de chez moi. J'ai aidé à nourrir les chiens et les chats, et j'ai aussi nettoyé leurs cages. Cette expérience m'a appris beaucoup sur la patience et la responsabilité, et elle m'a rendu(e) plus sensible à la cause animale. Je recommanderais vivement cette expérience à tous ceux qui aiment les animaux.",
    keyVocab: [
      { fr: "le bénévolat", en: "volunteering" },
      { fr: "nourrir", en: "to feed" },
      { fr: "nettoyer", en: "to clean" },
      { fr: "une cage", en: "a cage" },
      { fr: "sensible", en: "sensitive/aware" },
      { fr: "recommander", en: "to recommend" },
    ],
  },
  {
    id: "ani_26",
    topicKey: "animals",
    text: "Quels sont les avantages et les inconvénients d'avoir un animal de compagnie ?",
    hint: "Give a balanced view of pet ownership pros and cons.",
    difficulty: 2,
    followUps: [
      "Qu'est-ce qui coûte le plus cher dans l'entretien d'un animal ?",
      "Est-ce que tous les gens devraient avoir un animal ?",
      "Quel est le plus grand avantage émotionnel d'un animal ?",
    ],
    modelAnswer: "Avoir un animal de compagnie apporte beaucoup de joie et de compagnie, ce qui peut réduire le stress et la solitude. Cependant, cela demande aussi du temps, de l'argent et de la responsabilité, notamment pour la nourriture et les visites chez le vétérinaire. Je ne pense pas que tout le monde devrait avoir un animal, car certaines personnes n'ont pas assez de temps pour bien s'en occuper.",
    keyVocab: [
      { fr: "la compagnie", en: "company" },
      { fr: "la solitude", en: "loneliness" },
      { fr: "l'entretien", en: "upkeep/maintenance" },
      { fr: "coûter cher", en: "to be expensive" },
      { fr: "une visite", en: "a visit" },
      { fr: "s'en occuper", en: "to look after it" },
    ],
  },
  {
    id: "ani_27",
    topicKey: "animals",
    text: "Penses-tu que les zoos modernes ont un rôle utile dans la conservation ?",
    hint: "Discuss the role of zoos in conservation vs entertainment.",
    difficulty: 3,
    followUps: [
      "Les zoos aident-ils vraiment les espèces menacées ?",
      "Quelle est la différence entre un bon zoo et un mauvais zoo ?",
      "Préférerais-tu voir des animaux dans leur habitat naturel ?",
    ],
    modelAnswer: "Je pense que les zoos modernes peuvent jouer un rôle utile dans la conservation, notamment à travers des programmes de reproduction pour les espèces menacées et l'éducation du public. Cependant, tous les zoos ne se valent pas : certains privilégient le divertissement plutôt que le bien-être animal. Personnellement, je préférerais toujours voir des animaux dans leur habitat naturel, mais je reconnais que ce n'est pas toujours possible pour tout le monde.",
    keyVocab: [
      { fr: "la conservation", en: "conservation" },
      { fr: "un programme de reproduction", en: "a breeding programme" },
      { fr: "privilégier", en: "to favour/prioritise" },
      { fr: "le divertissement", en: "entertainment" },
      { fr: "reconnaître", en: "to acknowledge" },
      { fr: "un habitat naturel", en: "a natural habitat" },
    ],
  },
  {
    id: "ani_28",
    topicKey: "animals",
    text: "Comment penses-tu que la relation entre les humains et les animaux va évoluer à l'avenir ?",
    hint: "Speculate about future human-animal relationships using the future tense.",
    difficulty: 3,
    followUps: [
      "La technologie va-t-elle changer cette relation ?",
      "Penses-tu que les gens seront plus respectueux envers les animaux ?",
      "Y aura-t-il plus ou moins d'espèces sauvages dans cinquante ans ?",
    ],
    modelAnswer: "Je pense que la relation entre les humains et les animaux deviendra probablement plus respectueuse à mesure que les gens prendront davantage conscience des enjeux environnementaux. La technologie jouera sans doute un rôle clé, par exemple avec des drones pour surveiller les espèces menacées sans les déranger. Malheureusement, je crains qu'il y ait moins d'espèces sauvages dans cinquante ans si rien ne change concrètement.",
    keyVocab: [
      { fr: "prendre conscience de", en: "to become aware of" },
      { fr: "un enjeu", en: "an issue/stake" },
      { fr: "un drone", en: "a drone" },
      { fr: "surveiller", en: "to monitor" },
      { fr: "déranger", en: "to disturb" },
      { fr: "craindre", en: "to fear" },
    ],
  },
  {
    id: "ani_29",
    topicKey: "animals",
    text: "Quel est le rôle des animaux dans la culture et les traditions de ton pays ?",
    hint: "Discuss animals in cultural symbolism, folklore, or festivals.",
    difficulty: 3,
    followUps: [
      "Y a-t-il un animal symbolique dans ta culture ?",
      "Les animaux apparaissent-ils dans des histoires ou légendes locales ?",
      "Est-ce que cette relation culturelle a changé au fil du temps ?",
    ],
    modelAnswer: "Dans ma culture, certains animaux occupent une place symbolique importante, comme le lion qui représente le courage et la force. Les animaux apparaissent souvent dans les contes et légendes traditionnelles, où ils incarnent parfois des traits humains comme la ruse ou la sagesse. Je pense que cette relation culturelle a beaucoup changé au fil du temps, notamment avec l'urbanisation qui éloigne les gens du monde naturel.",
    keyVocab: [
      { fr: "symbolique", en: "symbolic" },
      { fr: "le courage", en: "courage" },
      { fr: "un conte", en: "a tale" },
      { fr: "incarner", en: "to embody" },
      { fr: "la ruse", en: "cunning" },
      { fr: "la sagesse", en: "wisdom" },
    ],
  },
  {
    id: "ani_30",
    topicKey: "animals",
    text: "Dans quelle mesure sommes-nous responsables de la protection de la faune mondiale ?",
    hint: "Discuss global responsibility for wildlife protection.",
    difficulty: 3,
    followUps: [
      "Quels pays font le plus d'efforts, selon toi ?",
      "Est-ce la responsabilité des gouvernements ou des individus ?",
      "Quelle action concrète pourrais-tu entreprendre ?",
    ],
    modelAnswer: "Je pense que nous sommes tous responsables, dans une certaine mesure, de la protection de la faune mondiale, car nos choix de consommation ont un impact direct sur les écosystèmes partout dans le monde. Bien que les gouvernements aient un rôle majeur à jouer à travers des lois et des accords internationaux, chaque individu peut aussi agir, par exemple en réduisant son empreinte écologique. Personnellement, j'essaierais de m'engager davantage dans des associations de protection de la nature.",
    keyVocab: [
      { fr: "la faune", en: "wildlife/fauna" },
      { fr: "un accord international", en: "an international agreement" },
      { fr: "une empreinte écologique", en: "an ecological footprint" },
      { fr: "s'engager", en: "to get involved/commit" },
      { fr: "une loi", en: "a law" },
      { fr: "un individu", en: "an individual" },
    ],
  },

  // ── LES TRANSPORTS ───────────────────────────────────────────────────────
  {
    id: "tra_01",
    topicKey: "transport",
    text: "Comment te déplaces-tu d'habitude ?",
    hint: "Describe your usual mode of transport for daily journeys.",
    difficulty: 1,
    followUps: [
      "Est-ce que tu aimes ce moyen de transport ?",
      "Combien de temps met ton trajet habituel ?",
      "Utilises-tu toujours le même moyen de transport ?",
    ],
    modelAnswer: "D'habitude, je me déplace en bus pour aller à l'école et en ville. J'aime bien ce moyen de transport parce que c'est pratique et pas trop cher. Le trajet dure environ vingt minutes. Le week-end, je préfère parfois marcher si la distance n'est pas trop longue, car ça me permet de faire de l'exercice.",
    keyVocab: [
      { fr: "se déplacer", en: "to get around/travel" },
      { fr: "un trajet", en: "a journey" },
      { fr: "pratique", en: "practical/convenient" },
      { fr: "marcher", en: "to walk" },
      { fr: "une distance", en: "a distance" },
      { fr: "un moyen de transport", en: "a means of transport" },
    ],
  },
  {
    id: "tra_02",
    topicKey: "transport",
    text: "Quel est ton moyen de transport préféré ?",
    hint: "Name a favourite transport type and explain why.",
    difficulty: 1,
    followUps: [
      "L'utilises-tu souvent ?",
      "Qu'est-ce qui te plaît particulièrement ?",
      "Quel moyen de transport n'aimes-tu pas ?",
    ],
    modelAnswer: "Mon moyen de transport préféré, c'est le vélo, parce que c'est rapide, écologique et bon pour la santé. Je l'utilise assez souvent, surtout l'été, pour aller chez mes amis. Ce qui me plaît le plus, c'est la sensation de liberté que ça procure. En revanche, je n'aime pas trop prendre l'avion parce que je trouve ça stressant.",
    keyVocab: [
      { fr: "un vélo", en: "a bike" },
      { fr: "écologique", en: "eco-friendly" },
      { fr: "la liberté", en: "freedom" },
      { fr: "procurer", en: "to provide" },
      { fr: "stressant(e)", en: "stressful" },
      { fr: "un avion", en: "a plane" },
    ],
  },
  {
    id: "tra_03",
    topicKey: "transport",
    text: "Comment vas-tu à l'école chaque jour ?",
    hint: "Describe your daily commute to school.",
    difficulty: 1,
    followUps: [
      "Combien de temps dure le trajet ?",
      "Voyages-tu seul(e) ou avec quelqu'un ?",
      "Est-ce que le trajet est agréable ?",
    ],
    modelAnswer: "Chaque jour, je vais à l'école en voiture avec ma mère parce que l'école est un peu loin de chez nous. Le trajet dure environ quinze minutes le matin. J'aime bien ce moment parce qu'on discute ensemble en chemin. Parfois, quand il fait beau, je préfère y aller à pied avec mon frère.",
    keyVocab: [
      { fr: "une voiture", en: "a car" },
      { fr: "loin de", en: "far from" },
      { fr: "en chemin", en: "on the way" },
      { fr: "à pied", en: "on foot" },
      { fr: "agréable", en: "pleasant" },
      { fr: "discuter", en: "to chat" },
    ],
  },
  {
    id: "tra_04",
    topicKey: "transport",
    text: "As-tu déjà voyagé en train ?",
    hint: "Use passé composé to describe a train journey experience.",
    difficulty: 1,
    followUps: [
      "Où allais-tu ?",
      "Comment s'est passé le voyage ?",
      "Préfères-tu le train ou la voiture ?",
    ],
    modelAnswer: "Oui, l'été dernier, j'ai voyagé en train pour rendre visite à mes grands-parents qui habitent dans une autre ville. Le voyage a duré environ deux heures et s'est très bien passé. J'ai pu lire un livre et regarder le paysage par la fenêtre. Je préfère le train à la voiture parce qu'on peut se détendre pendant le trajet.",
    keyVocab: [
      { fr: "un train", en: "a train" },
      { fr: "rendre visite à", en: "to visit (someone)" },
      { fr: "un paysage", en: "scenery/landscape" },
      { fr: "une fenêtre", en: "a window" },
      { fr: "se détendre", en: "to relax" },
      { fr: "durer", en: "to last" },
    ],
  },
  {
    id: "tra_05",
    topicKey: "transport",
    text: "Sais-tu conduire ou apprends-tu à conduire ?",
    hint: "Discuss driving lessons or plans to learn.",
    difficulty: 1,
    followUps: [
      "Depuis quand prends-tu des leçons ?",
      "Est-ce que conduire te fait peur ?",
      "Quel genre de voiture aimerais-tu conduire ?",
    ],
    modelAnswer: "Je n'ai pas encore l'âge de conduire, mais j'ai vraiment hâte de commencer à prendre des leçons dans deux ans. Ça me fait un peu peur parce que je pense que c'est une grande responsabilité, mais je suis aussi très excité(e) à l'idée d'avoir plus d'indépendance. J'aimerais bien conduire une petite voiture électrique un jour.",
    keyVocab: [
      { fr: "conduire", en: "to drive" },
      { fr: "avoir hâte de", en: "to look forward to" },
      { fr: "une leçon", en: "a lesson" },
      { fr: "l'indépendance", en: "independence" },
      { fr: "une voiture électrique", en: "an electric car" },
      { fr: "une responsabilité", en: "a responsibility" },
    ],
  },
  {
    id: "tra_06",
    topicKey: "transport",
    text: "Quels sont les avantages des transports en commun ?",
    hint: "Discuss benefits of public transport.",
    difficulty: 2,
    followUps: [
      "Utilises-tu souvent les transports en commun ?",
      "Quels sont les inconvénients selon toi ?",
      "Est-ce que les transports en commun sont bien développés dans ta ville ?",
    ],
    modelAnswer: "Les transports en commun présentent beaucoup d'avantages : ils sont généralement moins chers que la voiture, ils réduisent la pollution et évitent les embouteillages. J'utilise souvent le bus et le métro pour aller en ville. Cependant, ils peuvent parfois être bondés ou en retard, ce qui est frustrant. Dans ma ville, le réseau est assez bien développé, avec des bus fréquents.",
    keyVocab: [
      { fr: "les transports en commun", en: "public transport" },
      { fr: "un embouteillage", en: "a traffic jam" },
      { fr: "bondé(e)", en: "crowded" },
      { fr: "en retard", en: "late" },
      { fr: "un réseau", en: "a network" },
      { fr: "fréquent(e)", en: "frequent" },
    ],
  },
  {
    id: "tra_07",
    topicKey: "transport",
    text: "Penses-tu que la voiture individuelle est un problème pour l'environnement ?",
    hint: "Discuss cars and their environmental impact.",
    difficulty: 2,
    followUps: [
      "Quelles alternatives existent à la voiture ?",
      "Est-ce que ta famille possède une voiture ?",
      "Que penses-tu des voitures électriques ?",
    ],
    modelAnswer: "Oui, je pense que la voiture individuelle contribue énormément à la pollution de l'air et aux émissions de gaz à effet de serre. Il existe heureusement des alternatives comme le covoiturage, le vélo ou les transports en commun. Ma famille possède une voiture, mais on essaie de l'utiliser le moins possible. Je pense que les voitures électriques sont une bonne solution, même si elles ne sont pas encore parfaites.",
    keyVocab: [
      { fr: "contribuer à", en: "to contribute to" },
      { fr: "les émissions", en: "emissions" },
      { fr: "le covoiturage", en: "carpooling" },
      { fr: "une alternative", en: "an alternative" },
      { fr: "posséder", en: "to own" },
      { fr: "parfait(e)", en: "perfect" },
    ],
  },
  {
    id: "tra_08",
    topicKey: "transport",
    text: "As-tu déjà pris l'avion ? Raconte ton expérience.",
    hint: "Use passé composé to describe a flying experience.",
    difficulty: 2,
    followUps: [
      "Où allais-tu ?",
      "Est-ce que tu as aimé voler ?",
      "Qu'est-ce qui t'a impressionné ou inquiété ?",
    ],
    modelAnswer: "Oui, j'ai pris l'avion plusieurs fois, surtout pour aller en vacances en Espagne avec ma famille. La première fois, j'étais assez nerveux/nerveuse pendant le décollage, mais j'ai vite adoré regarder les nuages par le hublot. Ce qui m'a le plus impressionné, c'était la vue incroyable depuis le ciel. Maintenant, je trouve ça vraiment excitant de voyager en avion.",
    keyVocab: [
      { fr: "voler", en: "to fly" },
      { fr: "le décollage", en: "take-off" },
      { fr: "un nuage", en: "a cloud" },
      { fr: "un hublot", en: "a plane window" },
      { fr: "impressionner", en: "to impress" },
      { fr: "la vue", en: "the view" },
    ],
  },
  {
    id: "tra_09",
    topicKey: "transport",
    text: "Qu'est-ce que tu ferais pour améliorer les transports dans ta ville ?",
    hint: "Use conditional to suggest improvements to local transport.",
    difficulty: 2,
    followUps: [
      "Quel est le plus gros problème actuellement ?",
      "Est-ce que ça coûterait cher à mettre en place ?",
      "Qui devrait financer ces améliorations ?",
    ],
    modelAnswer: "Si je pouvais améliorer les transports dans ma ville, j'ajouterais plus de pistes cyclables et je rendrais les bus plus fréquents, surtout aux heures de pointe. Le plus gros problème actuellement, c'est la circulation, qui rend les trajets beaucoup plus longs. Je pense que le gouvernement local devrait investir davantage dans les infrastructures pour encourager les gens à moins utiliser leur voiture.",
    keyVocab: [
      { fr: "une piste cyclable", en: "a cycle path" },
      { fr: "les heures de pointe", en: "rush hour" },
      { fr: "la circulation", en: "traffic" },
      { fr: "investir", en: "to invest" },
      { fr: "une infrastructure", en: "infrastructure" },
      { fr: "encourager", en: "to encourage" },
    ],
  },
  {
    id: "tra_10",
    topicKey: "transport",
    text: "Décris un voyage en voiture mémorable que tu as fait.",
    hint: "Use passé composé to narrate a memorable car journey.",
    difficulty: 2,
    followUps: [
      "Où allais-tu et avec qui ?",
      "Qu'est-ce qui a rendu ce voyage spécial ?",
      "Y a-t-il eu des problèmes pendant le trajet ?",
    ],
    modelAnswer: "L'année dernière, ma famille et moi avons fait un long voyage en voiture jusqu'au sud de la France pour les vacances. Le trajet a duré presque huit heures, mais on s'est bien amusés en chantant et en jouant à des jeux. Malheureusement, on a eu un petit problème de pneu crevé en route, ce qui nous a fait perdre une heure. Malgré ça, c'était un voyage vraiment mémorable.",
    keyVocab: [
      { fr: "un pneu crevé", en: "a flat tyre" },
      { fr: "chanter", en: "to sing" },
      { fr: "en route", en: "on the way" },
      { fr: "perdre du temps", en: "to lose time" },
      { fr: "mémorable", en: "memorable" },
      { fr: "malgré", en: "despite" },
    ],
  },
  {
    id: "tra_11",
    topicKey: "transport",
    text: "Penses-tu que les vélos électriques sont une bonne solution pour les villes ?",
    hint: "Discuss e-bikes as urban transport solutions.",
    difficulty: 2,
    followUps: [
      "As-tu déjà essayé un vélo électrique ?",
      "Quels sont les avantages par rapport à un vélo normal ?",
      "Sont-ils accessibles à tout le monde selon toi ?",
    ],
    modelAnswer: "Oui, je pense que les vélos électriques sont une excellente solution pour les villes parce qu'ils permettent de se déplacer rapidement sans trop d'effort physique, ce qui les rend accessibles même aux personnes moins sportives. J'ai essayé un vélo électrique une fois chez un ami et j'ai trouvé ça très pratique pour monter les côtes. Cependant, ils restent assez chers, ce qui peut être un obstacle pour certaines personnes.",
    keyVocab: [
      { fr: "un vélo électrique", en: "an e-bike" },
      { fr: "un effort physique", en: "physical effort" },
      { fr: "accessible", en: "accessible" },
      { fr: "une côte", en: "a hill/slope" },
      { fr: "un obstacle", en: "an obstacle" },
      { fr: "pratique", en: "practical" },
    ],
  },
  {
    id: "tra_12",
    topicKey: "transport",
    text: "Comment les gens se déplaçaient-ils avant l'invention de la voiture ?",
    hint: "Discuss historical transport methods using the imperfect tense.",
    difficulty: 2,
    followUps: [
      "Quels étaient les inconvénients de ces moyens de transport ?",
      "Penses-tu que les voyages étaient plus lents à l'époque ?",
      "Quel ancien moyen de transport trouves-tu intéressant ?",
    ],
    modelAnswer: "Avant l'invention de la voiture, les gens se déplaçaient souvent à cheval, en calèche ou tout simplement à pied. Les voyages étaient beaucoup plus lents et fatigants qu'aujourd'hui, et il fallait parfois plusieurs jours pour parcourir une distance qu'on fait maintenant en quelques heures. Je trouve les calèches assez fascinantes, même si je suis content(e) de vivre à une époque avec des transports plus rapides.",
    keyVocab: [
      { fr: "à cheval", en: "on horseback" },
      { fr: "une calèche", en: "a horse-drawn carriage" },
      { fr: "lent(e)", en: "slow" },
      { fr: "fatigant(e)", en: "tiring" },
      { fr: "parcourir", en: "to travel/cover (distance)" },
      { fr: "une époque", en: "an era" },
    ],
  },
  {
    id: "tra_13",
    topicKey: "transport",
    text: "Quels sont les problèmes liés à la circulation dans les grandes villes ?",
    hint: "Discuss traffic congestion problems in cities.",
    difficulty: 2,
    followUps: [
      "Comment la circulation affecte-t-elle la qualité de l'air ?",
      "Quelles solutions les villes essaient-elles de mettre en place ?",
      "Est-ce pire dans certaines villes que d'autres ?",
    ],
    modelAnswer: "Dans les grandes villes, la circulation cause énormément de problèmes : les embouteillages font perdre du temps aux gens et augmentent la pollution de l'air. Certaines villes essaient de résoudre ce problème en créant des zones piétonnes ou en limitant l'accès des voitures au centre-ville. Je pense que ces solutions sont efficaces, mais il faudrait aussi améliorer les transports en commun pour vraiment réduire le nombre de voitures.",
    keyVocab: [
      { fr: "la circulation", en: "traffic" },
      { fr: "résoudre", en: "to solve" },
      { fr: "une zone piétonne", en: "a pedestrian zone" },
      { fr: "limiter", en: "to limit" },
      { fr: "le centre-ville", en: "town/city centre" },
      { fr: "efficace", en: "effective" },
    ],
  },
  {
    id: "tra_14",
    topicKey: "transport",
    text: "Comment penses-tu que nous voyagerons dans cinquante ans ?",
    hint: "Speculate about future transport using the future tense.",
    difficulty: 3,
    followUps: [
      "Y aura-t-il encore des voitures individuelles ?",
      "Penses-tu que les voyages spatiaux deviendront courants ?",
      "Quel serait le moyen de transport idéal du futur ?",
    ],
    modelAnswer: "Je pense que dans cinquante ans, la plupart des véhicules seront électriques ou fonctionneront à l'hydrogène, et les voitures autonomes seront probablement la norme. Il y aura sans doute moins de voitures individuelles, remplacées par des systèmes de transport partagé plus intelligents. Je doute que les voyages spatiaux deviennent vraiment courants pour le grand public, mais on ne sait jamais avec les progrès technologiques.",
    keyVocab: [
      { fr: "un véhicule", en: "a vehicle" },
      { fr: "l'hydrogène", en: "hydrogen" },
      { fr: "autonome", en: "self-driving/autonomous" },
      { fr: "la norme", en: "the norm" },
      { fr: "partagé(e)", en: "shared" },
      { fr: "le grand public", en: "the general public" },
    ],
  },
  {
    id: "tra_15",
    topicKey: "transport",
    text: "Penses-tu que les voitures autonomes sont sûres ?",
    hint: "Discuss the safety and ethics of self-driving cars.",
    difficulty: 3,
    followUps: [
      "Ferais-tu confiance à une voiture autonome ?",
      "Quels problèmes éthiques cela pose-t-il ?",
      "Qui serait responsable en cas d'accident ?",
    ],
    modelAnswer: "C'est une question complexe : d'un côté, les voitures autonomes pourraient réduire les accidents causés par l'erreur humaine, mais d'un autre côté, la technologie n'est pas encore parfaite et peut tomber en panne. Personnellement, je n'aurais pas totalement confiance en une voiture autonome pour le moment. Il y a aussi un vrai problème éthique concernant la responsabilité en cas d'accident : est-ce le conducteur, le fabricant, ou le logiciel qui serait fautif ?",
    keyVocab: [
      { fr: "une erreur humaine", en: "human error" },
      { fr: "tomber en panne", en: "to break down" },
      { fr: "faire confiance à", en: "to trust" },
      { fr: "un fabricant", en: "a manufacturer" },
      { fr: "un logiciel", en: "software" },
      { fr: "fautif/ve", en: "at fault" },
    ],
  },
  {
    id: "tra_16",
    topicKey: "transport",
    text: "Quel est l'impact du tourisme aérien sur l'environnement ?",
    hint: "Discuss air travel's environmental footprint and flight shame.",
    difficulty: 3,
    followUps: [
      "As-tu déjà entendu parler de la 'honte de prendre l'avion' ?",
      "Serais-tu prêt(e) à voyager moins en avion pour l'environnement ?",
      "Quelles alternatives existent pour les longs trajets ?",
    ],
    modelAnswer: "Le tourisme aérien a un impact considérable sur l'environnement, car les avions émettent énormément de dioxyde de carbone à chaque vol. Ce phénomène a donné naissance au concept de la 'honte de prendre l'avion', qui pousse certaines personnes à réduire leurs voyages en avion. Personnellement, je serais prêt(e) à voyager davantage en train pour les trajets courts, même si c'est parfois moins pratique et plus long.",
    keyVocab: [
      { fr: "le dioxyde de carbone", en: "carbon dioxide" },
      { fr: "un vol", en: "a flight" },
      { fr: "la honte", en: "shame" },
      { fr: "pousser quelqu'un à", en: "to push someone to" },
      { fr: "réduire", en: "to reduce" },
      { fr: "un trajet court", en: "a short journey" },
    ],
  },
  {
    id: "tra_17",
    topicKey: "transport",
    text: "Penses-tu que les gouvernements devraient investir davantage dans les trains à grande vitesse ?",
    hint: "Discuss high-speed rail investment.",
    difficulty: 3,
    followUps: [
      "Quels sont les avantages du TGV par rapport à l'avion ?",
      "Ton pays a-t-il un bon réseau ferroviaire ?",
      "Est-ce que ça coûte trop cher pour les gouvernements ?",
    ],
    modelAnswer: "Je pense que oui, les gouvernements devraient investir davantage dans les trains à grande vitesse, car ils offrent une alternative rapide et moins polluante à l'avion pour les trajets nationaux. Le TGV, par exemple, permet de traverser la France en quelques heures seulement. Même si ces projets coûtent extrêmement cher au départ, je pense que les bénéfices environnementaux et économiques à long terme en valent la peine.",
    keyVocab: [
      { fr: "un train à grande vitesse", en: "a high-speed train" },
      { fr: "un réseau ferroviaire", en: "a railway network" },
      { fr: "traverser", en: "to cross" },
      { fr: "un bénéfice", en: "a benefit" },
      { fr: "en valoir la peine", en: "to be worth it" },
      { fr: "national(e)", en: "domestic/national" },
    ],
  },
  {
    id: "tra_18",
    topicKey: "transport",
    text: "As-tu déjà été bloqué(e) dans les embouteillages ? Décris cette expérience.",
    hint: "Use passé composé to narrate a traffic jam experience.",
    difficulty: 2,
    followUps: [
      "Combien de temps es-tu resté(e) bloqué(e) ?",
      "Comment as-tu réagi ?",
      "As-tu manqué quelque chose d'important à cause de ça ?",
    ],
    modelAnswer: "Oui, une fois, on est resté bloqués dans les embouteillages pendant presque deux heures en rentrant de vacances. C'était vraiment frustrant parce qu'il faisait très chaud dans la voiture et on avait faim. J'ai essayé de rester calme en écoutant de la musique, mais mes parents étaient assez stressés. Malheureusement, on a raté le début d'un dîner de famille à cause de ce retard.",
    keyVocab: [
      { fr: "bloqué(e)", en: "stuck" },
      { fr: "frustrant(e)", en: "frustrating" },
      { fr: "rester calme", en: "to stay calm" },
      { fr: "rater", en: "to miss" },
      { fr: "un retard", en: "a delay" },
      { fr: "stressé(e)", en: "stressed" },
    ],
  },
  {
    id: "tra_19",
    topicKey: "transport",
    text: "Quels sont les défis des transports dans les zones rurales ?",
    hint: "Discuss transport challenges in rural areas.",
    difficulty: 3,
    followUps: [
      "Comment les gens se déplacent-ils à la campagne ?",
      "Est-ce que le manque de transport limite les opportunités des habitants ?",
      "Que pourrait-on faire pour améliorer la situation ?",
    ],
    modelAnswer: "Dans les zones rurales, les transports en commun sont souvent beaucoup moins fréquents, voire inexistants, ce qui oblige les habitants à dépendre fortement de leur voiture personnelle. Cela peut vraiment limiter les opportunités des personnes âgées ou des jeunes qui n'ont pas de permis de conduire. Pour améliorer la situation, les gouvernements pourraient investir dans des services de bus à la demande ou des solutions de covoiturage local.",
    keyVocab: [
      { fr: "une zone rurale", en: "a rural area" },
      { fr: "inexistant(e)", en: "non-existent" },
      { fr: "dépendre de", en: "to depend on" },
      { fr: "un permis de conduire", en: "a driving licence" },
      { fr: "à la demande", en: "on-demand" },
      { fr: "local(e)", en: "local" },
    ],
  },
  {
    id: "tra_20",
    topicKey: "transport",
    text: "Si tu pouvais inventer un nouveau moyen de transport, comment serait-il ?",
    hint: "Use conditional to imagine a new form of transport.",
    difficulty: 2,
    followUps: [
      "Quel problème résoudrait-il ?",
      "Serait-il rapide ou plutôt écologique ?",
      "Qui l'utiliserait le plus ?",
    ],
    modelAnswer: "Si je pouvais inventer un nouveau moyen de transport, ce serait une capsule volante silencieuse, alimentée entièrement par l'énergie solaire, capable de transporter plusieurs passagers rapidement sans polluer. Ce moyen de transport résoudrait à la fois le problème des embouteillages et celui de la pollution. Je pense que ce serait particulièrement utile pour les habitants des grandes villes très congestionnées.",
    keyVocab: [
      { fr: "une capsule", en: "a capsule" },
      { fr: "volant(e)", en: "flying" },
      { fr: "silencieux/euse", en: "silent" },
      { fr: "alimenté(e) par", en: "powered by" },
      { fr: "un passager", en: "a passenger" },
      { fr: "congestionné(e)", en: "congested" },
    ],
  },
  {
    id: "tra_21",
    topicKey: "transport",
    text: "Comment choisis-tu ton moyen de transport selon la distance à parcourir ?",
    hint: "Discuss how you decide transport methods based on distance.",
    difficulty: 2,
    followUps: [
      "À partir de quelle distance prends-tu la voiture plutôt que de marcher ?",
      "Est-ce que le prix influence ton choix ?",
      "Penses-tu à l'environnement quand tu choisis ?",
    ],
    modelAnswer: "Pour les courtes distances, je préfère marcher ou prendre mon vélo, car c'est bon pour la santé et gratuit. Pour des distances moyennes, je prends généralement le bus, et pour les longs trajets, comme aller dans une autre ville, je préfère le train. Le prix influence certainement mon choix, mais j'essaie aussi de penser à l'impact environnemental de chaque option.",
    keyVocab: [
      { fr: "une courte distance", en: "a short distance" },
      { fr: "une distance moyenne", en: "a medium distance" },
      { fr: "gratuit(e)", en: "free (of charge)" },
      { fr: "influencer", en: "to influence" },
      { fr: "l'impact environnemental", en: "environmental impact" },
      { fr: "une option", en: "an option" },
    ],
  },
  {
    id: "tra_22",
    topicKey: "transport",
    text: "As-tu déjà raté un bus ou un train ? Que s'est-il passé ?",
    hint: "Use passé composé to narrate a missed transport experience.",
    difficulty: 2,
    followUps: [
      "Pourquoi l'as-tu raté ?",
      "Comment as-tu résolu le problème ?",
      "Qu'est-ce que tu as appris de cette expérience ?",
    ],
    modelAnswer: "Oui, une fois j'ai raté mon bus scolaire parce que je me suis réveillé(e) en retard. J'étais très inquiet/inquiète parce que je ne voulais pas être en retard à mon contrôle. Heureusement, mon voisin m'a proposé de m'emmener en voiture. Depuis cet incident, je règle toujours plusieurs alarmes pour être sûr(e) de ne plus jamais rater le bus.",
    keyVocab: [
      { fr: "rater", en: "to miss" },
      { fr: "se réveiller", en: "to wake up" },
      { fr: "inquiet/inquiète", en: "worried" },
      { fr: "un voisin", en: "a neighbour" },
      { fr: "emmener", en: "to take (someone somewhere)" },
      { fr: "une alarme", en: "an alarm" },
    ],
  },
  {
    id: "tra_23",
    topicKey: "transport",
    text: "Est-ce que le coût des transports est un problème pour les jeunes ?",
    hint: "Discuss the cost of transport for young people.",
    difficulty: 2,
    followUps: [
      "Existe-t-il des réductions pour les étudiants ?",
      "Comment économises-tu de l'argent sur les transports ?",
      "Penses-tu que les transports devraient être gratuits pour les jeunes ?",
    ],
    modelAnswer: "Oui, je pense que le coût des transports peut vraiment être un problème pour les jeunes qui n'ont pas beaucoup d'argent de poche. Heureusement, il existe des cartes de réduction pour les étudiants qui rendent les billets de bus et de train moins chers. Personnellement, j'économise en achetant un abonnement mensuel plutôt que des billets individuels. Je pense que les transports devraient être au moins partiellement gratuits pour les jeunes.",
    keyVocab: [
      { fr: "l'argent de poche", en: "pocket money" },
      { fr: "une carte de réduction", en: "a discount card" },
      { fr: "un billet", en: "a ticket" },
      { fr: "économiser", en: "to save (money)" },
      { fr: "un abonnement", en: "a subscription/pass" },
      { fr: "mensuel(le)", en: "monthly" },
    ],
  },
  {
    id: "tra_24",
    topicKey: "transport",
    text: "Comment les transports ont-ils changé la façon dont les gens voyagent ?",
    hint: "Discuss how modern transport has transformed travel habits.",
    difficulty: 3,
    followUps: [
      "Est-ce que voyager est devenu trop facile ?",
      "Quels sont les effets positifs de cette évolution ?",
      "Y a-t-il des effets négatifs à voyager aussi facilement ?",
    ],
    modelAnswer: "Les transports modernes, comme les avions à bas coût et les trains rapides, ont rendu les voyages beaucoup plus accessibles qu'auparavant. Cela a permis à beaucoup plus de gens de découvrir d'autres cultures et de voyager pour le plaisir, ce qui est très positif. Cependant, cette facilité a aussi entraîné une augmentation du surtourisme dans certaines destinations populaires, ce qui pose de nouveaux problèmes environnementaux et sociaux.",
    keyVocab: [
      { fr: "à bas coût", en: "low-cost" },
      { fr: "accessible", en: "accessible" },
      { fr: "auparavant", en: "previously" },
      { fr: "entraîner", en: "to lead to/bring about" },
      { fr: "le surtourisme", en: "overtourism" },
      { fr: "une destination", en: "a destination" },
    ],
  },
  {
    id: "tra_25",
    topicKey: "transport",
    text: "Quel rôle la technologie joue-t-elle dans les transports modernes ?",
    hint: "Discuss apps, GPS, and tech innovations in transport.",
    difficulty: 3,
    followUps: [
      "Utilises-tu des applications pour planifier tes trajets ?",
      "Comment le GPS a-t-il changé la façon de voyager ?",
      "Penses-tu que la technologie rendra les transports plus sûrs ?",
    ],
    modelAnswer: "La technologie a énormément transformé les transports modernes, notamment grâce aux applications qui permettent de planifier des trajets, de réserver des billets ou de suivre les bus en temps réel. J'utilise souvent une application de GPS pour trouver le trajet le plus rapide en transports en commun. Je pense que la technologie continuera à rendre les transports plus sûrs, notamment grâce aux systèmes d'assistance à la conduite.",
    keyVocab: [
      { fr: "une application", en: "an app" },
      { fr: "planifier", en: "to plan" },
      { fr: "réserver", en: "to book" },
      { fr: "en temps réel", en: "in real time" },
      { fr: "un système d'assistance", en: "an assistance system" },
      { fr: "sûr(e)", en: "safe" },
    ],
  },
  {
    id: "tra_26",
    topicKey: "transport",
    text: "Penses-tu que les scooters électriques en libre-service sont une bonne idée pour les villes ?",
    hint: "Discuss shared e-scooters and urban micro-mobility.",
    difficulty: 3,
    followUps: [
      "As-tu déjà utilisé un scooter électrique en libre-service ?",
      "Quels sont les problèmes de sécurité associés ?",
      "Est-ce que ça devrait être mieux réglementé ?",
    ],
    modelAnswer: "Je pense que les scooters électriques en libre-service peuvent être une solution pratique pour les courts trajets en ville, surtout pour éviter la marche par temps chaud. Cependant, ils posent aussi de vrais problèmes de sécurité, car beaucoup d'utilisateurs ne portent pas de casque et roulent parfois sur les trottoirs. Je pense que les villes devraient mieux réglementer leur usage, avec des zones dédiées et des limites de vitesse plus strictes.",
    keyVocab: [
      { fr: "un scooter électrique", en: "an e-scooter" },
      { fr: "en libre-service", en: "self-service/shared" },
      { fr: "un casque", en: "a helmet" },
      { fr: "un trottoir", en: "a pavement/sidewalk" },
      { fr: "réglementer", en: "to regulate" },
      { fr: "une limite de vitesse", en: "a speed limit" },
    ],
  },
  {
    id: "tra_27",
    topicKey: "transport",
    text: "Est-ce que le prix de l'essence influence la façon dont les gens se déplacent ?",
    hint: "Discuss fuel prices and their effect on transport habits.",
    difficulty: 3,
    followUps: [
      "Est-ce que ta famille fait attention au prix de l'essence ?",
      "Quelles alternatives les gens choisissent-ils quand l'essence est chère ?",
      "Penses-tu que les prix vont continuer à augmenter ?",
    ],
    modelAnswer: "Oui, le prix de l'essence influence beaucoup les habitudes de déplacement des gens. Quand les prix augmentent, beaucoup de personnes essaient de covoiturer, d'utiliser davantage les transports en commun, ou même d'acheter une voiture électrique pour réduire leurs coûts. Ma famille fait attention au prix de l'essence et essaie de limiter les trajets non essentiels. Je pense que les prix continueront probablement à fluctuer selon la situation mondiale.",
    keyVocab: [
      { fr: "l'essence", en: "petrol" },
      { fr: "une habitude", en: "a habit" },
      { fr: "augmenter", en: "to increase" },
      { fr: "un coût", en: "a cost" },
      { fr: "essentiel(le)", en: "essential" },
      { fr: "fluctuer", en: "to fluctuate" },
    ],
  },
  {
    id: "tra_28",
    topicKey: "transport",
    text: "Comment les transports affectent-ils l'égalité des chances entre les gens ?",
    hint: "Discuss transport access and social equality.",
    difficulty: 3,
    followUps: [
      "Est-ce que tout le monde a un accès égal aux transports ?",
      "Comment le manque de transport peut-il limiter les opportunités professionnelles ?",
      "Que pourraient faire les gouvernements pour améliorer l'égalité d'accès ?",
    ],
    modelAnswer: "Les transports jouent un rôle crucial dans l'égalité des chances, car un accès limité aux transports peut empêcher certaines personnes de trouver un bon emploi ou d'accéder à l'éducation. Les personnes à faible revenu, notamment dans les zones rurales ou défavorisées, sont souvent les plus touchées par ce problème. Je pense que les gouvernements devraient subventionner davantage les transports en commun dans les zones les plus isolées pour réduire ces inégalités.",
    keyVocab: [
      { fr: "l'égalité des chances", en: "equal opportunity" },
      { fr: "un accès limité", en: "limited access" },
      { fr: "un faible revenu", en: "a low income" },
      { fr: "défavorisé(e)", en: "disadvantaged" },
      { fr: "subventionner", en: "to subsidise" },
      { fr: "une inégalité", en: "an inequality" },
    ],
  },
  {
    id: "tra_29",
    topicKey: "transport",
    text: "Dans quelle mesure les transports sont-ils liés au développement économique d'un pays ?",
    hint: "Discuss the link between transport infrastructure and economic growth.",
    difficulty: 3,
    followUps: [
      "Quel exemple de pays illustre bien ce lien ?",
      "Comment de bonnes infrastructures aident-elles le commerce ?",
      "Que se passe-t-il quand un pays a de mauvaises infrastructures ?",
    ],
    modelAnswer: "Les transports sont étroitement liés au développement économique d'un pays, car de bonnes infrastructures facilitent le commerce, attirent les investissements étrangers et créent des emplois. Par exemple, les pays avec un réseau ferroviaire et routier bien développé, comme le Japon, ont souvent une économie plus dynamique. À l'inverse, un manque d'infrastructures peut isoler certaines régions et freiner considérablement leur croissance économique.",
    keyVocab: [
      { fr: "étroitement", en: "closely" },
      { fr: "faciliter", en: "to facilitate" },
      { fr: "le commerce", en: "trade" },
      { fr: "attirer", en: "to attract" },
      { fr: "isoler", en: "to isolate" },
      { fr: "freiner", en: "to hinder/slow down" },
    ],
  },
  {
    id: "tra_30",
    topicKey: "transport",
    text: "Si tu devais voyager sans jamais utiliser d'énergie fossile, comment t'organiserais-tu ?",
    hint: "Use conditional to plan a fossil-fuel-free lifestyle around transport.",
    difficulty: 3,
    followUps: [
      "Quels moyens de transport utiliserais-tu le plus ?",
      "Est-ce que ça changerait ta façon de voyager en vacances ?",
      "Penses-tu que ce mode de vie est réaliste pour la plupart des gens ?",
    ],
    modelAnswer: "Si je devais voyager sans jamais utiliser d'énergie fossile, je me déplacerais principalement à vélo pour les trajets courts et je prendrais le train électrique pour les longs trajets. Pour les vacances, je choisirais des destinations plus proches accessibles en train plutôt qu'en avion. Honnêtement, je pense que ce mode de vie serait assez difficile à adopter pour la plupart des gens, à cause du manque d'infrastructures adaptées partout dans le monde.",
    keyVocab: [
      { fr: "une énergie fossile", en: "fossil fuel" },
      { fr: "principalement", en: "mainly" },
      { fr: "un train électrique", en: "an electric train" },
      { fr: "proche", en: "nearby" },
      { fr: "un mode de vie", en: "a lifestyle" },
      { fr: "adapté(e)", en: "suited/adapted" },
    ],
  },

  // ── LES MÉTIERS ──────────────────────────────────────────────────────────
  {
    id: "job_01",
    topicKey: "jobs",
    text: "Quel métier voudrais-tu faire plus tard ?",
    hint: "Name a future career goal and give a simple reason.",
    difficulty: 1,
    followUps: [
      "Depuis quand veux-tu faire ce métier ?",
      "Qu'est-ce qui t'intéresse dans ce métier ?",
      "Faut-il étudier longtemps pour ce métier ?",
    ],
    modelAnswer: "Plus tard, je voudrais devenir médecin parce que j'aimerais aider les gens et je trouve la science fascinante. Je veux faire ce métier depuis que je suis au collège. Ce qui m'intéresse le plus, c'est de pouvoir soigner des patients et de faire une vraie différence dans leur vie. Je sais qu'il faut étudier pendant de nombreuses années pour devenir médecin.",
    keyVocab: [
      { fr: "un métier", en: "a job/profession" },
      { fr: "devenir", en: "to become" },
      { fr: "un médecin", en: "a doctor" },
      { fr: "soigner", en: "to treat/care for" },
      { fr: "un patient", en: "a patient" },
      { fr: "étudier", en: "to study" },
    ],
  },
  {
    id: "job_02",
    topicKey: "jobs",
    text: "Quel est le métier de tes parents ?",
    hint: "Describe your parents' jobs and what they do daily.",
    difficulty: 1,
    followUps: [
      "Est-ce qu'ils aiment leur travail ?",
      "Est-ce que tu voudrais faire le même métier ?",
      "Travaillent-ils loin de la maison ?",
    ],
    modelAnswer: "Ma mère est professeure dans une école primaire et mon père est ingénieur dans une entreprise de construction. Ma mère aime beaucoup son travail parce qu'elle adore les enfants. Mon père trouve son travail intéressant, mais parfois stressant à cause des délais. Je ne voudrais pas forcément faire le même métier qu'eux, mais je respecte beaucoup ce qu'ils font.",
    keyVocab: [
      { fr: "un(e) professeur(e)", en: "a teacher" },
      { fr: "un ingénieur", en: "an engineer" },
      { fr: "une entreprise", en: "a company" },
      { fr: "un délai", en: "a deadline" },
      { fr: "respecter", en: "to respect" },
      { fr: "forcément", en: "necessarily" },
    ],
  },
  {
    id: "job_03",
    topicKey: "jobs",
    text: "Quels métiers t'intéressent le plus ?",
    hint: "List a few careers of interest and briefly say why.",
    difficulty: 1,
    followUps: [
      "As-tu déjà parlé à quelqu'un qui fait ce métier ?",
      "Quelles qualités faut-il pour réussir dans ce métier ?",
      "Y a-t-il un métier que tu détestes vraiment ?",
    ],
    modelAnswer: "Les métiers qui m'intéressent le plus sont ceux liés à la créativité, comme graphiste ou architecte, parce que j'aime beaucoup dessiner et imaginer des projets. J'ai déjà parlé à un architecte, l'ami de mon père, qui m'a expliqué son travail passionnant. Je pense qu'il faut être créatif, patient et précis pour réussir dans ce genre de métier.",
    keyVocab: [
      { fr: "un(e) graphiste", en: "a graphic designer" },
      { fr: "un architecte", en: "an architect" },
      { fr: "créatif/ve", en: "creative" },
      { fr: "dessiner", en: "to draw" },
      { fr: "passionnant(e)", en: "exciting/thrilling" },
      { fr: "précis(e)", en: "precise" },
    ],
  },
  {
    id: "job_04",
    topicKey: "jobs",
    text: "Est-ce que tu as déjà eu un petit boulot ?",
    hint: "Use passé composé to describe a part-time job or babysitting, real or hypothetical.",
    difficulty: 1,
    followUps: [
      "Qu'est-ce que tu as appris de cette expérience ?",
      "Combien étais-tu payé(e) ?",
      "Aimerais-tu retravailler là-bas ?",
    ],
    modelAnswer: "Oui, l'été dernier, j'ai travaillé comme baby-sitter pour les enfants de nos voisins. J'ai appris à être plus patient(e) et responsable. J'étais payé(e) environ dix livres de l'heure, ce qui m'a permis d'économiser un peu d'argent. J'aimerais bien recommencer cet été, car j'ai vraiment apprécié cette expérience.",
    keyVocab: [
      { fr: "un petit boulot", en: "a part-time job" },
      { fr: "un(e) baby-sitter", en: "a babysitter" },
      { fr: "payé(e)", en: "paid" },
      { fr: "économiser", en: "to save (money)" },
      { fr: "recommencer", en: "to start again" },
      { fr: "apprécier", en: "to enjoy/appreciate" },
    ],
  },
  {
    id: "job_05",
    topicKey: "jobs",
    text: "Quelles qualités sont importantes pour réussir dans un métier ?",
    hint: "Discuss general workplace qualities and skills.",
    difficulty: 2,
    followUps: [
      "As-tu déjà ces qualités ?",
      "Quelle qualité voudrais-tu développer ?",
      "Est-ce que les qualifications sont plus importantes que l'expérience ?",
    ],
    modelAnswer: "Je pense que la ponctualité, le travail d'équipe et la communication sont des qualités essentielles dans n'importe quel métier. Personnellement, je pense être plutôt ponctuel(le) et organisé(e), mais j'aimerais développer davantage ma confiance en moi lors des prises de parole en public. Je pense que l'expérience et les qualifications sont toutes les deux importantes, mais l'expérience pratique compte souvent plus pour les employeurs.",
    keyVocab: [
      { fr: "la ponctualité", en: "punctuality" },
      { fr: "le travail d'équipe", en: "teamwork" },
      { fr: "développer", en: "to develop" },
      { fr: "une prise de parole", en: "public speaking" },
      { fr: "une qualification", en: "a qualification" },
      { fr: "un employeur", en: "an employer" },
    ],
  },
  {
    id: "job_06",
    topicKey: "jobs",
    text: "Préfères-tu travailler seul(e) ou en équipe ?",
    hint: "Discuss preference for solo vs team work.",
    difficulty: 1,
    followUps: [
      "Pourquoi préfères-tu ce style de travail ?",
      "As-tu déjà eu un conflit en travaillant en équipe ?",
      "Quel métier correspond le mieux à cette préférence ?",
    ],
    modelAnswer: "Je préfère généralement travailler en équipe, parce que j'aime échanger des idées avec d'autres personnes et je trouve qu'on trouve de meilleures solutions ensemble. Cependant, il m'arrive aussi d'apprécier travailler seul(e) sur des tâches qui demandent beaucoup de concentration. Un métier comme journaliste correspondrait bien, car il combine souvent travail d'équipe et travail individuel.",
    keyVocab: [
      { fr: "échanger", en: "to exchange" },
      { fr: "une solution", en: "a solution" },
      { fr: "une tâche", en: "a task" },
      { fr: "la concentration", en: "concentration" },
      { fr: "un(e) journaliste", en: "a journalist" },
      { fr: "combiner", en: "to combine" },
    ],
  },
  {
    id: "job_07",
    topicKey: "jobs",
    text: "Quels sont les avantages et les inconvénients de travailler à domicile ?",
    hint: "Discuss pros and cons of remote/home working.",
    difficulty: 2,
    followUps: [
      "Est-ce que quelqu'un dans ta famille travaille à domicile ?",
      "Aimerais-tu travailler à domicile plus tard ?",
      "Quels métiers permettent le télétravail ?",
    ],
    modelAnswer: "Travailler à domicile offre plus de flexibilité et permet d'économiser du temps de transport, mais cela peut aussi rendre la séparation entre vie professionnelle et vie privée plus difficile. Ma tante travaille souvent à domicile en tant que traductrice, et elle apprécie beaucoup la liberté que cela lui donne. Personnellement, j'aimerais avoir la possibilité de télétravailler au moins quelques jours par semaine plus tard.",
    keyVocab: [
      { fr: "à domicile", en: "from home" },
      { fr: "la flexibilité", en: "flexibility" },
      { fr: "la vie professionnelle", en: "professional life" },
      { fr: "un(e) traducteur/trice", en: "a translator" },
      { fr: "le télétravail", en: "remote work" },
      { fr: "la possibilité", en: "the possibility" },
    ],
  },
  {
    id: "job_08",
    topicKey: "jobs",
    text: "As-tu déjà fait un stage ou une observation en entreprise ?",
    hint: "Use passé composé to describe a work experience placement.",
    difficulty: 2,
    followUps: [
      "Où as-tu fait ce stage ?",
      "Qu'est-ce que tu as fait pendant cette période ?",
      "Est-ce que cette expérience a changé tes projets de carrière ?",
    ],
    modelAnswer: "Oui, l'année dernière, j'ai fait un stage d'observation dans un cabinet d'avocats pendant une semaine. J'ai observé les avocats préparer des dossiers et j'ai assisté à une réunion importante. Cette expérience m'a beaucoup appris sur le monde professionnel, mais elle m'a aussi fait réaliser que ce métier n'était peut-être pas fait pour moi, car je trouvais ça trop stressant.",
    keyVocab: [
      { fr: "un stage", en: "a work placement/internship" },
      { fr: "un cabinet d'avocats", en: "a law firm" },
      { fr: "un dossier", en: "a case/file" },
      { fr: "une réunion", en: "a meeting" },
      { fr: "réaliser", en: "to realise" },
      { fr: "le monde professionnel", en: "the working world" },
    ],
  },
  {
    id: "job_09",
    topicKey: "jobs",
    text: "Penses-tu que le salaire est le facteur le plus important pour choisir un métier ?",
    hint: "Discuss what matters most in job choice: salary vs passion/other factors.",
    difficulty: 2,
    followUps: [
      "Quels autres facteurs sont importants selon toi ?",
      "Préférerais-tu un métier bien payé mais ennuyeux ?",
      "Qu'est-ce qui te rendrait heureux/heureuse dans un travail ?",
    ],
    modelAnswer: "Je ne pense pas que le salaire soit le facteur le plus important, même s'il compte évidemment. Pour moi, il est essentiel d'aimer ce que l'on fait et de se sentir utile. Je ne choisirais pas un métier bien payé mais ennuyeux, car je passerais la majorité de ma vie à travailler. Ce qui me rendrait vraiment heureux/heureuse, c'est un équilibre entre passion, salaire correct et bonne ambiance de travail.",
    keyVocab: [
      { fr: "un salaire", en: "a salary" },
      { fr: "un facteur", en: "a factor" },
      { fr: "ennuyeux/euse", en: "boring" },
      { fr: "se sentir utile", en: "to feel useful" },
      { fr: "un équilibre", en: "a balance" },
      { fr: "une ambiance de travail", en: "a work atmosphere" },
    ],
  },
  {
    id: "job_10",
    topicKey: "jobs",
    text: "Décris une journée typique dans le métier de tes rêves.",
    hint: "Describe a typical day in your dream job.",
    difficulty: 2,
    followUps: [
      "À quelle heure commencerait ta journée de travail ?",
      "Avec qui travaillerais-tu ?",
      "Quelle serait la partie la plus intéressante de ta journée ?",
    ],
    modelAnswer: "Dans le métier de mes rêves, je serais vétérinaire. Ma journée commencerait vers huit heures avec des consultations pour examiner des animaux malades. Je travaillerais avec une équipe d'assistants vétérinaires sympathiques et je m'occuperais aussi bien de chiens que de chats. La partie la plus intéressante serait sans doute quand je réussirais à soigner un animal gravement malade.",
    keyVocab: [
      { fr: "un(e) vétérinaire", en: "a vet" },
      { fr: "une consultation", en: "a consultation" },
      { fr: "examiner", en: "to examine" },
      { fr: "un(e) assistant(e)", en: "an assistant" },
      { fr: "s'occuper de", en: "to take care of" },
      { fr: "gravement", en: "seriously" },
    ],
  },
  {
    id: "job_11",
    topicKey: "jobs",
    text: "Penses-tu que l'intelligence artificielle va remplacer certains métiers ?",
    hint: "Discuss AI's impact on jobs and the future job market.",
    difficulty: 3,
    followUps: [
      "Quels métiers sont les plus menacés selon toi ?",
      "Quels métiers seront toujours nécessaires ?",
      "Comment peut-on se préparer à ces changements ?",
    ],
    modelAnswer: "Oui, je pense que l'intelligence artificielle va remplacer certains métiers, en particulier les tâches répétitives comme la comptabilité de base ou la saisie de données. Cependant, je crois que les métiers qui demandent de la créativité, de l'empathie ou une prise de décision complexe, comme les médecins ou les enseignants, resteront nécessaires. Pour se préparer, il est important de développer des compétences que les machines ne peuvent pas facilement reproduire.",
    keyVocab: [
      { fr: "l'intelligence artificielle", en: "artificial intelligence" },
      { fr: "remplacer", en: "to replace" },
      { fr: "répétitif/ve", en: "repetitive" },
      { fr: "la comptabilité", en: "accounting" },
      { fr: "l'empathie", en: "empathy" },
      { fr: "une compétence", en: "a skill" },
    ],
  },
  {
    id: "job_12",
    topicKey: "jobs",
    text: "Est-ce que les hommes et les femmes ont les mêmes opportunités professionnelles ?",
    hint: "Discuss gender equality in the workplace.",
    difficulty: 3,
    followUps: [
      "Connais-tu des exemples d'inégalités professionnelles ?",
      "Comment la situation a-t-elle évolué ces dernières années ?",
      "Que pourrait-on faire pour améliorer l'égalité ?",
    ],
    modelAnswer: "Malheureusement, je pense qu'il existe encore des inégalités professionnelles entre les hommes et les femmes, notamment en termes de salaire et d'accès à des postes de direction. La situation s'est améliorée ces dernières décennies, mais l'écart salarial persiste dans de nombreux secteurs. Je pense que des politiques plus strictes concernant l'égalité salariale et la parité dans les postes à responsabilité seraient nécessaires.",
    keyVocab: [
      { fr: "une inégalité", en: "an inequality" },
      { fr: "un poste de direction", en: "a management position" },
      { fr: "l'écart salarial", en: "the pay gap" },
      { fr: "une politique", en: "a policy" },
      { fr: "la parité", en: "parity/equal representation" },
      { fr: "un secteur", en: "a sector" },
    ],
  },
  {
    id: "job_13",
    topicKey: "jobs",
    text: "Quelles études faut-il faire pour devenir professeur ?",
    hint: "Discuss the education path for becoming a teacher.",
    difficulty: 2,
    followUps: [
      "Penses-tu que c'est un métier difficile ?",
      "Quelles qualités faut-il avoir pour être un bon professeur ?",
      "Aimerais-tu enseigner un jour ?",
    ],
    modelAnswer: "Pour devenir professeur, il faut généralement obtenir un diplôme universitaire dans une matière spécifique, puis suivre une formation pédagogique pour apprendre à enseigner. Je pense que c'est un métier assez difficile, car il faut gérer une classe entière tout en s'assurant que chaque élève comprenne bien. Il faut être patient, organisé et savoir bien communiquer. Personnellement, ça pourrait m'intéresser d'enseigner un jour, peut-être les langues.",
    keyVocab: [
      { fr: "un diplôme", en: "a degree/diploma" },
      { fr: "une formation pédagogique", en: "teacher training" },
      { fr: "enseigner", en: "to teach" },
      { fr: "gérer", en: "to manage" },
      { fr: "s'assurer que", en: "to make sure that" },
      { fr: "comprendre", en: "to understand" },
    ],
  },
  {
    id: "job_14",
    topicKey: "jobs",
    text: "Quel métier trouves-tu le plus dangereux et pourquoi ?",
    hint: "Discuss dangerous professions like firefighters, pilots, miners.",
    difficulty: 2,
    followUps: [
      "Connais-tu quelqu'un qui fait un métier dangereux ?",
      "Ferais-tu ce métier malgré les risques ?",
      "Ces métiers sont-ils bien payés selon toi ?",
    ],
    modelAnswer: "Je trouve que le métier de pompier est particulièrement dangereux, car les pompiers risquent leur vie chaque jour pour sauver celle des autres, que ce soit dans des incendies ou des accidents graves. Je ne connais personnellement personne qui fait ce métier, mais je l'admire énormément. Je ne suis pas certain(e) de pouvoir faire ce métier moi-même, malgré tout le respect que j'ai pour ces héros du quotidien.",
    keyVocab: [
      { fr: "un pompier", en: "a firefighter" },
      { fr: "risquer sa vie", en: "to risk one's life" },
      { fr: "sauver", en: "to save" },
      { fr: "un incendie", en: "a fire" },
      { fr: "admirer", en: "to admire" },
      { fr: "un héros", en: "a hero" },
    ],
  },
  {
    id: "job_15",
    topicKey: "jobs",
    text: "Aimerais-tu créer ta propre entreprise un jour ?",
    hint: "Discuss entrepreneurship and starting a business.",
    difficulty: 2,
    followUps: [
      "Quel type d'entreprise créerais-tu ?",
      "Quels sont les risques d'être entrepreneur ?",
      "Préfères-tu la sécurité d'un emploi salarié ?",
    ],
    modelAnswer: "Oui, j'aimerais beaucoup créer ma propre entreprise un jour, peut-être dans le domaine de la mode ou de la technologie. Je sais que devenir entrepreneur comporte beaucoup de risques financiers, surtout au début, mais je trouve l'idée d'être indépendant(e) très attirante. Cependant, je comprends aussi les avantages de la sécurité d'un emploi salarié, comme un salaire fixe chaque mois.",
    keyVocab: [
      { fr: "une entreprise", en: "a business/company" },
      { fr: "un entrepreneur", en: "an entrepreneur" },
      { fr: "comporter", en: "to involve" },
      { fr: "financier/ère", en: "financial" },
      { fr: "attirant(e)", en: "appealing" },
      { fr: "un emploi salarié", en: "a salaried job" },
    ],
  },
  {
    id: "job_16",
    topicKey: "jobs",
    text: "Comment le monde du travail a-t-il changé depuis la génération de tes parents ?",
    hint: "Compare the modern job market to previous generations.",
    difficulty: 3,
    followUps: [
      "Est-ce plus facile ou plus difficile de trouver un emploi aujourd'hui ?",
      "Quels nouveaux métiers n'existaient pas avant ?",
      "Penses-tu que la stabilité de l'emploi a diminué ?",
    ],
    modelAnswer: "Le monde du travail a énormément changé depuis la génération de mes parents, notamment avec l'apparition d'internet et des réseaux sociaux, qui ont créé des métiers totalement nouveaux comme influenceur ou développeur d'applications. Je pense qu'il est à la fois plus facile de trouver des informations sur les métiers, mais plus difficile d'avoir un emploi stable à vie, contrairement à la génération précédente qui restait souvent dans la même entreprise pendant des décennies.",
    keyVocab: [
      { fr: "une génération", en: "a generation" },
      { fr: "l'apparition de", en: "the emergence of" },
      { fr: "un(e) développeur/euse", en: "a developer" },
      { fr: "stable", en: "stable" },
      { fr: "à vie", en: "for life" },
      { fr: "précédent(e)", en: "previous" },
    ],
  },
  {
    id: "job_17",
    topicKey: "jobs",
    text: "Penses-tu que tout le monde devrait aller à l'université ?",
    hint: "Discuss university vs vocational training pathways.",
    difficulty: 3,
    followUps: [
      "Quelles sont les alternatives à l'université ?",
      "Est-ce que l'apprentissage est une bonne option selon toi ?",
      "Penses-tu aller à l'université toi-même ?",
    ],
    modelAnswer: "Non, je ne pense pas que tout le monde devrait forcément aller à l'université, car certains métiers, comme électricien ou plombier, nécessitent plutôt une formation professionnelle pratique. Je pense que l'apprentissage est une excellente option pour les personnes qui préfèrent apprendre en travaillant plutôt qu'en étudiant théoriquement. Personnellement, j'envisage d'aller à l'université, mais je respecte totalement ceux qui choisissent un autre chemin.",
    keyVocab: [
      { fr: "un électricien", en: "an electrician" },
      { fr: "un plombier", en: "a plumber" },
      { fr: "une formation professionnelle", en: "vocational training" },
      { fr: "un apprentissage", en: "an apprenticeship" },
      { fr: "théoriquement", en: "theoretically" },
      { fr: "envisager", en: "to consider/plan to" },
    ],
  },
  {
    id: "job_18",
    topicKey: "jobs",
    text: "Quel impact le chômage a-t-il sur les individus et la société ?",
    hint: "Discuss unemployment's effects on individuals and society.",
    difficulty: 3,
    followUps: [
      "Quelles sont les causes principales du chômage ?",
      "Comment les gouvernements peuvent-ils aider les chômeurs ?",
      "Le chômage des jeunes est-il un problème particulier ?",
    ],
    modelAnswer: "Le chômage a un impact considérable sur les individus, entraînant souvent du stress financier, une perte de confiance en soi et parfois même des problèmes de santé mentale. Au niveau de la société, un taux de chômage élevé peut ralentir l'économie et augmenter les inégalités sociales. Le chômage des jeunes est particulièrement préoccupant, car il peut créer un sentiment de découragement dès le début de la vie professionnelle.",
    keyVocab: [
      { fr: "le chômage", en: "unemployment" },
      { fr: "un(e) chômeur/euse", en: "an unemployed person" },
      { fr: "un taux", en: "a rate" },
      { fr: "ralentir", en: "to slow down" },
      { fr: "préoccupant(e)", en: "worrying" },
      { fr: "le découragement", en: "discouragement" },
    ],
  },
  {
    id: "job_19",
    topicKey: "jobs",
    text: "Comment imagines-tu le monde du travail dans vingt ans ?",
    hint: "Speculate about the future job market using the future tense.",
    difficulty: 3,
    followUps: [
      "Est-ce que les gens travailleront moins d'heures ?",
      "Quels métiers seront les plus demandés ?",
      "Est-ce que le télétravail deviendra la norme ?",
    ],
    modelAnswer: "Dans vingt ans, je pense que le monde du travail sera beaucoup plus flexible, avec davantage de télétravail et des horaires plus adaptables selon les besoins de chacun. Les métiers liés à la technologie, à l'environnement et à la santé seront probablement les plus demandés. Je pense aussi que les gens travailleront peut-être moins d'heures grâce à l'automatisation de certaines tâches répétitives.",
    keyVocab: [
      { fr: "flexible", en: "flexible" },
      { fr: "un horaire", en: "a schedule" },
      { fr: "adaptable", en: "adaptable" },
      { fr: "demandé(e)", en: "in demand" },
      { fr: "l'automatisation", en: "automation" },
      { fr: "les besoins", en: "needs" },
    ],
  },
  {
    id: "job_20",
    topicKey: "jobs",
    text: "Est-ce que la passion est plus importante que la stabilité dans le choix d'une carrière ?",
    hint: "Debate passion vs job security when choosing a career.",
    difficulty: 3,
    followUps: [
      "Connais-tu quelqu'un qui a suivi sa passion malgré les risques ?",
      "Que ferais-tu si ta passion n'était pas bien payée ?",
      "Comment peut-on trouver un équilibre entre les deux ?",
    ],
    modelAnswer: "C'est une question difficile, car je pense que les deux sont importants à leur manière. Suivre sa passion peut rendre le travail beaucoup plus épanouissant, mais sans un minimum de stabilité financière, cela peut devenir source de stress. Si ma passion n'était pas bien payée, j'essaierais peut-être de la garder comme activité secondaire tout en ayant un emploi plus stable. Je pense qu'il est possible de trouver un équilibre avec de la patience et de la créativité.",
    keyVocab: [
      { fr: "la stabilité", en: "stability" },
      { fr: "épanouissant(e)", en: "fulfilling" },
      { fr: "une source de stress", en: "a source of stress" },
      { fr: "une activité secondaire", en: "a side activity" },
      { fr: "garder", en: "to keep" },
      { fr: "un équilibre", en: "a balance" },
    ],
  },
  {
    id: "job_21",
    topicKey: "jobs",
    text: "Quel métier penses-tu que tu ne pourrais jamais faire ?",
    hint: "Discuss a career you would never choose and why.",
    difficulty: 1,
    followUps: [
      "Pourquoi ne pourrais-tu pas faire ce métier ?",
      "Connais-tu quelqu'un qui fait ce métier ?",
      "Qu'est-ce qui te fait le plus peur dans ce métier ?",
    ],
    modelAnswer: "Je pense que je ne pourrais jamais être chirurgien(ne) parce que je n'aime pas du tout le sang et je deviens facilement nerveux/nerveuse dans les situations de haute pression. Je connais une amie de ma mère qui est infirmière, et je l'admire beaucoup, mais je sais que je n'aurais pas les nerfs pour ce genre de travail. Ce qui me fait le plus peur, c'est l'idée de faire une erreur qui pourrait affecter la vie de quelqu'un.",
    keyVocab: [
      { fr: "un chirurgien", en: "a surgeon" },
      { fr: "le sang", en: "blood" },
      { fr: "nerveux/euse", en: "nervous" },
      { fr: "la pression", en: "pressure" },
      { fr: "un(e) infirmier/ère", en: "a nurse" },
      { fr: "une erreur", en: "a mistake" },
    ],
  },
  {
    id: "job_22",
    topicKey: "jobs",
    text: "Comment te prépares-tu pour ton futur métier ?",
    hint: "Discuss steps taken toward career preparation.",
    difficulty: 2,
    followUps: [
      "Quelles matières scolaires t'aident le plus ?",
      "As-tu déjà parlé à un conseiller d'orientation ?",
      "Fais-tu des activités extrascolaires liées à ce métier ?",
    ],
    modelAnswer: "Pour me préparer à mon futur métier, j'essaie de bien réussir dans les matières scientifiques à l'école, car elles sont importantes pour la médecine. J'ai aussi parlé à un conseiller d'orientation qui m'a donné des conseils utiles sur les études à suivre. En plus, je fais du bénévolat dans un hôpital local le week-end pour acquérir de l'expérience pratique dans ce domaine.",
    keyVocab: [
      { fr: "se préparer", en: "to prepare oneself" },
      { fr: "un conseiller d'orientation", en: "a careers advisor" },
      { fr: "un conseil", en: "a piece of advice" },
      { fr: "le bénévolat", en: "volunteering" },
      { fr: "acquérir", en: "to acquire" },
      { fr: "un domaine", en: "a field" },
    ],
  },
  {
    id: "job_23",
    topicKey: "jobs",
    text: "Penses-tu que les jeunes d'aujourd'hui ont plus de pression pour réussir professionnellement ?",
    hint: "Discuss pressure on young people regarding career success.",
    difficulty: 3,
    followUps: [
      "D'où vient cette pression selon toi ?",
      "Comment cette pression affecte-t-elle la santé mentale des jeunes ?",
      "Que pourrait-on faire pour réduire cette pression ?",
    ],
    modelAnswer: "Oui, je pense que les jeunes d'aujourd'hui subissent une pression énorme pour réussir professionnellement, notamment à cause des réseaux sociaux qui montrent souvent une image irréaliste du succès. Cette pression peut sérieusement affecter la santé mentale, provoquant de l'anxiété ou même de la dépression chez certains jeunes. Je pense qu'il faudrait davantage parler ouvertement de ces difficultés à l'école et normaliser le fait de suivre un chemin professionnel non linéaire.",
    keyVocab: [
      { fr: "subir", en: "to undergo/experience" },
      { fr: "le succès", en: "success" },
      { fr: "l'anxiété", en: "anxiety" },
      { fr: "la dépression", en: "depression" },
      { fr: "normaliser", en: "to normalise" },
      { fr: "non linéaire", en: "non-linear" },
    ],
  },
  {
    id: "job_24",
    topicKey: "jobs",
    text: "Est-ce qu'il est acceptable de changer complètement de carrière plus tard dans la vie ?",
    hint: "Discuss career changes later in life.",
    difficulty: 2,
    followUps: [
      "Connais-tu quelqu'un qui a changé de carrière ?",
      "Quels sont les défis de recommencer dans un nouveau domaine ?",
      "Envisagerais-tu de changer de métier un jour ?",
    ],
    modelAnswer: "Oui, je pense que c'est tout à fait acceptable de changer complètement de carrière, car les gens évoluent et leurs priorités changent avec le temps. Mon oncle, par exemple, était comptable pendant quinze ans avant de devenir professeur de yoga, et il est beaucoup plus heureux maintenant. Le plus grand défi est probablement de retourner étudier ou de recommencer au bas de l'échelle, mais je pense que ça en vaut souvent la peine.",
    keyVocab: [
      { fr: "évoluer", en: "to evolve/change" },
      { fr: "un(e) comptable", en: "an accountant" },
      { fr: "un défi", en: "a challenge" },
      { fr: "recommencer", en: "to start over" },
      { fr: "au bas de l'échelle", en: "at the bottom of the ladder" },
      { fr: "envisager", en: "to consider" },
    ],
  },
  {
    id: "job_25",
    topicKey: "jobs",
    text: "Quel rôle jouent les réseaux professionnels dans la recherche d'emploi ?",
    hint: "Discuss professional networking and job searching.",
    difficulty: 3,
    followUps: [
      "Connais-tu des plateformes comme LinkedIn ?",
      "Penses-tu que 'qui on connaît' est plus important que les compétences ?",
      "Comment peux-tu développer ton réseau professionnel dès maintenant ?",
    ],
    modelAnswer: "Les réseaux professionnels jouent un rôle de plus en plus important dans la recherche d'emploi, notamment grâce à des plateformes comme LinkedIn qui permettent de se connecter avec des professionnels du secteur. Je pense que 'qui on connaît' peut vraiment aider à obtenir des opportunités, mais cela ne remplace pas les compétences réelles nécessaires pour bien faire le travail. Dès maintenant, je pourrais commencer à développer mon réseau en participant à des événements ou des stages.",
    keyVocab: [
      { fr: "un réseau professionnel", en: "a professional network" },
      { fr: "la recherche d'emploi", en: "job search" },
      { fr: "une plateforme", en: "a platform" },
      { fr: "se connecter", en: "to connect" },
      { fr: "remplacer", en: "to replace" },
      { fr: "un événement", en: "an event" },
    ],
  },
  {
    id: "job_26",
    topicKey: "jobs",
    text: "Aimerais-tu travailler à l'étranger un jour ?",
    hint: "Discuss working abroad — desire, challenges, opportunities.",
    difficulty: 2,
    followUps: [
      "Dans quel pays voudrais-tu travailler ?",
      "Quels seraient les défis de travailler à l'étranger ?",
      "Est-ce que la langue serait un obstacle pour toi ?",
    ],
    modelAnswer: "Oui, j'aimerais beaucoup travailler à l'étranger un jour, peut-être en France ou au Canada, pour découvrir une nouvelle culture tout en pratiquant mon français. Les plus grands défis seraient probablement de s'adapter à un nouveau système de travail et de se sentir loin de ma famille. La langue ne serait pas vraiment un obstacle pour moi, car j'étudie le français depuis plusieurs années déjà.",
    keyVocab: [
      { fr: "travailler à l'étranger", en: "to work abroad" },
      { fr: "s'adapter", en: "to adapt" },
      { fr: "un système", en: "a system" },
      { fr: "se sentir loin de", en: "to feel far from" },
      { fr: "un obstacle", en: "an obstacle" },
      { fr: "pratiquer", en: "to practise" },
    ],
  },
  {
    id: "job_27",
    topicKey: "jobs",
    text: "Comment la robotisation affecte-t-elle les métiers de l'industrie ?",
    hint: "Discuss automation's effect on manufacturing jobs.",
    difficulty: 3,
    followUps: [
      "Connais-tu des exemples d'usines automatisées ?",
      "Quels emplois sont créés par la robotisation ?",
      "Que devraient faire les travailleurs pour s'adapter ?",
    ],
    modelAnswer: "La robotisation a considérablement transformé les métiers de l'industrie, remplaçant de nombreux emplois manuels répétitifs, notamment dans les usines automobiles. Cependant, cette transformation a aussi créé de nouveaux emplois liés à la maintenance des robots et à la programmation informatique. Je pense que les travailleurs devraient se former continuellement à de nouvelles compétences techniques pour rester compétitifs sur le marché du travail.",
    keyVocab: [
      { fr: "la robotisation", en: "automation/robotisation" },
      { fr: "une usine", en: "a factory" },
      { fr: "manuel(le)", en: "manual" },
      { fr: "la maintenance", en: "maintenance" },
      { fr: "se former", en: "to train oneself" },
      { fr: "compétitif/ve", en: "competitive" },
    ],
  },
  {
    id: "job_28",
    topicKey: "jobs",
    text: "Penses-tu que les vacances et les congés payés sont suffisants dans le monde du travail actuel ?",
    hint: "Discuss work-life balance, holidays, and paid leave.",
    difficulty: 3,
    followUps: [
      "Combien de jours de congé penses-tu être raisonnable ?",
      "Est-ce que ton pays a de bonnes lois sur les congés ?",
      "Comment le surmenage affecte-t-il les travailleurs ?",
    ],
    modelAnswer: "Je pense que dans beaucoup de pays, les congés payés ne sont pas toujours suffisants pour permettre un bon équilibre entre vie professionnelle et vie privée. Certains pays européens, comme la France, offrent généreusement cinq semaines de congés payés par an, ce qui me semble raisonnable. Le surmenage peut avoir des conséquences graves sur la santé physique et mentale des travailleurs, donc je pense qu'un meilleur équilibre devrait être une priorité partout dans le monde.",
    keyVocab: [
      { fr: "un congé payé", en: "paid leave" },
      { fr: "raisonnable", en: "reasonable" },
      { fr: "le surmenage", en: "overwork/burnout" },
      { fr: "une conséquence", en: "a consequence" },
      { fr: "une priorité", en: "a priority" },
      { fr: "généreusement", en: "generously" },
    ],
  },
  {
    id: "job_29",
    topicKey: "jobs",
    text: "Si tu étais responsable d'une entreprise, comment traiterais-tu tes employés ?",
    hint: "Use conditional to describe hypothetical management style.",
    difficulty: 3,
    followUps: [
      "Quelles règles mettrais-tu en place ?",
      "Comment motiverais-tu ton équipe ?",
      "Qu'est-ce qui rend, selon toi, un bon patron ?",
    ],
    modelAnswer: "Si j'étais responsable d'une entreprise, je traiterais mes employés avec beaucoup de respect et j'écouterais toujours leurs préoccupations. Je mettrais en place des horaires flexibles et j'encouragerais un bon équilibre entre vie professionnelle et vie privée. Pour motiver mon équipe, j'organiserais des réunions régulières pour reconnaître leurs efforts. À mon avis, un bon patron est quelqu'un qui inspire confiance plutôt que quelqu'un qui gouverne par la peur.",
    keyVocab: [
      { fr: "un employé", en: "an employee" },
      { fr: "une préoccupation", en: "a concern" },
      { fr: "mettre en place", en: "to put in place" },
      { fr: "motiver", en: "to motivate" },
      { fr: "un patron", en: "a boss" },
      { fr: "inspirer confiance", en: "to inspire trust" },
    ],
  },
  {
    id: "job_30",
    topicKey: "jobs",
    text: "Dans quelle mesure l'éducation détermine-t-elle le succès professionnel d'une personne ?",
    hint: "Discuss the relationship between education and career success.",
    difficulty: 3,
    followUps: [
      "Connais-tu des exemples de succès sans diplôme universitaire ?",
      "Quels autres facteurs influencent le succès professionnel ?",
      "Penses-tu que le système éducatif devrait changer ?",
    ],
    modelAnswer: "Je pense que l'éducation joue un rôle important dans le succès professionnel, mais ce n'est pas le seul facteur déterminant. Il existe de nombreux exemples de personnes qui ont réussi sans diplôme universitaire, grâce à leur détermination, leur créativité ou leur sens des affaires. D'autres facteurs, comme les compétences sociales et la capacité d'adaptation, sont tout aussi cruciaux. Je pense que le système éducatif devrait davantage valoriser les compétences pratiques et pas seulement les résultats académiques.",
    keyVocab: [
      { fr: "déterminant(e)", en: "determining/key" },
      { fr: "la détermination", en: "determination" },
      { fr: "le sens des affaires", en: "business sense" },
      { fr: "une compétence sociale", en: "a social skill" },
      { fr: "la capacité d'adaptation", en: "adaptability" },
      { fr: "valoriser", en: "to value" },
    ],
  },

  // ── LES SPORTS ───────────────────────────────────────────────────────────
  {
    id: "spo_01",
    topicKey: "sports",
    text: "Quel est ton sport préféré ?",
    hint: "Name your favourite sport and say why you like it.",
    difficulty: 1,
    followUps: [
      "Depuis quand pratiques-tu ce sport ?",
      "Tu le pratiques seul(e) ou en équipe ?",
      "Où est-ce que tu fais ce sport ?",
    ],
    modelAnswer: "Mon sport préféré, c'est le football. Je joue depuis l'âge de sept ans, dans un club près de chez moi. J'aime ce sport parce que c'est un jeu d'équipe et j'ai beaucoup d'amis dans mon équipe. On s'entraîne deux fois par semaine et on joue un match le samedi. C'est un excellent moyen de rester en forme et de se faire des amis.",
    keyVocab: [
      { fr: "pratiquer un sport", en: "to play/practise a sport" },
      { fr: "un club", en: "a club" },
      { fr: "s'entraîner", en: "to train" },
      { fr: "un match", en: "a match" },
      { fr: "une équipe", en: "a team" },
      { fr: "rester en forme", en: "to stay fit" },
    ],
  },
  {
    id: "spo_02",
    topicKey: "sports",
    text: "Est-ce que tu fais du sport régulièrement ?",
    hint: "Describe how often you exercise and what you do.",
    difficulty: 1,
    followUps: [
      "Combien de fois par semaine fais-tu du sport ?",
      "Préfères-tu le sport en intérieur ou en extérieur ?",
      "Qu'est-ce qui te motive à faire du sport ?",
    ],
    modelAnswer: "Oui, je fais du sport trois fois par semaine. Je vais à la piscine le lundi et je cours dans le parc le mercredi et le vendredi. Je préfère faire du sport en extérieur parce que j'aime respirer l'air frais. Ce qui me motive, c'est que je me sens plus énergique et de meilleure humeur après avoir fait de l'exercice.",
    keyVocab: [
      { fr: "régulièrement", en: "regularly" },
      { fr: "la piscine", en: "the swimming pool" },
      { fr: "courir", en: "to run" },
      { fr: "en extérieur", en: "outdoors" },
      { fr: "énergique", en: "energetic" },
      { fr: "de bonne humeur", en: "in a good mood" },
    ],
  },
  {
    id: "spo_03",
    topicKey: "sports",
    text: "Fais-tu partie d'une équipe ou d'un club de sport ?",
    hint: "Talk about club membership, training schedule, teammates.",
    difficulty: 1,
    followUps: [
      "Depuis combien de temps es-tu membre de ce club ?",
      "Qui est ton entraîneur ?",
      "Avez-vous gagné des compétitions récemment ?",
    ],
    modelAnswer: "Oui, je fais partie d'un club de natation depuis deux ans. On s'entraîne le mardi et le jeudi soir dans une piscine municipale. Notre entraîneur est très strict mais aussi très encourageant. Le mois dernier, notre équipe a gagné une compétition régionale, ce qui était un moment très fier pour nous tous.",
    keyVocab: [
      { fr: "faire partie de", en: "to be part of" },
      { fr: "un entraîneur", en: "a coach" },
      { fr: "une compétition", en: "a competition" },
      { fr: "encourageant(e)", en: "encouraging" },
      { fr: "fier/fière", en: "proud" },
      { fr: "gagner", en: "to win" },
    ],
  },
  {
    id: "spo_04",
    topicKey: "sports",
    text: "Quel sport n'aimes-tu pas et pourquoi ?",
    hint: "Give a sport you dislike with reasons.",
    difficulty: 1,
    followUps: [
      "As-tu déjà essayé ce sport ?",
      "Qu'est-ce que tu préfères faire à la place ?",
      "Penses-tu que ce sport est ennuyeux ou difficile ?",
    ],
    modelAnswer: "Je n'aime pas beaucoup le golf parce que je trouve que c'est trop lent et pas assez actif. J'ai essayé une fois avec mon oncle, mais je me suis vite ennuyé(e). Je préfère les sports plus rapides comme le basket, où il y a plus d'action et où on bouge tout le temps.",
    keyVocab: [
      { fr: "lent(e)", en: "slow" },
      { fr: "s'ennuyer", en: "to get bored" },
      { fr: "actif/active", en: "active" },
      { fr: "bouger", en: "to move" },
      { fr: "à la place", en: "instead" },
      { fr: "rapide", en: "fast" },
    ],
  },
  {
    id: "spo_05",
    topicKey: "sports",
    text: "Décris la dernière fois que tu as fait du sport.",
    hint: "Use passé composé to describe a recent sporting activity.",
    difficulty: 1,
    followUps: [
      "Avec qui as-tu fait du sport ?",
      "Comment t'es-tu senti(e) après ?",
      "Vas-tu recommencer bientôt ?",
    ],
    modelAnswer: "Hier après-midi, j'ai joué au tennis avec ma sœur au parc. On a joué pendant une heure et j'ai gagné le premier set, mais elle a gagné le deuxième. Après le match, je me suis senti(e) fatigué(e) mais content(e). On a bu de l'eau et on a discuté du match. Je vais certainement rejouer ce week-end.",
    keyVocab: [
      { fr: "un set", en: "a set (tennis)" },
      { fr: "fatigué(e)", en: "tired" },
      { fr: "discuter de", en: "to discuss" },
      { fr: "rejouer", en: "to play again" },
      { fr: "gagner un match", en: "to win a match" },
      { fr: "perdre", en: "to lose" },
    ],
  },
  {
    id: "spo_06",
    topicKey: "sports",
    text: "Regardes-tu souvent des matchs à la télévision ?",
    hint: "Talk about watching sport on TV — which sports, with whom.",
    difficulty: 1,
    followUps: [
      "Quelle équipe soutiens-tu ?",
      "Regardes-tu les matchs seul(e) ou avec ta famille ?",
      "As-tu déjà assisté à un match en direct ?",
    ],
    modelAnswer: "Oui, je regarde souvent des matchs de football à la télévision, surtout le week-end. Je soutiens toujours la même équipe depuis que je suis petit(e). D'habitude, je regarde les matchs avec mon père et on crie beaucoup devant la télévision ! L'année dernière, j'ai assisté à un match en direct au stade, et l'ambiance était incroyable.",
    keyVocab: [
      { fr: "soutenir une équipe", en: "to support a team" },
      { fr: "assister à", en: "to attend" },
      { fr: "en direct", en: "live" },
      { fr: "un stade", en: "a stadium" },
      { fr: "l'ambiance", en: "the atmosphere" },
      { fr: "crier", en: "to shout" },
    ],
  },
  {
    id: "spo_07",
    topicKey: "sports",
    text: "Pourquoi est-il important de faire du sport ?",
    hint: "Discuss health and social benefits of exercise.",
    difficulty: 2,
    followUps: [
      "Quels sont les bienfaits du sport sur la santé mentale ?",
      "Le sport peut-il aider à se faire des amis ?",
      "Que penses-tu du sport à l'école ?",
    ],
    modelAnswer: "À mon avis, faire du sport est essentiel pour rester en bonne santé physique et mentale. L'exercice régulier réduit le stress et améliore l'humeur grâce aux endorphines. De plus, le sport en équipe apprend la coopération et permet de se faire des amis. Je pense que le sport à l'école devrait être obligatoire parce que beaucoup de jeunes ne bougent pas assez aujourd'hui.",
    keyVocab: [
      { fr: "essentiel(le)", en: "essential" },
      { fr: "réduire le stress", en: "to reduce stress" },
      { fr: "la coopération", en: "cooperation" },
      { fr: "obligatoire", en: "compulsory" },
      { fr: "les bienfaits", en: "the benefits" },
      { fr: "la santé mentale", en: "mental health" },
    ],
  },
  {
    id: "spo_08",
    topicKey: "sports",
    text: "Préfères-tu les sports individuels ou les sports d'équipe ?",
    hint: "Compare individual vs team sports with your preference.",
    difficulty: 2,
    followUps: [
      "Quels sont les avantages du sport individuel ?",
      "Qu'est-ce que le sport d'équipe t'apprend ?",
      "As-tu déjà pratiqué les deux types de sport ?",
    ],
    modelAnswer: "Je préfère les sports d'équipe parce que j'aime la camaraderie et le fait de partager la victoire ou la défaite avec les autres. Cependant, je reconnais que les sports individuels, comme l'athlétisme, permettent de se concentrer uniquement sur ses propres progrès sans dépendre des autres. J'ai essayé les deux, et je trouve que chacun a ses avantages selon la personnalité de chacun.",
    keyVocab: [
      { fr: "la camaraderie", en: "camaraderie" },
      { fr: "la victoire", en: "victory" },
      { fr: "la défaite", en: "defeat" },
      { fr: "dépendre de", en: "to depend on" },
      { fr: "les progrès", en: "progress" },
      { fr: "selon", en: "according to / depending on" },
    ],
  },
  {
    id: "spo_09",
    topicKey: "sports",
    text: "Que penses-tu des salaires extrêmement élevés des sportifs professionnels ?",
    hint: "Give a balanced opinion on professional athletes' high salaries.",
    difficulty: 2,
    followUps: [
      "Penses-tu que ces salaires sont justifiés ?",
      "Cela devrait-il être différent pour le sport féminin ?",
      "Quels autres métiers mériteraient d'être mieux payés ?",
    ],
    modelAnswer: "Je trouve que les salaires des sportifs professionnels sont parfois excessifs, surtout quand on les compare à ceux des infirmiers ou des enseignants. D'un côté, je comprends que le sport génère énormément d'argent grâce à la publicité et à la télévision. D'un autre côté, je pense que cet argent devrait être mieux réparti, notamment pour soutenir le sport féminin, qui reste souvent moins bien payé.",
    keyVocab: [
      { fr: "excessif/excessive", en: "excessive" },
      { fr: "un infirmier/une infirmière", en: "a nurse" },
      { fr: "générer", en: "to generate" },
      { fr: "la publicité", en: "advertising" },
      { fr: "répartir", en: "to distribute" },
      { fr: "le sport féminin", en: "women's sport" },
    ],
  },
  {
    id: "spo_10",
    topicKey: "sports",
    text: "Comment le sport peut-il rassembler les gens et les cultures ?",
    hint: "Discuss sport as a unifying social/cultural force.",
    difficulty: 2,
    followUps: [
      "Peux-tu donner un exemple d'événement sportif international ?",
      "Le sport peut-il réduire les tensions entre pays ?",
      "As-tu déjà rencontré quelqu'un grâce au sport ?",
    ],
    modelAnswer: "Le sport a un pouvoir unique de rassembler des gens de cultures différentes. Par exemple, la Coupe du Monde de football réunit des millions de supporters du monde entier, peu importe leur origine ou leur langue. Le sport peut aussi apaiser les tensions politiques, au moins temporairement, en créant un terrain commun. Personnellement, je me suis fait des amis étrangers grâce à un tournoi international.",
    keyVocab: [
      { fr: "rassembler", en: "to bring together" },
      { fr: "un supporter", en: "a fan/supporter" },
      { fr: "peu importe", en: "no matter" },
      { fr: "apaiser", en: "to soothe/calm" },
      { fr: "un terrain commun", en: "common ground" },
      { fr: "un tournoi", en: "a tournament" },
    ],
  },
  {
    id: "spo_11",
    topicKey: "sports",
    text: "As-tu déjà participé à une compétition sportive ?",
    hint: "Recount a past competition experience using passé composé.",
    difficulty: 2,
    followUps: [
      "Comment t'es-tu préparé(e) ?",
      "Quel a été le résultat ?",
      "Qu'as-tu appris de cette expérience ?",
    ],
    modelAnswer: "Oui, l'année dernière j'ai participé à une course régionale d'athlétisme. Je me suis entraîné(e) pendant trois mois avant l'événement, en courant presque tous les jours. Le jour de la course, j'étais très nerveux/nerveuse, mais j'ai terminé troisième sur vingt participants. Cette expérience m'a appris l'importance de la persévérance et de la discipline.",
    keyVocab: [
      { fr: "une course", en: "a race" },
      { fr: "se préparer", en: "to prepare oneself" },
      { fr: "nerveux/nerveuse", en: "nervous" },
      { fr: "terminer", en: "to finish" },
      { fr: "la persévérance", en: "perseverance" },
      { fr: "la discipline", en: "discipline" },
    ],
  },
  {
    id: "spo_12",
    topicKey: "sports",
    text: "Quel est ton meilleur souvenir lié au sport ?",
    hint: "Describe a memorable sporting moment.",
    difficulty: 2,
    followUps: [
      "Pourquoi ce souvenir est-il si spécial ?",
      "Étais-tu avec d'autres personnes ?",
      "Qu'est-ce que cela t'a fait ressentir ?",
    ],
    modelAnswer: "Mon meilleur souvenir sportif, c'est quand mon équipe de football a gagné la finale du championnat scolaire. J'ai marqué le but décisif dans les dernières minutes du match. Tous mes coéquipiers m'ont félicité(e) et on a célébré ensemble sur le terrain. Ce moment était incroyable parce que j'ai ressenti un mélange de fierté et de joie pure.",
    keyVocab: [
      { fr: "un but décisif", en: "a decisive goal" },
      { fr: "un coéquipier", en: "a teammate" },
      { fr: "féliciter", en: "to congratulate" },
      { fr: "célébrer", en: "to celebrate" },
      { fr: "un mélange", en: "a mix" },
      { fr: "la fierté", en: "pride" },
    ],
  },
  {
    id: "spo_13",
    topicKey: "sports",
    text: "Comment vois-tu ta relation avec le sport dans dix ans ?",
    hint: "Use future tense to speculate about future sporting habits.",
    difficulty: 2,
    followUps: [
      "Continueras-tu à pratiquer le même sport ?",
      "Encourageras-tu tes enfants à faire du sport ?",
      "Feras-tu du sport pour la santé ou pour la compétition ?",
    ],
    modelAnswer: "Dans dix ans, je pense que je ferai toujours du sport, mais peut-être de manière moins compétitive. Je continuerai probablement à courir ou à faire du vélo pour rester en forme et gérer le stress du travail. Si j'ai des enfants, je les encouragerai à essayer plusieurs sports pour qu'ils trouvent celui qu'ils aiment vraiment.",
    keyVocab: [
      { fr: "compétitif/compétitive", en: "competitive" },
      { fr: "faire du vélo", en: "to cycle" },
      { fr: "gérer", en: "to manage" },
      { fr: "encourager", en: "to encourage" },
      { fr: "essayer", en: "to try" },
      { fr: "trouver", en: "to find" },
    ],
  },
  {
    id: "spo_14",
    topicKey: "sports",
    text: "Le sport à l'école devrait-il être obligatoire ?",
    hint: "Argue for or against compulsory school sport.",
    difficulty: 2,
    followUps: [
      "Quels sports devraient être proposés ?",
      "Que faire pour les élèves qui n'aiment pas le sport ?",
      "Le sport aide-t-il à réussir académiquement ?",
    ],
    modelAnswer: "Je pense que le sport devrait rester obligatoire à l'école, du moins jusqu'à un certain âge, parce que beaucoup d'élèves ne feraient aucune activité physique sinon. Cependant, il faudrait proposer plus de choix, comme la danse ou l'escalade, pour que chacun trouve une activité qui lui plaît. Des études montrent aussi que l'exercice améliore la concentration en classe.",
    keyVocab: [
      { fr: "du moins", en: "at least" },
      { fr: "proposer", en: "to offer" },
      { fr: "l'escalade", en: "climbing" },
      { fr: "une étude", en: "a study" },
      { fr: "la concentration", en: "concentration" },
      { fr: "plaire à quelqu'un", en: "to please someone" },
    ],
  },
  {
    id: "spo_15",
    topicKey: "sports",
    text: "Quels sont les dangers du sport de haut niveau pour les jeunes athlètes ?",
    hint: "Discuss risks of intensive training for young athletes.",
    difficulty: 2,
    followUps: [
      "Le sport professionnel peut-il nuire aux études ?",
      "Quelles blessures sont courantes chez les jeunes sportifs ?",
      "Comment trouver un équilibre entre sport et vie scolaire ?",
    ],
    modelAnswer: "Le sport de haut niveau peut présenter des risques pour les jeunes athlètes, notamment la pression excessive et les blessures physiques causées par un entraînement trop intense. Certains jeunes négligent leurs études parce qu'ils consacrent trop de temps à l'entraînement. Je pense qu'il est crucial de trouver un équilibre entre le sport, l'école et le repos pour éviter l'épuisement.",
    keyVocab: [
      { fr: "la pression", en: "pressure" },
      { fr: "une blessure", en: "an injury" },
      { fr: "négliger", en: "to neglect" },
      { fr: "un équilibre", en: "a balance" },
      { fr: "l'épuisement", en: "exhaustion" },
      { fr: "consacrer du temps", en: "to devote time" },
    ],
  },
  {
    id: "spo_16",
    topicKey: "sports",
    text: "Le dopage est-il un problème majeur dans le sport moderne ?",
    hint: "Discuss doping in professional sport.",
    difficulty: 3,
    followUps: [
      "Comment le dopage affecte-t-il l'équité des compétitions ?",
      "Quelles sanctions devraient être appliquées ?",
      "Pourquoi certains athlètes prennent-ils ce risque ?",
    ],
    modelAnswer: "Le dopage reste un problème sérieux dans le sport moderne parce qu'il compromet l'équité des compétitions et trahit la confiance des supporters. Certains athlètes prennent ce risque à cause de la pression immense pour réussir et gagner de l'argent. À mon avis, les sanctions devraient être plus sévères, y compris l'interdiction à vie pour les récidivistes, afin de dissuader la tricherie.",
    keyVocab: [
      { fr: "le dopage", en: "doping" },
      { fr: "compromettre", en: "to compromise" },
      { fr: "l'équité", en: "fairness" },
      { fr: "trahir", en: "to betray" },
      { fr: "une sanction", en: "a sanction" },
      { fr: "dissuader", en: "to deter" },
    ],
  },
  {
    id: "spo_17",
    topicKey: "sports",
    text: "Dans quelle mesure les grands événements sportifs profitent-ils réellement aux villes hôtes ?",
    hint: "Evaluate economic/social impact of hosting major sporting events.",
    difficulty: 3,
    followUps: [
      "Quels sont les coûts cachés de l'organisation d'un événement sportif ?",
      "Les infrastructures construites sont-elles toujours utilisées après ?",
      "Peux-tu citer un exemple concret ?",
    ],
    modelAnswer: "Les grands événements sportifs, comme les Jeux Olympiques, promettent souvent des retombées économiques importantes, mais la réalité est plus nuancée. D'une part, ils créent des emplois temporaires et attirent des touristes. D'autre part, les coûts de construction sont énormes et certaines infrastructures deviennent des « éléphants blancs » inutilisés après l'événement. Il faudrait mieux planifier l'héritage à long terme de ces investissements.",
    keyVocab: [
      { fr: "les retombées économiques", en: "economic benefits/spillover" },
      { fr: "un emploi temporaire", en: "a temporary job" },
      { fr: "un éléphant blanc", en: "a white elephant (wasted investment)" },
      { fr: "un investissement", en: "an investment" },
      { fr: "l'héritage", en: "the legacy" },
      { fr: "nuancé(e)", en: "nuanced" },
    ],
  },
  {
    id: "spo_18",
    topicKey: "sports",
    text: "Comment la technologie a-t-elle transformé la façon dont on pratique et regarde le sport ?",
    hint: "Discuss technology's impact on sport (VAR, wearables, streaming).",
    difficulty: 3,
    followUps: [
      "La technologie rend-elle les décisions arbitrales plus justes ?",
      "Les objets connectés améliorent-ils vraiment la performance ?",
      "Le streaming a-t-il changé la manière de suivre le sport ?",
    ],
    modelAnswer: "La technologie a profondément transformé le sport, aussi bien pour les athlètes que pour les spectateurs. Par exemple, l'arbitrage vidéo (la VAR) au football permet de corriger des erreurs d'arbitrage flagrantes, même si certains estiment que cela ralentit le jeu. Par ailleurs, les objets connectés permettent aux athlètes de suivre précisément leurs performances physiques. Enfin, le streaming en direct a rendu le sport accessible partout dans le monde, ce qui a élargi son public.",
    keyVocab: [
      { fr: "l'arbitrage", en: "refereeing" },
      { fr: "flagrant(e)", en: "blatant/obvious" },
      { fr: "ralentir", en: "to slow down" },
      { fr: "un objet connecté", en: "a wearable device" },
      { fr: "élargir", en: "to widen/broaden" },
      { fr: "le public", en: "the audience" },
    ],
  },
  {
    id: "spo_19",
    topicKey: "sports",
    text: "Le sport professionnel accorde-t-il assez d'importance à la santé mentale des athlètes ?",
    hint: "Discuss mental health awareness in professional sport.",
    difficulty: 3,
    followUps: [
      "Connais-tu des exemples d'athlètes qui ont parlé de leur santé mentale ?",
      "Pourquoi ce sujet était-il tabou auparavant ?",
      "Que pourrait faire davantage le monde sportif ?",
    ],
    modelAnswer: "Pendant longtemps, la santé mentale des athlètes a été négligée au profit de la performance physique. Heureusement, la situation évolue : plusieurs athlètes célèbres ont récemment parlé ouvertement de leur anxiété ou de leur dépression, ce qui a contribué à briser le tabou. Néanmoins, je pense que les fédérations sportives devraient investir davantage dans le soutien psychologique, car la pression médiatique peut être écrasante.",
    keyVocab: [
      { fr: "négliger", en: "to neglect" },
      { fr: "l'anxiété", en: "anxiety" },
      { fr: "briser un tabou", en: "to break a taboo" },
      { fr: "une fédération", en: "a federation" },
      { fr: "le soutien psychologique", en: "psychological support" },
      { fr: "écrasant(e)", en: "overwhelming" },
    ],
  },
  {
    id: "spo_20",
    topicKey: "sports",
    text: "Faut-il plus d'égalité entre le sport masculin et le sport féminin ?",
    hint: "Discuss gender equality in sport (pay, media coverage).",
    difficulty: 3,
    followUps: [
      "Quelles inégalités persistent aujourd'hui ?",
      "La couverture médiatique du sport féminin a-t-elle progressé ?",
      "Que pourrait-on faire pour encourager plus de filles à faire du sport ?",
    ],
    modelAnswer: "Il existe encore de fortes inégalités entre le sport masculin et le sport féminin, notamment en matière de salaires et de couverture médiatique. Par exemple, les footballeuses professionnelles gagnent souvent bien moins que leurs homologues masculins, malgré un niveau de compétition tout aussi élevé. Je pense que les médias et les sponsors devraient investir davantage dans le sport féminin pour combler cet écart et inspirer davantage de jeunes filles.",
    keyVocab: [
      { fr: "une inégalité", en: "an inequality" },
      { fr: "un homologue", en: "a counterpart" },
      { fr: "la couverture médiatique", en: "media coverage" },
      { fr: "un sponsor", en: "a sponsor" },
      { fr: "combler un écart", en: "to close a gap" },
      { fr: "inspirer", en: "to inspire" },
    ],
  },
  {
    id: "spo_21",
    topicKey: "sports",
    text: "Quel rôle jouent les entraîneurs dans la réussite d'un athlète ?",
    hint: "Discuss the influence of coaches on athletic success.",
    difficulty: 2,
    followUps: [
      "As-tu déjà eu un entraîneur qui t'a beaucoup marqué(e) ?",
      "Qu'est-ce qui fait un bon entraîneur ?",
      "Un mauvais entraîneur peut-il décourager un athlète ?",
    ],
    modelAnswer: "Les entraîneurs jouent un rôle essentiel dans la réussite d'un athlète, non seulement sur le plan technique mais aussi sur le plan psychologique. Un bon entraîneur sait motiver, corriger les erreurs avec bienveillance et adapter son approche à chaque individu. J'ai eu une entraîneuse de natation qui croyait en moi même quand je doutais de mes capacités, et cela a fait toute la différence dans mes progrès.",
    keyVocab: [
      { fr: "sur le plan technique", en: "technically speaking" },
      { fr: "corriger", en: "to correct" },
      { fr: "la bienveillance", en: "kindness" },
      { fr: "adapter", en: "to adapt" },
      { fr: "douter de", en: "to doubt" },
      { fr: "croire en quelqu'un", en: "to believe in someone" },
    ],
  },
  {
    id: "spo_22",
    topicKey: "sports",
    text: "Comment gères-tu la déception après une défaite sportive ?",
    hint: "Discuss coping strategies after losing a game/competition.",
    difficulty: 2,
    followUps: [
      "As-tu déjà vécu une défaite difficile à accepter ?",
      "Comment tes coéquipiers réagissent-ils à la défaite ?",
      "Qu'est-ce que la défaite peut nous apprendre ?",
    ],
    modelAnswer: "La déception après une défaite est normale, mais j'essaie de la voir comme une occasion d'apprendre plutôt que comme un échec total. Après une défaite difficile en finale l'année dernière, j'étais très triste, mais mon entraîneur m'a aidé(e) à analyser mes erreurs de manière constructive. Je pense que savoir perdre avec dignité est aussi important que savoir gagner.",
    keyVocab: [
      { fr: "la déception", en: "disappointment" },
      { fr: "un échec", en: "a failure" },
      { fr: "analyser", en: "to analyse" },
      { fr: "constructif/constructive", en: "constructive" },
      { fr: "la dignité", en: "dignity" },
      { fr: "accepter", en: "to accept" },
    ],
  },
  {
    id: "spo_23",
    topicKey: "sports",
    text: "Quel sport aimerais-tu essayer si tu en avais l'occasion ?",
    hint: "Use conditional to describe a sport you'd like to try.",
    difficulty: 1,
    followUps: [
      "Pourquoi ce sport t'intéresse-t-il ?",
      "Qu'est-ce qui te freine à l'essayer ?",
      "Connais-tu quelqu'un qui pratique déjà ce sport ?",
    ],
    modelAnswer: "Si j'en avais l'occasion, j'aimerais essayer l'escalade parce que ça a l'air à la fois physique et mental — il faut réfléchir à chaque mouvement. Ce qui me freine, c'est que je n'ai pas beaucoup de temps libre en ce moment et que l'équipement peut être coûteux. Mon cousin fait de l'escalade depuis un an et il en parle toujours avec beaucoup de passion.",
    keyVocab: [
      { fr: "avoir l'occasion de", en: "to have the chance to" },
      { fr: "un mouvement", en: "a movement" },
      { fr: "freiner", en: "to hold back / hinder" },
      { fr: "l'équipement", en: "equipment" },
      { fr: "coûteux/coûteuse", en: "costly" },
      { fr: "la passion", en: "passion" },
    ],
  },
  {
    id: "spo_24",
    topicKey: "sports",
    text: "Comment le sport peut-il aider les personnes en situation de handicap ?",
    hint: "Discuss adaptive/Paralympic sport and inclusion.",
    difficulty: 3,
    followUps: [
      "Connais-tu les Jeux Paralympiques ?",
      "Que faudrait-il faire pour rendre le sport plus accessible ?",
      "Le sport adapté reçoit-il assez d'attention médiatique ?",
    ],
    modelAnswer: "Le sport peut apporter d'énormes bienfaits aux personnes en situation de handicap, tant sur le plan physique que psychologique, en renforçant la confiance en soi et l'autonomie. Les Jeux Paralympiques, par exemple, mettent en avant des athlètes extraordinaires, mais malheureusement, ils reçoivent encore beaucoup moins de couverture médiatique que les Jeux Olympiques classiques. Il faudrait investir davantage dans des infrastructures accessibles pour encourager plus de participation.",
    keyVocab: [
      { fr: "un handicap", en: "a disability" },
      { fr: "renforcer", en: "to strengthen" },
      { fr: "la confiance en soi", en: "self-confidence" },
      { fr: "l'autonomie", en: "independence" },
      { fr: "mettre en avant", en: "to showcase" },
      { fr: "accessible", en: "accessible" },
    ],
  },
  {
    id: "spo_25",
    topicKey: "sports",
    text: "Penses-tu que les jeunes d'aujourd'hui font assez de sport ?",
    hint: "Discuss youth physical activity levels vs screen time.",
    difficulty: 2,
    followUps: [
      "Quel rôle jouent les écrans dans ce problème ?",
      "Que pourraient faire les parents pour encourager le sport ?",
      "Le sport en ligne (esport) compte-t-il comme du sport ?",
    ],
    modelAnswer: "Je pense que beaucoup de jeunes ne font pas assez d'activité physique aujourd'hui, principalement à cause du temps passé devant les écrans, comme les jeux vidéo et les réseaux sociaux. Les parents pourraient encourager leurs enfants en pratiquant eux-mêmes un sport en famille. Quant à l'esport, je ne pense pas qu'il puisse remplacer l'exercice physique, même s'il demande de la concentration et de la stratégie.",
    keyVocab: [
      { fr: "un écran", en: "a screen" },
      { fr: "les réseaux sociaux", en: "social media" },
      { fr: "en famille", en: "as a family" },
      { fr: "remplacer", en: "to replace" },
      { fr: "la stratégie", en: "strategy" },
      { fr: "l'exercice physique", en: "physical exercise" },
    ],
  },
  {
    id: "spo_26",
    topicKey: "sports",
    text: "Comment te sens-tu avant une compétition importante ?",
    hint: "Describe pre-competition emotions and how you manage them.",
    difficulty: 2,
    followUps: [
      "As-tu des rituels avant de commencer ?",
      "Comment gères-tu le stress ou l'anxiété ?",
      "Est-ce que la pression t'aide ou te nuit ?",
    ],
    modelAnswer: "Avant une compétition importante, je me sens généralement très nerveux/nerveuse, mon cœur bat vite et j'ai parfois du mal à dormir la nuit précédente. J'ai un petit rituel : j'écoute de la musique et je fais des exercices de respiration pour me calmer. Un peu de pression m'aide à rester concentré(e), mais trop de stress peut nuire à ma performance.",
    keyVocab: [
      { fr: "le cœur bat vite", en: "heart beats fast" },
      { fr: "un rituel", en: "a ritual" },
      { fr: "la respiration", en: "breathing" },
      { fr: "se calmer", en: "to calm down" },
      { fr: "nuire à", en: "to harm" },
      { fr: "concentré(e)", en: "focused" },
    ],
  },
  {
    id: "spo_27",
    topicKey: "sports",
    text: "Le sport scolaire prépare-t-il bien les jeunes à une vie active ?",
    hint: "Evaluate whether school sport builds lifelong healthy habits.",
    difficulty: 3,
    followUps: [
      "Le sport scolaire est-il varié dans ton pays ?",
      "Que devrait-on changer dans le programme sportif à l'école ?",
      "Continues-tu les activités apprises à l'école aujourd'hui ?",
    ],
    modelAnswer: "Je ne suis pas certain(e) que le sport scolaire prépare toujours bien les jeunes à une vie active, car les cours d'EPS se concentrent souvent sur quelques sports compétitifs, comme le football ou le rugby, plutôt que sur des activités qu'on peut pratiquer toute sa vie, comme la natation ou la randonnée. Il faudrait diversifier le programme pour donner aux élèves des compétences durables plutôt qu'une expérience purement scolaire.",
    keyVocab: [
      { fr: "l'EPS (éducation physique et sportive)", en: "PE" },
      { fr: "la randonnée", en: "hiking" },
      { fr: "diversifier", en: "to diversify" },
      { fr: "durable", en: "lasting/sustainable" },
      { fr: "une compétence", en: "a skill" },
      { fr: "purement", en: "purely" },
    ],
  },
  {
    id: "spo_28",
    topicKey: "sports",
    text: "Si tu devais créer une nouvelle compétition sportive, à quoi ressemblerait-elle ?",
    hint: "Use conditional to invent a new sporting competition.",
    difficulty: 3,
    followUps: [
      "Quelles règles aurait cette compétition ?",
      "Qui pourrait y participer ?",
      "Pourquoi penses-tu que les gens l'aimeraient ?",
    ],
    modelAnswer: "Si je devais créer une nouvelle compétition, ce serait un tournoi multisport mélangeant plusieurs disciplines, comme le tennis, la natation et l'escalade, pour tester la polyvalence des athlètes. Les règles encourageraient l'esprit d'équipe plutôt que la performance individuelle. Je pense que les gens l'aimeraient parce que c'est original et cela montrerait des talents variés plutôt qu'une seule compétence.",
    keyVocab: [
      { fr: "mélanger", en: "to mix" },
      { fr: "une discipline", en: "a discipline/sport" },
      { fr: "la polyvalence", en: "versatility" },
      { fr: "l'esprit d'équipe", en: "team spirit" },
      { fr: "original(e)", en: "original" },
      { fr: "varié(e)", en: "varied" },
    ],
  },
  {
    id: "spo_29",
    topicKey: "sports",
    text: "Le succès dans le sport dépend-il davantage du talent ou du travail ?",
    hint: "Debate natural talent vs hard work in sporting success.",
    difficulty: 3,
    followUps: [
      "Peux-tu citer un exemple d'athlète connu pour son travail acharné ?",
      "Le talent naturel suffit-il sans discipline ?",
      "Qu'est-ce qui compte le plus selon toi ?",
    ],
    modelAnswer: "Je pense que le talent naturel donne un avantage au départ, mais c'est le travail acharné et la discipline qui déterminent vraiment le succès à long terme. De nombreux athlètes talentueux abandonnent parce qu'ils manquent de motivation, tandis que d'autres, moins doués au départ, réussissent grâce à une persévérance extraordinaire. À mon avis, le travail compte davantage que le talent brut.",
    keyVocab: [
      { fr: "un avantage", en: "an advantage" },
      { fr: "acharné(e)", en: "relentless" },
      { fr: "abandonner", en: "to give up" },
      { fr: "doué(e)", en: "gifted" },
      { fr: "extraordinaire", en: "extraordinary" },
      { fr: "brut(e)", en: "raw" },
    ],
  },
  {
    id: "spo_30",
    topicKey: "sports",
    text: "Dans quelle mesure le sport reflète-t-il les valeurs d'une société ?",
    hint: "Discuss sport as a mirror of societal values.",
    difficulty: 3,
    followUps: [
      "Le sport peut-il révéler des inégalités sociales ?",
      "Comment le sport véhicule-t-il le nationalisme ?",
      "Le sport peut-il être un outil de changement social ?",
    ],
    modelAnswer: "Le sport reflète souvent les valeurs et les tensions d'une société, qu'il s'agisse d'inégalités économiques dans l'accès aux infrastructures ou de nationalisme exacerbé lors des compétitions internationales. En même temps, le sport peut aussi être un puissant outil de changement social, comme on l'a vu avec des athlètes qui ont utilisé leur plateforme pour dénoncer le racisme ou les injustices. Le sport n'est donc jamais complètement séparé de la société qui l'entoure.",
    keyVocab: [
      { fr: "véhiculer", en: "to convey" },
      { fr: "exacerbé(e)", en: "heightened/exacerbated" },
      { fr: "un outil", en: "a tool" },
      { fr: "dénoncer", en: "to denounce" },
      { fr: "l'injustice", en: "injustice" },
      { fr: "entourer", en: "to surround" },
    ],
  },

  // ── LES ÉMOTIONS ─────────────────────────────────────────────────────────
  {
    id: "emo_01",
    topicKey: "emotions",
    text: "Comment te sens-tu aujourd'hui ?",
    hint: "Describe your current mood and give a simple reason.",
    difficulty: 1,
    followUps: [
      "Qu'est-ce qui t'a mis(e) de cette humeur ?",
      "Est-ce que ton humeur change souvent pendant la journée ?",
      "Que fais-tu pour te sentir mieux quand tu es triste ?",
    ],
    modelAnswer: "Aujourd'hui, je me sens plutôt content(e) parce que j'ai bien dormi et j'ai un examen important derrière moi. D'habitude, mon humeur dépend beaucoup du temps qu'il fait — je suis plus joyeux/joyeuse quand il y a du soleil. Quand je suis triste, j'aime écouter de la musique ou parler à un ami pour me sentir mieux.",
    keyVocab: [
      { fr: "se sentir", en: "to feel" },
      { fr: "l'humeur", en: "mood" },
      { fr: "content(e)", en: "happy/pleased" },
      { fr: "triste", en: "sad" },
      { fr: "joyeux/joyeuse", en: "joyful" },
      { fr: "dépendre de", en: "to depend on" },
    ],
  },
  {
    id: "emo_02",
    topicKey: "emotions",
    text: "Qu'est-ce qui te rend heureux/heureuse ?",
    hint: "Describe what makes you happy — people, activities, moments.",
    difficulty: 1,
    followUps: [
      "Passes-tu beaucoup de temps avec ces personnes ?",
      "Est-ce que les petites choses te rendent heureux/heureuse aussi ?",
      "Qu'est-ce que le bonheur signifie pour toi ?",
    ],
    modelAnswer: "Ce qui me rend le plus heureux/heureuse, c'est de passer du temps avec ma famille et mes amis proches. J'apprécie aussi les petites choses, comme boire un chocolat chaud un jour de pluie ou écouter ma chanson préférée. Pour moi, le bonheur, ce n'est pas seulement les grands événements, mais surtout les moments simples du quotidien.",
    keyVocab: [
      { fr: "rendre heureux", en: "to make happy" },
      { fr: "apprécier", en: "to appreciate" },
      { fr: "le bonheur", en: "happiness" },
      { fr: "un événement", en: "an event" },
      { fr: "le quotidien", en: "everyday life" },
      { fr: "simple", en: "simple" },
    ],
  },
  {
    id: "emo_03",
    topicKey: "emotions",
    text: "Qu'est-ce qui te met en colère ?",
    hint: "Describe what makes you angry and how you react.",
    difficulty: 1,
    followUps: [
      "Comment réagis-tu quand tu es en colère ?",
      "Est-ce facile pour toi de te calmer ?",
      "Est-ce que tu montres facilement tes émotions ?",
    ],
    modelAnswer: "Ce qui me met le plus en colère, c'est l'injustice, par exemple quand quelqu'un est traité injustement. Quand je suis en colère, j'essaie de respirer profondément avant de réagir, parce que je ne veux pas dire quelque chose que je regretterai plus tard. Je ne montre pas toujours facilement mes émotions ; je préfère parfois réfléchir avant de parler.",
    keyVocab: [
      { fr: "être en colère", en: "to be angry" },
      { fr: "l'injustice", en: "injustice" },
      { fr: "réagir", en: "to react" },
      { fr: "respirer profondément", en: "to breathe deeply" },
      { fr: "regretter", en: "to regret" },
      { fr: "montrer ses émotions", en: "to show one's emotions" },
    ],
  },
  {
    id: "emo_04",
    topicKey: "emotions",
    text: "As-tu déjà eu peur de quelque chose récemment ?",
    hint: "Use passé composé to describe a recent frightening experience.",
    difficulty: 1,
    followUps: [
      "Qu'est-ce qui t'a fait peur exactement ?",
      "Comment as-tu réagi sur le moment ?",
      "As-tu encore peur de cette chose maintenant ?",
    ],
    modelAnswer: "Oui, la semaine dernière j'ai eu peur pendant un orage très violent — il y avait beaucoup de tonnerre et d'éclairs. Sur le moment, mon cœur battait très vite et je me suis caché(e) sous ma couverture. Maintenant, je n'ai plus vraiment peur des orages, mais je reste un peu nerveux/nerveuse quand le ciel devient très sombre.",
    keyVocab: [
      { fr: "avoir peur", en: "to be afraid" },
      { fr: "un orage", en: "a storm" },
      { fr: "le tonnerre", en: "thunder" },
      { fr: "un éclair", en: "lightning" },
      { fr: "se cacher", en: "to hide" },
      { fr: "une couverture", en: "a blanket" },
    ],
  },
  {
    id: "emo_05",
    topicKey: "emotions",
    text: "Comment exprimes-tu tes sentiments à tes amis ?",
    hint: "Describe how you communicate feelings to friends.",
    difficulty: 1,
    followUps: [
      "Est-il facile pour toi de parler de tes émotions ?",
      "Préfères-tu écrire ou parler pour exprimer tes sentiments ?",
      "Tes amis te comprennent-ils bien ?",
    ],
    modelAnswer: "En général, je préfère parler directement à mes amis quand quelque chose me préoccupe, plutôt que de garder mes sentiments pour moi. Parfois, ce n'est pas facile, surtout si c'est un sujet délicat, mais je pense que la communication est essentielle dans une amitié. Heureusement, mes amis proches me comprennent très bien et m'écoutent sans me juger.",
    keyVocab: [
      { fr: "exprimer", en: "to express" },
      { fr: "un sentiment", en: "a feeling" },
      { fr: "préoccuper", en: "to worry/concern" },
      { fr: "délicat(e)", en: "sensitive/delicate" },
      { fr: "une amitié", en: "a friendship" },
      { fr: "juger", en: "to judge" },
    ],
  },
  {
    id: "emo_06",
    topicKey: "emotions",
    text: "Te sens-tu parfois stressé(e) à cause de l'école ?",
    hint: "Discuss school-related stress and coping mechanisms.",
    difficulty: 1,
    followUps: [
      "Qu'est-ce qui te stresse le plus à l'école ?",
      "Comment gères-tu ce stress ?",
      "Est-ce que tu en parles à quelqu'un ?",
    ],
    modelAnswer: "Oui, je me sens souvent stressé(e), surtout avant les examens ou quand j'ai beaucoup de devoirs à rendre en même temps. Ce qui me stresse le plus, c'est la peur de ne pas réussir. Pour gérer ce stress, j'essaie de bien organiser mon temps et de faire des pauses régulières. J'en parle aussi à mes parents, qui m'aident à relativiser.",
    keyVocab: [
      { fr: "stressé(e)", en: "stressed" },
      { fr: "rendre un devoir", en: "to hand in homework" },
      { fr: "réussir", en: "to succeed" },
      { fr: "organiser son temps", en: "to organise one's time" },
      { fr: "une pause", en: "a break" },
      { fr: "relativiser", en: "to put into perspective" },
    ],
  },
  {
    id: "emo_07",
    topicKey: "emotions",
    text: "Comment gères-tu le stress au quotidien ?",
    hint: "Explain strategies for managing everyday stress.",
    difficulty: 2,
    followUps: [
      "Est-ce que le sport t'aide à te détendre ?",
      "Qu'est-ce qui fonctionne le mieux pour toi ?",
      "Est-ce que tout le monde gère le stress de la même façon ?",
    ],
    modelAnswer: "Pour gérer le stress au quotidien, j'essaie de garder un équilibre entre le travail et les loisirs. Le sport m'aide énormément à me détendre, car courir me permet de vider mon esprit. Écouter de la musique et passer du temps avec mes proches fonctionne aussi très bien pour moi. Cependant, je pense que chacun gère le stress différemment selon sa personnalité.",
    keyVocab: [
      { fr: "gérer", en: "to manage" },
      { fr: "se détendre", en: "to relax" },
      { fr: "vider son esprit", en: "to clear one's mind" },
      { fr: "les proches", en: "close ones/family" },
      { fr: "fonctionner", en: "to work (function)" },
      { fr: "un équilibre", en: "a balance" },
    ],
  },
  {
    id: "emo_08",
    topicKey: "emotions",
    text: "Penses-tu qu'il est important de parler de ses émotions ?",
    hint: "Give an opinion on the importance of expressing emotions openly.",
    difficulty: 2,
    followUps: [
      "Pourquoi certaines personnes trouvent-elles cela difficile ?",
      "Y a-t-il des différences culturelles à ce sujet ?",
      "As-tu déjà été soulagé(e) après avoir parlé de tes émotions ?",
    ],
    modelAnswer: "Oui, je pense qu'il est essentiel de parler de ses émotions plutôt que de les garder à l'intérieur, car cela peut mener à l'anxiété ou même à la dépression. Certaines personnes trouvent cela difficile parce qu'elles ont peur d'être jugées ou considérées comme faibles. Personnellement, je me suis toujours senti(e) soulagé(e) après avoir partagé mes soucis avec quelqu'un en qui j'ai confiance.",
    keyVocab: [
      { fr: "garder à l'intérieur", en: "to keep inside" },
      { fr: "la dépression", en: "depression" },
      { fr: "faible", en: "weak" },
      { fr: "soulagé(e)", en: "relieved" },
      { fr: "un souci", en: "a worry" },
      { fr: "avoir confiance en", en: "to trust" },
    ],
  },
  {
    id: "emo_09",
    topicKey: "emotions",
    text: "Décris un moment où tu as ressenti une grande joie.",
    hint: "Use passé composé to describe a moment of great joy.",
    difficulty: 2,
    followUps: [
      "Qui était avec toi à ce moment-là ?",
      "Comment as-tu célébré ce moment ?",
      "Repenses-tu souvent à ce souvenir ?",
    ],
    modelAnswer: "J'ai ressenti une immense joie le jour où j'ai reçu les résultats de mes examens et découvert que j'avais réussi avec de très bonnes notes. Mes parents étaient tellement fiers qu'ils m'ont organisé une petite fête surprise avec mes amis proches. On a mangé un gâteau et dansé toute la soirée. Je repense souvent à ce souvenir quand j'ai besoin de motivation.",
    keyVocab: [
      { fr: "ressentir", en: "to feel (an emotion)" },
      { fr: "la joie", en: "joy" },
      { fr: "des résultats", en: "results" },
      { fr: "une fête surprise", en: "a surprise party" },
      { fr: "danser", en: "to dance" },
      { fr: "la motivation", en: "motivation" },
    ],
  },
  {
    id: "emo_10",
    topicKey: "emotions",
    text: "Comment réconfortes-tu un ami qui est triste ?",
    hint: "Explain how you comfort a sad friend.",
    difficulty: 2,
    followUps: [
      "Qu'est-ce qu'il ne faut surtout pas dire à quelqu'un de triste ?",
      "Préfères-tu écouter ou donner des conseils ?",
      "Est-ce que quelqu'un t'a déjà réconforté(e) de manière mémorable ?",
    ],
    modelAnswer: "Quand un ami est triste, j'essaie d'abord de l'écouter sans le juger, sans essayer immédiatement de résoudre le problème. Je pense qu'il ne faut jamais minimiser les sentiments de quelqu'un en disant « ce n'est pas grave ». Je préfère écouter plutôt que donner des conseils, sauf si la personne me le demande directement. Une amie m'a réconforté(e) une fois simplement en restant avec moi en silence, et cela m'a beaucoup touché(e).",
    keyVocab: [
      { fr: "réconforter", en: "to comfort" },
      { fr: "résoudre", en: "to resolve/solve" },
      { fr: "minimiser", en: "to minimise/play down" },
      { fr: "un conseil", en: "a piece of advice" },
      { fr: "le silence", en: "silence" },
      { fr: "toucher (émotionnellement)", en: "to touch/move" },
    ],
  },
  {
    id: "emo_11",
    topicKey: "emotions",
    text: "Les réseaux sociaux influencent-ils tes émotions ?",
    hint: "Discuss the impact of social media on emotional wellbeing.",
    difficulty: 2,
    followUps: [
      "Te sens-tu parfois jaloux/jalouse en regardant les autres en ligne ?",
      "Prends-tu des pauses des réseaux sociaux ?",
      "Les réseaux sociaux peuvent-ils aussi avoir des effets positifs ?",
    ],
    modelAnswer: "Oui, je pense que les réseaux sociaux ont un impact réel sur mes émotions. Parfois, je me sens un peu jaloux/jalouse en voyant les vacances ou les réussites des autres, même si je sais que les gens ne montrent que le meilleur de leur vie. Pour cette raison, je prends parfois des pauses des réseaux sociaux. Cependant, ils me permettent aussi de rester en contact avec des amis éloignés, ce qui est positif.",
    keyVocab: [
      { fr: "influencer", en: "to influence" },
      { fr: "jaloux/jalouse", en: "jealous" },
      { fr: "une réussite", en: "an achievement" },
      { fr: "prendre une pause", en: "to take a break" },
      { fr: "éloigné(e)", en: "distant/far away" },
      { fr: "un impact", en: "an impact" },
    ],
  },
  {
    id: "emo_12",
    topicKey: "emotions",
    text: "Comment as-tu changé émotionnellement en grandissant ?",
    hint: "Reflect on emotional growth over time.",
    difficulty: 2,
    followUps: [
      "Étais-tu plus timide quand tu étais petit(e) ?",
      "Qu'est-ce qui t'a aidé à mûrir émotionnellement ?",
      "Y a-t-il une émotion que tu gères mieux qu'avant ?",
    ],
    modelAnswer: "Quand j'étais plus jeune, j'étais beaucoup plus timide et j'avais du mal à exprimer mes émotions, surtout la colère ou la tristesse. En grandissant, j'ai appris à mieux communiquer grâce aux expériences difficiles que j'ai vécues et aux conseils de mes parents. Aujourd'hui, je gère beaucoup mieux le stress qu'il y a quelques années, car j'ai développé des stratégies efficaces.",
    keyVocab: [
      { fr: "timide", en: "shy" },
      { fr: "avoir du mal à", en: "to struggle to" },
      { fr: "mûrir", en: "to mature" },
      { fr: "vivre une expérience", en: "to experience/live through" },
      { fr: "développer", en: "to develop" },
      { fr: "efficace", en: "effective" },
    ],
  },
  {
    id: "emo_13",
    topicKey: "emotions",
    text: "Penses-tu que les garçons et les filles expriment leurs émotions différemment ?",
    hint: "Discuss gender and emotional expression, with nuance.",
    difficulty: 3,
    followUps: [
      "D'où viennent ces différences, selon toi ?",
      "Ces stéréotypes sont-ils en train de changer ?",
      "Est-ce dangereux de réprimer ses émotions ?",
    ],
    modelAnswer: "Je pense que la société encourage souvent les filles à exprimer leurs émotions plus ouvertement, tandis que les garçons sont parfois poussés à cacher leur vulnérabilité, notamment la tristesse. Cela vient souvent de stéréotypes culturels appris dès l'enfance. Heureusement, ces normes évoluent progressivement, et de plus en plus de gens reconnaissent qu'il est dangereux pour la santé mentale de réprimer constamment ses émotions.",
    keyVocab: [
      { fr: "encourager", en: "to encourage" },
      { fr: "cacher", en: "to hide" },
      { fr: "la vulnérabilité", en: "vulnerability" },
      { fr: "un stéréotype", en: "a stereotype" },
      { fr: "évoluer", en: "to evolve" },
      { fr: "réprimer", en: "to repress" },
    ],
  },
  {
    id: "emo_14",
    topicKey: "emotions",
    text: "Quel est le lien entre les émotions et la santé physique ?",
    hint: "Discuss the mind-body connection.",
    difficulty: 3,
    followUps: [
      "Le stress chronique peut-il rendre malade ?",
      "Comment les émotions positives influencent-elles le corps ?",
      "Que penses-tu de la méditation pour gérer les émotions ?",
    ],
    modelAnswer: "Il existe un lien étroit entre les émotions et la santé physique. Le stress chronique, par exemple, peut affaiblir le système immunitaire et provoquer des problèmes comme l'insomnie ou les maux de tête. À l'inverse, des émotions positives, comme la gratitude ou la joie, semblent améliorer la santé cardiaque et prolonger l'espérance de vie. Je pense que des pratiques comme la méditation peuvent vraiment aider à réguler nos émotions et, par conséquent, notre bien-être physique.",
    keyVocab: [
      { fr: "étroit(e)", en: "close/narrow" },
      { fr: "affaiblir", en: "to weaken" },
      { fr: "le système immunitaire", en: "immune system" },
      { fr: "la gratitude", en: "gratitude" },
      { fr: "l'espérance de vie", en: "life expectancy" },
      { fr: "réguler", en: "to regulate" },
    ],
  },
  {
    id: "emo_15",
    topicKey: "emotions",
    text: "Faut-il apprendre l'intelligence émotionnelle à l'école ?",
    hint: "Argue for/against teaching emotional intelligence in schools.",
    difficulty: 3,
    followUps: [
      "Qu'est-ce que l'intelligence émotionnelle exactement ?",
      "Comment cela pourrait-il être enseigné concrètement ?",
      "Cela remplacerait-il d'autres matières importantes ?",
    ],
    modelAnswer: "Je pense fermement que l'intelligence émotionnelle devrait être enseignée à l'école, au même titre que les mathématiques ou les sciences. Savoir reconnaître, comprendre et gérer ses émotions est essentiel pour réussir dans la vie personnelle et professionnelle. Cela pourrait être intégré à travers des ateliers de communication ou de résolution de conflits, sans nécessairement remplacer d'autres matières, mais plutôt en les complétant.",
    keyVocab: [
      { fr: "l'intelligence émotionnelle", en: "emotional intelligence" },
      { fr: "reconnaître", en: "to recognise" },
      { fr: "un atelier", en: "a workshop" },
      { fr: "la résolution de conflits", en: "conflict resolution" },
      { fr: "intégrer", en: "to integrate" },
      { fr: "compléter", en: "to complement" },
    ],
  },
  {
    id: "emo_16",
    topicKey: "emotions",
    text: "As-tu déjà ressenti de la nostalgie ? Décris cette expérience.",
    hint: "Describe an experience of nostalgia.",
    difficulty: 2,
    followUps: [
      "Qu'est-ce qui déclenche généralement ta nostalgie ?",
      "Est-ce une émotion agréable ou plutôt triste pour toi ?",
      "Aimes-tu regarder de vieilles photos ?",
    ],
    modelAnswer: "Oui, je ressens souvent de la nostalgie en écoutant des chansons que j'écoutais quand j'étais enfant. Récemment, j'ai retrouvé de vieilles photos de vacances en famille, et cela m'a rappelé des souvenirs très heureux, mais aussi un peu de tristesse parce que ces moments sont passés. Pour moi, la nostalgie est une émotion douce-amère — agréable et mélancolique à la fois.",
    keyVocab: [
      { fr: "la nostalgie", en: "nostalgia" },
      { fr: "déclencher", en: "to trigger" },
      { fr: "rappeler des souvenirs", en: "to bring back memories" },
      { fr: "doux-amer/douce-amère", en: "bittersweet" },
      { fr: "mélancolique", en: "melancholic" },
      { fr: "agréable", en: "pleasant" },
    ],
  },
  {
    id: "emo_17",
    topicKey: "emotions",
    text: "Comment fais-tu face à la déception ?",
    hint: "Explain how you cope with disappointment.",
    difficulty: 2,
    followUps: [
      "Peux-tu donner un exemple de déception récente ?",
      "Combien de temps mets-tu à surmonter une déception ?",
      "Est-ce que tu en parles à d'autres personnes ?",
    ],
    modelAnswer: "Face à la déception, j'essaie d'abord d'accepter mes sentiments au lieu de les ignorer. Récemment, j'ai été déçu(e) de ne pas avoir été sélectionné(e) pour une équipe sportive. Il m'a fallu quelques jours pour surmonter cette déception, mais en parler avec mes amis m'a beaucoup aidé(e) à relativiser et à me concentrer sur mes prochains objectifs.",
    keyVocab: [
      { fr: "faire face à", en: "to face/cope with" },
      { fr: "la déception", en: "disappointment" },
      { fr: "déçu(e)", en: "disappointed" },
      { fr: "surmonter", en: "to overcome" },
      { fr: "se concentrer sur", en: "to focus on" },
      { fr: "un objectif", en: "a goal" },
    ],
  },
  {
    id: "emo_18",
    topicKey: "emotions",
    text: "Penses-tu que la société actuelle valorise trop le bonheur constant ?",
    hint: "Discuss the pressure of constant happiness in modern culture.",
    difficulty: 3,
    followUps: [
      "Est-il sain de ressentir de la tristesse parfois ?",
      "Les réseaux sociaux jouent-ils un rôle dans cette pression ?",
      "Comment définirais-tu une vie émotionnellement équilibrée ?",
    ],
    modelAnswer: "Je pense que oui, notre société valorise excessivement l'idée d'être heureux en permanence, ce qui crée une pression supplémentaire sur les gens qui traversent des moments difficiles. Les réseaux sociaux amplifient ce phénomène en montrant uniquement des vies apparemment parfaites. Pourtant, ressentir de la tristesse ou de la colère fait partie intégrante de l'expérience humaine, et une vie équilibrée accepte toute la gamme des émotions, pas seulement les positives.",
    keyVocab: [
      { fr: "valoriser", en: "to value/prize" },
      { fr: "en permanence", en: "constantly" },
      { fr: "amplifier", en: "to amplify" },
      { fr: "apparemment", en: "apparently" },
      { fr: "faire partie intégrante de", en: "to be an integral part of" },
      { fr: "la gamme", en: "the range" },
    ],
  },
  {
    id: "emo_19",
    topicKey: "emotions",
    text: "Comment l'empathie influence-t-elle nos relations avec les autres ?",
    hint: "Discuss the role of empathy in relationships.",
    difficulty: 3,
    followUps: [
      "Penses-tu que l'empathie peut s'apprendre ?",
      "L'empathie a-t-elle des limites ?",
      "Comment développes-tu ton empathie au quotidien ?",
    ],
    modelAnswer: "L'empathie est fondamentale pour construire des relations solides, car elle nous permet de comprendre les sentiments des autres et de réagir avec compassion plutôt qu'avec indifférence. Je pense que l'empathie peut effectivement s'apprendre, notamment en écoutant activement et en essayant de se mettre à la place de l'autre. Cependant, il existe aussi un risque de « fatigue empathique » quand on absorbe trop les émotions négatives des autres, donc il faut aussi savoir se protéger.",
    keyVocab: [
      { fr: "l'empathie", en: "empathy" },
      { fr: "la compassion", en: "compassion" },
      { fr: "l'indifférence", en: "indifference" },
      { fr: "écouter activement", en: "to listen actively" },
      { fr: "se mettre à la place de", en: "to put oneself in someone's shoes" },
      { fr: "se protéger", en: "to protect oneself" },
    ],
  },
  {
    id: "emo_20",
    topicKey: "emotions",
    text: "Dans quelle mesure nos émotions influencent-elles nos décisions importantes ?",
    hint: "Discuss the interplay between emotion and rational decision-making.",
    difficulty: 3,
    followUps: [
      "Peux-tu donner un exemple de décision influencée par tes émotions ?",
      "Est-il possible de prendre une décision totalement rationnelle ?",
      "Faut-il toujours écouter son cœur ou plutôt sa raison ?",
    ],
    modelAnswer: "Je pense que nos émotions jouent un rôle bien plus important dans nos décisions que nous ne le pensons, même dans des choix qui semblent purement rationnels. Par exemple, j'ai choisi mes matières scolaires en partie à cause de la passion que je ressentais pour certains sujets, pas seulement pour des raisons pratiques. À mon avis, il est impossible de séparer complètement raison et émotion, et il vaut mieux chercher un équilibre entre les deux plutôt que d'ignorer l'un ou l'autre.",
    keyVocab: [
      { fr: "influencer", en: "to influence" },
      { fr: "une décision", en: "a decision" },
      { fr: "rationnel(le)", en: "rational" },
      { fr: "la raison", en: "reason" },
      { fr: "séparer", en: "to separate" },
      { fr: "ignorer", en: "to ignore" },
    ],
  },
  {
    id: "emo_21",
    topicKey: "emotions",
    text: "Qu'est-ce qui te rend anxieux/anxieuse ?",
    hint: "Describe what causes you anxiety.",
    difficulty: 2,
    followUps: [
      "Comment se manifeste ton anxiété physiquement ?",
      "As-tu des techniques pour réduire ton anxiété ?",
      "L'anxiété t'empêche-t-elle parfois de faire certaines choses ?",
    ],
    modelAnswer: "Ce qui me rend le plus anxieux/anxieuse, c'est de parler en public, surtout devant une grande audience. Physiquement, mes mains deviennent moites et mon cœur bat très vite. Pour réduire cette anxiété, je pratique des exercices de respiration et je me répète des pensées positives avant de commencer. Parfois, cette anxiété m'empêche de participer à certaines activités, mais j'essaie de me pousser un peu à chaque fois.",
    keyVocab: [
      { fr: "anxieux/anxieuse", en: "anxious" },
      { fr: "se manifester", en: "to manifest/show" },
      { fr: "moite", en: "sweaty/clammy" },
      { fr: "une pensée positive", en: "a positive thought" },
      { fr: "empêcher", en: "to prevent" },
      { fr: "se pousser", en: "to push oneself" },
    ],
  },
  {
    id: "emo_22",
    topicKey: "emotions",
    text: "Comment sais-tu quand quelqu'un d'autre est triste sans qu'il te le dise ?",
    hint: "Discuss reading non-verbal emotional cues in others.",
    difficulty: 2,
    followUps: [
      "Quels signes physiques remarques-tu ?",
      "Que fais-tu quand tu remarques cela ?",
      "Est-ce facile pour toi de lire les émotions des autres ?",
    ],
    modelAnswer: "Je remarque souvent des signes non-verbaux, comme un ton de voix plus bas, un manque d'énergie ou un visage moins expressif que d'habitude. Quand je remarque cela chez un ami, je lui demande discrètement s'il va bien, sans le forcer à parler s'il ne le souhaite pas. Je pense que je suis assez doué(e) pour lire les émotions des autres, surtout des personnes que je connais bien.",
    keyVocab: [
      { fr: "un signe non-verbal", en: "a non-verbal sign" },
      { fr: "un ton de voix", en: "a tone of voice" },
      { fr: "un manque d'énergie", en: "a lack of energy" },
      { fr: "expressif/expressive", en: "expressive" },
      { fr: "discrètement", en: "discreetly" },
      { fr: "forcer", en: "to force" },
    ],
  },
  {
    id: "emo_23",
    topicKey: "emotions",
    text: "Es-tu plutôt quelqu'un d'optimiste ou de pessimiste ?",
    hint: "Describe your general outlook — optimistic or pessimistic.",
    difficulty: 1,
    followUps: [
      "Peux-tu donner un exemple de situation récente ?",
      "Penses-tu que l'optimisme peut s'apprendre ?",
      "Est-ce que ta famille est aussi optimiste que toi ?",
    ],
    modelAnswer: "Je me considère plutôt comme quelqu'un d'optimiste ; j'essaie toujours de voir le bon côté des choses, même dans des situations difficiles. Par exemple, quand j'ai raté mon permis de conduire la première fois, j'ai vu ça comme une occasion d'apprendre plutôt qu'un échec définitif. Je pense que l'optimisme peut s'apprendre avec le temps et la pratique, même si certaines personnes sont naturellement plus positives.",
    keyVocab: [
      { fr: "optimiste", en: "optimistic" },
      { fr: "pessimiste", en: "pessimistic" },
      { fr: "le bon côté", en: "the bright side" },
      { fr: "rater", en: "to fail/miss" },
      { fr: "le permis de conduire", en: "driving licence" },
      { fr: "définitif/définitive", en: "final/definitive" },
    ],
  },
  {
    id: "emo_24",
    topicKey: "emotions",
    text: "Comment gères-tu la jalousie ?",
    hint: "Discuss how you handle feelings of jealousy.",
    difficulty: 2,
    followUps: [
      "Dans quelles situations ressens-tu de la jalousie ?",
      "Penses-tu que la jalousie est toujours négative ?",
      "As-tu appris à mieux la gérer avec le temps ?",
    ],
    modelAnswer: "Je ressens parfois de la jalousie, surtout quand je vois un ami réussir dans un domaine où j'aimerais moi-même progresser. Cependant, j'essaie de transformer cette jalousie en motivation plutôt que de la laisser me rendre amer/amère. Je ne pense pas que la jalousie soit toujours négative — un peu de jalousie peut nous pousser à travailler plus dur, tant qu'elle ne devient pas destructrice.",
    keyVocab: [
      { fr: "la jalousie", en: "jealousy" },
      { fr: "un domaine", en: "a field/area" },
      { fr: "amer/amère", en: "bitter" },
      { fr: "pousser quelqu'un à", en: "to push someone to" },
      { fr: "destructeur/destructrice", en: "destructive" },
      { fr: "transformer", en: "to transform" },
    ],
  },
  {
    id: "emo_25",
    topicKey: "emotions",
    text: "Qu'est-ce que la gratitude signifie pour toi ?",
    hint: "Discuss the meaning and practice of gratitude.",
    difficulty: 2,
    followUps: [
      "Tiens-tu un journal de gratitude ?",
      "Pour quoi es-tu le plus reconnaissant(e) ?",
      "La gratitude peut-elle améliorer le bien-être ?",
    ],
    modelAnswer: "Pour moi, la gratitude, c'est prendre le temps d'apprécier ce que l'on a plutôt que de se concentrer uniquement sur ce qui manque. Je ne tiens pas de journal de gratitude, mais j'essaie de remercier mentalement les gens qui m'entourent chaque jour. Je suis particulièrement reconnaissant(e) pour ma santé et le soutien de ma famille. Je pense que pratiquer la gratitude régulièrement peut vraiment améliorer notre bien-être général.",
    keyVocab: [
      { fr: "la gratitude", en: "gratitude" },
      { fr: "reconnaissant(e)", en: "grateful" },
      { fr: "un journal", en: "a diary/journal" },
      { fr: "manquer", en: "to be missing/lacking" },
      { fr: "le soutien", en: "support" },
      { fr: "le bien-être", en: "wellbeing" },
    ],
  },
  {
    id: "emo_26",
    topicKey: "emotions",
    text: "Est-ce que tu pleures facilement ?",
    hint: "Discuss crying and emotional expression, honestly and without stereotype.",
    difficulty: 1,
    followUps: [
      "Dans quelles situations pleures-tu ?",
      "Penses-tu que pleurer est un signe de faiblesse ?",
      "Te sens-tu mieux après avoir pleuré ?",
    ],
    modelAnswer: "Personnellement, je ne pleure pas très souvent, mais cela m'arrive dans des moments particulièrement émouvants, comme à la fin d'un film triste ou lors d'une dispute importante. Je ne pense absolument pas que pleurer soit un signe de faiblesse — au contraire, je crois que c'est une façon saine de libérer ses émotions. En général, je me sens plus léger/légère après avoir pleuré.",
    keyVocab: [
      { fr: "pleurer", en: "to cry" },
      { fr: "émouvant(e)", en: "moving/emotional" },
      { fr: "une dispute", en: "an argument" },
      { fr: "la faiblesse", en: "weakness" },
      { fr: "sain(e)", en: "healthy" },
      { fr: "libérer", en: "to release" },
    ],
  },
  {
    id: "emo_27",
    topicKey: "emotions",
    text: "Quel rôle joue la musique dans la gestion de tes émotions ?",
    hint: "Discuss how music affects your mood.",
    difficulty: 2,
    followUps: [
      "Quel genre de musique écoutes-tu quand tu es triste ?",
      "La musique peut-elle changer complètement ton humeur ?",
      "As-tu une chanson associée à un souvenir émotionnel fort ?",
    ],
    modelAnswer: "La musique joue un rôle énorme dans la gestion de mes émotions. Quand je suis triste, j'écoute souvent des chansons calmes qui reflètent mon humeur, tandis que quand je veux me motiver, j'écoute de la musique plus rythmée. Il y a une chanson en particulier qui me rappelle un voyage en famille inoubliable, et chaque fois que je l'entends, je ressens à nouveau cette joie.",
    keyVocab: [
      { fr: "refléter", en: "to reflect" },
      { fr: "rythmé(e)", en: "upbeat/rhythmic" },
      { fr: "inoubliable", en: "unforgettable" },
      { fr: "à nouveau", en: "again" },
      { fr: "un genre musical", en: "a music genre" },
      { fr: "associer", en: "to associate" },
    ],
  },
  {
    id: "emo_28",
    topicKey: "emotions",
    text: "Comment fais-tu la paix avec quelqu'un après une dispute ?",
    hint: "Describe how you resolve conflict and reconcile after an argument.",
    difficulty: 2,
    followUps: [
      "Est-ce que tu t'excuses facilement ?",
      "Attends-tu que l'autre personne fasse le premier pas ?",
      "As-tu déjà eu du mal à pardonner quelqu'un ?",
    ],
    modelAnswer: "Après une dispute, j'essaie généralement de laisser passer un peu de temps pour que tout le monde se calme, puis je vais parler calmement à la personne concernée. Je m'excuse assez facilement si je sais que j'ai tort, mais j'attends parfois que l'autre fasse le premier pas si je pense ne pas être responsable. Une fois, j'ai eu beaucoup de mal à pardonner un ami qui avait menti, mais avec le temps, notre amitié s'est reconstruite.",
    keyVocab: [
      { fr: "faire la paix", en: "to make peace" },
      { fr: "s'excuser", en: "to apologise" },
      { fr: "avoir tort", en: "to be wrong" },
      { fr: "faire le premier pas", en: "to make the first move" },
      { fr: "pardonner", en: "to forgive" },
      { fr: "mentir", en: "to lie" },
    ],
  },
  {
    id: "emo_29",
    topicKey: "emotions",
    text: "L'intelligence artificielle pourra-t-elle un jour comprendre réellement les émotions humaines ?",
    hint: "Speculate on AI's ability to understand human emotion.",
    difficulty: 3,
    followUps: [
      "Quelle est la différence entre reconnaître et ressentir une émotion ?",
      "Les chatbots peuvent-ils vraiment offrir du soutien émotionnel ?",
      "Cela pose-t-il des questions éthiques ?",
    ],
    modelAnswer: "Je doute que l'intelligence artificielle puisse un jour véritablement ressentir des émotions, même si elle peut déjà les reconnaître grâce à l'analyse du ton de voix ou des expressions faciales. Il y a une différence fondamentale entre reconnaître un schéma et éprouver réellement un sentiment. Cela dit, je pense que les chatbots peuvent offrir un certain soutien émotionnel de base, mais cela soulève des questions éthiques sur la dépendance émotionnelle envers des machines.",
    keyVocab: [
      { fr: "l'intelligence artificielle", en: "artificial intelligence" },
      { fr: "un schéma", en: "a pattern" },
      { fr: "éprouver", en: "to experience (a feeling)" },
      { fr: "soulever une question", en: "to raise a question" },
      { fr: "éthique", en: "ethical" },
      { fr: "la dépendance", en: "dependency" },
    ],
  },
  {
    id: "emo_30",
    topicKey: "emotions",
    text: "Dans quelle mesure devrions-nous laisser nos émotions guider nos actions ?",
    hint: "Debate the balance between emotional impulse and self-control.",
    difficulty: 3,
    followUps: [
      "Peux-tu donner un exemple où suivre ses émotions était une bonne idée ?",
      "Y a-t-il des situations où il vaut mieux ignorer ses émotions ?",
      "Comment trouver le juste équilibre ?",
    ],
    modelAnswer: "Je pense que nos émotions peuvent être une source précieuse d'information, mais elles ne devraient pas dicter systématiquement nos actions, surtout dans les décisions importantes. Par exemple, suivre sa passion peut mener à un excellent choix de carrière, mais agir uniquement par colère peut avoir des conséquences regrettables. Le juste équilibre consiste, à mon avis, à écouter ses émotions tout en prenant le temps de réfléchir avant d'agir.",
    keyVocab: [
      { fr: "guider", en: "to guide" },
      { fr: "précieux/précieuse", en: "valuable/precious" },
      { fr: "dicter", en: "to dictate" },
      { fr: "une carrière", en: "a career" },
      { fr: "regrettable", en: "regrettable" },
      { fr: "réfléchir avant d'agir", en: "to think before acting" },
    ],
  },

  // ── LES ARTS ─────────────────────────────────────────────────────────────
  {
    id: "arv_01",
    topicKey: "arts",
    text: "Quel genre de musique préfères-tu ?",
    hint: "Describe your favourite music genre and why you like it.",
    difficulty: 1,
    followUps: [
      "Quel est ton chanteur ou groupe préféré ?",
      "Joues-tu d'un instrument de musique ?",
      "Où écoutes-tu généralement de la musique ?",
    ],
    modelAnswer: "Mon genre de musique préféré, c'est la pop parce que les rythmes sont entraînants et les paroles sont souvent faciles à comprendre. Mon chanteur préféré est très populaire en ce moment et je connais presque toutes ses chansons par cœur. Je ne joue pas d'instrument, mais j'aimerais apprendre la guitare un jour. J'écoute de la musique surtout dans le bus ou pendant que je fais mes devoirs.",
    keyVocab: [
      { fr: "un genre musical", en: "a music genre" },
      { fr: "entraînant(e)", en: "catchy/upbeat" },
      { fr: "les paroles", en: "lyrics" },
      { fr: "un instrument", en: "an instrument" },
      { fr: "par cœur", en: "by heart" },
      { fr: "un chanteur/une chanteuse", en: "a singer" },
    ],
  },
  {
    id: "arv_02",
    topicKey: "arts",
    text: "Aimes-tu aller au cinéma ?",
    hint: "Discuss cinema-going habits and favourite film types.",
    difficulty: 1,
    followUps: [
      "Quel genre de film préfères-tu ?",
      "Avec qui vas-tu généralement au cinéma ?",
      "Préfères-tu le cinéma ou regarder des films chez toi ?",
    ],
    modelAnswer: "Oui, j'adore aller au cinéma, surtout pour voir des films d'action ou de science-fiction sur grand écran. D'habitude, j'y vais avec mes amis le week-end, et on achète toujours du popcorn. Je préfère le cinéma parce que l'ambiance est plus immersive, mais regarder des films chez moi est plus confortable et moins cher.",
    keyVocab: [
      { fr: "un film d'action", en: "an action film" },
      { fr: "un grand écran", en: "a big screen" },
      { fr: "immersif/immersive", en: "immersive" },
      { fr: "confortable", en: "comfortable" },
      { fr: "le popcorn", en: "popcorn" },
      { fr: "l'ambiance", en: "the atmosphere" },
    ],
  },
  {
    id: "arv_03",
    topicKey: "arts",
    text: "Est-ce que tu lis beaucoup de livres ?",
    hint: "Discuss your reading habits and preferred genres.",
    difficulty: 1,
    followUps: [
      "Quel est ton livre préféré ?",
      "Préfères-tu les livres papier ou les livres numériques ?",
      "Combien de temps passes-tu à lire chaque semaine ?",
    ],
    modelAnswer: "Je lis assez régulièrement, surtout des romans de fantasy et des thrillers. Mon livre préféré m'a vraiment marqué(e) parce que l'histoire était pleine de rebondissements inattendus. Je préfère les livres papier parce que j'aime sentir les pages et je me sens moins distrait(e) que sur un écran. Je passe environ trois heures par semaine à lire.",
    keyVocab: [
      { fr: "un roman", en: "a novel" },
      { fr: "un rebondissement", en: "a plot twist" },
      { fr: "inattendu(e)", en: "unexpected" },
      { fr: "distrait(e)", en: "distracted" },
      { fr: "un livre numérique", en: "an e-book" },
      { fr: "marquer quelqu'un", en: "to leave an impression on someone" },
    ],
  },
  {
    id: "arv_04",
    topicKey: "arts",
    text: "Sais-tu dessiner ou peindre ?",
    hint: "Discuss your drawing/painting skills or interest in visual art.",
    difficulty: 1,
    followUps: [
      "Depuis quand fais-tu du dessin ou de la peinture ?",
      "Qu'est-ce que tu aimes dessiner le plus ?",
      "As-tu déjà exposé ou partagé ton art ?",
    ],
    modelAnswer: "Je dessine depuis que je suis petit(e), même si je ne suis pas très doué(e). J'aime surtout dessiner des paysages et des portraits de mes animaux de compagnie. Une fois, j'ai partagé un de mes dessins sur les réseaux sociaux et j'ai reçu beaucoup de compliments, ce qui m'a encouragé(e) à continuer.",
    keyVocab: [
      { fr: "dessiner", en: "to draw" },
      { fr: "peindre", en: "to paint" },
      { fr: "un paysage", en: "a landscape" },
      { fr: "un portrait", en: "a portrait" },
      { fr: "doué(e)", en: "gifted/talented" },
      { fr: "un compliment", en: "a compliment" },
    ],
  },
  {
    id: "arv_05",
    topicKey: "arts",
    text: "As-tu déjà visité un musée d'art ?",
    hint: "Describe a museum visit using passé composé.",
    difficulty: 1,
    followUps: [
      "Quelles œuvres t'ont le plus marqué(e) ?",
      "Aimes-tu l'art moderne ou l'art classique ?",
      "Recommanderais-tu ce musée à un ami ?",
    ],
    modelAnswer: "Oui, l'année dernière, j'ai visité un grand musée d'art pendant nos vacances en famille. Les œuvres impressionnistes m'ont particulièrement marqué(e) grâce à leurs couleurs vives et lumineuses. Je préfère l'art moderne parce qu'il est souvent plus provocant et original. Je recommanderais certainement ce musée parce qu'il propose aussi des visites guidées très intéressantes.",
    keyVocab: [
      { fr: "un musée", en: "a museum" },
      { fr: "une œuvre", en: "a work (of art)" },
      { fr: "impressionniste", en: "impressionist" },
      { fr: "lumineux/lumineuse", en: "bright/luminous" },
      { fr: "provocant(e)", en: "provocative" },
      { fr: "une visite guidée", en: "a guided tour" },
    ],
  },
  {
    id: "arv_06",
    topicKey: "arts",
    text: "Quel est ton film préféré et pourquoi ?",
    hint: "Describe your favourite film with reasons.",
    difficulty: 1,
    followUps: [
      "Qui sont les acteurs principaux ?",
      "Combien de fois as-tu vu ce film ?",
      "Recommanderais-tu ce film à tes amis ?",
    ],
    modelAnswer: "Mon film préféré est un film d'aventure que j'ai vu pour la première fois avec ma famille il y a quelques années. J'adore ce film à cause de son scénario captivant et de ses effets spéciaux impressionnants. Je l'ai vu au moins cinq fois et je ne me lasse jamais de le regarder. Je le recommande à tous mes amis qui aiment les histoires pleines d'action.",
    keyVocab: [
      { fr: "un scénario", en: "a screenplay/plot" },
      { fr: "captivant(e)", en: "captivating" },
      { fr: "les effets spéciaux", en: "special effects" },
      { fr: "impressionnant(e)", en: "impressive" },
      { fr: "se lasser de", en: "to grow tired of" },
      { fr: "un acteur/une actrice", en: "an actor/actress" },
    ],
  },
  {
    id: "arv_07",
    topicKey: "arts",
    text: "Penses-tu que l'art est important pour la société ?",
    hint: "Give an opinion on why art matters to society.",
    difficulty: 2,
    followUps: [
      "L'art peut-il changer la façon dont on voit le monde ?",
      "Les écoles devraient-elles investir plus dans les matières artistiques ?",
      "L'art a-t-il un rôle politique ?",
    ],
    modelAnswer: "Je pense que l'art est essentiel pour la société parce qu'il permet d'exprimer des idées et des émotions qui seraient difficiles à communiquer autrement. L'art peut aussi changer notre perception du monde en nous montrant des perspectives différentes. Malheureusement, les matières artistiques sont souvent sous-financées dans les écoles, alors qu'elles développent la créativité, une compétence essentielle pour l'avenir.",
    keyVocab: [
      { fr: "exprimer", en: "to express" },
      { fr: "la perception", en: "perception" },
      { fr: "sous-financé(e)", en: "underfunded" },
      { fr: "la créativité", en: "creativity" },
      { fr: "une perspective", en: "a perspective" },
      { fr: "essentiel(le)", en: "essential" },
    ],
  },
  {
    id: "arv_08",
    topicKey: "arts",
    text: "Préfères-tu la musique en direct ou enregistrée ?",
    hint: "Compare live music with recorded music.",
    difficulty: 2,
    followUps: [
      "As-tu déjà assisté à un concert ?",
      "Qu'est-ce qui rend un concert spécial ?",
      "Le streaming a-t-il changé ta façon d'écouter de la musique ?",
    ],
    modelAnswer: "Je préfère de loin la musique en direct parce que l'énergie d'un concert est incomparable à l'écoute d'un enregistrement. L'année dernière, j'ai assisté à mon premier concert et l'ambiance avec des milliers de fans chantant ensemble était inoubliable. Cela dit, le streaming m'a permis de découvrir beaucoup plus d'artistes que je n'aurais jamais connus autrement.",
    keyVocab: [
      { fr: "en direct", en: "live" },
      { fr: "un enregistrement", en: "a recording" },
      { fr: "incomparable", en: "incomparable" },
      { fr: "un concert", en: "a concert" },
      { fr: "un fan", en: "a fan" },
      { fr: "découvrir", en: "to discover" },
    ],
  },
  {
    id: "arv_09",
    topicKey: "arts",
    text: "Le streaming a-t-il changé la manière dont les gens consomment la musique et les films ?",
    hint: "Discuss streaming's impact on media consumption.",
    difficulty: 2,
    followUps: [
      "Est-ce une bonne chose pour les artistes ?",
      "Le piratage a-t-il diminué grâce au streaming ?",
      "Préfères-tu posséder de la musique ou la streamer ?",
    ],
    modelAnswer: "Le streaming a radicalement changé notre façon de consommer la musique et les films, en rendant tout accessible instantanément avec un simple abonnement. Cependant, je pense que ce n'est pas toujours positif pour les artistes, car les plateformes de streaming les paient souvent très peu par écoute. D'un autre côté, cela a considérablement réduit le piratage, ce qui est une bonne chose pour l'industrie.",
    keyVocab: [
      { fr: "consommer", en: "to consume" },
      { fr: "un abonnement", en: "a subscription" },
      { fr: "une plateforme", en: "a platform" },
      { fr: "le piratage", en: "piracy" },
      { fr: "réduire", en: "to reduce" },
      { fr: "l'industrie", en: "the industry" },
    ],
  },
  {
    id: "arv_10",
    topicKey: "arts",
    text: "Quel livre t'a le plus marqué(e) et pourquoi ?",
    hint: "Describe an impactful book and its influence on you.",
    difficulty: 2,
    followUps: [
      "Qu'as-tu appris de ce livre ?",
      "Recommanderais-tu ce livre à d'autres personnes ?",
      "Cela a-t-il changé ta façon de penser ?",
    ],
    modelAnswer: "Le livre qui m'a le plus marqué(e) traite d'un jeune personnage qui surmonte de grandes difficultés grâce à sa détermination. Ce livre m'a appris l'importance de la persévérance, même dans les moments les plus sombres. Je le recommande vivement, surtout à ceux qui traversent des moments difficiles, car il offre une perspective inspirante sur la résilience humaine.",
    keyVocab: [
      { fr: "un personnage", en: "a character" },
      { fr: "surmonter", en: "to overcome" },
      { fr: "sombre", en: "dark" },
      { fr: "recommander vivement", en: "to strongly recommend" },
      { fr: "la résilience", en: "resilience" },
      { fr: "inspirant(e)", en: "inspiring" },
    ],
  },
  {
    id: "arv_11",
    topicKey: "arts",
    text: "Les jeux vidéo peuvent-ils être considérés comme une forme d'art ?",
    hint: "Debate whether video games count as art.",
    difficulty: 3,
    followUps: [
      "Quels éléments d'un jeu vidéo pourraient être artistiques ?",
      "Les jeux vidéo racontent-ils de bonnes histoires ?",
      "Pourquoi certaines personnes rejettent-elles cette idée ?",
    ],
    modelAnswer: "Je pense fermement que les jeux vidéo peuvent être considérés comme une forme d'art, notamment grâce à leur direction artistique, leur musique originale et parfois des scénarios aussi riches que ceux d'un roman. Certains critiques rejettent cette idée parce qu'ils associent l'art uniquement à la peinture ou à la littérature traditionnelle. Cependant, des jeux avec des histoires émouvantes prouvent que ce médium mérite d'être reconnu comme un art à part entière.",
    keyVocab: [
      { fr: "la direction artistique", en: "art direction" },
      { fr: "un critique", en: "a critic" },
      { fr: "un médium", en: "a medium" },
      { fr: "à part entière", en: "in its own right" },
      { fr: "reconnu(e)", en: "recognised" },
      { fr: "rejeter", en: "to reject" },
    ],
  },
  {
    id: "arv_12",
    topicKey: "arts",
    text: "Que penses-tu de la censure dans l'art ?",
    hint: "Discuss the debate around censorship in artistic works.",
    difficulty: 3,
    followUps: [
      "L'art doit-il toujours respecter certaines limites morales ?",
      "Peux-tu donner un exemple d'œuvre censurée ?",
      "La censure protège-t-elle ou étouffe-t-elle la créativité ?",
    ],
    modelAnswer: "Je pense que la censure dans l'art est un sujet très délicat. D'un côté, certaines limites peuvent être nécessaires pour protéger des publics vulnérables, comme les enfants. D'un autre côté, je crains que la censure excessive n'étouffe la créativité et empêche les artistes d'aborder des sujets importants mais controversés, comme l'injustice sociale ou la guerre. Il faut trouver un équilibre délicat entre liberté artistique et responsabilité.",
    keyVocab: [
      { fr: "la censure", en: "censorship" },
      { fr: "un public vulnérable", en: "a vulnerable audience" },
      { fr: "étouffer", en: "to stifle" },
      { fr: "aborder un sujet", en: "to address a topic" },
      { fr: "controversé(e)", en: "controversial" },
      { fr: "la liberté artistique", en: "artistic freedom" },
    ],
  },
  {
    id: "arv_13",
    topicKey: "arts",
    text: "Comment la technologie a-t-elle transformé la création artistique ?",
    hint: "Discuss digital tools and AI's impact on art creation.",
    difficulty: 3,
    followUps: [
      "L'intelligence artificielle peut-elle créer de véritables œuvres d'art ?",
      "Les outils numériques rendent-ils l'art plus accessible ?",
      "Y a-t-il des inconvénients à cette évolution ?",
    ],
    modelAnswer: "La technologie a révolutionné la création artistique en offrant de nouveaux outils, comme les logiciels de dessin numérique ou l'intelligence artificielle capable de générer des images. D'un côté, cela rend l'art plus accessible à des personnes qui n'ont pas de matériel traditionnel coûteux. D'un autre côté, cela soulève des questions sur l'authenticité et la place de l'artiste humain quand une machine peut produire une œuvre en quelques secondes.",
    keyVocab: [
      { fr: "un logiciel", en: "software" },
      { fr: "générer", en: "to generate" },
      { fr: "le matériel", en: "equipment/materials" },
      { fr: "l'authenticité", en: "authenticity" },
      { fr: "la place de", en: "the place/role of" },
      { fr: "produire", en: "to produce" },
    ],
  },
  {
    id: "arv_14",
    topicKey: "arts",
    text: "Dans quelle mesure la musique reflète-t-elle les préoccupations d'une génération ?",
    hint: "Discuss how music reflects generational concerns and culture.",
    difficulty: 3,
    followUps: [
      "Peux-tu citer une chanson qui aborde un problème social ?",
      "La musique d'aujourd'hui est-elle plus engagée que celle du passé ?",
      "Comment la musique unit-elle les générations différentes ?",
    ],
    modelAnswer: "La musique a toujours été un miroir des préoccupations d'une génération, qu'il s'agisse des mouvements pour les droits civiques dans les années soixante ou des chansons actuelles évoquant l'anxiété climatique et la santé mentale. Certains artistes contemporains utilisent leur plateforme pour aborder des injustices sociales, ce qui montre que la musique reste engagée. Curieusement, elle peut aussi unir différentes générations autour de valeurs communes, malgré des styles musicaux très différents.",
    keyVocab: [
      { fr: "un miroir", en: "a mirror" },
      { fr: "les droits civiques", en: "civil rights" },
      { fr: "l'anxiété climatique", en: "climate anxiety" },
      { fr: "engagé(e)", en: "politically engaged" },
      { fr: "une valeur commune", en: "a shared value" },
      { fr: "curieusement", en: "curiously" },
    ],
  },
  {
    id: "arv_15",
    topicKey: "arts",
    text: "Faut-il préserver l'art traditionnel face à la culture numérique moderne ?",
    hint: "Discuss preserving traditional art forms in a digital age.",
    difficulty: 3,
    followUps: [
      "Quels arts traditionnels risquent de disparaître ?",
      "Comment pourrait-on encourager les jeunes à s'y intéresser ?",
      "La culture numérique menace-t-elle vraiment l'art traditionnel ?",
    ],
    modelAnswer: "Je pense qu'il est crucial de préserver l'art traditionnel, comme la poterie, la peinture à l'huile ou la musique folklorique, même si la culture numérique domine aujourd'hui. Ces formes d'art traditionnelles font partie de notre patrimoine culturel et risquent de disparaître si les jeunes générations ne s'y intéressent pas. Les écoles et les musées pourraient organiser davantage d'ateliers interactifs pour rendre ces traditions plus attrayantes et pertinentes pour les jeunes.",
    keyVocab: [
      { fr: "préserver", en: "to preserve" },
      { fr: "la poterie", en: "pottery" },
      { fr: "folklorique", en: "folk (adj)" },
      { fr: "le patrimoine culturel", en: "cultural heritage" },
      { fr: "attrayant(e)", en: "attractive/appealing" },
      { fr: "pertinent(e)", en: "relevant" },
    ],
  },
  {
    id: "arv_16",
    topicKey: "arts",
    text: "As-tu déjà écrit une histoire ou un poème ?",
    hint: "Describe a creative writing experience.",
    difficulty: 1,
    followUps: [
      "De quoi parlait ton histoire ou ton poème ?",
      "As-tu partagé ton écriture avec quelqu'un ?",
      "Aimerais-tu écrire davantage à l'avenir ?",
    ],
    modelAnswer: "Oui, l'année dernière, j'ai écrit un court poème pour un concours à l'école sur le thème de la nature. Le poème parlait de la beauté des saisons qui changent. J'ai partagé mon poème avec ma professeure de français, qui m'a encouragé(e) à continuer à écrire. J'aimerais bien écrire davantage à l'avenir, peut-être même une petite nouvelle.",
    keyVocab: [
      { fr: "un poème", en: "a poem" },
      { fr: "un concours", en: "a competition" },
      { fr: "une saison", en: "a season" },
      { fr: "encourager", en: "to encourage" },
      { fr: "une nouvelle (littéraire)", en: "a short story" },
      { fr: "l'écriture", en: "writing" },
    ],
  },
  {
    id: "arv_17",
    topicKey: "arts",
    text: "Quel type de spectacle préfères-tu : le théâtre, la danse ou l'opéra ?",
    hint: "Compare types of live performance art.",
    difficulty: 2,
    followUps: [
      "As-tu déjà assisté à ce type de spectacle ?",
      "Qu'est-ce qui rend ce spectacle unique selon toi ?",
      "Pourquoi certains spectacles semblent-ils moins populaires chez les jeunes ?",
    ],
    modelAnswer: "Je préfère le théâtre parce que j'aime l'énergie brute des acteurs qui jouent en direct devant le public, sans possibilité de recommencer une scène. J'ai assisté à une pièce l'année dernière et j'ai été impressionné(e) par la façon dont les acteurs transmettaient leurs émotions. Je pense que l'opéra semble moins populaire chez les jeunes parce qu'il est souvent perçu comme démodé ou trop cher.",
    keyVocab: [
      { fr: "un spectacle", en: "a show/performance" },
      { fr: "une pièce (de théâtre)", en: "a play" },
      { fr: "brut(e)", en: "raw" },
      { fr: "transmettre", en: "to convey" },
      { fr: "démodé(e)", en: "old-fashioned" },
      { fr: "perçu(e)", en: "perceived" },
    ],
  },
  {
    id: "arv_18",
    topicKey: "arts",
    text: "Comment le cinéma peut-il sensibiliser les gens à des problèmes sociaux ?",
    hint: "Discuss film as a tool for social awareness.",
    difficulty: 3,
    followUps: [
      "Peux-tu citer un film qui traite d'un sujet social important ?",
      "Le cinéma peut-il vraiment changer l'opinion publique ?",
      "Y a-t-il un risque de simplifier des sujets complexes ?",
    ],
    modelAnswer: "Le cinéma est un outil puissant pour sensibiliser le public à des problèmes sociaux, comme le racisme, la pauvreté ou le changement climatique, en racontant des histoires humaines auxquelles les spectateurs peuvent s'identifier. Certains documentaires et films ont réellement influencé l'opinion publique et même déclenché des changements politiques. Cependant, il existe un risque que certains films simplifient excessivement des sujets complexes pour les rendre plus accessibles, ce qui peut donner une vision incomplète de la réalité.",
    keyVocab: [
      { fr: "sensibiliser", en: "to raise awareness" },
      { fr: "la pauvreté", en: "poverty" },
      { fr: "s'identifier à", en: "to identify with" },
      { fr: "un documentaire", en: "a documentary" },
      { fr: "déclencher", en: "to trigger" },
      { fr: "incomplet/incomplète", en: "incomplete" },
    ],
  },
  {
    id: "arv_19",
    topicKey: "arts",
    text: "Penses-tu que l'accès à l'art et à la culture est égal pour tout le monde ?",
    hint: "Discuss inequality of access to arts and culture.",
    difficulty: 3,
    followUps: [
      "Quels obstacles empêchent certaines personnes d'accéder à la culture ?",
      "Que pourrait faire le gouvernement pour améliorer cet accès ?",
      "La gratuité des musées est-elle une bonne solution ?",
    ],
    modelAnswer: "Non, je ne pense pas que l'accès à l'art et à la culture soit égal pour tout le monde. Le coût des billets de concert, des musées ou même des cours artistiques peut être un obstacle majeur pour les familles à faible revenu. Le gouvernement pourrait améliorer cette situation en rendant certains musées gratuits, comme c'est déjà le cas dans certains pays, et en finançant davantage de programmes artistiques dans les écoles défavorisées.",
    keyVocab: [
      { fr: "un obstacle", en: "an obstacle" },
      { fr: "à faible revenu", en: "low-income" },
      { fr: "la gratuité", en: "free access (no charge)" },
      { fr: "financer", en: "to fund" },
      { fr: "défavorisé(e)", en: "disadvantaged" },
      { fr: "un programme", en: "a programme" },
    ],
  },
  {
    id: "arv_20",
    topicKey: "arts",
    text: "Si tu pouvais rencontrer un artiste, peintre ou écrivain célèbre, qui choisirais-tu ?",
    hint: "Use conditional to describe meeting a famous artist.",
    difficulty: 2,
    followUps: [
      "Qu'aimerais-tu lui demander ?",
      "Qu'est-ce qui t'attire chez cet artiste en particulier ?",
      "Comment cette personne a-t-elle influencé le monde de l'art ?",
    ],
    modelAnswer: "Si je pouvais rencontrer un artiste célèbre, je choisirais un grand peintre du passé dont j'admire énormément le style unique et audacieux. Je lui demanderais où il trouvait son inspiration et comment il gérait les critiques négatives de son époque. Ce qui m'attire chez lui, c'est sa capacité à transformer sa souffrance personnelle en œuvres magnifiques qui continuent d'inspirer des millions de personnes aujourd'hui.",
    keyVocab: [
      { fr: "audacieux/audacieuse", en: "bold/daring" },
      { fr: "l'inspiration", en: "inspiration" },
      { fr: "une critique", en: "a criticism/review" },
      { fr: "une époque", en: "an era" },
      { fr: "la souffrance", en: "suffering" },
      { fr: "magnifique", en: "magnificent" },
    ],
  },
  {
    id: "arv_21",
    topicKey: "arts",
    text: "Quel rôle la musique joue-t-elle dans ta vie quotidienne ?",
    hint: "Describe music's role in your daily routine.",
    difficulty: 1,
    followUps: [
      "Écoutes-tu de la musique en travaillant ?",
      "As-tu une playlist pour chaque humeur ?",
      "Combien d'heures par jour écoutes-tu de la musique ?",
    ],
    modelAnswer: "La musique fait partie intégrante de ma vie quotidienne. Je l'écoute en me préparant le matin, dans les transports, et parfois même en faisant mes devoirs, même si cela me distrait un peu en maths. J'ai plusieurs playlists différentes selon mon humeur — une pour me motiver, une autre pour me détendre. Je dirais que j'écoute de la musique environ deux ou trois heures par jour.",
    keyVocab: [
      { fr: "faire partie intégrante de", en: "to be an integral part of" },
      { fr: "les transports", en: "transport" },
      { fr: "distraire", en: "to distract" },
      { fr: "une playlist", en: "a playlist" },
      { fr: "selon", en: "depending on" },
      { fr: "se détendre", en: "to relax" },
    ],
  },
  {
    id: "arv_22",
    topicKey: "arts",
    text: "Penses-tu que les célébrités ont une responsabilité artistique envers leur public ?",
    hint: "Discuss whether celebrities/artists owe responsibility to their audience.",
    difficulty: 3,
    followUps: [
      "Les artistes doivent-ils toujours véhiculer des messages positifs ?",
      "L'art doit-il être libre de toute contrainte morale ?",
      "Peux-tu donner un exemple de controverse artistique ?",
    ],
    modelAnswer: "C'est une question complexe. D'un côté, je pense que les artistes ont une certaine influence sur leur public, surtout les jeunes, et devraient donc être conscients de l'impact de leur travail. D'un autre côté, je crois fermement que l'art doit rester libre et ne pas être contraint de toujours transmettre des messages moralement positifs, car cela limiterait la créativité artistique. Il y a un équilibre délicat entre liberté d'expression et responsabilité sociale.",
    keyVocab: [
      { fr: "une célébrité", en: "a celebrity" },
      { fr: "conscient(e)", en: "aware" },
      { fr: "contraint(e)", en: "constrained" },
      { fr: "limiter", en: "to limit" },
      { fr: "la liberté d'expression", en: "freedom of expression" },
      { fr: "une responsabilité", en: "a responsibility" },
    ],
  },
  {
    id: "arv_23",
    topicKey: "arts",
    text: "Comment décrirais-tu ton style personnel en matière d'art ou de design ?",
    hint: "Describe your personal taste in art, design, or aesthetics.",
    difficulty: 2,
    followUps: [
      "Où trouves-tu de l'inspiration pour ton style ?",
      "Ton style a-t-il changé au fil du temps ?",
      "Ce style se reflète-t-il dans ta chambre ou tes vêtements ?",
    ],
    modelAnswer: "Je dirais que mon style est plutôt minimaliste, avec des couleurs neutres et des lignes simples. Je trouve mon inspiration principalement sur les réseaux sociaux et dans des magazines de design d'intérieur. Mon style a beaucoup changé au fil des années — avant, j'aimais les couleurs vives, mais maintenant je préfère la sobriété. Cela se reflète clairement dans la décoration de ma chambre.",
    keyVocab: [
      { fr: "minimaliste", en: "minimalist" },
      { fr: "une couleur neutre", en: "a neutral colour" },
      { fr: "au fil du temps", en: "over time" },
      { fr: "la sobriété", en: "simplicity/restraint" },
      { fr: "la décoration", en: "decoration" },
      { fr: "vif/vive", en: "bright/vivid" },
    ],
  },
  {
    id: "arv_24",
    topicKey: "arts",
    text: "L'art abstrait a-t-il autant de valeur que l'art figuratif ?",
    hint: "Debate the value of abstract art versus figurative/realistic art.",
    difficulty: 3,
    followUps: [
      "Pourquoi certaines personnes trouvent-elles l'art abstrait difficile à comprendre ?",
      "L'art doit-il toujours être facile à comprendre ?",
      "Peux-tu citer un artiste abstrait connu ?",
    ],
    modelAnswer: "Je pense que l'art abstrait a autant de valeur que l'art figuratif, même si beaucoup de gens le trouvent difficile à comprendre parce qu'il ne représente rien de concret. À mon avis, l'art n'a pas besoin d'être immédiatement compréhensible pour être précieux — il peut évoquer des émotions ou des idées de manière plus subtile qu'une image réaliste. Je pense simplement que l'art abstrait demande plus d'ouverture d'esprit de la part du spectateur.",
    keyVocab: [
      { fr: "abstrait(e)", en: "abstract" },
      { fr: "figuratif/figurative", en: "figurative" },
      { fr: "concret/concrète", en: "concrete" },
      { fr: "compréhensible", en: "understandable" },
      { fr: "évoquer", en: "to evoke" },
      { fr: "l'ouverture d'esprit", en: "open-mindedness" },
    ],
  },
  {
    id: "arv_25",
    topicKey: "arts",
    text: "Comment le street art a-t-il changé la perception de l'art urbain ?",
    hint: "Discuss the evolution and perception of street art/graffiti.",
    difficulty: 3,
    followUps: [
      "Le graffiti devrait-il être considéré comme du vandalisme ou de l'art ?",
      "Connais-tu un artiste de street art célèbre ?",
      "Comment les villes pourraient-elles mieux soutenir cette forme d'art ?",
    ],
    modelAnswer: "Le street art a considérablement changé la perception de l'art urbain, passant d'une pratique souvent considérée comme du vandalisme à une forme d'expression artistique reconnue et même exposée dans des galeries. Des artistes ont réussi à transformer des murs abandonnés en véritables œuvres qui attirent des touristes du monde entier. Je pense que les villes devraient créer davantage d'espaces légaux pour cet art, afin d'encourager la créativité tout en respectant la propriété privée.",
    keyVocab: [
      { fr: "le street art", en: "street art" },
      { fr: "le vandalisme", en: "vandalism" },
      { fr: "reconnu(e)", en: "recognised" },
      { fr: "une galerie", en: "a gallery" },
      { fr: "abandonné(e)", en: "abandoned" },
      { fr: "la propriété privée", en: "private property" },
    ],
  },
  {
    id: "arv_26",
    topicKey: "arts",
    text: "Est-ce important d'apprendre l'histoire de l'art à l'école ?",
    hint: "Discuss the value of art history education.",
    difficulty: 2,
    followUps: [
      "Qu'as-tu appris en cours d'histoire de l'art, si tu en as suivi ?",
      "L'histoire de l'art aide-t-elle à comprendre une culture ?",
      "Cette matière devrait-elle être obligatoire ?",
    ],
    modelAnswer: "Je pense que l'histoire de l'art est importante parce qu'elle nous aide à comprendre le contexte historique, social et politique de différentes époques à travers les œuvres créées. Par exemple, étudier l'art de la Renaissance permet de mieux comprendre les valeurs et les croyances de cette période. Bien que je ne pense pas qu'elle doive être obligatoire pour tous, elle mérite d'être proposée comme option intéressante.",
    keyVocab: [
      { fr: "le contexte historique", en: "historical context" },
      { fr: "la Renaissance", en: "the Renaissance" },
      { fr: "une croyance", en: "a belief" },
      { fr: "une période", en: "a period" },
      { fr: "une option", en: "an elective/option" },
      { fr: "mériter", en: "to deserve" },
    ],
  },
  {
    id: "arv_27",
    topicKey: "arts",
    text: "Les adaptations de livres au cinéma sont-elles généralement réussies ?",
    hint: "Discuss book-to-film adaptations and their success/failure.",
    difficulty: 2,
    followUps: [
      "Peux-tu donner un exemple d'adaptation réussie ou ratée ?",
      "Qu'est-ce qui se perd souvent lors d'une adaptation ?",
      "Préfères-tu lire le livre avant ou après avoir vu le film ?",
    ],
    modelAnswer: "À mon avis, les adaptations de livres au cinéma sont souvent décevantes parce qu'il est difficile de condenser une histoire riche et détaillée en seulement deux heures. Beaucoup de nuances psychologiques des personnages se perdent dans le processus. Cependant, certaines adaptations réussissent brillamment en capturant l'essence de l'œuvre originale tout en apportant une nouvelle perspective visuelle. Je préfère généralement lire le livre avant de voir le film pour former ma propre opinion.",
    keyVocab: [
      { fr: "une adaptation", en: "an adaptation" },
      { fr: "décevant(e)", en: "disappointing" },
      { fr: "condenser", en: "to condense" },
      { fr: "une nuance", en: "a nuance" },
      { fr: "l'essence", en: "the essence" },
      { fr: "former une opinion", en: "to form an opinion" },
    ],
  },
  {
    id: "arv_28",
    topicKey: "arts",
    text: "Comment l'art peut-il aider à guérir ou à faire face à un traumatisme ?",
    hint: "Discuss art therapy and healing through creative expression.",
    difficulty: 3,
    followUps: [
      "Connais-tu des exemples d'art-thérapie ?",
      "Pourquoi la création artistique peut-elle être thérapeutique ?",
      "As-tu déjà utilisé l'art pour gérer tes émotions ?",
    ],
    modelAnswer: "L'art peut jouer un rôle thérapeutique puissant en permettant aux gens d'exprimer des émotions difficiles à verbaliser, comme la douleur ou le traumatisme. L'art-thérapie, par exemple, est utilisée dans des hôpitaux pour aider des patients à traiter des expériences traumatisantes à travers la peinture ou l'écriture. Personnellement, j'ai remarqué que dessiner m'aide à calmer mon esprit quand je me sens submergé(e) par mes émotions.",
    keyVocab: [
      { fr: "guérir", en: "to heal" },
      { fr: "un traumatisme", en: "a trauma" },
      { fr: "verbaliser", en: "to verbalise" },
      { fr: "l'art-thérapie", en: "art therapy" },
      { fr: "traiter", en: "to process/treat" },
      { fr: "submergé(e)", en: "overwhelmed" },
    ],
  },
  {
    id: "arv_29",
    topicKey: "arts",
    text: "Le marché de l'art contemporain reflète-t-il vraiment la valeur artistique des œuvres ?",
    hint: "Discuss the relationship between art market prices and artistic merit.",
    difficulty: 3,
    followUps: [
      "Pourquoi certaines œuvres se vendent-elles à des prix extraordinaires ?",
      "Le prix d'une œuvre reflète-t-il sa qualité artistique ?",
      "Que penses-tu de la spéculation dans le marché de l'art ?",
    ],
    modelAnswer: "Je pense que le marché de l'art contemporain ne reflète pas toujours la véritable valeur artistique des œuvres, car les prix sont souvent déterminés par la spéculation, la réputation de l'artiste ou des stratégies marketing plutôt que par le mérite artistique réel. Certaines œuvres se vendent à des prix astronomiques simplement parce que des collectionneurs riches les considèrent comme un bon investissement. Cela crée, à mon avis, une distorsion entre la valeur culturelle et la valeur financière de l'art.",
    keyVocab: [
      { fr: "le marché de l'art", en: "the art market" },
      { fr: "la spéculation", en: "speculation" },
      { fr: "un collectionneur", en: "a collector" },
      { fr: "astronomique", en: "astronomical" },
      { fr: "un investissement", en: "an investment" },
      { fr: "une distorsion", en: "a distortion" },
    ],
  },
  {
    id: "arv_30",
    topicKey: "arts",
    text: "Dans quelle mesure l'art peut-il provoquer un changement social durable ?",
    hint: "Discuss art's power to create lasting social change.",
    difficulty: 3,
    followUps: [
      "Peux-tu citer un mouvement artistique lié à un changement social ?",
      "L'art suffit-il à lui seul pour changer les mentalités ?",
      "Quels sont les risques d'un art trop engagé politiquement ?",
    ],
    modelAnswer: "L'art a historiquement joué un rôle important dans les mouvements de changement social, en donnant une voix à des groupes marginalisés et en sensibilisant le public à des injustices, comme on l'a vu avec l'art engagé pendant les mouvements pour les droits civiques. Cependant, je pense que l'art seul ne suffit généralement pas à provoquer un changement durable — il doit être accompagné d'actions politiques concrètes. Il existe aussi un risque que l'art trop ouvertement politique divise plutôt que rassemble le public.",
    keyVocab: [
      { fr: "un changement social", en: "social change" },
      { fr: "marginalisé(e)", en: "marginalised" },
      { fr: "un mouvement", en: "a movement" },
      { fr: "durable", en: "lasting" },
      { fr: "diviser", en: "to divide" },
      { fr: "rassembler", en: "to bring together" },
    ],
  },

  // ── LES ACHATS ───────────────────────────────────────────────────────────
  {
    id: "sho_01",
    topicKey: "shopping",
    text: "Aimes-tu faire du shopping ?",
    hint: "Describe your general attitude toward shopping.",
    difficulty: 1,
    followUps: [
      "Qu'est-ce que tu aimes acheter le plus ?",
      "Préfères-tu faire du shopping seul(e) ou avec des amis ?",
      "Combien de fois par mois fais-tu du shopping ?",
    ],
    modelAnswer: "Oui, j'aime bien faire du shopping, surtout pour acheter des vêtements et des accessoires. Je préfère y aller avec mes amies parce qu'on peut se donner notre avis sur nos choix. Je fais du shopping environ deux fois par mois, souvent le week-end quand j'ai plus de temps libre.",
    keyVocab: [
      { fr: "faire du shopping", en: "to go shopping" },
      { fr: "un vêtement", en: "a piece of clothing" },
      { fr: "un accessoire", en: "an accessory" },
      { fr: "donner son avis", en: "to give one's opinion" },
      { fr: "le temps libre", en: "free time" },
      { fr: "acheter", en: "to buy" },
    ],
  },
  {
    id: "sho_02",
    topicKey: "shopping",
    text: "Préfères-tu acheter en ligne ou dans les magasins ?",
    hint: "Compare online shopping vs shopping in physical stores.",
    difficulty: 1,
    followUps: [
      "Quels sont les avantages du shopping en ligne ?",
      "As-tu déjà eu un problème avec une commande en ligne ?",
      "Qu'est-ce que tu préfères dans les magasins physiques ?",
    ],
    modelAnswer: "Je préfère généralement acheter en ligne parce que c'est plus rapide et je peux comparer les prix facilement. L'avantage principal, c'est la livraison à domicile, ce qui m'évite de me déplacer. Une fois, j'ai reçu un article endommagé, mais le service client m'a remboursé rapidement. Cependant, j'aime aussi les magasins physiques parce que je peux essayer les vêtements avant de les acheter.",
    keyVocab: [
      { fr: "acheter en ligne", en: "to buy online" },
      { fr: "comparer les prix", en: "to compare prices" },
      { fr: "la livraison à domicile", en: "home delivery" },
      { fr: "endommagé(e)", en: "damaged" },
      { fr: "rembourser", en: "to refund" },
      { fr: "essayer", en: "to try on" },
    ],
  },
  {
    id: "sho_03",
    topicKey: "shopping",
    text: "Comment gères-tu ton argent de poche ?",
    hint: "Discuss how you manage pocket money/allowance.",
    difficulty: 1,
    followUps: [
      "Reçois-tu de l'argent de poche régulièrement ?",
      "Épargnes-tu une partie de ton argent ?",
      "Sur quoi dépenses-tu le plus souvent ton argent ?",
    ],
    modelAnswer: "Je reçois de l'argent de poche chaque semaine de la part de mes parents. J'essaie d'épargner environ la moitié pour des achats plus importants, comme un nouveau téléphone. Le reste, je le dépense généralement sur des vêtements ou pour sortir avec mes amis. Je pense qu'il est important d'apprendre à gérer son argent dès le plus jeune âge.",
    keyVocab: [
      { fr: "l'argent de poche", en: "pocket money" },
      { fr: "épargner", en: "to save (money)" },
      { fr: "dépenser", en: "to spend" },
      { fr: "un achat", en: "a purchase" },
      { fr: "gérer son argent", en: "to manage one's money" },
      { fr: "la moitié", en: "half" },
    ],
  },
  {
    id: "sho_04",
    topicKey: "shopping",
    text: "Décris ton dernier achat important.",
    hint: "Use passé composé to describe a recent significant purchase.",
    difficulty: 1,
    followUps: [
      "Pourquoi as-tu décidé d'acheter cela ?",
      "As-tu économisé longtemps avant de l'acheter ?",
      "Es-tu satisfait(e) de cet achat ?",
    ],
    modelAnswer: "Le mois dernier, j'ai acheté un nouveau vélo parce que le mien était trop vieux et cassé. J'ai économisé pendant presque six mois avec mon argent de poche pour pouvoir me le permettre. Je suis très satisfait(e) de cet achat parce que je peux maintenant aller à l'école plus rapidement et faire de l'exercice en même temps.",
    keyVocab: [
      { fr: "un achat important", en: "a significant purchase" },
      { fr: "cassé(e)", en: "broken" },
      { fr: "économiser", en: "to save up" },
      { fr: "se permettre", en: "to afford" },
      { fr: "satisfait(e)", en: "satisfied" },
      { fr: "en même temps", en: "at the same time" },
    ],
  },
  {
    id: "sho_05",
    topicKey: "shopping",
    text: "Où aimes-tu faire tes courses en général ?",
    hint: "Describe your preferred shopping locations.",
    difficulty: 1,
    followUps: [
      "Y a-t-il un centre commercial près de chez toi ?",
      "Préfères-tu les grandes surfaces ou les petits magasins ?",
      "Qu'est-ce que tu aimes dans cet endroit en particulier ?",
    ],
    modelAnswer: "J'aime bien faire mes courses dans le centre commercial près de chez moi parce qu'il y a beaucoup de magasins différents au même endroit. Je préfère généralement les petites boutiques indépendantes parce que le service est plus personnalisé, mais les grandes surfaces sont plus pratiques pour les courses alimentaires. Ce que j'aime le plus dans le centre commercial, c'est qu'il y a aussi des cafés où on peut se reposer.",
    keyVocab: [
      { fr: "un centre commercial", en: "a shopping centre" },
      { fr: "une grande surface", en: "a superstore" },
      { fr: "une boutique", en: "a small shop/boutique" },
      { fr: "personnalisé(e)", en: "personalised" },
      { fr: "les courses alimentaires", en: "grocery shopping" },
      { fr: "pratique", en: "convenient" },
    ],
  },
  {
    id: "sho_06",
    topicKey: "shopping",
    text: "As-tu déjà profité des soldes ?",
    hint: "Discuss experience with sales/discounts.",
    difficulty: 1,
    followUps: [
      "Qu'as-tu acheté pendant les soldes ?",
      "Penses-tu que les soldes sont vraiment avantageuses ?",
      "Fais-tu la queue pour profiter des meilleures offres ?",
    ],
    modelAnswer: "Oui, l'hiver dernier, j'ai profité des soldes pour acheter un manteau à moitié prix. Je pense que les soldes peuvent vraiment être avantageuses, mais il faut faire attention à ne pas acheter des choses inutiles seulement parce qu'elles sont moins chères. Je n'aime pas trop faire la queue, donc j'essaie d'y aller tôt le matin pour éviter la foule.",
    keyVocab: [
      { fr: "les soldes", en: "the sales" },
      { fr: "à moitié prix", en: "half price" },
      { fr: "avantageux/avantageuse", en: "advantageous" },
      { fr: "inutile", en: "useless/unnecessary" },
      { fr: "faire la queue", en: "to queue" },
      { fr: "la foule", en: "the crowd" },
    ],
  },
  {
    id: "sho_07",
    topicKey: "shopping",
    text: "Penses-tu que la publicité influence trop nos habitudes d'achat ?",
    hint: "Discuss the influence of advertising on consumer habits.",
    difficulty: 2,
    followUps: [
      "As-tu déjà acheté quelque chose à cause d'une publicité ?",
      "Les publicités ciblées sur internet te dérangent-elles ?",
      "Comment pourrait-on résister à la pression publicitaire ?",
    ],
    modelAnswer: "Je pense que la publicité a une influence énorme sur nos habitudes de consommation, souvent sans même qu'on s'en rende compte. Personnellement, j'ai déjà acheté un produit simplement parce qu'une publicité convaincante m'avait donné envie de l'essayer. Les publicités ciblées sur internet me dérangent un peu, parce qu'elles montrent à quel point nos données personnelles sont utilisées. Je pense qu'il faut développer un esprit critique face à la publicité.",
    keyVocab: [
      { fr: "la publicité", en: "advertising" },
      { fr: "une habitude de consommation", en: "a consumption habit" },
      { fr: "se rendre compte", en: "to realise" },
      { fr: "convaincant(e)", en: "convincing" },
      { fr: "les données personnelles", en: "personal data" },
      { fr: "un esprit critique", en: "critical thinking" },
    ],
  },
  {
    id: "sho_08",
    topicKey: "shopping",
    text: "Le shopping en ligne est-il bon ou mauvais pour l'environnement ?",
    hint: "Discuss the environmental impact of e-commerce.",
    difficulty: 2,
    followUps: [
      "Quels sont les problèmes liés aux livraisons rapides ?",
      "Que penses-tu de l'emballage excessif ?",
      "Comment les entreprises pourraient-elles réduire leur impact ?",
    ],
    modelAnswer: "Je pense que le shopping en ligne a un impact environnemental assez négatif, principalement à cause des livraisons rapides qui augmentent les émissions de carbone et de l'emballage souvent excessif. De plus, les retours fréquents de produits achetés en ligne génèrent beaucoup de déchets. Les entreprises pourraient réduire cet impact en utilisant des emballages recyclables et en encourageant des options de livraison plus lentes mais plus écologiques.",
    keyVocab: [
      { fr: "l'impact environnemental", en: "environmental impact" },
      { fr: "les émissions de carbone", en: "carbon emissions" },
      { fr: "l'emballage", en: "packaging" },
      { fr: "un retour", en: "a return" },
      { fr: "les déchets", en: "waste" },
      { fr: "écologique", en: "eco-friendly" },
    ],
  },
  {
    id: "sho_09",
    topicKey: "shopping",
    text: "Que penses-tu de la fast fashion ?",
    hint: "Discuss the ethics and impact of fast fashion.",
    difficulty: 2,
    followUps: [
      "Achètes-tu souvent des vêtements de fast fashion ?",
      "Quelles sont les alternatives à la fast fashion ?",
      "Pourquoi la fast fashion est-elle si populaire malgré ses inconvénients ?",
    ],
    modelAnswer: "Je pense que la fast fashion pose de sérieux problèmes éthiques et environnementaux, car elle repose souvent sur des conditions de travail précaires et une consommation excessive de ressources naturelles. Malgré cela, elle reste populaire parce que les prix sont très bas et les nouvelles collections sortent constamment. Personnellement, j'essaie d'acheter davantage de vêtements de seconde main ou de marques plus durables, même si c'est parfois plus cher.",
    keyVocab: [
      { fr: "la fast fashion", en: "fast fashion" },
      { fr: "éthique", en: "ethical" },
      { fr: "des conditions de travail précaires", en: "precarious working conditions" },
      { fr: "une ressource naturelle", en: "a natural resource" },
      { fr: "de seconde main", en: "second-hand" },
      { fr: "durable", en: "sustainable" },
    ],
  },
  {
    id: "sho_10",
    topicKey: "shopping",
    text: "Comment décides-tu si un achat en vaut vraiment la peine ?",
    hint: "Discuss your decision-making process for purchases.",
    difficulty: 2,
    followUps: [
      "Compares-tu toujours les prix avant d'acheter ?",
      "Lis-tu les avis des autres clients ?",
      "As-tu déjà regretté un achat impulsif ?",
    ],
    modelAnswer: "Avant de faire un achat important, je compare toujours les prix sur différents sites et je lis les avis des autres clients pour éviter les mauvaises surprises. Je me demande aussi si j'ai vraiment besoin de cet article ou si c'est juste une envie passagère. Une fois, j'ai acheté des écouteurs de manière impulsive sans faire de recherches, et je l'ai regretté parce qu'ils se sont cassés après seulement un mois.",
    keyVocab: [
      { fr: "en valoir la peine", en: "to be worth it" },
      { fr: "un avis", en: "a review" },
      { fr: "une envie passagère", en: "a passing whim" },
      { fr: "impulsif/impulsive", en: "impulsive" },
      { fr: "des écouteurs", en: "headphones/earbuds" },
      { fr: "regretter", en: "to regret" },
    ],
  },
  {
    id: "sho_11",
    topicKey: "shopping",
    text: "Le consumérisme est-il devenu un problème dans la société actuelle ?",
    hint: "Discuss consumerism as a broader societal issue.",
    difficulty: 3,
    followUps: [
      "Quelles sont les causes de la surconsommation ?",
      "Comment les réseaux sociaux encouragent-ils le consumérisme ?",
      "Que pourrait-on faire pour promouvoir une consommation plus responsable ?",
    ],
    modelAnswer: "Je pense que le consumérisme est effectivement devenu un problème majeur dans notre société, alimenté par la publicité omniprésente et la pression sociale de posséder toujours plus. Les réseaux sociaux aggravent ce phénomène en présentant des styles de vie matérialistes comme un idéal à atteindre. Pour promouvoir une consommation plus responsable, il faudrait sensibiliser davantage les gens aux conséquences environnementales et sociales de leurs achats, dès l'école.",
    keyVocab: [
      { fr: "le consumérisme", en: "consumerism" },
      { fr: "alimenter", en: "to fuel" },
      { fr: "omniprésent(e)", en: "omnipresent" },
      { fr: "aggraver", en: "to worsen" },
      { fr: "matérialiste", en: "materialistic" },
      { fr: "sensibiliser", en: "to raise awareness" },
    ],
  },
  {
    id: "sho_12",
    topicKey: "shopping",
    text: "Les petits commerces peuvent-ils survivre face à la concurrence des grandes chaînes ?",
    hint: "Discuss small businesses vs large retail chains.",
    difficulty: 3,
    followUps: [
      "Quels sont les avantages des petits commerces ?",
      "Que pourrait faire le gouvernement pour les soutenir ?",
      "Préfères-tu personnellement soutenir les commerces locaux ?",
    ],
    modelAnswer: "Il est de plus en plus difficile pour les petits commerces de survivre face à la concurrence des grandes chaînes et des géants du commerce en ligne, qui peuvent proposer des prix plus bas grâce à leurs économies d'échelle. Cependant, les petits commerces offrent souvent un service plus personnalisé et des produits locaux de meilleure qualité. Je pense que le gouvernement devrait réduire les taxes pour les petites entreprises afin de préserver la diversité commerciale dans nos villes.",
    keyVocab: [
      { fr: "un petit commerce", en: "a small business" },
      { fr: "une chaîne", en: "a chain (of stores)" },
      { fr: "un géant", en: "a giant" },
      { fr: "les économies d'échelle", en: "economies of scale" },
      { fr: "une taxe", en: "a tax" },
      { fr: "la diversité commerciale", en: "commercial diversity" },
    ],
  },
  {
    id: "sho_13",
    topicKey: "shopping",
    text: "Comment les entreprises utilisent-elles les données des clients pour influencer leurs achats ?",
    hint: "Discuss data-driven marketing and personalisation.",
    difficulty: 3,
    followUps: [
      "Est-ce éthique d'utiliser les données personnelles de cette façon ?",
      "As-tu remarqué des publicités très personnalisées récemment ?",
      "Que pourrait-on faire pour mieux protéger les consommateurs ?",
    ],
    modelAnswer: "Les entreprises collectent d'énormes quantités de données sur nos habitudes de navigation et d'achat pour créer des publicités hautement personnalisées qui augmentent la probabilité d'un achat. Je trouve cela un peu inquiétant sur le plan éthique, car les consommateurs ne sont pas toujours conscients de l'ampleur de cette surveillance. Il faudrait des réglementations plus strictes pour garantir la transparence et permettre aux gens de mieux contrôler leurs données personnelles.",
    keyVocab: [
      { fr: "collecter", en: "to collect" },
      { fr: "la navigation", en: "browsing" },
      { fr: "la probabilité", en: "likelihood" },
      { fr: "l'ampleur", en: "the extent/scale" },
      { fr: "la surveillance", en: "surveillance" },
      { fr: "une réglementation", en: "a regulation" },
    ],
  },
  {
    id: "sho_14",
    topicKey: "shopping",
    text: "Faut-il enseigner l'éducation financière aux jeunes dès l'école ?",
    hint: "Argue for/against teaching financial literacy in schools.",
    difficulty: 3,
    followUps: [
      "Que devrait inclure un tel programme ?",
      "As-tu déjà appris à gérer un budget à l'école ?",
      "Qui devrait être responsable de cet enseignement : l'école ou les parents ?",
    ],
    modelAnswer: "Je pense fermement que l'éducation financière devrait être enseignée à l'école, car de nombreux jeunes adultes se retrouvent endettés simplement parce qu'ils n'ont jamais appris à gérer un budget correctement. Un tel programme devrait inclure des notions de base comme l'épargne, les intérêts des prêts et les dangers du crédit à la consommation. Bien que les parents aient aussi un rôle à jouer, l'école pourrait garantir que tous les élèves reçoivent ces connaissances essentielles, indépendamment de leur milieu familial.",
    keyVocab: [
      { fr: "l'éducation financière", en: "financial literacy" },
      { fr: "endetté(e)", en: "in debt" },
      { fr: "un budget", en: "a budget" },
      { fr: "un intérêt (financier)", en: "interest (financial)" },
      { fr: "un prêt", en: "a loan" },
      { fr: "le milieu familial", en: "family background" },
    ],
  },
  {
    id: "sho_15",
    topicKey: "shopping",
    text: "Dans quelle mesure notre identité est-elle liée à ce que nous achetons ?",
    hint: "Discuss the relationship between consumption and identity.",
    difficulty: 3,
    followUps: [
      "Les marques que l'on porte définissent-elles qui l'on est ?",
      "Est-il possible d'échapper complètement au consumérisme ?",
      "Comment la mode reflète-t-elle notre personnalité ?",
    ],
    modelAnswer: "Je pense que notre identité est fortement, mais pas exclusivement, liée à ce que nous achetons, car les choix de consommation, comme les vêtements ou la technologie, sont souvent utilisés pour projeter une certaine image de soi. Cependant, je crois qu'il est dangereux de réduire son identité uniquement à des possessions matérielles. Il est presque impossible d'échapper complètement au consumérisme dans notre société, mais on peut choisir consciemment de valoriser des expériences plutôt que des objets.",
    keyVocab: [
      { fr: "lié(e) à", en: "linked to" },
      { fr: "projeter une image", en: "to project an image" },
      { fr: "réduire à", en: "to reduce to" },
      { fr: "une possession matérielle", en: "a material possession" },
      { fr: "échapper à", en: "to escape" },
      { fr: "consciemment", en: "consciously" },
    ],
  },
  {
    id: "sho_16",
    topicKey: "shopping",
    text: "As-tu déjà vendu ou échangé des objets d'occasion ?",
    hint: "Describe experience buying/selling second-hand goods.",
    difficulty: 1,
    followUps: [
      "Quels objets as-tu vendus ou achetés d'occasion ?",
      "Où fais-tu ce genre d'échanges ?",
      "Penses-tu que c'est une bonne façon de consommer ?",
    ],
    modelAnswer: "Oui, j'ai déjà vendu quelques vêtements que je ne portais plus sur une application de seconde main. J'ai aussi acheté un livre d'occasion pour un cours, ce qui m'a permis d'économiser de l'argent. Je pense que c'est une excellente façon de consommer parce que cela réduit le gaspillage et permet à d'autres personnes d'acheter des choses à prix réduit.",
    keyVocab: [
      { fr: "vendre", en: "to sell" },
      { fr: "échanger", en: "to exchange" },
      { fr: "d'occasion", en: "second-hand" },
      { fr: "une application", en: "an app" },
      { fr: "le gaspillage", en: "waste" },
      { fr: "à prix réduit", en: "at a reduced price" },
    ],
  },
  {
    id: "sho_17",
    topicKey: "shopping",
    text: "Comment choisis-tu un cadeau pour quelqu'un ?",
    hint: "Describe how you choose gifts for others.",
    difficulty: 1,
    followUps: [
      "Préfères-tu offrir un cadeau matériel ou une expérience ?",
      "As-tu déjà offert un cadeau fait main ?",
      "Quel a été le meilleur cadeau que tu as offert ?",
    ],
    modelAnswer: "Quand je choisis un cadeau, j'essaie de penser aux passions et aux besoins spécifiques de la personne plutôt que d'acheter quelque chose de générique. Je préfère parfois offrir une expérience, comme un billet de concert, plutôt qu'un objet matériel, parce que cela crée des souvenirs durables. Le meilleur cadeau que j'ai offert était un album photo fait main pour l'anniversaire de ma grand-mère, qui l'a beaucoup touchée.",
    keyVocab: [
      { fr: "un cadeau", en: "a gift" },
      { fr: "un besoin", en: "a need" },
      { fr: "générique", en: "generic" },
      { fr: "un billet", en: "a ticket" },
      { fr: "fait main", en: "handmade" },
      { fr: "toucher (émouvoir)", en: "to touch/move (emotionally)" },
    ],
  },
  {
    id: "sho_18",
    topicKey: "shopping",
    text: "Les réductions et les promotions te poussent-elles à acheter des choses inutiles ?",
    hint: "Discuss the psychological pull of discounts and promotions.",
    difficulty: 2,
    followUps: [
      "Comment résistes-tu à ces tentations ?",
      "Les entreprises créent-elles un sentiment d'urgence artificiel ?",
      "As-tu déjà regretté un achat fait pendant une promotion ?",
    ],
    modelAnswer: "Oui, je dois admettre que les réductions me poussent parfois à acheter des choses dont je n'ai pas vraiment besoin, simplement parce que l'offre semble trop bonne pour être ignorée. Les entreprises créent souvent un sentiment d'urgence artificiel avec des phrases comme « offre limitée » pour nous pousser à acheter impulsivement. Pour résister, j'essaie maintenant d'attendre vingt-quatre heures avant de finaliser un achat non essentiel.",
    keyVocab: [
      { fr: "une réduction", en: "a discount" },
      { fr: "une tentation", en: "a temptation" },
      { fr: "un sentiment d'urgence", en: "a sense of urgency" },
      { fr: "une offre limitée", en: "a limited offer" },
      { fr: "impulsivement", en: "impulsively" },
      { fr: "finaliser", en: "to finalise" },
    ],
  },
  {
    id: "sho_19",
    topicKey: "shopping",
    text: "Penses-tu que l'on devrait boycotter certaines entreprises pour des raisons éthiques ?",
    hint: "Discuss consumer boycotts as ethical action.",
    difficulty: 3,
    followUps: [
      "Peux-tu donner un exemple de boycott efficace ?",
      "Le boycott individuel a-t-il vraiment un impact ?",
      "Est-il difficile de savoir quelles entreprises sont éthiques ?",
    ],
    modelAnswer: "Je pense que boycotter des entreprises pour des raisons éthiques peut être un moyen puissant de faire pression sur les grandes marques, surtout quand suffisamment de consommateurs se mobilisent ensemble. Cependant, un boycott individuel a souvent un impact limité, et il peut être très difficile de savoir avec certitude si une entreprise agit de manière éthique, car les chaînes d'approvisionnement sont souvent complexes et opaques. Je pense qu'il est important de faire des recherches avant de prendre position.",
    keyVocab: [
      { fr: "boycotter", en: "to boycott" },
      { fr: "faire pression", en: "to put pressure" },
      { fr: "se mobiliser", en: "to mobilise" },
      { fr: "une chaîne d'approvisionnement", en: "a supply chain" },
      { fr: "opaque", en: "opaque" },
      { fr: "prendre position", en: "to take a stand" },
    ],
  },
  {
    id: "sho_20",
    topicKey: "shopping",
    text: "Comment vois-tu l'évolution du shopping dans dix ans ?",
    hint: "Use future tense to speculate about the future of shopping.",
    difficulty: 3,
    followUps: [
      "La réalité virtuelle changera-t-elle notre façon de faire du shopping ?",
      "Les magasins physiques disparaîtront-ils complètement ?",
      "Comment l'intelligence artificielle influencera-t-elle nos achats ?",
    ],
    modelAnswer: "Je pense que dans dix ans, le shopping sera encore plus numérique, avec probablement l'utilisation de la réalité virtuelle pour essayer des vêtements sans quitter la maison. Je ne pense pas que les magasins physiques disparaîtront complètement, mais ils devront offrir des expériences uniques que l'on ne peut pas trouver en ligne pour survivre. L'intelligence artificielle jouera aussi un rôle plus important en recommandant des produits de manière encore plus personnalisée.",
    keyVocab: [
      { fr: "la réalité virtuelle", en: "virtual reality" },
      { fr: "numérique", en: "digital" },
      { fr: "disparaître", en: "to disappear" },
      { fr: "survivre", en: "to survive" },
      { fr: "recommander", en: "to recommend" },
      { fr: "personnalisé(e)", en: "personalised" },
    ],
  },
  {
    id: "sho_21",
    topicKey: "shopping",
    text: "Quel est le pire achat que tu aies jamais fait ?",
    hint: "Describe a regretted purchase using passé composé.",
    difficulty: 2,
    followUps: [
      "Pourquoi cet achat n'était-il pas une bonne idée ?",
      "As-tu pu le retourner ou le rembourser ?",
      "Qu'as-tu appris de cette expérience ?",
    ],
    modelAnswer: "Le pire achat que j'ai jamais fait, c'était une paire de chaussures que j'ai achetée uniquement parce qu'elles étaient à la mode, sans vérifier si elles étaient confortables. Elles m'ont fait très mal aux pieds et je ne les ai portées qu'une seule fois. Malheureusement, je n'ai pas pu les rendre parce que j'avais jeté le ticket de caisse. Depuis, j'ai appris à toujours essayer les chaussures avant de les acheter.",
    keyVocab: [
      { fr: "à la mode", en: "trendy" },
      { fr: "confortable", en: "comfortable" },
      { fr: "faire mal", en: "to hurt" },
      { fr: "rendre (un article)", en: "to return (an item)" },
      { fr: "un ticket de caisse", en: "a receipt" },
      { fr: "jeter", en: "to throw away" },
    ],
  },
  {
    id: "sho_22",
    topicKey: "shopping",
    text: "Quelle est la différence entre un besoin et une envie quand on fait du shopping ?",
    hint: "Distinguish between needs and wants in consumption.",
    difficulty: 2,
    followUps: [
      "Comment fais-tu la différence entre les deux ?",
      "Est-il facile de résister à ses envies ?",
      "Peux-tu donner un exemple récent des deux ?",
    ],
    modelAnswer: "Un besoin est quelque chose d'essentiel, comme des vêtements pour l'hiver ou de la nourriture, tandis qu'une envie est quelque chose que l'on désire sans en avoir réellement besoin, comme un nouveau jeu vidéo. Je fais la différence en me demandant si je pourrais vivre sans cet article pendant encore un mois. Récemment, j'ai eu besoin d'un nouveau sac à dos pour l'école, mais j'avais aussi envie d'un nouveau jeu que j'ai finalement décidé de ne pas acheter tout de suite.",
    keyVocab: [
      { fr: "un besoin", en: "a need" },
      { fr: "une envie", en: "a want/desire" },
      { fr: "essentiel(le)", en: "essential" },
      { fr: "désirer", en: "to desire" },
      { fr: "un sac à dos", en: "a backpack" },
      { fr: "tout de suite", en: "right away" },
    ],
  },
  {
    id: "sho_23",
    topicKey: "shopping",
    text: "Comment les magasins essaient-ils de te faire acheter plus que prévu ?",
    hint: "Discuss retail tactics that encourage extra spending.",
    difficulty: 2,
    followUps: [
      "As-tu déjà remarqué la disposition des produits dans un magasin ?",
      "Les caisses avec des petits articles te tentent-elles souvent ?",
      "Comment évites-tu de dépenser plus que prévu ?",
    ],
    modelAnswer: "Les magasins utilisent plusieurs stratégies, comme placer des produits tentants près des caisses ou organiser les rayons de façon à ce qu'on doive traverser tout le magasin pour trouver ce dont on a besoin. J'ai remarqué que les petits articles bon marché près des caisses me tentent souvent, même si je n'en avais pas prévu l'achat. Pour éviter de dépenser trop, j'essaie de faire une liste de courses avant d'entrer dans le magasin et de m'y tenir.",
    keyVocab: [
      { fr: "prévu(e)", en: "planned" },
      { fr: "la disposition", en: "the layout" },
      { fr: "un rayon", en: "an aisle/shelf section" },
      { fr: "tentant(e)", en: "tempting" },
      { fr: "une liste de courses", en: "a shopping list" },
      { fr: "s'y tenir", en: "to stick to it" },
    ],
  },
  {
    id: "sho_24",
    topicKey: "shopping",
    text: "Le prix d'un produit reflète-t-il toujours sa qualité ?",
    hint: "Discuss the relationship between price and quality.",
    difficulty: 2,
    followUps: [
      "As-tu déjà acheté un produit cher qui s'est avéré décevant ?",
      "Les marques de luxe justifient-elles leurs prix élevés ?",
      "Comment évalues-tu la qualité avant d'acheter ?",
    ],
    modelAnswer: "Je ne pense pas que le prix d'un produit reflète toujours sa qualité réelle ; parfois, on paie principalement pour le nom de la marque plutôt que pour une différence de fabrication significative. Par exemple, j'ai acheté un vêtement de marque assez cher qui s'est déchiré après quelques lavages seulement. Maintenant, j'évalue la qualité en lisant les avis en ligne et en vérifiant les matériaux utilisés, plutôt qu'en me fiant uniquement au prix.",
    keyVocab: [
      { fr: "s'avérer", en: "to turn out to be" },
      { fr: "une marque de luxe", en: "a luxury brand" },
      { fr: "la fabrication", en: "manufacturing" },
      { fr: "se déchirer", en: "to tear" },
      { fr: "un lavage", en: "a wash" },
      { fr: "se fier à", en: "to rely on/trust" },
    ],
  },
  {
    id: "sho_25",
    topicKey: "shopping",
    text: "Que penses-tu des influenceurs qui font la promotion de produits sur les réseaux sociaux ?",
    hint: "Discuss the phenomenon of social media influencer marketing.",
    difficulty: 3,
    followUps: [
      "Fais-tu confiance aux recommandations des influenceurs ?",
      "Ces publicités devraient-elles être clairement identifiées ?",
      "As-tu déjà acheté un produit recommandé par un influenceur ?",
    ],
    modelAnswer: "Je suis plutôt sceptique face aux influenceurs qui font la promotion de produits, car ils sont souvent payés pour donner un avis positif, même s'ils n'utilisent pas vraiment le produit. Je pense que ces publicités devraient toujours être clairement identifiées pour que les consommateurs sachent qu'il s'agit d'un partenariat commercial et non d'une opinion sincère. Une fois, j'ai acheté un produit de beauté recommandé par une influenceuse, mais il ne fonctionnait pas du tout comme promis.",
    keyVocab: [
      { fr: "un influenceur/une influenceuse", en: "an influencer" },
      { fr: "sceptique", en: "sceptical" },
      { fr: "un partenariat commercial", en: "a commercial partnership" },
      { fr: "sincère", en: "sincere" },
      { fr: "un produit de beauté", en: "a beauty product" },
      { fr: "promis(e)", en: "promised" },
    ],
  },
  {
    id: "sho_26",
    topicKey: "shopping",
    text: "Comment le pouvoir d'achat des familles a-t-il évolué ces dernières années ?",
    hint: "Discuss changes in purchasing power and cost of living.",
    difficulty: 3,
    followUps: [
      "Quels produits ont le plus augmenté de prix ?",
      "Comment les familles s'adaptent-elles à ces changements ?",
      "Le gouvernement devrait-il intervenir davantage ?",
    ],
    modelAnswer: "Le pouvoir d'achat des familles a nettement diminué ces dernières années à cause de l'inflation, qui a fait augmenter le prix de nombreux produits essentiels, comme l'alimentation et l'énergie. Pour s'adapter, de nombreuses familles réduisent leurs dépenses non essentielles ou cherchent activement des promotions et des marques moins chères. Je pense que le gouvernement devrait intervenir davantage, par exemple en plafonnant le prix de certains produits de première nécessité.",
    keyVocab: [
      { fr: "le pouvoir d'achat", en: "purchasing power" },
      { fr: "l'inflation", en: "inflation" },
      { fr: "l'alimentation", en: "food/nutrition" },
      { fr: "réduire les dépenses", en: "to cut spending" },
      { fr: "plafonner", en: "to cap" },
      { fr: "de première nécessité", en: "essential (basic necessity)" },
    ],
  },
  {
    id: "sho_27",
    topicKey: "shopping",
    text: "Est-il possible de faire du shopping de manière éthique dans le monde actuel ?",
    hint: "Discuss the feasibility of fully ethical consumption today.",
    difficulty: 3,
    followUps: [
      "Quelles démarches peuvent aider à consommer plus éthiquement ?",
      "Est-ce que le coût est un obstacle majeur ?",
      "Qui devrait porter la responsabilité : les consommateurs ou les entreprises ?",
    ],
    modelAnswer: "Je pense qu'il est très difficile, voire impossible, de faire du shopping de manière parfaitement éthique dans le monde actuel, étant donné la complexité des chaînes de production mondiales. Cependant, on peut faire des efforts, comme privilégier les produits locaux, vérifier les certifications équitables et limiter sa consommation générale. Le coût reste souvent un obstacle, car les produits éthiques sont généralement plus chers. À mon avis, la responsabilité devrait être partagée entre les consommateurs et les entreprises elles-mêmes.",
    keyVocab: [
      { fr: "voire", en: "or even" },
      { fr: "une chaîne de production", en: "a production chain" },
      { fr: "privilégier", en: "to favour/prioritise" },
      { fr: "une certification équitable", en: "a fair-trade certification" },
      { fr: "un obstacle", en: "an obstacle" },
      { fr: "partagé(e)", en: "shared" },
    ],
  },
  {
    id: "sho_28",
    topicKey: "shopping",
    text: "Comment les jeunes générations consomment-elles différemment de leurs parents ?",
    hint: "Compare generational shopping/consumption habits.",
    difficulty: 3,
    followUps: [
      "Les jeunes se soucient-ils plus de l'éthique de leurs achats ?",
      "Le shopping en ligne a-t-il changé les habitudes des jeunes ?",
      "Y a-t-il des différences dans la façon d'épargner ?",
    ],
    modelAnswer: "Je pense que les jeunes générations consomment de manière assez différente de leurs parents, notamment parce qu'elles ont grandi avec le shopping en ligne et sont donc plus habituées à comparer les prix instantanément. De plus, beaucoup de jeunes semblent plus sensibles aux questions éthiques et environnementales que la génération précédente, en privilégiant par exemple les vêtements de seconde main. Cependant, on pourrait aussi dire que les jeunes sont davantage exposés à la pression des réseaux sociaux pour consommer.",
    keyVocab: [
      { fr: "une génération", en: "a generation" },
      { fr: "habitué(e) à", en: "used to" },
      { fr: "sensible à", en: "sensitive to" },
      { fr: "la génération précédente", en: "the previous generation" },
      { fr: "exposé(e) à", en: "exposed to" },
      { fr: "la pression sociale", en: "social pressure" },
    ],
  },
  {
    id: "sho_29",
    topicKey: "shopping",
    text: "Le marketing basé sur la rareté ('offre limitée', 'stock presque épuisé') est-il manipulateur ?",
    hint: "Discuss scarcity marketing tactics and their ethics.",
    difficulty: 3,
    followUps: [
      "As-tu déjà été influencé(e) par ce genre de message ?",
      "Pourquoi ces tactiques fonctionnent-elles si bien psychologiquement ?",
      "Devrait-on réglementer ce type de marketing ?",
    ],
    modelAnswer: "Je pense que le marketing basé sur la rareté est en effet assez manipulateur, car il exploite notre peur de manquer une opportunité, connue sous le nom de FOMO, pour nous pousser à acheter rapidement sans réfléchir. Ces tactiques fonctionnent bien parce qu'elles créent une pression psychologique immédiate qui court-circuite notre réflexion rationnelle. Je pense qu'il devrait y avoir plus de transparence, par exemple en exigeant que les entreprises prouvent la véracité de ces affirmations sur les stocks limités.",
    keyVocab: [
      { fr: "la rareté", en: "scarcity" },
      { fr: "manipulateur/manipulatrice", en: "manipulative" },
      { fr: "exploiter", en: "to exploit" },
      { fr: "court-circuiter", en: "to short-circuit/bypass" },
      { fr: "la transparence", en: "transparency" },
      { fr: "la véracité", en: "truthfulness" },
    ],
  },
  {
    id: "sho_30",
    topicKey: "shopping",
    text: "Dans quelle mesure le shopping est-il devenu une forme de divertissement plutôt qu'une simple nécessité ?",
    hint: "Discuss shopping as entertainment/leisure rather than necessity.",
    difficulty: 3,
    followUps: [
      "Pourquoi les gens font-ils du shopping même sans rien acheter ?",
      "Les centres commerciaux sont-ils devenus des lieux de loisirs ?",
      "Cela pose-t-il un risque pour la surconsommation ?",
    ],
    modelAnswer: "Je pense que le shopping est effectivement devenu, pour beaucoup de gens, une forme de divertissement à part entière plutôt qu'une simple nécessité pratique. Les centres commerciaux modernes proposent des cinémas, des restaurants et des espaces de loisirs, transformant l'expérience d'achat en une sortie complète pour la famille ou les amis. Cependant, je pense que cette transformation du shopping en loisir encourage la surconsommation, car les gens finissent souvent par acheter des choses simplement parce qu'ils s'ennuient ou cherchent une distraction.",
    keyVocab: [
      { fr: "le divertissement", en: "entertainment" },
      { fr: "une nécessité", en: "a necessity" },
      { fr: "à part entière", en: "in its own right" },
      { fr: "une sortie", en: "an outing" },
      { fr: "la surconsommation", en: "overconsumption" },
      { fr: "une distraction", en: "a distraction" },
    ],
  },

  // ── ADVANCED TOPICS ──────────────────────────────────────────────────────

  // PROFESSIONAL FRENCH
  {
    id: "pro_01",
    topicKey: "pro",
    text: "Quelles sont les compétences les plus importantes pour réussir dans le monde du travail aujourd'hui ?",
    hint: "Discuss soft skills (communication, teamwork) vs hard skills (languages, tech).",
    difficulty: 3,
    followUps: ["Voudriez-vous travailler dans une grande entreprise internationale ?", "L'intelligence artificielle va-t-elle changer votre métier ?"],
    modelAnswer: "À mon avis, l'adaptabilité et l'intelligence émotionnelle sont cruciales. Il faut savoir collaborer et communiquer efficacement.",
    keyVocab: [{ fr: "l'adaptabilité", en: "adaptability" }, { fr: "collaborer", en: "to collaborate" }]
  },

  // CULTURE & TRADITIONS
  {
    id: "cul_01",
    topicKey: "culture",
    text: "Pourquoi est-il important de préserver les traditions culturelles dans un monde globalisé ?",
    hint: "Talk about identity, heritage, and the impact of modernization.",
    difficulty: 3,
    followUps: ["Quelle est votre fête traditionnelle préférée ?", "La culture française influence-t-elle votre pays ?"],
    modelAnswer: "Préserver les traditions permet de garder un lien avec nos racines et de célébrer la diversité humaine.",
    keyVocab: [{ fr: "les racines", en: "roots" }, { fr: "globalisé", en: "globalized" }]
  },

  // LIFESTYLE & TRENDS
  {
    id: "life_01",
    topicKey: "lifestyle",
    text: "Comment la mode influence-t-elle l'identité des jeunes aujourd'hui ?",
    hint: "Discuss self-expression, peer pressure, and sustainable fashion.",
    difficulty: 3,
    followUps: ["Suivez-vous les tendances sur les réseaux sociaux ?", "Le style est-il plus important que le confort ?"],
    modelAnswer: "La mode est un moyen d'expression personnelle, mais elle peut aussi créer une pression sociale constante.",
    keyVocab: [{ fr: "l'expression personnelle", en: "self-expression" }, { fr: "la tendance", en: "trend" }]
  },

  // CURRENT AFFAIRS
  {
    id: "news_01",
    topicKey: "news",
    text: "Quel est l'impact des réseaux sociaux sur la diffusion de l'information ?",
    hint: "Discuss fake news, speed of information, and social awareness.",
    difficulty: 3,
    followUps: ["Lisez-vous souvent les actualités ?", "Peut-on faire confiance aux médias traditionnels ?"],
    modelAnswer: "Les réseaux sociaux permettent une diffusion instantanée, mais ils favorisent aussi la propagation de fausses nouvelles.",
    keyVocab: [{ fr: "la diffusion", en: "spread/broadcast" }, { fr: "fausses nouvelles", en: "fake news" }]
  },

  // SLANG & IDIOMS
  {
    id: "slang_01",
    topicKey: "slang",
    text: "Est-ce que tu trouves que le français familier est difficile à comprendre ?",
    hint: "Discuss slang (verlan) and idiomatic expressions.",
    difficulty: 2,
    followUps: ["Utilises-tu des expressions familières avec tes amis ?", "Le français des livres est-il très différent du français parlé ?"],
    modelAnswer: "Le français familier est complexe car il utilise beaucoup d'argot comme le verlan, mais c'est essentiel pour sonner naturel.",
    keyVocab: [{ fr: "l'argot", en: "slang" }, { fr: "sonner naturel", en: "to sound natural" }]
  },

  // SURVIVAL FRENCH
  {
    id: "surv_01",
    topicKey: "survival",
    text: "Que ferais-tu si tu perdais ton passeport et ton téléphone dans un pays étranger ?",
    hint: "High-pressure situation. Describe steps to take (consulate, police).",
    difficulty: 3,
    followUps: ["Sais-tu demander de l'aide en urgence ?", "Es-tu une personné débrouillarde ?"],
    modelAnswer: "Je contacterais immédiatement l'ambassade et j'irais au commissariat de police le plus proche pour déclarer le vol.",
    keyVocab: [{ fr: "l'ambassade", en: "embassy" }, { fr: "débrouillard", en: "resourceful" }]
  },

  // RHETORIC & DEBATE
  {
    id: "deb_01",
    topicKey: "debate",
    text: "Le vote devrait-il être obligatoire dès l'âge de 16 ans ?",
    hint: "Argue for or against using logical connectors.",
    difficulty: 3,
    followUps: ["Les jeunes s'intéressent-ils assez à la politique ?", "Comment encourager l'engagement citoyen ?"],
    modelAnswer: "D'une part, cela encouragerait l'engagement civique précoce. D'autre part, certains pensent que 16 ans est trop jeune.",
    keyVocab: [{ fr: "l'engagement civique", en: "civic engagement" }, { fr: "d'une part", en: "on one hand" }]
  },

  // VISUAL STORYTELLING
  {
    id: "art_01",
    topicKey: "art",
    text: "Décris un tableau ou une image qui t'a particulièrement marqué.",
    hint: "Focus on colors, composition, and emotions felt.",
    difficulty: 3,
    followUps: ["L'art est-il essentiel à la société ?", "Préfères-tu l'art moderne ou classique ?"],
    modelAnswer: "Ce tableau m'a frappé par l'utilisation de couleurs vives et la mélancolie qui se dégage du personnage central.",
    keyVocab: [{ fr: "frapper", en: "to strike/impress" }, { fr: "se dégager", en: "to emanate" }]
  },

  // --- FOOD (Expansion - 30 New Questions) ---
  {
    id: "foo_45",
    topicKey: "food",
    text: "Que penses-tu de l'influence des réseaux sociaux sur nos choix alimentaires ?",
    hint: "Discuss how Instagram or TikTok affect what and where people eat.",
    difficulty: 2,
    followUps: [
      "Est-ce que tu prends des photos de tes plats avant de manger ?",
      "As-tu déjà testé une recette devenue virale ?",
      "Est-ce que l'apparence d'un plat est plus importante que son goût ?"
    ],
    modelAnswer: "Je pense que les réseaux sociaux ont un impact énorme, car on voit constamment des photos de plats magnifiques qui donnent envie. Cela encourage les restaurants à être plus créatifs visuellement. Cependant, je trouve dommage que certaines personnes privilégient l'esthétique au détriment du goût. Personnellement, j'aime bien regarder des vidéos de cuisine sur TikTok pour trouver de l'inspiration.",
    keyVocab: [
      { fr: "les réseaux sociaux", en: "social media" },
      { fr: "viral(e)", en: "viral" },
      { fr: "l'apparence", en: "appearance" },
      { fr: "au détriment de", en: "at the expense of" },
      { fr: "l'esthétique", en: "aesthetics" },
      { fr: "l'inspiration", en: "inspiration" }
    ],
  },
  {
    id: "foo_46",
    topicKey: "food",
    text: "Connais-tu la cuisine moléculaire ? Aimerais-tu la goûter ?",
    hint: "Discuss the fusion of science and cooking (foams, spheres, etc.).",
    difficulty: 3,
    followUps: [
      "Penses-tu que c'est de l'art ou de la science ?",
      "Est-ce que tu préfères la cuisine traditionnelle ou moderne ?",
      "Quels ingrédients bizarres as-tu déjà vus ?"
    ],
    modelAnswer: "La cuisine moléculaire est fascinante car elle utilise des techniques scientifiques pour transformer les textures des aliments, comme faire des mousses ou des perles de saveur. J'aimerais beaucoup goûter cela un jour car c'est une expérience sensorielle unique. Même si c'est très moderne, je pense que cela reste de l'art culinaire car le but est de surprendre le client.",
    keyVocab: [
      { fr: "la cuisine moléculaire", en: "molecular gastronomy" },
      { fr: "scientifique", en: "scientific" },
      { fr: "une texture", en: "a texture" },
      { fr: "sensoriel(le)", en: "sensory" },
      { fr: "surprendre", en: "to surprise" },
      { fr: "culinaire", en: "culinary" }
    ],
  },
  {
    id: "foo_47",
    topicKey: "food",
    text: "Que penses-tu de la nourriture imprimée en 3D ?",
    hint: "Discuss the possibility of printing meals and its benefits.",
    difficulty: 3,
    followUps: [
      "Serais-tu prêt à manger un steak imprimé en 3D ?",
      "Quels sont les avantages pour l'environnement ?",
      "Est-ce que cela va remplacer les chefs ?"
    ],
    modelAnswer: "C'est une technologie incroyable qui pourrait aider à réduire le gaspillage en utilisant des ingrédients précis. On pourrait créer des formes impossibles à faire à la main. Cependant, je ne suis pas sûr que ce soit aussi savoureux que la cuisine faite par un humain. Pour l'environnement, cela pourrait réduire les émissions de carbone si on utilise des protéines végétales au lieu de viande.",
    keyVocab: [
      { fr: "imprimé en 3D", en: "3D printed" },
      { fr: "le gaspillage", en: "waste" },
      { fr: "précis(e)", en: "precise" },
      { fr: "savoureux / savoureuse", en: "tasty / flavorful" },
      { fr: "les émissions de carbone", en: "carbon emissions" },
      { fr: "remplacer", en: "to replace" }
    ],
  },
  {
    id: "foo_48",
    topicKey: "food",
    text: "Penses-tu que les repas scolaires sont meilleurs dans certains pays que dans d'autres ?",
    hint: "Compare school lunches globally (e.g., France vs. USA vs. Japan).",
    difficulty: 2,
    followUps: [
      "Qu'est-ce que tu sais des repas scolaires en France ?",
      "Penses-tu que le déjeuner devrait être gratuit pour tous ?",
      "Quel pays a la nourriture la plus saine selon toi ?"
    ],
    modelAnswer: "J'ai entendu dire qu'en France, les élèves mangent souvent des repas complets avec plusieurs plats, ce qui semble excellent. Au Japon, les élèves aident souvent à servir la nourriture, ce qui apprend la responsabilité. Je pense que chaque pays a ses forces, mais il est crucial que tous les enfants aient accès à une alimentation saine et équilibrée à l'école, peu importe le budget de leurs parents.",
    keyVocab: [
      { fr: "entendre dire que", en: "to hear that" },
      { fr: "gratuit(e)", en: "free" },
      { fr: "la responsabilité", en: "responsibility" },
      { fr: "équilibré(e)", en: "balanced" },
      { fr: "peu importe", en: "regardless of / no matter" },
      { fr: "les forces", en: "strengths" }
    ],
  },
  {
    id: "foo_49",
    topicKey: "food",
    text: "Que penses-tu de la consommation excessive de boissons énergisantes chez les jeunes ?",
    hint: "Discuss the health risks of caffeine and sugar for students.",
    difficulty: 2,
    followUps: [
      "En bois-tu pour réviser tes examens ?",
      "Quels sont les effets secondaires ?",
      "Devrait-on interdire la vente aux mineurs ?"
    ],
    modelAnswer: "Je trouve cela inquiétant car ces boissons contiennent énormément de caféine et de sucre. Beaucoup de jeunes en boivent pour rester éveillés, mais cela peut causer du stress, des palpitations ou des insomnies. À mon avis, il vaut mieux dormir suffisamment ou boire de l'eau. Je serais favorable à une interdiction de vente aux moins de 16 ans pour protéger leur santé.",
    keyVocab: [
      { fr: "excessif / excessive", en: "excessive" },
      { fr: "une boisson énergisante", en: "energy drink" },
      { fr: "éveillé(e)", en: "awake" },
      { fr: "une insomnie", en: "insomnia" },
      { fr: "interdire", en: "to forbid / ban" },
      { fr: "favorable à", en: "in favor of" }
    ],
  },
  {
    id: "foo_50",
    topicKey: "food",
    text: "Es-tu pour ou contre les OGM (organismes génétiquement modifiés) ?",
    hint: "Discuss the ethics and safety of genetically modified food.",
    difficulty: 3,
    followUps: [
      "Peuvent-ils aider à résoudre la faim dans le monde ?",
      "Est-ce dangereux pour la biodiversité ?",
      "Voudrais-tu que ce soit clairement indiqué sur les étiquettes ?"
    ],
    modelAnswer: "C'est un sujet complexe. D'un côté, les OGM peuvent résister aux maladies et nourrir plus de gens. D'un autre côté, on ne connaît pas encore tous les effets à long terme sur la santé humaine et l'environnement. Je pense qu'il faut être très prudent et s'assurer que les consommateurs sont bien informés grâce à un étiquetage transparent et obligatoire.",
    keyVocab: [
      { fr: "les OGM", en: "GMOs" },
      { fr: "résister", en: "to resist" },
      { fr: "à long terme", en: "long-term" },
      { fr: "prudent(e)", en: "careful / cautious" },
      { fr: "un étiquetage", en: "labeling" },
      { fr: "obligatoire", en: "mandatory" }
    ],
  },
  {
    id: "foo_51",
    topicKey: "food",
    text: "As-tu déjà entendu parler de la Fête de la Gastronomie en France ?",
    hint: "Discuss food festivals and their role in celebrating culture.",
    difficulty: 2,
    followUps: [
      "Y a-t-il des festivals de nourriture dans ton pays ?",
      "Pourquoi est-ce important de célébrer la cuisine nationale ?",
      "Quel plat choisirais-tu pour représenter ta culture ?"
    ],
    modelAnswer: "Oui, c'est un événement qui célèbre le patrimoine culinaire français. Je pense que c'est une excellente idée car cela permet de partager des traditions et de découvrir des produits locaux. Dans mon pays, nous avons aussi des foires alimentaires qui sont très populaires. Ces festivals renforcent le sentiment d'appartenance et soutiennent les petits producteurs locaux.",
    keyVocab: [
      { fr: "la gastronomie", en: "gastronomy / culinary art" },
      { fr: "le patrimoine", en: "heritage" },
      { fr: "culinaire", en: "culinary" },
      { fr: "une foire", en: "a fair" },
      { fr: "renforcer", en: "to strengthen" },
      { fr: "un producteur", en: "a producer / farmer" }
    ],
  },
  {
    id: "foo_52",
    topicKey: "food",
    text: "Penses-tu que cuisiner peut aider à réduire le stress ?",
    hint: "Discuss cooking as a creative and relaxing hobby.",
    difficulty: 1,
    followUps: [
      "Cuisines-tu quand tu es stressé(e) ?",
      "Quelle étape de la préparation trouves-tu la plus relaxante ?",
      "Est-ce que tu préfères cuisiner seul(e) ou avec de la musique ?"
    ],
    modelAnswer: "Absolument, je trouve que cuisiner est très thérapeutique. Se concentrer sur une recette permet d'oublier les soucis de la journée. J'adore couper les légumes ou pétrir de la pâte car c'est une activité manuelle très satisfaisante. Pour moi, préparer un bon repas pour mes proches est un moyen d'exprimer ma créativité et de me détendre complètement après l'école.",
    keyVocab: [
      { fr: "thérapeutique", en: "therapeutic" },
      { fr: "se concentrer", en: "to concentrate" },
      { fr: "un souci", en: "a worry / concern" },
      { fr: "pétrir", en: "to knead" },
      { fr: "satisfaisant(e)", en: "satisfying" },
      { fr: "se détendre", en: "to relax" }
    ],
  },
  {
    id: "foo_53",
    topicKey: "food",
    text: "Que penses-tu des publicités pour la nourriture s'adressant aux enfants ?",
    hint: "Discuss the ethics of marketing junk food to minors.",
    difficulty: 2,
    followUps: [
      "Les publicités t'influencent-elles ?",
      "Devrait-on interdire les publicités pour les produits trop sucrés ?",
      "Comment peut-on éduquer les enfants à mieux manger ?"
    ],
    modelAnswer: "Je pense que ces publicités sont souvent trompeuses car elles présentent des produits mauvais pour la santé comme s'ils étaient amusants ou nécessaires. Cela encourage les mauvaises habitudes alimentaires dès le plus jeune âge. À mon avis, les gouvernements devraient limiter ce genre de marketing, surtout pendant les émissions pour enfants, et promouvoir plutôt des fruits et des légumes.",
    keyVocab: [
      { fr: "une publicité", en: "an advertisement" },
      { fr: "s'adresser à", en: "to be aimed at" },
      { fr: "trompeur / trompeuse", en: "misleading" },
      { fr: "le marketing", en: "marketing" },
      { fr: "promouvoir", en: "to promote" },
      { fr: "une habitude", en: "a habit" }
    ],
  },
  {
    id: "foo_54",
    topicKey: "food",
    text: "As-tu déjà ramassé des fruits ou des champignons dans la nature ?",
    hint: "Discuss foraging for wild food and the risks/benefits.",
    difficulty: 2,
    followUps: [
      "Sais-tu différencier les champignons comestibles des toxiques ?",
      "Est-ce que la nourriture sauvage a meilleur goût ?",
      "Aimerais-tu apprendre à survivre en mangeant ce que tu trouves ?"
    ],
    modelAnswer: "Quand je vais chez mes grands-parents à la campagne, nous ramassons souvent des mûres sauvages pour faire de la confiture. C'est un vrai plaisir de manger quelque chose que l'on a cueilli soi-même. Cependant, il faut être très prudent avec les champignons car certains sont mortels. Je pense que c'est une compétence importante pour se reconnecter avec la nature et comprendre d'où vient notre nourriture.",
    keyVocab: [
      { fr: "ramasser", en: "to pick up / collect" },
      { fr: "cueillir", en: "to pick (fruits/flowers)" },
      { fr: "sauvage", en: "wild" },
      { fr: "comestible", en: "edible" },
      { fr: "mortel(le)", en: "deadly" },
      { fr: "se reconnecter", en: "to reconnect" }
    ],
  },
  {
    id: "foo_55",
    topicKey: "food",
    text: "Penses-tu qu'une taxe sur le sucre est une bonne idée ?",
    hint: "Discuss government measures to reduce obesity.",
    difficulty: 3,
    followUps: [
      "Est-ce que cela décourage vraiment les gens d'acheter des sodas ?",
      "Est-ce injuste pour les personnes pauvres ?",
      "Que devrait faire le gouvernement avec l'argent récolté ?"
    ],
    modelAnswer: "Je pense que c'est une mesure nécessaire pour lutter contre l'obésité et le diabète. Si les boissons sucrées sont plus chères, les gens en achèteront moins. L'argent récolté devrait être réinvesti dans l'éducation à la santé ou pour baisser le prix des fruits et légumes bio. Même si c'est impopulaire, c'est une question de santé publique majeure qui nécessite des actions concrètes.",
    keyVocab: [
      { fr: "une taxe", en: "a tax" },
      { fr: "lutter contre", en: "to fight against" },
      { fr: "récolter", en: "to collect / gather" },
      { fr: "santé publique", en: "public health" },
      { fr: "concret / concrète", en: "concrete" },
      { fr: "le diabète", en: "diabetes" }
    ],
  },
  {
    id: "foo_56",
    topicKey: "food",
    text: "Tu préfères apporter ton 'lunch box' ou manger à la cantine ?",
    hint: "Compare packed lunches from home with school-provided meals.",
    difficulty: 1,
    followUps: [
      "Qu'est-ce qu'on met dans ton lunch box d'habitude ?",
      "Est-ce que c'est plus économique de l'apporter de la maison ?",
      "Tes amis font-ils la même chose ?"
    ],
    modelAnswer: "Je préfère apporter mon lunch box car je peux choisir exactement ce que je veux manger. Ma mère me prépare souvent un wrap au poulet, un yaourt et une pomme. C'est plus sain que la nourriture de la cantine qui est parfois trop grasse. De plus, cela permet d'économiser de l'argent. Mes amis trouvent que mon déjeuner a toujours l'air meilleur que le leur !",
    keyVocab: [
      { fr: "apporter", en: "to bring" },
      { fr: "sain(e)", en: "healthy" },
      { fr: "économiser", en: "to save (money)" },
      { fr: "d'habitude", en: "usually" },
      { fr: "le déjeuner", en: "lunch" },
      { fr: "avoir l'air", en: "to look / seem" }
    ],
  },
  {
    id: "foo_57",
    topicKey: "food",
    text: "As-tu déjà entendu parler des 'super-aliments' comme le quinoa ou le chou kale ?",
    hint: "Discuss nutrient-dense foods and their popularity.",
    difficulty: 2,
    followUps: [
      "En manges-tu souvent ?",
      "Penses-tu que c'est juste une mode passagère ?",
      "Quels sont les bienfaits pour la santé ?"
    ],
    modelAnswer: "Oui, j'en mange de temps en temps car ils sont riches en vitamines et en antioxydants. Je pense que c'est plus qu'une mode, c'est une prise de conscience sur l'importance de bien nourrir son corps. Cependant, je crois qu'il ne faut pas oublier les aliments simples et locaux qui sont tout aussi bons pour la santé. L'équilibre est la clé d'une bonne alimentation.",
    keyVocab: [
      { fr: "un super-aliment", en: "a superfood" },
      { fr: "une mode passagère", en: "a passing fad" },
      { fr: "les bienfaits", en: "benefits" },
      { fr: "une prise de conscience", en: "an awareness / realization" },
      { fr: "nutritif / nutritive", en: "nutritious" },
      { fr: "la clé", en: "the key" }
    ],
  },
  {
    id: "foo_58",
    topicKey: "food",
    text: "Que penses-tu des aliments fermentés comme le yaourt ou le kimchi ?",
    hint: "Discuss foods with probiotics and their impact on digestion.",
    difficulty: 2,
    followUps: [
      "Aimes-tu le goût acide de ces aliments ?",
      "Est-ce que tu savais qu'ils sont bons pour l'intestin ?",
      "Y a-t-il des aliments fermentés traditionnels dans ton pays ?"
    ],
    modelAnswer: "J'adore le yaourt, mais je trouve le kimchi un peu trop fort pour moi. Je sais que les aliments fermentés sont excellents pour le microbiote et la digestion car ils contiennent des probiotiques naturels. C'est fascinant de voir comment des méthodes de conservation anciennes deviennent si populaires aujourd'hui pour leurs vertus santé. J'essaie d'en manger un peu chaque jour pour mon bien-être.",
    keyVocab: [
      { fr: "fermenté(e)", en: "fermented" },
      { fr: "la digestion", en: "digestion" },
      { fr: "l'intestin", en: "the gut / intestine" },
      { fr: "la conservation", en: "preservation" },
      { fr: "une vertu", en: "a virtue / benefit" },
      { fr: "le bien-être", en: "well-being" }
    ],
  },
  {
    id: "foo_59",
    topicKey: "food",
    text: "Pourquoi les cafés (coffee shops) sont-ils si populaires pour travailler ou étudier ?",
    hint: "Discuss the 'third space' concept and working in public.",
    difficulty: 2,
    followUps: [
      "Préfères-tu réviser dans une bibliothèque ou dans un café ?",
      "Qu'est-ce que tu commandes d'habitude ?",
      "Est-ce que le bruit te dérange ?"
    ],
    modelAnswer: "Je pense que les gens aiment l'ambiance décontractée et l'odeur du café. Cela permet de sortir de chez soi et de se sentir moins seul tout en étant productif. Personnellement, je trouve qu'un peu de bruit de fond m'aide à me concentrer mieux qu'un silence absolu. De plus, avoir une bonne boisson chaude et une pâtisserie à côté de soi est très motivant pour finir ses devoirs !",
    keyVocab: [
      { fr: "décontracté(e)", en: "relaxed / casual" },
      { fr: "le bruit de fond", en: "background noise" },
      { fr: "se concentrer", en: "to concentrate" },
      { fr: "productif / productive", en: "productive" },
      { fr: "la motivation", en: "motivation" },
      { fr: "absolu(e)", en: "absolute" }
    ],
  },
  {
    id: "foo_60",
    topicKey: "food",
    text: "Voyagerais-tu dans un pays uniquement pour sa nourriture ?",
    hint: "Discuss food tourism and the importance of gastronomy in travel.",
    difficulty: 2,
    followUps: [
      "Quel pays choisirais-tu pour un voyage gastronomique ?",
      "As-tu déjà fait un cours de cuisine à l'étranger ?",
      "Est-ce que la nourriture est le meilleur moyen de découvrir une culture ?"
    ],
    modelAnswer: "Oui, absolument ! J'adorerais aller en Italie ou en Thaïlande juste pour goûter les spécialités locales authentiques. Je pense que la nourriture raconte l'histoire et les traditions d'un peuple. Pour moi, découvrir de nouvelles saveurs est une partie essentielle du voyage. C'est un moyen de se connecter avec les locaux d'une manière très conviviale et chaleureuse.",
    keyVocab: [
      { fr: "gastronomique", en: "gastronomic" },
      { fr: "authentique", en: "authentic" },
      { fr: "raconter", en: "to tell / relate" },
      { fr: "une saveur", en: "a flavor" },
      { fr: "essentiel(le)", en: "essential" },
      { fr: "chaleureux / chaleureuse", en: "warm" }
    ],
  },
  {
    id: "foo_61",
    topicKey: "food",
    text: "Qu'est-ce que tu penses des restaurants à volonté (les buffets) ?",
    hint: "Discuss the pros and cons of all-you-can-eat restaurants.",
    difficulty: 2,
    followUps: [
      "Est-ce que tu manges trop quand tu y vas ?",
      "Est-ce que la qualité est aussi bonne que dans un restaurant normal ?",
      "Pourquoi sont-ils populaires pour les familles ?"
    ],
    modelAnswer: "Je trouve que c'est une bonne option pour les familles car il y en a pour tous les goûts et c'est économique. Cependant, la qualité est parfois moins bonne car la nourriture reste longtemps sur le buffet. De plus, cela encourage souvent le gaspillage et la surconsommation, ce qui n'est pas très sain. Personnellement, je préfère un restaurant avec un menu plus court mais des ingrédients plus frais.",
    keyVocab: [
      { fr: "à volonté", en: "all-you-can-eat" },
      { fr: "économique", en: "economical" },
      { fr: "la surconsommation", en: "overconsumption" },
      { fr: "le gaspillage", en: "waste" },
      { fr: "frais / fraîche", en: "fresh" },
      { fr: "choisir", en: "to choose" }
    ],
  },
  {
    id: "foo_62",
    topicKey: "food",
    text: "Connais-tu le rôle des banques alimentaires dans ta communauté ?",
    hint: "Discuss food charity and helping people in need.",
    difficulty: 2,
    followUps: [
      "As-tu déjà donné de la nourriture à une association ?",
      "Pourquoi y a-t-il plus de gens qui en ont besoin aujourd'hui ?",
      "Comment peut-on aider davantage ?"
    ],
    modelAnswer: "Les banques alimentaires jouent un rôle vital pour aider les familles qui ont des difficultés financières à se nourrir correctement. Elles collectent les dons des particuliers et des supermarchés. Je pense que c'est une magnifique preuve de solidarité. Ma famille donne souvent des boîtes de conserve et du riz lors des collectes à l'école. Il est important de soutenir ces organisations pour que personne ne souffre de la faim.",
    keyVocab: [
      { fr: "une banque alimentaire", en: "a food bank" },
      { fr: "vital / vitale", en: "vital" },
      { fr: "un don", en: "a donation" },
      { fr: "la solidarité", en: "solidarity" },
      { fr: "soutenir", en: "to support" },
      { fr: "souffrir de la faim", en: "to suffer from hunger" }
    ],
  },
  {
    id: "foo_63",
    topicKey: "food",
    text: "Aimes-tu regarder des concours de cuisine à la télé ?",
    hint: "Discuss shows like MasterChef or Great British Bake Off.",
    difficulty: 1,
    followUps: [
      "Qui est ton chef préféré ?",
      "Voudrais-tu participer à une telle compétition ?",
      "Est-ce que cela te rend affamé(e) de regarder ces émissions ?"
    ],
    modelAnswer: "J'adore regarder ces émissions car elles sont pleines de suspense et de créativité. C'est impressionnant de voir ce que les gens peuvent cuisiner sous pression. Cela me donne souvent de nouvelles idées pour mes propres repas, même si je ne suis pas aussi doué qu'eux ! Par contre, je finis toujours par avoir très faim après avoir vu tous ces magnifiques desserts !",
    keyVocab: [
      { fr: "un concours", en: "a competition" },
      { fr: "le suspense", en: "suspense" },
      { fr: "sous pression", en: "under pressure" },
      { fr: "doué(e)", en: "gifted / talented" },
      { fr: "impressionnant(e)", en: "impressive" },
      { fr: "affamé(e)", en: "starving" }
    ],
  },
  {
    id: "foo_64",
    topicKey: "food",
    text: "Serais-tu prêt(e) à manger des insectes si c'était meilleur pour la planète ?",
    hint: "Discuss entomophagy as a sustainable protein source.",
    difficulty: 3,
    followUps: [
      "Penses-tu que c'est le futur de l'alimentation ?",
      "Quelle est ta réaction face à cette idée ?",
      "Les insectes pourraient-ils remplacer la viande de bœuf ?"
    ],
    modelAnswer: "C'est une idée qui me dégoûte un peu au début, mais je sais que c'est une source de protéines très écologique car l'élevage d'insectes consomme très peu d'eau et d'espace. Si les insectes étaient transformés en farine pour faire des gâteaux ou des barres énergétiques, je serais prêt à essayer. Je pense que nous devrons changer nos mentalités pour sauver l'environnement, même si c'est difficile.",
    keyVocab: [
      { fr: "un insecte", en: "an insect" },
      { fr: "dégoûter", en: "to disgust" },
      { fr: "la farine", en: "flour" },
      { fr: "la mentalité", en: "mindset" },
      { fr: "sauver", en: "to save" },
      { fr: "consommer", en: "to consume" }
    ],
  },
  {
    id: "foo_65",
    topicKey: "food",
    text: "Pourquoi la baguette est-elle si emblématique de la France ?",
    hint: "Discuss the cultural history and importance of French bread.",
    difficulty: 2,
    followUps: [
      "En manges-tu souvent ?",
      "Préfères-tu le pain blanc ou le pain complet ?",
      "Sais-tu ce qu'est une boulangerie artisanale ?"
    ],
    modelAnswer: "La baguette est plus qu'un simple pain, c'est un symbole national qui représente l'art de vivre à la française. Elle est inscrite au patrimoine mondial de l'UNESCO. J'aime l'idée que les gens achètent leur pain frais chaque matin. Personnellement, j'adore l'odeur du pain chaud qui sort du four. C'est un aliment simple, pas cher et délicieux qui réunit tout le monde autour de la table.",
    keyVocab: [
      { fr: "emblématique", en: "emblematic" },
      { fr: "un symbole", en: "a symbol" },
      { fr: "l'art de vivre", en: "way of life" },
      { fr: "frais / fraîche", en: "fresh" },
      { fr: "une boulangerie", en: "a bakery" },
      { fr: "sortir du four", en: "to come out of the oven" }
    ],
  },
  {
    id: "foo_66",
    topicKey: "food",
    text: "Est-ce que tu regardes le 'Nutri-Score' sur les emballages avant d'acheter ?",
    hint: "Discuss nutritional labeling and making healthy choices.",
    difficulty: 2,
    followUps: [
      "Est-ce que cela influence ton choix ?",
      "Penses-tu que c'est un système fiable ?",
      "Les produits avec un 'E' devraient-ils être interdits ?"
    ],
    modelAnswer: "Oui, je regarde souvent le score pour savoir si le produit est trop gras ou trop sucré. C'est très pratique pour comparer rapidement deux marques différentes. Je pense que c'est un système fiable qui aide les consommateurs à être plus conscients de leur santé. Cependant, il ne faut pas oublier de regarder aussi la liste des ingrédients pour éviter les additifs chimiques.",
    keyVocab: [
      { fr: "un emballage", en: "packaging" },
      { fr: "fiable", en: "reliable" },
      { fr: "conscient(e)", en: "aware" },
      { fr: "un additif", en: "an additive" },
      { fr: "interdire", en: "to forbid / ban" },
      { fr: "comparer", en: "to compare" }
    ],
  },
  {
    id: "foo_67",
    topicKey: "food",
    text: "Que penses-tu des fermes verticales en plein centre-ville ?",
    hint: "Discuss urban agriculture and local production.",
    difficulty: 3,
    followUps: [
      "Est-ce une solution contre la pollution des transports ?",
      "Est-ce que les légumes ont le même goût sans terre ?",
      "Aimerais-tu avoir une mini-ferme dans ton appartement ?"
    ],
    modelAnswer: "Je trouve que c'est une solution brillante pour produire de la nourriture locale sans utiliser de pesticides et en réduisant les trajets en camion. Cela permet de transformer des bâtiments abandonnés en espaces verts productifs. Bien que ce soit très technologique, je pense que c'est l'avenir de nos villes pour devenir plus autonomes et durables face au changement climatique.",
    keyVocab: [
      { fr: "vertical(e)", en: "vertical" },
      { fr: "un bâtiment", en: "a building" },
      { fr: "autonome", en: "self-sufficient" },
      { fr: "durable", en: "sustainable" },
      { fr: "abandonné(e)", en: "abandoned" },
      { fr: "un trajet", en: "a journey / trip" }
    ],
  },
  {
    id: "foo_68",
    topicKey: "food",
    text: "Préfères-tu les collations faites maison ou celles achetées au magasin ?",
    hint: "Compare home-made snacks like cookies with store-bought ones.",
    difficulty: 1,
    followUps: [
      "Quelle est ta collation préférée ?",
      "Est-ce que les snacks du magasin sont trop sucrés ?",
      "Sais-tu préparer des barres de céréales ?"
    ],
    modelAnswer: "Je préfère nettement les collations faites maison car on peut contrôler la quantité de sucre et on n'utilise pas de conservateurs. Par exemple, j'adore préparer des muffins à la banane le dimanche pour toute la semaine. Les snacks du magasin sont pratiques mais ils sont souvent trop transformés. C'est aussi une activité sympa à faire en famille pendant le week-end.",
    keyVocab: [
      { fr: "une collation", en: "a snack" },
      { fr: "un conservateur", en: "a preservative" },
      { fr: "transformé(e)", en: "processed" },
      { fr: "contrôler", en: "to control" },
      { fr: "la quantité", en: "quantity" },
      { fr: "sympa", en: "nice / cool" }
    ],
  },
  {
    id: "foo_69",
    topicKey: "food",
    text: "Que penses-tu de l'augmentation des laits végétaux (avoine, amande, soja) ?",
    hint: "Discuss alternatives to dairy and why people choose them.",
    difficulty: 2,
    followUps: [
      "En bois-tu à la place du lait de vache ?",
      "Est-ce meilleur pour l'environnement ?",
      "Lequel a le meilleur goût selon toi ?"
    ],
    modelAnswer: "Je pense que c'est une excellente alternative, surtout pour les personnes qui sont intolérantes au lactose ou qui veulent réduire leur impact écologique. Le lait d'avoine est mon préféré car il est très crémeux. Produire du lait végétal consomme beaucoup moins d'eau et rejette moins de gaz à effet de serre que l'élevage de vaches. C'est un petit changement d'habitude qui peut aider la planète.",
    keyVocab: [
      { fr: "végétal / végétaux", en: "plant-based" },
      { fr: "l'avoine", en: "oats" },
      { fr: "l'amande", en: "almonds" },
      { fr: "crémeux / crémeuse", en: "creamy" },
      { fr: "l'élevage", en: "farming / livestock" },
      { fr: "une vache", en: "a cow" }
    ],
  },
  {
    id: "foo_70",
    topicKey: "food",
    text: "Pourquoi est-il important de choisir du poisson issu de la pêche durable ?",
    hint: "Discuss overfishing and ocean conservation.",
    difficulty: 3,
    followUps: [
      "Est-ce que tu manges souvent du poisson ?",
      "Connais-tu les labels qui garantissent une pêche responsable ?",
      "Que se passerait-il si les océans étaient vides ?"
    ],
    modelAnswer: "La surpêche est un problème mondial majeur car elle détruit les écosystèmes marins. Il est crucial de choisir des poissons qui ne sont pas en danger d'extinction pour permettre aux populations de se renouveler. On devrait tous faire attention aux labels comme le MSC sur les emballages. Protéger les océans est indispensable pour l'équilibre de notre planète et pour notre propre survie alimentaire.",
    keyVocab: [
      { fr: "la pêche durable", en: "sustainable fishing" },
      { fr: "la surpêche", en: "overfishing" },
      { fr: "l'extinction", en: "extinction" },
      { fr: "se renouveler", en: "to renew itself" },
      { fr: "indispensable", en: "essential" },
      { fr: "la survie", en: "survival" }
    ],
  },
  {
    id: "foo_71",
    topicKey: "food",
    text: "As-tu déjà entendu parler du mouvement 'Slow Food' ?",
    hint: "Discuss the philosophy of eating slowly and valuing local traditions.",
    difficulty: 2,
    followUps: [
      "Prends-tu le temps de savourer tes repas ?",
      "Est-ce que l'on mange trop vite aujourd'hui ?",
      "Pourquoi est-il important de connaître l'origine de ses aliments ?"
    ],
    modelAnswer: "Oui, c'est un mouvement qui encourage les gens à prendre le temps de cuisiner et de manger avec plaisir, à l'opposé du fast-food. Je pense que c'est une philosophie très saine car elle valorise la qualité et les traditions locales. Aujourd'hui, on mange souvent devant un écran ou en marchant, ce qui est mauvais pour la santé. Apprendre à savourer chaque bouchée nous permet de mieux apprécier la nourriture.",
    keyVocab: [
      { fr: "savourer", en: "to savor / enjoy" },
      { fr: "valoriser", en: "to value / promote" },
      { fr: "l'origine", en: "origin" },
      { fr: "une bouchée", en: "a mouthful / bite" },
      { fr: "à l'opposé de", en: "opposite to" },
      { fr: "apprécier", en: "to appreciate" }
    ],
  },
  {
    id: "foo_72",
    topicKey: "food",
    text: "Comment le changement climatique affecte-t-il la production de chocolat et de café ?",
    hint: "Discuss how rising temperatures threaten certain crops.",
    difficulty: 3,
    followUps: [
      "Seras-tu triste si ces produits deviennent trop chers ?",
      "Peut-on cultiver ces plantes ailleurs ?",
      "Que peuvent faire les agriculteurs pour s'adapter ?"
    ],
    modelAnswer: "Le réchauffement climatique rend les zones de culture habituelles trop chaudes ou trop sèches, ce qui réduit les récoltes. C'est inquiétant car le chocolat et le café sont appréciés partout dans le monde. Les prix vont sans doute augmenter massivement à l'avenir. Les agriculteurs doivent essayer de nouvelles techniques ou planter des variétés plus résistantes, mais c'est un défi immense pour leur survie économique.",
    keyVocab: [
      { fr: "une récolte", en: "a harvest" },
      { fr: "sans doute", en: "no doubt / probably" },
      { fr: "massivement", en: "massively" },
      { fr: "une variété", en: "a variety" },
      { fr: "résistant(e)", en: "resistant" },
      { fr: "sèche", en: "dry" }
    ],
  },
  {
    id: "foo_73",
    topicKey: "food",
    text: "Est-ce qu'une odeur ou un goût particulier te rappelle un souvenir d'enfance ?",
    hint: "Discuss the link between food and memory (like Proust's Madeleine).",
    difficulty: 2,
    followUps: [
      "Quel est ce souvenir ?",
      "Pourquoi la nourriture est-elle si liée à nos émotions ?",
      "Y a-t-il un plat que tu associes à tes vacances ?"
    ],
    modelAnswer: "L'odeur du pain grillé me rappelle toujours les dimanches matin chez ma grand-mère quand j'étais petit. C'est un souvenir très réconfortant qui me rend nostalgique. Je pense que la nourriture est liée à nos émotions car elle est souvent associée à des moments de partage et d'amour avec nos proches. Chaque famille a ses propres 'madeleines de Proust' qui font partie de son histoire.",
    keyVocab: [
      { fr: "une odeur", en: "a smell" },
      { fr: "un souvenir", en: "a memory" },
      { fr: "réconfortant(e)", en: "comforting" },
      { fr: "nostalgique", en: "nostalgic" },
      { fr: "lié à", en: "linked to" },
      { fr: "proche", en: "relative / close one" }
    ],
  },
  {
    id: "foo_74",
    topicKey: "food",
    text: "Connais-tu le 'paradoxe français' concernant l'alimentation et la santé ?",
    hint: "Discuss how the French stay healthy despite a rich diet.",
    difficulty: 3,
    followUps: [
      "Penses-tu que c'est grâce au vin rouge ou aux petites portions ?",
      "Est-ce que les Français marchent plus que nous ?",
      "Quel est le secret d'une vie longue et saine selon toi ?"
    ],
    modelAnswer: "On dit que les Français mangent des choses riches comme du fromage ou du beurre, mais qu'ils ont moins de problèmes cardiaques. Je pense que c'est parce qu'ils mangent des portions plus petites et qu'ils prennent le temps de savourer leurs repas sans grignoter entre-temps. C'est une question d'équilibre et de modération. Pour moi, le secret est de manger de tout, mais en quantités raisonnables, et de rester actif.",
    keyVocab: [
      { fr: "un paradoxe", en: "a paradox" },
      { fr: "cardiaque", en: "cardiac / heart-related" },
      { fr: "grignoter", en: "to snack / nibble" },
      { fr: "entre-temps", en: "in the meantime" },
      { fr: "la modération", en: "moderation" },
      { fr: "raisonnable", en: "reasonable" }
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
//  EXAM SIMULATION SETS — curated sets for timed practice
// ─────────────────────────────────────────────────────────────────────────────

export const EXAM_SETS: ExamSet[] = [
  {
    id: "exam_set_1",
    label: "Exam Set A — General",
    questions: ["sch_01", "hob_01", "fam_01", "hol_01", "fut_01"],
  },
  {
    id: "exam_set_2",
    label: "Exam Set B — Personal & Social",
    questions: ["fam_03", "hob_02", "hom_01", "foo_01", "env_01"],
  },
  {
    id: "exam_set_3",
    label: "Exam Set C — Extended Tier",
    questions: ["sch_04", "hol_03", "fut_02", "env_02", "hob_04"],
  },
  {
    id: "exam_set_4",
    label: "Exam Set D — Foundation",
    questions: ["sch_01", "fam_01", "hob_01", "foo_01", "hom_01"],
  },
  {
    id: "exam_set_5",
    label: "Exam Set E — Home & Town",
    questions: ["hom_01", "hom_02", "hom_03", "env_01", "foo_02"],
  },
  {
    id: "exam_set_6",
    label: "Exam Set F — Future & Ambitions",
    questions: ["fut_01", "fut_02", "fut_03", "sch_05", "hob_03"],
  },
  {
    id: "exam_set_7",
    label: "Exam Set G — Health & Environment",
    questions: ["foo_03", "foo_02", "env_01", "env_02", "hol_02"],
  },
  {
    id: "exam_set_8",
    label: "Exam Set H — IGCSE Preparation",
    questions: ["sch_04", "hol_03", "hob_04", "env_02", "fut_02"],
  },
];

// ─────────────────────────────────────────────────────────────────────────────

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getTopicQuestions(topicKey: string): Question[] {
  return QUESTIONS.filter(q => q.topicKey === topicKey);
}

export function getQuestionById(id: string): Question | undefined {
  return QUESTIONS.find(q => q.id === id);
}

export function getRandomQuestion(topicKey: string | null = null, excludeIds: string[] = [], maxDifficulty: 1 | 2 | 3 = 3): Question {
  let pool = topicKey ? getTopicQuestions(topicKey) : QUESTIONS;
  const diffPool = pool.filter(q => (q.difficulty ?? 1) <= maxDifficulty);
  if (diffPool.length > 0) pool = diffPool;
  const available = pool.filter(q => !excludeIds.includes(q.id));
  const src = available.length > 0 ? available : pool;
  return src[Math.floor(Math.random() * src.length)];
}

export function getTopicCounts(): Record<string, number> {
  return QUESTIONS.reduce((acc, q) => {
    acc[q.topicKey] = (acc[q.topicKey] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

// Patch questionsCount into TOPICS after QUESTIONS is defined
(function patchTopicCounts() {
  const counts = getTopicCounts();
  TOPICS.forEach(t => { t.questionsCount = counts[t.key] ?? 0; });
})();