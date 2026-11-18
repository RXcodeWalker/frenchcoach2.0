import type { TopicPage } from '../types';

/** Environment and technology, animals and nature, transport, arts and entertainment. */
export const WORLD_TOPICS: readonly TopicPage[] = [
  {
    slug: 'environment-and-technology',
    learnKey: 'environment',
    title: 'Environment and technology',
    frTitle: "L'environnement",
    areas: ['C'],
    subTopics: [
      'The natural world, the environment, the climate and the weather',
      'Communications and technology',
    ],
    intro:
      'These are the topics where opinions, solutions and the future all come together, which is why they suit higher-band answers. Keep the vocabulary precise, and always pair a problem with something you or society could do about it.',
    tips: [
      'Learn six precise words (recycler, polluer, les déchets, le réchauffement climatique, une énergie renouvelable, un panneau solaire) and use them.',
      'Give your own actions first, then what governments or companies should do: it shows you can move from the personal to the general.',
      'For technology, always offer a benefit and a risk, then your own conclusion.',
    ],
    answers: [
      {
        kind: 'describe',
        question: "Qu'est-ce que tu fais pour protéger l'environnement ?",
        questionEn: 'What do you do to protect the environment?',
        answer:
          "À la maison, nous faisons plusieurs choses pour protéger l'environnement. Nous trions les déchets : le papier, le plastique et le verre vont dans des poubelles différentes. J'éteins toujours la lumière quand je quitte une pièce et je prends des douches courtes. Pour aller à l'école, je marche ou je prends le vélo au lieu de la voiture. J'ai aussi une gourde réutilisable au lieu d'acheter des bouteilles en plastique.",
        highlights: [
          { fr: 'Nous trions les déchets', note: 'Precise topic vocabulary (trier, les déchets) is worth more than a general phrase.' },
          { fr: "J'éteins toujours la lumière", note: 'An irregular verb (éteindre) used correctly, with an adverb of frequency.' },
          { fr: 'au lieu de la voiture', note: '« Au lieu de » (instead of) is a simple, reusable contrast.' },
        ],
      },
      {
        kind: 'opinion',
        question: 'Est-ce que la technologie est plus utile que dangereuse ?',
        questionEn: 'Is technology more useful than dangerous?',
        answer:
          "Pour moi, la technologie est surtout utile. Grâce à Internet, on peut apprendre n'importe quoi, parler avec des amis qui habitent loin et travailler plus vite. Cependant, il y a des dangers : on passe trop de temps sur son téléphone, et on peut rencontrer des inconnus ou voir de fausses informations en ligne. Je crois qu'il faut apprendre aux jeunes à utiliser la technologie de façon responsable.",
        highlights: [
          { fr: 'Grâce à Internet', note: '« Grâce à » (thanks to) introduces a positive reason neatly.' },
          { fr: 'on passe trop de temps sur son téléphone', note: 'A specific, believable drawback: concrete beats abstract.' },
          { fr: "il faut apprendre aux jeunes à utiliser", note: 'Finishing with a solution gives the answer a conclusion.' },
        ],
      },
      {
        kind: 'past',
        question: "Qu'est-ce que tu as fait récemment pour la planète ?",
        questionEn: 'What have you done recently for the planet?',
        answer:
          "Le mois dernier, mon école a organisé une journée de nettoyage dans le parc près de chez nous. J'ai ramassé des bouteilles et des sacs en plastique avec mes camarades. Nous avons rempli plus de vingt sacs, ce qui m'a vraiment choqué(e). Après ça, nous avons planté des arbres. J'étais fatigué(e), mais content(e) de notre travail. Depuis, je fais plus attention aux déchets.",
        highlights: [
          { fr: 'mon école a organisé', note: 'A different subject (not « je ») shows you can handle the third person in the perfect.' },
          { fr: "ce qui m'a vraiment choqué(e)", note: '« Ce qui » comments on a whole idea: a more complex structure.' },
          { fr: 'Depuis, je fais plus attention', note: 'Ending with « depuis » links the past event to a change that lasts.' },
        ],
      },
      {
        kind: 'future',
        question: 'À ton avis, comment sera le monde dans cinquante ans ?',
        questionEn: 'In your opinion, what will the world be like in fifty years?',
        answer:
          "À mon avis, dans cinquante ans, il y aura plus de voitures électriques et beaucoup de maisons auront des panneaux solaires. Mais s'il fait encore plus chaud, il y aura aussi plus d'inondations et de sécheresses. Je suis assez optimiste, parce que les jeunes se préoccupent davantage de la planète. Si nous agissons maintenant, nous pourrons peut-être éviter les pires problèmes.",
        highlights: [
          { fr: 'il y aura plus de voitures électriques', note: '« Il y aura » (the future of il y a) is the key phrase for predictions.' },
          { fr: "s'il fait encore plus chaud, il y aura", note: 'Si + present, then the future: a prediction with a condition.' },
          { fr: 'nous pourrons peut-être éviter', note: 'Pouvoir in the future, softened by peut-être.' },
        ],
      },
    ],
    vocab: [
      { fr: "l'environnement (m.)", en: 'the environment' },
      { fr: 'le réchauffement climatique', en: 'global warming' },
      { fr: 'recycler', en: 'to recycle' },
      { fr: 'les déchets (m. pl.)', en: 'waste, rubbish' },
      { fr: 'la pollution', en: 'pollution' },
      { fr: "l'énergie renouvelable (f.)", en: 'renewable energy' },
      { fr: 'un panneau solaire', en: 'solar panel' },
      { fr: 'les réseaux sociaux (m. pl.)', en: 'social media' },
    ],
    moreQuestions: [
      'Est-ce que la technologie joue un rôle important dans ta vie ? Comment ?',
      'Est-ce que tu utilises souvent les transports en commun ? Pourquoi ?',
      'Que penses-tu du recyclage ?',
      "Que peut-on faire pour protéger les animaux en voie de disparition ?",
      "Quel est l'impact du tourisme sur l'environnement ?",
    ],
    related: ['animals-and-nature', 'transport', 'shopping-and-money'],
  },
  {
    slug: 'animals-and-nature',
    learnKey: 'animals',
    title: 'Animals and nature',
    frTitle: 'Les animaux',
    areas: ['C'],
    subTopics: ['The natural world, the environment, the climate and the weather'],
    intro:
      'Animals are an approachable way into the natural-world sub-topic. Pets give you easy descriptions, wildlife gives you opinions and solutions, and one animal encounter gives you a ready-made past-tense story.',
    tips: [
      'No pet? Talk about an animal you know, a pet you would like, or one you have met: the examiner wants French, not a true story.',
      'Prepare one wildlife encounter for the past tense, with « il était… » descriptions and a « soudain… » event.',
      'For protection and zoos, give both sides before your own view: it is the surest way to develop an answer.',
    ],
    answers: [
      {
        kind: 'describe',
        question: 'Est-ce que tu as un animal à la maison ?',
        questionEn: 'Do you have a pet at home?',
        answer:
          "Oui, j'ai un chien qui s'appelle Rex. C'est un labrador de trois ans, avec un pelage noir et des yeux marron. Il est très gentil et il adore jouer avec une balle dans le jardin. Tous les matins, avant l'école, je le promène pendant vingt minutes. Mon frère n'aime pas les animaux, mais mes parents disent que Rex fait partie de la famille.",
        highlights: [
          { fr: 'un labrador de trois ans', note: 'Describing age with « de » + number + ans: concrete detail, correct structure.' },
          { fr: 'je le promène', note: 'An object pronoun (le) before the verb, as French requires.' },
          { fr: 'fait partie de la famille', note: 'A fixed expression that sounds natural and warm.' },
        ],
      },
      {
        kind: 'opinion',
        question: 'Est-ce que les zoos sont une bonne idée ?',
        questionEn: 'Are zoos a good idea?',
        answer:
          "Je suis partagé(e) sur ce sujet. D'un côté, les zoos protègent des espèces en danger et permettent aux enfants d'apprendre à respecter les animaux. De l'autre côté, certains animaux sont tristes parce que leur cage est trop petite. Je pense que les zoos modernes, avec de grands espaces proches de la nature, sont acceptables. Par contre, je suis contre les cirques avec des animaux sauvages, parce que c'est cruel.",
        highlights: [
          { fr: 'Je suis partagé(e) sur ce sujet', note: 'Saying you are torn is a legitimate opinion, and it leads into both sides.' },
          { fr: "permettent aux enfants d'apprendre à respecter", note: 'Permettre à quelqu\'un de + infinitive, with a second infinitive: range and accuracy together.' },
          { fr: 'Par contre, je suis contre', note: 'A contrast word and a firm conclusion.' },
        ],
      },
      {
        kind: 'past',
        question: 'Raconte une rencontre avec un animal.',
        questionEn: 'Tell me about an encounter with an animal.',
        answer:
          "L'été dernier, pendant nos vacances à la montagne, nous avons vu un renard près de la tente. Il était petit, avec une queue très longue, et il cherchait de la nourriture. Je suis resté(e) immobile et je l'ai regardé pendant au moins une minute. Ensuite, il est parti dans la forêt. C'était une expérience incroyable parce que je n'avais jamais vu de renard de si près.",
        highlights: [
          { fr: 'nous avons vu un renard', note: 'The perfect tense for the event.' },
          { fr: 'Il était petit, avec une queue très longue, et il cherchait', note: 'The imperfect for description and what was going on, with specific detail.' },
          { fr: "je n'avais jamais vu", note: 'The pluperfect (avais + participle) for something that had never happened before: a higher-band structure.' },
        ],
      },
      {
        kind: 'future',
        question: 'Comment pouvons-nous protéger les animaux à l\'avenir ?',
        questionEn: 'How can we protect animals in the future?',
        answer:
          "À l'avenir, il faudra protéger davantage les forêts, parce que beaucoup d'animaux y vivent. Les gouvernements devront créer plus de parcs naturels et punir sévèrement les braconniers. Moi, je vais devenir bénévole dans un refuge pour animaux le week-end prochain. Si tout le monde fait un petit effort, par exemple en achetant moins de produits en plastique, on pourra sauver beaucoup d'espèces.",
        highlights: [
          { fr: 'il faudra protéger', note: 'The future of falloir: a very useful, compact way to say what must be done.' },
          { fr: 'Les gouvernements devront créer', note: 'The future of devoir, with a change of subject from « moi » to « les gouvernements ».' },
          { fr: 'je vais devenir bénévole', note: 'A personal commitment in the near future makes the answer sound sincere.' },
        ],
      },
    ],
    vocab: [
      { fr: 'un animal de compagnie', en: 'pet' },
      { fr: 'un chien / un chat', en: 'dog / cat' },
      { fr: 'sauvage', en: 'wild' },
      { fr: 'une espèce', en: 'species' },
      { fr: 'en voie de disparition', en: 'endangered' },
      { fr: 'un refuge', en: 'animal shelter' },
      { fr: 'protéger', en: 'to protect' },
      { fr: 'la forêt', en: 'forest' },
    ],
    moreQuestions: [
      'Quel est ton animal préféré et pourquoi ?',
      "Décris le dernier animal que tu as vu.",
      "Pourquoi est-il important de protéger les espèces en voie de disparition ?",
      "Comment les animaux nous aident-ils dans la vie quotidienne ?",
    ],
    related: ['environment-and-technology', 'family-and-friends', 'hobbies-and-free-time'],
  },
  {
    slug: 'transport',
    learnKey: 'transport',
    title: 'Transport',
    frTitle: 'Les transports',
    areas: ['A'],
    subTopics: ['Travel and transport'],
    intro:
      'Transport questions are some of the most predictable, because everyone travels somewhere every day. The same vocabulary also serves holidays and the environment, so it repays practice.',
    tips: [
      'Get the prepositions right: à pied, à vélo, en bus, en train, en voiture, en avion.',
      'Prepare one memorable journey for the past tense, with how long it took and what went wrong or well.',
      'For public transport and the future, bring in cost, comfort and the environment: three easy reasons.',
    ],
    answers: [
      {
        kind: 'describe',
        question: "Comment vas-tu à l'école ?",
        questionEn: 'How do you get to school?',
        answer:
          "D'habitude, je vais à l'école à pied parce que j'habite à dix minutes seulement. Quand il pleut, mon père m'emmène en voiture. Mon meilleur ami prend le bus, et il met environ quarante minutes pour arriver. Le week-end, je prends souvent le vélo pour aller voir mes amis. Je préfère marcher parce que c'est bon pour la santé et ça ne coûte rien.",
        highlights: [
          { fr: "je vais à l'école à pied", note: 'À pied, en voiture, en bus: the right preposition for each means of transport.' },
          { fr: "mon père m'emmène en voiture", note: 'Emmener (to take someone somewhere) is more precise than « prendre ».' },
          { fr: 'il met environ quarante minutes pour arriver', note: 'Mettre for how long a journey takes: a natural, accurate structure.' },
        ],
      },
      {
        kind: 'opinion',
        question: 'Que penses-tu des transports en commun dans ta ville ?',
        questionEn: 'What do you think of public transport in your town?',
        answer:
          "Je trouve que les transports en commun sont pratiques pendant la journée, mais ils sont trop chers pour les jeunes. Un ticket de bus coûte presque trois euros et il faut payer encore plus si on prend le train. De plus, les bus ne passent pas souvent le soir, et ça peut être dangereux d'attendre longtemps. Selon moi, la ville devrait offrir des cartes de transport moins chères aux élèves.",
        highlights: [
          { fr: 'Je trouve que', note: 'A different opinion opener from « je pense que »: varying them shows range.' },
          { fr: 'De plus,', note: 'Adds a further reason, so the opinion is developed rather than repeated.' },
          { fr: 'Selon moi, la ville devrait offrir', note: 'A suggestion in the conditional closes with a solution.' },
        ],
      },
      {
        kind: 'past',
        question: "Raconte un voyage en train ou en avion que tu as fait.",
        questionEn: 'Tell me about a train or plane journey you made.',
        answer:
          "L'année dernière, j'ai pris le train de Londres à Paris avec mon frère pour voir notre tante. Le voyage a duré environ deux heures et demie sous la Manche, dans l'Eurostar. Nous avons écouté de la musique et joué aux cartes. À la gare du Nord, notre tante nous attendait avec un grand sourire. C'était mon premier voyage à l'étranger sans mes parents, donc j'étais un peu stressé(e).",
        highlights: [
          { fr: 'Le voyage a duré environ deux heures et demie', note: 'Durer in the perfect tense for how long something lasted.' },
          { fr: 'notre tante nous attendait', note: 'The imperfect for something already happening when you arrived.' },
          { fr: "C'était mon premier voyage", note: 'Explaining why the trip mattered adds personality to a simple story.' },
        ],
      },
      {
        kind: 'future',
        question: 'Comment penses-tu que nous voyagerons à l\'avenir ?',
        questionEn: 'How do you think we will travel in the future?',
        answer:
          "À l'avenir, je pense que nous voyagerons surtout en voitures électriques ou en trains très rapides. Il y aura peut-être des voitures sans conducteur, ce qui sera plus sûr, parce que les ordinateurs ne se fatiguent pas. Moi, je voudrais bien essayer un voyage dans l'espace un jour, mais ce sera sûrement très cher. Si les billets d'avion deviennent plus chers à cause de l'environnement, les gens prendront plus souvent le train.",
        highlights: [
          { fr: 'nous voyagerons', note: 'The simple future of a regular -er verb: just add the endings to the infinitive.' },
          { fr: 'ce qui sera plus sûr', note: '« Ce qui » plus the future comments on the whole previous idea.' },
          { fr: 'Si les billets d\'avion deviennent plus chers', note: 'Si + present, then the future: a realistic condition with a result.' },
        ],
      },
    ],
    vocab: [
      { fr: 'le train / le bus / le métro', en: 'train / bus / underground' },
      { fr: "l'avion (m.)", en: 'plane' },
      { fr: 'la gare', en: 'station' },
      { fr: "l'aéroport (m.)", en: 'airport' },
      { fr: 'un billet', en: 'ticket' },
      { fr: 'un retard', en: 'a delay' },
      { fr: 'prendre', en: 'to take' },
      { fr: 'le trajet', en: 'journey' },
    ],
    moreQuestions: [
      'As-tu déjà voyagé en train ? Comment c\'était ?',
      'Sais-tu conduire ou apprends-tu à conduire ? Sinon, quand vas-tu commencer ?',
      'Qu\'est-ce que tu ferais pour améliorer les transports dans ta ville ?',
      'Comment les gens se déplaçaient-ils avant l\'invention de la voiture ?',
    ],
    related: ['holidays-and-travel', 'environment-and-technology', 'home-and-town'],
  },
  {
    slug: 'arts-and-entertainment',
    learnKey: 'arts',
    title: 'Arts and entertainment',
    frTitle: 'Les arts',
    areas: ['B', 'E'],
    subTopics: ['Leisure time', 'Culture, customs, faiths and celebrations'],
    intro:
      'Music, film, books and art let you talk about what you love, which is the easiest way to sound fluent. Use the topic to move from your tastes to reasons, and from reasons to a clear opinion.',
    tips: [
      'Choose one favourite film, book and artist, and prepare two reasons for each.',
      'Know the vocabulary for critique: l\'intrigue, les personnages, l\'ambiance, la mise en scène, le rythme.',
      'Be ready to say how you like to enjoy it (live or recorded, alone or with friends) and why.',
    ],
    answers: [
      {
        kind: 'describe',
        question: 'Quel genre de musique préfères-tu ?',
        questionEn: 'What kind of music do you prefer?',
        answer:
          "Mon genre de musique préféré, c'est le rock, surtout les groupes des années quatre-vingt-dix. J'écoute de la musique tous les jours, dans le bus ou en faisant mes devoirs. Je joue aussi de la guitare depuis deux ans et je prends des cours le mercredi. Mon chanteur préféré est britannique, mais j'écoute aussi de la musique française, comme Stromae, un chanteur belge, pour m'entraîner à comprendre.",
        highlights: [
          { fr: "Mon genre de musique préféré, c'est le rock", note: 'A clear frame to state a preference before you explain it.' },
          { fr: 'Je joue aussi de la guitare depuis deux ans', note: 'Jouer de + instrument, and « depuis » + present for something still going on.' },
          { fr: "pour m'entraîner à comprendre", note: 'Pour + infinitive gives a purpose: a reason beyond « j\'aime ça ».' },
        ],
      },
      {
        kind: 'opinion',
        question: 'Que penses-tu des séries télévisées ?',
        questionEn: 'What do you think of TV series?',
        answer:
          "J'adore les séries, parce qu'on peut suivre les mêmes personnages pendant plusieurs saisons et s'attacher à eux. Elles sont souvent plus originales que les films, et on les regarde à son rythme. Le problème, c'est qu'on peut facilement passer des heures devant l'écran sans s'en rendre compte. Mon père dit que je regarde trop la télévision, et il n'a pas tout à fait tort ! Il faut apprendre à s'arrêter à temps.",
        highlights: [
          { fr: "Le problème, c'est qu'on peut facilement passer des heures", note: '« Le problème, c\'est que » introduces a drawback in one natural stroke.' },
          { fr: "il n'a pas tout à fait tort", note: 'Conceding a point (he is not entirely wrong) shows balance and idiom.' },
          { fr: "Il faut apprendre à s'arrêter à temps", note: 'A closing conclusion: opinion, reason, then a view on what to do.' },
        ],
      },
      {
        kind: 'past',
        question: 'As-tu déjà visité un musée d\'art ? Comment c\'était ?',
        questionEn: 'Have you ever visited an art museum? What was it like?',
        answer:
          "Oui, l'année dernière, avec ma classe d'art, j'ai visité le musée d'Orsay à Paris. J'ai vu des tableaux de Monet et de Van Gogh, que j'avais seulement vus dans mes livres. Mon tableau préféré montrait un champ de fleurs, avec des couleurs très vives. Le guide nous a expliqué comment les peintres utilisaient la lumière. C'était fascinant, et depuis, j'ai commencé à peindre moi-même.",
        highlights: [
          { fr: "que j'avais seulement vus dans mes livres", note: 'The pluperfect, with the agreement (vus) after a preceding direct object: a higher-band structure.' },
          { fr: 'Mon tableau préféré montrait un champ de fleurs', note: 'Imperfect-style description of what the picture showed.' },
          { fr: "depuis, j'ai commencé à peindre", note: 'Ending with the result of the visit: what changed for you.' },
        ],
      },
      {
        kind: 'future',
        question: 'Quel concert ou quel spectacle aimerais-tu voir ?',
        questionEn: 'What concert or show would you like to see?',
        answer:
          "J'aimerais beaucoup aller à un concert de mon groupe préféré à Londres. Ce serait la première fois que je les verrais sur scène. Pour acheter les billets, je vais économiser mon argent de poche pendant trois mois. Si j'ai assez d'argent, j'irai avec ma meilleure amie, et nous passerons toute la soirée à chanter. Plus tard, j'aimerais aussi jouer dans un groupe.",
        highlights: [
          { fr: 'Ce serait la première fois que je les verrais', note: 'The conditional twice in one sentence: confident and accurate.' },
          { fr: 'je vais économiser mon argent de poche', note: 'A realistic plan in the near future.' },
          { fr: "Si j'ai assez d'argent, j'irai", note: 'Si + present, then the future.' },
        ],
      },
    ],
    vocab: [
      { fr: 'un chanteur / une chanteuse', en: 'singer' },
      { fr: 'un film', en: 'film' },
      { fr: 'une série', en: 'TV series' },
      { fr: 'un tableau', en: 'painting' },
      { fr: 'un musée', en: 'museum' },
      { fr: 'un concert', en: 'concert' },
      { fr: 'jouer de la guitare', en: 'to play the guitar' },
      { fr: 'un personnage', en: 'character' },
    ],
    moreQuestions: [
      'Quel est ton film préféré et pourquoi ?',
      "Penses-tu que l'art est important pour la société ? Pourquoi ?",
      'Préfères-tu la musique en direct ou enregistrée ? Pourquoi ?',
      "Quel livre t'a le plus marqué(e) et pourquoi ?",
    ],
    related: ['hobbies-and-free-time', 'holidays-and-travel', 'clothes-and-fashion'],
  },
];
