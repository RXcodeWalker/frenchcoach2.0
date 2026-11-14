/**
 * Daily News bank, editions 22–28: three rotation stories and the four pinned
 * calendar editions (daily-news §2). Hand-written (§1); `reviewed: false` until
 * a French speaker has checked every level (content-authoring §16).
 */
import type { NewsEdition } from '../types';

export const WEEK4: NewsEdition[] = [
  {
    id: 'robot-fish', topicArea: 'science', emoji: '🐟', reviewed: false,
    levels: {
      a2: {
        headline: 'Un poisson robot dans le port',
        sentences: [
          { fr: 'À Marseille, un poisson robot nage dans le port.', en: 'In Marseille, a robot fish swims in the harbour.' },
          { fr: 'Il mesure la qualité de l\'eau.', en: 'It measures the quality of the water.' },
          { fr: 'Il a une batterie et il nage pendant huit heures.', en: 'It has a battery and swims for eight hours.' },
          { fr: 'Les vrais poissons ne sont pas dérangés par le robot.', en: 'The real fish are not bothered by the robot.' },
        ],
        glossary: [
          { fr: 'poisson robot', en: 'robot fish' }, { fr: 'nage', en: 'swims' }, { fr: 'port', en: 'harbour' },
          { fr: 'qualité', en: 'quality' }, { fr: 'dérangés', en: 'bothered' },
        ],
        facts: [
          { id: 'robot', en: 'A robot fish swims in Marseille harbour.', sentence: 0, cues: [['robot*'], ['poisson*'], ['marseille', 'port']] },
          { id: 'water', en: 'It measures water quality.', sentence: 1, cues: [['eau'], ['qualite', 'mesure*']] },
          { id: 'battery', en: 'It swims for eight hours on a battery.', sentence: 2, cues: [['huit'], ['heure*', 'batterie']] },
          { id: 'real-fish', en: 'Real fish are not bothered by it.', sentence: 3, cues: [['vrais', 'poisson*'], ['derange*', 'peur']] },
        ],
        check: [
          { q: 'Where does the robot swim?', options: ['In Marseille harbour', 'In a swimming pool', 'In a river in Paris'], answer: 0, sentence: 0 },
          { q: 'What does it measure?', options: ['The temperature of the air', 'The quality of the water', 'The number of boats'], answer: 1, sentence: 1 },
          { q: 'How long can it swim?', options: ['Two hours', 'Eight hours', 'Two days'], answer: 1, sentence: 2 },
        ],
        opinion: { fr: 'Tu aimerais avoir un robot à la maison ? Pour faire quoi ?', en: 'Would you like a robot at home? To do what?' },
        starters: ["Oui, j'aimerais un robot pour…", "Non, parce que…"],
        modelRetell: "À Marseille, un poisson robot nage dans le port. Il mesure la qualité de l'eau. Il nage pendant huit heures avec sa batterie, et les vrais poissons ne sont pas dérangés.",
      },
      b1: {
        headline: 'Un robot poisson surveille la mer',
        sentences: [
          { fr: 'Des ingénieurs marseillais ont créé un robot en forme de poisson pour surveiller la pollution du port.', en: 'Engineers from Marseille have created a fish-shaped robot to monitor pollution in the harbour.' },
          { fr: 'Long de cinquante centimètres, il nage silencieusement grâce à sa queue qui bouge comme celle d\'un vrai poisson.', en: 'Fifty centimetres long, it swims silently thanks to its tail, which moves like a real fish\'s.' },
          { fr: 'Ses capteurs analysent l\'eau et envoient les résultats en direct sur un ordinateur.', en: 'Its sensors analyse the water and send the results live to a computer.' },
          { fr: 'Si une pollution est détectée, les autorités peuvent réagir beaucoup plus vite.', en: 'If pollution is detected, the authorities can react much faster.' },
        ],
        glossary: [
          { fr: 'ingénieurs', en: 'engineers' }, { fr: 'surveiller', en: 'to monitor' }, { fr: 'queue', en: 'tail' },
          { fr: 'capteurs', en: 'sensors' }, { fr: 'réagir', en: 'to react' },
        ],
        facts: [
          { id: 'robot', en: 'Marseille engineers made a fish robot to monitor pollution.', sentence: 0, cues: [['robot*'], ['poisson*'], ['pollution', 'surveill*']] },
          { id: 'tail', en: 'It is 50 cm long and swims silently with its tail.', sentence: 1, cues: [['queue', 'cinquante'], ['nage*', 'silencieu*', 'centimetre*']] },
          { id: 'sensors', en: 'Sensors send water results live to a computer.', sentence: 2, cues: [['capteur*', 'resultat*'], ['ordinateur', 'direct', 'eau']] },
          { id: 'faster', en: 'Authorities can react faster to pollution.', sentence: 3, cues: [['vite', 'reagir'], ['autorite*', 'pollution']] },
        ],
        check: [
          { q: 'How does the robot swim?', options: ['With a propeller', 'With a tail like a real fish', 'It floats with the current'], answer: 1, sentence: 1 },
          { q: 'Where are the results sent?', options: ['To a computer, live', 'To a newspaper', 'Nowhere until it returns'], answer: 0, sentence: 2 },
          { q: 'What is the benefit?', options: ['Authorities react faster to pollution', 'Fishermen catch more fish', 'Tourists can watch it'], answer: 0, sentence: 3 },
        ],
        opinion: { fr: 'Les robots peuvent-ils aider à protéger la nature ? Pourquoi ?', en: 'Can robots help to protect nature? Why?' },
        starters: ['Oui, je pense que…', 'Peut-être, mais…', "Le plus important, c'est…"],
        modelRetell: "Des ingénieurs marseillais ont créé un robot poisson pour surveiller la pollution du port. Il mesure cinquante centimètres et nage avec sa queue. Ses capteurs envoient les résultats en direct sur un ordinateur, donc les autorités peuvent réagir plus vite.",
      },
      b2: {
        headline: 'Biomimétisme : un poisson robot au service de la mer',
        sentences: [
          { fr: 'Inspiré du mouvement des vrais poissons, ce robot conçu à Marseille se faufile dans le port sans effrayer la faune.', en: 'Inspired by the movement of real fish, this robot designed in Marseille slips through the harbour without scaring the wildlife.' },
          { fr: 'Contrairement aux bateaux équipés d\'hélices, il ne fait presque aucun bruit et ne remue pas les fonds.', en: 'Unlike boats with propellers, it makes almost no noise and does not stir up the seabed.' },
          { fr: 'Ses capteurs mesurent en continu la qualité de l\'eau, ce qui permet de repérer une pollution en quelques minutes au lieu de plusieurs jours.', en: 'Its sensors continuously measure water quality, making it possible to spot pollution in minutes instead of several days.' },
          { fr: 'Les chercheurs aimeraient maintenant créer un banc entier de ces robots pour surveiller toute la côte.', en: 'The researchers would now like to create a whole shoal of these robots to monitor the entire coast.' },
        ],
        glossary: [
          { fr: 'se faufile', en: 'slips through' }, { fr: 'faune', en: 'wildlife' }, { fr: 'hélices', en: 'propellers' },
          { fr: 'fonds', en: 'seabed' }, { fr: 'en continu', en: 'continuously' }, { fr: 'banc', en: 'shoal' },
        ],
        facts: [
          { id: 'inspired', en: 'A Marseille robot copies real fish and does not scare wildlife.', sentence: 0, cues: [['robot*'], ['poisson*', 'faune'], ['marseille', 'inspire*', 'effray*']] },
          { id: 'quiet', en: 'Unlike propeller boats it is almost silent.', sentence: 1, cues: [['bruit', 'silencieu*'], ['helice*', 'bateau*']] },
          { id: 'minutes', en: 'It spots pollution in minutes, not days.', sentence: 2, cues: [['pollution'], ['minutes', 'jours', 'repere*']] },
          { id: 'shoal', en: 'Researchers want a whole shoal to watch the coast.', sentence: 3, cues: [['banc', 'plusieurs robots'], ['cote', 'surveiller']] },
        ],
        check: [
          { q: 'Why is it better than a boat?', options: ['It is faster', 'It is almost silent and does not stir the seabed', 'It is cheaper'], answer: 1, sentence: 1 },
          { q: 'How quickly can it spot pollution?', options: ['In minutes', 'In a week', 'In a month'], answer: 0, sentence: 2 },
          { q: 'What do the researchers want next?', options: ['A robot shark', 'A whole shoal of robots', 'A bigger robot'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'La technologie peut-elle résoudre les problèmes écologiques ? Justifie ta réponse.', en: 'Can technology solve environmental problems? Justify your answer.' },
        starters: ['La technologie aide à… mais…', 'Il serait naïf de croire que…', 'Ce robot montre que…'],
        modelRetell: "Un robot conçu à Marseille, inspiré des vrais poissons, nage dans le port sans effrayer la faune. Contrairement aux bateaux à hélices, il ne fait presque pas de bruit. Il repère une pollution en quelques minutes au lieu de plusieurs jours, et les chercheurs veulent créer un banc de robots pour surveiller la côte.",
      },
    },
  },
  {
    id: 'museum-night', topicArea: 'culture', emoji: '🖼️', reviewed: false,
    levels: {
      a2: {
        headline: 'Une nuit au musée pour les ados',
        sentences: [
          { fr: 'Samedi soir, un musée de Strasbourg reste ouvert pour les adolescents.', en: 'On Saturday evening, a museum in Strasbourg stays open for teenagers.' },
          { fr: "L'entrée est gratuite jusqu'à minuit.", en: 'Entry is free until midnight.' },
          { fr: 'Il y a de la musique et des jeux dans les salles.', en: 'There is music and there are games in the rooms.' },
          { fr: 'Les jeunes peuvent aussi dessiner devant les tableaux.', en: 'Young people can also draw in front of the paintings.' },
        ],
        glossary: [
          { fr: 'musée', en: 'museum' }, { fr: 'adolescents', en: 'teenagers' }, { fr: 'minuit', en: 'midnight' },
          { fr: 'salles', en: 'rooms' }, { fr: 'tableaux', en: 'paintings' },
        ],
        facts: [
          { id: 'open', en: 'A Strasbourg museum stays open for teenagers.', sentence: 0, cues: [['musee'], ['adolescent*', 'ado*', 'jeune*', 'strasbourg']] },
          { id: 'free', en: 'Entry is free until midnight.', sentence: 1, cues: [['gratuit*'], ['minuit']] },
          { id: 'music', en: 'There is music and games.', sentence: 2, cues: [['musique'], ['jeu*', 'salle*']] },
          { id: 'draw', en: 'Young people can draw in front of the paintings.', sentence: 3, cues: [['dessiner'], ['tableau*']] },
        ],
        check: [
          { q: 'Who is the evening for?', options: ['Teenagers', 'Grandparents', 'Teachers'], answer: 0, sentence: 0 },
          { q: 'Until when is entry free?', options: ['Ten o\'clock', 'Midnight', 'Six o\'clock'], answer: 1, sentence: 1 },
          { q: 'What can young people do in front of the paintings?', options: ['Draw', 'Eat', 'Sleep'], answer: 0, sentence: 3 },
        ],
        opinion: { fr: 'Tu aimes aller au musée ? Pourquoi ?', en: 'Do you like going to museums? Why?' },
        starters: ["Oui, j'aime parce que…", "Non, je trouve ça…"],
        modelRetell: "Un musée de Strasbourg reste ouvert le soir pour les adolescents. L'entrée est gratuite jusqu'à minuit. Il y a de la musique et des jeux, et les jeunes peuvent dessiner devant les tableaux.",
      },
      b1: {
        headline: 'Le musée change de visage la nuit',
        sentences: [
          { fr: 'Une fois par mois, un musée de Strasbourg ouvre ses portes aux adolescents jusqu\'à minuit.', en: 'Once a month, a museum in Strasbourg opens its doors to teenagers until midnight.' },
          { fr: 'Au programme : concerts, jeux d\'enquête et ateliers de dessin au milieu des œuvres.', en: 'On the programme: concerts, detective games and drawing workshops among the works of art.' },
          { fr: 'Les guides sont des étudiants à peine plus âgés que les visiteurs.', en: 'The guides are students barely older than the visitors.' },
          { fr: 'Le musée espère que ces jeunes reviendront ensuite en famille ou avec leurs amis.', en: 'The museum hopes these young people will then come back with their families or friends.' },
        ],
        glossary: [
          { fr: 'ouvre ses portes', en: 'opens its doors' }, { fr: "jeux d'enquête", en: 'detective games' }, { fr: 'ateliers', en: 'workshops' },
          { fr: 'œuvres', en: 'works of art' }, { fr: 'à peine', en: 'barely' },
        ],
        facts: [
          { id: 'monthly', en: 'Once a month a Strasbourg museum opens to teens until midnight.', sentence: 0, cues: [['musee'], ['minuit', 'mois'], ['adolescent*', 'jeune*', 'ado*']] },
          { id: 'activities', en: 'Concerts, detective games and drawing workshops.', sentence: 1, cues: [['concert*', 'jeux', 'atelier*'], ['dessin*', 'enquete', 'oeuvre*']] },
          { id: 'guides', en: 'The guides are students only a bit older.', sentence: 2, cues: [['guide*'], ['etudiant*']] },
          { id: 'come-back', en: 'The museum hopes they come back with family or friends.', sentence: 3, cues: [['reviendr*', 'revenir'], ['famille', 'ami*']] },
        ],
        check: [
          { q: 'How often does this happen?', options: ['Every night', 'Once a month', 'Once a year'], answer: 1, sentence: 0 },
          { q: 'Who are the guides?', options: ['Retired teachers', 'Students barely older than the visitors', 'Famous artists'], answer: 1, sentence: 2 },
          { q: 'What does the museum hope?', options: ['To sell more tickets to tourists', 'That the teens come back with family or friends', 'To close earlier'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Comment pourrait-on rendre les musées plus intéressants pour les jeunes ?', en: 'How could museums be made more interesting for young people?' },
        starters: ['On pourrait… parce que…', "À mon avis, il faudrait…", 'Ce qui m\'intéresserait, c\'est…'],
        modelRetell: "Une fois par mois, un musée de Strasbourg ouvre jusqu'à minuit pour les adolescents. Il y a des concerts, des jeux d'enquête et des ateliers de dessin. Les guides sont des étudiants. Le musée espère que les jeunes reviendront en famille ou avec leurs amis.",
      },
      b2: {
        headline: 'Les nocturnes qui réconcilient les ados avec l\'art',
        sentences: [
          { fr: 'Les musées attirent peu les adolescents, qui les jugent souvent ennuyeux ou intimidants.', en: 'Museums attract few teenagers, who often find them boring or intimidating.' },
          { fr: 'Pour changer cette image, un musée strasbourgeois organise chaque mois une nocturne gratuite réservée aux treize-dix-huit ans.', en: 'To change that image, a Strasbourg museum holds a free late opening every month just for thirteen- to eighteen-year-olds.' },
          { fr: 'Jeux d\'enquête et concerts transforment la visite, tandis que de jeunes médiateurs remplacent les guides traditionnels.', en: 'Detective games and concerts transform the visit, while young mediators replace the traditional guides.' },
          { fr: 'Le pari semble réussi : la plupart des participants affirment qu\'ils reviendront, parfois même en famille.', en: 'The gamble seems to have paid off: most participants say they will come back, sometimes even with their families.' },
        ],
        glossary: [
          { fr: 'ennuyeux', en: 'boring' }, { fr: 'intimidants', en: 'intimidating' }, { fr: 'nocturne', en: 'late-night opening' },
          { fr: 'médiateurs', en: 'gallery mediators, guides' }, { fr: 'affirment', en: 'say, state' },
        ],
        facts: [
          { id: 'image', en: 'Teens often find museums boring or intimidating.', sentence: 0, cues: [['musee*'], ['ennuyeux', 'intimidant*']] },
          { id: 'nocturne', en: 'A free monthly late opening for 13–18-year-olds in Strasbourg.', sentence: 1, cues: [['nocturne', 'soir', 'nuit'], ['gratuit*', 'treize', 'strasbourg*']] },
          { id: 'format', en: 'Games and concerts, with young mediators as guides.', sentence: 2, cues: [['jeux', 'concert*'], ['mediateur*', 'guide*', 'jeune*']] },
          { id: 'success', en: 'Most say they will come back, even with family.', sentence: 3, cues: [['reviendr*', 'revenir'], ['famille', 'participant*', 'plupart']] },
        ],
        check: [
          { q: 'How do many teens see museums?', options: ['Exciting', 'Boring or intimidating', 'Too expensive'], answer: 1, sentence: 0 },
          { q: 'Who replaces the traditional guides?', options: ['Robots', 'Young mediators', 'Audio guides'], answer: 1, sentence: 2 },
          { q: 'What do most participants say?', options: ['They will come back', 'It was too late', 'They preferred school trips'], answer: 0, sentence: 3 },
        ],
        opinion: { fr: 'La culture devrait-elle être gratuite pour tous les jeunes ? Justifie ta réponse.', en: 'Should culture be free for all young people? Justify your answer.' },
        starters: ['La gratuité permettrait de… car…', 'Le prix n\'est pas le seul obstacle…', 'Il faudrait aussi…'],
        modelRetell: "Les adolescents trouvent souvent les musées ennuyeux ou intimidants. Un musée strasbourgeois organise donc une nocturne gratuite chaque mois pour les treize-dix-huit ans, avec des jeux, des concerts et de jeunes médiateurs. La plupart des participants disent qu'ils reviendront, parfois en famille.",
      },
    },
  },
  {
    id: 'cardboard-boats', topicArea: 'festival', emoji: '🛶', reviewed: false,
    levels: {
      a2: {
        headline: 'Une course de bateaux en carton',
        sentences: [
          { fr: 'Dimanche, il y a une course de bateaux en carton sur un lac.', en: 'On Sunday, there is a cardboard boat race on a lake.' },
          { fr: 'Les équipes fabriquent leur bateau avec du carton et du scotch.', en: 'The teams build their boat with cardboard and tape.' },
          { fr: 'Beaucoup de bateaux coulent très vite !', en: 'Lots of boats sink very quickly!' },
          { fr: 'Le gagnant reçoit une coupe en carton, bien sûr.', en: 'The winner gets a cardboard cup, of course.' },
        ],
        glossary: [
          { fr: 'course', en: 'race' }, { fr: 'carton', en: 'cardboard' }, { fr: 'fabriquent', en: 'build, make' },
          { fr: 'scotch', en: 'sticky tape' }, { fr: 'coulent', en: 'sink' },
        ],
        facts: [
          { id: 'race', en: 'A cardboard boat race on a lake.', sentence: 0, cues: [['carton'], ['bateau*', 'course']] },
          { id: 'build', en: 'Teams build boats from cardboard and tape.', sentence: 1, cues: [['fabrique*', 'construi*'], ['scotch', 'carton', 'equipe*']] },
          { id: 'sink', en: 'Lots of boats sink quickly.', sentence: 2, cues: [['coule*'], ['vite', 'bateau*']] },
          { id: 'cup', en: 'The winner gets a cardboard cup.', sentence: 3, cues: [['coupe'], ['gagnant*', 'gagne*']] },
        ],
        check: [
          { q: 'What are the boats made of?', options: ['Wood', 'Cardboard and tape', 'Plastic bottles'], answer: 1, sentence: 1 },
          { q: 'What happens to lots of boats?', options: ['They sink quickly', 'They fly', 'They break the record'], answer: 0, sentence: 2 },
          { q: 'What does the winner get?', options: ['Money', 'A cardboard cup', 'A real boat'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Tu voudrais participer à cette course ? Pourquoi ?', en: 'Would you like to take part in this race? Why?' },
        starters: ['Oui, parce que…', 'Non, je ne voudrais pas parce que…'],
        modelRetell: "Il y a une course de bateaux en carton sur un lac. Les équipes fabriquent leur bateau avec du carton et du scotch. Beaucoup de bateaux coulent vite, et le gagnant reçoit une coupe en carton.",
      },
      b1: {
        headline: 'Bateaux en carton : rires et plongeons garantis',
        sentences: [
          { fr: 'Sur un lac près d\'Annecy, une quarantaine d\'équipes ont participé à une course de bateaux en carton.', en: 'On a lake near Annecy, around forty teams took part in a cardboard boat race.' },
          { fr: 'La règle est simple : seuls le carton, le scotch et la peinture sont autorisés.', en: 'The rule is simple: only cardboard, tape and paint are allowed.' },
          { fr: 'Certains bateaux ont coulé dès le départ, sous les rires du public.', en: 'Some boats sank right at the start, to the laughter of the crowd.' },
          { fr: 'Une équipe de collégiens a gagné avec un bateau en forme de requin, et tout le carton sera recyclé.', en: 'A team of secondary pupils won with a shark-shaped boat, and all the cardboard will be recycled.' },
        ],
        glossary: [
          { fr: 'une quarantaine', en: 'about forty' }, { fr: 'autorisés', en: 'allowed' }, { fr: 'dès le départ', en: 'right at the start' },
          { fr: 'rires', en: 'laughter' }, { fr: 'requin', en: 'shark' },
        ],
        facts: [
          { id: 'race', en: 'About forty teams raced cardboard boats near Annecy.', sentence: 0, cues: [['carton'], ['quarantaine', 'annecy', 'course']] },
          { id: 'rule', en: 'Only cardboard, tape and paint are allowed.', sentence: 1, cues: [['scotch', 'peinture'], ['autorise*', 'seuls', 'regle']] },
          { id: 'sank', en: 'Some boats sank at the start and the crowd laughed.', sentence: 2, cues: [['coule*'], ['depart', 'rire*']] },
          { id: 'shark', en: 'Pupils won with a shark boat; the cardboard is recycled.', sentence: 3, cues: [['requin', 'gagne*'], ['recycl*', 'collegien*']] },
        ],
        check: [
          { q: 'Which material is NOT allowed?', options: ['Paint', 'Tape', 'Wood'], answer: 2, sentence: 1 },
          { q: 'What happened at the start?', options: ['Some boats sank', 'It started raining', 'The race was cancelled'], answer: 0, sentence: 2 },
          { q: 'What shape was the winning boat?', options: ['A whale', 'A shark', 'A swan'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Quel bateau en carton tu fabriquerais, et pourquoi ?', en: 'What cardboard boat would you build, and why?' },
        starters: ['Je fabriquerais un bateau en forme de… parce que…', "Mon équipe…"],
        modelRetell: "Près d'Annecy, une quarantaine d'équipes ont fait une course de bateaux en carton. Seuls le carton, le scotch et la peinture sont autorisés. Certains bateaux ont coulé au départ, sous les rires du public. Des collégiens ont gagné avec un requin, et le carton sera recyclé.",
      },
      b2: {
        headline: 'Une régate en carton, entre créativité et recyclage',
        sentences: [
          { fr: 'Ni moteur, ni bois, ni plastique : sur le lac, une quarantaine d\'embarcations faites uniquement de carton et de scotch ont pris le départ.', en: 'No motor, no wood, no plastic: on the lake, around forty boats made only of cardboard and tape set off.' },
          { fr: 'Si certaines se sont désintégrées en quelques secondes, d\'autres ont surpris par leur solidité et leur originalité.', en: 'While some fell apart in seconds, others surprised everyone with their strength and originality.' },
          { fr: 'La victoire est revenue à des collégiens, dont le requin géant a parcouru les deux cents mètres sans prendre l\'eau.', en: 'Victory went to some secondary pupils, whose giant shark covered the two hundred metres without letting in water.' },
          { fr: 'Au-delà du spectacle, les organisateurs veulent sensibiliser au recyclage : tout le carton sera récupéré.', en: 'Beyond the show, the organisers want to raise awareness of recycling: all the cardboard will be collected.' },
        ],
        glossary: [
          { fr: 'embarcations', en: 'boats, craft' }, { fr: 'se sont désintégrées', en: 'fell apart' }, { fr: 'solidité', en: 'strength, sturdiness' },
          { fr: 'parcouru', en: 'covered (a distance)' }, { fr: 'sensibiliser', en: 'to raise awareness' },
        ],
        facts: [
          { id: 'rules', en: 'Forty boats made only of cardboard and tape.', sentence: 0, cues: [['carton'], ['scotch', 'quarantaine', 'embarcation*']] },
          { id: 'results', en: 'Some fell apart in seconds; others were strong and original.', sentence: 1, cues: [['desintegre*', 'coule*', 'secondes'], ['solidite', 'originalite']] },
          { id: 'shark', en: "Pupils' giant shark covered 200 m without taking in water.", sentence: 2, cues: [['requin'], ['deux cents', 'collegien*', 'victoire']] },
          { id: 'recycling', en: 'The aim is to raise awareness of recycling.', sentence: 3, cues: [['recycl*'], ['sensibiliser', 'recupere*', 'organisateur*']] },
        ],
        check: [
          { q: 'What happened to some boats?', options: ['They fell apart in seconds', 'They were disqualified', 'They won prizes'], answer: 0, sentence: 1 },
          { q: 'How far did the winning shark go?', options: ['20 metres', '200 metres', '2 kilometres'], answer: 1, sentence: 2 },
          { q: 'What message do the organisers want to send?', options: ['Cardboard is dangerous', 'Recycling matters', 'Lakes are for boats only'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Les événements amusants sont-ils un bon moyen de faire passer un message écologique ? Justifie ta réponse.', en: 'Are fun events a good way to get an environmental message across? Justify your answer.' },
        starters: ["L'humour permet de… car…", 'Cependant, le message risque de…', 'Les gens retiennent mieux quand…'],
        modelRetell: "Une quarantaine de bateaux faits seulement de carton et de scotch ont pris le départ sur le lac. Certains se sont désintégrés en quelques secondes, d'autres ont surpris par leur solidité. Des collégiens ont gagné avec un requin géant qui a parcouru deux cents mètres. Les organisateurs veulent sensibiliser au recyclage.",
      },
    },
  },
  {
    id: 'candlemas-crepes', topicArea: 'festival', emoji: '🥞', pinDate: '02-02', reviewed: false,
    levels: {
      a2: {
        headline: "Aujourd'hui, c'est la Chandeleur !",
        sentences: [
          { fr: "Aujourd'hui, c'est la Chandeleur en France.", en: "Today is Candlemas in France." },
          { fr: 'Pour cette fête, les familles mangent des crêpes.', en: 'For this festival, families eat pancakes.' },
          { fr: 'On fait sauter la crêpe dans la poêle avec une pièce dans la main.', en: 'You flip the pancake in the pan with a coin in your hand.' },
          { fr: "C'est pour avoir de la chance toute l'année !", en: "It's for good luck all year!" },
        ],
        glossary: [
          { fr: 'Chandeleur', en: 'Candlemas' }, { fr: 'crêpes', en: 'pancakes, crêpes' }, { fr: 'fait sauter', en: 'flips (makes it jump)' },
          { fr: 'poêle', en: 'frying pan' }, { fr: 'pièce', en: 'coin' }, { fr: 'chance', en: 'luck' },
        ],
        facts: [
          { id: 'today', en: "Today is Candlemas in France.", sentence: 0, cues: [['chandeleur'], ['aujourd hui', 'france']] },
          { id: 'crepes', en: 'Families eat crêpes.', sentence: 1, cues: [['crepe*'], ['mange*', 'famille*']] },
          { id: 'coin', en: 'You flip the crêpe holding a coin.', sentence: 2, cues: [['piece'], ['saute*', 'poele', 'main']] },
          { id: 'luck', en: "It's for good luck all year.", sentence: 3, cues: [['chance'], ['annee', 'an']] },
        ],
        check: [
          { q: 'What do families eat?', options: ['Cake', 'Crêpes', 'Chocolate'], answer: 1, sentence: 1 },
          { q: 'What do you hold while flipping?', options: ['A coin', 'A candle', 'A spoon'], answer: 0, sentence: 2 },
          { q: 'Why do people do it?', options: ['For good luck', 'To win a prize', 'To be healthy'], answer: 0, sentence: 3 },
        ],
        opinion: { fr: 'Tu aimes les crêpes ? Avec quoi ?', en: 'Do you like crêpes? With what?' },
        starters: ["J'adore les crêpes avec… parce que…", "Je préfère…"],
        modelRetell: "Aujourd'hui, c'est la Chandeleur en France. Les familles mangent des crêpes. On fait sauter la crêpe avec une pièce dans la main, pour avoir de la chance toute l'année.",
      },
      b1: {
        headline: 'La Chandeleur, la fête des crêpes',
        sentences: [
          { fr: "Chaque année, le deux février, les Français célèbrent la Chandeleur en préparant des crêpes.", en: 'Every year, on the second of February, French people celebrate Candlemas by making crêpes.' },
          { fr: 'À l\'origine, c\'était une fête religieuse des chandelles, mais elle est surtout devenue une tradition gourmande.', en: 'Originally it was a church festival of candles, but it has mostly become a food tradition.' },
          { fr: 'Selon une vieille coutume, il faut faire sauter la première crêpe en tenant une pièce dans l\'autre main.', en: 'According to an old custom, you must flip the first crêpe while holding a coin in your other hand.' },
          { fr: 'Si la crêpe retombe bien dans la poêle, on aura de la chance pendant toute l\'année.', en: 'If the crêpe lands properly in the pan, you will have good luck all year.' },
        ],
        glossary: [
          { fr: 'célèbrent', en: 'celebrate' }, { fr: 'chandelles', en: 'candles' }, { fr: 'gourmande', en: 'food-loving, delicious' },
          { fr: 'coutume', en: 'custom' }, { fr: 'retombe', en: 'lands, falls back' },
        ],
        facts: [
          { id: 'date', en: 'On 2 February the French celebrate Candlemas with crêpes.', sentence: 0, cues: [['chandeleur', 'deux fevrier'], ['crepe*']] },
          { id: 'origin', en: 'It began as a candle festival and became a food tradition.', sentence: 1, cues: [['chandelle*', 'origine'], ['tradition', 'gourmande']] },
          { id: 'coin', en: 'You flip the first crêpe holding a coin.', sentence: 2, cues: [['piece'], ['saute*', 'premiere', 'main']] },
          { id: 'luck', en: 'If it lands in the pan, you will be lucky all year.', sentence: 3, cues: [['chance'], ['poele', 'retombe*', 'annee']] },
        ],
        check: [
          { q: 'When is Candlemas?', options: ['1 January', '2 February', '14 July'], answer: 1, sentence: 0 },
          { q: 'What was it originally?', options: ['A festival of candles', 'A harvest festival', 'A sports day'], answer: 0, sentence: 1 },
          { q: 'What brings good luck?', options: ['Eating ten crêpes', 'The crêpe landing in the pan', 'Lighting a candle'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Est-ce important de garder les traditions ? Pourquoi ?', en: 'Is it important to keep traditions? Why?' },
        starters: ["Oui, parce que les traditions…", "Pas toujours, car…", 'Dans ma famille, on…'],
        modelRetell: "Le deux février, les Français célèbrent la Chandeleur avec des crêpes. C'était une fête des chandelles, mais c'est devenu une tradition gourmande. On fait sauter la première crêpe avec une pièce dans la main, et si elle retombe dans la poêle, on aura de la chance toute l'année.",
      },
      b2: {
        headline: 'Chandeleur : une tradition qui ne retombe pas',
        sentences: [
          { fr: 'Ce deux février, des millions de poêles chauffent en France : c\'est la Chandeleur, quarante jours après Noël.', en: 'This second of February, millions of frying pans are heating up in France: it is Candlemas, forty days after Christmas.' },
          { fr: 'La crêpe, ronde et dorée, aurait autrefois symbolisé le soleil qui revient après l\'hiver.', en: 'The crêpe, round and golden, is said to have once symbolised the sun returning after winter.' },
          { fr: 'La tradition veut qu\'on la fasse sauter une pièce à la main, pour s\'assurer prospérité et chance toute l\'année.', en: 'Tradition says you flip it with a coin in your hand, to ensure wealth and good luck all year.' },
          { fr: 'Les ventes de farine et d\'œufs bondissent d\'ailleurs chaque année à cette période, preuve que la coutume reste bien vivante.', en: 'Sales of flour and eggs leap every year at this time, proof that the custom is still very much alive.' },
        ],
        glossary: [
          { fr: 'chauffent', en: 'heat up' }, { fr: 'dorée', en: 'golden' }, { fr: 'symbolisé', en: 'symbolised' },
          { fr: 'prospérité', en: 'wealth, prosperity' }, { fr: 'bondissent', en: 'leap, shoot up' }, { fr: 'vivante', en: 'alive' },
        ],
        facts: [
          { id: 'date', en: 'Candlemas is on 2 February, forty days after Christmas.', sentence: 0, cues: [['chandeleur', 'deux fevrier'], ['noel', 'quarante jours', 'poele*']] },
          { id: 'sun', en: 'The round golden crêpe once symbolised the returning sun.', sentence: 1, cues: [['soleil'], ['crepe*', 'ronde', 'hiver']] },
          { id: 'coin', en: 'You flip it holding a coin, for wealth and luck.', sentence: 2, cues: [['piece'], ['chance', 'prosperite']] },
          { id: 'sales', en: 'Flour and egg sales leap every year.', sentence: 3, cues: [['vente*'], ['farine', 'oeuf*']] },
        ],
        check: [
          { q: 'When is Candlemas compared with Christmas?', options: ['Forty days after', 'A week after', 'A month before'], answer: 0, sentence: 0 },
          { q: 'What might the crêpe have symbolised?', options: ['The moon', 'The returning sun', 'A coin'], answer: 1, sentence: 1 },
          { q: 'What shows the custom is alive?', options: ['Flour and egg sales leap', 'Schools close', 'It is on TV'], answer: 0, sentence: 3 },
        ],
        opinion: { fr: 'Les traditions doivent-elles évoluer avec leur époque ? Justifie ta réponse.', en: 'Should traditions change with the times? Justify your answer.' },
        starters: ['Une tradition survit quand…', 'Certes…, mais…', "À mon avis, l'essentiel est de…"],
        modelRetell: "Le deux février, c'est la Chandeleur, quarante jours après Noël, et des millions de poêles chauffent en France. La crêpe ronde et dorée symbolisait autrefois le soleil. On la fait sauter une pièce à la main pour avoir de la chance. Chaque année, les ventes de farine et d'œufs bondissent.",
      },
    },
  },
  {
    id: 'april-fish', topicArea: 'festival', emoji: '🐠', pinDate: '04-01', reviewed: false,
    levels: {
      a2: {
        headline: "Poisson d'avril !",
        sentences: [
          { fr: "Aujourd'hui, c'est le premier avril.", en: 'Today is the first of April.' },
          { fr: 'En France, les enfants collent des poissons en papier dans le dos des gens.', en: "In France, children stick paper fish on people's backs." },
          { fr: 'Quand la personne voit le poisson, tout le monde crie « Poisson d\'avril ! ».', en: 'When the person sees the fish, everyone shouts "April fish!".' },
          { fr: 'Les journaux aussi racontent de fausses histoires amusantes.', en: 'Newspapers also tell funny fake stories.' },
        ],
        glossary: [
          { fr: 'collent', en: 'stick' }, { fr: 'papier', en: 'paper' }, { fr: 'dos', en: 'back' },
          { fr: 'crie', en: 'shouts' }, { fr: 'fausses', en: 'fake, false' },
        ],
        facts: [
          { id: 'date', en: 'Today is 1 April.', sentence: 0, cues: [['avril'], ['premier', 'aujourd hui']] },
          { id: 'paper', en: "Children stick paper fish on people's backs.", sentence: 1, cues: [['poisson*'], ['papier', 'dos', 'colle*']] },
          { id: 'shout', en: 'Everyone shouts "April fish!".', sentence: 2, cues: [['crie*'], ['poisson d avril', 'tout le monde']] },
          { id: 'newspapers', en: 'Newspapers tell funny fake stories.', sentence: 3, cues: [['journaux', 'journal'], ['fausse*', 'histoire*', 'amusante*']] },
        ],
        check: [
          { q: 'What do children stick on people?', options: ['Stickers of stars', 'Paper fish', 'Notes'], answer: 1, sentence: 1 },
          { q: 'Where do they stick them?', options: ["On people's backs", 'On doors', 'On cars'], answer: 0, sentence: 1 },
          { q: 'What do newspapers do?', options: ['Close for the day', 'Tell funny fake stories', 'Print fish recipes'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: "Tu aimes faire des blagues ? Pourquoi ?", en: 'Do you like playing jokes? Why?' },
        starters: ["Oui, j'aime parce que…", "Non, parce que…"],
        modelRetell: "Aujourd'hui, c'est le premier avril. Les enfants collent des poissons en papier dans le dos des gens, et tout le monde crie « Poisson d'avril ! ». Les journaux racontent aussi de fausses histoires.",
      },
      b1: {
        headline: "Le premier avril, méfiez-vous des poissons",
        sentences: [
          { fr: "Le premier avril, en France, il vaut mieux vérifier son dos plusieurs fois par jour.", en: "On the first of April in France, you'd better check your back several times a day." },
          { fr: 'Les enfants essaient d\'y accrocher discrètement un poisson en papier sans se faire voir.', en: 'Children try to secretly attach a paper fish to it without being seen.' },
          { fr: 'Les adultes ne sont pas en reste : les radios et les journaux inventent des fausses nouvelles très crédibles.', en: 'Adults are not left out: radio stations and newspapers invent very believable fake news.' },
          { fr: 'Personne ne sait vraiment d\'où vient cette tradition, qui existerait depuis le seizième siècle.', en: 'Nobody really knows where this tradition comes from; it may have existed since the sixteenth century.' },
        ],
        glossary: [
          { fr: 'il vaut mieux', en: "it's better to" }, { fr: 'accrocher', en: 'to attach' }, { fr: 'discrètement', en: 'secretly' },
          { fr: 'ne sont pas en reste', en: 'are not left out' }, { fr: 'crédibles', en: 'believable' }, { fr: 'siècle', en: 'century' },
        ],
        facts: [
          { id: 'check', en: 'On 1 April you should check your back.', sentence: 0, cues: [['avril'], ['dos', 'verifier']] },
          { id: 'fish', en: 'Children secretly attach a paper fish.', sentence: 1, cues: [['poisson*'], ['papier', 'accroch*', 'enfant*']] },
          { id: 'media', en: 'Radio and newspapers invent believable fake news.', sentence: 2, cues: [['radio*', 'journaux', 'journal'], ['fausse*', 'nouvelle*', 'invente*']] },
          { id: 'origin', en: 'Nobody knows where it comes from; maybe the 16th century.', sentence: 3, cues: [['tradition', 'origine'], ['seizieme', 'siecle', 'personne ne sait']] },
        ],
        check: [
          { q: 'What do children try to do?', options: ['Hide the fish in a bag', 'Attach a paper fish without being seen', 'Draw a fish on the board'], answer: 1, sentence: 1 },
          { q: 'What do radios and newspapers do?', options: ['Invent believable fake news', 'Stop working', 'Give away fish'], answer: 0, sentence: 2 },
          { q: 'Since when might the tradition exist?', options: ['The 6th century', 'The 16th century', 'The 20th century'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: "Les fausses nouvelles du premier avril sont-elles amusantes ou dangereuses ? Pourquoi ?", en: 'Is 1 April fake news funny or dangerous? Why?' },
        starters: ['Je trouve ça amusant parce que…', 'Ça peut être dangereux si…', "Le premier avril, on sait que…"],
        modelRetell: "Le premier avril, en France, il faut vérifier son dos. Les enfants essaient d'accrocher un poisson en papier sans se faire voir. Les radios et les journaux inventent des fausses nouvelles crédibles. Personne ne sait d'où vient la tradition, peut-être du seizième siècle.",
      },
      b2: {
        headline: "Poisson d'avril : l'art de la farce",
        sentences: [
          { fr: "Chaque premier avril, la France se transforme en terrain de jeu pour les farceurs de tous âges.", en: 'Every first of April, France turns into a playground for pranksters of all ages.' },
          { fr: 'Dans les cours d\'école, des poissons en papier finissent accrochés au dos des élèves comme des professeurs.', en: 'In school playgrounds, paper fish end up on the backs of pupils and teachers alike.' },
          { fr: 'Les médias, eux, rivalisent d\'imagination, au point que certaines fausses nouvelles sont reprises très sérieusement sur les réseaux sociaux.', en: 'The media compete in imagination, so much so that some fake stories are taken very seriously on social media.' },
          { fr: 'Ce jour-là, un réflexe s\'impose donc : vérifier la source avant de partager une information.', en: 'On that day, one reflex is essential: check the source before sharing any information.' },
        ],
        glossary: [
          { fr: 'farceurs', en: 'pranksters' }, { fr: 'terrain de jeu', en: 'playground' }, { fr: 'rivalisent', en: 'compete' },
          { fr: 'reprises', en: 'picked up, repeated' }, { fr: "s'impose", en: 'is essential' }, { fr: 'source', en: 'source' },
        ],
        facts: [
          { id: 'pranks', en: 'On 1 April France becomes a playground for pranksters.', sentence: 0, cues: [['avril'], ['farceur*', 'farce*', 'blague*', 'jeu']] },
          { id: 'school', en: 'Paper fish end up on pupils\' and teachers\' backs.', sentence: 1, cues: [['poisson*'], ['dos', 'eleve*', 'professeur*']] },
          { id: 'media', en: 'Some media fake stories are taken seriously online.', sentence: 2, cues: [['media*', 'fausse*'], ['reseaux sociaux', 'serieusement']] },
          { id: 'source', en: 'Check the source before sharing.', sentence: 3, cues: [['source'], ['verifier', 'partager']] },
        ],
        check: [
          { q: 'Who gets paper fish on their backs?', options: ['Only pupils', 'Pupils and teachers', 'Only parents'], answer: 1, sentence: 1 },
          { q: 'What happens with some fake stories?', options: ['They are taken seriously on social media', 'They are banned', 'Nobody reads them'], answer: 0, sentence: 2 },
          { q: 'What reflex does the article recommend?', options: ['Stay at home', 'Check the source before sharing', 'Never read the news'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Comment peut-on apprendre aux jeunes à reconnaître les fausses informations ? Justifie ta réponse.', en: 'How can young people be taught to recognise false information? Justify your answer.' },
        starters: ["L'école devrait… car…", 'Il est essentiel de vérifier… parce que…', 'Les réseaux sociaux ont une responsabilité…'],
        modelRetell: "Le premier avril, la France devient un terrain de jeu pour les farceurs. Des poissons en papier sont accrochés au dos des élèves et des professeurs. Les médias inventent des fausses nouvelles, parfois reprises sérieusement sur les réseaux sociaux. Il faut donc vérifier la source avant de partager.",
      },
    },
  },
  {
    id: 'music-day', topicArea: 'festival', emoji: '🎸', pinDate: '06-21', reviewed: false,
    levels: {
      a2: {
        headline: "C'est la Fête de la musique !",
        sentences: [
          { fr: "Aujourd'hui, c'est la Fête de la musique.", en: "Today is the Fête de la musique (Music Day)." },
          { fr: 'Dans toutes les villes, des musiciens jouent dans la rue.', en: 'In every town, musicians play in the street.' },
          { fr: 'Les concerts sont gratuits et tout le monde peut jouer.', en: 'The concerts are free and anyone can play.' },
          { fr: 'Les gens chantent et dansent jusqu\'à minuit.', en: 'People sing and dance until midnight.' },
        ],
        glossary: [
          { fr: 'fête', en: 'festival, party' }, { fr: 'musiciens', en: 'musicians' }, { fr: 'rue', en: 'street' },
          { fr: 'chantent', en: 'sing' }, { fr: 'dansent', en: 'dance' },
        ],
        facts: [
          { id: 'today', en: 'Today is Music Day.', sentence: 0, cues: [['fete'], ['musique']] },
          { id: 'street', en: 'Musicians play in the streets of every town.', sentence: 1, cues: [['musicien*', 'jouent'], ['rue*', 'ville*']] },
          { id: 'free', en: 'Concerts are free and anyone can play.', sentence: 2, cues: [['gratuit*'], ['concert*', 'tout le monde']] },
          { id: 'dance', en: 'People sing and dance until midnight.', sentence: 3, cues: [['chante*', 'danse*'], ['minuit', 'gens']] },
        ],
        check: [
          { q: 'Where do musicians play?', options: ['In the street', 'Only in theatres', 'At school'], answer: 0, sentence: 1 },
          { q: 'How much do the concerts cost?', options: ['Ten euros', 'Nothing', 'It depends'], answer: 1, sentence: 2 },
          { q: 'Until when do people dance?', options: ['Ten o\'clock', 'Midnight', 'Morning'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Quelle musique tu aimes ? Pourquoi ?', en: 'What music do you like? Why?' },
        starters: ["J'aime… parce que…", 'Mon chanteur préféré, c\'est…'],
        modelRetell: "Aujourd'hui, c'est la Fête de la musique. Dans toutes les villes, des musiciens jouent dans la rue. Les concerts sont gratuits, et les gens chantent et dansent jusqu'à minuit.",
      },
      b1: {
        headline: 'Le 21 juin, la France entière joue de la musique',
        sentences: [
          { fr: 'Chaque année, le vingt et un juin, jour le plus long de l\'année, la France célèbre la Fête de la musique.', en: 'Every year, on the twenty-first of June, the longest day of the year, France celebrates Music Day.' },
          { fr: 'Créée en mille neuf cent quatre-vingt-deux, elle invite tous les musiciens, amateurs ou professionnels, à jouer dehors.', en: 'Created in 1982, it invites all musicians, amateur or professional, to play outdoors.' },
          { fr: 'Tous les concerts sont gratuits, du rock au jazz en passant par la musique classique.', en: 'All the concerts are free, from rock to jazz to classical music.' },
          { fr: 'Aujourd\'hui, la fête existe dans plus de cent vingt pays.', en: 'Today the festival exists in more than a hundred and twenty countries.' },
        ],
        glossary: [
          { fr: 'jour le plus long', en: 'longest day' }, { fr: 'amateurs', en: 'amateurs' }, { fr: 'dehors', en: 'outdoors' },
          { fr: 'en passant par', en: 'including, by way of' }, { fr: 'pays', en: 'countries' },
        ],
        facts: [
          { id: 'date', en: 'Music Day is on 21 June, the longest day.', sentence: 0, cues: [['musique'], ['vingt et un juin', 'juin', 'plus long']] },
          { id: 'origin', en: 'Created in 1982 for all musicians to play outdoors.', sentence: 1, cues: [['mille neuf cent quatre vingt deux', 'cree*'], ['musicien*', 'dehors', 'amateur*']] },
          { id: 'free', en: 'All concerts are free, every style.', sentence: 2, cues: [['gratuit*'], ['concert*', 'rock', 'jazz']] },
          { id: 'countries', en: 'It now exists in over 120 countries.', sentence: 3, cues: [['pays'], ['cent vingt']] },
        ],
        check: [
          { q: 'Why 21 June?', options: ['It is the longest day', 'It is a holiday', 'A musician was born then'], answer: 0, sentence: 0 },
          { q: 'Who can play?', options: ['Only professionals', 'Amateurs and professionals', 'Only children'], answer: 1, sentence: 1 },
          { q: 'In how many countries does it exist?', options: ['About 20', 'Over 120', 'Only France'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'La musique est-elle importante dans ta vie ? Pourquoi ?', en: 'Is music important in your life? Why?' },
        starters: ["Oui, j'écoute de la musique quand…", "Pour moi, la musique…", "Je joue du…"],
        modelRetell: "Le vingt et un juin, le jour le plus long, la France célèbre la Fête de la musique. Elle a été créée en mille neuf cent quatre-vingt-deux pour que tous les musiciens jouent dehors. Les concerts sont gratuits, et la fête existe dans plus de cent vingt pays.",
      },
      b2: {
        headline: 'Fête de la musique : une idée française devenue mondiale',
        sentences: [
          { fr: 'Ce vingt et un juin, impossible d\'échapper aux guitares, aux tambours et aux chorales qui envahissent les rues.', en: 'This twenty-first of June, there is no escaping the guitars, drums and choirs taking over the streets.' },
          { fr: 'Lancée en mille neuf cent quatre-vingt-deux, la Fête de la musique repose sur une idée simple : la musique doit sortir des salles de concert et appartenir à tous.', en: 'Launched in 1982, Music Day rests on a simple idea: music should leave the concert halls and belong to everyone.' },
          { fr: 'Le principe a été copié dans plus de cent vingt pays, de Tokyo à Buenos Aires.', en: 'The idea has been copied in more than a hundred and twenty countries, from Tokyo to Buenos Aires.' },
          { fr: 'Les jeunes musiciens y voient souvent leur première chance de jouer devant un vrai public.', en: 'Young musicians often see it as their first chance to play in front of a real audience.' },
        ],
        glossary: [
          { fr: 'échapper', en: 'to escape' }, { fr: 'chorales', en: 'choirs' }, { fr: 'envahissent', en: 'take over, invade' },
          { fr: 'lancée', en: 'launched' }, { fr: 'appartenir', en: 'to belong' }, { fr: 'public', en: 'audience' },
        ],
        facts: [
          { id: 'streets', en: 'On 21 June, music fills the streets.', sentence: 0, cues: [['juin', 'vingt et un'], ['rue*', 'guitare*', 'chorale*']] },
          { id: 'idea', en: 'Since 1982, music should leave concert halls and belong to all.', sentence: 1, cues: [['mille neuf cent quatre vingt deux', 'idee'], ['appartenir', 'tous', 'salle*']] },
          { id: 'world', en: 'Copied in over 120 countries.', sentence: 2, cues: [['pays'], ['cent vingt', 'copie*']] },
          { id: 'young', en: 'Young musicians get their first real audience.', sentence: 3, cues: [['jeune*', 'musicien*'], ['public', 'premiere chance']] },
        ],
        check: [
          { q: 'What is the simple idea behind it?', options: ['Music should belong to everyone', 'Concerts should be expensive', 'Only French music is played'], answer: 0, sentence: 1 },
          { q: 'Which cities are mentioned?', options: ['London and Rome', 'Tokyo and Buenos Aires', 'New York and Cairo'], answer: 1, sentence: 2 },
          { q: 'What does it mean for young musicians?', options: ['A first chance to play to a real audience', 'A record contract', 'A day off school'], answer: 0, sentence: 3 },
        ],
        opinion: { fr: 'La culture doit-elle être accessible à tous, gratuitement ? Justifie ta réponse.', en: 'Should culture be accessible to everyone, for free? Justify your answer.' },
        starters: ['Je suis convaincu que… car…', 'La gratuité a un coût…', "Des événements comme celui-ci prouvent que…"],
        modelRetell: "Le vingt et un juin, les guitares et les chorales envahissent les rues. Lancée en mille neuf cent quatre-vingt-deux, la Fête de la musique veut que la musique appartienne à tous. L'idée a été copiée dans plus de cent vingt pays, et les jeunes musiciens y trouvent leur premier public.",
      },
    },
  },
  {
    id: 'bastille-day', topicArea: 'festival', emoji: '🎆', pinDate: '07-14', reviewed: false,
    levels: {
      a2: {
        headline: "C'est le 14 juillet !",
        sentences: [
          { fr: "Aujourd'hui, c'est le quatorze juillet, la fête nationale française.", en: "Today is the fourteenth of July, France's national day." },
          { fr: 'Le soir, il y a des feux d\'artifice dans le ciel.', en: 'In the evening, there are fireworks in the sky.' },
          { fr: 'À Paris, on les regarde près de la tour Eiffel.', en: 'In Paris, people watch them near the Eiffel Tower.' },
          { fr: 'Dans les villages, on danse au bal des pompiers.', en: "In villages, people dance at the firefighters' ball." },
        ],
        glossary: [
          { fr: 'fête nationale', en: 'national day' }, { fr: "feux d'artifice", en: 'fireworks' }, { fr: 'ciel', en: 'sky' },
          { fr: 'bal', en: 'dance, ball' }, { fr: 'pompiers', en: 'firefighters' },
        ],
        facts: [
          { id: 'today', en: "Today is 14 July, France's national day.", sentence: 0, cues: [['quatorze juillet', 'juillet'], ['fete nationale', 'france*', 'aujourd hui']] },
          { id: 'fireworks', en: 'There are fireworks in the evening.', sentence: 1, cues: [['feux d artifice', 'feu*'], ['soir', 'ciel']] },
          { id: 'eiffel', en: 'In Paris you watch them near the Eiffel Tower.', sentence: 2, cues: [['tour eiffel', 'eiffel'], ['paris', 'regarde*']] },
          { id: 'ball', en: "In villages people dance at the firefighters' ball.", sentence: 3, cues: [['bal', 'danse*'], ['pompier*', 'village*']] },
        ],
        check: [
          { q: 'What is 14 July?', options: ['A school holiday only', "France's national day", "A king's birthday"], answer: 1, sentence: 0 },
          { q: 'Where do people in Paris watch the fireworks?', options: ['Near the Eiffel Tower', 'At the airport', 'On the beach'], answer: 0, sentence: 2 },
          { q: 'Who organises the dance in villages?', options: ['The teachers', 'The firefighters', 'The bakers'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Quelle est ta fête préférée ? Pourquoi ?', en: 'What is your favourite celebration? Why?' },
        starters: ["Ma fête préférée, c'est… parce que…", "J'aime… car…"],
        modelRetell: "Aujourd'hui, c'est le quatorze juillet, la fête nationale. Le soir, il y a des feux d'artifice. À Paris, on les regarde près de la tour Eiffel, et dans les villages, on danse au bal des pompiers.",
      },
      b1: {
        headline: 'Le 14 juillet, fête nationale',
        sentences: [
          { fr: 'Le quatorze juillet, la fête nationale rappelle la prise de la Bastille en mille sept cent quatre-vingt-neuf.', en: 'On the fourteenth of July, the national day recalls the storming of the Bastille in 1789.' },
          { fr: 'Ce jour-là est férié : la plupart des gens ne travaillent pas.', en: "It's a public holiday: most people don't work." },
          { fr: 'Le soir, presque chaque ville organise un feu d\'artifice, le plus célèbre étant celui de la tour Eiffel.', en: 'In the evening, almost every town puts on a fireworks display, the most famous being the one at the Eiffel Tower.' },
          { fr: 'Les bals des pompiers, où l\'on danse jusque tard dans la nuit, sont aussi une tradition très populaire.', en: "Firefighters' balls, where people dance late into the night, are also a very popular tradition." },
        ],
        glossary: [
          { fr: 'prise de la Bastille', en: 'storming of the Bastille' }, { fr: 'férié', en: 'public holiday' }, { fr: 'célèbre', en: 'famous' },
          { fr: 'bals des pompiers', en: "firefighters' balls" }, { fr: 'tard', en: 'late' },
        ],
        facts: [
          { id: 'bastille', en: 'The national day recalls the storming of the Bastille in 1789.', sentence: 0, cues: [['bastille'], ['mille sept cent quatre vingt neuf', 'fete nationale', 'juillet']] },
          { id: 'holiday', en: "It's a public holiday.", sentence: 1, cues: [['ferie', 'travaillent pas', 'vacances'], ['jour', 'gens']] },
          { id: 'fireworks', en: 'Fireworks everywhere, most famously at the Eiffel Tower.', sentence: 2, cues: [['feu* d artifice', 'feux'], ['tour eiffel', 'eiffel', 'ville']] },
          { id: 'ball', en: "Firefighters' balls go on late into the night.", sentence: 3, cues: [['bal*'], ['pompier*', 'danse', 'nuit']] },
        ],
        check: [
          { q: 'What historical event does it recall?', options: ['The end of a war', 'The storming of the Bastille', 'The first Tour de France'], answer: 1, sentence: 0 },
          { q: 'What is special about the day?', options: ['It is a public holiday', 'Shops are free', 'Schools have exams'], answer: 0, sentence: 1 },
          { q: 'What happens at the firefighters\' balls?', options: ['People dance late into the night', 'Firefighters give lessons', 'People watch films'], answer: 0, sentence: 3 },
        ],
        opinion: { fr: 'Est-il important de fêter l\'histoire de son pays ? Pourquoi ?', en: "Is it important to celebrate your country's history? Why?" },
        starters: ['Oui, parce que…', "Je pense que ça permet de…", 'Dans mon pays, on fête…'],
        modelRetell: "Le quatorze juillet, la fête nationale rappelle la prise de la Bastille en mille sept cent quatre-vingt-neuf. C'est un jour férié. Le soir, il y a des feux d'artifice partout, surtout à la tour Eiffel, et on danse aux bals des pompiers jusque tard dans la nuit.",
      },
      b2: {
        headline: 'Le 14 juillet, entre histoire et fête populaire',
        sentences: [
          { fr: 'Plus de deux siècles après la prise de la Bastille, le quatorze juillet reste le grand rendez-vous festif des Français.', en: 'More than two centuries after the storming of the Bastille, the fourteenth of July is still the big celebration in France.' },
          { fr: 'Si la date évoque la Révolution, elle célèbre surtout les valeurs de la République : liberté, égalité, fraternité.', en: 'While the date recalls the Revolution, it above all celebrates the values of the Republic: liberty, equality, fraternity.' },
          { fr: 'Le soir, des millions de spectateurs admirent les feux d\'artifice, dont celui de la tour Eiffel, retransmis dans le monde entier.', en: 'In the evening, millions of spectators admire the fireworks, including the one at the Eiffel Tower, broadcast all over the world.' },
          { fr: 'Dans les casernes, les traditionnels bals des pompiers permettent aussi de financer leurs œuvres sociales.', en: "In the fire stations, the traditional firefighters' balls also help fund their charities." },
        ],
        glossary: [
          { fr: 'siècles', en: 'centuries' }, { fr: 'rendez-vous festif', en: 'big celebration' }, { fr: 'évoque', en: 'recalls' },
          { fr: 'retransmis', en: 'broadcast' }, { fr: 'casernes', en: 'fire stations' }, { fr: 'œuvres sociales', en: 'charities, welfare funds' },
        ],
        facts: [
          { id: 'bastille', en: 'Over two centuries after the Bastille, 14 July is still the big celebration.', sentence: 0, cues: [['bastille', 'quatorze juillet'], ['siecle*', 'fete*', 'festif']] },
          { id: 'values', en: 'It celebrates liberty, equality, fraternity.', sentence: 1, cues: [['liberte', 'egalite', 'fraternite'], ['valeur*', 'republique']] },
          { id: 'fireworks', en: 'Millions watch fireworks; the Eiffel Tower show is broadcast worldwide.', sentence: 2, cues: [['feux', 'artifice'], ['eiffel', 'monde', 'million*']] },
          { id: 'balls', en: "Firefighters' balls help fund their charities.", sentence: 3, cues: [['pompier*', 'bal*'], ['financer', 'oeuvres', 'caserne*']] },
        ],
        check: [
          { q: 'What does the day mainly celebrate?', options: ['The values of the Republic', 'A football victory', 'The end of school'], answer: 0, sentence: 1 },
          { q: 'Which fireworks are broadcast worldwide?', options: ['Those in Marseille', 'Those at the Eiffel Tower', 'Those in Lyon'], answer: 1, sentence: 2 },
          { q: "What do firefighters' balls also do?", options: ['Train new firefighters', 'Help fund their charities', 'Choose a mayor'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Une fête nationale peut-elle rassembler tous les habitants d\'un pays ? Justifie ta réponse.', en: "Can a national day bring all of a country's people together? Justify your answer." },
        starters: ['Une telle fête rassemble… car…', "Néanmoins, certaines personnes…", 'Ce qui compte, ce sont les valeurs…'],
        modelRetell: "Plus de deux siècles après la prise de la Bastille, le quatorze juillet reste la grande fête des Français. Il célèbre les valeurs de la République : liberté, égalité, fraternité. Des millions de spectateurs admirent les feux d'artifice, comme celui de la tour Eiffel, et les bals des pompiers aident à financer leurs œuvres sociales.",
      },
    },
  },
];
