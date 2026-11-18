import type { TopicPage } from '../types';

/** Future plans, jobs and work, sports and fitness, emotions and feelings. */
export const PEOPLE_TOPICS: readonly TopicPage[] = [
  {
    slug: 'future-plans',
    learnKey: 'future',
    title: 'Future plans',
    frTitle: "L'avenir",
    areas: ['D'],
    subTopics: ['Education', 'Work'],
    intro:
      'Future plans are made for the future and conditional tenses, so this topic is where you can show them off. Keep your plans specific (what, where, when), and always have a reason ready.',
    tips: [
      'Practise three future forms until they are automatic: je vais + infinitive, the simple future (j\'irai) and the conditional (j\'aimerais).',
      'Use a clear chain of steps (d\'abord, ensuite, un jour) to make plans sound organised.',
      'Be honest about uncertainty with peut-être, je ne sais pas encore, ça dépendra de: it sounds natural and avoids over-promising.',
    ],
    answers: [
      {
        kind: 'describe',
        question: "Qu'est-ce que tu fais pour préparer ton avenir ?",
        questionEn: 'What do you do to prepare for your future?',
        answer:
          "Pour préparer mon avenir, je travaille dur à l'école et je révise tous les soirs pendant une heure. Je suis aussi un cours de programmation le samedi matin parce que j'aimerais travailler dans l'informatique. De plus, je fais du bénévolat dans un centre pour enfants, ce qui m'apprend à être patient(e) et responsable. Mes parents me conseillent de bien choisir mes matières, alors j'en parle souvent avec mes professeurs.",
        highlights: [
          { fr: 'je fais du bénévolat', note: 'A distinctive piece of vocabulary (volunteering) that sets the answer apart.' },
          { fr: "ce qui m'apprend à être patient(e) et responsable", note: '« Ce qui » links the activity to what you learn from it.' },
          { fr: "j'aimerais travailler dans l'informatique", note: 'The conditional for a hope, set up by a present-tense fact.' },
        ],
      },
      {
        kind: 'opinion',
        question: "Penses-tu qu'il est important d'aller à l'université ?",
        questionEn: 'Do you think it is important to go to university?',
        answer:
          "Je pense que l'université est importante pour certains métiers, comme médecin ou avocat, mais ce n'est pas nécessaire pour tout le monde. Un apprentissage peut donner une bonne formation et un salaire en même temps. Personnellement, je voudrais aller à l'université parce que j'aime étudier, mais je comprends que certains jeunes préfèrent commencer à travailler tout de suite. L'essentiel, c'est de choisir ce qui nous convient.",
        highlights: [
          { fr: "ce n'est pas nécessaire pour tout le monde", note: 'A softened negative: you can disagree without sounding blunt.' },
          { fr: 'je comprends que certains jeunes préfèrent', note: 'Acknowledging the other view shows maturity and range.' },
          { fr: "L'essentiel, c'est de choisir ce qui nous convient", note: 'A neat closing sentence that sums up your position.' },
        ],
      },
      {
        kind: 'past',
        question: "Qu'est-ce que tu as fait récemment pour préparer ton avenir ?",
        questionEn: 'What have you done recently to prepare for your future?',
        answer:
          "Le mois dernier, j'ai passé une journée dans une entreprise d'informatique pour mon stage d'observation. J'ai rencontré des ingénieurs et j'ai vu comment ils travaillent en équipe. J'ai même écrit un petit programme avec l'aide d'une employée ! C'était très motivant parce que j'ai compris que ce métier me plaisait vraiment. Après cette expérience, j'ai décidé de choisir les maths et la physique pour l'année prochaine.",
        highlights: [
          { fr: "J'ai rencontré des ingénieurs et j'ai vu", note: 'A chain of perfect-tense verbs moves the story forward.' },
          { fr: "C'était très motivant parce que", note: 'The imperfect for how it felt, followed by a reason.' },
          { fr: "j'ai décidé de choisir", note: 'Décider de + infinitive: ending on a decision links the past to the future.' },
        ],
      },
      {
        kind: 'future',
        question: 'Comment vois-tu ta vie dans dix ans ?',
        questionEn: 'How do you see your life in ten years?',
        answer:
          "Dans dix ans, j'espère avoir un travail intéressant dans une grande entreprise. J'habiterai peut-être à l'étranger parce que j'aimerais découvrir une autre culture. Je serai sans doute plus indépendant(e) et j'aurai mon propre appartement. Si j'ai de la chance, je gagnerai assez d'argent pour voyager chaque année. Mais surtout, je voudrais être heureux(se), quoi que je fasse.",
        highlights: [
          { fr: "J'habiterai peut-être à l'étranger", note: 'The simple future with peut-être: a prediction that stays honest.' },
          { fr: 'Je serai sans doute', note: 'Sans doute (probably) with the future of être.' },
          { fr: "Si j'ai de la chance, je gagnerai", note: 'Si + present, then the future.' },
        ],
      },
    ],
    vocab: [
      { fr: "l'avenir (m.)", en: 'the future' },
      { fr: 'un projet', en: 'plan, project' },
      { fr: 'le métier', en: 'profession' },
      { fr: "un stage", en: 'work placement' },
      { fr: "l'université (f.)", en: 'university' },
      { fr: 'gagner sa vie', en: 'to earn a living' },
      { fr: 'réussir', en: 'to succeed, to pass' },
      { fr: 'le bénévolat', en: 'volunteering' },
    ],
    moreQuestions: [
      "Qu'est-ce que tu veux faire à l'avenir ?",
      "Voudrais-tu aller à l'université ? Pourquoi (pas) ?",
      "Quel est l'emploi de tes rêves et pourquoi ?",
      'Est-ce que tu voudrais avoir ta propre entreprise plus tard ? Pourquoi (pas) ?',
    ],
    related: ['school', 'jobs-and-work', 'emotions-and-feelings'],
  },
  {
    slug: 'jobs-and-work',
    learnKey: 'jobs',
    title: 'Jobs and work',
    frTitle: 'Les métiers',
    areas: ['D'],
    subTopics: ['Work'],
    intro:
      'Jobs and work questions cover your family, your own part-time work and your ambitions. A little vocabulary goes a long way here: say what a job involves, why it appeals to you, and what you would need to do to get it.',
    tips: [
      'Remember: no article after être with a job (« il est médecin »). It is one of the most common slips.',
      'Prepare a job you would like and one you would not, each with a reason.',
      'If you have had any work experience or a small job, prepare it in the imperfect and the perfect: « je servais les clients… j\'ai appris à… ».',
    ],
    answers: [
      {
        kind: 'describe',
        question: 'Que font tes parents comme travail ?',
        questionEn: 'What do your parents do for a living?',
        answer:
          "Mon père est infirmier dans un hôpital et il travaille souvent la nuit. Ma mère est comptable dans une petite entreprise et elle travaille de neuf heures à cinq heures. Ils aiment leur métier, mais ils sont parfois très fatigués. Mon père dit que c'est un travail difficile, mais qu'il est content d'aider les gens. Moi, je ne sais pas encore ce que je ferai plus tard.",
        highlights: [
          { fr: 'Mon père est infirmier', note: 'No article after être with a job: a typical accuracy point.' },
          { fr: 'de neuf heures à cinq heures', note: 'Working hours: a concrete detail that is easy to get right.' },
          { fr: 'ce que je ferai plus tard', note: '« Ce que » plus the future: a natural link to your own plans.' },
        ],
      },
      {
        kind: 'opinion',
        question: 'Préfères-tu travailler seul(e) ou en équipe ?',
        questionEn: 'Do you prefer working alone or in a team?',
        answer:
          "Je préfère travailler en équipe, parce qu'on peut partager les idées et s'entraider quand c'est difficile. Quand je travaille seul(e), je suis souvent distrait(e) et je perds du temps. Cependant, je reconnais que dans une équipe, il y a toujours quelqu'un qui ne fait pas sa part du travail, et ça m'énerve. Pour moi, la solution, c'est de bien se répartir les tâches au début.",
        highlights: [
          { fr: "on peut partager les idées et s'entraider", note: 'A reflexive verb (s\'entraider) used correctly: vocabulary and grammar together.' },
          { fr: 'il y a toujours quelqu\'un qui ne fait pas sa part du travail', note: 'A relative clause with a negative: natural and precise.' },
          { fr: 'la solution, c\'est de bien se répartir les tâches', note: 'Ending with a solution moves from problem to proposal.' },
        ],
      },
      {
        kind: 'past',
        question: 'Est-ce que tu as déjà eu un petit boulot ? Comment c\'était ?',
        questionEn: 'Have you ever had a part-time job? What was it like?',
        answer:
          "Oui, l'été dernier, j'ai travaillé dans le café de mon oncle pendant quatre semaines. Je servais les clients, je nettoyais les tables et parfois je préparais des sandwichs. Au début, c'était difficile parce que je ne connaissais pas les prix. Mais mes collègues étaient gentils et j'ai appris à travailler vite. J'ai gagné deux cents euros, que j'ai économisés pour acheter un ordinateur.",
        highlights: [
          { fr: 'Je servais les clients, je nettoyais les tables', note: 'The imperfect for repeated tasks: « I used to… ».' },
          { fr: "j'ai appris à travailler vite", note: 'Apprendre à + infinitive: what you learned makes the answer reflective.' },
          { fr: "que j'ai économisés", note: '« Que » refers back to « deux cents euros », so the participle agrees: économisés.' },
        ],
      },
      {
        kind: 'future',
        question: 'Quel métier voudrais-tu faire plus tard ?',
        questionEn: 'What job would you like to do later?',
        answer:
          "Plus tard, je voudrais devenir vétérinaire, parce que j'adore les animaux et que je veux les soigner. Pour ça, il faudra d'abord réussir mes examens, puis faire des études de sept ans à l'université. Ce sera long et difficile, mais je suis très motivé(e). Si je ne deviens pas vétérinaire, je travaillerai peut-être dans un refuge. L'important, c'est de faire un métier qui me passionne.",
        highlights: [
          { fr: 'je voudrais devenir vétérinaire', note: 'The conditional of vouloir + devenir: the standard way to say what you want to be.' },
          { fr: "il faudra d'abord réussir mes examens, puis", note: 'The future of falloir sets out the steps in order.' },
          { fr: 'Si je ne deviens pas vétérinaire, je travaillerai peut-être', note: 'A plan B: showing you have thought about alternatives.' },
        ],
      },
    ],
    vocab: [
      { fr: 'le métier / la profession', en: 'profession' },
      { fr: 'un infirmier / une infirmière', en: 'nurse' },
      { fr: 'le salaire', en: 'salary' },
      { fr: 'un petit boulot', en: 'part-time job' },
      { fr: 'le patron / la patronne', en: 'boss' },
      { fr: 'une entreprise', en: 'company' },
      { fr: "un entretien d'embauche", en: 'job interview' },
      { fr: 'le chômage', en: 'unemployment' },
    ],
    moreQuestions: [
      'Penses-tu que tout le monde devrait aller à l\'université ? Pourquoi (pas) ?',
      'Quelles études faut-il faire pour devenir professeur ?',
      'Quel métier trouves-tu le plus dangereux et pourquoi ?',
      "Penses-tu que les vacances et les congés payés sont suffisants dans le monde du travail actuel ? Pourquoi (pas) ?",
    ],
    related: ['future-plans', 'school', 'emotions-and-feelings'],
  },
  {
    slug: 'sports-and-fitness',
    learnKey: 'sports',
    title: 'Sports and fitness',
    frTitle: 'Les sports',
    areas: ['B', 'A'],
    subTopics: ['Leisure time', 'The human body and health'],
    intro:
      'Sport gives you a strong mix of fact, opinion and storytelling. A match you remember, a sport you would like to try and a view on competition are enough to cover every tense you need.',
    tips: [
      'Learn the difference: jouer au (team and ball games), faire du / de la (activities): jouer au basket, faire de la natation.',
      'Prepare a match or event with a score or result, because a number makes a story feel real.',
      'Link sport to health and the future to show you can connect topics: « pour rester en forme, je vais… ».',
    ],
    answers: [
      {
        kind: 'describe',
        question: 'Quel sport pratiques-tu ?',
        questionEn: 'Which sport do you play?',
        answer:
          "Je joue au basket dans l'équipe de mon école. Nous nous entraînons deux fois par semaine, le mardi et le jeudi après les cours, et nous avons un match presque tous les samedis. Je suis meneur de jeu, donc je dois bien passer le ballon et réfléchir vite. À côté, je fais aussi de la natation avec mon frère le dimanche matin. Le sport me donne de l'énergie et il m'aide à oublier le stress des examens.",
        highlights: [
          { fr: 'Je joue au basket', note: 'Jouer à + sport for ball games, versus « faire de la natation » for activities.' },
          { fr: 'Nous nous entraînons deux fois par semaine', note: 'A reflexive verb with a frequency: a natural, precise description.' },
          { fr: "il m'aide à oublier le stress des examens", note: 'Linking sport to a benefit gives a reason beyond « j\'aime ça ».' },
        ],
      },
      {
        kind: 'opinion',
        question: "Les cours de sport devraient-ils être obligatoires à l'école ?",
        questionEn: 'Should PE be compulsory at school?',
        answer:
          "Je pense que oui, parce que beaucoup de jeunes passent trop de temps assis devant un écran. Le sport est bon pour la santé et il aide à mieux se concentrer en classe. En plus, dans une équipe, on apprend à respecter les autres. Cependant, il faudrait proposer plusieurs activités, comme la danse ou le yoga, pour ceux qui n'aiment pas le sport de compétition.",
        highlights: [
          { fr: 'Je pense que oui, parce que', note: 'Answer the question directly and give the reason in the same breath.' },
          { fr: 'il aide à mieux se concentrer en classe', note: 'Aider à + infinitive, plus a concrete benefit.' },
          { fr: 'il faudrait proposer plusieurs activités', note: 'The conditional of falloir: a diplomatic suggestion.' },
        ],
      },
      {
        kind: 'past',
        question: 'Raconte un match ou une compétition dont tu te souviens.',
        questionEn: 'Tell me about a match or competition you remember.',
        answer:
          "L'année dernière, notre équipe a joué la finale du tournoi de l'école. Au début, nous perdions trois à un, et tout le monde était découragé. Mais pendant le dernier quart-temps, j'ai marqué deux paniers et nous avons égalisé. À la dernière minute, mon ami a marqué le panier décisif et nous avons gagné ! Après le match, tout le monde criait de joie. C'est le meilleur souvenir sportif de ma vie.",
        highlights: [
          { fr: 'nous perdions trois à un', note: 'The imperfect for the situation as it was, with the score as a concrete detail.' },
          { fr: "j'ai marqué deux paniers et nous avons égalisé", note: 'The perfect tense for the key events, in order.' },
          { fr: "C'est le meilleur souvenir sportif de ma vie", note: 'A superlative to finish: « le meilleur ».' },
        ],
      },
      {
        kind: 'future',
        question: 'Quel objectif sportif voudrais-tu atteindre ?',
        questionEn: 'What sporting goal would you like to reach?',
        answer:
          "Mon objectif, c'est de courir un semi-marathon dans deux ans. Pour y arriver, je vais commencer à m'entraîner trois fois par semaine dès le mois prochain. Si je m'entraîne sérieusement, je pourrai courir vingt kilomètres sans m'arrêter. Un jour, j'aimerais aussi participer à une course dans une autre ville, peut-être à Paris.",
        highlights: [
          { fr: "Mon objectif, c'est de courir", note: 'A clear sentence frame for stating a goal.' },
          { fr: 'je vais commencer à m\'entraîner', note: 'Near future plus commencer à: concrete and believable.' },
          { fr: "Si je m'entraîne sérieusement, je pourrai", note: 'Si + present, then the future of pouvoir.' },
        ],
      },
    ],
    vocab: [
      { fr: "un sport d'équipe", en: 'team sport' },
      { fr: 'un entraînement', en: 'training session' },
      { fr: 'une équipe', en: 'team' },
      { fr: 'un match', en: 'match' },
      { fr: 'gagner / perdre', en: 'to win / to lose' },
      { fr: 'être en forme', en: 'to be fit' },
      { fr: 'un joueur / une joueuse', en: 'player' },
      { fr: 'un entraîneur', en: 'coach' },
    ],
    moreQuestions: [
      "Pourquoi est-il important de faire du sport ?",
      "Préfères-tu les sports individuels ou les sports d'équipe ? Pourquoi ?",
      "Que penses-tu des salaires extrêmement élevés des sportifs professionnels ?",
      "Quel sport n'aimes-tu pas et pourquoi ?",
    ],
    related: ['hobbies-and-free-time', 'food-and-health', 'emotions-and-feelings'],
  },
  {
    slug: 'emotions-and-feelings',
    learnKey: 'emotions',
    title: 'Emotions and feelings',
    frTitle: 'Les émotions',
    areas: ['B'],
    subTopics: ['Self, family and friends'],
    intro:
      'Questions about feelings reward honest, well-built answers rather than long vocabulary lists. Describe how you feel, say why, and show you can reflect: what you did, and what you would do next time.',
    tips: [
      'Learn six feeling words well, with their feminine forms: heureux / heureuse, fier / fière, inquiet / inquiète, stressé(e), triste, en colère.',
      'Use se sentir and être, not avoir, for feelings (« je me sens fatigué(e) »), and avoir peur / avoir honte as the exceptions.',
      'You decide how personal to be. A balanced, general answer with one example scores as well as a very private one.',
    ],
    answers: [
      {
        kind: 'describe',
        question: 'Comment es-tu comme personne ?',
        questionEn: 'What are you like as a person?',
        answer:
          "Je suis quelqu'un de plutôt calme et sérieux, mais avec mes amis, je deviens bavard(e) et drôle. Je suis aussi assez timide quand je rencontre des gens que je ne connais pas. Ce que j'aime chez moi, c'est que je suis patient(e) et que j'écoute les autres. Par contre, je suis parfois trop perfectionniste, et je m'énerve quand je fais une erreur.",
        highlights: [
          { fr: 'plutôt calme et sérieux', note: '« Plutôt » softens an adjective: more precise than plain « très ».' },
          { fr: 'des gens que je ne connais pas', note: 'A relative clause with que and a negative: natural, accurate French.' },
          { fr: "je m'énerve quand je fais une erreur", note: 'A reflexive verb and a honest admission: personality in one clause.' },
        ],
      },
      {
        kind: 'opinion',
        question: 'Penses-tu qu\'il est important de parler de ses émotions ?',
        questionEn: 'Do you think it is important to talk about your emotions?',
        answer:
          "Oui, je pense qu'il est très important d'en parler. Quand on garde ses problèmes pour soi, on se sent seul et le stress augmente. Parler à un ami ou à un adulte de confiance permet de se sentir mieux et de trouver des solutions. Mais ce n'est pas toujours facile, surtout pour les garçons, parce que certaines personnes pensent que montrer ses émotions est un signe de faiblesse. À mon avis, c'est faux.",
        highlights: [
          { fr: "il est très important d'en parler", note: 'The pronoun « en » replaces « de ses émotions »: concise and fluent.' },
          { fr: 'permet de se sentir mieux et de trouver des solutions', note: 'Permettre de + two infinitives: a developed benefit in one clause.' },
          { fr: "À mon avis, c'est faux.", note: 'A short, clear verdict after balanced reasoning.' },
        ],
      },
      {
        kind: 'past',
        question: 'Raconte un moment où tu as ressenti une grande joie.',
        questionEn: 'Tell me about a time you felt great joy.',
        answer:
          "Le jour de mon quatorzième anniversaire, mes parents m'ont fait une surprise : ils avaient invité tous mes amis à la maison. Quand je suis entré(e) dans le salon, tout le monde a crié « Joyeux anniversaire ! ». J'étais tellement ému(e) que j'ai failli pleurer. Nous avons mangé du gâteau, dansé et ri pendant des heures. C'est l'une des journées les plus heureuses de ma vie.",
        highlights: [
          { fr: 'ils avaient invité tous mes amis', note: 'The pluperfect for something that had already happened before the story began.' },
          { fr: "J'étais tellement ému(e) que j'ai failli pleurer", note: 'Tellement… que, and « faillir » + infinitive (almost did): vivid and idiomatic.' },
          { fr: "l'une des journées les plus heureuses", note: 'A superlative with « l\'une des » to close.' },
        ],
      },
      {
        kind: 'future',
        question: 'Comment vas-tu gérer ton stress pendant les examens ?',
        questionEn: 'How will you manage your stress during your exams?',
        answer:
          "Pendant mes examens, je vais essayer de rester calme. Je ferai un planning pour réviser un peu chaque jour, au lieu de tout faire à la dernière minute. Je dormirai au moins huit heures par nuit et je ferai une promenade après chaque séance de travail. Si je me sens trop stressé(e), je parlerai à mes parents ou à mon professeur. Je sais que ça ira, si je reste organisé(e).",
        highlights: [
          { fr: 'Je ferai un planning', note: 'The simple future of faire (irregular stem: fer-).' },
          { fr: 'au moins huit heures par nuit', note: '« Au moins » with a number: precise and easy to say.' },
          { fr: 'Si je me sens trop stressé(e), je parlerai', note: 'Si + present, then the future.' },
        ],
      },
    ],
    vocab: [
      { fr: 'heureux / heureuse', en: 'happy' },
      { fr: 'triste', en: 'sad' },
      { fr: 'en colère', en: 'angry' },
      { fr: 'inquiet / inquiète', en: 'worried' },
      { fr: 'fier / fière', en: 'proud' },
      { fr: 'stressé(e)', en: 'stressed' },
      { fr: 'se sentir', en: 'to feel' },
      { fr: 'avoir peur', en: 'to be afraid' },
    ],
    moreQuestions: [
      'As-tu déjà eu peur de quelque chose récemment ? Comment as-tu réagi ?',
      'Comment exprimes-tu tes sentiments à tes amis ?',
      "Te sens-tu parfois stressé(e) à cause de l'école ? Comment gères-tu ça ?",
      'Es-tu plutôt quelqu\'un d\'optimiste ou de pessimiste ? Pourquoi ?',
    ],
    related: ['family-and-friends', 'school', 'sports-and-fitness'],
  },
];
