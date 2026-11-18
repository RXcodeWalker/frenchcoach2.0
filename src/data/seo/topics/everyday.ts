import type { TopicPage } from '../types';

/** School, hobbies, family and friends, holidays. */
export const EVERYDAY_TOPICS: readonly TopicPage[] = [
  {
    slug: 'school',
    learnKey: 'school',
    title: 'School and education',
    frTitle: "L'école",
    areas: ['D'],
    subTopics: ['Education'],
    intro:
      "School is one of the easiest topics to prepare, because you already know the vocabulary and live it every day. The aim is to go beyond a list of subjects: give opinions with reasons, and show you can talk about last week and next year as well as today.",
    tips: [
      'Keep a few concrete details ready: your timetable, one subject you love and why, one rule you would change.',
      'Prepare a recent school event (a trip, a test, a match) so you have a past-tense story the moment you need one.',
      'Know your next step — options, exams or plans — so a question about the future never catches you out.',
    ],
    answers: [
      {
        kind: 'describe',
        question: 'Parle-moi de ton école.',
        questionEn: 'Tell me about your school.',
        answer:
          "Mon école se trouve en ville et elle est assez grande : il y a environ mille élèves. Les cours commencent à huit heures et demie et finissent à trois heures et demie. Nous avons une cantine, une bibliothèque et un grand terrain de sport. Ce que j'aime le plus, c'est l'ambiance : les profs sont sympas et mes meilleurs amis sont dans ma classe.",
        highlights: [
          { fr: 'Les cours commencent à huit heures et demie', note: 'Times and numbers are easy accuracy points: say them confidently.' },
          { fr: "Ce que j'aime le plus, c'est", note: 'A ready-made way to introduce an opinion, with more range than « j\'aime ».' },
        ],
      },
      {
        kind: 'opinion',
        question: "Que penses-tu de l'uniforme scolaire ?",
        questionEn: 'What do you think of school uniform?',
        answer:
          "À mon avis, l'uniforme est une bonne idée, mais je ne l'aime pas beaucoup. D'un côté, il réduit les différences entre les élèves et c'est pratique le matin parce qu'on n'a pas besoin de choisir ses vêtements. De l'autre côté, je trouve que la cravate est inconfortable et que l'uniforme limite notre liberté. Si on pouvait choisir, je porterais un jean et un sweat.",
        highlights: [
          { fr: "D'un côté", note: 'Balancing two sides shows you can develop an argument, not just state a view.' },
          { fr: "parce qu'on n'a pas besoin de choisir ses vêtements", note: '« Parce que » plus a reason: the simplest way to justify an opinion.' },
          { fr: 'Si on pouvait choisir, je porterais', note: 'Si + imperfect, then the conditional: a more complex structure at no great risk.' },
        ],
      },
      {
        kind: 'past',
        question: "Qu'est-ce que tu as fait à l'école la semaine dernière ?",
        questionEn: 'What did you do at school last week?',
        answer:
          "La semaine dernière, nous avons eu un contrôle de maths lundi et j'ai bien travaillé pour le préparer. Mercredi, j'ai participé à une sortie scolaire au musée de la ville avec ma classe d'histoire. C'était vraiment intéressant parce que le guide était drôle. Vendredi après-midi, j'ai joué au basket avec mes amis pendant le cours de sport et nous avons gagné le match !",
        highlights: [
          { fr: "j'ai participé à", note: 'The perfect tense for a single completed event.' },
          { fr: "C'était vraiment intéressant parce que", note: 'The imperfect to describe how things were, then a reason.' },
          { fr: 'nous avons gagné le match', note: 'Ending on a result keeps the story short and complete.' },
        ],
      },
      {
        kind: 'future',
        question: "Qu'est-ce que tu voudrais étudier après l'école ?",
        questionEn: 'What would you like to study after school?',
        answer:
          "Après mes examens, je voudrais étudier les sciences au lycée, parce que je suis très intéressé(e) par la biologie. L'année prochaine, je vais choisir la biologie, la chimie et les maths. Si j'ai de bonnes notes, j'irai peut-être à l'université pour devenir vétérinaire. Ce sera difficile, mais j'aime travailler dur quand un sujet me passionne.",
        highlights: [
          { fr: 'je voudrais étudier', note: 'The conditional of vouloir: polite, natural, and a different tense from the present.' },
          { fr: 'je vais choisir', note: 'The near future (aller + infinitive) is the safest way to talk about plans.' },
          { fr: "Si j'ai de bonnes notes, j'irai", note: 'Si + present, then the future: a condition and its result in one sentence.' },
        ],
      },
    ],
    vocab: [
      { fr: 'la matière', en: 'subject' },
      { fr: 'le professeur / la prof', en: 'teacher' },
      { fr: "l'uniforme (m.)", en: 'uniform' },
      { fr: 'les devoirs (m. pl.)', en: 'homework' },
      { fr: 'un examen', en: 'exam' },
      { fr: 'la cantine', en: 'canteen' },
      { fr: 'réviser', en: 'to revise' },
      { fr: 'le règlement', en: 'school rules' },
    ],
    moreQuestions: [
      'Quelles sont tes matières préférées et pourquoi ?',
      "Comment tu vas à l'école chaque matin ?",
      'Que penses-tu du règlement scolaire ?',
      "Qu'est-ce que tu penses des devoirs ? Est-ce qu'ils sont utiles ?",
      "Comment sont les relations entre les élèves dans ton école ?",
    ],
    related: ['future-plans', 'jobs-and-work', 'emotions-and-feelings'],
  },
  {
    slug: 'hobbies-and-free-time',
    learnKey: 'hobbies',
    title: 'Hobbies and free time',
    frTitle: 'Les loisirs',
    areas: ['B'],
    subTopics: ['Leisure time'],
    intro:
      'Hobbies is the topic where you can sound most like yourself. Because the examiner wants to hear you develop ideas, one hobby talked about in detail beats five named in a list.',
    tips: [
      'Choose two or three hobbies you can discuss in different tenses: one you do now, one you did recently, one you would like to try.',
      'Add a reason to every hobby (parce que, car, comme) and a detail about who, where or how often.',
      'If asked about screens or social media, give a balanced answer: one benefit, one drawback, your own habit.',
    ],
    answers: [
      {
        kind: 'describe',
        question: "Qu'est-ce que tu fais pendant ton temps libre ?",
        questionEn: 'What do you do in your free time?',
        answer:
          "Pendant mon temps libre, j'aime écouter de la musique et jouer au foot avec mes amis. Le mercredi après-midi, je fais du sport au club et le week-end, je retrouve mes copains en ville. Quand il pleut, je reste à la maison et je regarde des séries ou je joue sur ma console. J'aime aussi lire, surtout des romans policiers. En général, je suis assez occupé(e), mais j'adore ça.",
        highlights: [
          { fr: "j'aime écouter de la musique et jouer au foot", note: 'Aimer + infinitive, with two activities in one sentence.' },
          { fr: 'Quand il pleut, je reste à la maison', note: 'Saying what you do in different situations gives your answer shape.' },
          { fr: "j'adore ça", note: 'A short, natural closing opinion.' },
        ],
      },
      {
        kind: 'opinion',
        question: 'Est-ce que les jeux vidéo sont une bonne façon de se détendre ?',
        questionEn: 'Are video games a good way to relax?',
        answer:
          "Je pense que oui, à condition de ne pas jouer trop longtemps. Après une journée à l'école, jouer avec mes amis en ligne me détend et me change les idées. En plus, certains jeux nous apprennent à réfléchir et à travailler en équipe. Mais si on joue pendant des heures, on est fatigué le lendemain et on n'a plus le temps de voir ses amis en personne. Pour moi, une heure par jour, c'est parfait.",
        highlights: [
          { fr: 'à condition de ne pas jouer trop longtemps', note: 'A condition makes your opinion balanced and shows more advanced language.' },
          { fr: 'En plus,', note: 'Adds a second reason: developing ideas is what the top Communication band rewards.' },
          { fr: 'Mais si on joue pendant des heures', note: 'Si + present introduces the downside, so the answer has two sides.' },
        ],
      },
      {
        kind: 'past',
        question: "Qu'as-tu fait le week-end dernier ?",
        questionEn: 'What did you do last weekend?',
        answer:
          "Samedi dernier, je suis allé(e) à la patinoire avec trois amis. Nous avons pris le bus à dix heures et nous avons patiné pendant deux heures. Je suis tombé(e) plusieurs fois, mais c'était drôle ! Ensuite, nous avons mangé des frites dans un café. Le soir, je suis rentré(e) à la maison, fatigué(e) mais content(e), et j'ai regardé un film avec ma sœur.",
        highlights: [
          { fr: 'je suis allé(e)', note: 'Verbs of movement use être in the perfect tense, and agree with you.' },
          { fr: 'nous avons patiné', note: 'Most other verbs use avoir: keep the auxiliary right.' },
          { fr: "c'était drôle", note: 'The imperfect for how something was, alongside the perfect for what happened.' },
        ],
      },
      {
        kind: 'future',
        question: 'Quel nouveau passe-temps voudrais-tu essayer ?',
        questionEn: 'What new hobby would you like to try?',
        answer:
          "J'aimerais essayer l'escalade parce que ça a l'air amusant et très bon pour la forme. Le mois prochain, je vais m'inscrire à un cours d'initiation dans la salle près de chez moi. Si j'aime ça, je ferai de l'escalade tous les week-ends. Un jour, j'aimerais escalader une vraie montagne dans les Alpes, mais je sais qu'il faudra beaucoup s'entraîner d'abord.",
        highlights: [
          { fr: "J'aimerais essayer", note: 'The conditional of aimer: a polite, natural way to say what you would like.' },
          { fr: 'je vais m\'inscrire', note: 'The near future for a concrete plan.' },
          { fr: "Si j'aime ça, je ferai", note: 'Si + present, then the future.' },
        ],
      },
    ],
    vocab: [
      { fr: 'le passe-temps', en: 'hobby' },
      { fr: 'se détendre', en: 'to relax' },
      { fr: 'un jeu vidéo', en: 'video game' },
      { fr: 'un loisir', en: 'leisure activity' },
      { fr: 'faire partie d\'un club', en: 'to belong to a club' },
      { fr: 's\'entraîner', en: 'to train, to practise' },
      { fr: 'retrouver ses amis', en: 'to meet up with friends' },
      { fr: 'un roman policier', en: 'detective novel' },
    ],
    moreQuestions: [
      'Tu fais du sport ? Quel sport tu préfères et pourquoi ?',
      "Qu'est-ce que tu as fait le week-end dernier pour te détendre ?",
      "Quel est le dernier film que tu as vu ? C'était comment ?",
      'Est-ce que tu joues aux jeux vidéo ? Pourquoi (pas) ?',
    ],
    related: ['sports-and-fitness', 'arts-and-entertainment', 'family-and-friends'],
  },
  {
    slug: 'family-and-friends',
    learnKey: 'family',
    title: 'Family and friends',
    frTitle: 'La famille',
    areas: ['B'],
    subTopics: ['Self, family and friends'],
    intro:
      'Family and friends questions are personal, so they sound natural when you answer them honestly. Use them to practise describing people, comparing, and linking a past event to how you feel now.',
    tips: [
      'Prepare three people to describe: a family member, a friend and someone you admire, each with two adjectives and one reason.',
      'Use « mon frère a quinze ans », not « est quinze ans »: age with avoir is a classic point where accuracy shows.',
      'You never have to share anything private. A true-sounding, fully answered reply scores; the examiner is listening to your French.',
    ],
    answers: [
      {
        kind: 'describe',
        question: 'Parle-moi de ta famille.',
        questionEn: 'Tell me about your family.',
        answer:
          "Dans ma famille, nous sommes quatre : mes parents, ma petite sœur et moi. Mon père est ingénieur et ma mère travaille dans une banque. Ma sœur a dix ans et elle adore dessiner. Nous habitons dans une maison avec un chien qui s'appelle Max. On s'entend bien, même si on se dispute parfois pour la télécommande ! Mes grands-parents habitent près de chez nous et je les vois tous les dimanches.",
        highlights: [
          { fr: 'Ma sœur a dix ans', note: 'Age uses avoir in French: a classic accuracy point.' },
          { fr: "On s'entend bien, même si on se dispute parfois", note: '« Même si » adds a contrast and keeps the answer from sounding like a list.' },
          { fr: 'Mon père est ingénieur', note: 'No article after être with a job: « est ingénieur », not « est un ingénieur ».' },
        ],
      },
      {
        kind: 'opinion',
        question: 'Qu\'est-ce qui est important dans une bonne amitié ?',
        questionEn: 'What matters in a good friendship?',
        answer:
          "Pour moi, le plus important dans une amitié, c'est la confiance. Un bon ami garde tes secrets et il est toujours là quand tu as un problème. Il faut aussi avoir le même sens de l'humour, parce qu'on passe beaucoup de temps à rire ensemble. Je pense que la qualité est plus importante que la quantité : j'ai seulement deux vrais amis, mais je peux tout leur dire.",
        highlights: [
          { fr: "le plus important dans une amitié, c'est la confiance", note: 'A clear sentence frame: say your main point first, then explain it.' },
          { fr: "parce qu'on passe beaucoup de temps à rire ensemble", note: 'Passer du temps à + infinitive is a natural phrase that earns range.' },
          { fr: 'la qualité est plus importante que la quantité', note: 'A comparison with plus… que.' },
        ],
      },
      {
        kind: 'past',
        question: "Qu'est-ce que tu as fait avec ta famille récemment ?",
        questionEn: 'What have you done with your family recently?',
        answer:
          "Le week-end dernier, nous sommes allés chez mes grands-parents pour fêter l'anniversaire de ma grand-mère. Ma mère a préparé un grand gâteau au chocolat et mon oncle a apporté des fleurs. Nous avons mangé tous ensemble dans le jardin parce qu'il faisait très beau. Après le repas, mes cousins et moi, nous avons joué au football. C'était une journée fantastique et je me suis beaucoup amusé(e).",
        highlights: [
          { fr: 'nous sommes allés', note: 'Aller takes être; the participle agrees with who went.' },
          { fr: "il faisait très beau", note: 'The imperfect for weather and background.' },
          { fr: 'je me suis beaucoup amusé(e)', note: 'Reflexive verbs also use être in the perfect tense.' },
        ],
      },
      {
        kind: 'future',
        question: 'Comment imagines-tu ta vie de famille dans dix ans ?',
        questionEn: 'How do you imagine your family life in ten years?',
        answer:
          "Dans dix ans, j'aurai peut-être ma propre famille, mais ce n'est pas sûr. D'abord, je voudrais finir mes études et trouver un bon travail. Ensuite, j'espère habiter dans une grande ville avec la personne que j'aime. Si j'ai des enfants un jour, je leur parlerai beaucoup, comme mes parents le font avec moi. Je resterai toujours proche de ma famille, même si j'habite loin.",
        highlights: [
          { fr: "j'aurai peut-être", note: 'The future of avoir, softened with peut-être because nothing is certain.' },
          { fr: 'je voudrais finir mes études', note: 'Conditional for a wish, future for a prediction: using both shows range.' },
          { fr: "Si j'ai des enfants un jour, je leur parlerai", note: 'Si + present, then the future.' },
        ],
      },
    ],
    vocab: [
      { fr: 'le frère / la sœur', en: 'brother / sister' },
      { fr: 'les grands-parents (m. pl.)', en: 'grandparents' },
      { fr: 'un cousin / une cousine', en: 'cousin' },
      { fr: "s'entendre bien avec", en: 'to get on well with' },
      { fr: 'se disputer', en: 'to argue' },
      { fr: 'un ami proche', en: 'a close friend' },
      { fr: 'la confiance', en: 'trust' },
      { fr: 'ressembler à', en: 'to look like' },
    ],
    moreQuestions: [
      'Comment est ta relation avec tes parents ?',
      "Est-il plus important d'avoir beaucoup d'amis ou quelques amis proches ? Pourquoi ?",
      'Qui est la personne la plus drôle dans ta famille ? Pourquoi ?',
      'Penses-tu que les parents et les adolescents peuvent être amis ? Pourquoi (pas) ?',
    ],
    related: ['emotions-and-feelings', 'hobbies-and-free-time', 'home-and-town'],
  },
  {
    slug: 'holidays-and-travel',
    learnKey: 'holidays',
    title: 'Holidays and travel',
    frTitle: 'Les vacances',
    areas: ['A', 'E'],
    subTopics: ['Travel and transport', 'Countries, nationalities and languages'],
    intro:
      'Holidays are a gift of a topic: they invite the past (where you went), the future (where you will go) and the conditional (where you would go). One well-prepared trip can cover all three.',
    tips: [
      'Prepare one past holiday in detail: who, where, how you travelled, one thing that went wrong, one highlight.',
      'Prepare a dream destination with « si je pouvais… j\'irais… » so the conditional is ready when you need it.',
      'Be ready to say what you think of tourism: one benefit, one problem, one idea to improve it.',
    ],
    answers: [
      {
        kind: 'describe',
        question: 'Où est-ce que tu aimes passer tes vacances ?',
        questionEn: 'Where do you like to spend your holidays?',
        answer:
          "En général, je passe mes vacances au bord de la mer avec ma famille. Nous louons un appartement près de la plage et nous restons deux semaines. Pendant la journée, on se baigne, on fait des promenades et on mange des glaces. Le soir, on dîne dans un restaurant du port. J'aime ce genre de vacances parce qu'il n'y a pas de stress et le temps est toujours beau.",
        highlights: [
          { fr: 'En général, je passe', note: 'A natural opener for describing what you usually do.' },
          { fr: 'on se baigne, on fait des promenades et on mange des glaces', note: '« On » + present is the easiest way to describe what everyone does.' },
          { fr: "il n'y a pas de stress", note: 'Negation with ne… pas de, accurate and natural.' },
        ],
      },
      {
        kind: 'opinion',
        question: 'Est-ce que le tourisme est une bonne chose pour une région ?',
        questionEn: 'Is tourism good for a region?',
        answer:
          "À mon avis, le tourisme est une bonne chose, mais il y a aussi des problèmes. D'un côté, les touristes apportent de l'argent et créent des emplois dans les hôtels et les restaurants. De l'autre côté, ils laissent des déchets et les prix montent pour les habitants. Je pense qu'il faut protéger les endroits très populaires, par exemple en limitant le nombre de visiteurs.",
        highlights: [
          { fr: 'mais il y a aussi des problèmes', note: 'Opinion plus nuance: the answer is already more than one sentence deep.' },
          { fr: "D'un côté, les touristes apportent de l'argent", note: 'A balanced argument with a concrete reason on each side.' },
          { fr: "il faut protéger les endroits très populaires", note: 'Il faut + infinitive is a quick way to suggest a solution.' },
        ],
      },
      {
        kind: 'past',
        question: 'Raconte tes dernières vacances.',
        questionEn: 'Tell me about your last holiday.',
        answer:
          "L'été dernier, je suis parti(e) en Espagne avec ma famille. Nous avons pris l'avion à Londres et après deux heures de vol, nous sommes arrivés à Barcelone. Nous avons visité la Sagrada Família, qui était magnifique, et nous avons goûté des tapas. Un jour, il a plu, alors nous sommes allés au cinéma. Ce qui m'a le plus plu, c'est la plage : j'ai nagé tous les matins.",
        highlights: [
          { fr: 'je suis parti(e)', note: 'Verbs of movement take être and agree with the subject.' },
          { fr: 'qui était magnifique', note: 'Qui + imperfect adds a description inside a perfect-tense story.' },
          { fr: "Ce qui m'a le plus plu, c'est", note: 'A more advanced way to say what you liked best.' },
        ],
      },
      {
        kind: 'future',
        question: "Si tu pouvais partir n'importe où, où irais-tu ?",
        questionEn: 'If you could go anywhere, where would you go?',
        answer:
          "Si je pouvais partir n'importe où, j'irais au Japon. J'adore la cuisine japonaise et je voudrais visiter Tokyo et Kyoto. Je prendrais le train rapide pour voir le mont Fuji et je logerais dans un petit hôtel traditionnel. Je pense que ce serait un voyage inoubliable. Cette année, ce n'est pas possible, mais je vais économiser pour y aller un jour.",
        highlights: [
          { fr: "Si je pouvais partir n'importe où, j'irais", note: 'Si + imperfect, then the conditional: the classic « what if » structure.' },
          { fr: 'Je prendrais le train rapide', note: 'Keep the conditional going: each extra verb is another chance to show it.' },
          { fr: 'je vais économiser', note: 'End with a real plan in the near future.' },
        ],
      },
    ],
    vocab: [
      { fr: 'partir en vacances', en: 'to go on holiday' },
      { fr: 'un séjour', en: 'a stay' },
      { fr: 'le bord de la mer', en: 'the seaside' },
      { fr: 'loger', en: 'to stay (somewhere)' },
      { fr: 'réserver', en: 'to book' },
      { fr: 'un billet', en: 'ticket' },
      { fr: 'la valise', en: 'suitcase' },
      { fr: "à l'étranger", en: 'abroad' },
    ],
    moreQuestions: [
      'Tu préfères les vacances à la mer ou à la montagne ? Pourquoi ?',
      'Où vas-tu passer tes prochaines vacances ?',
      'Quel est le pays que tu as le plus aimé visiter ? Pourquoi ?',
      'Quels sont les avantages et les inconvénients du tourisme ?',
    ],
    related: ['transport', 'environment-and-technology', 'arts-and-entertainment'],
  },
];
