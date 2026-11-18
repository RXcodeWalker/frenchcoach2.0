import type { TopicPage } from '../types';

/** Home and town, food and health, clothes and fashion, shopping and money. */
export const LIVING_TOPICS: readonly TopicPage[] = [
  {
    slug: 'home-and-town',
    learnKey: 'home',
    title: 'Home and town',
    frTitle: 'La maison',
    areas: ['B', 'C'],
    subTopics: ['In the home', 'The built environment', 'People and places'],
    intro:
      'Questions about where you live are an easy way to show description, comparison and opinion. Describe your home and town with specific details, then say what you like, what you would change and where you would live one day.',
    tips: [
      'Describe with « il y a » and place phrases (au rez-de-chaussée, en haut, à côté de) so every sentence adds a fact.',
      'Have a view on your town: one thing you like, one thing missing, one change you would make.',
      'Use the town for the past (what you did last weekend) and the future (where you would like to live).',
    ],
    answers: [
      {
        kind: 'describe',
        question: 'Décris ta maison.',
        questionEn: 'Describe your home.',
        answer:
          "J'habite dans une maison avec mes parents et mon frère. Au rez-de-chaussée, il y a le salon, la cuisine et la salle à manger. En haut, il y a trois chambres et la salle de bains. Ma chambre est petite, mais je l'aime beaucoup parce qu'elle donne sur le jardin. J'ai un bureau, une étagère pleine de livres et un grand lit. Ce que je préfère, c'est le jardin, où on fait des barbecues en été.",
        highlights: [
          { fr: 'Au rez-de-chaussée, il y a', note: '« Il y a » plus a place phrase is the simplest way to describe a space clearly.' },
          { fr: "elle donne sur le jardin", note: 'Donner sur (to look out onto) is a descriptive verb phrase that adds range.' },
          { fr: 'où on fait des barbecues en été', note: '« Où » links two ideas in one sentence and keeps the answer flowing.' },
        ],
      },
      {
        kind: 'opinion',
        question: 'Qu\'est-ce que tu penses de ta ville ?',
        questionEn: 'What do you think of your town?',
        answer:
          "J'aime bien ma ville parce qu'elle est assez grande pour qu'on ne s'ennuie pas, mais pas trop grande. Il y a un centre commercial, un cinéma et un parc où on peut se promener. Cependant, les transports en commun ne sont pas très pratiques le soir, alors je dois toujours demander à mes parents de m'emmener. À mon avis, la ville devrait avoir plus de pistes cyclables pour les jeunes.",
        highlights: [
          { fr: 'Cependant,', note: 'A connector that signals a contrast: the answer now has two sides.' },
          { fr: "je dois toujours demander à mes parents de m'emmener", note: 'Devoir + infinitive, and demander à quelqu\'un de + infinitive: two structures in one sentence.' },
          { fr: 'la ville devrait avoir', note: 'The conditional of devoir is the polite way to make a suggestion.' },
        ],
      },
      {
        kind: 'past',
        question: "Qu'est-ce que tu as fait dans ta ville le week-end dernier ?",
        questionEn: 'What did you do in your town last weekend?',
        answer:
          "Samedi, je suis allé(e) en ville avec ma meilleure amie. D'abord, nous avons fait du shopping dans le centre commercial et j'ai acheté un nouveau jean. Ensuite, nous avons mangé une pizza dans un petit restaurant italien. L'après-midi, nous sommes allé(e)s au cinéma pour voir une comédie. Il y avait beaucoup de monde, mais l'ambiance était super. Je suis rentré(e) vers six heures, très content(e) de ma journée.",
        highlights: [
          { fr: "D'abord, nous avons fait du shopping", note: 'Sequencing words (d\'abord, ensuite) make a story easy to follow.' },
          { fr: "j'ai acheté un nouveau jean", note: 'A concrete detail: specific nouns beat vague ones.' },
          { fr: "Il y avait beaucoup de monde, mais l'ambiance était super", note: 'The imperfect sets the scene while the perfect tells what happened.' },
        ],
      },
      {
        kind: 'future',
        question: 'Où voudrais-tu habiter plus tard ?',
        questionEn: 'Where would you like to live later?',
        answer:
          "Plus tard, j'aimerais habiter dans une grande ville, peut-être à Paris ou à Montréal. Pour moi, ce serait passionnant de vivre dans un endroit avec beaucoup de musées et de restaurants. Après mes études, je chercherai un petit appartement près du centre. Si j'ai assez d'argent, j'achèterai une maison avec un jardin à la campagne pour les week-ends. Mais je resterai toujours proche de ma famille.",
        highlights: [
          { fr: 'ce serait passionnant', note: 'The conditional of être: a short, natural way to imagine something.' },
          { fr: 'je chercherai un petit appartement', note: 'The simple future for a plan you expect to carry out.' },
          { fr: "Si j'ai assez d'argent, j'achèterai", note: 'Si + present, then the future.' },
        ],
      },
    ],
    vocab: [
      { fr: 'la chambre', en: 'bedroom' },
      { fr: 'le salon', en: 'living room' },
      { fr: 'le jardin', en: 'garden' },
      { fr: 'un appartement', en: 'flat' },
      { fr: 'le quartier', en: 'neighbourhood' },
      { fr: 'le centre-ville', en: 'town centre' },
      { fr: 'les transports en commun (m. pl.)', en: 'public transport' },
      { fr: 'habiter', en: 'to live' },
    ],
    moreQuestions: [
      'Préfères-tu vivre dans une maison ou dans un appartement ? Pourquoi ?',
      "Qu'est-ce qu'il y a à faire pour les jeunes dans ta région ?",
      "Quels sont les avantages de vivre dans un village par rapport à une grande ville ?",
      "Qu'est-ce que tu penses de l'architecture de ta ville ?",
    ],
    related: ['family-and-friends', 'transport', 'environment-and-technology'],
  },
  {
    slug: 'food-and-health',
    learnKey: 'food',
    title: 'Food and health',
    frTitle: 'La nourriture',
    areas: ['A'],
    subTopics: ['Food and drink', 'The human body and health'],
    intro:
      'Food and health questions mix everyday vocabulary with opinion: what you eat, what young people should eat, and what you would change. Because everyone has views on food, it is a good place to sound confident.',
    tips: [
      'Know your meals: three or four foods you eat, one you dislike, one favourite meal out.',
      "Learn the exact phrases for health: « j'ai mal à la tête », « je fais attention à ce que je mange ».",
      'Link food to a plan (eat less sugar, learn to cook) so you are ready for a future-tense question.',
    ],
    answers: [
      {
        kind: 'describe',
        question: "Qu'est-ce que tu manges normalement pendant la journée ?",
        questionEn: 'What do you normally eat during the day?',
        answer:
          "Le matin, je prends des céréales avec du lait et je bois un jus d'orange. À midi, je mange à la cantine : souvent du poulet avec des légumes ou des pâtes. Pour le goûter, je prends un fruit ou un yaourt. Le soir, on dîne en famille vers sept heures et c'est ma mère qui prépare le repas. Je n'aime pas le poisson, mais j'adore la cuisine italienne, surtout les pizzas.",
        highlights: [
          { fr: 'je prends des céréales avec du lait et je bois un jus', note: 'Prendre and boire are the two key verbs for food and drink.' },
          { fr: "c'est ma mère qui prépare le repas", note: '« C\'est… qui » puts the emphasis on the person: a small step beyond a plain sentence.' },
          { fr: "Je n'aime pas le poisson, mais j'adore", note: 'Contrasting a dislike with a like gives the answer variety.' },
        ],
      },
      {
        kind: 'opinion',
        question: 'Est-ce que tu penses que les jeunes mangent assez sainement ?',
        questionEn: 'Do you think young people eat healthily enough?',
        answer:
          "Honnêtement, je pense que beaucoup de jeunes ne mangent pas assez sainement. Ils achètent souvent des plats tout prêts ou du fast-food parce que c'est rapide et pas cher. Pourtant, c'est mauvais pour la santé, car il y a trop de sucre et de gras. Dans ma famille, nous essayons de manger cinq fruits et légumes par jour. À mon avis, l'école devrait proposer des cours de cuisine pour apprendre à préparer des repas équilibrés.",
        highlights: [
          { fr: 'Honnêtement, je pense que', note: 'An adverb at the start makes your opinion sound considered.' },
          { fr: 'Pourtant,', note: 'Another contrast word: « pourtant » turns a fact into an argument.' },
          { fr: "l'école devrait proposer", note: 'Ending on a suggestion shows you can move from problem to solution.' },
        ],
      },
      {
        kind: 'past',
        question: 'Raconte un repas que tu as particulièrement aimé.',
        questionEn: 'Tell me about a meal you particularly enjoyed.',
        answer:
          "Pour mon anniversaire, mes parents m'ont emmené(e) dans un restaurant français. J'ai commandé une soupe à l'oignon comme entrée et un steak avec des frites comme plat principal. Pour le dessert, j'ai pris une tarte au citron, qui était délicieuse. Le serveur était très gentil et l'ambiance était agréable. Je me souviens que j'ai tellement mangé que je ne pouvais plus bouger après !",
        highlights: [
          { fr: "J'ai commandé une soupe à l'oignon", note: 'Restaurant verbs in the perfect tense (commander, prendre) tell the story step by step.' },
          { fr: 'qui était délicieuse', note: 'Qui + imperfect describes without starting a new sentence.' },
          { fr: "j'ai tellement mangé que", note: 'Tellement… que (so much that…) adds a result and a bit of humour.' },
        ],
      },
      {
        kind: 'future',
        question: "Qu'est-ce que tu voudrais changer dans ton alimentation ?",
        questionEn: 'What would you like to change in your diet?',
        answer:
          "J'aimerais manger moins de sucre, parce que j'ai souvent mal aux dents. À partir de la semaine prochaine, je vais remplacer les bonbons par des fruits et je vais boire plus d'eau. Si je réussis, je me sentirai plus en forme et j'aurai plus d'énergie pour le sport. Un jour, j'apprendrai aussi à cuisiner des plats végétariens, parce que je voudrais protéger l'environnement.",
        highlights: [
          { fr: "j'ai souvent mal aux dents", note: 'Avoir mal à + body part is the standard way to talk about pain.' },
          { fr: 'je vais remplacer les bonbons par des fruits', note: 'Near future plus remplacer… par: a concrete, believable plan.' },
          { fr: 'Si je réussis, je me sentirai', note: 'Si + present, then the future.' },
        ],
      },
    ],
    vocab: [
      { fr: 'le petit-déjeuner', en: 'breakfast' },
      { fr: 'le goûter', en: 'afternoon snack' },
      { fr: 'sain(e)', en: 'healthy' },
      { fr: 'équilibré(e)', en: 'balanced' },
      { fr: 'avoir mal à', en: 'to have a pain in' },
      { fr: 'le sucre', en: 'sugar' },
      { fr: 'une boisson', en: 'drink' },
      { fr: 'cuisiner', en: 'to cook' },
    ],
    moreQuestions: [
      'Est-ce que tu fais attention à ta santé ? Comment ?',
      "Qu'est-ce que tu as mangé hier soir ?",
      'Est-ce que tu préfères manger à la maison ou au restaurant ? Pourquoi ?',
      "Est-il important d'apprendre à cuisiner à l'école ? Pourquoi ?",
    ],
    related: ['sports-and-fitness', 'shopping-and-money', 'home-and-town'],
  },
  {
    slug: 'clothes-and-fashion',
    learnKey: 'clothes',
    title: 'Clothes and fashion',
    frTitle: 'Les vêtements',
    areas: ['B'],
    subTopics: ['Clothes and accessories'],
    intro:
      'Clothes questions are short and concrete, which makes them a good chance to be accurate: gender and agreement, colours, sizes and prices. Add an opinion about fashion or the environment and the topic reaches a higher band.',
    tips: [
      'Practise adjective agreement out loud: une chemise blanche, un pantalon noir, des chaussures confortables.',
      'Learn porter and mettre, and the difference between essayer (to try on) and porter (to wear).',
      'Be ready to give a view on brands, uniform or second-hand clothes, with one reason you could defend.',
    ],
    answers: [
      {
        kind: 'describe',
        question: "Qu'est-ce que tu portes normalement le week-end ?",
        questionEn: 'What do you normally wear at the weekend?',
        answer:
          "Le week-end, je porte surtout un jean avec un tee-shirt et des baskets, parce que c'est confortable. Quand il fait froid, j'ajoute un gros pull ou un sweat à capuche. Pour sortir avec mes amis, je mets parfois une chemise ou ma veste en cuir. Je n'aime pas les vêtements trop serrés ni les couleurs trop vives. Mon accessoire préféré, c'est ma casquette noire, que je porte presque tous les jours.",
        highlights: [
          { fr: 'je porte surtout un jean', note: 'Porter for what you wear, surtout to show what you wear most.' },
          { fr: 'je mets parfois une chemise', note: 'Mettre is the second key verb: it also means to put on.' },
          { fr: 'que je porte presque tous les jours', note: 'A relative clause (que) lets you add detail without a new sentence.' },
        ],
      },
      {
        kind: 'opinion',
        question: 'Est-ce que la mode est importante pour toi ?',
        questionEn: 'Is fashion important to you?',
        answer:
          "Pour moi, la mode n'est pas très importante, mais je veux quand même être bien habillé(e). Je pense que les vêtements montrent un peu notre personnalité. Cependant, je n'aime pas dépenser beaucoup d'argent pour une marque, parce qu'une veste chère n'est pas toujours de meilleure qualité. En plus, la mode change très vite, et c'est mauvais pour l'environnement quand on jette des vêtements presque neufs.",
        highlights: [
          { fr: 'mais je veux quand même être bien habillé(e)', note: 'Quand même keeps the answer balanced instead of absolute.' },
          { fr: "de meilleure qualité", note: 'Meilleur is the irregular comparative of bon: easy to get wrong, so it earns credit.' },
          { fr: "c'est mauvais pour l'environnement quand on jette", note: 'Linking clothes to the environment shows you can broaden an idea.' },
        ],
      },
      {
        kind: 'past',
        question: 'Raconte la dernière fois que tu as acheté des vêtements.',
        questionEn: 'Tell me about the last time you bought clothes.',
        answer:
          "Le mois dernier, je suis allé(e) en ville avec ma mère pour acheter une robe pour le mariage de ma cousine. Nous avons visité cinq magasins, mais je n'ai rien trouvé qui me plaisait. Finalement, dans une petite boutique, j'ai essayé une robe bleue qui m'allait parfaitement. Elle coûtait soixante euros, ce qui n'était pas donné, mais ma mère a payé la moitié. J'étais très content(e) !",
        highlights: [
          { fr: "je n'ai rien trouvé", note: "In the perfect tense ne… rien wraps around the auxiliary: « n'ai rien trouvé »." },
          { fr: "qui m'allait parfaitement", note: 'Aller (to suit, to fit) in the imperfect: a natural, idiomatic phrase.' },
          { fr: 'Elle coûtait soixante euros', note: 'The imperfect for a price or description, the perfect for what happened next.' },
        ],
      },
      {
        kind: 'future',
        question: "Qu'est-ce que tu vas porter pour ta prochaine grande occasion ?",
        questionEn: 'What are you going to wear for your next big occasion?',
        answer:
          "Le mois prochain, il y a le bal de fin d'année et je vais porter une chemise blanche et un pantalon noir, avec des chaussures élégantes. Je vais aussi acheter une nouvelle cravate, peut-être rouge. Si j'avais plus d'argent, j'achèterais un costume, mais c'est trop cher. J'espère que je serai à l'aise, parce que je déteste les chaussures de ville !",
        highlights: [
          { fr: 'je vais porter', note: 'The near future for a plan with a date.' },
          { fr: "Si j'avais plus d'argent, j'achèterais", note: 'Si + imperfect, then the conditional.' },
          { fr: "J'espère que je serai à l'aise", note: 'Espérer que is followed by the future: a small accuracy point.' },
        ],
      },
    ],
    vocab: [
      { fr: 'un pantalon', en: 'trousers' },
      { fr: 'une chemise', en: 'shirt' },
      { fr: 'des baskets (f. pl.)', en: 'trainers' },
      { fr: 'une veste', en: 'jacket' },
      { fr: 'porter / mettre', en: 'to wear / to put on' },
      { fr: 'essayer', en: 'to try on' },
      { fr: 'la taille', en: 'size' },
      { fr: 'la marque', en: 'brand' },
    ],
    moreQuestions: [
      'Tu préfères porter des vêtements décontractés ou élégants ?',
      "Qu'est-ce que tu penses de la mode rapide (fast fashion) ?",
      "Est-ce que tu achètes des vêtements d'occasion ? Pourquoi (pas) ?",
      'Dans quelle mesure les vêtements reflètent-ils notre identité ?',
    ],
    related: ['shopping-and-money', 'environment-and-technology', 'hobbies-and-free-time'],
  },
  {
    slug: 'shopping-and-money',
    learnKey: 'shopping',
    title: 'Shopping and money',
    frTitle: 'Les achats',
    areas: ['B', 'C'],
    subTopics: ['Clothes and accessories', 'The built environment'],
    intro:
      'Shopping and money questions are practical, and practical questions reward clear, organised answers. They also lead naturally to opinions about advertising, online shopping and saving. The syllabus has no heading called shopping, so it appears through clothes, the built environment and role plays.',
    tips: [
      'Know the money verbs: acheter, dépenser, économiser, coûter, payer. Use each in a sentence.',
      'Have a position on online versus in-store shopping and one personal example to back it up.',
      'Use a story of one purchase (good or regretted) for the past, and a « si j\'avais… » dream for the conditional.',
    ],
    answers: [
      {
        kind: 'describe',
        question: "Qu'est-ce que tu fais de ton argent de poche ?",
        questionEn: 'What do you do with your pocket money?',
        answer:
          "Je reçois dix euros par semaine de mes parents. J'en dépense la moitié, surtout pour des snacks, des magazines ou des sorties au cinéma avec mes amis. Le reste, je le mets de côté dans une tirelire pour acheter quelque chose de plus grand. En ce moment, j'économise pour des écouteurs sans fil. Pour gagner un peu plus, je promène aussi le chien de mon voisin le samedi.",
        highlights: [
          { fr: "J'en dépense la moitié", note: '« En » replaces « de l\'argent »: pronouns make your French sound fluent.' },
          { fr: 'je le mets de côté', note: 'Mettre de côté (to put aside) is the natural way to say you save.' },
          { fr: 'Pour gagner un peu plus', note: 'Pour + infinitive gives a purpose without extra words.' },
        ],
      },
      {
        kind: 'opinion',
        question: 'Préfères-tu acheter en ligne ou dans les magasins ?',
        questionEn: 'Do you prefer to buy online or in shops?',
        answer:
          "Je préfère acheter dans les magasins, parce que je peux voir et toucher les produits avant de les acheter. Pour les vêtements, c'est essentiel d'essayer, sinon on risque de se tromper de taille. Cependant, je reconnais que les achats en ligne sont plus pratiques et souvent moins chers. En plus, on évite la foule le samedi. Pour les livres et la musique, j'achète presque toujours en ligne.",
        highlights: [
          { fr: 'avant de les acheter', note: 'Avant de + infinitive: a useful structure that is easy to get right.' },
          { fr: 'sinon on risque de se tromper de taille', note: '« Sinon » and « risquer de » give a reason with a consequence.' },
          { fr: 'Cependant, je reconnais que', note: 'Admitting the other side shows balance, which examiners reward.' },
        ],
      },
      {
        kind: 'past',
        question: 'Raconte un achat que tu as regretté ou dont tu es content(e).',
        questionEn: 'Tell me about a purchase you regretted or are happy with.',
        answer:
          "Le mois dernier, j'ai acheté des baskets en solde, parce qu'elles étaient à moitié prix. J'étais très content(e) au début, mais après deux semaines, la semelle s'est décollée. Je suis retourné(e) au magasin avec le ticket de caisse et la vendeuse m'a proposé de les échanger. Finalement, j'ai pris une autre paire, plus solide. Maintenant, je regarde toujours la qualité avant de regarder le prix.",
        highlights: [
          { fr: 'en solde', note: 'Shopping vocabulary: sales, half price, receipt. The detail makes the story believable.' },
          { fr: 'avec le ticket de caisse', note: 'A specific noun: precise vocabulary lifts a simple story.' },
          { fr: 'Maintenant, je regarde toujours la qualité', note: 'Finish by linking the past to the present: what you learned.' },
        ],
      },
      {
        kind: 'future',
        question: "Qu'est-ce que tu achèterais si tu gagnais beaucoup d'argent ?",
        questionEn: 'What would you buy if you won a lot of money?',
        answer:
          "Si je gagnais beaucoup d'argent, j'achèterais d'abord une maison pour mes parents, parce qu'ils travaillent dur depuis longtemps. Ensuite, je m'offrirais un voyage autour du monde avec mes amis. Je mettrais aussi une partie de l'argent à la banque pour mes études. Et je donnerais un peu à une association qui aide les enfants. À mon avis, l'argent est utile, mais il ne fait pas le bonheur.",
        highlights: [
          { fr: "Si je gagnais beaucoup d'argent, j'achèterais", note: 'Si + imperfect, then the conditional.' },
          { fr: "je m'offrirais un voyage", note: 'A reflexive conditional: treating yourself, in good French.' },
          { fr: 'il ne fait pas le bonheur', note: 'A well-known saying closes the answer with a clear opinion.' },
        ],
      },
    ],
    vocab: [
      { fr: 'le magasin', en: 'shop' },
      { fr: 'le prix', en: 'price' },
      { fr: 'cher / chère', en: 'expensive' },
      { fr: 'bon marché', en: 'cheap' },
      { fr: "l'argent de poche (m.)", en: 'pocket money' },
      { fr: 'dépenser / économiser', en: 'to spend / to save' },
      { fr: 'les soldes (m. pl.)', en: 'the sales' },
      { fr: 'la caisse', en: 'till, checkout' },
    ],
    moreQuestions: [
      'Aimes-tu faire du shopping ? Pourquoi (pas) ?',
      "Penses-tu que la publicité influence trop nos habitudes d'achat ? Pourquoi (pas) ?",
      'Comment décides-tu si un achat en vaut vraiment la peine ?',
      'Que penses-tu des influenceurs qui font la promotion de produits sur les réseaux sociaux ?',
    ],
    related: ['clothes-and-fashion', 'food-and-health', 'home-and-town'],
  },
];
