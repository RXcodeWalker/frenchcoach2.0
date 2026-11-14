/**
 * Show segments for editions 1–7 (daily-news §7). Hand-written; covered by the
 * story's `reviewed` flag (content-authoring §17).
 */
import type { NewsEditionSegments } from '../types';

export const SEGMENTS_WEEK1: Record<string, NewsEditionSegments> = {
  'bees-on-roofs': {
    examArea: 'C',
    learnTopic: 'animals',
    levels: {
      a2: {
        fake: {
          sentence: 2,
          fr: 'Chaque été, les abeilles font quinze kilos de miel.',
          en: 'Every summer, the bees make fifteen kilos of honey.',
          options: ['Where the hives are', 'How much honey the bees make', 'What the restaurant makes'],
          answer: 1,
        },
        interview: {
          role: { fr: "Tu es le chef du restaurant de l'hôtel.", en: "You are the chef of the hotel's restaurant." },
          questions: [
            {
              fr: "Qu'est-ce que vous faites avec le miel ?",
              en: 'What do you do with the honey?',
              kind: 'describe',
              starters: ['Avec le miel, je fais…', "J'utilise le miel pour…"],
              model: "Avec le miel, je fais des gâteaux et des glaces. Les clients adorent ça !",
            },
            {
              fr: 'Quel dessert avez-vous préparé hier ?',
              en: 'What dessert did you make yesterday?',
              kind: 'past',
              starters: ["Hier, j'ai préparé…", "Hier, j'ai fait…"],
              model: "Hier, j'ai préparé une tarte aux pommes avec du miel. C'était délicieux.",
            },
            {
              fr: 'Vous aimez avoir des abeilles sur le toit ? Pourquoi ?',
              en: 'Do you like having bees on the roof? Why?',
              kind: 'opinion',
              starters: ["Oui, j'aime ça parce que…", "Je trouve ça…"],
              model: "Oui, j'aime ça parce que le miel est frais et c'est bon pour la nature.",
            },
          ],
        },
        debate: {
          motion: { fr: 'Tu voudrais des abeilles sur le toit de ton école ?', en: 'Would you want bees on your school roof?' },
          for: {
            starters: ['Oui, parce que…', "C'est une bonne idée car…"],
            model: "Oui, parce que les élèves peuvent apprendre la nature. Et on peut manger le miel !",
          },
          against: {
            starters: ['Non, parce que…', "J'ai peur que…"],
            model: "Non, parce que les abeilles piquent. Certains élèves ont peur des abeilles.",
          },
        },
      },
      b1: {
        fake: {
          sentence: 2,
          fr: "Un apiculteur vient chaque mois pour s'occuper d'elles.",
          en: 'A beekeeper comes every month to look after them.',
          options: ['Where the hotel is', 'How often the beekeeper comes', 'When the guests eat the honey'],
          answer: 1,
        },
        interview: {
          role: { fr: "Tu es l'apiculteur qui s'occupe des ruches de l'hôtel.", en: "You are the beekeeper who looks after the hotel's hives." },
          questions: [
            {
              fr: 'Comment se passe une journée sur le toit avec les abeilles ?',
              en: 'What is a day on the roof with the bees like?',
              kind: 'describe',
              starters: ["D'abord, je…", "Normalement, je commence par…"],
              model: "D'abord, je mets ma combinaison. Ensuite, j'ouvre les ruches et je vérifie que les abeilles vont bien.",
            },
            {
              fr: 'Comment avez-vous commencé ce métier ?',
              en: 'How did you start this job?',
              kind: 'past',
              starters: ["Quand j'étais jeune,…", "J'ai commencé il y a…"],
              model: "Quand j'étais petit, mon grand-père avait des ruches à la campagne. J'ai commencé avec lui il y a vingt ans.",
            },
            {
              fr: "Qu'est-ce que vous allez faire l'année prochaine ?",
              en: 'What are you going to do next year?',
              kind: 'future',
              starters: ["L'année prochaine, je vais…", "J'aimerais…"],
              model: "L'année prochaine, je vais installer des ruches sur le toit d'une école pour montrer les abeilles aux enfants.",
            },
          ],
        },
        debate: {
          motion: { fr: "Est-ce une bonne idée d'avoir des abeilles en ville ?", en: 'Is it a good idea to have bees in the city?' },
          for: {
            starters: ["À mon avis, c'est une bonne idée car…", 'Je pense que…'],
            model: "À mon avis, c'est une bonne idée car il y a beaucoup de fleurs dans les parcs. En plus, le miel de la ville est délicieux.",
          },
          against: {
            starters: ["Je ne suis pas d'accord parce que…", "Le problème, c'est que…"],
            model: "Je ne suis pas d'accord parce que les abeilles peuvent piquer les gens. Le problème, c'est qu'il y a trop de monde en ville.",
          },
        },
      },
      b2: {
        fake: {
          sentence: 2,
          fr: 'Contrairement à la campagne, la ville utilise beaucoup de pesticides, ce qui protège les abeilles.',
          en: 'Unlike the countryside, the city uses lots of pesticides, which protects the bees.',
          options: ['How many hives Paris has', 'How much pesticide the city uses', 'Who wants to regulate the hives'],
          answer: 1,
        },
        interview: {
          role: { fr: 'Tu es une scientifique qui étudie les abeilles à Paris.', en: 'You are a scientist who studies bees in Paris.' },
          questions: [
            {
              fr: 'Pourquoi la ville est-elle un bon endroit pour les abeilles ?',
              en: 'Why is the city a good place for bees?',
              kind: 'describe',
              starters: ['La ville est idéale parce que…', "Contrairement à la campagne,…"],
              model: "Contrairement à la campagne, on utilise peu de pesticides en ville. En plus, les parcs offrent des fleurs différentes toute l'année.",
            },
            {
              fr: "Qu'avez-vous découvert pendant votre dernière étude ?",
              en: 'What did you discover during your last study?',
              kind: 'past',
              starters: ["Nous avons découvert que…", "Pendant l'étude, j'ai remarqué que…"],
              model: "Nous avons découvert que les abeilles sauvages trouvaient moins de nourriture près des toits avec beaucoup de ruches. Ça m'a vraiment surprise.",
            },
            {
              fr: "Que faudrait-il faire à l'avenir, selon vous ?",
              en: 'What should be done in the future, in your view?',
              kind: 'future',
              starters: ["À l'avenir, il faudrait…", 'Je proposerais de…'],
              model: "À l'avenir, il faudrait limiter le nombre de ruches et planter plus de fleurs. Comme ça, toutes les abeilles pourront vivre ensemble.",
            },
          ],
        },
        debate: {
          motion: { fr: 'Faut-il limiter le nombre de ruches en ville ?', en: 'Should the number of hives in the city be limited?' },
          for: {
            starters: ['Il faudrait les limiter parce que…', 'Même si le miel est bon,…'],
            model: "Il faudrait les limiter parce que les insectes sauvages ont besoin de nourriture eux aussi. Même si le miel est bon, la nature doit rester équilibrée.",
          },
          against: {
            starters: ["Je ne suis pas d'accord, car…", "Au contraire,…"],
            model: "Je ne suis pas d'accord, car les ruches permettent aux enfants de découvrir la nature. Au contraire, on devrait planter plus de fleurs pour tout le monde.",
          },
        },
      },
    },
  },

  'solar-boat': {
    examArea: 'E',
    learnTopic: 'environment',
    levels: {
      a2: {
        fake: {
          sentence: 2,
          fr: 'Le voyage a duré huit jours.',
          en: 'The journey lasted eight days.',
          options: ['How long the journey lasted', 'Where the sailors arrived', 'What energy the boat uses'],
          answer: 0,
        },
        interview: {
          role: { fr: "Tu es un des deux marins du bateau solaire.", en: 'You are one of the two sailors on the solar boat.' },
          questions: [
            {
              fr: 'Comment est votre bateau ?',
              en: 'What is your boat like?',
              kind: 'describe',
              starters: ['Notre bateau est…', 'Sur le bateau, il y a…'],
              model: "Notre bateau est petit et blanc. Sur le toit, il y a des panneaux solaires.",
            },
            {
              fr: "Qu'est-ce que vous avez mangé pendant le voyage ?",
              en: 'What did you eat during the journey?',
              kind: 'past',
              starters: ["Nous avons mangé…", "J'ai mangé…"],
              model: "Nous avons mangé des pâtes, du riz et beaucoup de poisson. J'ai aussi mangé du chocolat !",
            },
            {
              fr: "Vous avez aimé l'aventure ? Pourquoi ?",
              en: 'Did you enjoy the adventure? Why?',
              kind: 'opinion',
              starters: ["Oui, j'ai adoré parce que…", "C'était…"],
              model: "Oui, j'ai adoré parce que la mer était magnifique. Mais c'était aussi très fatigant.",
            },
          ],
        },
        debate: {
          motion: { fr: 'Tu aimerais faire un long voyage en bateau ?', en: 'Would you like to go on a long boat trip?' },
          for: {
            starters: ["Oui, j'aimerais bien parce que…", "Ce serait…"],
            model: "Oui, j'aimerais bien parce que j'adore la mer. Ce serait une grande aventure.",
          },
          against: {
            starters: ['Non, parce que…', "J'ai peur de…"],
            model: "Non, parce que j'ai le mal de mer. Et vingt-huit jours, c'est trop long !",
          },
        },
      },
      b1: {
        fake: {
          sentence: 1,
          fr: 'Parti des îles Canaries, il est arrivé en Martinique après vingt-huit jours de mer.',
          en: 'Leaving from the Canary Islands, it reached Martinique after twenty-eight days at sea.',
          options: ['Where the boat arrived', 'What covers the roof', 'How the boat moves at night'],
          answer: 0,
        },
        interview: {
          role: { fr: 'Tu es une des deux marins du catamaran solaire.', en: 'You are one of the two sailors on the solar catamaran.' },
          questions: [
            {
              fr: 'Comment fonctionne votre bateau ?',
              en: 'How does your boat work?',
              kind: 'describe',
              starters: ['Le bateau fonctionne grâce à…', 'Sur le toit, il y a…'],
              model: "Le bateau fonctionne grâce au soleil. Sur le toit, il y a des panneaux qui chargent les batteries pour la nuit.",
            },
            {
              fr: 'Quel a été le meilleur moment du voyage ?',
              en: 'What was the best moment of the trip?',
              kind: 'past',
              starters: ['Le meilleur moment, c\'était quand…', 'Un jour, nous avons vu…'],
              model: "Le meilleur moment, c'était quand nous avons vu des dauphins à côté du bateau. Nous avons pris beaucoup de photos.",
            },
            {
              fr: 'Quel sera votre prochain voyage ?',
              en: 'What will your next trip be?',
              kind: 'future',
              starters: ['Notre prochain voyage sera…', "L'année prochaine, nous allons…"],
              model: "L'année prochaine, nous allons traverser le Pacifique. Ce sera plus long, mais nous sommes prêts.",
            },
          ],
        },
        debate: {
          motion: { fr: 'Faut-il remplacer les avions par des bateaux solaires pour voyager ?', en: 'Should solar boats replace planes for travel?' },
          for: {
            starters: ['Oui, je pense que…', "C'est important parce que…"],
            model: "Oui, je pense que c'est important parce que les avions polluent beaucoup. Avec un bateau solaire, on voyage sans polluer.",
          },
          against: {
            starters: ['Non, parce que…', "Ce n'est pas réaliste car…"],
            model: "Non, ce n'est pas réaliste car le bateau est très lent. Vingt-huit jours, c'est trop long pour des vacances.",
          },
        },
      },
      b2: {
        fake: {
          sentence: 2,
          fr: "Le principal défi était la météo : plusieurs jours de tempête ont obligé l'équipage à ralentir pour économiser les batteries.",
          en: 'The main challenge was the weather: several stormy days forced the crew to slow down to save the batteries.',
          options: ['Where the boat left from', 'What kind of weather slowed them down', 'What the sailors hope for'],
          answer: 1,
        },
        interview: {
          role: { fr: "Tu es un des deux navigateurs du catamaran solaire.", en: 'You are one of the two sailors of the solar catamaran.' },
          questions: [
            {
              fr: "Qu'est-ce qui était le plus difficile à bord ?",
              en: 'What was the hardest thing on board?',
              kind: 'describe',
              starters: ['Le plus difficile, c\'était…', 'Ce qui était dur, c\'est que…'],
              model: "Le plus difficile, c'était la météo. Quand il n'y avait pas de soleil, nous devions ralentir et faire très attention aux batteries.",
            },
            {
              fr: "Comment avez-vous réagi quand les nuages sont arrivés ?",
              en: 'How did you react when the clouds came?',
              kind: 'past',
              starters: ["Au début, nous avons eu peur, mais…", 'Nous avons décidé de…'],
              model: "Au début, nous avons eu un peu peur, mais nous avons décidé de ralentir. Nous avons économisé l'énergie et finalement tout s'est bien passé.",
            },
            {
              fr: "Comment le transport maritime pourrait-il changer à l'avenir ?",
              en: 'How could shipping change in the future?',
              kind: 'future',
              starters: ["À l'avenir, les bateaux pourraient…", "J'espère que…"],
              model: "J'espère qu'à l'avenir, les grands bateaux utiliseront le soleil et le vent. Comme ça, ils pollueront beaucoup moins.",
            },
          ],
        },
        debate: {
          motion: { fr: 'Faut-il obliger les grands bateaux à utiliser des énergies propres ?', en: 'Should big ships be forced to use clean energy?' },
          for: {
            starters: ['Il faudrait les obliger parce que…', 'Le transport maritime est responsable de…'],
            model: "Il faudrait les obliger parce que le transport maritime pollue énormément. Si on ne fait rien, la planète va continuer à se réchauffer.",
          },
          against: {
            starters: ["Ce serait difficile car…", "Même si l'idée est bonne,…"],
            model: "Même si l'idée est bonne, ce serait difficile car l'énergie solaire ne suffit pas pour un énorme bateau. Les prix des produits augmenteraient aussi.",
          },
        },
      },
    },
  },

  'astronaut-call': {
    examArea: 'A',
    learnTopic: 'school',
    levels: {
      a2: {
        fake: {
          sentence: 2,
          fr: 'La conversation a duré une heure, par radio.',
          en: 'The conversation lasted an hour, by radio.',
          options: ['Where the pupils are from', 'How long the conversation lasted', 'What the pupils asked about'],
          answer: 1,
        },
        interview: {
          role: { fr: "Tu es un des élèves de Lyon qui ont parlé avec l'astronaute.", en: 'You are one of the pupils from Lyon who spoke with the astronaut.' },
          questions: [
            {
              fr: "Comment est ton école ?",
              en: 'What is your school like?',
              kind: 'describe',
              starters: ['Mon école est…', 'Dans mon école, il y a…'],
              model: "Mon école est grande et moderne. Dans mon école, il y a une radio spéciale pour parler avec l'espace.",
            },
            {
              fr: "Quelle question as-tu posée à l'astronaute ?",
              en: 'What question did you ask the astronaut?',
              kind: 'past',
              starters: ["J'ai demandé…", "Ma question était…"],
              model: "J'ai demandé comment il dort dans l'espace. Il a dit qu'il dort dans un sac attaché au mur.",
            },
            {
              fr: "Tu voudrais aller dans l'espace ? Pourquoi ?",
              en: 'Would you like to go to space? Why?',
              kind: 'opinion',
              starters: ["Oui, j'aimerais bien parce que…", 'Non, parce que…'],
              model: "Oui, j'aimerais bien parce que la Terre doit être très belle de là-haut.",
            },
          ],
        },
        debate: {
          motion: { fr: 'Les cours de sciences sont-ils intéressants à ton école ?', en: 'Are science lessons interesting at your school?' },
          for: {
            starters: ['Oui, parce que…', "J'aime les sciences car…"],
            model: "Oui, parce qu'on fait des expériences. J'aime les sciences car on apprend des choses sur l'espace.",
          },
          against: {
            starters: ['Non, parce que…', "Je trouve les sciences…"],
            model: "Non, parce que c'est difficile. Je trouve les sciences un peu ennuyeuses.",
          },
        },
      },
      b1: {
        fake: {
          sentence: 2,
          fr: 'Les élèves avaient préparé cinquante questions.',
          en: 'The pupils had prepared fifty questions.',
          options: ['How the pupils reached the station', 'How many questions they prepared', 'What they most wanted to know'],
          answer: 1,
        },
        interview: {
          role: { fr: "Tu es l'astronaute qui a parlé avec les collégiens.", en: 'You are the astronaut who spoke with the pupils.' },
          questions: [
            {
              fr: "Comment est la vie dans la Station spatiale ?",
              en: 'What is life like in the Space Station?',
              kind: 'describe',
              starters: ['Dans la station, on…', 'Chaque jour, je…'],
              model: "Dans la station, on flotte tout le temps. Chaque jour, je fais des expériences et deux heures de sport.",
            },
            {
              fr: "Qu'avez-vous pensé des questions des élèves ?",
              en: "What did you think of the pupils' questions?",
              kind: 'past',
              starters: ["J'ai trouvé leurs questions…", "Une question m'a surpris :…"],
              model: "J'ai trouvé leurs questions très intelligentes. Une élève m'a demandé si je pleurais dans l'espace, et ça m'a fait rire.",
            },
            {
              fr: "Qu'est-ce que vous ferez quand vous rentrerez sur Terre ?",
              en: 'What will you do when you get back to Earth?',
              kind: 'future',
              starters: ['Quand je rentrerai, je…', "D'abord, je vais…"],
              model: "Quand je rentrerai, je mangerai une vraie pizza. Ensuite, je vais visiter le collège de Lyon pour rencontrer les élèves.",
            },
          ],
        },
        debate: {
          motion: { fr: "Faut-il dépenser beaucoup d'argent pour explorer l'espace ?", en: 'Should we spend a lot of money exploring space?' },
          for: {
            starters: ['Oui, je pense que…', "C'est utile parce que…"],
            model: "Oui, je pense que c'est utile parce qu'on découvre de nouvelles technologies. En plus, ça donne envie aux jeunes d'étudier les sciences.",
          },
          against: {
            starters: ["Non, je trouve que…", "Il vaudrait mieux…"],
            model: "Non, je trouve que c'est trop cher. Il vaudrait mieux utiliser cet argent pour les écoles et les hôpitaux.",
          },
        },
      },
      b2: {
        fake: {
          sentence: 3,
          fr: "Les élèves ont appris que les astronautes s'attachent pour manger et que la nourriture perd souvent son goût en apesanteur.",
          en: 'The pupils learned that astronauts strap themselves in to eat and that food often loses its taste in weightlessness.',
          options: ['How long the contact lasted', 'Why astronauts strap themselves in', 'How high the station is'],
          answer: 1,
        },
        interview: {
          role: { fr: "Tu es la professeure de sciences qui a organisé l'appel.", en: 'You are the science teacher who organised the call.' },
          questions: [
            {
              fr: "Pourquoi avez-vous voulu organiser ce projet ?",
              en: 'Why did you want to organise this project?',
              kind: 'describe',
              starters: ["Je voulais que mes élèves…", "L'objectif était de…"],
              model: "Je voulais que mes élèves comprennent que les sciences ne sont pas seulement dans les livres. L'objectif était de les faire rêver.",
            },
            {
              fr: "Comment les élèves ont-ils réagi pendant l'appel ?",
              en: 'How did the pupils react during the call?',
              kind: 'past',
              starters: ['Au début, ils étaient…', "Ce qui m'a frappée, c'est que…"],
              model: "Au début, ils étaient très timides. Ce qui m'a frappée, c'est qu'après deux minutes, ils posaient des questions sans arrêt.",
            },
            {
              fr: "Quel projet aimeriez-vous faire l'année prochaine ?",
              en: 'What project would you like to do next year?',
              kind: 'future',
              starters: ["L'année prochaine, j'aimerais…", 'Si possible, nous…'],
              model: "L'année prochaine, j'aimerais que la classe construise un petit satellite. Si possible, nous l'enverrons dans l'espace avec une université.",
            },
          ],
        },
        debate: {
          motion: { fr: "Devrait-on envoyer des touristes dans l'espace ?", en: 'Should tourists be sent into space?' },
          for: {
            starters: ['Oui, car…', "Ce serait une chance de…"],
            model: "Oui, car voir la Terre d'en haut change la façon de penser. Ce serait une chance de comprendre que notre planète est fragile.",
          },
          against: {
            starters: ["Non, parce que…", "Je suis contre, étant donné que…"],
            model: "Je suis contre, étant donné que les fusées polluent énormément. En plus, seules les personnes très riches pourraient y aller.",
          },
        },
      },
    },
  },

  'village-football': {
    examArea: 'B',
    learnTopic: 'sports',
    levels: {
      a2: {
        fake: {
          sentence: 2,
          fr: 'En finale, elles ont gagné cinq à un.',
          en: 'In the final, they won five-one.',
          options: ['How many people live in the village', 'The score of the final', 'Where the party was'],
          answer: 1,
        },
        interview: {
          role: { fr: "Tu es une des joueuses de l'équipe.", en: 'You are one of the players in the team.' },
          questions: [
            {
              fr: 'Comment est ton équipe ?',
              en: 'What is your team like?',
              kind: 'describe',
              starters: ['Mon équipe est…', 'Nous sommes…'],
              model: "Mon équipe est super. Nous sommes quinze filles et nous sommes toutes amies.",
            },
            {
              fr: "Qu'est-ce que tu as fait après la finale ?",
              en: 'What did you do after the final?',
              kind: 'past',
              starters: ["Après la finale, j'ai…", 'Nous avons…'],
              model: "Après la finale, nous avons dansé sur la place. J'ai mangé une crêpe avec ma famille.",
            },
            {
              fr: 'Pourquoi aimes-tu le football ?',
              en: 'Why do you like football?',
              kind: 'opinion',
              starters: ["J'aime le football parce que…", "Pour moi, le foot, c'est…"],
              model: "J'aime le football parce que c'est un sport d'équipe. Et j'adore marquer des buts !",
            },
          ],
        },
        debate: {
          motion: { fr: 'Le sport en équipe est-il meilleur que le sport seul ?', en: 'Is team sport better than sport on your own?' },
          for: {
            starters: ['Oui, parce que…', 'En équipe, on…'],
            model: "Oui, parce qu'en équipe, on se fait des amis. C'est plus amusant.",
          },
          against: {
            starters: ['Non, parce que…', 'Seul, on…'],
            model: "Non, parce que seul, on choisit quand on fait du sport. Je préfère courir seul.",
          },
        },
      },
      b1: {
        fake: {
          sentence: 1,
          fr: "Personne ne s'y attendait, car le club n'existe que depuis trois mois.",
          en: 'Nobody expected it, because the club has only existed for three months.',
          options: ['How long the club has existed', 'Who they beat in the final', 'What happened that evening'],
          answer: 0,
        },
        interview: {
          role: { fr: "Tu es la capitaine de l'équipe féminine.", en: "You are the captain of the women's team." },
          questions: [
            {
              fr: "Comment se passent les entraînements ?",
              en: 'What are training sessions like?',
              kind: 'describe',
              starters: ["Nous nous entraînons…", "D'habitude, on…"],
              model: "Nous nous entraînons deux fois par semaine, le mardi et le vendredi. D'habitude, on court d'abord, puis on fait un match.",
            },
            {
              fr: "Racontez-nous le moment du dernier but.",
              en: 'Tell us about the moment of the last goal.',
              kind: 'past',
              starters: ['À la fin du match,…', "J'ai vu que…"],
              model: "À la fin du match, j'ai passé le ballon à ma meilleure amie et elle a marqué. Tout le monde a crié, c'était incroyable.",
            },
            {
              fr: "Quels sont les projets de l'équipe pour la saison prochaine ?",
              en: "What are the team's plans for next season?",
              kind: 'future',
              starters: ['La saison prochaine, nous allons…', "Nous espérons…"],
              model: "La saison prochaine, nous allons jouer dans une ligue plus forte. Nous espérons aussi accueillir de nouvelles joueuses.",
            },
          ],
        },
        debate: {
          motion: { fr: "Les filles et les garçons devraient-ils jouer dans les mêmes équipes ?", en: 'Should girls and boys play in the same teams?' },
          for: {
            starters: ['Oui, je pense que…', "C'est mieux parce que…"],
            model: "Oui, je pense que c'est mieux parce que tout le monde apprend ensemble. En plus, il y a plus de joueurs dans les petits villages.",
          },
          against: {
            starters: ['Non, parce que…', "À mon avis, il vaut mieux…"],
            model: "À mon avis, il vaut mieux avoir des équipes séparées. Comme ça, les filles ont plus d'occasions de jouer et de gagner.",
          },
        },
      },
      b2: {
        fake: {
          sentence: 3,
          fr: 'La mairie promet désormais un nouveau vestiaire pour accueillir les nombreuses filles qui veulent s\'inscrire.',
          en: 'The town hall now promises a new changing room for the many girls who want to sign up.',
          options: ['Why the girls founded the club', 'What the town hall promises', 'Who they beat in the final'],
          answer: 1,
        },
        interview: {
          role: { fr: "Tu es une des cinq filles qui ont fondé le club.", en: 'You are one of the five girls who founded the club.' },
          questions: [
            {
              fr: "Pourquoi avez-vous décidé de créer votre propre club ?",
              en: 'Why did you decide to create your own club?',
              kind: 'describe',
              starters: ["Nous voulions…", "Il n'y avait pas de place pour…"],
              model: "Il n'y avait pas de place pour nous dans les équipes des garçons. Nous voulions jouer, alors nous avons créé notre propre club.",
            },
            {
              fr: "Quelles difficultés avez-vous rencontrées au début ?",
              en: 'What difficulties did you face at the start?',
              kind: 'past',
              starters: ['Au début, nous avions…', "Le plus dur, c'était de…"],
              model: "Au début, nous n'avions ni terrain ni entraîneur. Le plus dur, c'était de convaincre les parents que nous étions sérieuses.",
            },
            {
              fr: "Comment imaginez-vous le club dans dix ans ?",
              en: 'How do you imagine the club in ten years?',
              kind: 'future',
              starters: ['Dans dix ans, le club…', "J'aimerais que…"],
              model: "Dans dix ans, le club aura des équipes pour tous les âges. J'aimerais que des petites filles du village deviennent professionnelles.",
            },
          ],
        },
        debate: {
          motion: { fr: "Le football féminin devrait-il recevoir autant d'argent que le football masculin ?", en: "Should women's football get as much money as men's?" },
          for: {
            starters: ["Oui, car…", "Il est injuste que…"],
            model: "Oui, car les joueuses s'entraînent autant que les joueurs. Il est injuste qu'elles gagnent beaucoup moins pour le même travail.",
          },
          against: {
            starters: ["Pas forcément, parce que…", "Même si c'est juste en principe,…"],
            model: "Même si c'est juste en principe, l'argent vient surtout des spectateurs et de la télévision. Il faudrait d'abord que plus de gens regardent les matchs.",
          },
        },
      },
    },
  },

  'beach-library': {
    examArea: 'B',
    learnTopic: 'hobbies',
    levels: {
      a2: {
        fake: {
          sentence: 2,
          fr: 'Ça coûte deux euros pour tout le monde.',
          en: 'It costs two euros for everyone.',
          options: ['Where the library is', 'How much it costs', 'What the children love'],
          answer: 1,
        },
        interview: {
          role: { fr: 'Tu es la bibliothécaire de la plage.', en: 'You are the beach librarian.' },
          questions: [
            {
              fr: "Qu'est-ce qu'il y a dans votre bibliothèque ?",
              en: 'What is there in your library?',
              kind: 'describe',
              starters: ['Il y a…', 'Dans la bibliothèque, on trouve…'],
              model: "Il y a des livres, des bandes dessinées et des magazines. Il y a aussi des chaises à l'ombre.",
            },
            {
              fr: 'Qui est venu ce matin ?',
              en: 'Who came this morning?',
              kind: 'past',
              starters: ['Ce matin, une famille est venue…', "Ce matin, j'ai vu…"],
              model: "Ce matin, une famille anglaise est venue. Les enfants ont pris trois bandes dessinées.",
            },
            {
              fr: 'Vous aimez travailler sur la plage ? Pourquoi ?',
              en: 'Do you like working on the beach? Why?',
              kind: 'opinion',
              starters: ["Oui, j'adore parce que…", "C'est génial car…"],
              model: "Oui, j'adore parce qu'il fait beau et les gens sont contents. C'est mieux qu'un bureau !",
            },
          ],
        },
        debate: {
          motion: { fr: 'Tu préfères lire un livre ou regarder un écran en vacances ?', en: 'Do you prefer reading a book or watching a screen on holiday?' },
          for: {
            starters: ['Je préfère lire parce que…', 'Un livre, c\'est…'],
            model: "Je préfère lire parce que c'est calme. Un livre, c'est parfait sur la plage.",
          },
          against: {
            starters: ['Je préfère les écrans parce que…', 'Avec un écran, on peut…'],
            model: "Je préfère les écrans parce que j'aime les films. Avec un téléphone, on peut jouer aussi.",
          },
        },
      },
      b1: {
        fake: {
          sentence: 3,
          fr: 'Selon les bibliothécaires, les jeunes y empruntent surtout des romans.',
          en: 'According to the librarians, young people mostly borrow novels there.',
          options: ['How many books there are', 'How you borrow a book', 'What young people mostly borrow'],
          answer: 2,
        },
        interview: {
          role: { fr: 'Tu es un vacancier qui a emprunté un livre à la plage.', en: 'You are a holidaymaker who borrowed a book on the beach.' },
          questions: [
            {
              fr: 'Comment est la bibliothèque de la plage ?',
              en: 'What is the beach library like?',
              kind: 'describe',
              starters: ["C'est une petite cabane…", 'On peut y trouver…'],
              model: "C'est une petite cabane en bois très jolie. On peut y trouver des mangas, des magazines et des romans pour tous les âges.",
            },
            {
              fr: "Quel livre avez-vous choisi, et pourquoi ?",
              en: 'Which book did you choose, and why?',
              kind: 'past',
              starters: ["J'ai choisi…", "J'ai pris ce livre parce que…"],
              model: "J'ai choisi un roman policier parce que j'adore le suspense. Je l'ai lu en deux jours sous mon parasol.",
            },
            {
              fr: "Vous reviendrez l'été prochain ?",
              en: 'Will you come back next summer?',
              kind: 'future',
              starters: ["Oui, je reviendrai…", "L'été prochain, je vais…"],
              model: "Oui, je reviendrai l'été prochain avec mes cousins. Je vais aussi apporter un livre pour l'offrir à la bibliothèque.",
            },
          ],
        },
        debate: {
          motion: { fr: 'Faut-il installer des bibliothèques dans tous les lieux de vacances ?', en: 'Should libraries be set up in every holiday spot?' },
          for: {
            starters: ['Oui, parce que…', "C'est une bonne idée car…"],
            model: "Oui, c'est une bonne idée car tout le monde peut lire gratuitement. En plus, les enfants passent moins de temps sur leur téléphone.",
          },
          against: {
            starters: ['Non, je pense que…', "Le problème, c'est que…"],
            model: "Non, je pense qu'en vacances, on veut nager et jouer. Le problème, c'est que le sable et l'eau abîment les livres.",
          },
        },
      },
      b2: {
        fake: {
          sentence: 2,
          fr: 'Le système repose entièrement sur la confiance, mais la moitié des livres ne reviennent jamais.',
          en: 'The system relies entirely on trust, but half the books never come back.',
          options: ['What the system relies on', 'How many books come back', "What the town's aim is"],
          answer: 1,
        },
        interview: {
          role: { fr: "Tu es l'élu de la ville qui a lancé la bibliothèque de plage.", en: 'You are the town councillor who launched the beach library.' },
          questions: [
            {
              fr: 'Pourquoi avoir choisi un système sans carte ni inscription ?',
              en: 'Why choose a system with no card and no sign-up?',
              kind: 'describe',
              starters: ['Nous voulions que…', "L'idée, c'est de…"],
              model: "Nous voulions que la lecture soit simple et ouverte à tous. L'idée, c'est de faire confiance aux gens plutôt que de les contrôler.",
            },
            {
              fr: 'Le projet a-t-il eu le succès que vous espériez ?',
              en: 'Has the project had the success you hoped for?',
              kind: 'past',
              starters: ['Le succès a dépassé…', "Au début, j'avais peur que…, mais…"],
              model: "Au début, j'avais peur que les livres disparaissent, mais presque tous sont revenus. Le succès a dépassé tout ce que nous imaginions.",
            },
            {
              fr: 'Quelle sera la prochaine étape ?',
              en: 'What will the next step be?',
              kind: 'future',
              starters: ['La prochaine étape sera de…', "Nous aimerions…"],
              model: "La prochaine étape sera d'ouvrir des petites bibliothèques dans les parcs. Nous aimerions aussi organiser des lectures pour les enfants.",
            },
          ],
        },
        debate: {
          motion: { fr: 'Les livres papier vont-ils disparaître ?', en: 'Will paper books disappear?' },
          for: {
            starters: ['Oui, je crois que…', 'De plus en plus de gens…'],
            model: "Oui, je crois que les écrans vont gagner. De plus en plus de gens lisent sur leur téléphone, qui est plus pratique et moins cher.",
          },
          against: {
            starters: ['Non, je ne pense pas que…', "Au contraire,…"],
            model: "Je ne pense pas qu'ils disparaissent. Au contraire, cette bibliothèque montre que les gens aiment toujours tenir un vrai livre.",
          },
        },
      },
    },
  },

  'giant-baguette': {
    examArea: 'A',
    learnTopic: 'food',
    levels: {
      a2: {
        fake: {
          sentence: 1,
          fr: 'Elle mesure quarante mètres !',
          en: 'It is forty metres long!',
          options: ['How long the baguette is', 'When the bakers worked', 'Who got the bread'],
          answer: 0,
        },
        interview: {
          role: { fr: 'Tu es un des boulangers de la baguette géante.', en: 'You are one of the bakers of the giant baguette.' },
          questions: [
            {
              fr: 'Comment est votre boulangerie ?',
              en: 'What is your bakery like?',
              kind: 'describe',
              starters: ['Ma boulangerie est…', 'Je vends…'],
              model: "Ma boulangerie est petite et elle sent bon. Je vends du pain, des croissants et des gâteaux.",
            },
            {
              fr: "Qu'est-ce que vous avez fait pendant la nuit ?",
              en: 'What did you do during the night?',
              kind: 'past',
              starters: ['Pendant la nuit, nous avons…', "J'ai travaillé…"],
              model: "Pendant la nuit, nous avons préparé la pâte. J'ai bu beaucoup de café !",
            },
            {
              fr: 'Pourquoi le pain est-il important pour vous ?',
              en: 'Why is bread important to you?',
              kind: 'opinion',
              starters: ['Pour moi, le pain est…', "C'est important parce que…"],
              model: "Pour moi, le pain est important parce qu'on le mange tous les jours en France.",
            },
          ],
        },
        debate: {
          motion: { fr: 'Le petit-déjeuner est-il le repas le plus important ?', en: 'Is breakfast the most important meal?' },
          for: {
            starters: ['Oui, parce que…', 'Le matin, on a besoin de…'],
            model: "Oui, parce que le matin, on a besoin d'énergie pour l'école.",
          },
          against: {
            starters: ['Non, parce que…', 'Je préfère…'],
            model: "Non, parce que je n'ai pas faim le matin. Je préfère le déjeuner.",
          },
        },
      },
      b1: {
        fake: {
          sentence: 3,
          fr: 'Ensuite, la baguette a été coupée en morceaux et vendue un euro le morceau.',
          en: 'Then the baguette was cut into pieces and sold for one euro a piece.',
          options: ['How long the baguette is', 'How the oven worked', 'What happened to the pieces'],
          answer: 2,
        },
        interview: {
          role: { fr: "Tu es la cheffe de l'équipe de boulangers.", en: 'You are the leader of the team of bakers.' },
          questions: [
            {
              fr: 'Comment avez-vous organisé le travail ?',
              en: 'How did you organise the work?',
              kind: 'describe',
              starters: ["Chaque boulanger avait…", "D'abord, nous…"],
              model: "Chaque boulanger avait une tâche précise. D'abord, nous avons préparé la pâte, puis nous l'avons mise dans le four spécial.",
            },
            {
              fr: "Qu'avez-vous ressenti quand le record a été annoncé ?",
              en: 'How did you feel when the record was announced?',
              kind: 'past',
              starters: ["J'étais tellement…", "Quand j'ai entendu…"],
              model: "Quand j'ai entendu le résultat, j'ai pleuré de joie. Toute l'équipe a sauté en l'air.",
            },
            {
              fr: "Allez-vous essayer de battre un autre record ?",
              en: 'Are you going to try to break another record?',
              kind: 'future',
              starters: ['Oui, nous allons…', "Notre prochain défi sera…"],
              model: "Oui, notre prochain défi sera le plus grand croissant du monde. Nous allons commencer à nous entraîner cet hiver.",
            },
          ],
        },
        debate: {
          motion: { fr: 'Battre des records avec de la nourriture, est-ce une bonne idée ?', en: 'Is breaking records with food a good idea?' },
          for: {
            starters: ['Oui, parce que…', "C'est sympa car…"],
            model: "Oui, c'est sympa car tout le village participe. En plus, le pain a été partagé, donc rien n'a été perdu.",
          },
          against: {
            starters: ['Non, je trouve que…', 'On devrait plutôt…'],
            model: "Non, je trouve que c'est un peu inutile. On devrait plutôt donner la nourriture aux gens qui en ont besoin.",
          },
        },
      },
      b2: {
        fake: {
          sentence: 0,
          fr: "Cent quarante mètres de pain croustillant : des boulangers français viennent de reprendre le record de la plus longue baguette, détenu jusqu'ici par l'Espagne.",
          en: 'A hundred and forty metres of crusty bread: French bakers have just won back the record for the longest baguette, held until now by Spain.',
          options: ['Which country held the record before', 'How much flour was used', 'Who received the pieces'],
          answer: 0,
        },
        interview: {
          role: { fr: "Tu es le boulanger qui a eu l'idée du défi.", en: 'You are the baker who had the idea for the challenge.' },
          questions: [
            {
              fr: "Pourquoi teniez-vous tant à reprendre ce record ?",
              en: 'Why were you so keen to win this record back?',
              kind: 'describe',
              starters: ['Pour moi, la baguette représente…', "Ce n'était pas qu'une question de…"],
              model: "Pour moi, la baguette représente la France. Ce n'était pas qu'une question de fierté : je voulais montrer le savoir-faire de nos boulangers.",
            },
            {
              fr: "Quel a été le moment le plus stressant ?",
              en: 'What was the most stressful moment?',
              kind: 'past',
              starters: ['Le moment le plus stressant, ce fut quand…', 'À un moment,…'],
              model: "À un moment, la pâte a commencé à se casser au milieu. Nous avons dû réagir très vite pour la sauver, et j'ai cru que tout était perdu.",
            },
            {
              fr: "Que direz-vous aux jeunes qui veulent devenir boulangers ?",
              en: 'What will you say to young people who want to become bakers?',
              kind: 'future',
              starters: ['Je leur dirai que…', "Il faudra qu'ils…"],
              model: "Je leur dirai que c'est un métier difficile mais magnifique. Il faudra qu'ils se lèvent tôt, mais ils rendront les gens heureux chaque jour.",
            },
          ],
        },
        debate: {
          motion: { fr: "Faut-il interdire de jeter la nourriture dans les magasins ?", en: 'Should shops be banned from throwing food away?' },
          for: {
            starters: ["Il faudrait l'interdire car…", 'Comme les boulangers de ce record,…'],
            model: "Il faudrait l'interdire car des millions de personnes ont faim. Comme les boulangers de ce record, les magasins peuvent donner leurs produits à des associations.",
          },
          against: {
            starters: ["Ce serait compliqué parce que…", "Même si l'idée est généreuse,…"],
            model: "Même si l'idée est généreuse, ce serait compliqué parce que certains produits deviennent dangereux. Il faudrait des règles très claires.",
          },
        },
      },
    },
  },

  'car-park-to-park': {
    examArea: 'C',
    learnTopic: 'environment',
    levels: {
      a2: {
        fake: {
          sentence: 1,
          fr: 'La ville a planté trente arbres.',
          en: 'The town planted thirty trees.',
          options: ['Which city it is', 'How many trees were planted', 'How people come to the park'],
          answer: 1,
        },
        interview: {
          role: { fr: "Tu es un enfant qui joue dans le nouveau parc.", en: 'You are a child who plays in the new park.' },
          questions: [
            {
              fr: "Qu'est-ce qu'il y a dans le parc ?",
              en: 'What is there in the park?',
              kind: 'describe',
              starters: ['Dans le parc, il y a…', 'Il y a aussi…'],
              model: "Dans le parc, il y a beaucoup d'arbres et des jeux. Il y a aussi des bancs pour mes grands-parents.",
            },
            {
              fr: "Qu'est-ce que tu as fait dans le parc samedi ?",
              en: 'What did you do in the park on Saturday?',
              kind: 'past',
              starters: ['Samedi, je suis allé(e)…', "Samedi, j'ai joué…"],
              model: "Samedi, j'ai joué au ballon avec mes amis. Après, nous avons mangé une glace.",
            },
            {
              fr: 'Tu préfères le parc ou le parking ? Pourquoi ?',
              en: 'Do you prefer the park or the car park? Why?',
              kind: 'opinion',
              starters: ['Je préfère le parc parce que…', 'Le parc est plus…'],
              model: "Je préfère le parc parce que c'est vert et calme. Le parking était moche.",
            },
          ],
        },
        debate: {
          motion: { fr: "Il faut plus de parcs dans ta ville ?", en: 'Does your town need more parks?' },
          for: {
            starters: ['Oui, parce que…', 'Les parcs sont…'],
            model: "Oui, parce que les parcs sont beaux. On peut jouer et respirer de l'air frais.",
          },
          against: {
            starters: ['Non, parce que…', 'Il faut plutôt…'],
            model: "Non, parce qu'il y a déjà un parc. Il faut plutôt une piscine !",
          },
        },
      },
      b1: {
        fake: {
          sentence: 3,
          fr: 'Certains commerçants avaient peur de perdre des clients, et ils sont toujours en colère.',
          en: 'Some shopkeepers were afraid of losing customers, and they are still angry.',
          options: ['How big the car park was', 'Why the town made the park', 'How the shopkeepers feel now'],
          answer: 2,
        },
        interview: {
          role: { fr: 'Tu es une commerçante du quartier, près du nouveau parc.', en: 'You are a shopkeeper in the area, near the new park.' },
          questions: [
            {
              fr: "Comment est le quartier aujourd'hui ?",
              en: 'What is the neighbourhood like today?',
              kind: 'describe',
              starters: ["Aujourd'hui, le quartier est…", 'Il y a plus de…'],
              model: "Aujourd'hui, le quartier est plus calme et plus frais. Il y a plus de familles qui se promènent devant mon magasin.",
            },
            {
              fr: "Qu'est-ce que vous pensiez du projet au début ?",
              en: 'What did you think of the project at first?',
              kind: 'past',
              starters: ['Au début, je pensais que…', "J'avais peur de…"],
              model: "Au début, j'avais peur de perdre mes clients, parce qu'ils venaient en voiture. J'étais vraiment inquiète.",
            },
            {
              fr: 'Comment voyez-vous le quartier dans cinq ans ?',
              en: 'How do you see the neighbourhood in five years?',
              kind: 'future',
              starters: ['Dans cinq ans, le quartier sera…', "J'espère que…"],
              model: "Dans cinq ans, le quartier sera encore plus vert. J'espère qu'il y aura un marché le dimanche dans le parc.",
            },
          ],
        },
        debate: {
          motion: { fr: 'Faut-il interdire les voitures dans le centre-ville ?', en: 'Should cars be banned from the town centre?' },
          for: {
            starters: ['Oui, parce que…', 'Sans voitures, la ville serait…'],
            model: "Oui, parce que les voitures polluent et font du bruit. Sans voitures, la ville serait plus agréable pour les piétons et les vélos.",
          },
          against: {
            starters: ['Non, parce que…', "C'est difficile pour…"],
            model: "Non, parce que c'est difficile pour les personnes âgées. Les gens qui habitent loin ont besoin de leur voiture pour faire les courses.",
          },
        },
      },
      b2: {
        fake: {
          sentence: 2,
          fr: "Selon les mesures, la température y est jusqu'à dix degrés plus basse qu'autour pendant les canicules.",
          en: 'According to measurements, the temperature there is up to ten degrees lower than around it during heatwaves.',
          options: ['How many cars used to park there', 'How much cooler the park is', 'Who misses the car park'],
          answer: 1,
        },
        interview: {
          role: { fr: "Tu es l'architecte qui a dessiné le parc.", en: 'You are the architect who designed the park.' },
          questions: [
            {
              fr: "Qu'est-ce qui rend ce parc efficace contre la chaleur ?",
              en: 'What makes this park effective against the heat?',
              kind: 'describe',
              starters: ["Ce qui rend le parc efficace, c'est…", 'Les arbres et le lac…'],
              model: "Ce qui rend le parc efficace, c'est l'ombre des trois cents arbres. Le lac rafraîchit aussi l'air autour de lui.",
            },
            {
              fr: "Comment avez-vous convaincu ceux qui étaient contre le projet ?",
              en: 'How did you convince those who were against the project?',
              kind: 'past',
              starters: ['Nous avons organisé…', "J'ai expliqué que…"],
              model: "Nous avons organisé des réunions avec les habitants. J'ai expliqué que les étés allaient devenir de plus en plus chauds et qu'il fallait agir.",
            },
            {
              fr: "À quoi ressembleront nos villes dans vingt ans ?",
              en: 'What will our towns look like in twenty years?',
              kind: 'future',
              starters: ['Dans vingt ans, nos villes…', "Je pense qu'il y aura…"],
              model: "Dans vingt ans, nos villes seront beaucoup plus vertes. Je pense qu'il y aura des arbres sur les toits et beaucoup moins de parkings.",
            },
          ],
        },
        debate: {
          motion: { fr: 'Faut-il transformer les parkings en espaces verts ?', en: 'Should car parks be turned into green spaces?' },
          for: {
            starters: ['Absolument, car…', 'Face aux canicules,…'],
            model: "Absolument, car face aux canicules, les villes doivent se rafraîchir. Un parc profite à tout le monde, alors qu'un parking ne sert qu'aux automobilistes.",
          },
          against: {
            starters: ['Pas partout, parce que…', "Il faut d'abord…"],
            model: "Pas partout, parce que beaucoup de gens n'ont pas d'autre moyen de transport. Il faut d'abord améliorer les bus et les trains.",
          },
        },
      },
    },
  },
};
