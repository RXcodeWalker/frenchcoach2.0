import { RebuildQuestion } from '../types';

export const REBUILD_QUESTIONS: RebuildQuestion[] = [
  {
    id: 'sr1',
    english: "I like the red house.",
    french: "J'aime la maison rouge.",
    fragments: ["J'aime", "la", "maison", "rouge"],
    explanation: "In French, most adjectives (like 'rouge') come AFTER the noun ('maison').",
    theme: "Adjective Placement",
    difficulty: 1,
    distractors: ["le", "rouges"]
  },
  {
    id: 'sr2',
    english: "I don't eat meat.",
    french: "Je ne mange pas de viande.",
    fragments: ["Je", "ne", "mange", "pas", "de", "viande"],
    explanation: "Negation in French uses the 'ne...pas' sandwich around the verb.",
    theme: "Negation",
    difficulty: 1,
    distractors: ["des", "mangent"]
  },
  {
    id: 'sr3',
    english: "He gives it to me.",
    french: "Il me le donne.",
    fragments: ["Il", "me", "le", "donne"],
    explanation: "Object pronouns (me, le) come BEFORE the verb in French.",
    theme: "Pronoun Placement",
    difficulty: 2,
    distractors: ["te", "lui"]
  },
  {
    id: 'sr21',
    english: "I see her every day.",
    french: "Je la vois tous les jours.",
    fragments: ["Je", "la", "vois", "tous", "les", "jours"],
    explanation: "The object pronoun 'la' (her/it) comes BEFORE the verb 'vois', not after.",
    theme: "Pronoun Placement",
    difficulty: 2,
    distractors: ["le", "voit"],
    alternatives: ["Tous les jours, je la vois"]
  },
  {
    id: 'sr22',
    english: "We are talking to them.",
    french: "Nous leur parlons.",
    fragments: ["Nous", "leur", "parlons"],
    explanation: "'Leur' (to them) is an indirect object pronoun and goes BEFORE the verb, not after 'à eux'.",
    theme: "Pronoun Placement",
    difficulty: 2,
    distractors: ["lui", "parlez"]
  },
  {
    id: 'sr4',
    english: "I am going to the hospital.",
    french: "Je vais à l'hôpital.",
    fragments: ["Je", "vais", "à", "l'hôpital"],
    explanation: "When 'à' meets 'le' before a vowel, it becomes 'à l''.",
    theme: "Elision",
    difficulty: 1,
    distractors: ["au", "allez"]
  },
  {
    id: 'sr5',
    english: "We have many friends.",
    french: "Nous avons beaucoup d'amis.",
    fragments: ["Nous", "avons", "beaucoup", "d'amis"],
    explanation: "'Beaucoup' always takes 'de' (or d' before a vowel), never 'des'.",
    theme: "Prepositions",
    difficulty: 2,
    distractors: ["des", "avez"]
  },
  {
    id: 'sr6',
    english: "I am happy that you are here.",
    french: "Je suis content que tu sois là.",
    fragments: ["Je", "suis", "content", "que", "tu", "sois", "là"],
    explanation: "Expressions of emotion (like 'content que') trigger the Subjunctive mood ('sois').",
    theme: "Subjunctive",
    difficulty: 3,
    distractors: ["es", "soit"]
  },
  {
    id: 'sr7',
    english: "The book that I bought is good.",
    french: "Le livre que j'ai acheté est bon.",
    fragments: ["Le", "livre", "que", "j'ai", "acheté", "est", "bon"],
    explanation: "'Que' is used as a relative pronoun when it's the object of the following verb.",
    theme: "Relative Pronouns",
    difficulty: 2,
    distractors: ["qui", "achetée"]
  },
  {
    id: 'sr8',
    english: "I used to play in the park.",
    french: "Je jouais dans le parc.",
    fragments: ["Je", "jouais", "dans", "le", "parc"],
    explanation: "The Imparfait ('jouais') is used for habitual actions in the past.",
    theme: "Imperfect Tense",
    difficulty: 2,
    distractors: ["joue", "au"]
  },
  {
    id: 'sr9',
    english: "If it rains, we will stay at home.",
    french: "S'il pleut, nous resterons à la maison.",
    fragments: ["S'il", "pleut,", "nous", "resterons", "à", "la", "maison"],
    explanation: "The 'Si' clause uses the Present tense, and the main clause uses the Future tense.",
    theme: "Conditionals",
    difficulty: 3,
    distractors: ["pleuvra", "resterions"],
    alternatives: ["Nous resterons à la maison s'il pleut"]
  },
  {
    id: 'sr10',
    english: "I am looking for my keys.",
    french: "Je cherche mes clés.",
    fragments: ["Je", "cherche", "mes", "clés"],
    explanation: "The verb 'chercher' means 'to look FOR', so no extra preposition is needed.",
    theme: "Verb Patterns",
    difficulty: 1,
    distractors: ["pour", "cherches"]
  },
  {
    id: 'sr11',
    english: "I washed my hands.",
    french: "Je me suis lavé les mains.",
    fragments: ["Je", "me", "suis", "lavé", "les", "mains"],
    explanation: "Reflexive verbs use 'être' in the Passé Composé. 'Me suis lavé' means 'I washed myself'.",
    theme: "Reflexive Verbs",
    difficulty: 2,
    distractors: ["ai", "laver"]
  },
  {
    id: 'sr12',
    english: "If I was rich, I would buy a boat.",
    french: "Si j'étais riche, j'achèterais un bateau.",
    fragments: ["Si", "j'étais", "riche,", "j'achèterais", "un", "bateau"],
    explanation: "The 'Si' clause uses the Imparfait, and the main clause uses the Conditionnel.",
    theme: "Conditionals",
    difficulty: 3,
    distractors: ["serais", "achèterai"],
    alternatives: ["J'achèterais un bateau si j'étais riche"]
  },
  {
    id: 'sr13',
    english: "I have to go there.",
    french: "Je dois y aller.",
    fragments: ["Je", "dois", "y", "aller"],
    explanation: "The pronoun 'y' replaces a place and usually comes before the infinitive.",
    theme: "Pronoun 'Y'",
    difficulty: 2,
    distractors: ["en", "doit"]
  },
  {
    id: 'sr14',
    english: "What are you doing tonight?",
    french: "Qu'est-ce que tu fais ce soir ?",
    fragments: ["Qu'est-ce", "que", "tu", "fais", "ce", "soir", "?"],
    explanation: "'Qu'est-ce que' is a very common way to start a question meaning 'What...'.",
    theme: "Questions",
    difficulty: 1,
    distractors: ["fait", "cette"]
  },
  {
    id: 'sr15',
    english: "I think that he is right.",
    french: "Je pense qu'il a raison.",
    fragments: ["Je", "pense", "qu'il", "a", "raison"],
    explanation: "In French, you don't say 'is right', you say 'has reason' (avoir raison).",
    theme: "Idiomatic Expressions",
    difficulty: 2,
    distractors: ["est", "pensent"]
  },
  {
    id: 'sr16',
    english: "Don't speak to me like that.",
    french: "Ne me parle pas comme ça.",
    fragments: ["Ne", "me", "parle", "pas", "comme", "ça"],
    explanation: "In negative imperatives, the object pronoun 'me' comes before the verb.",
    theme: "Imperatives",
    difficulty: 2,
    distractors: ["moi", "parler"]
  },
  {
    id: 'sr17',
    english: "The car which I saw is black.",
    french: "La voiture que j'ai vue est noire.",
    fragments: ["La", "voiture", "que", "j'ai", "vue", "est", "noire"],
    explanation: "When 'que' is a direct object before 'avoir', the past participle agrees with the noun.",
    theme: "Past Participle Agreement",
    difficulty: 3,
    distractors: ["vu", "noir"]
  },
  {
    id: 'sr18',
    english: "I'm going to do my homework.",
    french: "Je vais faire mes devoirs.",
    fragments: ["Je", "vais", "faire", "mes", "devoirs"],
    explanation: "The Futur Proche uses 'aller' + infinitive.",
    theme: "Future Tenses",
    difficulty: 1,
    distractors: ["ses", "allons"]
  },
  {
    id: 'sr19',
    english: "She is taller than him.",
    french: "Elle est plus grande que lui.",
    fragments: ["Elle", "est", "plus", "grande", "que", "lui"],
    explanation: "Comparatives use 'plus + adjective + que'.",
    theme: "Comparatives",
    difficulty: 1,
    distractors: ["grand", "elles"]
  },
  {
    id: 'sr20',
    english: "I will call you as soon as I arrive.",
    french: "Je t'appellerai dès que j'arriverai.",
    fragments: ["Je", "t'appellerai", "dès", "que", "j'arriverai"],
    explanation: "After 'dès que', French uses the future tense if the main verb is in the future.",
    theme: "Future Tenses",
    difficulty: 3,
    distractors: ["arrivais", "appelais"],
    alternatives: ["Dès que j'arriverai, je t'appellerai"]
  },
  {
    id: 'sr23',
    english: "I need a pen.",
    french: "J'ai besoin d'un stylo.",
    fragments: ["J'ai", "besoin", "d'un", "stylo"],
    explanation: "'De' contracts to d' before a vowel — 'de un' is never correct.",
    theme: "Elision",
    difficulty: 1,
    distractors: ["de", "un"]
  },
  {
    id: 'sr24',
    english: "This hotel is magnificent.",
    french: "Cet hôtel est magnifique.",
    fragments: ["Cet", "hôtel", "est", "magnifique"],
    explanation: "Masculine 'ce' becomes 'cet' before a vowel or mute h, for phonetic ease.",
    theme: "Elision",
    difficulty: 1,
    distractors: ["Ce", "magnifiques"]
  },
  {
    id: 'sr25',
    english: "I don't have any money.",
    french: "Je n'ai pas d'argent.",
    fragments: ["Je", "n'ai", "pas", "d'argent"],
    explanation: "Formal negation keeps both 'ne' and 'pas' around the verb, even in speech.",
    theme: "Negation",
    difficulty: 1,
    distractors: ["du", "ne"]
  },
  {
    id: 'sr26',
    english: "He never goes to school on Saturday.",
    french: "Il ne va jamais à l'école le samedi.",
    fragments: ["Il", "ne", "va", "jamais", "à", "l'école", "le", "samedi"],
    explanation: "'Ne...jamais' ('never') follows the same sandwich pattern as 'ne...pas'.",
    theme: "Negation",
    difficulty: 2,
    distractors: ["pas", "au"],
    alternatives: ["Le samedi, il ne va jamais à l'école"]
  },
  {
    id: 'sr27',
    english: "It's important that you come tomorrow.",
    french: "Il est important que tu viennes demain.",
    fragments: ["Il", "est", "important", "que", "tu", "viennes", "demain"],
    explanation: "'Il est important que' expresses necessity and triggers the subjunctive ('viennes').",
    theme: "Subjunctive",
    difficulty: 3,
    distractors: ["viens", "soit"]
  },
  {
    id: 'sr28',
    english: "I doubt that he knows the answer.",
    french: "Je doute qu'il sache la réponse.",
    fragments: ["Je", "doute", "qu'il", "sache", "la", "réponse"],
    explanation: "'Douter que' expresses doubt and requires the subjunctive ('sache', from savoir).",
    theme: "Subjunctive",
    difficulty: 3,
    distractors: ["sait", "les"]
  },
  {
    id: 'sr29',
    english: "The teacher who explains well is popular.",
    french: "Le professeur qui explique bien est populaire.",
    fragments: ["Le", "professeur", "qui", "explique", "bien", "est", "populaire"],
    explanation: "'Qui' is the subject of 'explique' here, so it stays as 'qui', not 'que'.",
    theme: "Relative Pronouns",
    difficulty: 2,
    distractors: ["que", "populaires"]
  },
  {
    id: 'sr30',
    english: "The town where I was born is small.",
    french: "La ville où je suis né est petite.",
    fragments: ["La", "ville", "où", "je", "suis", "né", "est", "petite"],
    explanation: "'Où' is used as a relative pronoun for places, even when 'where' isn't literal in English.",
    theme: "Relative Pronouns",
    difficulty: 2,
    distractors: ["que", "petit"]
  },
  {
    id: 'sr31',
    english: "My sister is tall.",
    french: "Ma sœur est grande.",
    fragments: ["Ma", "sœur", "est", "grande"],
    explanation: "Feminine adjectives usually add -e: 'grand' becomes 'grande' to agree with 'sœur'.",
    theme: "Adjective Placement",
    difficulty: 1,
    distractors: ["Mon", "grand"]
  },
  {
    id: 'sr32',
    english: "It's a new car.",
    french: "C'est une nouvelle voiture.",
    fragments: ["C'est", "une", "nouvelle", "voiture"],
    explanation: "'Nouveau' is irregular in the feminine: 'nouvelle', and placed before the noun.",
    theme: "Adjective Placement",
    difficulty: 2,
    distractors: ["nouveau", "un"]
  },
  {
    id: 'sr33',
    english: "This dress is beautiful.",
    french: "Cette robe est belle.",
    fragments: ["Cette", "robe", "est", "belle"],
    explanation: "'Cette' is the feminine singular demonstrative, used before a feminine noun like 'robe'.",
    theme: "Demonstratives",
    difficulty: 1,
    distractors: ["Ce", "beau"]
  },
  {
    id: 'sr34',
    english: "These books are interesting.",
    french: "Ces livres sont intéressants.",
    fragments: ["Ces", "livres", "sont", "intéressants"],
    explanation: "'Ces' is the plural demonstrative, used for both masculine and feminine plural nouns.",
    theme: "Demonstratives",
    difficulty: 1,
    distractors: ["Ce", "intéressant"]
  },
  {
    id: 'sr35',
    english: "I prefer this one (m).",
    french: "Je préfère celui-ci.",
    fragments: ["Je", "préfère", "celui-ci"],
    explanation: "'Celui-ci' ('this one') replaces a masculine noun already mentioned.",
    theme: "Demonstratives",
    difficulty: 2,
    distractors: ["préfères", "celles-ci"]
  },
  {
    id: 'sr36',
    english: "This film is better than the last one.",
    french: "Ce film est meilleur que le dernier.",
    fragments: ["Ce", "film", "est", "meilleur", "que", "le", "dernier"],
    explanation: "'Bon' has an irregular comparative: 'meilleur', never 'plus bon'.",
    theme: "Comparatives",
    difficulty: 2,
    distractors: ["plus", "bon"]
  },
  {
    id: 'sr37',
    english: "He speaks better than his brother.",
    french: "Il parle mieux que son frère.",
    fragments: ["Il", "parle", "mieux", "que", "son", "frère"],
    explanation: "'Bien' has an irregular comparative adverb: 'mieux', never 'plus bien'.",
    theme: "Comparatives",
    difficulty: 2,
    distractors: ["meilleur", "sa"]
  },
  {
    id: 'sr38',
    english: "I am listening to the radio.",
    french: "J'écoute la radio.",
    fragments: ["J'écoute", "la", "radio"],
    explanation: "'Écouter' is a direct transitive verb in French — no preposition, unlike English 'listen TO'.",
    theme: "Prepositions",
    difficulty: 1,
    distractors: ["à", "le"]
  },
  {
    id: 'sr39',
    english: "I used to live in Paris.",
    french: "J'habitais à Paris.",
    fragments: ["J'habitais", "à", "Paris"],
    explanation: "The Imparfait ('habitais') describes an ongoing past state, not a single completed action.",
    theme: "Imperfect Tense",
    difficulty: 2,
    distractors: ["habite", "en"]
  },
  {
    id: 'sr40',
    english: "We got up early.",
    french: "Nous nous sommes levés tôt.",
    fragments: ["Nous", "nous", "sommes", "levés", "tôt"],
    explanation: "Reflexive verbs always take 'être' in the Passé Composé, agreeing with the subject.",
    theme: "Reflexive Verbs",
    difficulty: 2,
    distractors: ["avons", "lever"]
  },
  {
    id: 'sr41',
    english: "If I won the lottery, I would travel the world.",
    french: "Si je gagnais au loto, je voyagerais autour du monde.",
    fragments: ["Si", "je", "gagnais", "au", "loto,", "je", "voyagerais", "autour", "du", "monde"],
    explanation: "Si + imparfait pairs with the conditional in the main clause, not the future.",
    theme: "Conditionals",
    difficulty: 3,
    distractors: ["gagnerais", "voyagerai"],
    alternatives: ["Je voyagerais autour du monde si je gagnais au loto"]
  },
  {
    id: 'sr42',
    english: "I go to school by bus.",
    french: "Je vais à l'école en bus.",
    fragments: ["Je", "vais", "à", "l'école", "en", "bus"],
    explanation: "Transport takes 'en' (en bus, en train, en voiture), but 'à' for bikes and walking (à vélo, à pied).",
    theme: "Prepositions",
    difficulty: 1,
    distractors: ["au", "dans"]
  },
  {
    id: 'sr43',
    english: "My brother is eleven years old.",
    french: "Mon frère a onze ans.",
    fragments: ["Mon", "frère", "a", "onze", "ans"],
    explanation: "French uses 'avoir' (to have) for age, never 'être': he HAS eleven years.",
    theme: "Verb Patterns",
    difficulty: 1,
    distractors: ["est", "ma"]
  },
  {
    id: 'sr44',
    english: "Where do you live?",
    french: "Où est-ce que tu habites ?",
    fragments: ["Où", "est-ce", "que", "tu", "habites", "?"],
    explanation: "Question word + 'est-ce que' + the normal word order is the easiest way to ask a question.",
    theme: "Questions",
    difficulty: 1,
    distractors: ["habite", "quand"]
  },
  {
    id: 'sr45',
    english: "I like playing football.",
    french: "J'aime jouer au football.",
    fragments: ["J'aime", "jouer", "au", "football"],
    explanation: "Sports take 'jouer à' (au = à + le); instruments take 'jouer de' (jouer de la guitare).",
    theme: "Prepositions",
    difficulty: 1,
    distractors: ["du", "à"]
  },
  {
    id: 'sr46',
    english: "She has a big dog.",
    french: "Elle a un grand chien.",
    fragments: ["Elle", "a", "un", "grand", "chien"],
    explanation: "Short, common adjectives of beauty, age, goodness and size (BAGS) like 'grand' go BEFORE the noun.",
    theme: "Adjective Placement",
    difficulty: 1,
    distractors: ["une", "grande"]
  },
  {
    id: 'sr47',
    english: "We don't have any homework.",
    french: "Nous n'avons pas de devoirs.",
    fragments: ["Nous", "n'avons", "pas", "de", "devoirs"],
    explanation: "After a negative, 'des', 'du' and 'un' all become 'de' (or d' before a vowel): pas de devoirs.",
    theme: "Negation",
    difficulty: 1,
    distractors: ["des", "ne"]
  },
  {
    id: 'sr48',
    english: "Yesterday I ate at the restaurant.",
    french: "Hier, j'ai mangé au restaurant.",
    fragments: ["Hier,", "j'ai", "mangé", "au", "restaurant"],
    explanation: "The passé composé of most verbs is 'avoir' + past participle: j'ai mangé. 'Hier' signals a finished action.",
    theme: "Perfect Tense",
    difficulty: 2,
    distractors: ["suis", "mange"],
    alternatives: ["J'ai mangé au restaurant hier"]
  },
  {
    id: 'sr49',
    english: "Last weekend I went to the cinema.",
    french: "Le week-end dernier, je suis allé au cinéma.",
    fragments: ["Le", "week-end", "dernier,", "je", "suis", "allé", "au", "cinéma"],
    explanation: "'Aller' is one of the verbs that take 'être' in the perfect tense, so the participle agrees with you: allé (allée if you are female).",
    theme: "Perfect Tense",
    difficulty: 2,
    distractors: ["ai", "vais"],
    alternatives: ["Je suis allé au cinéma le week-end dernier"]
  },
  {
    id: 'sr50',
    english: "Next year I will go to France.",
    french: "L'année prochaine, j'irai en France.",
    fragments: ["L'année", "prochaine,", "j'irai", "en", "France"],
    explanation: "'Aller' has an irregular future stem, ir-: j'irai. Feminine countries take 'en' for 'to' and 'in'.",
    theme: "Future Tenses",
    difficulty: 2,
    distractors: ["à", "vais"],
    alternatives: ["J'irai en France l'année prochaine"]
  },
  {
    id: 'sr51',
    english: "In my opinion, it is too expensive.",
    french: "À mon avis, c'est trop cher.",
    fragments: ["À", "mon", "avis,", "c'est", "trop", "cher"],
    explanation: "'À mon avis' gives an opinion without needing a verb. Careful: 'trop' means too (much), 'très' means very.",
    theme: "Opinions",
    difficulty: 1,
    distractors: ["très", "beaucoup"],
    alternatives: ["C'est trop cher, à mon avis"]
  },
  {
    id: 'sr52',
    english: "I prefer sport because it is fun.",
    french: "Je préfère le sport parce que c'est amusant.",
    fragments: ["Je", "préfère", "le", "sport", "parce", "que", "c'est", "amusant"],
    explanation: "'Parce que' introduces a reason and is followed by a full clause with its own verb: parce que c'est amusant.",
    theme: "Opinions",
    difficulty: 2,
    distractors: ["pour", "car"]
  },
  {
    id: 'sr53',
    english: "My mother works in a hospital.",
    french: "Ma mère travaille dans un hôpital.",
    fragments: ["Ma", "mère", "travaille", "dans", "un", "hôpital"],
    explanation: "Use 'dans' for 'in' a building or a place you are inside; 'à' is for 'at' or 'to' a town.",
    theme: "Prepositions",
    difficulty: 1,
    distractors: ["mon", "travailles"]
  },
  {
    id: 'sr54',
    english: "He isn't at home because he is ill.",
    french: "Il n'est pas à la maison parce qu'il est malade.",
    fragments: ["Il", "n'est", "pas", "à", "la", "maison", "parce", "qu'il", "est", "malade"],
    explanation: "'Parce que' shortens to 'parce qu'' in front of il, elle, on and a vowel. The ne...pas sandwich wraps 'est'.",
    theme: "Negation",
    difficulty: 2,
    distractors: ["que", "ne"],
    alternatives: ["Parce qu'il est malade, il n'est pas à la maison"]
  },
  {
    id: 'sr55',
    english: "Can you help me, please?",
    french: "Pouvez-vous m'aider, s'il vous plaît ?",
    fragments: ["Pouvez-vous", "m'aider,", "s'il", "vous", "plaît", "?"],
    explanation: "Turning the verb and 'vous' round (pouvez-vous) is the polite way to ask. 'Me' drops to m' before a vowel.",
    theme: "Questions",
    difficulty: 2,
    distractors: ["aide", "me"]
  },
  {
    id: 'sr56',
    english: "She is going to buy a new bag.",
    french: "Elle va acheter un nouveau sac.",
    fragments: ["Elle", "va", "acheter", "un", "nouveau", "sac"],
    explanation: "Futur proche: 'aller' + infinitive. 'Nouveau' goes before the noun and has a feminine form, 'nouvelle', for words like 'robe'.",
    theme: "Future Tenses",
    difficulty: 1,
    distractors: ["nouvelle", "une"]
  },
  {
    id: 'sr57',
    english: "I would like to go to the beach if it is sunny.",
    french: "Je voudrais aller à la plage s'il fait beau.",
    fragments: ["Je", "voudrais", "aller", "à", "la", "plage", "s'il", "fait", "beau"],
    explanation: "'Je voudrais' (conditional of vouloir) is the polite 'I would like'. 'Si' becomes 's'' in front of 'il'.",
    theme: "Conditionals",
    difficulty: 2,
    distractors: ["au", "ferai"],
    alternatives: ["S'il fait beau, je voudrais aller à la plage"]
  },
  {
    id: 'sr58',
    english: "I have never been to Spain.",
    french: "Je ne suis jamais allé en Espagne.",
    fragments: ["Je", "ne", "suis", "jamais", "allé", "en", "Espagne"],
    explanation: "In the perfect tense, ne...jamais wraps the auxiliary (suis) and the participle comes last. (Allée if you are female.)",
    theme: "Negation",
    difficulty: 2,
    distractors: ["ai", "à"]
  },
  {
    id: 'sr59',
    english: "When I was little, I played with my cousins.",
    french: "Quand j'étais petit, je jouais avec mes cousins.",
    fragments: ["Quand", "j'étais", "petit,", "je", "jouais", "avec", "mes", "cousins"],
    explanation: "Both verbs are in the imparfait: it sets the scene and describes what used to happen when you were small.",
    theme: "Imperfect Tense",
    difficulty: 2,
    distractors: ["jouerai", "ma"],
    alternatives: ["Je jouais avec mes cousins quand j'étais petit"]
  },
  {
    id: 'sr60',
    english: "The film that we watched was really funny.",
    french: "Le film que nous avons regardé était vraiment drôle.",
    fragments: ["Le", "film", "que", "nous", "avons", "regardé", "était", "vraiment", "drôle"],
    explanation: "'Que' is the object of 'avons regardé', so it stays 'que'. 'Était' (imparfait) describes how the film was.",
    theme: "Relative Pronouns",
    difficulty: 2,
    distractors: ["qui", "regardés"]
  },
  {
    id: 'sr61',
    english: "I am afraid that it will rain tomorrow.",
    french: "J'ai peur qu'il pleuve demain.",
    fragments: ["J'ai", "peur", "qu'il", "pleuve", "demain"],
    explanation: "'Avoir peur que' (fear) triggers the subjunctive: 'pleuve' comes from pleuvoir. Never 'pleuvra' here.",
    theme: "Subjunctive",
    difficulty: 3,
    distractors: ["pleut", "pleuvra"]
  },
  {
    id: 'sr62',
    english: "Do you want to come to my house on Saturday?",
    french: "Veux-tu venir chez moi samedi ?",
    fragments: ["Veux-tu", "venir", "chez", "moi", "samedi", "?"],
    explanation: "'Chez moi' means 'at my place'. A day with no article ('samedi') means this coming Saturday.",
    theme: "Questions",
    difficulty: 2,
    distractors: ["à", "viens"],
    alternatives: ["Samedi, veux-tu venir chez moi ?"]
  },
  {
    id: 'sr63',
    english: "There are too many cars in my town.",
    french: "Il y a trop de voitures dans ma ville.",
    fragments: ["Il", "y", "a", "trop", "de", "voitures", "dans", "ma", "ville"],
    explanation: "Quantity words (trop, beaucoup, assez) are followed by 'de' with no article: trop de voitures.",
    theme: "Quantities",
    difficulty: 2,
    distractors: ["des", "mon"],
    alternatives: ["Dans ma ville, il y a trop de voitures"]
  },
  {
    id: 'sr64',
    english: "My favourite subject is history.",
    french: "Ma matière préférée est l'histoire.",
    fragments: ["Ma", "matière", "préférée", "est", "l'histoire"],
    explanation: "'Préféré' goes after the noun and agrees with it: 'matière' is feminine, so préférée.",
    theme: "Adjective Placement",
    difficulty: 1,
    distractors: ["préféré", "mon"]
  },
  {
    id: 'sr65',
    english: "She wants to become a doctor.",
    french: "Elle veut devenir médecin.",
    fragments: ["Elle", "veut", "devenir", "médecin"],
    explanation: "After 'être' or 'devenir', a job is used without 'un/une': elle veut devenir médecin.",
    theme: "Verb Patterns",
    difficulty: 1,
    distractors: ["voulons", "devient"]
  }
];
