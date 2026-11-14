/**
 * Show segments for editions 22–28 (daily-news §7). Hand-written; covered by the
 * story's `reviewed` flag (content-authoring §17).
 */
import type { NewsEditionSegments } from '../types';

export const SEGMENTS_WEEK4: Record<string, NewsEditionSegments> = {
  'robot-fish': {
    examArea: 'D',
    learnTopic: 'environment',
    levels: {
      a2: {
        fake: {
          sentence: 2,
          fr: 'Il a une batterie et il nage pendant deux heures.',
          en: 'It has a battery and swims for two hours.',
          options: ['Where the robot swims', 'How long it swims', 'How the real fish react'],
          answer: 1,
        },
        interview: {
          role: { fr: 'Tu es une ingénieure qui a fabriqué le poisson robot.', en: 'You are an engineer who built the robot fish.' },
          questions: [
            {
              fr: 'Comment est le poisson robot ?',
              en: 'What is the robot fish like?',
              kind: 'describe',
              starters: ['Le robot est…', 'Il ressemble à…'],
              model: "Le robot est gris et assez petit. Il ressemble à un vrai poisson.",
            },
            {
              fr: "Qu'est-ce que le robot a trouvé hier ?",
              en: 'What did the robot find yesterday?',
              kind: 'past',
              starters: ['Hier, le robot a trouvé…', 'Hier, il a mesuré…'],
              model: "Hier, le robot a trouvé un peu de pétrole près d'un bateau. Nous avons appelé le port.",
            },
            {
              fr: 'Tu aimes ton travail ? Pourquoi ?',
              en: 'Do you like your job? Why?',
              kind: 'opinion',
              starters: ["Oui, j'adore parce que…", 'Mon travail est…'],
              model: "Oui, j'adore parce que je protège la mer. Mon travail est très intéressant.",
            },
          ],
        },
        debate: {
          motion: { fr: 'Les robots sont-ils utiles pour la nature ?', en: 'Are robots useful for nature?' },
          for: {
            starters: ['Oui, parce que…', 'Les robots peuvent…'],
            model: "Oui, parce que les robots peuvent aller sous l'eau. Ils travaillent jour et nuit.",
          },
          against: {
            starters: ['Non, parce que…', 'Les robots coûtent…'],
            model: "Non, parce que les robots coûtent cher. Et ils peuvent casser dans la mer.",
          },
        },
      },
      b1: {
        fake: {
          sentence: 1,
          fr: "Long de cinq mètres, il nage silencieusement grâce à sa queue qui bouge comme celle d'un vrai poisson.",
          en: "Five metres long, it swims silently thanks to its tail, which moves like a real fish's.",
          options: ['How long the robot is', 'Where its results go', 'What happens if pollution is found'],
          answer: 0,
        },
        interview: {
          role: { fr: "Tu es l'ingénieur qui a eu l'idée du poisson robot.", en: 'You are the engineer who came up with the robot fish.' },
          questions: [
            {
              fr: "Comment fonctionne le robot ?",
              en: 'How does the robot work?',
              kind: 'describe',
              starters: ['Le robot nage grâce à…', 'Ses capteurs…'],
              model: "Le robot nage grâce à sa queue, comme un vrai poisson. Ses capteurs analysent l'eau et envoient les résultats sur mon ordinateur.",
            },
            {
              fr: "D'où vous est venue cette idée ?",
              en: 'Where did this idea come from?',
              kind: 'past',
              starters: ["J'ai eu l'idée quand…", 'Un jour, en plongée,…'],
              model: "Un jour, en plongée, j'ai remarqué que les poissons ne faisaient aucun bruit. J'ai pensé qu'un robot pourrait nager de la même façon.",
            },
            {
              fr: "Quelle sera la prochaine étape du projet ?",
              en: 'What will the next step of the project be?',
              kind: 'future',
              starters: ['La prochaine étape sera…', 'Nous allons…'],
              model: "La prochaine étape sera de fabriquer dix robots. Nous allons les tester dans d'autres ports de la Méditerranée.",
            },
          ],
        },
        debate: {
          motion: { fr: "Les robots vont-ils remplacer les humains au travail ?", en: 'Will robots replace humans at work?' },
          for: {
            starters: ['Oui, je pense que…', 'Les robots sont plus…'],
            model: "Oui, je pense que les robots sont plus rapides et ne se fatiguent jamais. Beaucoup de métiers vont disparaître.",
          },
          against: {
            starters: ['Non, parce que…', 'Il faudra toujours…'],
            model: "Non, parce qu'il faudra toujours des humains pour créer et réparer les robots. Ce poisson a besoin de ses ingénieurs !",
          },
        },
      },
      b2: {
        fake: {
          sentence: 3,
          fr: "Les chercheurs aimeraient maintenant vendre ces robots aux pêcheurs pour trouver plus de poissons.",
          en: 'The researchers would now like to sell these robots to fishermen so they can find more fish.',
          options: ['Why the robot does not scare wildlife', 'How fast it spots pollution', 'What the researchers want to do next'],
          answer: 2,
        },
        interview: {
          role: { fr: "Tu es une chercheuse spécialiste du biomimétisme.", en: 'You are a researcher specialising in biomimicry.' },
          questions: [
            {
              fr: "Pourquoi s'inspirer de la nature pour créer des machines ?",
              en: 'Why take inspiration from nature to create machines?',
              kind: 'describe',
              starters: ['La nature a déjà…', "Contrairement aux hélices,…"],
              model: "La nature a déjà résolu beaucoup de problèmes. Contrairement aux hélices, la queue d'un poisson avance sans bruit et sans abîmer les fonds marins.",
            },
            {
              fr: "Quelles difficultés avez-vous rencontrées pendant les premiers essais ?",
              en: 'What difficulties did you have during the first tests?',
              kind: 'past',
              starters: ['Lors des premiers essais,…', "Le robot avait tendance à…"],
              model: "Lors des premiers essais, le robot tournait en rond. Nous avons mis six mois à imiter correctement le mouvement de la queue.",
            },
            {
              fr: "Comment ces robots pourraient-ils changer la protection des océans ?",
              en: 'How could these robots change ocean protection?',
              kind: 'future',
              starters: ['Grâce à ces robots, on pourra…', "D'ici quelques années,…"],
              model: "D'ici quelques années, un banc de robots surveillera toute la côte. On pourra réagir en quelques minutes au lieu d'attendre plusieurs jours.",
            },
          ],
        },
        debate: {
          motion: { fr: "La technologie peut-elle sauver la planète ?", en: 'Can technology save the planet?' },
          for: {
            starters: ['Oui, car…', 'Des inventions comme ce robot…'],
            model: "Oui, car des inventions comme ce robot détectent les problèmes plus vite que les humains. Sans la technologie, nous ne pourrions pas surveiller les océans.",
          },
          against: {
            starters: ['Pas toute seule, puisque…', 'Il faut surtout…'],
            model: "Pas toute seule, puisqu'un robot ne fait que mesurer la pollution. Il faut surtout changer nos habitudes pour polluer moins.",
          },
        },
      },
    },
  },

  'museum-night': {
    examArea: 'B',
    learnTopic: 'arts',
    levels: {
      a2: {
        fake: {
          sentence: 1,
          fr: "L'entrée coûte cinq euros jusqu'à minuit.",
          en: 'Entry costs five euros until midnight.',
          options: ['Which city the museum is in', 'How much entry costs', 'What young people can do'],
          answer: 1,
        },
        interview: {
          role: { fr: 'Tu es une adolescente qui visite le musée la nuit.', en: 'You are a teenager visiting the museum at night.' },
          questions: [
            {
              fr: 'Comment est le musée la nuit ?',
              en: 'What is the museum like at night?',
              kind: 'describe',
              starters: ['Le musée est…', 'Il y a…'],
              model: "Le musée est un peu mystérieux la nuit. Il y a de la musique et beaucoup de jeunes.",
            },
            {
              fr: "Qu'est-ce que tu as fait samedi soir au musée ?",
              en: 'What did you do on Saturday evening at the museum?',
              kind: 'past',
              starters: ["Samedi soir, j'ai…", "J'ai dessiné…"],
              model: "Samedi soir, j'ai dessiné devant un grand tableau. Après, j'ai dansé avec mes amis.",
            },
            {
              fr: 'Tu aimes les musées ? Pourquoi ?',
              en: 'Do you like museums? Why?',
              kind: 'opinion',
              starters: ["Oui, j'aime parce que…", "Avant, je trouvais…"],
              model: "Avant, je trouvais les musées ennuyeux. Maintenant, j'aime parce que c'est amusant.",
            },
          ],
        },
        debate: {
          motion: { fr: 'Les musées sont-ils ennuyeux pour les jeunes ?', en: 'Are museums boring for young people?' },
          for: {
            starters: ['Oui, parce que…', 'Dans les musées, on…'],
            model: "Oui, parce que dans les musées, on doit être silencieux. On ne peut rien toucher.",
          },
          against: {
            starters: ['Non, parce que…', 'Les musées peuvent…'],
            model: "Non, parce que les musées peuvent être amusants. Il y a des jeux et des ateliers.",
          },
        },
      },
      b1: {
        fake: {
          sentence: 2,
          fr: 'Les guides sont des professeurs à la retraite.',
          en: 'The guides are retired teachers.',
          options: ['How often the museum opens late', 'Who the guides are', 'What the museum hopes for'],
          answer: 1,
        },
        interview: {
          role: { fr: "Tu es un étudiant qui sert de guide pendant la nuit au musée.", en: 'You are a student who works as a guide during museum night.' },
          questions: [
            {
              fr: "Qu'est-ce qu'il y a au programme de la soirée ?",
              en: "What is on the evening's programme?",
              kind: 'describe',
              starters: ['Au programme, il y a…', 'Les visiteurs peuvent…'],
              model: "Au programme, il y a des concerts et un jeu d'enquête. Les visiteurs peuvent aussi dessiner au milieu des œuvres.",
            },
            {
              fr: "Racontez-nous un moment drôle de la dernière soirée.",
              en: 'Tell us about a funny moment from the last evening.',
              kind: 'past',
              starters: ['Pendant le jeu d\'enquête,…', 'Un groupe de jeunes a…'],
              model: "Pendant le jeu d'enquête, un groupe a cru qu'une statue était le coupable ! Ils ont ri pendant dix minutes.",
            },
            {
              fr: "Quelle nouvelle activité proposerez-vous le mois prochain ?",
              en: 'What new activity will you offer next month?',
              kind: 'future',
              starters: ['Le mois prochain, nous proposerons…', "J'aimerais organiser…"],
              model: "Le mois prochain, nous proposerons un concours de selfies avec les tableaux. J'aimerais aussi organiser un atelier de street art.",
            },
          ],
        },
        debate: {
          motion: { fr: "Les musées devraient-ils être gratuits pour les jeunes ?", en: 'Should museums be free for young people?' },
          for: {
            starters: ['Oui, parce que…', "C'est important car…"],
            model: "Oui, parce que l'art doit être pour tout le monde. Beaucoup de jeunes n'ont pas assez d'argent pour payer l'entrée.",
          },
          against: {
            starters: ['Non, je pense que…', 'Les musées ont besoin de…'],
            model: "Non, je pense que les musées ont besoin d'argent pour protéger les œuvres. Un petit prix réduit serait plus juste.",
          },
        },
      },
      b2: {
        fake: {
          sentence: 1,
          fr: "Pour changer cette image, un musée strasbourgeois organise chaque semaine une nocturne payante réservée aux treize-dix-huit ans.",
          en: 'To change that image, a Strasbourg museum holds a paid late opening every week just for thirteen- to eighteen-year-olds.',
          options: ['Why teenagers avoid museums', 'How often and at what price the late opening runs', 'What most participants say'],
          answer: 1,
        },
        interview: {
          role: { fr: "Tu es la directrice du musée de Strasbourg.", en: 'You are the director of the Strasbourg museum.' },
          questions: [
            {
              fr: "Pourquoi les adolescents évitent-ils les musées, selon vous ?",
              en: 'Why do teenagers avoid museums, in your view?',
              kind: 'describe',
              starters: ['Ils les trouvent souvent…', 'Les musées donnent l\'impression de…'],
              model: "Ils les trouvent souvent intimidants. Les musées donnent l'impression qu'il faut tout savoir sur l'art pour entrer, ce qui est faux.",
            },
            {
              fr: "Comment la première nocturne s'est-elle passée ?",
              en: 'How did the first late opening go?',
              kind: 'past',
              starters: ["Nous attendions…, mais…", "J'ai été surprise de voir…"],
              model: "Nous attendions une centaine de jeunes, mais quatre cents sont venus. J'ai été surprise de voir des files d'attente jusque dans la rue.",
            },
            {
              fr: "Comment imaginez-vous le musée idéal pour les jeunes ?",
              en: 'How do you imagine the ideal museum for young people?',
              kind: 'future',
              starters: ['Le musée idéal serait…', "On pourrait y…"],
              model: "Le musée idéal serait un lieu vivant, ouvert le soir. On pourrait y toucher certaines œuvres, créer et discuter sans chuchoter.",
            },
          ],
        },
        debate: {
          motion: { fr: "Faut-il transformer les musées en lieux de fête pour attirer les jeunes ?", en: 'Should museums become party venues to attract young people?' },
          for: {
            starters: ['Oui, car…', "Si c'est le prix à payer pour…"],
            model: "Oui, car si c'est le prix à payer pour que les jeunes découvrent l'art, cela vaut la peine. La plupart des participants disent qu'ils reviendront.",
          },
          against: {
            starters: ['Pas vraiment, puisque…', 'Un musée doit rester…'],
            model: "Pas vraiment, puisqu'un musée doit rester un lieu calme pour regarder les œuvres. La musique et la foule pourraient même les abîmer.",
          },
        },
      },
    },
  },

  'cardboard-boats': {
    examArea: 'B',
    learnTopic: 'hobbies',
    levels: {
      a2: {
        fake: {
          sentence: 1,
          fr: 'Les équipes fabriquent leur bateau avec du carton et du bois.',
          en: 'The teams build their boat with cardboard and wood.',
          options: ['Where the race is', 'What the boats are made of', 'What the winner gets'],
          answer: 1,
        },
        interview: {
          role: { fr: "Tu es un membre d'une équipe de la course de bateaux en carton.", en: 'You are a member of a team in the cardboard boat race.' },
          questions: [
            {
              fr: 'Comment est ton bateau ?',
              en: 'What is your boat like?',
              kind: 'describe',
              starters: ['Mon bateau est…', 'Il ressemble à…'],
              model: "Mon bateau est grand et jaune. Il ressemble à une banane !",
            },
            {
              fr: "Qu'est-ce qui s'est passé pendant la course ?",
              en: 'What happened during the race?',
              kind: 'past',
              starters: ['Pendant la course,…', 'Notre bateau a…'],
              model: "Pendant la course, notre bateau a coulé au milieu du lac. Nous avons nagé et nous avons beaucoup ri.",
            },
            {
              fr: 'Tu aimes cette course ? Pourquoi ?',
              en: 'Do you like this race? Why?',
              kind: 'opinion',
              starters: ["Oui, j'adore parce que…", "C'est…"],
              model: "Oui, j'adore parce que c'est très drôle. On fait ça avec ses amis.",
            },
          ],
        },
        debate: {
          motion: { fr: 'Les fêtes bizarres sont-elles plus amusantes que les fêtes normales ?', en: 'Are strange festivals more fun than normal ones?' },
          for: {
            starters: ['Oui, parce que…', "C'est original…"],
            model: "Oui, parce que c'est original. On rit beaucoup.",
          },
          against: {
            starters: ['Non, parce que…', 'Je préfère…'],
            model: "Non, parce que je préfère les fêtes avec de la musique et à manger.",
          },
        },
      },
      b1: {
        fake: {
          sentence: 3,
          fr: 'Une équipe de grands-parents a gagné avec un bateau en forme de requin, et tout le carton sera recyclé.',
          en: 'A team of grandparents won with a shark-shaped boat, and all the cardboard will be recycled.',
          options: ['What materials are allowed', 'Who won the race', 'What happened at the start'],
          answer: 1,
        },
        interview: {
          role: { fr: "Tu es une des collégiennes qui ont gagné avec le bateau requin.", en: 'You are one of the pupils who won with the shark boat.' },
          questions: [
            {
              fr: "Comment avez-vous fabriqué votre bateau ?",
              en: 'How did you build your boat?',
              kind: 'past',
              starters: ['Nous avons utilisé…', "D'abord, nous avons…"],
              model: "D'abord, nous avons dessiné un requin. Ensuite, nous avons utilisé vingt cartons et beaucoup de scotch pendant trois week-ends.",
            },
            {
              fr: "Qu'est-ce qui rendait votre bateau si solide ?",
              en: 'What made your boat so strong?',
              kind: 'describe',
              starters: ['Notre bateau était solide parce que…', 'Le secret, c\'était…'],
              model: "Le secret, c'était la peinture : elle protégeait le carton de l'eau. Et nous avions mis plusieurs couches de carton sous le bateau.",
            },
            {
              fr: "Que ferez-vous l'année prochaine ?",
              en: 'What will you do next year?',
              kind: 'future',
              starters: ["L'année prochaine, nous…", 'Nous essaierons de…'],
              model: "L'année prochaine, nous reviendrons pour défendre notre titre. Nous essaierons de fabriquer une baleine encore plus grande.",
            },
          ],
        },
        debate: {
          motion: { fr: "Les activités créatives sont-elles aussi importantes que le sport ?", en: 'Are creative activities as important as sport?' },
          for: {
            starters: ['Oui, parce que…', 'La créativité permet de…'],
            model: "Oui, parce que la créativité permet de trouver des solutions. En plus, on travaille en équipe, comme au sport.",
          },
          against: {
            starters: ['Non, je pense que…', 'Le sport est meilleur pour…'],
            model: "Non, je pense que le sport est meilleur pour la santé. On bouge plus quand on joue au foot que quand on fait du bricolage.",
          },
        },
      },
      b2: {
        fake: {
          sentence: 2,
          fr: "La victoire est revenue à des étudiants en ingénierie, dont le requin géant a parcouru les deux cents mètres sans prendre l'eau.",
          en: 'Victory went to some engineering students, whose giant shark covered the two hundred metres without letting in water.',
          options: ['What the boats were made of', 'Who won the race', 'What the organisers want to raise awareness of'],
          answer: 1,
        },
        interview: {
          role: { fr: "Tu es l'organisateur de la régate en carton.", en: 'You are the organiser of the cardboard regatta.' },
          questions: [
            {
              fr: "Quel message voulez-vous faire passer avec cette course ?",
              en: 'What message do you want to send with this race?',
              kind: 'describe',
              starters: ['Nous voulons montrer que…', 'Le carton, souvent jeté,…'],
              model: "Nous voulons montrer qu'un déchet peut devenir une ressource. Le carton, souvent jeté sans réfléchir, peut flotter et même faire rêver.",
            },
            {
              fr: "Quelle embarcation vous a le plus impressionné cette année ?",
              en: 'Which boat impressed you most this year?',
              kind: 'past',
              starters: ["J'ai été impressionné par…", 'Une équipe a construit…'],
              model: "J'ai été impressionné par une équipe qui avait construit un château flottant. Il a coulé au bout de cinquante mètres, mais le public l'a applaudi.",
            },
            {
              fr: "Comment la course évoluera-t-elle dans les prochaines années ?",
              en: 'How will the race develop in the coming years?',
              kind: 'future',
              starters: ["Nous aimerions que…", "À l'avenir, la course…"],
              model: "À l'avenir, la course accueillera des équipes de toute l'Europe. Nous aimerions aussi qu'elle serve à récolter de l'argent pour une association.",
            },
          ],
        },
        debate: {
          motion: { fr: "Les fêtes populaires doivent-elles toujours avoir un message écologique ?", en: 'Should popular festivals always carry an environmental message?' },
          for: {
            starters: ['Oui, puisque…', 'Une fête attire…'],
            model: "Oui, puisqu'une fête attire beaucoup de monde et peut changer les habitudes. C'est une occasion idéale de parler du recyclage.",
          },
          against: {
            starters: ['Pas forcément, car…', "Une fête doit d'abord…"],
            model: "Pas forcément, car une fête doit d'abord être un moment de plaisir. Si on fait la morale partout, les gens finissent par se lasser.",
          },
        },
      },
    },
  },

  'candlemas-crepes': {
    examArea: 'B',
    learnTopic: 'food',
    levels: {
      a2: {
        fake: {
          sentence: 2,
          fr: 'On fait sauter la crêpe dans la poêle avec une fleur dans la main.',
          en: 'You flip the pancake in the pan with a flower in your hand.',
          options: ['What families eat', 'What you hold while flipping', 'Why you do it'],
          answer: 1,
        },
        interview: {
          role: { fr: 'Tu es un enfant qui fait des crêpes avec sa famille.', en: 'You are a child making pancakes with your family.' },
          questions: [
            {
              fr: "Qu'est-ce que tu mets sur tes crêpes ?",
              en: 'What do you put on your pancakes?',
              kind: 'describe',
              starters: ['Je mets…', "J'aime les crêpes avec…"],
              model: "Je mets du chocolat et de la banane. J'aime aussi les crêpes avec du sucre.",
            },
            {
              fr: "Ta première crêpe est bien retombée ?",
              en: 'Did your first pancake land properly?',
              kind: 'past',
              starters: ['Oui, elle est…', "Non, elle est tombée…"],
              model: "Non, elle est tombée par terre ! Le chien l'a mangée et tout le monde a ri.",
            },
            {
              fr: 'Tu aimes la Chandeleur ? Pourquoi ?',
              en: 'Do you like Candlemas? Why?',
              kind: 'opinion',
              starters: ["Oui, j'adore parce que…", "C'est ma fête préférée car…"],
              model: "Oui, j'adore parce qu'on mange des crêpes en famille. C'est très amusant.",
            },
          ],
        },
        debate: {
          motion: { fr: 'Les traditions sont-elles importantes ?', en: 'Are traditions important?' },
          for: {
            starters: ['Oui, parce que…', 'Avec les traditions, on…'],
            model: "Oui, parce qu'avec les traditions, on passe du temps en famille. C'est joyeux.",
          },
          against: {
            starters: ['Pas vraiment, parce que…', 'On peut…'],
            model: "Pas vraiment, parce qu'on peut manger des crêpes tous les jours ! On n'a pas besoin d'une fête.",
          },
        },
      },
      b1: {
        fake: {
          sentence: 0,
          fr: 'Chaque année, le deux mars, les Français célèbrent la Chandeleur en préparant des crêpes.',
          en: 'Every year, on the second of March, French people celebrate Candlemas by making crêpes.',
          options: ['The date of Candlemas', 'Where the festival comes from', 'What happens if the crêpe lands well'],
          answer: 0,
        },
        interview: {
          role: { fr: "Tu es une crêpière qui tient un stand de crêpes à Rennes.", en: 'You are a crêpe maker who runs a crêpe stall in Rennes.' },
          questions: [
            {
              fr: "Quelle est votre recette de crêpes ?",
              en: 'What is your crêpe recipe?',
              kind: 'describe',
              starters: ['Il faut de la farine,…', "D'abord, on mélange…"],
              model: "D'abord, on mélange de la farine, des œufs et du lait. Ensuite, on laisse reposer la pâte une heure avant de la cuire.",
            },
            {
              fr: "Combien de crêpes avez-vous faites hier ?",
              en: 'How many crêpes did you make yesterday?',
              kind: 'past',
              starters: ["Hier, j'ai fait…", "Il y avait tellement de…"],
              model: "Hier, j'ai fait plus de cinq cents crêpes ! Il y avait tellement de clients que j'ai travaillé jusqu'à minuit.",
            },
            {
              fr: "Allez-vous créer une nouvelle crêpe l'année prochaine ?",
              en: 'Are you going to create a new crêpe next year?',
              kind: 'future',
              starters: ['Oui, je vais créer…', "L'année prochaine, je proposerai…"],
              model: "Oui, l'année prochaine, je proposerai une crêpe aux pommes et au caramel salé. Je vais l'appeler « la Bretonne ».",
            },
          ],
        },
        debate: {
          motion: { fr: "Faut-il garder les vieilles traditions ?", en: 'Should old traditions be kept?' },
          for: {
            starters: ['Oui, je pense que…', 'Les traditions nous rappellent…'],
            model: "Oui, je pense que les traditions nous rappellent notre histoire. En plus, elles réunissent les familles autour d'un bon repas.",
          },
          against: {
            starters: ['Pas toutes, car…', 'Certaines traditions…'],
            model: "Pas toutes, car certaines traditions n'ont plus de sens aujourd'hui. On peut en créer de nouvelles qui nous ressemblent.",
          },
        },
      },
      b2: {
        fake: {
          sentence: 3,
          fr: "Les ventes de farine et d'œufs baissent d'ailleurs chaque année à cette période, preuve que la coutume disparaît peu à peu.",
          en: 'Sales of flour and eggs drop every year at this time, proof that the custom is slowly dying out.',
          options: ['What the crêpe may have symbolised', 'Why you hold a coin', 'What happens to flour and egg sales'],
          answer: 2,
        },
        interview: {
          role: { fr: "Tu es un historien spécialiste des fêtes françaises.", en: 'You are a historian who specialises in French festivals.' },
          questions: [
            {
              fr: "Que symbolisait la crêpe autrefois ?",
              en: 'What did the crêpe once symbolise?',
              kind: 'describe',
              starters: ['Ronde et dorée, la crêpe…', 'Elle aurait représenté…'],
              model: "Ronde et dorée, la crêpe aurait représenté le soleil. Après un long hiver, on célébrait le retour de la lumière et des beaux jours.",
            },
            {
              fr: "Comment la Chandeleur a-t-elle changé au fil des siècles ?",
              en: 'How has Candlemas changed over the centuries?',
              kind: 'past',
              starters: ["À l'origine, c'était…", 'Peu à peu,…'],
              model: "À l'origine, c'était une fête des chandelles. Peu à peu, le côté gourmand a pris le dessus, et aujourd'hui, on pense surtout aux crêpes.",
            },
            {
              fr: "Cette tradition existera-t-elle encore dans cent ans ?",
              en: 'Will this tradition still exist in a hundred years?',
              kind: 'future',
              starters: ["Je suis convaincu que…", 'Tant que les familles…'],
              model: "Je suis convaincu qu'elle existera encore. Tant que les familles aimeront se retrouver autour d'une poêle, la Chandeleur restera vivante.",
            },
          ],
        },
        debate: {
          motion: { fr: "Les fêtes traditionnelles sont-elles devenues trop commerciales ?", en: 'Have traditional festivals become too commercial?' },
          for: {
            starters: ['Oui, car…', "Aujourd'hui, les magasins…"],
            model: "Oui, car aujourd'hui, les magasins utilisent chaque fête pour vendre plus. On oublie souvent le sens de la tradition.",
          },
          against: {
            starters: ['Pas vraiment, puisque…', "L'essentiel reste…"],
            model: "Pas vraiment, puisque faire des crêpes coûte très peu. L'essentiel reste le moment partagé en famille, pas ce qu'on achète.",
          },
        },
      },
    },
  },

  'april-fish': {
    examArea: 'B',
    learnTopic: 'school',
    levels: {
      a2: {
        fake: {
          sentence: 1,
          fr: 'En France, les enfants collent des oiseaux en papier dans le dos des gens.',
          en: "In France, children stick paper birds on people's backs.",
          options: ['What children stick on backs', 'What everyone shouts', 'What newspapers do'],
          answer: 0,
        },
        interview: {
          role: { fr: "Tu es un élève qui a fait une farce à son professeur.", en: 'You are a pupil who played a prank on your teacher.' },
          questions: [
            {
              fr: 'Comment est ton poisson en papier ?',
              en: 'What is your paper fish like?',
              kind: 'describe',
              starters: ['Mon poisson est…', 'Il est…'],
              model: "Mon poisson est bleu et vert. Il est petit, avec un grand sourire.",
            },
            {
              fr: "Qu'est-ce que tu as fait ce matin ?",
              en: 'What did you do this morning?',
              kind: 'past',
              starters: ["Ce matin, j'ai collé…", "J'ai attendu…"],
              model: "Ce matin, j'ai collé le poisson dans le dos du professeur. Toute la classe a ri !",
            },
            {
              fr: 'Tu aimes le premier avril ? Pourquoi ?',
              en: 'Do you like the first of April? Why?',
              kind: 'opinion',
              starters: ["Oui, j'adore parce que…", "C'est…"],
              model: "Oui, j'adore parce que c'est drôle. Tout le monde rit ce jour-là.",
            },
          ],
        },
        debate: {
          motion: { fr: 'Les farces sont-elles toujours drôles ?', en: 'Are pranks always funny?' },
          for: {
            starters: ['Oui, parce que…', 'Les farces…'],
            model: "Oui, parce que les farces rendent la journée amusante. On rit ensemble.",
          },
          against: {
            starters: ['Non, parce que…', 'Certaines personnes…'],
            model: "Non, parce que certaines personnes sont tristes. Ce n'est pas drôle pour tout le monde.",
          },
        },
      },
      b1: {
        fake: {
          sentence: 3,
          fr: "Tout le monde sait d'où vient cette tradition, qui existerait depuis le dix-neuvième siècle.",
          en: 'Everybody knows where this tradition comes from; it may have existed since the nineteenth century.',
          options: ['What children try to do', 'What radio and newspapers do', 'Where the tradition comes from and how old it is'],
          answer: 2,
        },
        interview: {
          role: { fr: "Tu es une journaliste de radio qui a inventé une fausse nouvelle pour le premier avril.", en: 'You are a radio journalist who made up a fake story for April Fools.' },
          questions: [
            {
              fr: "Quelle fausse nouvelle avez-vous inventée ?",
              en: 'What fake story did you make up?',
              kind: 'past',
              starters: ["J'ai annoncé que…", 'Nous avons raconté que…'],
              model: "J'ai annoncé que la tour Eiffel allait être peinte en rose. Beaucoup d'auditeurs ont appelé la radio pour se plaindre !",
            },
            {
              fr: "Comment rend-on une fausse nouvelle crédible ?",
              en: 'How do you make a fake story believable?',
              kind: 'describe',
              starters: ['Il faut…', "Le secret, c'est de…"],
              model: "Le secret, c'est de donner des détails précis, comme une date et un nom. Il faut aussi parler très sérieusement.",
            },
            {
              fr: "Quelle farce préparez-vous pour l'année prochaine ?",
              en: 'What prank are you planning for next year?',
              kind: 'future',
              starters: ["L'année prochaine, je vais…", "Je ne peux pas tout dire, mais…"],
              model: "Je ne peux pas tout dire, mais l'année prochaine, je vais parler d'un nouveau sport avec des chats. Ce sera très drôle.",
            },
          ],
        },
        debate: {
          motion: { fr: "Les médias ont-ils le droit d'inventer des fausses nouvelles le premier avril ?", en: 'Should the media be allowed to invent fake news on April Fools?' },
          for: {
            starters: ['Oui, parce que…', "C'est une tradition…"],
            model: "Oui, parce que c'est une tradition et tout le monde sait que c'est le premier avril. Ça apporte un peu d'humour.",
          },
          against: {
            starters: ['Non, car…', 'Certaines personnes risquent de…'],
            model: "Non, car certaines personnes risquent de croire l'histoire. Les médias doivent toujours dire la vérité.",
          },
        },
      },
      b2: {
        fake: {
          sentence: 3,
          fr: "Ce jour-là, un réflexe s'impose donc : partager une information le plus vite possible.",
          en: 'On that day, one reflex is essential: share any information as fast as possible.',
          options: ['Who gets paper fish on their backs', 'How the media compete', 'What reflex is essential that day'],
          answer: 2,
        },
        interview: {
          role: { fr: "Tu es une professeure qui apprend aux élèves à repérer les fausses informations.", en: 'You are a teacher who teaches pupils to spot fake news.' },
          questions: [
            {
              fr: "Comment peut-on vérifier une information ?",
              en: 'How can you check a piece of information?',
              kind: 'describe',
              starters: ["D'abord, il faut…", 'On peut comparer…'],
              model: "D'abord, il faut regarder qui a publié l'information. On peut ensuite comparer avec d'autres sources sérieuses avant de la partager.",
            },
            {
              fr: "Quelle fausse nouvelle vos élèves ont-ils crue un jour ?",
              en: 'What fake story did your pupils once believe?',
              kind: 'past',
              starters: ['Un premier avril, mes élèves ont cru que…', "Ils étaient persuadés que…"],
              model: "Un premier avril, mes élèves ont cru que les vacances d'été seraient supprimées. Ils étaient tellement persuadés que certains avaient déjà écrit au ministère de l'Éducation !",
            },
            {
              fr: "Que faudrait-il faire pour mieux protéger les jeunes des fausses nouvelles ?",
              en: 'What should be done to better protect young people from fake news?',
              kind: 'future',
              starters: ['Il faudrait…', "À l'avenir, les écoles devraient…"],
              model: "À l'avenir, les écoles devraient proposer un cours sur les médias chaque semaine. Il faudrait aussi que les réseaux sociaux signalent mieux les fausses informations.",
            },
          ],
        },
        debate: {
          motion: { fr: "Les réseaux sociaux sont-ils responsables de la diffusion des fausses nouvelles ?", en: 'Are social networks responsible for spreading fake news?' },
          for: {
            starters: ['Oui, car…', 'Leurs algorithmes…'],
            model: "Oui, car leurs algorithmes mettent en avant les informations les plus choquantes. Une fausse nouvelle circule souvent plus vite qu'une vraie.",
          },
          against: {
            starters: ["C'est surtout aux utilisateurs de…, puisque…", 'Chacun devrait…'],
            model: "C'est surtout aux utilisateurs d'être prudents, puisque ce sont eux qui partagent. Chacun devrait vérifier la source avant de cliquer.",
          },
        },
      },
    },
  },

  'music-day': {
    examArea: 'B',
    learnTopic: 'arts',
    levels: {
      a2: {
        fake: {
          sentence: 3,
          fr: "Les gens chantent et dansent jusqu'à dix heures du soir.",
          en: 'People sing and dance until ten in the evening.',
          options: ['Where musicians play', 'Who can play', 'Until what time people dance'],
          answer: 2,
        },
        interview: {
          role: { fr: 'Tu es une jeune musicienne qui joue dans la rue.', en: 'You are a young musician playing in the street.' },
          questions: [
            {
              fr: "De quel instrument joues-tu ?",
              en: 'What instrument do you play?',
              kind: 'describe',
              starters: ['Je joue de…', "Mon instrument est…"],
              model: "Je joue de la guitare. Mon instrument est vieux mais très beau.",
            },
            {
              fr: "Qu'est-ce que tu as joué ce soir ?",
              en: 'What did you play this evening?',
              kind: 'past',
              starters: ["Ce soir, j'ai joué…", "J'ai chanté…"],
              model: "Ce soir, j'ai joué des chansons françaises. Les gens ont chanté avec moi.",
            },
            {
              fr: 'Tu aimes la Fête de la musique ? Pourquoi ?',
              en: 'Do you like Music Day? Why?',
              kind: 'opinion',
              starters: ["Oui, j'adore parce que…", "C'est génial car…"],
              model: "Oui, j'adore parce que tout le monde peut jouer. C'est génial et gratuit !",
            },
          ],
        },
        debate: {
          motion: { fr: 'La musique dans la rue, c\'est une bonne idée ?', en: 'Is music in the street a good idea?' },
          for: {
            starters: ['Oui, parce que…', 'La musique rend…'],
            model: "Oui, parce que la musique rend les gens heureux. Et c'est gratuit.",
          },
          against: {
            starters: ['Non, parce que…', 'Il y a trop de…'],
            model: "Non, parce qu'il y a trop de bruit. Les bébés ne peuvent pas dormir.",
          },
        },
      },
      b1: {
        fake: {
          sentence: 3,
          fr: "Aujourd'hui, la fête existe dans plus de vingt pays.",
          en: 'Today the festival exists in more than twenty countries.',
          options: ['When the festival was created', 'What kinds of music are played', 'In how many countries it exists'],
          answer: 2,
        },
        interview: {
          role: { fr: "Tu es un membre d'un groupe de rock qui joue pour la première fois devant un public.", en: 'You are in a rock band playing in front of an audience for the first time.' },
          questions: [
            {
              fr: "Présentez-nous votre groupe.",
              en: 'Tell us about your band.',
              kind: 'describe',
              starters: ['Nous sommes…', 'Dans le groupe, il y a…'],
              model: "Nous sommes quatre amis du lycée. Dans le groupe, il y a deux guitaristes, une batteuse et moi, je chante.",
            },
            {
              fr: "Comment s'est passé votre premier concert ?",
              en: 'How did your first concert go?',
              kind: 'past',
              starters: ["Au début, j'avais…", 'Le public a…'],
              model: "Au début, j'avais très peur et mes mains tremblaient. Mais le public a dansé, et à la fin, j'étais tellement content.",
            },
            {
              fr: "Quels sont vos rêves pour le groupe ?",
              en: 'What are your dreams for the band?',
              kind: 'future',
              starters: ['Un jour, nous aimerions…', "L'année prochaine, nous allons…"],
              model: "L'année prochaine, nous allons enregistrer notre première chanson. Un jour, nous aimerions jouer dans un grand festival.",
            },
          ],
        },
        debate: {
          motion: { fr: "Faut-il que tous les concerts soient gratuits ?", en: 'Should all concerts be free?' },
          for: {
            starters: ['Oui, parce que…', 'La musique devrait…'],
            model: "Oui, parce que la musique devrait être pour tout le monde. Beaucoup de jeunes ne peuvent pas payer les billets.",
          },
          against: {
            starters: ['Non, car…', 'Les musiciens doivent…'],
            model: "Non, car les musiciens doivent gagner leur vie. Un concert demande beaucoup de travail et de matériel.",
          },
        },
      },
      b2: {
        fake: {
          sentence: 1,
          fr: "Lancée en mille neuf cent quatre-vingt-deux, la Fête de la musique repose sur une idée simple : la musique doit rester dans les salles de concert.",
          en: 'Launched in 1982, Music Day rests on a simple idea: music should stay in concert halls.',
          options: ['The idea behind Music Day', 'Where it has been copied', 'What young musicians gain'],
          answer: 0,
        },
        interview: {
          role: { fr: "Tu es une organisatrice de la Fête de la musique dans ta ville.", en: 'You are an organiser of Music Day in your town.' },
          questions: [
            {
              fr: "Pourquoi cette fête est-elle si populaire, selon vous ?",
              en: 'Why is this festival so popular, in your view?',
              kind: 'describe',
              starters: ['Elle est populaire parce que…', "Ce qui plaît, c'est…"],
              model: "Ce qui plaît, c'est que tout le monde peut participer, quel que soit son niveau. La musique sort des salles et appartient enfin à tous.",
            },
            {
              fr: "Quel souvenir gardez-vous de l'année dernière ?",
              en: 'What memory do you have from last year?',
              kind: 'past',
              starters: ["L'année dernière,…", 'Je me souviens de…'],
              model: "Je me souviens d'une chorale de grands-parents qui chantait du rap. Des centaines de jeunes se sont arrêtés pour les écouter et les applaudir.",
            },
            {
              fr: "Comment la fête pourrait-elle évoluer à l'avenir ?",
              en: 'How could the festival develop in the future?',
              kind: 'future',
              starters: ["À l'avenir, on pourrait…", "J'aimerais que…"],
              model: "À l'avenir, on pourrait donner plus de place aux jeunes groupes. J'aimerais que chaque quartier ait sa propre scène, avec du matériel prêté par la ville.",
            },
          ],
        },
        debate: {
          motion: { fr: "La musique devrait-elle être une matière aussi importante que les maths ?", en: 'Should music be as important a subject as maths?' },
          for: {
            starters: ['Oui, car…', 'Jouer d\'un instrument développe…'],
            model: "Oui, car jouer d'un instrument développe la mémoire et la concentration. La musique aide aussi les élèves à exprimer leurs émotions.",
          },
          against: {
            starters: ['Non, puisque…', 'Les maths restent…'],
            model: "Non, puisque les maths restent indispensables pour la plupart des métiers. La musique peut rester une activité choisie, en dehors des cours.",
          },
        },
      },
    },
  },

  'bastille-day': {
    examArea: 'B',
    learnTopic: 'holidays',
    levels: {
      a2: {
        fake: {
          sentence: 1,
          fr: 'Le matin, il y a des feux d\'artifice dans le ciel.',
          en: 'In the morning, there are fireworks in the sky.',
          options: ['When the fireworks are', 'Where people watch them in Paris', 'What happens in villages'],
          answer: 0,
        },
        interview: {
          role: { fr: 'Tu es une touriste qui regarde le feu d\'artifice à Paris.', en: 'You are a tourist watching the fireworks in Paris.' },
          questions: [
            {
              fr: "Comment est le feu d'artifice ?",
              en: 'What are the fireworks like?',
              kind: 'describe',
              starters: ["Le feu d'artifice est…", 'Il y a…'],
              model: "Le feu d'artifice est magnifique. Il y a des couleurs partout autour de la tour Eiffel.",
            },
            {
              fr: "Qu'est-ce que tu as fait aujourd'hui ?",
              en: 'What did you do today?',
              kind: 'past',
              starters: ["Aujourd'hui, j'ai…", "Ce matin, j'ai…"],
              model: "Ce matin, j'ai visité un musée. Le soir, j'ai mangé une glace près de la Seine.",
            },
            {
              fr: 'Tu aimes cette fête ? Pourquoi ?',
              en: 'Do you like this festival? Why?',
              kind: 'opinion',
              starters: ["Oui, j'aime parce que…", "C'est…"],
              model: "Oui, j'aime parce que tout le monde est content. C'est une fête très joyeuse.",
            },
          ],
        },
        debate: {
          motion: { fr: "Les feux d'artifice, c'est une bonne idée ?", en: 'Are fireworks a good idea?' },
          for: {
            starters: ['Oui, parce que…', 'Les feux d\'artifice sont…'],
            model: "Oui, parce que les feux d'artifice sont très beaux. Les enfants adorent ça.",
          },
          against: {
            starters: ['Non, parce que…', 'Les animaux…'],
            model: "Non, parce que les animaux ont peur du bruit. Et ça pollue.",
          },
        },
      },
      b1: {
        fake: {
          sentence: 1,
          fr: 'Ce jour-là est un jour normal : la plupart des gens travaillent.',
          en: 'It is a normal day: most people work.',
          options: ['What the national day recalls', 'Whether people work that day', 'What the firefighters organise'],
          answer: 1,
        },
        interview: {
          role: { fr: 'Tu es un pompier qui organise le bal du village.', en: "You are a firefighter organising the village ball." },
          questions: [
            {
              fr: "Comment se passe le bal des pompiers ?",
              en: "What is the firefighters' ball like?",
              kind: 'describe',
              starters: ['Le bal commence…', 'Les gens viennent…'],
              model: "Le bal commence après le feu d'artifice. Les gens viennent en famille, ils mangent, ils dansent et ils rient jusqu'à tard.",
            },
            {
              fr: "Qu'avez-vous préparé pour cette année ?",
              en: 'What did you prepare for this year?',
              kind: 'past',
              starters: ['Nous avons préparé…', "Nous avons invité…"],
              model: "Nous avons préparé des crêpes et des grillades. Nous avons aussi invité un groupe de musique de la région.",
            },
            {
              fr: "Que ferez-vous de l'argent récolté ?",
              en: 'What will you do with the money raised?',
              kind: 'future',
              starters: ["Avec l'argent, nous allons…", 'Nous achèterons…'],
              model: "Avec l'argent, nous allons acheter du matériel pour les jeunes pompiers. Nous aiderons aussi des familles du village.",
            },
          ],
        },
        debate: {
          motion: { fr: "Une fête nationale, est-ce encore important aujourd'hui ?", en: 'Is a national day still important today?' },
          for: {
            starters: ['Oui, parce que…', 'Une fête nationale permet de…'],
            model: "Oui, parce qu'une fête nationale permet de se souvenir de l'histoire. Tout le pays fait la fête ensemble.",
          },
          against: {
            starters: ['Pas vraiment, car…', 'Pour beaucoup de gens,…'],
            model: "Pas vraiment, car pour beaucoup de gens, c'est juste un jour de congé. Ils ne pensent pas à l'histoire.",
          },
        },
      },
      b2: {
        fake: {
          sentence: 2,
          fr: "Le soir, des milliers de spectateurs admirent les feux d'artifice, dont celui de la tour Eiffel, jamais retransmis à la télévision.",
          en: 'In the evening, thousands of spectators admire the fireworks, including the one at the Eiffel Tower, never shown on TV.',
          options: ['The values the day celebrates', 'How the Eiffel Tower fireworks are seen', 'What the balls help fund'],
          answer: 1,
        },
        interview: {
          role: { fr: "Tu es une Française qui vit à l'étranger et fête le 14 juillet loin de chez elle.", en: 'You are a French woman living abroad and celebrating 14 July far from home.' },
          questions: [
            {
              fr: "Que représente le 14 juillet pour vous ?",
              en: 'What does 14 July mean to you?',
              kind: 'describe',
              starters: ['Pour moi, le 14 juillet représente…', "C'est surtout…"],
              model: "Pour moi, le 14 juillet représente les valeurs de la République : liberté, égalité, fraternité. C'est surtout un moment où je me sens proche de la France.",
            },
            {
              fr: "Comment avez-vous fêté le 14 juillet l'année dernière ?",
              en: 'How did you celebrate 14 July last year?',
              kind: 'past',
              starters: ["L'année dernière, nous avons…", "J'ai organisé…"],
              model: "L'année dernière, j'ai organisé un pique-nique avec d'autres Français et des amis du pays. Nous avons regardé le feu d'artifice de Paris en direct sur un écran.",
            },
            {
              fr: "Comment fêterez-vous le 14 juillet dans dix ans ?",
              en: 'How will you celebrate 14 July in ten years?',
              kind: 'future',
              starters: ['Dans dix ans, je…', "J'espère que…"],
              model: "Dans dix ans, j'espère que je fêterai le 14 juillet en France, dans mon village. Je danserai au bal des pompiers avec mes enfants.",
            },
          ],
        },
        debate: {
          motion: { fr: "Faut-il remplacer les feux d'artifice par des spectacles de drones ?", en: 'Should fireworks be replaced by drone shows?' },
          for: {
            starters: ['Oui, car…', 'Les drones permettent…'],
            model: "Oui, car les drones ne font ni fumée ni bruit, ce qui protège les animaux. Ils permettent aussi de dessiner des formes incroyables dans le ciel.",
          },
          against: {
            starters: ['Non, puisque…', 'Le feu d\'artifice fait partie de…'],
            model: "Non, puisque le feu d'artifice fait partie de la tradition depuis des siècles. Un spectacle de drones n'aurait pas la même magie.",
          },
        },
      },
    },
  },
};
