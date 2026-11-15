/**
 * Show segments for editions 8–14 (daily-news §7). Hand-written; covered by the
 * story's `reviewed` flag (content-authoring §17).
 */
import type { NewsEditionSegments } from '../types';

export const SEGMENTS_WEEK2: Record<string, NewsEditionSegments> = {
  'sea-turtles': {
    examArea: 'C',
    learnTopic: 'animals',
    levels: {
      a2: {
        fake: {
          sentence: 1,
          fr: 'Une tortue a pondu dix œufs dans le sable.',
          en: 'One turtle laid ten eggs in the sand.',
          options: ['Where the turtles came back', 'How many eggs the turtle laid', 'Who watches the beach'],
          answer: 1,
        },
        interview: {
          role: { fr: 'Tu es un volontaire qui surveille la plage.', en: 'You are a volunteer who watches the beach.' },
          questions: [
            {
              fr: 'Comment est la plage ?',
              en: 'What is the beach like?',
              kind: 'describe',
              starters: ['La plage est…', 'Sur la plage, il y a…'],
              model: "La plage est très belle et calme. Sur la plage, il y a une petite barrière autour du nid.",
            },
            {
              fr: "Qu'est-ce que tu as vu la nuit dernière ?",
              en: 'What did you see last night?',
              kind: 'past',
              starters: ["La nuit dernière, j'ai vu…", "Hier soir, j'ai…"],
              model: "La nuit dernière, j'ai vu la tortue dans le sable. Elle était grande et très lente.",
            },
            {
              fr: 'Tu aimes ce travail ? Pourquoi ?',
              en: 'Do you like this job? Why?',
              kind: 'opinion',
              starters: ["Oui, j'aime ça parce que…", "C'est important parce que…"],
              model: "Oui, j'aime ça parce que j'adore les animaux. C'est important de protéger les tortues.",
            },
          ],
        },
        debate: {
          motion: { fr: 'Faut-il fermer des plages pour protéger les animaux ?', en: 'Should beaches be closed to protect animals?' },
          for: {
            starters: ['Oui, parce que…', 'Les animaux ont besoin de…'],
            model: "Oui, parce que les animaux ont besoin de calme. Les touristes font trop de bruit.",
          },
          against: {
            starters: ['Non, parce que…', 'Les gens veulent…'],
            model: "Non, parce que les gens veulent nager en été. On peut fermer seulement une petite partie.",
          },
        },
      },
      b1: {
        fake: {
          sentence: 3,
          fr: 'Les bébés tortues devraient sortir dans environ deux semaines et rejoindre la mer.',
          en: 'The baby turtles should come out in about two weeks and head for the sea.',
          options: ['When the baby turtles should come out', 'How the nest is protected', 'How many eggs there are'],
          answer: 0,
        },
        interview: {
          role: { fr: "Tu es une biologiste qui protège le nid de la tortue.", en: "You are a biologist protecting the turtle's nest." },
          questions: [
            {
              fr: 'Comment protégez-vous le nid ?',
              en: 'How do you protect the nest?',
              kind: 'describe',
              starters: ['Nous avons installé…', 'Chaque jour, nous…'],
              model: "Nous avons installé une petite barrière autour du nid. Chaque jour, nous vérifions que personne ne marche dans cette zone.",
            },
            {
              fr: "Comment avez-vous réagi quand vous avez vu la tortue ?",
              en: 'How did you react when you saw the turtle?',
              kind: 'past',
              starters: ["J'étais tellement…", "Quand je l'ai vue,…"],
              model: "Quand je l'ai vue, je n'y croyais pas ! J'étais tellement émue, parce que je l'attendais depuis dix ans.",
            },
            {
              fr: "Que se passera-t-il quand les bébés sortiront ?",
              en: 'What will happen when the babies come out?',
              kind: 'future',
              starters: ['Quand les bébés sortiront,…', 'Ils iront…'],
              model: "Quand les bébés sortiront, ils iront tout de suite vers la mer. Nous les compterons et nous ferons des photos.",
            },
          ],
        },
        debate: {
          motion: { fr: "Les touristes sont-ils un danger pour la nature ?", en: 'Are tourists a danger to nature?' },
          for: {
            starters: ['Oui, je pense que…', 'Le problème, c\'est que…'],
            model: "Oui, je pense que les touristes laissent des déchets sur les plages. Le problème, c'est qu'ils ne connaissent pas les animaux de la région.",
          },
          against: {
            starters: ['Non, pas forcément, car…', 'Au contraire,…'],
            model: "Non, pas forcément, car beaucoup de touristes respectent la nature. Au contraire, ils peuvent apprendre à protéger les tortues.",
          },
        },
      },
      b2: {
        fake: {
          sentence: 3,
          fr: "Ils demandent aussi aux vacanciers d'allumer des lumières la nuit, car elles guident les jeunes tortues.",
          en: 'They also ask holidaymakers to switch on lights at night, because they guide the young turtles.',
          options: ['Why the turtles came further north', 'Who protects the eggs', 'What holidaymakers are asked to do at night'],
          answer: 2,
        },
        interview: {
          role: { fr: "Tu es un bénévole qui garde le nid la nuit.", en: 'You are a volunteer who guards the nest at night.' },
          questions: [
            {
              fr: "Pourquoi les lumières sont-elles un problème pour les tortues ?",
              en: 'Why are lights a problem for turtles?',
              kind: 'describe',
              starters: ['Les jeunes tortues suivent…', 'La lumière les empêche de…'],
              model: "Les jeunes tortues suivent la lumière de la lune pour trouver la mer. Les lampes des hôtels les désorientent et elles partent dans la mauvaise direction.",
            },
            {
              fr: "Racontez-nous une de vos nuits sur la plage.",
              en: 'Tell us about one of your nights on the beach.',
              kind: 'past',
              starters: ['Une nuit,…', "Je me souviens que…"],
              model: "Une nuit, des jeunes sont arrivés avec de la musique et des lampes. Je leur ai expliqué la situation, et finalement ils sont restés pour m'aider.",
            },
            {
              fr: "Pensez-vous que les tortues reviendront l'année prochaine ?",
              en: 'Do you think the turtles will come back next year?',
              kind: 'future',
              starters: ["J'espère qu'elles…", 'Si la mer continue à se réchauffer,…'],
              model: "Si la mer continue à se réchauffer, elles reviendront sans doute plus souvent. J'espère qu'on sera prêts à les accueillir.",
            },
          ],
        },
        debate: {
          motion: { fr: "Le retour des tortues est-il une bonne nouvelle ?", en: 'Is the return of the turtles good news?' },
          for: {
            starters: ["Oui, car…", "C'est une chance de…"],
            model: "Oui, car c'est une chance de faire découvrir la nature aux vacanciers. Les gens vont enfin comprendre pourquoi il faut protéger les plages.",
          },
          against: {
            starters: ["Pas vraiment, puisque…", "C'est plutôt inquiétant car…"],
            model: "C'est plutôt inquiétant car cela montre que la Méditerranée se réchauffe. D'autres espèces pourraient souffrir de ce changement.",
          },
        },
      },
    },
  },

  'book-swap-app': {
    examArea: 'A',
    learnTopic: 'school',
    levels: {
      a2: {
        fake: {
          sentence: 3,
          fr: "Déjà cinquante élèves utilisent l'appli à Toulouse.",
          en: 'Already fifty pupils use the app in Toulouse.',
          options: ['Who created the app', 'How much it costs', 'How many pupils use it'],
          answer: 2,
        },
        interview: {
          role: { fr: "Tu es un des trois lycéens qui ont créé l'appli.", en: 'You are one of the three students who created the app.' },
          questions: [
            {
              fr: "Comment fonctionne votre appli ?",
              en: 'How does your app work?',
              kind: 'describe',
              starters: ["Avec l'appli, on peut…", "C'est simple :…"],
              model: "C'est simple : on prend une photo du livre. Après, un autre élève peut le prendre.",
            },
            {
              fr: "Comment avez-vous eu l'idée ?",
              en: 'How did you get the idea?',
              kind: 'past',
              starters: ["En juin, nous avons vu…", "Un jour,…"],
              model: "En juin, nous avons vu beaucoup de livres dans la poubelle de l'école. C'était triste.",
            },
            {
              fr: "Tu aimes l'informatique ? Pourquoi ?",
              en: 'Do you like computing? Why?',
              kind: 'opinion',
              starters: ["Oui, j'adore parce que…", "Pour moi, l'informatique, c'est…"],
              model: "Oui, j'adore parce qu'on peut créer des choses utiles. C'est ma matière préférée.",
            },
          ],
        },
        debate: {
          motion: { fr: 'Faut-il utiliser des livres papier ou des tablettes à l\'école ?', en: 'Should schools use paper books or tablets?' },
          for: {
            starters: ['Je préfère les livres parce que…', 'Avec un livre,…'],
            model: "Je préfère les livres parce que c'est plus facile pour lire. Avec un livre, on n'a pas mal aux yeux.",
          },
          against: {
            starters: ['Je préfère les tablettes parce que…', 'Avec une tablette,…'],
            model: "Je préfère les tablettes parce que mon sac est trop lourd. Avec une tablette, tout est dedans.",
          },
        },
      },
      b1: {
        fake: {
          sentence: 3,
          fr: 'En six mois, plus de deux cents livres ont trouvé un nouveau propriétaire.',
          en: 'In six months, more than two hundred books have found a new owner.',
          options: ['Why the students made the app', 'What the map shows', 'How many books found a new owner'],
          answer: 2,
        },
        interview: {
          role: { fr: "Tu es une élève qui utilise l'appli.", en: 'You are a pupil who uses the app.' },
          questions: [
            {
              fr: "Comment utilisez-vous l'appli ?",
              en: 'How do you use the app?',
              kind: 'describe',
              starters: ["D'abord, je cherche…", "Sur la carte, on voit…"],
              model: "D'abord, je cherche le livre dont j'ai besoin. Sur la carte, on voit quel lycée l'a, et on fixe un rendez-vous.",
            },
            {
              fr: "Quels livres avez-vous trouvés cette année ?",
              en: 'Which books did you find this year?',
              kind: 'past',
              starters: ["Cette année, j'ai trouvé…", "J'ai récupéré…"],
              model: "Cette année, j'ai trouvé mon livre de maths et deux romans pour le cours de français. Mes parents ont économisé beaucoup d'argent.",
            },
            {
              fr: "Qu'est-ce que vous ferez de vos livres en juin ?",
              en: 'What will you do with your books in June?',
              kind: 'future',
              starters: ['En juin, je vais…', 'Je les donnerai à…'],
              model: "En juin, je vais mettre mes livres sur l'appli. Je les donnerai à des élèves plus jeunes de mon lycée.",
            },
          ],
        },
        debate: {
          motion: { fr: 'Les livres scolaires devraient-ils être gratuits pour tous ?', en: 'Should school books be free for everyone?' },
          for: {
            starters: ['Oui, parce que…', "C'est juste car…"],
            model: "Oui, c'est juste car toutes les familles n'ont pas assez d'argent. L'école doit être la même pour tout le monde.",
          },
          against: {
            starters: ['Non, je pense que…', "Le problème, c'est que…"],
            model: "Non, je pense que ça coûterait trop cher à l'État. Le problème, c'est que les élèves feraient moins attention aux livres.",
          },
        },
      },
      b2: {
        fake: {
          sentence: 3,
          fr: "Séduite, la région envisage désormais d'interdire le projet dans ses lycées.",
          en: 'Won over, the region is now considering banning the project in its high schools.',
          options: ['What happens to textbooks each summer', 'Who the app connects', 'What the region is considering'],
          answer: 2,
        },
        interview: {
          role: { fr: "Tu es une des trois lycéennes qui ont conçu l'application.", en: 'You are one of the three students who designed the app.' },
          questions: [
            {
              fr: "Quel problème vouliez-vous résoudre ?",
              en: 'What problem did you want to solve?',
              kind: 'describe',
              starters: ['Nous trouvions injuste que…', 'Chaque été,…'],
              model: "Nous trouvions injuste que des livres neufs finissent à la poubelle alors que d'autres familles doivent les acheter. C'était un gaspillage absurde.",
            },
            {
              fr: "Comment avez-vous appris à créer une application ?",
              en: 'How did you learn to create an app?',
              kind: 'past',
              starters: ["Nous avons suivi…", "Au début, nous ne savions pas…"],
              model: "Au début, nous ne savions pas programmer. Nous avons suivi des tutoriels en ligne le soir, et un professeur nous a beaucoup aidées.",
            },
            {
              fr: "Si la région finance le projet, que changerez-vous ?",
              en: 'If the region funds the project, what will you change?',
              kind: 'future',
              starters: ['Si la région nous aide, nous…', 'Nous aimerions ajouter…'],
              model: "Si la région nous aide, nous pourrons ouvrir l'appli à tous les lycées. Nous aimerions aussi ajouter les calculatrices et le matériel de sport.",
            },
          ],
        },
        debate: {
          motion: { fr: "Les jeunes peuvent-ils vraiment changer le monde ?", en: 'Can young people really change the world?' },
          for: {
            starters: ['Oui, comme le montrent…', 'Les jeunes ont souvent…'],
            model: "Oui, comme le montrent ces trois lycéennes, une bonne idée suffit pour commencer. Les jeunes ont souvent plus d'énergie et moins peur de l'échec.",
          },
          against: {
            starters: ['Pas tout seuls, car…', "Sans l'aide des adultes,…"],
            model: "Pas tout seuls, car il faut de l'argent et de l'expérience. Sans l'aide de la région, cette appli resterait un petit projet local.",
          },
        },
      },
    },
  },

  'marathon-grandmother': {
    examArea: 'A',
    learnTopic: 'sports',
    levels: {
      a2: {
        fake: {
          sentence: 2,
          fr: 'Elle a couru pendant trois heures.',
          en: 'She ran for three hours.',
          options: ['How old Jeanne is', 'How long she ran', 'Who waited for her'],
          answer: 1,
        },
        interview: {
          role: { fr: 'Tu es Jeanne, la grand-mère de quatre-vingts ans.', en: 'You are Jeanne, the eighty-year-old grandmother.' },
          questions: [
            {
              fr: 'Comment est une journée normale pour vous ?',
              en: 'What is a normal day like for you?',
              kind: 'describe',
              starters: ['Le matin, je…', "D'habitude, je…"],
              model: "Le matin, je cours dans le parc. L'après-midi, je joue avec mes petits-enfants.",
            },
            {
              fr: "Comment s'est passé le marathon ?",
              en: 'How did the marathon go?',
              kind: 'past',
              starters: ["C'était…", "J'ai couru…"],
              model: "C'était très difficile, mais j'ai couru jusqu'à la fin. J'étais très fatiguée et très contente.",
            },
            {
              fr: 'Pourquoi le sport est-il important pour vous ?',
              en: 'Why is sport important to you?',
              kind: 'opinion',
              starters: ['Le sport est important parce que…', 'Pour moi,…'],
              model: "Le sport est important parce qu'il me garde en forme. Et je rencontre des amis !",
            },
          ],
        },
        debate: {
          motion: { fr: 'Le sport est-il bon à tout âge ?', en: 'Is sport good at any age?' },
          for: {
            starters: ['Oui, parce que…', 'On peut faire du sport…'],
            model: "Oui, parce que le sport est bon pour la santé. On peut marcher ou nager à tout âge.",
          },
          against: {
            starters: ['Pas toujours, parce que…', 'Pour les personnes âgées,…'],
            model: "Pas toujours, parce que c'est dangereux. Pour les personnes âgées, un marathon est trop long.",
          },
        },
      },
      b1: {
        fake: {
          sentence: 2,
          fr: "Elle s'entraîne tous les jours avec un club de son quartier.",
          en: 'She trains every day with a club in her neighbourhood.',
          options: ['When she started running', 'How often she trains', 'What her secret is'],
          answer: 1,
        },
        interview: {
          role: { fr: "Tu es le petit-fils de Jeanne, qui l'attendait à l'arrivée.", en: 'You are Jeanne\'s grandson, who was waiting at the finish.' },
          questions: [
            {
              fr: 'Comment est votre grand-mère ?',
              en: 'What is your grandmother like?',
              kind: 'describe',
              starters: ['Ma grand-mère est…', "Elle a toujours…"],
              model: "Ma grand-mère est très drôle et pleine d'énergie. Elle a toujours envie d'essayer de nouvelles choses.",
            },
            {
              fr: "Qu'avez-vous ressenti quand elle a franchi la ligne d'arrivée ?",
              en: 'How did you feel when she crossed the finish line?',
              kind: 'past',
              starters: ["J'étais tellement fier/fière…", "Quand je l'ai vue,…"],
              model: "Quand je l'ai vue arriver, j'ai couru vers elle avec les fleurs. J'étais tellement fier que j'ai pleuré.",
            },
            {
              fr: "Allez-vous courir avec elle un jour ?",
              en: 'Will you run with her one day?',
              kind: 'future',
              starters: ['Oui, je vais…', "L'année prochaine, nous…"],
              model: "Oui, l'année prochaine, nous ferons une course de dix kilomètres ensemble. Je vais commencer à m'entraîner ce mois-ci.",
            },
          ],
        },
        debate: {
          motion: { fr: "Les jeunes font-ils assez de sport aujourd'hui ?", en: 'Do young people do enough sport today?' },
          for: {
            starters: ['Oui, je pense que…', 'Beaucoup de jeunes…'],
            model: "Oui, je pense que beaucoup de jeunes font du sport dans un club. En plus, on a du sport à l'école deux fois par semaine.",
          },
          against: {
            starters: ['Non, parce que…', "Aujourd'hui, les jeunes passent…"],
            model: "Non, parce qu'aujourd'hui, les jeunes passent trop de temps devant les écrans. Ils devraient sortir plus souvent.",
          },
        },
      },
      b2: {
        fake: {
          sentence: 1,
          fr: "Cette ancienne infirmière ne courait jamais avant sa retraite, qu'elle a prise il y a cinq ans.",
          en: 'This former nurse never ran before her retirement, which she took five years ago.',
          options: ['What Jeanne used to do for a job', 'What sport gave her', 'What her next goal is'],
          answer: 0,
        },
        interview: {
          role: { fr: "Tu es Jeanne, doyenne du marathon de Lyon.", en: 'You are Jeanne, the oldest runner in the Lyon marathon.' },
          questions: [
            {
              fr: "Qu'est-ce que la course vous a apporté ?",
              en: 'What has running given you?',
              kind: 'describe',
              starters: ['La course m\'a surtout permis de…', 'Grâce au sport,…'],
              model: "La course m'a surtout permis de rencontrer des gens. Grâce au sport, je ne me sens jamais seule et je garde le moral.",
            },
            {
              fr: "Qu'est-ce qui vous a poussée à commencer après votre retraite ?",
              en: 'What pushed you to start after you retired?',
              kind: 'past',
              starters: ["Quand j'ai pris ma retraite,…", "J'avais besoin de…"],
              model: "Quand j'ai pris ma retraite, je m'ennuyais un peu. Une voisine m'a invitée à courir avec son club, et je ne me suis plus jamais arrêtée.",
            },
            {
              fr: "Comment allez-vous convaincre vos amies de vous rejoindre ?",
              en: 'How will you persuade your friends to join you?',
              kind: 'future',
              starters: ['Je leur dirai que…', "Je vais leur proposer de…"],
              model: "Je vais leur proposer de commencer par marcher ensemble. Je leur dirai qu'on n'est jamais trop vieux pour se faire plaisir.",
            },
          ],
        },
        debate: {
          motion: { fr: "Faut-il fixer un âge maximum pour courir un marathon ?", en: 'Should there be a maximum age for running a marathon?' },
          for: {
            starters: ['Oui, pour des raisons de…', 'Au-delà d\'un certain âge,…'],
            model: "Oui, pour des raisons de sécurité. Au-delà d'un certain âge, le cœur peut avoir du mal à supporter un effort aussi long.",
          },
          against: {
            starters: ['Absolument pas, car…', "Ce qui compte, c'est…"],
            model: "Absolument pas, car chacun connaît son corps. Ce qui compte, c'est un certificat médical, pas la date de naissance.",
          },
        },
      },
    },
  },

  'night-train': {
    examArea: 'C',
    learnTopic: 'transport',
    levels: {
      a2: {
        fake: {
          sentence: 0,
          fr: 'Un train de nuit va de Paris à Rome.',
          en: 'A night train goes from Paris to Rome.',
          options: ['Where the train goes', 'Where passengers sleep', 'Why it is better than the plane'],
          answer: 0,
        },
        interview: {
          role: { fr: "Tu es Léa, une voyageuse dans le train de nuit.", en: "You are Léa, a passenger on the night train." },
          factSheet: [
            { id: "you", label: "You", note: "Léa, 16, from Lyon", keywords: ["lea", "lyon", "seize"] },
            { id: "trip", label: "The trip", note: "Paris to Berlin, with your brother Tom", keywords: ["frere", "tom"] },
            { id: "times", label: "Times", note: "leaves at 8 p.m., arrives at 9 a.m.", keywords: ["vingt heures", "huit heures", "neuf heures"] },
            { id: "bed", label: "Your bed", note: "a small bed, the top bunk", keywords: ["en haut", "lit"] },
            { id: "dinner", label: "Dinner", note: "a sandwich and an apple", keywords: ["sandwich", "pomme"] },
            { id: "night", label: "Last night", note: "slept well, but a bit noisy", keywords: ["bruit*", "bien dormi"] },
            { id: "berlin", label: "In Berlin", note: "3 days: museums and a concert", keywords: ["musee*", "concert"] },
            { id: "why", label: "Why the train", note: "it pollutes less than the plane", keywords: ["pollu*"] },
          ],
          questions: [
            {
              fr: "Bonjour ! Où est-ce que vous allez, et avec qui ?",
              en: "Hello! Where are you going, and who with?",
              kind: "describe",
              fact: "trip",
              starters: ["Je vais à…", "Je voyage avec…"],
              model: "Je vais à Berlin avec mon frère Tom. Nous sommes partis de Paris hier soir.",
              reaction: { fr: "Ça a l'air sympa !", en: "That sounds nice!" },
            },
            {
              fr: "Comment est votre lit dans le train ?",
              en: "What is your bed on the train like?",
              kind: "describe",
              fact: "bed",
              starters: ["Mon lit est…", "Je dors…"],
              model: "Mon lit est petit, mais il est confortable. Je dors en haut.",
              reaction: { fr: "Pratique !", en: "Handy!" },
            },
            {
              fr: "Vous avez bien dormi cette nuit ?",
              en: "Did you sleep well last night?",
              kind: "past",
              fact: "night",
              starters: ["Oui, j'ai…", "Cette nuit, j'ai…"],
              model: "Oui, j'ai bien dormi, mais il y avait un peu de bruit.",
              reaction: { fr: "Je comprends.", en: "I understand." },
            },
            {
              fr: "Qu'est-ce que vous allez faire à Berlin ?",
              en: "What are you going to do in Berlin?",
              kind: "future",
              fact: "berlin",
              starters: ["Je vais…", "À Berlin, nous allons…"],
              model: "Je vais rester trois jours. Je vais visiter des musées et aller à un concert.",
              reaction: { fr: "Ça a l'air génial !", en: "That sounds great!" },
            },
            {
              fr: "Vous préférez le train ou l'avion ? Pourquoi ?",
              en: "Do you prefer the train or the plane? Why?",
              kind: "opinion",
              starters: ["Je préfère… parce que…", "Pour moi, …"],
              model: "Je préfère le train parce qu'il pollue moins que l'avion. Et on peut dormir !",
              reaction: { fr: "Merci, et bon séjour !", en: "Thank you, and enjoy your stay!" },
            },
          ],
        },
        debate: {
          motion: { fr: "Le train est-il mieux que la voiture pour les vacances ?", en: 'Is the train better than the car for holidays?' },
          for: {
            starters: ['Oui, parce que…', 'Dans le train, on peut…'],
            model: "Oui, parce que dans le train, on peut dormir et lire. Et c'est bon pour la planète.",
          },
          against: {
            starters: ['Non, parce que…', 'Avec la voiture,…'],
            model: "Non, parce qu'avec la voiture, on va où on veut. Et le train est cher.",
          },
        },
      },
      b1: {
        fake: {
          sentence: 1,
          fr: "Il quitte la gare de l'Est vers midi et arrive le lendemain matin.",
          en: 'It leaves the Gare de l\'Est at around midday and arrives the next morning.',
          options: ['What time the train leaves', 'What seats you can choose', 'Why young people like it'],
          answer: 0,
        },
        interview: {
          role: { fr: "Tu es le contrôleur du train de nuit Paris–Berlin.", en: "You are the conductor of the Paris–Berlin night train." },
          factSheet: [
            { id: "job", label: "Your job", note: "contrôleur depuis 12 ans", keywords: ["douze ans"] },
            { id: "departure", label: "Departure", note: "gare de l'Est, 20 h", keywords: ["gare de l est", "vingt heures"] },
            { id: "arrival", label: "Arrival", note: "Berlin, 8 h 30, le lendemain", keywords: ["lendemain", "huit heures"] },
            { id: "places", label: "The places", note: "sièges, couchettes ou cabines privées", keywords: ["siege*", "couchette*", "cabine*"] },
            { id: "night", label: "Your night", note: "contrôle des billets, puis 4 heures de sommeil", keywords: ["billet*", "quatre heures"] },
            { id: "passengers", label: "Passengers", note: "surtout des jeunes et des familles", keywords: ["jeune*", "famille*"] },
            { id: "last-week", label: "Last week", note: "un violon oublié dans une cabine", keywords: ["violon"] },
            { id: "future", label: "Soon", note: "une nouvelle ligne vers Vienne", keywords: ["vienne"] },
          ],
          questions: [
            {
              fr: "Quelles places est-ce que les voyageurs peuvent choisir ?",
              en: "Which places can passengers choose?",
              kind: "describe",
              fact: "places",
              starters: ["Ils peuvent choisir…", "Il y a…"],
              model: "Ils peuvent choisir entre des sièges, des couchettes ou des cabines privées. Les cabines sont plus chères, mais plus calmes.",
              reaction: { fr: "Il y en a pour tous les goûts !", en: "There's something for everyone!" },
            },
            {
              fr: "Comment se passe votre nuit de travail ?",
              en: "What is your working night like?",
              kind: "describe",
              fact: "night",
              starters: ["D'abord, je…", "Normalement, je…"],
              model: "D'abord, je contrôle les billets de tous les voyageurs. Ensuite, je dors environ quatre heures dans une petite cabine.",
              reaction: { fr: "Ce n'est pas un métier facile !", en: "It isn't an easy job!" },
            },
            {
              fr: "Il vous est arrivé quelque chose d'amusant récemment ?",
              en: "Has anything funny happened to you recently?",
              kind: "past",
              fact: "last-week",
              starters: ["Oui ! La semaine dernière, …", "Une fois, un voyageur a…"],
              model: "Oui ! La semaine dernière, un voyageur a oublié son violon dans une cabine. Je l'ai gardé et il est revenu le chercher à Berlin.",
              reaction: { fr: "Quelle histoire !", en: "What a story!" },
            },
            {
              fr: "Quels sont les projets de la compagnie ?",
              en: "What are the company's plans?",
              kind: "future",
              fact: "future",
              starters: ["Bientôt, il y aura…", "La compagnie va…"],
              model: "Bientôt, il y aura une nouvelle ligne vers Vienne. Moi, j'aimerais beaucoup travailler sur ce train.",
              reaction: { fr: "Voilà une bonne nouvelle !", en: "That's good news!" },
            },
            {
              fr: "À votre avis, pourquoi les jeunes aiment-ils ce train ?",
              en: "In your view, why do young people like this train?",
              kind: "opinion",
              starters: ["Je pense que… parce que…", "À mon avis, …"],
              model: "Je pense qu'ils l'aiment parce qu'il pollue beaucoup moins que l'avion, et parce que c'est une vraie aventure.",
              reaction: { fr: "Merci, et bonne route !", en: "Thank you, and have a good journey!" },
            },
          ],
        },
        debate: {
          motion: { fr: "Faut-il interdire les vols courts quand il existe un train ?", en: 'Should short flights be banned when a train exists?' },
          for: {
            starters: ['Oui, parce que…', 'Le train pollue…'],
            model: "Oui, parce que le train pollue beaucoup moins que l'avion. Pour un voyage de quelques heures, on n'a pas besoin de prendre l'avion.",
          },
          against: {
            starters: ['Non, je trouve que…', "Ce n'est pas juste car…"],
            model: "Non, je trouve que chacun doit être libre. Ce n'est pas juste car le train est souvent plus cher et plus lent.",
          },
        },
      },
      b2: {
        fake: {
          sentence: 1,
          fr: 'Pourtant, la ligne Paris–Berlin vient de rouvrir et reste presque vide pendant les vacances.',
          en: 'Yet the Paris–Berlin line has just reopened and stays almost empty during the holidays.',
          options: ['Why night trains had disappeared', 'How full the train is in the holidays', 'What the main obstacle is'],
          answer: 1,
        },
        interview: {
          role: { fr: "Tu es la directrice de la compagnie qui gère le train de nuit.", en: "You are the head of the company running the night train." },
          factSheet: [
            { id: "line", label: "The line", note: "Paris–Berlin, rouverte en décembre, 3 départs par semaine", keywords: ["decembre", "trois departs", "trois fois par semaine"] },
            { id: "success", label: "Success", note: "complet pendant les vacances : 90 % des places vendues", keywords: ["complet*", "quatre vingt dix"] },
            { id: "ecology", label: "The environment", note: "10 fois moins de CO2 qu'un vol", keywords: ["dix fois moins", "co2", "carbone"] },
            { id: "price", label: "The price", note: "billets plus chers que l'avion à bas coût", keywords: ["cher*", "prix"] },
            { id: "discount", label: "Your offer", note: "30 % de réduction pour les moins de 26 ans", keywords: ["reduction*", "trente pour cent", "vingt six ans"] },
            { id: "purchase", label: "Last year", note: "achat de 20 voitures-lits neuves", keywords: ["vingt", "voiture* lit*"] },
            { id: "obstacle", label: "The obstacle", note: "peu de voies libres la nuit, à cause des travaux", keywords: ["voie*", "travaux"] },
            { id: "goal", label: "Your goal", note: "10 lignes de nuit en Europe d'ici dix ans", keywords: ["dix lignes"] },
          ],
          questions: [
            {
              fr: "Comment expliquez-vous le succès de la ligne ?",
              en: "How do you explain the line's success?",
              kind: "describe",
              fact: "success",
              starters: ["La ligne est…, car…", "D'abord, …"],
              model: "La ligne est complète pendant les vacances, car un trajet en train émet dix fois moins de CO2 qu'un vol. Les jeunes y sont très sensibles.",
              reaction: { fr: "C'est impressionnant !", en: "That's impressive!" },
            },
            {
              fr: "Beaucoup de gens trouvent les billets trop chers. Que leur répondez-vous ?",
              en: "Lots of people find the tickets too expensive. What do you say to them?",
              kind: "describe",
              fact: "price",
              starters: ["Je les comprends : …", "C'est vrai que…, mais…"],
              model: "Je les comprends : nos billets coûtent plus cher que l'avion à bas coût. C'est pourquoi les moins de vingt-six ans ont trente pour cent de réduction.",
              reaction: { fr: "Voilà qui va intéresser nos auditeurs.", en: "That will interest our listeners." },
            },
            {
              fr: "Comment avez-vous préparé le retour du train ?",
              en: "How did you prepare for the train's return?",
              kind: "past",
              fact: "purchase",
              starters: ["L'année dernière, nous avons…", "Il a fallu…"],
              model: "L'année dernière, nous avons acheté vingt voitures-lits neuves, car les anciennes étaient trop vieilles et peu confortables.",
              reaction: { fr: "C'est un gros investissement !", en: "That's a big investment!" },
            },
            {
              fr: "Où en sera votre réseau dans dix ans ?",
              en: "Where will your network be in ten years?",
              kind: "future",
              fact: "goal",
              starters: ["D'ici dix ans, nous aurons…", "Nous voudrions…"],
              model: "D'ici dix ans, nous aurons dix lignes de nuit en Europe, à condition que les travaux laissent assez de voies libres la nuit.",
              reaction: { fr: "C'est ambitieux !", en: "That's ambitious!" },
            },
            {
              fr: "Le train de nuit peut-il vraiment remplacer l'avion, selon vous ?",
              en: "Can the night train really replace the plane, in your view?",
              kind: "opinion",
              starters: ["À mon avis, …, car…", "Pas complètement, parce que…"],
              model: "À mon avis, pas complètement, car il reste plus lent. Mais pour un trajet de moins de mille kilomètres, il est idéal.",
              reaction: { fr: "Merci beaucoup, madame la directrice !", en: "Thank you very much, madam director!" },
            },
          ],
        },
        debate: {
          motion: { fr: "L'État devrait-il payer une partie des billets de train ?", en: 'Should the state pay part of train tickets?' },
          for: {
            starters: ['Oui, puisque…', "Ce serait logique car…"],
            model: "Oui, ce serait logique car le train protège la planète. Si les billets étaient moins chers, beaucoup de gens abandonneraient l'avion.",
          },
          against: {
            starters: ['Non, car…', "Cet argent serait plus utile pour…"],
            model: "Non, car ce sont tous les contribuables qui paieraient. Cet argent serait plus utile pour les écoles ou les hôpitaux.",
          },
        },
      },
    },
  },

  'new-frog': {
    examArea: 'C',
    learnTopic: 'animals',
    levels: {
      a2: {
        fake: {
          sentence: 2,
          fr: 'Elle est bleue et elle vit dans la forêt.',
          en: 'It is blue and it lives in the forest.',
          options: ['How small the frog is', 'What colour the frog is', 'What the scientists recorded'],
          answer: 1,
        },
        interview: {
          role: { fr: 'Tu es une des scientifiques qui ont trouvé la grenouille.', en: 'You are one of the scientists who found the frog.' },
          questions: [
            {
              fr: 'Comment est la nouvelle grenouille ?',
              en: 'What is the new frog like?',
              kind: 'describe',
              starters: ['Elle est…', 'La grenouille a…'],
              model: "Elle est très petite et orange. La grenouille a des grands yeux noirs.",
            },
            {
              fr: "Où avez-vous trouvé la grenouille ?",
              en: 'Where did you find the frog?',
              kind: 'past',
              starters: ["Nous l'avons trouvée…", "Un soir, nous avons…"],
              model: "Nous l'avons trouvée dans la forêt, sous une feuille. Un soir, nous avons entendu son chant.",
            },
            {
              fr: 'Tu aimes travailler dans la forêt ? Pourquoi ?',
              en: 'Do you like working in the forest? Why?',
              kind: 'opinion',
              starters: ["Oui, j'adore parce que…", "C'est…"],
              model: "Oui, j'adore parce que la forêt est pleine d'animaux. Mais il fait très chaud !",
            },
          ],
        },
        debate: {
          motion: { fr: 'Les animaux sauvages sont-ils plus intéressants que les animaux domestiques ?', en: 'Are wild animals more interesting than pets?' },
          for: {
            starters: ['Oui, parce que…', 'Les animaux sauvages sont…'],
            model: "Oui, parce que les animaux sauvages sont mystérieux. On découvre toujours des choses nouvelles.",
          },
          against: {
            starters: ['Non, parce que…', 'Je préfère…'],
            model: "Non, parce que je préfère mon chat. On peut jouer avec un animal domestique.",
          },
        },
      },
      b1: {
        fake: {
          sentence: 2,
          fr: "Les chercheurs l'ont d'abord vue avant de l'entendre, grâce à ses couleurs très vives.",
          en: 'The researchers saw it before they heard it, thanks to its very bright colours.',
          options: ['How the researchers first noticed it', 'How big the frog is', 'What they think about the forest'],
          answer: 0,
        },
        interview: {
          role: { fr: "Tu es le chef de l'équipe de chercheurs en Guyane.", en: 'You are the leader of the research team in French Guiana.' },
          questions: [
            {
              fr: 'Comment travaillez-vous dans la forêt ?',
              en: 'How do you work in the forest?',
              kind: 'describe',
              starters: ['Nous partons…', 'Chaque nuit, nous…'],
              model: "Nous partons dans la forêt pendant deux semaines. Chaque nuit, nous écoutons les chants des animaux avec un micro.",
            },
            {
              fr: "Comment avez-vous découvert la grenouille ?",
              en: 'How did you discover the frog?',
              kind: 'past',
              starters: ["Une nuit, nous avons entendu…", "Au début, nous pensions que…"],
              model: "Une nuit, nous avons entendu un chant très aigu. Au début, nous pensions que c'était un oiseau, mais c'était une minuscule grenouille.",
            },
            {
              fr: "Quel nom allez-vous lui donner ?",
              en: 'What name are you going to give it?',
              kind: 'future',
              starters: ['Nous allons l\'appeler…', "J'aimerais lui donner le nom de…"],
              model: "Nous allons l'appeler la grenouille orange de Guyane. J'aimerais aussi lui donner le nom d'un guide qui nous a aidés.",
            },
          ],
        },
        debate: {
          motion: { fr: "Est-ce important de découvrir de nouvelles espèces ?", en: 'Is it important to discover new species?' },
          for: {
            starters: ['Oui, parce que…', 'On peut apprendre…'],
            model: "Oui, parce qu'on peut apprendre beaucoup de choses sur la nature. Si on connaît une espèce, on peut mieux la protéger.",
          },
          against: {
            starters: ['Pas vraiment, car…', 'Il est plus urgent de…'],
            model: "Pas vraiment, car il est plus urgent de protéger les animaux qu'on connaît déjà. Beaucoup d'espèces sont en danger.",
          },
        },
      },
      b2: {
        fake: {
          sentence: 1,
          fr: "Les chercheurs ont mis trois mois à prouver qu'il s'agissait bien d'une espèce distincte, en comparant son ADN et son chant.",
          en: 'The researchers took three months to prove it really was a distinct species, by comparing its DNA and its call.',
          options: ['How big the frog is', 'How long the proof took', 'Why the forest needs protecting'],
          answer: 1,
        },
        interview: {
          role: { fr: 'Tu es une biologiste qui a décrit la nouvelle espèce.', en: 'You are a biologist who described the new species.' },
          questions: [
            {
              fr: "Pourquoi la forêt guyanaise est-elle si riche ?",
              en: 'Why is the Guiana forest so rich?',
              kind: 'describe',
              starters: ['Cette forêt est…', "La chaleur et l'humidité…"],
              model: "La chaleur et l'humidité permettent à des milliers d'espèces de vivre ensemble. En plus, une grande partie de la forêt n'a jamais été explorée.",
            },
            {
              fr: "Quelles étapes avez-vous suivies pour prouver votre découverte ?",
              en: 'What steps did you follow to prove your discovery?',
              kind: 'past',
              starters: ["D'abord, nous avons…", 'Ensuite,…'],
              model: "D'abord, nous avons enregistré son chant. Ensuite, nous avons comparé son ADN avec celui d'autres grenouilles pendant trois ans.",
            },
            {
              fr: "Que faudrait-il faire pour protéger cette forêt ?",
              en: 'What should be done to protect this forest?',
              kind: 'future',
              starters: ['Il faudrait…', "Si rien ne change,…"],
              model: "Il faudrait interdire les mines d'or illégales et créer de nouvelles réserves. Si rien ne change, des espèces disparaîtront avant d'être connues.",
            },
          ],
        },
        debate: {
          motion: { fr: "Faut-il interdire toute activité humaine dans les forêts tropicales ?", en: 'Should all human activity be banned in tropical forests?' },
          for: {
            starters: ['Oui, car…', 'Sans protection totale,…'],
            model: "Oui, car sans protection totale, la forêt va disparaître. Chaque arbre coupé détruit des espèces que nous ne connaissons même pas.",
          },
          against: {
            starters: ['Ce serait injuste, puisque…', "Il vaudrait mieux…"],
            model: "Ce serait injuste, puisque des peuples vivent dans ces forêts depuis toujours. Il vaudrait mieux limiter les activités qui détruisent la nature.",
          },
        },
      },
    },
  },

  'asteroid-pupil': {
    examArea: 'D',
    learnTopic: 'future',
    levels: {
      a2: {
        fake: {
          sentence: 0,
          fr: 'Léa a seize ans et elle adore les étoiles.',
          en: 'Léa is sixteen and she loves the stars.',
          options: ['How old Léa is', 'What she found on her computer', 'What the asteroid might get'],
          answer: 0,
        },
        interview: {
          role: { fr: "Tu es Léa, qui a découvert l'astéroïde.", en: 'You are Léa, who discovered the asteroid.' },
          questions: [
            {
              fr: "Qu'est-ce que tu aimes faire le soir ?",
              en: 'What do you like doing in the evening?',
              kind: 'describe',
              starters: ["Le soir, j'aime…", 'Je regarde…'],
              model: "Le soir, j'aime regarder les étoiles dans mon jardin. J'ai un petit télescope.",
            },
            {
              fr: "Comment as-tu trouvé l'astéroïde ?",
              en: 'How did you find the asteroid?',
              kind: 'past',
              starters: ["J'ai regardé…", 'En classe,…'],
              model: "En classe, j'ai regardé des photos du ciel. J'ai vu un petit point qui bougeait.",
            },
            {
              fr: "Quel nom veux-tu donner à l'astéroïde ? Pourquoi ?",
              en: 'What name do you want to give the asteroid? Why?',
              kind: 'opinion',
              starters: ["Je veux l'appeler…", 'Parce que…'],
              model: "Je veux l'appeler Mamie, parce que ma grand-mère m'a donné mon télescope.",
            },
          ],
        },
        debate: {
          motion: { fr: "L'espace, c'est une matière intéressante à l'école ?", en: 'Is space an interesting school subject?' },
          for: {
            starters: ['Oui, parce que…', "C'est fascinant car…"],
            model: "Oui, parce que c'est fascinant. On apprend les planètes et les étoiles.",
          },
          against: {
            starters: ['Non, parce que…', 'Je préfère…'],
            model: "Non, parce que c'est trop compliqué. Je préfère l'histoire.",
          },
        },
      },
      b1: {
        fake: {
          sentence: 3,
          fr: "Si la découverte est confirmée, elle recevra un vrai télescope.",
          en: 'If the discovery is confirmed, she will get a real telescope.',
          options: ['What programme her class joined', 'How she spotted the asteroid', 'What happens if it is confirmed'],
          answer: 2,
        },
        interview: {
          role: { fr: "Tu es Léa, la collégienne qui a repéré l'astéroïde.", en: 'You are Léa, the pupil who spotted the asteroid.' },
          questions: [
            {
              fr: "Comment fonctionne le programme de ta classe ?",
              en: "How does your class's programme work?",
              kind: 'describe',
              starters: ['Nous recevons…', 'Chaque semaine,…'],
              model: "Nous recevons de vraies photos prises par un télescope. Chaque semaine, nous comparons les images pour trouver des points qui bougent.",
            },
            {
              fr: "Qu'as-tu fait quand tu as remarqué le point ?",
              en: 'What did you do when you noticed the dot?',
              kind: 'past',
              starters: ["J'ai tout de suite…", "D'abord, j'ai cru que…"],
              model: "D'abord, j'ai cru que c'était une erreur. Puis j'ai appelé mon professeur, qui a vérifié avec moi.",
            },
            {
              fr: "Qu'est-ce que tu voudrais faire plus tard ?",
              en: 'What would you like to do later on?',
              kind: 'future',
              starters: ['Plus tard, je voudrais…', "Je vais étudier…"],
              model: "Plus tard, je voudrais devenir astronome. Je vais étudier les maths et la physique au lycée.",
            },
          ],
        },
        debate: {
          motion: { fr: "Les élèves devraient-ils participer à de vrais projets scientifiques ?", en: 'Should pupils take part in real science projects?' },
          for: {
            starters: ['Oui, je pense que…', "C'est motivant car…"],
            model: "Oui, je pense que c'est motivant car on voit que les sciences servent à quelque chose. On apprend plus qu'avec un livre.",
          },
          against: {
            starters: ['Non, parce que…', 'Les élèves doivent d\'abord…'],
            model: "Non, parce que les élèves doivent d'abord apprendre les bases. Les vrais projets sont trop difficiles pour la plupart d'entre eux.",
          },
        },
      },
      b2: {
        fake: {
          sentence: 3,
          fr: "Pour son enseignante, l'essentiel est ailleurs : Léa envisage désormais une carrière dans le sport.",
          en: 'For her teacher, the main point lies elsewhere: Léa is now considering a career in sport.',
          options: ['What the project gives pupils', 'Why astronomers need help', 'What career Léa is considering'],
          answer: 2,
        },
        interview: {
          role: { fr: "Tu es l'enseignante de sciences de Léa.", en: "You are Léa's science teacher." },
          questions: [
            {
              fr: "Pourquoi avez-vous inscrit votre classe à ce projet ?",
              en: 'Why did you sign your class up for this project?',
              kind: 'describe',
              starters: ['Je voulais que mes élèves…', "Ce projet permet de…"],
              model: "Je voulais que mes élèves deviennent de vrais chercheurs. Ce projet permet de montrer que la science se fait aussi en classe.",
            },
            {
              fr: "Comment Léa a-t-elle changé depuis sa découverte ?",
              en: 'How has Léa changed since her discovery?',
              kind: 'past',
              starters: ['Avant, elle était…', "Depuis, elle a…"],
              model: "Avant, elle était plutôt timide. Depuis sa découverte, elle a pris confiance en elle et elle a même présenté son travail devant tout le collège.",
            },
            {
              fr: "Pensez-vous que d'autres élèves suivront son exemple ?",
              en: 'Do you think other pupils will follow her example?',
              kind: 'future',
              starters: ["J'en suis sûre, car…", "J'espère que…"],
              model: "J'en suis sûre, car plusieurs filles m'ont déjà demandé de participer l'année prochaine. Léa est devenue un modèle pour elles.",
            },
          ],
        },
        debate: {
          motion: { fr: "Les filles sont-elles assez encouragées à faire des sciences ?", en: 'Are girls encouraged enough to do science?' },
          for: {
            starters: ["Oui, de plus en plus, car…", "Aujourd'hui,…"],
            model: "Oui, de plus en plus, car les écoles organisent des projets comme celui-ci. Aujourd'hui, beaucoup de femmes scientifiques servent de modèles.",
          },
          against: {
            starters: ['Pas encore, puisque…', 'Il reste des clichés…'],
            model: "Pas encore, puisqu'il y a toujours moins de filles dans les études d'ingénieur. Il reste des clichés qui les découragent dès le collège.",
          },
        },
      },
    },
  },

  'wheelchair-basketball': {
    examArea: 'B',
    learnTopic: 'sports',
    levels: {
      a2: {
        fake: {
          sentence: 1,
          fr: 'Vingt équipes viennent de toute la France.',
          en: 'Twenty teams are coming from all over France.',
          options: ['Where the tournament is', 'How many teams are coming', 'What the public can try'],
          answer: 1,
        },
        interview: {
          role: { fr: "Tu es un joueur de basket en fauteuil.", en: 'You are a wheelchair basketball player.' },
          questions: [
            {
              fr: 'Comment est ton équipe ?',
              en: 'What is your team like?',
              kind: 'describe',
              starters: ['Mon équipe est…', 'Nous sommes…'],
              model: "Mon équipe est rapide et très forte. Nous sommes dix joueurs.",
            },
            {
              fr: "Comment s'est passé ton premier match du tournoi ?",
              en: 'How did your first match of the tournament go?',
              kind: 'past',
              starters: ['Nous avons gagné…', "C'était…"],
              model: "Nous avons gagné vingt à quinze. C'était un match difficile, mais super.",
            },
            {
              fr: 'Pourquoi aimes-tu ce sport ?',
              en: 'Why do you like this sport?',
              kind: 'opinion',
              starters: ["J'aime ce sport parce que…", "C'est…"],
              model: "J'aime ce sport parce qu'il est rapide. C'est aussi un sport d'équipe.",
            },
          ],
        },
        debate: {
          motion: { fr: 'Faut-il faire du sport le week-end ?', en: 'Should you do sport at the weekend?' },
          for: {
            starters: ['Oui, parce que…', 'Le week-end, on a…'],
            model: "Oui, parce que le week-end, on a le temps. Le sport, c'est bon pour la santé.",
          },
          against: {
            starters: ['Non, parce que…', 'Le week-end, je préfère…'],
            model: "Non, parce que le week-end, je préfère me reposer. Je fais du sport à l'école.",
          },
        },
      },
      b1: {
        fake: {
          sentence: 3,
          fr: 'Beaucoup de parents ont été surpris par la vitesse et la force des joueurs.',
          en: 'Many parents were surprised by the speed and strength of the players.',
          options: ['How many spectators came', 'What the public could test', 'Who was surprised by the players'],
          answer: 2,
        },
        interview: {
          role: { fr: "Tu es une organisatrice du tournoi de Lyon.", en: 'You are one of the organisers of the Lyon tournament.' },
          questions: [
            {
              fr: "Qu'est-ce qui rend ce tournoi spécial ?",
              en: 'What makes this tournament special?',
              kind: 'describe',
              starters: ['Ce tournoi est spécial parce que…', "Dans certaines équipes,…"],
              model: "Ce tournoi est spécial parce que des joueurs valides jouent avec des joueurs handicapés. Tout le monde joue ensemble.",
            },
            {
              fr: "Comment les enfants ont-ils réagi sur le terrain d'essai ?",
              en: 'How did the children react on the try-out court?',
              kind: 'past',
              starters: ['Les enfants ont…', "Au début, ils…"],
              model: "Au début, ils avaient du mal à avancer avec le fauteuil. Après dix minutes, ils faisaient la course et ils riaient beaucoup.",
            },
            {
              fr: "Qu'allez-vous organiser l'année prochaine ?",
              en: 'What are you going to organise next year?',
              kind: 'future',
              starters: ["L'année prochaine, nous allons…", "Nous voudrions…"],
              model: "L'année prochaine, nous allons inviter des équipes étrangères. Nous voudrions aussi visiter les écoles pour présenter ce sport.",
            },
          ],
        },
        debate: {
          motion: { fr: "Les sports handisport devraient-ils passer plus souvent à la télé ?", en: 'Should disability sport be on TV more often?' },
          for: {
            starters: ['Oui, parce que…', 'Si on voyait plus…'],
            model: "Oui, parce que les joueurs sont de vrais athlètes. Si on voyait plus ces sports, les gens changeraient leur regard sur le handicap.",
          },
          against: {
            starters: ['Pas forcément, car…', 'Les chaînes montrent…'],
            model: "Pas forcément, car les chaînes montrent ce que le public demande. Il faudrait d'abord que plus de gens aillent voir les matchs.",
          },
        },
      },
      b2: {
        fake: {
          sentence: 2,
          fr: "Un système de points attribué à chaque équipe, selon son classement, garantit l'équilibre entre les équipes.",
          en: 'A points system given to each team, according to its ranking, keeps the teams balanced.',
          options: ['How many spectators came', 'How the points system works', 'What clubs hope to gain'],
          answer: 1,
        },
        interview: {
          role: { fr: "Tu es une joueuse valide dans une équipe de basket fauteuil.", en: 'You are a non-disabled player in a wheelchair basketball team.' },
          questions: [
            {
              fr: "Comment fonctionne le système de points ?",
              en: 'How does the points system work?',
              kind: 'describe',
              starters: ['Chaque joueur reçoit…', "Plus on est mobile,…"],
              model: "Chaque joueur reçoit des points selon sa mobilité. Plus on est mobile, plus on a de points, et une équipe ne peut pas dépasser un certain total.",
            },
            {
              fr: "Pourquoi avez-vous choisi ce sport alors que vous êtes valide ?",
              en: 'Why did you choose this sport when you are not disabled?',
              kind: 'past',
              starters: ["J'ai découvert ce sport…", "Mon meilleur ami…"],
              model: "J'ai découvert ce sport grâce à mon meilleur ami, qui est en fauteuil. Je voulais jouer avec lui, et je suis tombée amoureuse du jeu.",
            },
            {
              fr: "Comment ce sport pourrait-il évoluer dans les prochaines années ?",
              en: 'How could this sport develop in the coming years?',
              kind: 'future',
              starters: ["Je pense qu'il deviendra…", "Avec plus de médias,…"],
              model: "Avec plus de médias, je pense qu'il deviendra très populaire. Les clubs pourront acheter plus de fauteuils et accueillir plus de jeunes.",
            },
          ],
        },
        debate: {
          motion: { fr: "Devrait-on mélanger sportifs valides et handicapés dans toutes les compétitions ?", en: 'Should disabled and non-disabled athletes compete together everywhere?' },
          for: {
            starters: ['Oui, car…', 'Le basket fauteuil prouve que…'],
            model: "Oui, car le basket fauteuil prouve que c'est possible avec de bonnes règles. Le sport devrait rassembler les gens au lieu de les séparer.",
          },
          against: {
            starters: ['Pas partout, puisque…', "Dans certains sports,…"],
            model: "Pas partout, puisque dans certains sports, la différence physique est trop grande. Il faut garder des compétitions séparées pour que tout le monde ait sa chance.",
          },
        },
      },
    },
  },
};
