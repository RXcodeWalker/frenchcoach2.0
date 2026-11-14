/**
 * Daily News bank, editions 15–21. Hand-written (daily-news §1); `reviewed: false`
 * until a French speaker has checked every level (content-authoring §16).
 */
import type { NewsEdition } from '../types';

export const WEEK3: NewsEdition[] = [
  {
    id: 'street-art-village', topicArea: 'culture', emoji: '🎨', reviewed: false,
    levels: {
      a2: {
        headline: 'Un village plein de couleurs',
        sentences: [
          { fr: 'Dans un petit village du Sud, les murs sont pleins de couleurs.', en: 'In a little village in the South, the walls are full of colour.' },
          { fr: 'Des artistes ont peint trente grandes fresques.', en: 'Artists have painted thirty big murals.' },
          { fr: 'Les habitants ont choisi les dessins avec eux.', en: 'The villagers chose the pictures with them.' },
          { fr: 'Maintenant, beaucoup de touristes viennent visiter le village.', en: 'Now lots of tourists come to visit the village.' },
        ],
        glossary: [
          { fr: 'murs', en: 'walls' }, { fr: 'artistes', en: 'artists' }, { fr: 'peint', en: 'painted' }, { fr: 'fresques', en: 'murals' }, { fr: 'dessins', en: 'pictures, drawings' },
        ],
        facts: [
          { id: 'colours', en: "A southern village's walls are full of colour.", sentence: 0, cues: [['village'], ['mur*', 'couleur*']] },
          { id: 'murals', en: 'Artists painted thirty murals.', sentence: 1, cues: [['artiste*', 'peint*'], ['trente', 'fresque*']] },
          { id: 'chose', en: 'The villagers helped choose the pictures.', sentence: 2, cues: [['habitant*'], ['choisi*', 'dessin*']] },
          { id: 'tourists', en: 'Lots of tourists now visit.', sentence: 3, cues: [['touriste*'], ['visite*', 'vien*']] },
        ],
        check: [
          { q: 'How many murals are there?', options: ['Thirteen', 'Thirty', 'Three hundred'], answer: 1, sentence: 1 },
          { q: 'Who chose the pictures?', options: ['The mayor alone', 'The villagers with the artists', 'The tourists'], answer: 1, sentence: 2 },
          { q: 'What has changed?', options: ['Lots of tourists visit', 'The school has closed', 'The walls were cleaned'], answer: 0, sentence: 3 },
        ],
        opinion: { fr: "Tu aimes l'art dans la rue ? Pourquoi ?", en: 'Do you like street art? Why?' },
        starters: ["Oui, j'aime parce que…", 'Non, je préfère… parce que…'],
        modelRetell: 'Dans un village du Sud, les murs sont pleins de couleurs. Des artistes ont peint trente fresques, et les habitants ont choisi les dessins. Maintenant, beaucoup de touristes viennent visiter.',
      },
      b1: {
        headline: 'Le street art redonne vie à un village',
        sentences: [
          { fr: 'Il y a cinq ans, ce village de Provence perdait ses habitants et ses commerces.', en: 'Five years ago, this Provence village was losing its inhabitants and its shops.' },
          { fr: 'Le maire a alors invité des artistes de rue à peindre les façades des maisons vides.', en: 'The mayor then invited street artists to paint the fronts of the empty houses.' },
          { fr: 'Aujourd\'hui, trente fresques géantes racontent l\'histoire du village et de ses habitants.', en: 'Today, thirty giant murals tell the story of the village and its people.' },
          { fr: 'Le village accueille désormais des milliers de visiteurs, et deux nouveaux cafés ont ouvert.', en: 'The village now welcomes thousands of visitors, and two new cafés have opened.' },
        ],
        glossary: [
          { fr: 'commerces', en: 'shops' }, { fr: 'maire', en: 'mayor' }, { fr: 'artistes de rue', en: 'street artists' },
          { fr: 'façades', en: 'house fronts' }, { fr: 'racontent', en: 'tell' },
        ],
        facts: [
          { id: 'decline', en: 'The village was losing people and shops.', sentence: 0, cues: [['village'], ['perdait', 'commerce*', 'habitant*']] },
          { id: 'invited', en: 'The mayor invited street artists to paint empty houses.', sentence: 1, cues: [['maire'], ['artiste*', 'peindre']] },
          { id: 'murals', en: 'Thirty murals tell the village story.', sentence: 2, cues: [['fresque*'], ['trente', 'histoire']] },
          { id: 'visitors', en: 'Thousands of visitors come and two cafés have opened.', sentence: 3, cues: [['visiteur*', 'touriste*'], ['milliers', 'cafe*']] },
        ],
        check: [
          { q: 'What was happening five years ago?', options: ['The village was losing people and shops', 'A festival started', 'A new school opened'], answer: 0, sentence: 0 },
          { q: 'What did the artists paint?', options: ['The church', 'The fronts of empty houses', 'The roads'], answer: 1, sentence: 1 },
          { q: 'What has opened recently?', options: ['Two new cafés', 'A museum', 'A hotel'], answer: 0, sentence: 3 },
        ],
        opinion: { fr: "L'art peut-il vraiment sauver un village ? Pourquoi ?", en: 'Can art really save a village? Why?' },
        starters: ['Je pense que oui, car…', "Ça aide, mais il faut aussi…", "Dans ma ville, on pourrait…"],
        modelRetell: "Ce village de Provence perdait ses habitants et ses commerces. Le maire a invité des artistes de rue à peindre les maisons vides. Aujourd'hui, trente fresques racontent l'histoire du village. Des milliers de visiteurs viennent, et deux cafés ont ouvert.",
      },
      b2: {
        headline: 'Quand les fresques font revivre la Provence',
        sentences: [
          { fr: 'Volets fermés, boulangerie disparue : il y a cinq ans, ce village provençal semblait condamné à se vider.', en: 'Shutters closed, bakery gone: five years ago, this Provençal village seemed doomed to empty out.' },
          { fr: 'Le pari du maire a été d\'inviter des artistes de rue à transformer les façades abandonnées en œuvres d\'art.', en: 'The mayor\'s gamble was to invite street artists to transform the abandoned house fronts into works of art.' },
          { fr: 'Chaque fresque a été imaginée avec les habitants, qui ont confié leurs souvenirs et leurs photos de famille.', en: 'Each mural was designed with the villagers, who shared their memories and family photos.' },
          { fr: 'Le succès touristique est réel, mais certains craignent que le village ne devienne un simple décor pour les réseaux sociaux.', en: 'The tourist success is real, but some fear the village will become a mere backdrop for social media.' },
        ],
        glossary: [
          { fr: 'volets', en: 'shutters' }, { fr: 'condamné', en: 'doomed' }, { fr: 'pari', en: 'gamble' },
          { fr: 'œuvres', en: 'works' }, { fr: 'confié', en: 'shared, entrusted' }, { fr: 'décor', en: 'backdrop, set' },
        ],
        facts: [
          { id: 'emptying', en: 'Five years ago the village was emptying.', sentence: 0, cues: [['village'], ['vider', 'disparue', 'ferme*', 'cinq ans']] },
          { id: 'mayor', en: 'The mayor invited street artists to transform the house fronts.', sentence: 1, cues: [['maire'], ['artiste*', 'facade*']] },
          { id: 'memories', en: 'Murals were designed with villagers\' memories and photos.', sentence: 2, cues: [['fresque*', 'habitant*'], ['souvenir*', 'photo*']] },
          { id: 'fear', en: 'Some fear it will become a backdrop for social media.', sentence: 3, cues: [['reseaux sociaux', 'decor'], ['craign*', 'peur', 'touristique']] },
        ],
        check: [
          { q: 'What had disappeared from the village?', options: ['The bakery', 'The school', 'The church'], answer: 0, sentence: 0 },
          { q: 'How were the murals designed?', options: ['From famous paintings', "With the villagers' memories and photos", 'By a computer'], answer: 1, sentence: 2 },
          { q: 'What do some people fear?', options: ['The paint will fade', 'The village becoming a social-media backdrop', 'Artists leaving'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Le tourisme est-il une chance ou un danger pour les petits villages ? Justifie ta réponse.', en: 'Is tourism an opportunity or a danger for small villages? Justify your answer.' },
        starters: ['Le tourisme apporte… mais…', 'Je suis partagé, car…', "Il faudrait veiller à ce que…"],
        modelRetell: "Il y a cinq ans, ce village provençal se vidait. Le maire a invité des artistes de rue à transformer les façades. Chaque fresque a été imaginée avec les souvenirs et les photos des habitants. Le succès touristique est réel, mais certains craignent que le village devienne un décor pour les réseaux sociaux.",
      },
    },
  },
  {
    id: 'river-clean-up', topicArea: 'environment', emoji: '🏞️', reviewed: false,
    levels: {
      a2: {
        headline: 'Des élèves nettoient la rivière',
        sentences: [
          { fr: 'Samedi, cent élèves ont nettoyé une rivière près de Lille.', en: 'On Saturday, a hundred pupils cleaned a river near Lille.' },
          { fr: 'Ils ont trouvé beaucoup de bouteilles en plastique.', en: 'They found lots of plastic bottles.' },
          { fr: 'Ils ont aussi trouvé un vieux vélo et une chaise !', en: 'They also found an old bike and a chair!' },
          { fr: 'Au total, ils ont ramassé trois cents kilos de déchets.', en: 'In total, they picked up three hundred kilos of rubbish.' },
        ],
        glossary: [
          { fr: 'nettoyé', en: 'cleaned' }, { fr: 'rivière', en: 'river' }, { fr: 'bouteilles', en: 'bottles' },
          { fr: 'ramassé', en: 'picked up' }, { fr: 'déchets', en: 'rubbish' },
        ],
        facts: [
          { id: 'cleaned', en: 'A hundred pupils cleaned a river near Lille.', sentence: 0, cues: [['riviere'], ['nettoy*', 'eleve*', 'lille']] },
          { id: 'bottles', en: 'They found lots of plastic bottles.', sentence: 1, cues: [['bouteille*'], ['plastique']] },
          { id: 'bike', en: 'They found an old bike and a chair.', sentence: 2, cues: [['velo', 'chaise'], ['vieux', 'trouve*']] },
          { id: 'weight', en: '300 kilos of rubbish in total.', sentence: 3, cues: [['trois cents', 'kilo*'], ['dechet*', 'total']] },
        ],
        check: [
          { q: 'How many pupils took part?', options: ['Ten', 'A hundred', 'A thousand'], answer: 1, sentence: 0 },
          { q: 'Which surprising objects did they find?', options: ['A phone and a hat', 'An old bike and a chair', 'A boat and a TV'], answer: 1, sentence: 2 },
          { q: 'How much rubbish did they collect?', options: ['30 kilos', '300 kilos', '3,000 kilos'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Qu\'est-ce que tu fais pour la planète ? Pourquoi ?', en: 'What do you do for the planet? Why?' },
        starters: ['Moi, je… parce que…', "J'essaie de… car…"],
        modelRetell: 'Cent élèves ont nettoyé une rivière près de Lille. Ils ont trouvé des bouteilles en plastique, un vieux vélo et une chaise. Au total, ils ont ramassé trois cents kilos de déchets.',
      },
      b1: {
        headline: 'Trois cents kilos de déchets sortis de la rivière',
        sentences: [
          { fr: 'Une centaine de collégiens ont passé leur samedi matin à nettoyer les bords d\'une rivière près de Lille.', en: 'About a hundred secondary pupils spent their Saturday morning cleaning the banks of a river near Lille.' },
          { fr: 'Équipés de gants et de sacs, ils ont ramassé trois cents kilos de déchets.', en: 'Equipped with gloves and bags, they picked up three hundred kilos of rubbish.' },
          { fr: 'La plupart étaient des emballages en plastique, mais il y avait aussi un vélo et un caddie de supermarché.', en: 'Most of it was plastic packaging, but there was also a bike and a supermarket trolley.' },
          { fr: 'Les déchets seront triés et recyclés, et l\'opération sera renouvelée au printemps.', en: 'The rubbish will be sorted and recycled, and the operation will be repeated in the spring.' },
        ],
        glossary: [
          { fr: 'bords', en: 'banks' }, { fr: 'gants', en: 'gloves' }, { fr: 'emballages', en: 'packaging' },
          { fr: 'caddie', en: 'shopping trolley' }, { fr: 'triés', en: 'sorted' }, { fr: 'renouvelée', en: 'repeated' },
        ],
        facts: [
          { id: 'cleaned', en: 'About 100 pupils cleaned a river near Lille.', sentence: 0, cues: [['riviere'], ['nettoy*', 'collegien*', 'eleve*']] },
          { id: 'weight', en: 'They collected 300 kilos of rubbish.', sentence: 1, cues: [['trois cents', 'kilo*'], ['dechet*', 'ramasse*']] },
          { id: 'plastic', en: 'Mostly plastic, but also a bike and a trolley.', sentence: 2, cues: [['plastique', 'emballage*'], ['velo', 'caddie']] },
          { id: 'recycled', en: 'It will be recycled and they will do it again in spring.', sentence: 3, cues: [['recycl*', 'trie*'], ['printemps', 'renouvel*']] },
        ],
        check: [
          { q: 'What equipment did they use?', options: ['Gloves and bags', 'Boats and nets', 'Spades'], answer: 0, sentence: 1 },
          { q: 'What was most of the rubbish?', options: ['Glass', 'Plastic packaging', 'Paper'], answer: 1, sentence: 2 },
          { q: 'When will they do it again?', options: ['Next month', 'In the spring', 'Next year'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Les écoles devraient-elles organiser plus d\'actions pour l\'environnement ? Pourquoi ?', en: 'Should schools organise more actions for the environment? Why?' },
        starters: ['Oui, parce que…', "À mon avis, c'est le rôle de…", 'On apprend mieux quand…'],
        modelRetell: "Une centaine de collégiens ont nettoyé les bords d'une rivière près de Lille. Ils ont ramassé trois cents kilos de déchets, surtout des emballages en plastique, mais aussi un vélo et un caddie. Les déchets seront recyclés, et ils recommenceront au printemps.",
      },
      b2: {
        headline: 'Une rivière, trois cents kilos de déchets',
        sentences: [
          { fr: 'Bouteilles, emballages, et même un caddie rouillé : en une matinée, une centaine de collégiens lillois ont sorti trois cents kilos de déchets d\'une rivière.', en: 'Bottles, packaging and even a rusty trolley: in one morning, about a hundred pupils from Lille pulled three hundred kilos of rubbish out of a river.' },
          { fr: 'Pour leurs professeurs, l\'objectif n\'était pas seulement de nettoyer, mais de faire prendre conscience de l\'ampleur du problème.', en: 'For their teachers, the aim was not only to clean but to make them realise how big the problem is.' },
          { fr: 'En classe, les élèves analyseront ensuite les déchets pour comprendre d\'où ils viennent.', en: 'In class, the pupils will then analyse the rubbish to understand where it comes from.' },
          { fr: 'Leurs conclusions seront présentées à la mairie, avec des propositions concrètes, comme l\'installation de nouvelles poubelles.', en: 'Their conclusions will be presented to the town hall, with concrete proposals such as installing new bins.' },
        ],
        glossary: [
          { fr: 'rouillé', en: 'rusty' }, { fr: 'lillois', en: 'from Lille' }, { fr: 'prendre conscience', en: 'to realise' },
          { fr: 'ampleur', en: 'scale, size' }, { fr: 'propositions concrètes', en: 'concrete proposals' }, { fr: 'poubelles', en: 'bins' },
        ],
        facts: [
          { id: 'weight', en: 'About 100 Lille pupils pulled 300 kilos of rubbish from a river.', sentence: 0, cues: [['riviere'], ['trois cents', 'dechet*']] },
          { id: 'aim', en: 'The aim was to make them aware of the scale of the problem.', sentence: 1, cues: [['conscience', 'probleme'], ['ampleur', 'objectif', 'nettoyer']] },
          { id: 'analyse', en: 'In class they will analyse where the rubbish comes from.', sentence: 2, cues: [['analys*', 'comprendre'], ['dechet*', 'viennent', 'classe']] },
          { id: 'proposals', en: 'They will present proposals, like new bins, to the town hall.', sentence: 3, cues: [['mairie'], ['poubelle*', 'proposition*']] },
        ],
        check: [
          { q: 'What was the teachers\' main aim?', options: ['To win a prize', 'To show how big the problem is', 'To get the pupils outdoors'], answer: 1, sentence: 1 },
          { q: 'What will pupils do in class?', options: ['Analyse where the rubbish comes from', 'Write poems', 'Make art from the rubbish'], answer: 0, sentence: 2 },
          { q: 'What will they propose to the town hall?', options: ['A swimming ban', 'New bins', 'Fines for parents'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Qui est le plus responsable de la pollution : les individus ou les entreprises ? Justifie ta réponse.', en: 'Who is most responsible for pollution: individuals or companies? Justify your answer.' },
        starters: ['Je considère que… parce que…', 'Les deux ont un rôle, mais…', "Sans changer nos habitudes…"],
        modelRetell: "En une matinée, une centaine de collégiens lillois ont sorti trois cents kilos de déchets d'une rivière. L'objectif était de faire prendre conscience de l'ampleur du problème. En classe, ils analyseront d'où viennent les déchets, puis ils présenteront à la mairie des propositions, comme de nouvelles poubelles.",
      },
    },
  },
  {
    id: 'reading-dogs', topicArea: 'animals', emoji: '🐕', reviewed: false,
    levels: {
      a2: {
        headline: 'Des chiens écoutent les enfants lire',
        sentences: [
          { fr: 'Dans une bibliothèque de Nantes, des chiens aident les enfants à lire.', en: 'In a library in Nantes, dogs help children to read.' },
          { fr: 'Les enfants lisent une histoire à voix haute pour le chien.', en: 'The children read a story aloud to the dog.' },
          { fr: 'Le chien écoute et il ne se moque jamais !', en: 'The dog listens and never makes fun!' },
          { fr: 'Les enfants sont plus calmes et ils lisent mieux.', en: 'The children are calmer and they read better.' },
        ],
        glossary: [
          { fr: 'chiens', en: 'dogs' }, { fr: 'à voix haute', en: 'aloud' }, { fr: 'écoute', en: 'listens' },
          { fr: 'se moque', en: 'makes fun' }, { fr: 'calmes', en: 'calm' },
        ],
        facts: [
          { id: 'dogs', en: 'Dogs help children read in a Nantes library.', sentence: 0, cues: [['chien*'], ['lire', 'bibliotheque']] },
          { id: 'aloud', en: 'Children read a story aloud to the dog.', sentence: 1, cues: [['histoire', 'voix haute'], ['lise*', 'lire']] },
          { id: 'no-judging', en: 'The dog listens and never makes fun.', sentence: 2, cues: [['ecoute*'], ['moque*', 'jamais']] },
          { id: 'better', en: 'The children are calmer and read better.', sentence: 3, cues: [['calme*', 'mieux'], ['enfant*', 'lise*']] },
        ],
        check: [
          { q: 'Where does this happen?', options: ['In a library in Nantes', 'In a vet\'s surgery', 'In a park'], answer: 0, sentence: 0 },
          { q: 'What do the children do?', options: ['Walk the dog', 'Read a story aloud to the dog', 'Draw the dog'], answer: 1, sentence: 1 },
          { q: 'What is the result?', options: ['The children are calmer and read better', 'The dogs learn tricks', 'The library is noisier'], answer: 0, sentence: 3 },
        ],
        opinion: { fr: 'Tu préfères les chiens ou les chats ? Pourquoi ?', en: 'Do you prefer dogs or cats? Why?' },
        starters: ['Je préfère les… parce que…', 'Les chiens sont…'],
        modelRetell: "Dans une bibliothèque de Nantes, des chiens aident les enfants à lire. Les enfants lisent une histoire à voix haute pour le chien. Le chien écoute et ne se moque jamais, alors les enfants sont plus calmes et lisent mieux.",
      },
      b1: {
        headline: 'Des chiens lecteurs pour prendre confiance',
        sentences: [
          { fr: 'Chaque mercredi, une bibliothèque de Nantes accueille trois chiens un peu particuliers.', en: 'Every Wednesday, a library in Nantes welcomes three rather special dogs.' },
          { fr: 'Les enfants qui ont du mal à lire viennent leur raconter une histoire pendant vingt minutes.', en: 'Children who find reading hard come and tell them a story for twenty minutes.' },
          { fr: 'Comme le chien ne corrige pas et ne juge pas, les enfants osent lire sans avoir peur de se tromper.', en: "Since the dog doesn't correct or judge, the children dare to read without being afraid of making mistakes." },
          { fr: 'Selon les bibliothécaires, beaucoup d\'entre eux empruntent ensuite plus de livres.', en: 'According to the librarians, many of them then borrow more books.' },
        ],
        glossary: [
          { fr: 'particuliers', en: 'special' }, { fr: 'ont du mal à', en: 'find it hard to' }, { fr: 'juge', en: 'judges' },
          { fr: 'osent', en: 'dare' }, { fr: 'se tromper', en: 'to make a mistake' },
        ],
        facts: [
          { id: 'wednesday', en: 'Three special dogs come to a Nantes library every Wednesday.', sentence: 0, cues: [['chien*'], ['mercredi', 'bibliotheque', 'trois']] },
          { id: 'twenty', en: 'Struggling readers read to them for 20 minutes.', sentence: 1, cues: [['histoire', 'lire', 'raconter'], ['vingt minutes', 'mal']] },
          { id: 'no-fear', en: 'The dog does not judge, so children are not afraid of mistakes.', sentence: 2, cues: [['juge*', 'corrige*', 'peur'], ['tromper', 'osent', 'chien*']] },
          { id: 'borrow', en: 'Many then borrow more books.', sentence: 3, cues: [['emprunte*'], ['livre*', 'plus']] },
        ],
        check: [
          { q: 'Which children come?', options: ['Children who find reading hard', 'The best readers', 'Children who have a dog'], answer: 0, sentence: 1 },
          { q: 'Why are the children less afraid?', options: ['Their parents help them', "The dog doesn't correct or judge", 'They read in English'], answer: 1, sentence: 2 },
          { q: 'What do many children do afterwards?', options: ['Buy a dog', 'Borrow more books', 'Stop coming'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Les animaux devraient-ils être présents à l\'école ? Pourquoi ?', en: 'Should animals be present at school? Why?' },
        starters: ['Oui, je pense que…', 'Non, car certains élèves…', 'Ça pourrait aider à…'],
        modelRetell: "Chaque mercredi, trois chiens viennent dans une bibliothèque de Nantes. Les enfants qui ont du mal à lire leur racontent une histoire pendant vingt minutes. Le chien ne juge pas, donc ils n'ont pas peur de se tromper. Ensuite, beaucoup empruntent plus de livres.",
      },
      b2: {
        headline: 'Lire à un chien pour vaincre sa peur',
        sentences: [
          { fr: 'Venue des États-Unis, la méthode des « chiens lecteurs » séduit de plus en plus de bibliothèques françaises, dont celle de Nantes.', en: 'Coming from the United States, the "reading dogs" method is winning over more and more French libraries, including the one in Nantes.' },
          { fr: 'Le principe est simple : un enfant en difficulté lit à voix haute à un chien calme, en présence de son maître.', en: 'The idea is simple: a struggling child reads aloud to a calm dog, with its owner present.' },
          { fr: 'L\'animal ne corrige rien, ce qui réduit l\'anxiété et donne envie de recommencer.', en: 'The animal corrects nothing, which reduces anxiety and makes children want to do it again.' },
          { fr: 'Des chercheurs restent prudents, mais les premiers résultats montrent une nette amélioration de la fluidité de lecture.', en: 'Researchers remain cautious, but early results show a clear improvement in reading fluency.' },
        ],
        glossary: [
          { fr: 'séduit', en: 'is winning over' }, { fr: 'en difficulté', en: 'struggling' }, { fr: 'maître', en: 'owner (of a dog)' },
          { fr: 'anxiété', en: 'anxiety' }, { fr: 'prudents', en: 'cautious' }, { fr: 'fluidité', en: 'fluency' },
        ],
        facts: [
          { id: 'method', en: 'The US "reading dogs" method is spreading in French libraries.', sentence: 0, cues: [['chien*'], ['bibliotheque*', 'methode', 'etats unis']] },
          { id: 'principle', en: 'A struggling child reads aloud to a calm dog.', sentence: 1, cues: [['enfant*'], ['voix haute', 'lit', 'lire']] },
          { id: 'anxiety', en: 'The dog corrects nothing, which reduces anxiety.', sentence: 2, cues: [['anxiete', 'peur', 'stress'], ['corrige*', 'reduit', 'animal']] },
          { id: 'results', en: 'Early results show better reading fluency.', sentence: 3, cues: [['resultat*', 'chercheur*'], ['fluidite', 'amelioration', 'mieux']] },
        ],
        check: [
          { q: 'Where does the method come from?', options: ['The United Kingdom', 'The United States', 'Japan'], answer: 1, sentence: 0 },
          { q: 'Who is present with the dog?', options: ['A teacher', 'Its owner', 'A vet'], answer: 1, sentence: 1 },
          { q: 'What do the first results show?', options: ['No change', 'Clearly better reading fluency', 'Children prefer cats'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Faut-il des preuves scientifiques avant d\'adopter une nouvelle méthode à l\'école ? Justifie ta réponse.', en: 'Do we need scientific proof before adopting a new method at school? Justify your answer.' },
        starters: ['Il est préférable de… car…', "Attendre des preuves, c'est…", 'Si la méthode ne fait de mal à personne…'],
        modelRetell: "La méthode des chiens lecteurs, venue des États-Unis, séduit des bibliothèques françaises comme celle de Nantes. Un enfant en difficulté lit à voix haute à un chien calme. Le chien ne corrige rien, ce qui réduit l'anxiété. Les chercheurs restent prudents, mais les premiers résultats montrent une amélioration de la fluidité.",
      },
    },
  },
  {
    id: 'school-garden', topicArea: 'food', emoji: '🥕', reviewed: false,
    levels: {
      a2: {
        headline: 'Un potager pour la cantine',
        sentences: [
          { fr: 'Une école de Rennes a un grand potager.', en: 'A school in Rennes has a big vegetable garden.' },
          { fr: 'Les élèves plantent des carottes, des tomates et des salades.', en: 'The pupils plant carrots, tomatoes and lettuces.' },
          { fr: 'Le cuisinier utilise ces légumes à la cantine.', en: 'The cook uses these vegetables in the canteen.' },
          { fr: 'Les enfants disent que les légumes sont meilleurs !', en: 'The children say the vegetables taste better!' },
        ],
        glossary: [
          { fr: 'potager', en: 'vegetable garden' }, { fr: 'plantent', en: 'plant' }, { fr: 'cuisinier', en: 'cook' },
          { fr: 'légumes', en: 'vegetables' }, { fr: 'cantine', en: 'canteen' },
        ],
        facts: [
          { id: 'garden', en: 'A school in Rennes has a vegetable garden.', sentence: 0, cues: [['potager', 'jardin'], ['ecole', 'rennes']] },
          { id: 'plant', en: 'Pupils plant carrots, tomatoes and lettuces.', sentence: 1, cues: [['plante*'], ['carotte*', 'tomate*', 'salade*']] },
          { id: 'canteen', en: 'The cook uses the vegetables in the canteen.', sentence: 2, cues: [['cantine', 'cuisinier'], ['legume*']] },
          { id: 'better', en: 'The children say they taste better.', sentence: 3, cues: [['meilleur*', 'bon*'], ['legume*', 'enfant*']] },
        ],
        check: [
          { q: 'What do the pupils plant?', options: ['Flowers', 'Carrots, tomatoes and lettuces', 'Trees'], answer: 1, sentence: 1 },
          { q: 'Who uses the vegetables?', options: ['The parents', 'The cook in the canteen', 'A shop'], answer: 1, sentence: 2 },
          { q: 'What do the children say?', options: ['The vegetables taste better', 'They don\'t like vegetables', 'Gardening is boring'], answer: 0, sentence: 3 },
        ],
        opinion: { fr: 'Tu aimes manger à la cantine ? Pourquoi ?', en: 'Do you like eating in the canteen? Why?' },
        starters: ["Oui, j'aime parce que…", "Non, je n'aime pas parce que…"],
        modelRetell: "Une école de Rennes a un grand potager. Les élèves plantent des carottes et des tomates, et le cuisinier utilise les légumes à la cantine. Les enfants disent que les légumes sont meilleurs.",
      },
      b1: {
        headline: 'Du jardin à l\'assiette',
        sentences: [
          { fr: 'Dans une école primaire de Rennes, la cour de récréation cache un potager de cinq cents mètres carrés.', en: 'In a primary school in Rennes, the playground hides a five-hundred-square-metre vegetable garden.' },
          { fr: 'Chaque classe s\'occupe d\'une partie : elle plante, arrose et récolte ses propres légumes.', en: 'Each class looks after one part: it plants, waters and harvests its own vegetables.' },
          { fr: 'Les récoltes sont ensuite cuisinées à la cantine, ce qui réduit les achats.', en: 'The crops are then cooked in the canteen, which reduces purchases.' },
          { fr: 'Depuis le début du projet, les enfants gaspillent beaucoup moins de nourriture.', en: 'Since the project began, the children waste much less food.' },
        ],
        glossary: [
          { fr: 'cour de récréation', en: 'playground' }, { fr: 'mètres carrés', en: 'square metres' }, { fr: 'arrose', en: 'waters' },
          { fr: 'récolte', en: 'harvests' }, { fr: 'gaspillent', en: 'waste' },
        ],
        facts: [
          { id: 'garden', en: 'A Rennes school has a 500 m² vegetable garden.', sentence: 0, cues: [['potager', 'jardin'], ['cinq cents', 'ecole', 'rennes']] },
          { id: 'classes', en: 'Each class plants, waters and harvests its own part.', sentence: 1, cues: [['classe*'], ['plante*', 'arrose*', 'recolte*']] },
          { id: 'canteen', en: 'The crops are cooked in the canteen.', sentence: 2, cues: [['cantine'], ['recolte*', 'cuisine*', 'legume*']] },
          { id: 'waste', en: 'Children waste much less food.', sentence: 3, cues: [['gaspill*'], ['moins', 'nourriture']] },
        ],
        check: [
          { q: 'How big is the garden?', options: ['50 m²', '500 m²', '5,000 m²'], answer: 1, sentence: 0 },
          { q: 'What does each class do?', options: ['Looks after its own part', 'Visits once a year', 'Sells the vegetables'], answer: 0, sentence: 1 },
          { q: 'What has changed since the project began?', options: ['The children waste less food', 'Lunch is more expensive', 'The canteen has closed'], answer: 0, sentence: 3 },
        ],
        opinion: { fr: 'Est-ce que toutes les écoles devraient avoir un potager ? Pourquoi ?', en: 'Should every school have a vegetable garden? Why?' },
        starters: ['Oui, parce que les élèves…', "Ce serait difficile en ville car…", 'On apprendrait à…'],
        modelRetell: "Une école primaire de Rennes a un potager de cinq cents mètres carrés. Chaque classe plante, arrose et récolte ses légumes. Les récoltes sont cuisinées à la cantine, et depuis, les enfants gaspillent moins de nourriture.",
      },
      b2: {
        headline: 'Le potager scolaire qui change la cantine',
        sentences: [
          { fr: 'Remplacer une partie du béton de la cour par un potager : le pari d\'une école rennaise semblait audacieux.', en: "Replacing part of the playground's concrete with a vegetable garden: a Rennes school's gamble seemed bold." },
          { fr: 'Trois ans plus tard, les cinq cents mètres carrés cultivés par les élèves fournissent une partie des légumes servis à la cantine.', en: 'Three years later, the five hundred square metres farmed by the pupils provide some of the vegetables served in the canteen.' },
          { fr: 'Les enseignants s\'en servent aussi pour aborder les sciences, les mathématiques et même l\'écriture.', en: 'Teachers also use it to tackle science, maths and even writing.' },
          { fr: 'Surtout, le gaspillage alimentaire a chuté : les enfants goûtent plus volontiers ce qu\'ils ont eux-mêmes fait pousser.', en: 'Above all, food waste has dropped: children are more willing to taste what they have grown themselves.' },
        ],
        glossary: [
          { fr: 'béton', en: 'concrete' }, { fr: 'audacieux', en: 'bold' }, { fr: 'fournissent', en: 'provide' },
          { fr: 'aborder', en: 'to tackle' }, { fr: 'a chuté', en: 'has dropped' }, { fr: 'fait pousser', en: 'grown (made to grow)' },
        ],
        facts: [
          { id: 'concrete', en: 'A Rennes school swapped playground concrete for a garden.', sentence: 0, cues: [['potager', 'jardin'], ['beton', 'cour', 'ecole']] },
          { id: 'canteen', en: 'The 500 m² garden supplies vegetables to the canteen.', sentence: 1, cues: [['cantine'], ['legume*', 'cinq cents']] },
          { id: 'lessons', en: 'Teachers use it for science, maths and writing.', sentence: 2, cues: [['science*', 'mathematiques', 'ecriture'], ['enseignant*', 'aborder', 'servent']] },
          { id: 'waste', en: 'Food waste dropped because children taste what they grew.', sentence: 3, cues: [['gaspillage'], ['chute', 'goute*', 'pousser']] },
        ],
        check: [
          { q: 'What was replaced by the garden?', options: ['A car park', 'Part of the playground concrete', 'A sports hall'], answer: 1, sentence: 0 },
          { q: 'Which subjects do teachers use it for?', options: ['Only science', 'Science, maths and writing', 'Music and art'], answer: 1, sentence: 2 },
          { q: 'Why has food waste dropped?', options: ['Smaller portions', 'Children taste what they grew', 'A new cook'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: "L'école doit-elle apprendre aux élèves à bien manger ? Justifie ta réponse.", en: 'Should school teach pupils how to eat well? Justify your answer.' },
        starters: ["C'est avant tout le rôle de… parce que…", "L'école a sa part de responsabilité, car…", 'Ce projet prouve que…'],
        modelRetell: "Une école rennaise a remplacé une partie du béton de la cour par un potager. Ses cinq cents mètres carrés fournissent des légumes à la cantine. Les enseignants s'en servent pour les sciences, les mathématiques et l'écriture. Le gaspillage a chuté, car les enfants goûtent ce qu'ils ont fait pousser.",
      },
    },
  },
  {
    id: 'electric-bikes', topicArea: 'travel', emoji: '🚲', reviewed: false,
    levels: {
      a2: {
        headline: 'Des vélos électriques pour tous',
        sentences: [
          { fr: 'Une petite ville des Alpes prête des vélos électriques.', en: 'A small town in the Alps lends electric bikes.' },
          { fr: 'On peut garder le vélo pendant un mois.', en: 'You can keep the bike for a month.' },
          { fr: 'Ça coûte seulement dix euros.', en: 'It costs only ten euros.' },
          { fr: 'Avec ces vélos, monter les rues est beaucoup plus facile.', en: 'With these bikes, going up the streets is much easier.' },
        ],
        glossary: [
          { fr: 'prête', en: 'lends' }, { fr: 'vélos électriques', en: 'electric bikes' }, { fr: 'garder', en: 'to keep' },
          { fr: 'coûte', en: 'costs' }, { fr: 'monter', en: 'to go up' },
        ],
        facts: [
          { id: 'lends', en: 'An Alpine town lends electric bikes.', sentence: 0, cues: [['velo*'], ['electrique*', 'prete*', 'alpes']] },
          { id: 'month', en: 'You can keep one for a month.', sentence: 1, cues: [['mois'], ['garder', 'velo*']] },
          { id: 'price', en: 'It only costs ten euros.', sentence: 2, cues: [['dix'], ['euro*', 'coute*']] },
          { id: 'easier', en: 'Going uphill is much easier.', sentence: 3, cues: [['facile*'], ['monter', 'rue*']] },
        ],
        check: [
          { q: 'Where is the town?', options: ['In the Alps', 'By the sea', 'Near Paris'], answer: 0, sentence: 0 },
          { q: 'How long can you keep a bike?', options: ['A day', 'A week', 'A month'], answer: 2, sentence: 1 },
          { q: 'How much does it cost?', options: ['Ten euros', 'Twenty euros', 'It is free'], answer: 0, sentence: 2 },
        ],
        opinion: { fr: 'Tu vas à l\'école à vélo, à pied ou en voiture ? Pourquoi ?', en: 'Do you go to school by bike, on foot or by car? Why?' },
        starters: ['Je vais à l\'école… parce que…', "J'aimerais aller… car…"],
        modelRetell: "Une petite ville des Alpes prête des vélos électriques. On peut garder le vélo un mois, et ça coûte seulement dix euros. Avec ces vélos, monter les rues est plus facile.",
      },
      b1: {
        headline: 'Une ville de montagne mise sur le vélo électrique',
        sentences: [
          { fr: 'Dans une ville des Alpes, la mairie loue des vélos électriques aux habitants pour dix euros par mois.', en: 'In a town in the Alps, the town hall rents electric bikes to residents for ten euros a month.' },
          { fr: 'L\'idée est de les essayer avant d\'en acheter un, car ils coûtent cher.', en: 'The idea is to try them before buying one, because they are expensive.' },
          { fr: 'Grâce au moteur, les pentes ne font plus peur, même aux personnes âgées.', en: 'Thanks to the motor, the slopes are no longer scary, even for elderly people.' },
          { fr: 'En un an, le nombre de voitures dans le centre a baissé de quinze pour cent.', en: 'In one year, the number of cars in the centre has fallen by fifteen per cent.' },
        ],
        glossary: [
          { fr: 'loue', en: 'rents' }, { fr: 'coûtent cher', en: 'are expensive' }, { fr: 'moteur', en: 'motor' },
          { fr: 'pentes', en: 'slopes' }, { fr: 'a baissé', en: 'has fallen' },
        ],
        facts: [
          { id: 'rent', en: 'The town hall rents e-bikes for ten euros a month.', sentence: 0, cues: [['velo*'], ['dix euros', 'loue*', 'mois']] },
          { id: 'try', en: 'People try them before buying, because they are expensive.', sentence: 1, cues: [['essaye*', 'acheter'], ['cher', 'avant']] },
          { id: 'slopes', en: 'The motor makes slopes easy, even for older people.', sentence: 2, cues: [['moteur', 'pente*'], ['agee*', 'peur', 'facile']] },
          { id: 'cars', en: 'Cars in the centre fell by 15% in a year.', sentence: 3, cues: [['voiture*'], ['quinze', 'baisse*', 'moins']] },
        ],
        check: [
          { q: 'Why rent before buying?', options: ['E-bikes are expensive', 'Shops are far away', 'Bikes break easily'], answer: 0, sentence: 1 },
          { q: 'Who is no longer afraid of the slopes?', options: ['Even elderly people', 'Only children', 'Only tourists'], answer: 0, sentence: 2 },
          { q: 'By how much did cars in the centre fall?', options: ['5%', '15%', '50%'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Le vélo électrique est-il une bonne solution pour remplacer la voiture ? Pourquoi ?', en: 'Is the electric bike a good way to replace the car? Why?' },
        starters: ['Je pense que oui, car…', "Pas toujours, parce que…", "Ça dépend de…"],
        modelRetell: "Dans une ville des Alpes, la mairie loue des vélos électriques pour dix euros par mois. On peut les essayer avant d'en acheter un, car ils coûtent cher. Avec le moteur, les pentes ne font plus peur. En un an, les voitures dans le centre ont baissé de quinze pour cent.",
      },
      b2: {
        headline: 'Vélo électrique : la montagne change de rythme',
        sentences: [
          { fr: 'Avec ses rues en pente raide, cette petite ville alpine semblait réservée aux voitures.', en: 'With its steep streets, this small Alpine town seemed reserved for cars.' },
          { fr: 'Depuis que la mairie loue des vélos électriques pour dix euros par mois, le paysage a changé : on croise désormais des cyclistes de tous âges.', en: 'Since the town hall started renting electric bikes for ten euros a month, the scene has changed: you now meet cyclists of all ages.' },
          { fr: 'Le trafic dans le centre a baissé de quinze pour cent, et plus de la moitié des testeurs ont fini par acheter leur propre vélo.', en: 'Traffic in the centre has fallen by fifteen per cent, and more than half of those who tried them ended up buying their own bike.' },
          { fr: 'Reste à construire des pistes cyclables sûres, encore trop rares sur les routes de montagne.', en: 'Safe cycle lanes still need to be built; they are still too rare on mountain roads.' },
        ],
        glossary: [
          { fr: 'pente raide', en: 'steep slope' }, { fr: 'paysage', en: 'scene, landscape' }, { fr: 'on croise', en: 'you come across' },
          { fr: 'testeurs', en: 'people trying them out' }, { fr: 'pistes cyclables', en: 'cycle lanes' },
        ],
        facts: [
          { id: 'steep', en: 'Steep streets made the town seem car-only.', sentence: 0, cues: [['pente*', 'raide'], ['voiture*', 'rue*']] },
          { id: 'rent', en: 'E-bikes rented for ten euros a month brought cyclists of all ages.', sentence: 1, cues: [['velo*'], ['dix euros', 'loue*', 'cycliste*']] },
          { id: 'results', en: 'Traffic fell 15% and over half the testers bought a bike.', sentence: 2, cues: [['quinze', 'trafic', 'moitie'], ['baisse*', 'achete*']] },
          { id: 'lanes', en: 'Safe cycle lanes are still missing.', sentence: 3, cues: [['piste*'], ['cyclable*', 'sure*', 'rare*']] },
        ],
        check: [
          { q: 'Who now cycles in the town?', options: ['Only young people', 'People of all ages', 'Mostly tourists'], answer: 1, sentence: 1 },
          { q: 'What did more than half of the testers do?', options: ['Gave the bike back early', 'Bought their own bike', 'Asked for a car'], answer: 1, sentence: 2 },
          { q: 'What is still missing?', options: ['Safe cycle lanes', 'Charging points', 'Bike shops'], answer: 0, sentence: 3 },
        ],
        opinion: { fr: 'Les villes devraient-elles investir davantage dans le vélo que dans les routes ? Justifie ta réponse.', en: 'Should towns invest more in cycling than in roads? Justify your answer.' },
        starters: ['Investir dans le vélo permettrait de…', 'Néanmoins, beaucoup de gens…', "À long terme…"],
        modelRetell: "Cette ville alpine a des rues en pente raide et semblait réservée aux voitures. Depuis que la mairie loue des vélos électriques pour dix euros par mois, on croise des cyclistes de tous âges. Le trafic a baissé de quinze pour cent et la moitié des testeurs ont acheté un vélo. Il manque encore des pistes cyclables sûres.",
      },
    },
  },
  {
    id: 'teen-chef', topicArea: 'people', emoji: '👩‍🍳', reviewed: false,
    levels: {
      a2: {
        headline: 'Une jeune cheffe gagne un concours',
        sentences: [
          { fr: 'Inès a quinze ans et elle adore cuisiner.', en: 'Inès is fifteen and she loves cooking.' },
          { fr: 'Elle a gagné un grand concours de cuisine à la télé.', en: 'She won a big cooking competition on TV.' },
          { fr: 'Elle a préparé un poisson avec des légumes de sa grand-mère.', en: "She made a fish dish with vegetables from her grandmother's garden." },
          { fr: 'Plus tard, elle veut ouvrir son restaurant.', en: 'Later, she wants to open her own restaurant.' },
        ],
        glossary: [
          { fr: 'cuisiner', en: 'to cook' }, { fr: 'concours', en: 'competition' }, { fr: 'préparé', en: 'prepared, made' }, { fr: 'poisson', en: 'fish' },
        ],
        facts: [
          { id: 'ines', en: 'Inès, 15, loves cooking.', sentence: 0, cues: [['ines'], ['quinze', 'cuisine*']] },
          { id: 'won', en: 'She won a TV cooking competition.', sentence: 1, cues: [['concours'], ['gagne*', 'tele', 'television']] },
          { id: 'dish', en: "She made fish with her grandmother's vegetables.", sentence: 2, cues: [['poisson'], ['legume*', 'grand mere']] },
          { id: 'restaurant', en: 'She wants to open a restaurant.', sentence: 3, cues: [['restaurant'], ['ouvrir', 'veut']] },
        ],
        check: [
          { q: 'How old is Inès?', options: ['13', '15', '18'], answer: 1, sentence: 0 },
          { q: 'What did she cook?', options: ['A cake', 'Fish with vegetables', 'Pizza'], answer: 1, sentence: 2 },
          { q: 'What does she want to do later?', options: ['Open a restaurant', 'Write a book', 'Be on TV again'], answer: 0, sentence: 3 },
        ],
        opinion: { fr: 'Tu aimes cuisiner ? Qu\'est-ce que tu prépares ?', en: 'Do you like cooking? What do you make?' },
        starters: ["Oui, j'aime préparer… parce que…", 'Non, je préfère manger…'],
        modelRetell: "Inès a quinze ans et elle adore cuisiner. Elle a gagné un concours de cuisine à la télé avec un poisson et des légumes de sa grand-mère. Plus tard, elle veut ouvrir son restaurant.",
      },
      b1: {
        headline: 'À 15 ans, Inès remporte un concours télévisé',
        sentences: [
          { fr: 'Inès, quinze ans, vient de remporter un célèbre concours de cuisine pour adolescents.', en: 'Inès, fifteen, has just won a famous cooking competition for teenagers.' },
          { fr: 'Face à onze autres candidats, elle a impressionné le jury avec un poisson et des légumes du jardin de sa grand-mère.', en: "Against eleven other contestants, she impressed the judges with fish and vegetables from her grandmother's garden." },
          { fr: 'Elle a appris à cuisiner en regardant sa famille et des vidéos en ligne.', en: 'She learned to cook by watching her family and online videos.' },
          { fr: 'Son prix : un stage d\'une semaine dans un grand restaurant parisien.', en: 'Her prize: a one-week work placement in a big Paris restaurant.' },
        ],
        glossary: [
          { fr: 'remporter', en: 'to win' }, { fr: 'adolescents', en: 'teenagers' }, { fr: 'candidats', en: 'contestants' },
          { fr: 'jury', en: 'judges' }, { fr: 'stage', en: 'work placement' },
        ],
        facts: [
          { id: 'won', en: 'Inès, 15, won a teen cooking competition.', sentence: 0, cues: [['ines'], ['concours'], ['remporte*', 'gagne*']] },
          { id: 'dish', en: "She impressed the jury with fish and her grandmother's vegetables.", sentence: 1, cues: [['poisson', 'legume*'], ['jury', 'grand mere', 'impressionne*']] },
          { id: 'learned', en: 'She learned from her family and online videos.', sentence: 2, cues: [['appris', 'regardant'], ['famille', 'video*']] },
          { id: 'prize', en: 'Her prize is a week in a big Paris restaurant.', sentence: 3, cues: [['restaurant'], ['stage', 'semaine', 'prix']] },
        ],
        check: [
          { q: 'How many other contestants were there?', options: ['Five', 'Eleven', 'Twenty'], answer: 1, sentence: 1 },
          { q: 'How did she learn to cook?', options: ['At a cooking school', 'Watching her family and online videos', 'From a book'], answer: 1, sentence: 2 },
          { q: 'What is her prize?', options: ['Money', 'A week in a Paris restaurant', 'A new kitchen'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Est-ce que la cuisine devrait être une matière à l\'école ? Pourquoi ?', en: 'Should cooking be a school subject? Why?' },
        starters: ['Oui, ce serait utile parce que…', "Non, car on a déjà…", "On apprendrait à…"],
        modelRetell: "Inès, quinze ans, a remporté un concours de cuisine pour adolescents. Elle a impressionné le jury avec un poisson et des légumes du jardin de sa grand-mère. Elle a appris en regardant sa famille et des vidéos. Son prix est un stage d'une semaine dans un restaurant parisien.",
      },
      b2: {
        headline: 'Inès, la cuisine de grand-mère à l\'honneur',
        sentences: [
          { fr: 'Face à onze candidats souvent formés dans des écoles de cuisine, Inès, quinze ans, a créé la surprise en remportant le concours.', en: 'Against eleven contestants, often trained at cookery schools, Inès, fifteen, caused a surprise by winning the competition.' },
          { fr: 'Son plat, un poisson accompagné de légumes du jardin familial, a séduit le jury par sa simplicité.', en: "Her dish, fish with vegetables from the family garden, won the judges over with its simplicity." },
          { fr: 'Autodidacte, elle a appris en observant sa grand-mère, puis en perfectionnant ses techniques grâce à des vidéos.', en: 'Self-taught, she learned by watching her grandmother, then perfected her techniques with videos.' },
          { fr: 'Elle espère montrer qu\'une cuisine de qualité peut rester accessible et respectueuse des saisons.', en: 'She hopes to show that quality cooking can stay affordable and respect the seasons.' },
        ],
        glossary: [
          { fr: 'formés', en: 'trained' }, { fr: 'a créé la surprise', en: 'caused a surprise' }, { fr: 'séduit', en: 'won over' },
          { fr: 'autodidacte', en: 'self-taught' }, { fr: 'accessible', en: 'affordable, within reach' }, { fr: 'saisons', en: 'seasons' },
        ],
        facts: [
          { id: 'surprise', en: 'Inès, 15, surprisingly beat trained contestants.', sentence: 0, cues: [['ines'], ['concours', 'remport*', 'surprise']] },
          { id: 'dish', en: 'Her simple fish and garden vegetables won over the jury.', sentence: 1, cues: [['poisson', 'legume*'], ['simplicite', 'jury']] },
          { id: 'self-taught', en: 'She is self-taught, from her grandmother and videos.', sentence: 2, cues: [['autodidacte', 'grand mere'], ['video*', 'appris', 'observ*']] },
          { id: 'message', en: 'She wants quality cooking to be affordable and seasonal.', sentence: 3, cues: [['saison*', 'accessible'], ['qualite', 'cuisine']] },
        ],
        check: [
          { q: 'Why was her win a surprise?', options: ['She is self-taught and others trained at schools', 'She cooked a dessert', 'She was the oldest'], answer: 0, sentence: 0 },
          { q: 'What did the jury like?', options: ['Its simplicity', 'Its exotic spices', 'Its size'], answer: 0, sentence: 1 },
          { q: 'What does she hope to show?', options: ['That quality cooking can be affordable and seasonal', 'That videos are better than schools', 'That fish is healthy'], answer: 0, sentence: 3 },
        ],
        opinion: { fr: 'Peut-on apprendre un métier seul, grâce à internet ? Justifie ta réponse.', en: 'Can you learn a trade on your own, thanks to the internet? Justify your answer.' },
        starters: ["Internet permet de… mais…", 'Rien ne remplace…', "L'exemple d'Inès montre que…"],
        modelRetell: "Inès, quinze ans, a remporté le concours face à des candidats formés dans des écoles. Son poisson avec des légumes du jardin a séduit le jury par sa simplicité. Autodidacte, elle a appris en observant sa grand-mère et avec des vidéos. Elle veut montrer qu'une cuisine de qualité peut être accessible et respecter les saisons.",
      },
    },
  },
  {
    id: 'car-free-village', topicArea: 'travel', emoji: '🏔️', reviewed: false,
    levels: {
      a2: {
        headline: 'Un village sans voitures',
        sentences: [
          { fr: 'Dans ce village de montagne, il n\'y a pas de voitures.', en: 'In this mountain village, there are no cars.' },
          { fr: 'Les touristes laissent leur voiture en bas et prennent un petit train.', en: 'Tourists leave their car at the bottom and take a little train.' },
          { fr: 'Dans le village, on marche ou on fait du vélo.', en: 'In the village, people walk or cycle.' },
          { fr: "C'est très calme et l'air est propre.", en: "It's very quiet and the air is clean." },
        ],
        glossary: [
          { fr: 'montagne', en: 'mountain' }, { fr: 'laissent', en: 'leave' }, { fr: 'en bas', en: 'at the bottom' },
          { fr: 'calme', en: 'quiet, calm' }, { fr: 'propre', en: 'clean' },
        ],
        facts: [
          { id: 'no-cars', en: 'This mountain village has no cars.', sentence: 0, cues: [['voiture*'], ['pas de', 'sans', 'village']] },
          { id: 'train', en: 'Tourists leave their car below and take a little train.', sentence: 1, cues: [['train'], ['touriste*', 'laisse*', 'bas']] },
          { id: 'walk', en: 'People walk or cycle.', sentence: 2, cues: [['marche*', 'velo'], ['village', 'on']] },
          { id: 'clean', en: "It's quiet and the air is clean.", sentence: 3, cues: [['calme', 'propre'], ['air', 'tres']] },
        ],
        check: [
          { q: 'How do tourists reach the village?', options: ['By car', 'By a little train', 'By helicopter'], answer: 1, sentence: 1 },
          { q: 'How do people get around in the village?', options: ['On foot or by bike', 'By bus', 'By horse'], answer: 0, sentence: 2 },
          { q: 'What is the air like?', options: ['Clean', 'Cold', 'Polluted'], answer: 0, sentence: 3 },
        ],
        opinion: { fr: 'Tu aimerais habiter dans un village sans voitures ? Pourquoi ?', en: 'Would you like to live in a village without cars? Why?' },
        starters: ["Oui, j'aimerais parce que…", "Non, je n'aimerais pas parce que…"],
        modelRetell: "Dans ce village de montagne, il n'y a pas de voitures. Les touristes laissent leur voiture en bas et prennent un petit train. On marche ou on fait du vélo, et l'air est propre.",
      },
      b1: {
        headline: 'La vie sans voiture, à 1 600 mètres',
        sentences: [
          { fr: 'Perché à mille six cents mètres d\'altitude, ce village savoyard a interdit les voitures il y a vingt ans.', en: 'Perched at one thousand six hundred metres, this village in Savoie banned cars twenty years ago.' },
          { fr: 'Les visiteurs garent leur véhicule dans la vallée et montent en funiculaire.', en: 'Visitors park their vehicle in the valley and go up by funicular railway.' },
          { fr: 'Les livraisons se font avec de petits véhicules électriques, et l\'hiver, certains enfants vont à l\'école en luge !', en: 'Deliveries are made with small electric vehicles, and in winter some children go to school by sledge!' },
          { fr: 'Les habitants apprécient le silence, même si la vie est parfois plus compliquée.', en: 'The residents enjoy the silence, even if life is sometimes more complicated.' },
        ],
        glossary: [
          { fr: 'perché', en: 'perched' }, { fr: 'savoyard', en: 'from Savoie' }, { fr: 'funiculaire', en: 'funicular railway' },
          { fr: 'livraisons', en: 'deliveries' }, { fr: 'luge', en: 'sledge' },
        ],
        facts: [
          { id: 'banned', en: 'This village at 1,600 m banned cars twenty years ago.', sentence: 0, cues: [['voiture*'], ['interdit*', 'vingt ans', 'mille six cents']] },
          { id: 'funicular', en: 'Visitors park in the valley and take a funicular.', sentence: 1, cues: [['funiculaire', 'vallee'], ['visiteur*', 'gare*', 'montent']] },
          { id: 'sledge', en: 'Deliveries use electric vehicles; some children sledge to school.', sentence: 2, cues: [['luge', 'electrique*', 'livraison*'], ['ecole', 'vehicule*', 'enfant*']] },
          { id: 'silence', en: 'Residents love the silence though life is harder.', sentence: 3, cues: [['silence', 'calme'], ['habitant*', 'compliquee']] },
        ],
        check: [
          { q: 'When were cars banned?', options: ['Two years ago', 'Twenty years ago', 'A hundred years ago'], answer: 1, sentence: 0 },
          { q: 'How do some children go to school in winter?', options: ['By sledge', 'By ski lift', 'By snowmobile'], answer: 0, sentence: 2 },
          { q: 'What do residents enjoy?', options: ['The shops', 'The silence', 'The nightlife'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Pourrait-on interdire les voitures dans ta ville ? Pourquoi ?', en: 'Could cars be banned in your town? Why?' },
        starters: ['Je pense que oui, si…', "Ce serait impossible, car…", 'Il faudrait d\'abord…'],
        modelRetell: "Ce village savoyard, à mille six cents mètres, a interdit les voitures il y a vingt ans. Les visiteurs garent leur voiture dans la vallée et montent en funiculaire. Les livraisons se font en véhicules électriques, et des enfants vont à l'école en luge. Les habitants apprécient le silence, même si la vie est compliquée.",
      },
      b2: {
        headline: 'Vingt ans sans voitures : le pari réussi d\'un village alpin',
        sentences: [
          { fr: 'Quand ce village savoyard a banni les voitures il y a vingt ans, beaucoup prédisaient sa ruine.', en: 'When this village in Savoie banned cars twenty years ago, many predicted its ruin.' },
          { fr: 'C\'est l\'inverse qui s\'est produit : le calme et l\'air pur attirent aujourd\'hui des familles entières, été comme hiver.', en: 'The opposite happened: the calm and pure air now attract whole families, summer and winter alike.' },
          { fr: 'Un funiculaire relie la vallée au village, tandis que des véhicules électriques assurent les livraisons.', en: 'A funicular links the valley to the village, while electric vehicles handle deliveries.' },
          { fr: 'Ce modèle reste toutefois difficile à copier, car il suppose des habitants prêts à renoncer à une partie de leur confort.', en: 'This model remains hard to copy, though, because it requires residents willing to give up some of their comfort.' },
        ],
        glossary: [
          { fr: 'banni', en: 'banned' }, { fr: 'prédisaient', en: 'predicted' }, { fr: 'ruine', en: 'ruin' },
          { fr: "l'inverse", en: 'the opposite' }, { fr: 'assurent', en: 'handle' }, { fr: 'renoncer', en: 'to give up' },
        ],
        facts: [
          { id: 'banned', en: 'The village banned cars 20 years ago and many predicted ruin.', sentence: 0, cues: [['voiture*'], ['banni*', 'interdit*', 'vingt ans']] },
          { id: 'opposite', en: 'Instead, calm and clean air attract families.', sentence: 1, cues: [['calme', 'air pur', 'air'], ['famille*', 'attire*', 'inverse']] },
          { id: 'transport', en: 'A funicular and electric vehicles keep it running.', sentence: 2, cues: [['funiculaire'], ['electrique*', 'livraison*', 'vallee']] },
          { id: 'hard', en: 'It is hard to copy: people must give up some comfort.', sentence: 3, cues: [['confort', 'renoncer'], ['copier', 'difficile', 'habitant*']] },
        ],
        check: [
          { q: 'What did many people predict?', options: ['The village\'s ruin', 'More tourists', 'A new road'], answer: 0, sentence: 0 },
          { q: 'What attracts families now?', options: ['Cheap hotels', 'Calm and pure air', 'Big shops'], answer: 1, sentence: 1 },
          { q: 'Why is the model hard to copy?', options: ['It is too expensive', 'People must give up some comfort', 'There is no snow elsewhere'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Serais-tu prêt à renoncer à la voiture pour protéger l\'environnement ? Justifie ta réponse.', en: 'Would you be ready to give up the car to protect the environment? Justify your answer.' },
        starters: ['Personnellement, je serais prêt à… car…', 'Ce serait difficile, surtout pour…', "Si les transports publics étaient…"],
        modelRetell: "Ce village savoyard a banni les voitures il y a vingt ans, et beaucoup prédisaient sa ruine. C'est l'inverse : le calme et l'air pur attirent des familles. Un funiculaire relie la vallée, et des véhicules électriques font les livraisons. Mais c'est difficile à copier, car il faut renoncer à une partie de son confort.",
      },
    },
  },
];
