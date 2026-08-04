import { RebuildQuestion } from '../types';

export const REBUILD_QUESTIONS: RebuildQuestion[] = [
  {
    id: 'sr1',
    english: "I like the red house.",
    french: "J'aime la maison rouge.",
    fragments: ["J'aime", "la", "maison", "rouge"],
    explanation: "In French, most adjectives (like 'rouge') come AFTER the noun ('maison').",
    theme: "Adjective Placement",
    difficulty: 1
  },
  {
    id: 'sr2',
    english: "I don't eat meat.",
    french: "Je ne mange pas de viande.",
    fragments: ["Je", "ne", "mange", "pas", "de", "viande"],
    explanation: "Negation in French uses the 'ne...pas' sandwich around the verb.",
    theme: "Negation",
    difficulty: 1
  },
  {
    id: 'sr3',
    english: "He gives it to me.",
    french: "Il me le donne.",
    fragments: ["Il", "me", "le", "donne"],
    explanation: "Object pronouns (me, le) come BEFORE the verb in French.",
    theme: "Pronoun Placement",
    difficulty: 2
  },
  {
    id: 'sr21',
    english: "I see her every day.",
    french: "Je la vois tous les jours.",
    fragments: ["Je", "la", "vois", "tous", "les", "jours"],
    explanation: "The object pronoun 'la' (her/it) comes BEFORE the verb 'vois', not after.",
    theme: "Pronoun Placement",
    difficulty: 2
  },
  {
    id: 'sr22',
    english: "We are talking to them.",
    french: "Nous leur parlons.",
    fragments: ["Nous", "leur", "parlons"],
    explanation: "'Leur' (to them) is an indirect object pronoun and goes BEFORE the verb, not after 'à eux'.",
    theme: "Pronoun Placement",
    difficulty: 2
  },
  {
    id: 'sr4',
    english: "I am going to the hospital.",
    french: "Je vais à l'hôpital.",
    fragments: ["Je", "vais", "à", "l'hôpital"],
    explanation: "When 'à' meets 'le' before a vowel, it becomes 'à l''.",
    theme: "Elision",
    difficulty: 1
  },
  {
    id: 'sr5',
    english: "We have many friends.",
    french: "Nous avons beaucoup d'amis.",
    fragments: ["Nous", "avons", "beaucoup", "d'amis"],
    explanation: "'Beaucoup' always takes 'de' (or d' before a vowel), never 'des'.",
    theme: "Prepositions",
    difficulty: 2
  },
  {
    id: 'sr6',
    english: "I am happy that you are here.",
    french: "Je suis content que tu sois là.",
    fragments: ["Je", "suis", "content", "que", "tu", "sois", "là"],
    explanation: "Expressions of emotion (like 'content que') trigger the Subjunctive mood ('sois').",
    theme: "Subjunctive",
    difficulty: 3
  },
  {
    id: 'sr7',
    english: "The book that I bought is good.",
    french: "Le livre que j'ai acheté est bon.",
    fragments: ["Le", "livre", "que", "j'ai", "acheté", "est", "bon"],
    explanation: "'Que' is used as a relative pronoun when it's the object of the following verb.",
    theme: "Relative Pronouns",
    difficulty: 2
  },
  {
    id: 'sr8',
    english: "I used to play in the park.",
    french: "Je jouais dans le parc.",
    fragments: ["Je", "jouais", "dans", "le", "parc"],
    explanation: "The Imparfait ('jouais') is used for habitual actions in the past.",
    theme: "Imperfect Tense",
    difficulty: 2
  },
  {
    id: 'sr9',
    english: "If it rains, we will stay at home.",
    french: "S'il pleut, nous resterons à la maison.",
    fragments: ["S'il", "pleut,", "nous", "resterons", "à", "la", "maison"],
    explanation: "The 'Si' clause uses the Present tense, and the main clause uses the Future tense.",
    theme: "Conditionals",
    difficulty: 3
  },
  {
    id: 'sr10',
    english: "I am looking for my keys.",
    french: "Je cherche mes clés.",
    fragments: ["Je", "cherche", "mes", "clés"],
    explanation: "The verb 'chercher' means 'to look FOR', so no extra preposition is needed.",
    theme: "Verb Patterns",
    difficulty: 1
  },
  {
    id: 'sr11',
    english: "I washed my hands.",
    french: "Je me suis lavé les mains.",
    fragments: ["Je", "me", "suis", "lavé", "les", "mains"],
    explanation: "Reflexive verbs use 'être' in the Passé Composé. 'Me suis lavé' means 'I washed myself'.",
    theme: "Reflexive Verbs",
    difficulty: 2
  },
  {
    id: 'sr12',
    english: "If I was rich, I would buy a boat.",
    french: "Si j'étais riche, j'achèterais un bateau.",
    fragments: ["Si", "j'étais", "riche,", "j'achèterais", "un", "bateau"],
    explanation: "The 'Si' clause uses the Imparfait, and the main clause uses the Conditionnel.",
    theme: "Conditionals",
    difficulty: 3
  },
  {
    id: 'sr13',
    english: "I have to go there.",
    french: "Je dois y aller.",
    fragments: ["Je", "dois", "y", "aller"],
    explanation: "The pronoun 'y' replaces a place and usually comes before the infinitive.",
    theme: "Pronoun 'Y'",
    difficulty: 2
  },
  {
    id: 'sr14',
    english: "What are you doing tonight?",
    french: "Qu'est-ce que tu fais ce soir ?",
    fragments: ["Qu'est-ce", "que", "tu", "fais", "ce", "soir", "?"],
    explanation: "'Qu'est-ce que' is a very common way to start a question meaning 'What...'.",
    theme: "Questions",
    difficulty: 1
  },
  {
    id: 'sr15',
    english: "I think that he is right.",
    french: "Je pense qu'il a raison.",
    fragments: ["Je", "pense", "qu'il", "a", "raison"],
    explanation: "In French, you don't say 'is right', you say 'has reason' (avoir raison).",
    theme: "Idiomatic Expressions",
    difficulty: 2
  },
  {
    id: 'sr16',
    english: "Don't speak to me like that.",
    french: "Ne me parle pas comme ça.",
    fragments: ["Ne", "me", "parle", "pas", "comme", "ça"],
    explanation: "In negative imperatives, the object pronoun 'me' comes before the verb.",
    theme: "Imperatives",
    difficulty: 2
  },
  {
    id: 'sr17',
    english: "The car which I saw is black.",
    french: "La voiture que j'ai vue est noire.",
    fragments: ["La", "voiture", "que", "j'ai", "vue", "est", "noire"],
    explanation: "When 'que' is a direct object before 'avoir', the past participle agrees with the noun.",
    theme: "Past Participle Agreement",
    difficulty: 3
  },
  {
    id: 'sr18',
    english: "I'm going to do my homework.",
    french: "Je vais faire mes devoirs.",
    fragments: ["Je", "vais", "faire", "mes", "devoirs"],
    explanation: "The Futur Proche uses 'aller' + infinitive.",
    theme: "Future Tenses",
    difficulty: 1
  },
  {
    id: 'sr19',
    english: "She is taller than him.",
    french: "Elle est plus grande que lui.",
    fragments: ["Elle", "est", "plus", "grande", "que", "lui"],
    explanation: "Comparatives use 'plus + adjective + que'.",
    theme: "Comparatives",
    difficulty: 1
  },
  {
    id: 'sr20',
    english: "I will call you as soon as I arrive.",
    french: "Je t'appellerai dès que j'arriverai.",
    fragments: ["Je", "t'appellerai", "dès", "que", "j'arriverai"],
    explanation: "After 'dès que', French uses the future tense if the main verb is in the future.",
    theme: "Future Tenses",
    difficulty: 3
  },
  {
    id: 'sr23',
    english: "I need a pen.",
    french: "J'ai besoin d'un stylo.",
    fragments: ["J'ai", "besoin", "d'un", "stylo"],
    explanation: "'De' contracts to d' before a vowel — 'de un' is never correct.",
    theme: "Elision",
    difficulty: 1
  },
  {
    id: 'sr24',
    english: "This hotel is magnificent.",
    french: "Cet hôtel est magnifique.",
    fragments: ["Cet", "hôtel", "est", "magnifique"],
    explanation: "Masculine 'ce' becomes 'cet' before a vowel or mute h, for phonetic ease.",
    theme: "Elision",
    difficulty: 1
  },
  {
    id: 'sr25',
    english: "I don't have any money.",
    french: "Je n'ai pas d'argent.",
    fragments: ["Je", "n'ai", "pas", "d'argent"],
    explanation: "Formal negation keeps both 'ne' and 'pas' around the verb, even in speech.",
    theme: "Negation",
    difficulty: 1
  },
  {
    id: 'sr26',
    english: "He never goes to school on Saturday.",
    french: "Il ne va jamais à l'école le samedi.",
    fragments: ["Il", "ne", "va", "jamais", "à", "l'école", "le", "samedi"],
    explanation: "'Ne...jamais' ('never') follows the same sandwich pattern as 'ne...pas'.",
    theme: "Negation",
    difficulty: 2
  },
  {
    id: 'sr27',
    english: "It's important that you come tomorrow.",
    french: "Il est important que tu viennes demain.",
    fragments: ["Il", "est", "important", "que", "tu", "viennes", "demain"],
    explanation: "'Il est important que' expresses necessity and triggers the subjunctive ('viennes').",
    theme: "Subjunctive",
    difficulty: 3
  },
  {
    id: 'sr28',
    english: "I doubt that he knows the answer.",
    french: "Je doute qu'il sache la réponse.",
    fragments: ["Je", "doute", "qu'il", "sache", "la", "réponse"],
    explanation: "'Douter que' expresses doubt and requires the subjunctive ('sache', from savoir).",
    theme: "Subjunctive",
    difficulty: 3
  },
  {
    id: 'sr29',
    english: "The teacher who explains well is popular.",
    french: "Le professeur qui explique bien est populaire.",
    fragments: ["Le", "professeur", "qui", "explique", "bien", "est", "populaire"],
    explanation: "'Qui' is the subject of 'explique' here, so it stays as 'qui', not 'que'.",
    theme: "Relative Pronouns",
    difficulty: 2
  },
  {
    id: 'sr30',
    english: "The town where I was born is small.",
    french: "La ville où je suis né est petite.",
    fragments: ["La", "ville", "où", "je", "suis", "né", "est", "petite"],
    explanation: "'Où' is used as a relative pronoun for places, even when 'where' isn't literal in English.",
    theme: "Relative Pronouns",
    difficulty: 2
  },
  {
    id: 'sr31',
    english: "My sister is tall.",
    french: "Ma sœur est grande.",
    fragments: ["Ma", "sœur", "est", "grande"],
    explanation: "Feminine adjectives usually add -e: 'grand' becomes 'grande' to agree with 'sœur'.",
    theme: "Adjective Placement",
    difficulty: 1
  },
  {
    id: 'sr32',
    english: "It's a new car.",
    french: "C'est une nouvelle voiture.",
    fragments: ["C'est", "une", "nouvelle", "voiture"],
    explanation: "'Nouveau' is irregular in the feminine: 'nouvelle', and placed before the noun.",
    theme: "Adjective Placement",
    difficulty: 2
  },
  {
    id: 'sr33',
    english: "This dress is beautiful.",
    french: "Cette robe est belle.",
    fragments: ["Cette", "robe", "est", "belle"],
    explanation: "'Cette' is the feminine singular demonstrative, used before a feminine noun like 'robe'.",
    theme: "Demonstratives",
    difficulty: 1
  },
  {
    id: 'sr34',
    english: "These books are interesting.",
    french: "Ces livres sont intéressants.",
    fragments: ["Ces", "livres", "sont", "intéressants"],
    explanation: "'Ces' is the plural demonstrative, used for both masculine and feminine plural nouns.",
    theme: "Demonstratives",
    difficulty: 1
  },
  {
    id: 'sr35',
    english: "I prefer this one (m).",
    french: "Je préfère celui-ci.",
    fragments: ["Je", "préfère", "celui-ci"],
    explanation: "'Celui-ci' ('this one') replaces a masculine noun already mentioned.",
    theme: "Demonstratives",
    difficulty: 2
  },
  {
    id: 'sr36',
    english: "This film is better than the last one.",
    french: "Ce film est meilleur que le dernier.",
    fragments: ["Ce", "film", "est", "meilleur", "que", "le", "dernier"],
    explanation: "'Bon' has an irregular comparative: 'meilleur', never 'plus bon'.",
    theme: "Comparatives",
    difficulty: 2
  },
  {
    id: 'sr37',
    english: "He speaks better than his brother.",
    french: "Il parle mieux que son frère.",
    fragments: ["Il", "parle", "mieux", "que", "son", "frère"],
    explanation: "'Bien' has an irregular comparative adverb: 'mieux', never 'plus bien'.",
    theme: "Comparatives",
    difficulty: 2
  },
  {
    id: 'sr38',
    english: "I am listening to the radio.",
    french: "J'écoute la radio.",
    fragments: ["J'écoute", "la", "radio"],
    explanation: "'Écouter' is a direct transitive verb in French — no preposition, unlike English 'listen TO'.",
    theme: "Prepositions",
    difficulty: 1
  },
  {
    id: 'sr39',
    english: "I used to live in Paris.",
    french: "J'habitais à Paris.",
    fragments: ["J'habitais", "à", "Paris"],
    explanation: "The Imparfait ('habitais') describes an ongoing past state, not a single completed action.",
    theme: "Imperfect Tense",
    difficulty: 2
  },
  {
    id: 'sr40',
    english: "We got up early.",
    french: "Nous nous sommes levés tôt.",
    fragments: ["Nous", "nous", "sommes", "levés", "tôt"],
    explanation: "Reflexive verbs always take 'être' in the Passé Composé, agreeing with the subject.",
    theme: "Reflexive Verbs",
    difficulty: 2
  },
  {
    id: 'sr41',
    english: "If I won the lottery, I would travel the world.",
    french: "Si je gagnais au loto, je voyagerais autour du monde.",
    fragments: ["Si", "je", "gagnais", "au", "loto,", "je", "voyagerais", "autour", "du", "monde"],
    explanation: "Si + imparfait pairs with the conditional in the main clause, not the future.",
    theme: "Conditionals",
    difficulty: 3
  }
];

