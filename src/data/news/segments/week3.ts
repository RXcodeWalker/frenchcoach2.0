/**
 * Show segments for editions 15–21 (daily-news §7). Hand-written; covered by the
 * story's `reviewed` flag (content-authoring §17).
 */
import type { NewsEditionSegments } from '../types';

export const SEGMENTS_WEEK3: Record<string, NewsEditionSegments> = {
  'street-art-village': {
    examArea: 'C',
    learnTopic: 'arts',
    levels: {
      a2: {
        fake: {
          sentence: 1,
          fr: 'Des artistes ont peint trois grandes fresques.',
          en: 'Artists have painted three big murals.',
          options: ['Where the village is', 'How many murals there are', 'Who visits the village now'],
          answer: 1,
        },
        interview: {
          role: { fr: 'Tu es une artiste qui a peint une fresque dans le village.', en: 'You are an artist who painted a mural in the village.' },
          questions: [
            {
              fr: 'Comment est ta fresque ?',
              en: 'What is your mural like?',
              kind: 'describe',
              starters: ['Ma fresque est…', 'Sur ma fresque, il y a…'],
              model: "Ma fresque est très grande et colorée. Sur ma fresque, il y a des fleurs et un vieux boulanger.",
            },
            {
              fr: "Qu'est-ce que tu as fait avec les habitants ?",
              en: 'What did you do with the villagers?',
              kind: 'past',
              starters: ["J'ai parlé avec…", 'Ensemble, nous avons…'],
              model: "J'ai parlé avec les habitants. Ensemble, nous avons choisi les couleurs et les dessins.",
            },
            {
              fr: 'Tu aimes peindre dans la rue ? Pourquoi ?',
              en: 'Do you like painting in the street? Why?',
              kind: 'opinion',
              starters: ["Oui, j'adore parce que…", "C'est génial car…"],
              model: "Oui, j'adore parce que tout le monde peut voir mon art. Et les gens me parlent !",
            },
          ],
        },
        debate: {
          motion: { fr: 'Le street art rend-il une ville plus belle ?', en: 'Does street art make a town more beautiful?' },
          for: {
            starters: ['Oui, parce que…', 'Les couleurs…'],
            model: "Oui, parce que les couleurs rendent les gens heureux. Les murs gris sont tristes.",
          },
          against: {
            starters: ['Non, parce que…', 'Je préfère…'],
            model: "Non, parce que ce n'est pas toujours joli. Je préfère les vieux murs en pierre.",
          },
        },
      },
      b1: {
        fake: {
          sentence: 3,
          fr: 'Le village accueille désormais des milliers de visiteurs, et deux nouvelles boulangeries ont ouvert.',
          en: 'The village now welcomes thousands of visitors, and two new bakeries have opened.',
          options: ['Who invited the artists', 'What the murals tell', 'What new shops have opened'],
          answer: 2,
        },
        interview: {
          role: { fr: 'Tu es le maire du village de Provence.', en: 'You are the mayor of the Provence village.' },
          questions: [
            {
              fr: "Comment était le village il y a cinq ans ?",
              en: 'What was the village like five years ago?',
              kind: 'past',
              starters: ['Il y a cinq ans, le village…', 'Les gens partaient parce que…'],
              model: "Il y a cinq ans, le village était presque vide. Les jeunes partaient parce qu'il n'y avait plus de travail ni de commerces.",
            },
            {
              fr: "Que racontent les fresques aujourd'hui ?",
              en: 'What do the murals tell today?',
              kind: 'describe',
              starters: ['Les fresques racontent…', 'Sur une façade, on voit…'],
              model: "Les fresques racontent l'histoire du village. Sur une façade, on voit la fête de l'été, avec les familles qui dansent.",
            },
            {
              fr: "Quel sera votre prochain projet pour le village ?",
              en: 'What will your next project for the village be?',
              kind: 'future',
              starters: ['Notre prochain projet sera…', "Nous allons…"],
              model: "Nous allons organiser un festival de street art chaque été. J'espère aussi ouvrir une école de peinture pour les jeunes.",
            },
          ],
        },
        debate: {
          motion: { fr: "Le tourisme est-il une bonne chose pour un petit village ?", en: 'Is tourism a good thing for a small village?' },
          for: {
            starters: ['Oui, parce que…', 'Grâce aux touristes,…'],
            model: "Oui, parce que grâce aux touristes, les commerces ouvrent de nouveau. Les jeunes peuvent trouver du travail sans partir.",
          },
          against: {
            starters: ['Pas toujours, car…', "Le problème, c'est que…"],
            model: "Pas toujours, car il y a trop de monde en été. Le problème, c'est que les maisons deviennent trop chères pour les habitants.",
          },
        },
      },
      b2: {
        fake: {
          sentence: 2,
          fr: 'Chaque fresque a été imaginée par les artistes seuls, sans demander leur avis aux habitants.',
          en: "Each mural was designed by the artists alone, without asking the villagers' opinion.",
          options: ['Why the village was emptying', 'How the murals were designed', 'What some people fear'],
          answer: 1,
        },
        interview: {
          role: { fr: "Tu es une habitante âgée qui a confié ses photos de famille aux artistes.", en: 'You are an elderly villager who lent her family photos to the artists.' },
          questions: [
            {
              fr: "Que représente la fresque peinte sur votre maison ?",
              en: 'What does the mural painted on your house show?',
              kind: 'describe',
              starters: ['Elle représente…', 'On y voit…'],
              model: "Elle représente mes parents devant leur épicerie, dans les années cinquante. On y voit même le vieux vélo de mon père.",
            },
            {
              fr: "Qu'avez-vous ressenti en découvrant la fresque terminée ?",
              en: 'How did you feel when you saw the finished mural?',
              kind: 'past',
              starters: ["J'ai été tellement…", "En la voyant,…"],
              model: "En la voyant, j'ai pleuré. J'ai eu l'impression que mes parents revenaient dans la rue où ils avaient vécu toute leur vie.",
            },
            {
              fr: "Comment imaginez-vous le village dans dix ans ?",
              en: 'How do you imagine the village in ten years?',
              kind: 'future',
              starters: ["J'espère que le village…", "Je crains que…"],
              model: "J'espère que le village restera vivant toute l'année. Je crains qu'il devienne seulement un décor pour les photos des touristes.",
            },
          ],
        },
        debate: {
          motion: { fr: "Les réseaux sociaux sont-ils une chance pour les petits villages ?", en: 'Is social media an opportunity for small villages?' },
          for: {
            starters: ['Oui, car…', 'Grâce aux photos partagées,…'],
            model: "Oui, car grâce aux photos partagées, des milliers de gens découvrent le village. Sans cette publicité gratuite, il aurait sans doute disparu.",
          },
          against: {
            starters: ['Pas vraiment, puisque…', "Le risque, c'est que…"],
            model: "Le risque, c'est que les visiteurs viennent seulement pour une photo. Ils ne dépensent presque rien et dérangent les habitants.",
          },
        },
      },
    },
  },

  'river-clean-up': {
    examArea: 'C',
    learnTopic: 'environment',
    levels: {
      a2: {
        fake: {
          sentence: 3,
          fr: 'Au total, ils ont ramassé trente kilos de déchets.',
          en: 'In total, they picked up thirty kilos of rubbish.',
          options: ['Where the river is', 'What strange things they found', 'How much rubbish they picked up'],
          answer: 2,
        },
        interview: {
          role: { fr: "Tu es un élève qui a nettoyé la rivière.", en: 'You are a pupil who cleaned the river.' },
          questions: [
            {
              fr: 'Comment est la rivière ?',
              en: 'What is the river like?',
              kind: 'describe',
              starters: ['La rivière est…', "Il y a…"],
              model: "La rivière est longue et jolie. Mais il y a beaucoup de plastique.",
            },
            {
              fr: "Qu'est-ce que tu as trouvé samedi ?",
              en: 'What did you find on Saturday?',
              kind: 'past',
              starters: ["Samedi, j'ai trouvé…", "J'ai aussi vu…"],
              model: "Samedi, j'ai trouvé des bouteilles et une vieille chaise. J'ai aussi vu un vélo dans l'eau !",
            },
            {
              fr: 'Tu veux recommencer ? Pourquoi ?',
              en: 'Do you want to do it again? Why?',
              kind: 'opinion',
              starters: ['Oui, parce que…', "C'était…"],
              model: "Oui, parce que c'était utile et amusant. Je veux une rivière propre.",
            },
          ],
        },
        debate: {
          motion: { fr: 'Les élèves doivent-ils nettoyer la nature ?', en: 'Should pupils clean up nature?' },
          for: {
            starters: ['Oui, parce que…', 'On apprend…'],
            model: "Oui, parce qu'on apprend à protéger la planète. Et c'est amusant avec les amis.",
          },
          against: {
            starters: ['Non, parce que…', "C'est le travail de…"],
            model: "Non, parce que c'est le travail de la ville. Les élèves doivent aller en classe.",
          },
        },
      },
      b1: {
        fake: {
          sentence: 3,
          fr: "Les déchets seront brûlés, et l'opération sera renouvelée au printemps.",
          en: 'The rubbish will be burned, and the operation will be repeated in the spring.',
          options: ['What the pupils were equipped with', 'What most of the rubbish was', 'What will happen to the rubbish'],
          answer: 2,
        },
        interview: {
          role: { fr: "Tu es la professeure qui a organisé le nettoyage.", en: 'You are the teacher who organised the clean-up.' },
          questions: [
            {
              fr: "Comment s'est organisée la matinée ?",
              en: 'How was the morning organised?',
              kind: 'past',
              starters: ["D'abord, nous avons…", 'Les élèves ont reçu…'],
              model: "D'abord, les élèves ont reçu des gants et des sacs. Ensuite, nous avons formé des petits groupes le long de la rivière.",
            },
            {
              fr: 'Quels déchets trouve-t-on le plus souvent ?',
              en: 'What rubbish do you find most often?',
              kind: 'describe',
              starters: ['On trouve surtout…', 'La plupart des déchets sont…'],
              model: "On trouve surtout des emballages en plastique et des bouteilles. La plupart viennent des pique-niques au bord de l'eau.",
            },
            {
              fr: "Que ferez-vous au printemps ?",
              en: 'What will you do in the spring?',
              kind: 'future',
              starters: ['Au printemps, nous allons…', "Nous inviterons…"],
              model: "Au printemps, nous recommencerons avec deux autres collèges. Nous inviterons aussi les parents à venir nous aider.",
            },
          ],
        },
        debate: {
          motion: { fr: "Faut-il interdire les emballages en plastique ?", en: 'Should plastic packaging be banned?' },
          for: {
            starters: ['Oui, parce que…', 'Le plastique…'],
            model: "Oui, parce que le plastique finit souvent dans les rivières et la mer. On peut utiliser du verre ou du papier à la place.",
          },
          against: {
            starters: ['Non, je pense que…', "Ce serait difficile car…"],
            model: "Non, je pense que ce serait difficile car le plastique protège la nourriture. Il vaut mieux apprendre aux gens à recycler.",
          },
        },
      },
      b2: {
        fake: {
          sentence: 3,
          fr: 'Leurs conclusions seront présentées au journal local, avec des propositions concrètes, comme la vente de bouteilles réutilisables.',
          en: 'Their conclusions will be presented to the local newspaper, with concrete proposals such as selling reusable bottles.',
          options: ['What the teachers wanted', 'What the pupils will analyse', 'Who will hear their conclusions'],
          answer: 2,
        },
        interview: {
          role: { fr: "Tu es une collégienne qui présentera les conclusions à la mairie.", en: 'You are a pupil who will present the conclusions to the town hall.' },
          questions: [
            {
              fr: "Qu'avez-vous appris en analysant les déchets ?",
              en: 'What did you learn by analysing the rubbish?',
              kind: 'past',
              starters: ['Nous avons découvert que…', "Ce qui nous a surpris, c'est…"],
              model: "Nous avons découvert que la moitié des déchets venaient d'un fast-food près du pont. Ce qui nous a surpris, c'est le nombre de pailles.",
            },
            {
              fr: "Pourquoi ce problème est-il plus grave qu'on ne le pense ?",
              en: 'Why is this problem more serious than people think?',
              kind: 'describe',
              starters: ['Ce problème est grave parce que…', 'Les déchets finissent par…'],
              model: "Ce problème est grave parce que les déchets finissent dans la mer. Le plastique se casse en petits morceaux que les poissons mangent.",
            },
            {
              fr: "Que proposerez-vous à la mairie ?",
              en: 'What will you propose to the town hall?',
              kind: 'future',
              starters: ['Nous proposerons de…', "Il faudrait que la mairie…"],
              model: "Nous proposerons d'installer des poubelles de tri près du pont. Il faudrait aussi que la mairie organise un nettoyage chaque saison.",
            },
          ],
        },
        debate: {
          motion: { fr: "Faut-il mettre des amendes à ceux qui jettent leurs déchets dans la nature ?", en: 'Should people who drop litter in nature be fined?' },
          for: {
            starters: ['Oui, car…', 'Sans sanction,…'],
            model: "Oui, car sans sanction, certaines personnes ne changeront jamais. Une amende élevée ferait réfléchir avant de jeter une bouteille.",
          },
          against: {
            starters: ["L'éducation me semble plus efficace, car…", "Il vaudrait mieux…"],
            model: "L'éducation me semble plus efficace, car une amende ne change pas les mentalités. Il vaudrait mieux organiser des actions comme ce nettoyage.",
          },
        },
      },
    },
  },

  'reading-dogs': {
    examArea: 'B',
    learnTopic: 'animals',
    levels: {
      a2: {
        fake: {
          sentence: 0,
          fr: 'Dans une bibliothèque de Nantes, des chats aident les enfants à lire.',
          en: 'In a library in Nantes, cats help children to read.',
          options: ['Which animals help the children', 'How the children read', 'How the children feel'],
          answer: 0,
        },
        interview: {
          role: { fr: 'Tu es un enfant qui lit des histoires au chien.', en: 'You are a child who reads stories to the dog.' },
          questions: [
            {
              fr: 'Comment est le chien ?',
              en: 'What is the dog like?',
              kind: 'describe',
              starters: ['Le chien est…', 'Il s\'appelle…'],
              model: "Le chien est grand et très gentil. Il s'appelle Biscuit.",
            },
            {
              fr: "Quelle histoire as-tu lue mercredi ?",
              en: 'What story did you read on Wednesday?',
              kind: 'past',
              starters: ["Mercredi, j'ai lu…", "J'ai lu une histoire de…"],
              model: "Mercredi, j'ai lu une histoire de pirates. Le chien a dormi un peu !",
            },
            {
              fr: "Tu aimes lire au chien ? Pourquoi ?",
              en: 'Do you like reading to the dog? Why?',
              kind: 'opinion',
              starters: ["Oui, j'aime ça parce que…", 'Avec le chien, je…'],
              model: "Oui, j'aime ça parce que le chien ne se moque pas. Avec le chien, je n'ai pas peur.",
            },
          ],
        },
        debate: {
          motion: { fr: "Les animaux devraient-ils venir à l'école ?", en: 'Should animals come to school?' },
          for: {
            starters: ['Oui, parce que…', 'Les animaux nous…'],
            model: "Oui, parce que les animaux nous rendent calmes. C'est sympa en classe.",
          },
          against: {
            starters: ['Non, parce que…', 'Certains élèves…'],
            model: "Non, parce que certains élèves ont peur des chiens. Et les animaux font du bruit.",
          },
        },
      },
      b1: {
        fake: {
          sentence: 1,
          fr: "Les enfants qui ont du mal à lire viennent leur raconter une histoire pendant deux heures.",
          en: 'Children who find reading hard come and tell them a story for two hours.',
          options: ['How many dogs come', 'How long each reading lasts', 'Why the children dare to read'],
          answer: 1,
        },
        interview: {
          role: { fr: "Tu es la maîtresse d'un des chiens lecteurs.", en: 'You are the owner of one of the reading dogs.' },
          questions: [
            {
              fr: "Comment se passe une séance de lecture ?",
              en: 'What happens in a reading session?',
              kind: 'describe',
              starters: ["L'enfant s'assoit…", 'Pendant vingt minutes,…'],
              model: "L'enfant s'assoit sur un coussin à côté du chien. Pendant vingt minutes, il lit à voix haute et le chien l'écoute.",
            },
            {
              fr: "Racontez-nous une séance qui vous a touchée.",
              en: 'Tell us about a session that moved you.',
              kind: 'past',
              starters: ['Un jour, un petit garçon…', "Je me souviens d'une fille qui…"],
              model: "Un jour, un petit garçon qui ne parlait jamais a lu tout un livre au chien. À la fin, il l'a caressé et il a souri.",
            },
            {
              fr: "Allez-vous continuer le projet l'année prochaine ?",
              en: 'Are you going to continue the project next year?',
              kind: 'future',
              starters: ['Oui, nous allons…', "J'aimerais…"],
              model: "Oui, nous allons continuer, et j'aimerais former d'autres chiens. Nous irons aussi dans des écoles de la région.",
            },
          ],
        },
        debate: {
          motion: { fr: "Lire à un chien, est-ce vraiment utile ?", en: 'Is reading to a dog really useful?' },
          for: {
            starters: ['Oui, je pense que…', 'Les enfants osent…'],
            model: "Oui, je pense que c'est utile car les enfants osent lire sans peur. Ils prennent confiance et lisent ensuite plus de livres.",
          },
          against: {
            starters: ['Pas vraiment, car…', 'Un chien ne peut pas…'],
            model: "Pas vraiment, car un chien ne peut pas corriger les erreurs. Un professeur est plus utile pour apprendre à bien lire.",
          },
        },
      },
      b2: {
        fake: {
          sentence: 3,
          fr: "Des chercheurs restent prudents, et les premiers résultats ne montrent aucune amélioration de la fluidité de lecture.",
          en: 'Researchers remain cautious, and early results show no improvement in reading fluency.',
          options: ['Where the method comes from', 'Why the animal reduces anxiety', 'What the early results show'],
          answer: 2,
        },
        interview: {
          role: { fr: "Tu es une chercheuse qui étudie la méthode des chiens lecteurs.", en: 'You are a researcher studying the reading-dogs method.' },
          questions: [
            {
              fr: "Pourquoi un chien aide-t-il un enfant à lire ?",
              en: 'Why does a dog help a child to read?',
              kind: 'describe',
              starters: ["Le chien ne juge pas, donc…", "L'anxiété…"],
              model: "Le chien ne juge pas, donc l'enfant n'a plus peur de se tromper. Quand l'anxiété baisse, la lecture devient plus fluide.",
            },
            {
              fr: "Qu'avez-vous observé pendant votre étude ?",
              en: 'What did you observe during your study?',
              kind: 'past',
              starters: ['Nous avons observé que…', "Au bout de quelques semaines,…"],
              model: "Au bout de quelques semaines, nous avons observé que les enfants lisaient plus vite. Ils demandaient même à revenir plus souvent.",
            },
            {
              fr: "Que faudrait-il encore prouver avant de généraliser la méthode ?",
              en: 'What would still need proving before using the method everywhere?',
              kind: 'future',
              starters: ['Il faudrait encore…', "Nous devrons vérifier si…"],
              model: "Nous devrons vérifier si les progrès durent dans le temps. Il faudrait aussi comparer avec des enfants qui lisent à un adulte.",
            },
          ],
        },
        debate: {
          motion: { fr: "Faut-il généraliser les chiens lecteurs dans toutes les écoles ?", en: 'Should reading dogs be introduced in every school?' },
          for: {
            starters: ['Oui, puisque…', 'Si cela redonne confiance,…'],
            model: "Oui, puisque les premiers résultats sont encourageants. Si cela redonne confiance aux enfants en difficulté, cela vaut la peine d'essayer.",
          },
          against: {
            starters: ["Pas encore, car…", "Avant de généraliser,…"],
            model: "Pas encore, car les chercheurs restent prudents. Avant de généraliser, il faut penser aux élèves allergiques ou qui ont peur des chiens.",
          },
        },
      },
    },
  },

  'school-garden': {
    examArea: 'A',
    learnTopic: 'food',
    levels: {
      a2: {
        fake: {
          sentence: 1,
          fr: 'Les élèves plantent des pommes de terre, des fraises et des salades.',
          en: 'The pupils plant potatoes, strawberries and lettuces.',
          options: ['Where the school is', 'What the pupils plant', 'Who uses the vegetables'],
          answer: 1,
        },
        interview: {
          role: { fr: "Tu es le cuisinier de la cantine de l'école.", en: 'You are the cook in the school canteen.' },
          questions: [
            {
              fr: "Qu'est-ce que vous cuisinez avec les légumes ?",
              en: 'What do you cook with the vegetables?',
              kind: 'describe',
              starters: ['Je fais…', 'Avec les légumes, je prépare…'],
              model: "Avec les légumes, je prépare des soupes et des salades. Les enfants adorent les tomates.",
            },
            {
              fr: "Qu'est-ce que vous avez préparé hier ?",
              en: 'What did you make yesterday?',
              kind: 'past',
              starters: ["Hier, j'ai préparé…", "Hier, j'ai fait…"],
              model: "Hier, j'ai préparé une soupe de carottes. Tous les élèves ont mangé leur assiette !",
            },
            {
              fr: "Les légumes de l'école sont meilleurs ? Pourquoi ?",
              en: "Are the school's vegetables better? Why?",
              kind: 'opinion',
              starters: ['Oui, parce que…', 'Ils sont meilleurs que…'],
              model: "Oui, parce qu'ils sont frais. Ils sont meilleurs que les légumes du supermarché.",
            },
          ],
        },
        debate: {
          motion: { fr: "Tu aimes manger à la cantine ?", en: 'Do you like eating in the canteen?' },
          for: {
            starters: ["Oui, j'aime parce que…", 'À la cantine, on…'],
            model: "Oui, j'aime parce que je mange avec mes amis. Les repas sont souvent bons.",
          },
          against: {
            starters: ["Non, parce que…", 'Je préfère…'],
            model: "Non, parce que c'est trop bruyant. Je préfère manger à la maison.",
          },
        },
      },
      b1: {
        fake: {
          sentence: 2,
          fr: 'Les récoltes sont ensuite vendues au marché, ce qui rapporte de l\'argent.',
          en: 'The crops are then sold at the market, which brings in money.',
          options: ['How big the garden is', 'What happens to the crops', 'What has changed since the project'],
          answer: 1,
        },
        interview: {
          role: { fr: "Tu es une élève qui s'occupe du potager avec sa classe.", en: 'You are a pupil who looks after the garden with her class.' },
          questions: [
            {
              fr: "Qu'est-ce que votre classe fait dans le potager ?",
              en: 'What does your class do in the garden?',
              kind: 'describe',
              starters: ['Notre classe s\'occupe de…', 'Chaque semaine, nous…'],
              model: "Notre classe s'occupe des tomates. Chaque semaine, nous arrosons les plantes et nous enlevons les mauvaises herbes.",
            },
            {
              fr: "Quel légume avez-vous goûté pour la première fois grâce au potager ?",
              en: 'Which vegetable did you taste for the first time thanks to the garden?',
              kind: 'past',
              starters: ["J'ai goûté…", "Avant, je n'aimais pas…"],
              model: "Avant, je n'aimais pas les courgettes. Mais j'ai goûté celles qu'on a plantées, et je les ai trouvées délicieuses.",
            },
            {
              fr: "Qu'est-ce que vous allez planter au printemps ?",
              en: 'What are you going to plant in the spring?',
              kind: 'future',
              starters: ['Au printemps, nous allons planter…', "J'aimerais essayer…"],
              model: "Au printemps, nous allons planter des fraises et des haricots. J'aimerais aussi essayer de faire pousser des melons.",
            },
          ],
        },
        debate: {
          motion: { fr: 'Chaque école devrait-elle avoir un potager ?', en: 'Should every school have a vegetable garden?' },
          for: {
            starters: ['Oui, parce que…', 'Les élèves apprennent…'],
            model: "Oui, parce que les élèves apprennent d'où vient la nourriture. En plus, ils gaspillent moins à la cantine.",
          },
          against: {
            starters: ['Non, car…', 'Toutes les écoles n\'ont pas…'],
            model: "Non, car toutes les écoles n'ont pas assez de place. Et pendant les vacances d'été, personne ne peut arroser.",
          },
        },
      },
      b2: {
        fake: {
          sentence: 3,
          fr: 'Pourtant, le gaspillage alimentaire a augmenté : les enfants refusent de goûter ce qu\'ils ont eux-mêmes fait pousser.',
          en: 'Yet food waste has gone up: children refuse to taste what they have grown themselves.',
          options: ['How big the garden is', 'Which subjects teachers use it for', 'What happened to food waste'],
          answer: 2,
        },
        interview: {
          role: { fr: "Tu es la directrice de l'école qui a créé le potager.", en: 'You are the head teacher who created the garden.' },
          questions: [
            {
              fr: "Comment les enseignants utilisent-ils le potager en classe ?",
              en: 'How do teachers use the garden in lessons?',
              kind: 'describe',
              starters: ['En sciences, les élèves…', 'Même en français,…'],
              model: "En sciences, les élèves observent les plantes qui poussent. En maths, ils mesurent les parcelles, et même en français, ils écrivent un journal du potager.",
            },
            {
              fr: "Comment les parents ont-ils réagi au début du projet ?",
              en: 'How did parents react at the start of the project?',
              kind: 'past',
              starters: ['Au début, certains parents…', "Ils avaient peur que…"],
              model: "Au début, certains parents avaient peur que les enfants se salissent. Mais ils ont vite changé d'avis en voyant leurs enfants manger des légumes.",
            },
            {
              fr: "Comment le projet pourrait-il se développer ?",
              en: 'How could the project develop?',
              kind: 'future',
              starters: ['Nous aimerions…', "Si la ville nous aide,…"],
              model: "Si la ville nous aide, nous installerons des poules et un compost. Nous aimerions que la cantine ne serve plus que des légumes de la région.",
            },
          ],
        },
        debate: {
          motion: { fr: "Faut-il remplacer le béton des cours d'école par de la nature ?", en: 'Should concrete playgrounds be replaced with nature?' },
          for: {
            starters: ['Oui, car…', "Les cours vertes permettent de…"],
            model: "Oui, car les cours vertes rafraîchissent l'air pendant les canicules. Elles permettent aussi d'apprendre dehors et de se calmer.",
          },
          against: {
            starters: ['Pas entièrement, puisque…', "Les élèves ont aussi besoin de…"],
            model: "Pas entièrement, puisque les élèves ont aussi besoin d'espace pour courir et jouer au ballon. Un mélange des deux serait plus raisonnable.",
          },
        },
      },
    },
  },

  'electric-bikes': {
    examArea: 'C',
    learnTopic: 'transport',
    levels: {
      a2: {
        fake: {
          sentence: 2,
          fr: 'Ça coûte seulement cinquante euros.',
          en: 'It costs only fifty euros.',
          options: ['How long you can keep the bike', 'How much it costs', 'Why the bikes help'],
          answer: 1,
        },
        interview: {
          role: { fr: "Tu es une habitante qui a loué un vélo électrique.", en: 'You are a resident who rented an electric bike.' },
          questions: [
            {
              fr: 'Comment est ton vélo ?',
              en: 'What is your bike like?',
              kind: 'describe',
              starters: ['Mon vélo est…', 'Il a…'],
              model: "Mon vélo est rouge et très rapide. Il a un petit moteur.",
            },
            {
              fr: "Où es-tu allée avec le vélo ce week-end ?",
              en: 'Where did you go on the bike this weekend?',
              kind: 'past',
              starters: ['Ce week-end, je suis allée…', "Samedi, j'ai…"],
              model: "Ce week-end, je suis allée au lac avec mon fils. C'était facile et très joli.",
            },
            {
              fr: "Tu préfères le vélo ou la voiture ? Pourquoi ?",
              en: 'Do you prefer the bike or the car? Why?',
              kind: 'opinion',
              starters: ['Je préfère le vélo parce que…', 'Le vélo, c\'est…'],
              model: "Je préfère le vélo parce que c'est bon pour la santé. Et je ne cherche pas de parking !",
            },
          ],
        },
        debate: {
          motion: { fr: "Aller à l'école à vélo, c'est une bonne idée ?", en: 'Is cycling to school a good idea?' },
          for: {
            starters: ['Oui, parce que…', 'À vélo, on…'],
            model: "Oui, parce qu'à vélo, on fait du sport le matin. Et c'est gratuit.",
          },
          against: {
            starters: ['Non, parce que…', 'Quand il pleut,…'],
            model: "Non, parce que quand il pleut, c'est horrible. Et mon école est trop loin.",
          },
        },
      },
      b1: {
        fake: {
          sentence: 3,
          fr: 'En un an, le nombre de voitures dans le centre a baissé de cinquante pour cent.',
          en: 'In one year, the number of cars in the centre has fallen by fifty per cent.',
          options: ['How much the rental costs', 'Why people try before buying', 'How much car traffic fell'],
          answer: 2,
        },
        interview: {
          role: { fr: "Tu es un grand-père qui utilise un vélo électrique de la mairie.", en: "You are a grandfather who uses one of the town hall's electric bikes." },
          questions: [
            {
              fr: "Comment le vélo a-t-il changé votre quotidien ?",
              en: 'How has the bike changed your everyday life?',
              kind: 'describe',
              starters: ['Maintenant, je peux…', 'Grâce au moteur,…'],
              model: "Grâce au moteur, je monte les rues sans fatigue. Maintenant, je peux aller au marché et chez mes petits-enfants à vélo.",
            },
            {
              fr: "Comment faisiez-vous avant d'avoir ce vélo ?",
              en: 'What did you do before you had this bike?',
              kind: 'past',
              starters: ['Avant, je prenais…', "Avant, c'était…"],
              model: "Avant, je prenais toujours la voiture, même pour acheter du pain. C'était cher et je ne bougeais pas assez.",
            },
            {
              fr: "Allez-vous acheter votre propre vélo ?",
              en: 'Are you going to buy your own bike?',
              kind: 'future',
              starters: ['Oui, je vais…', "Je pense que j'achèterai…"],
              model: "Oui, je vais acheter mon propre vélo le mois prochain. Je pense même que je vendrai ma voiture.",
            },
          ],
        },
        debate: {
          motion: { fr: "Les villes devraient-elles aider les gens à acheter des vélos électriques ?", en: 'Should towns help people buy electric bikes?' },
          for: {
            starters: ['Oui, parce que…', "Comme ils coûtent cher,…"],
            model: "Oui, parce qu'ils coûtent cher et beaucoup de familles ne peuvent pas les acheter. Moins de voitures, c'est moins de pollution.",
          },
          against: {
            starters: ['Non, je pense que…', 'Il vaudrait mieux…'],
            model: "Non, je pense qu'il vaudrait mieux améliorer les bus. Un vélo électrique, ce n'est pas pratique pour tout le monde.",
          },
        },
      },
      b2: {
        fake: {
          sentence: 2,
          fr: "Le trafic dans le centre a baissé de quinze pour cent, mais presque personne n'a acheté son propre vélo.",
          en: 'Traffic in the centre has fallen by fifteen per cent, but almost nobody bought their own bike.',
          options: ['How much the rental costs', 'How many testers bought a bike', 'What still needs to be built'],
          answer: 1,
        },
        interview: {
          role: { fr: "Tu es l'adjointe au maire chargée des transports.", en: "You are the deputy mayor in charge of transport." },
          questions: [
            {
              fr: "Pourquoi avoir choisi de louer les vélos plutôt que de les donner ?",
              en: 'Why choose to rent the bikes rather than give them away?',
              kind: 'describe',
              starters: ["L'objectif était de…", 'La location permet de…'],
              model: "La location permet aux habitants d'essayer avant d'investir. L'objectif était de prouver que le vélo est possible, même en montagne.",
            },
            {
              fr: "Quelles critiques avez-vous reçues au lancement ?",
              en: 'What criticism did you get at the launch?',
              kind: 'past',
              starters: ['Certains habitants disaient que…', "On nous a reproché de…"],
              model: "Certains habitants disaient que personne ne ferait de vélo dans nos rues en pente. On nous a aussi reproché de dépenser trop d'argent.",
            },
            {
              fr: "Quand les nouvelles pistes cyclables seront-elles prêtes ?",
              en: 'When will the new cycle lanes be ready?',
              kind: 'future',
              starters: ['Les premières pistes seront…', "D'ici deux ans,…"],
              model: "Les premières pistes seront prêtes l'été prochain. D'ici deux ans, on pourra traverser la vallée à vélo en toute sécurité.",
            },
          ],
        },
        debate: {
          motion: { fr: "Faut-il réserver certaines routes de montagne aux cyclistes ?", en: 'Should some mountain roads be kept for cyclists only?' },
          for: {
            starters: ['Oui, car…', 'Pour la sécurité des cyclistes,…'],
            model: "Oui, car pour la sécurité des cyclistes, partager une route étroite avec des camions est trop dangereux. Ce serait aussi une attraction pour les touristes.",
          },
          against: {
            starters: ['Non, puisque…', "Ce serait injuste envers…"],
            model: "Non, puisque beaucoup d'habitants dépendent de leur voiture pour travailler. Ce serait injuste envers les villages isolés.",
          },
        },
      },
    },
  },

  'teen-chef': {
    examArea: 'D',
    learnTopic: 'jobs',
    levels: {
      a2: {
        fake: {
          sentence: 2,
          fr: 'Elle a préparé un poulet avec des légumes de sa grand-mère.',
          en: "She made a chicken dish with vegetables from her grandmother's garden.",
          options: ['How old Inès is', 'What dish she made', 'What she wants to do later'],
          answer: 1,
        },
        interview: {
          role: { fr: 'Tu es Inès, la jeune cheffe de quinze ans.', en: 'You are Inès, the fifteen-year-old chef.' },
          questions: [
            {
              fr: 'Qu\'est-ce que tu aimes cuisiner ?',
              en: 'What do you like cooking?',
              kind: 'describe',
              starters: ["J'aime cuisiner…", 'Mon plat préféré est…'],
              model: "J'aime cuisiner le poisson et les légumes. Mon plat préféré est la ratatouille.",
            },
            {
              fr: "Comment s'est passé le concours ?",
              en: 'How did the competition go?',
              kind: 'past',
              starters: ["J'ai préparé…", "J'étais…"],
              model: "J'étais très stressée, mais j'ai préparé mon plat en une heure. Le jury a adoré.",
            },
            {
              fr: 'Pourquoi aimes-tu la cuisine ?',
              en: 'Why do you like cooking?',
              kind: 'opinion',
              starters: ["J'aime la cuisine parce que…", 'Pour moi,…'],
              model: "J'aime la cuisine parce que je fais plaisir à ma famille. C'est créatif.",
            },
          ],
        },
        debate: {
          motion: { fr: "Les jeunes doivent-ils apprendre à cuisiner ?", en: 'Should young people learn to cook?' },
          for: {
            starters: ['Oui, parce que…', 'Cuisiner, c\'est…'],
            model: "Oui, parce que cuisiner, c'est utile. On mange mieux à la maison.",
          },
          against: {
            starters: ['Non, parce que…', 'Les jeunes ont…'],
            model: "Non, parce que les jeunes ont beaucoup de devoirs. Ils n'ont pas le temps.",
          },
        },
      },
      b1: {
        fake: {
          sentence: 3,
          fr: 'Son prix : un voyage d\'une semaine au Japon.',
          en: 'Her prize: a one-week trip to Japan.',
          options: ['How many contestants there were', 'How she learned to cook', 'What her prize is'],
          answer: 2,
        },
        interview: {
          role: { fr: "Tu es la grand-mère d'Inès, qui lui a appris à cuisiner.", en: 'You are Inès\'s grandmother, who taught her to cook.' },
          questions: [
            {
              fr: "Comment est Inès dans la cuisine ?",
              en: 'What is Inès like in the kitchen?',
              kind: 'describe',
              starters: ['Inès est…', 'Dans la cuisine, elle…'],
              model: "Inès est très patiente et curieuse. Dans la cuisine, elle goûte tout et elle pose toujours des questions.",
            },
            {
              fr: "Quand avez-vous commencé à cuisiner ensemble ?",
              en: 'When did you start cooking together?',
              kind: 'past',
              starters: ["Quand elle avait…", 'Elle venait chez moi…'],
              model: "Quand elle avait six ans, elle venait chez moi le mercredi. Nous faisions des gâteaux et nous cueillions les légumes du jardin.",
            },
            {
              fr: "Que deviendra Inès, selon vous ?",
              en: 'What will become of Inès, in your view?',
              kind: 'future',
              starters: ['Je pense qu\'elle deviendra…', 'Un jour, elle…'],
              model: "Je pense qu'elle deviendra une grande cheffe. Un jour, elle ouvrira son restaurant, et je serai sa première cliente !",
            },
          ],
        },
        debate: {
          motion: { fr: "Peut-on apprendre un métier avec des vidéos en ligne ?", en: 'Can you learn a job from online videos?' },
          for: {
            starters: ['Oui, comme Inès,…', 'Les vidéos permettent de…'],
            model: "Oui, comme Inès, on peut apprendre beaucoup de techniques avec des vidéos. C'est gratuit et on peut regarder plusieurs fois.",
          },
          against: {
            starters: ['Pas complètement, car…', 'Il faut aussi…'],
            model: "Pas complètement, car il faut aussi pratiquer avec un professionnel. Une vidéo ne peut pas corriger tes erreurs.",
          },
        },
      },
      b2: {
        fake: {
          sentence: 1,
          fr: 'Son plat, un poisson accompagné de légumes exotiques, a séduit le jury par son originalité.',
          en: 'Her dish, fish with exotic vegetables, won the judges over with its originality.',
          options: ['Who the other contestants were', 'What won the judges over', 'How she learned'],
          answer: 1,
        },
        interview: {
          role: { fr: "Tu es Inès, gagnante du concours de cuisine.", en: 'You are Inès, winner of the cooking competition.' },
          questions: [
            {
              fr: "Pourquoi avez-vous choisi un plat aussi simple ?",
              en: 'Why did you choose such a simple dish?',
              kind: 'describe',
              starters: ['Je voulais montrer que…', 'Pour moi, la cuisine doit…'],
              model: "Je voulais montrer que les produits de saison n'ont pas besoin d'être compliqués. Pour moi, la cuisine doit rester accessible à tous.",
            },
            {
              fr: "Comment vous êtes-vous sentie face à des candidats plus expérimentés ?",
              en: 'How did you feel against more experienced contestants?',
              kind: 'past',
              starters: ["Au début, j'étais…", "J'ai décidé de…"],
              model: "Au début, j'étais très intimidée parce qu'ils sortaient d'écoles de cuisine. J'ai décidé de rester moi-même et de cuisiner comme ma grand-mère.",
            },
            {
              fr: "Quel genre de restaurant aimeriez-vous ouvrir ?",
              en: 'What kind of restaurant would you like to open?',
              kind: 'future',
              starters: ["J'aimerais ouvrir…", 'Dans mon restaurant,…'],
              model: "J'aimerais ouvrir un petit restaurant à la campagne. Dans mon restaurant, le menu changerait chaque semaine selon les légumes du jardin.",
            },
          ],
        },
        debate: {
          motion: { fr: "Faut-il aller dans une école pour devenir un bon cuisinier ?", en: 'Do you need to go to a school to become a good cook?' },
          for: {
            starters: ['Oui, car…', "Une école apporte…"],
            model: "Oui, car une école apporte des bases solides et des contacts. Dans un grand restaurant, on attend des diplômes et une technique parfaite.",
          },
          against: {
            starters: ["Pas forcément, comme le prouve…", 'La passion compte plus que…'],
            model: "Pas forcément, comme le prouve Inès. La passion et la curiosité comptent plus qu'un diplôme, surtout au début.",
          },
        },
      },
    },
  },

  'car-free-village': {
    examArea: 'C',
    learnTopic: 'transport',
    levels: {
      a2: {
        fake: {
          sentence: 1,
          fr: 'Les touristes laissent leur voiture en bas et prennent un petit bus.',
          en: 'Tourists leave their car at the bottom and take a little bus.',
          options: ['How tourists get up to the village', 'How people get around in the village', 'What the village is like'],
          answer: 0,
        },
        interview: {
          role: { fr: 'Tu es un enfant qui habite dans le village sans voitures.', en: 'You are a child who lives in the car-free village.' },
          questions: [
            {
              fr: 'Comment est ton village ?',
              en: 'What is your village like?',
              kind: 'describe',
              starters: ['Mon village est…', 'Il y a…'],
              model: "Mon village est petit et très calme. Il y a des montagnes partout.",
            },
            {
              fr: "Comment es-tu allé à l'école ce matin ?",
              en: 'How did you get to school this morning?',
              kind: 'past',
              starters: ['Ce matin, je suis allé…', "J'ai marché…"],
              model: "Ce matin, je suis allé à l'école à pied avec mes amis. On a parlé et rigolé.",
            },
            {
              fr: 'Tu aimes vivre sans voitures ? Pourquoi ?',
              en: 'Do you like living without cars? Why?',
              kind: 'opinion',
              starters: ["Oui, j'aime parce que…", "C'est…"],
              model: "Oui, j'aime parce que je peux jouer dans la rue. C'est calme.",
            },
          ],
        },
        debate: {
          motion: { fr: 'Tu voudrais habiter dans un village sans voitures ?', en: 'Would you like to live in a car-free village?' },
          for: {
            starters: ["Oui, j'aimerais parce que…", "Ce serait…"],
            model: "Oui, j'aimerais parce que l'air est propre. Ce serait calme et sûr.",
          },
          against: {
            starters: ['Non, parce que…', 'Sans voiture,…'],
            model: "Non, parce que sans voiture, c'est difficile de faire les courses. Et le cinéma est loin.",
          },
        },
      },
      b1: {
        fake: {
          sentence: 0,
          fr: 'Perché à mille six cents mètres d\'altitude, ce village savoyard a interdit les voitures il y a deux ans.',
          en: 'Perched at one thousand six hundred metres, this village in Savoie banned cars two years ago.',
          options: ['When cars were banned', 'How visitors get up', 'How deliveries are made'],
          answer: 0,
        },
        interview: {
          role: { fr: "Tu es une habitante du village, qui y vit depuis toujours.", en: 'You are a villager who has always lived there.' },
          questions: [
            {
              fr: "Comment se passe la vie quotidienne sans voiture ?",
              en: 'What is daily life like without a car?',
              kind: 'describe',
              starters: ['Tous les jours, je…', 'Pour faire les courses,…'],
              model: "Tous les jours, je marche beaucoup. Pour faire les courses, je prends le funiculaire jusqu'à la vallée avec un grand sac.",
            },
            {
              fr: "Comment était le village avant l'interdiction des voitures ?",
              en: 'What was the village like before cars were banned?',
              kind: 'past',
              starters: ['Avant, il y avait…', 'Quand j\'étais jeune,…'],
              model: "Avant, il y avait des embouteillages en hiver et beaucoup de bruit. Quand j'étais jeune, on ne pouvait pas jouer dans les rues.",
            },
            {
              fr: "Est-ce que vous resterez toujours dans ce village ?",
              en: 'Will you always stay in this village?',
              kind: 'future',
              starters: ['Oui, je resterai…', "Je ne partirai jamais parce que…"],
              model: "Oui, je resterai ici toute ma vie. Je ne partirai jamais parce que le silence de la montagne est trop précieux.",
            },
          ],
        },
        debate: {
          motion: { fr: "Faut-il interdire les voitures dans les stations de ski ?", en: 'Should cars be banned in ski resorts?' },
          for: {
            starters: ['Oui, parce que…', 'Sans voitures,…'],
            model: "Oui, parce que sans voitures, l'air de la montagne reste pur. Les touristes viennent justement pour le calme.",
          },
          against: {
            starters: ['Non, car…', "C'est compliqué pour…"],
            model: "Non, car c'est compliqué pour les familles avec beaucoup de bagages. Et les livraisons coûtent plus cher.",
          },
        },
      },
      b2: {
        fake: {
          sentence: 1,
          fr: "C'est l'inverse qui s'est produit : le calme et l'air pur attirent aujourd'hui des retraités, mais seulement en été.",
          en: 'The opposite happened: the calm and pure air now attract retired people, but only in summer.',
          options: ['What people predicted', 'Who comes now, and when', 'How deliveries are made'],
          answer: 1,
        },
        interview: {
          role: { fr: "Tu es l'ancien maire qui a interdit les voitures il y a vingt ans.", en: 'You are the former mayor who banned cars twenty years ago.' },
          questions: [
            {
              fr: "Pourquoi avez-vous pris cette décision ?",
              en: 'Why did you make this decision?',
              kind: 'past',
              starters: ["À l'époque,…", "J'ai pris cette décision parce que…"],
              model: "À l'époque, les voitures envahissaient nos petites rues. J'ai pris cette décision parce que le village perdait son âme.",
            },
            {
              fr: "Qu'est-ce qui rend ce modèle difficile à copier ?",
              en: 'What makes this model hard to copy?',
              kind: 'describe',
              starters: ['Ce modèle suppose…', "Il faut que les habitants…"],
              model: "Ce modèle suppose des habitants prêts à marcher et à renoncer à un peu de confort. Il faut aussi un funiculaire, qui coûte très cher.",
            },
            {
              fr: "Que conseilleriez-vous à un maire qui voudrait faire la même chose ?",
              en: 'What would you advise a mayor who wanted to do the same?',
              kind: 'future',
              starters: ['Je lui conseillerais de…', "Il faudra qu'il…"],
              model: "Je lui conseillerais d'écouter d'abord les habitants. Il faudra qu'il propose des solutions pour les personnes âgées avant d'interdire quoi que ce soit.",
            },
          ],
        },
        debate: {
          motion: { fr: "Le confort de la voiture vaut-il plus que le calme ?", en: 'Is the comfort of a car worth more than peace and quiet?' },
          for: {
            starters: ['Pour beaucoup de gens, oui, car…', 'La voiture offre…'],
            model: "Pour beaucoup de gens, oui, car la voiture offre une liberté totale. Sans elle, aller au travail ou chez le médecin devient un vrai problème.",
          },
          against: {
            starters: ['Je ne crois pas, puisque…', 'Ce village prouve que…'],
            model: "Je ne crois pas, puisque ce village prouve qu'on peut vivre heureux sans voiture. Le calme et l'air pur valent bien quelques efforts.",
          },
        },
      },
    },
  },
};
