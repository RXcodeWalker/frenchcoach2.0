/**
 * Daily News bank, editions 15–21. Hand-written (daily-news §1); `reviewed: false`
 * until a French speaker has checked every level (content-authoring §16).
 */
import type { NewsStory } from '../types';

export const WEEK3: NewsStory[] = [
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
        check: [
          { q: 'How many murals are there?', options: ['Thirteen', 'Thirty', 'Three hundred'], answer: 1, sentence: 1 },
          { q: 'Who chose the pictures?', options: ['The mayor alone', 'The villagers with the artists', 'The tourists'], answer: 1, sentence: 2 },
          { q: 'What has changed?', options: ['Lots of tourists visit', 'The school has closed', 'The walls were cleaned'], answer: 0, sentence: 3 },
        ],
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
        check: [
          { q: 'What was happening five years ago?', options: ['The village was losing people and shops', 'A festival started', 'A new school opened'], answer: 0, sentence: 0 },
          { q: 'What did the artists paint?', options: ['The church', 'The fronts of empty houses', 'The roads'], answer: 1, sentence: 1 },
          { q: 'What has opened recently?', options: ['Two new cafés', 'A museum', 'A hotel'], answer: 0, sentence: 3 },
        ],
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
        check: [
          { q: 'What had disappeared from the village?', options: ['The bakery', 'The school', 'The church'], answer: 0, sentence: 0 },
          { q: 'How were the murals designed?', options: ['From famous paintings', "With the villagers' memories and photos", 'By a computer'], answer: 1, sentence: 2 },
          { q: 'What do some people fear?', options: ['The paint will fade', 'The village becoming a social-media backdrop', 'Artists leaving'], answer: 1, sentence: 3 },
        ],
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
        check: [
          { q: 'How many pupils took part?', options: ['Ten', 'A hundred', 'A thousand'], answer: 1, sentence: 0 },
          { q: 'Which surprising objects did they find?', options: ['A phone and a hat', 'An old bike and a chair', 'A boat and a TV'], answer: 1, sentence: 2 },
          { q: 'How much rubbish did they collect?', options: ['30 kilos', '300 kilos', '3,000 kilos'], answer: 1, sentence: 3 },
        ],
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
        check: [
          { q: 'What equipment did they use?', options: ['Gloves and bags', 'Boats and nets', 'Spades'], answer: 0, sentence: 1 },
          { q: 'What was most of the rubbish?', options: ['Glass', 'Plastic packaging', 'Paper'], answer: 1, sentence: 2 },
          { q: 'When will they do it again?', options: ['Next month', 'In the spring', 'Next year'], answer: 1, sentence: 3 },
        ],
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
        check: [
          { q: 'What was the teachers\' main aim?', options: ['To win a prize', 'To show how big the problem is', 'To get the pupils outdoors'], answer: 1, sentence: 1 },
          { q: 'What will pupils do in class?', options: ['Analyse where the rubbish comes from', 'Write poems', 'Make art from the rubbish'], answer: 0, sentence: 2 },
          { q: 'What will they propose to the town hall?', options: ['A swimming ban', 'New bins', 'Fines for parents'], answer: 1, sentence: 3 },
        ],
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
        check: [
          { q: 'Where does this happen?', options: ['In a library in Nantes', 'In a vet\'s surgery', 'In a park'], answer: 0, sentence: 0 },
          { q: 'What do the children do?', options: ['Walk the dog', 'Read a story aloud to the dog', 'Draw the dog'], answer: 1, sentence: 1 },
          { q: 'What is the result?', options: ['The children are calmer and read better', 'The dogs learn tricks', 'The library is noisier'], answer: 0, sentence: 3 },
        ],
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
        check: [
          { q: 'Which children come?', options: ['Children who find reading hard', 'The best readers', 'Children who have a dog'], answer: 0, sentence: 1 },
          { q: 'Why are the children less afraid?', options: ['Their parents help them', "The dog doesn't correct or judge", 'They read in English'], answer: 1, sentence: 2 },
          { q: 'What do many children do afterwards?', options: ['Buy a dog', 'Borrow more books', 'Stop coming'], answer: 1, sentence: 3 },
        ],
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
        check: [
          { q: 'Where does the method come from?', options: ['The United Kingdom', 'The United States', 'Japan'], answer: 1, sentence: 0 },
          { q: 'Who is present with the dog?', options: ['A teacher', 'Its owner', 'A vet'], answer: 1, sentence: 1 },
          { q: 'What do the first results show?', options: ['No change', 'Clearly better reading fluency', 'Children prefer cats'], answer: 1, sentence: 3 },
        ],
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
        check: [
          { q: 'What do the pupils plant?', options: ['Flowers', 'Carrots, tomatoes and lettuces', 'Trees'], answer: 1, sentence: 1 },
          { q: 'Who uses the vegetables?', options: ['The parents', 'The cook in the canteen', 'A shop'], answer: 1, sentence: 2 },
          { q: 'What do the children say?', options: ['The vegetables taste better', 'They don\'t like vegetables', 'Gardening is boring'], answer: 0, sentence: 3 },
        ],
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
        check: [
          { q: 'How big is the garden?', options: ['50 m²', '500 m²', '5,000 m²'], answer: 1, sentence: 0 },
          { q: 'What does each class do?', options: ['Looks after its own part', 'Visits once a year', 'Sells the vegetables'], answer: 0, sentence: 1 },
          { q: 'What has changed since the project began?', options: ['The children waste less food', 'Lunch is more expensive', 'The canteen has closed'], answer: 0, sentence: 3 },
        ],
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
        check: [
          { q: 'What was replaced by the garden?', options: ['A car park', 'Part of the playground concrete', 'A sports hall'], answer: 1, sentence: 0 },
          { q: 'Which subjects do teachers use it for?', options: ['Only science', 'Science, maths and writing', 'Music and art'], answer: 1, sentence: 2 },
          { q: 'Why has food waste dropped?', options: ['Smaller portions', 'Children taste what they grew', 'A new cook'], answer: 1, sentence: 3 },
        ],
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
        check: [
          { q: 'Where is the town?', options: ['In the Alps', 'By the sea', 'Near Paris'], answer: 0, sentence: 0 },
          { q: 'How long can you keep a bike?', options: ['A day', 'A week', 'A month'], answer: 2, sentence: 1 },
          { q: 'How much does it cost?', options: ['Ten euros', 'Twenty euros', 'It is free'], answer: 0, sentence: 2 },
        ],
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
        check: [
          { q: 'Why rent before buying?', options: ['E-bikes are expensive', 'Shops are far away', 'Bikes break easily'], answer: 0, sentence: 1 },
          { q: 'Who is no longer afraid of the slopes?', options: ['Even elderly people', 'Only children', 'Only tourists'], answer: 0, sentence: 2 },
          { q: 'By how much did cars in the centre fall?', options: ['5%', '15%', '50%'], answer: 1, sentence: 3 },
        ],
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
        check: [
          { q: 'Who now cycles in the town?', options: ['Only young people', 'People of all ages', 'Mostly tourists'], answer: 1, sentence: 1 },
          { q: 'What did more than half of the testers do?', options: ['Gave the bike back early', 'Bought their own bike', 'Asked for a car'], answer: 1, sentence: 2 },
          { q: 'What is still missing?', options: ['Safe cycle lanes', 'Charging points', 'Bike shops'], answer: 0, sentence: 3 },
        ],
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
        check: [
          { q: 'How old is Inès?', options: ['13', '15', '18'], answer: 1, sentence: 0 },
          { q: 'What did she cook?', options: ['A cake', 'Fish with vegetables', 'Pizza'], answer: 1, sentence: 2 },
          { q: 'What does she want to do later?', options: ['Open a restaurant', 'Write a book', 'Be on TV again'], answer: 0, sentence: 3 },
        ],
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
        check: [
          { q: 'How many other contestants were there?', options: ['Five', 'Eleven', 'Twenty'], answer: 1, sentence: 1 },
          { q: 'How did she learn to cook?', options: ['At a cooking school', 'Watching her family and online videos', 'From a book'], answer: 1, sentence: 2 },
          { q: 'What is her prize?', options: ['Money', 'A week in a Paris restaurant', 'A new kitchen'], answer: 1, sentence: 3 },
        ],
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
        check: [
          { q: 'Why was her win a surprise?', options: ['She is self-taught and others trained at schools', 'She cooked a dessert', 'She was the oldest'], answer: 0, sentence: 0 },
          { q: 'What did the jury like?', options: ['Its simplicity', 'Its exotic spices', 'Its size'], answer: 0, sentence: 1 },
          { q: 'What does she hope to show?', options: ['That quality cooking can be affordable and seasonal', 'That videos are better than schools', 'That fish is healthy'], answer: 0, sentence: 3 },
        ],
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
        check: [
          { q: 'How do tourists reach the village?', options: ['By car', 'By a little train', 'By helicopter'], answer: 1, sentence: 1 },
          { q: 'How do people get around in the village?', options: ['On foot or by bike', 'By bus', 'By horse'], answer: 0, sentence: 2 },
          { q: 'What is the air like?', options: ['Clean', 'Cold', 'Polluted'], answer: 0, sentence: 3 },
        ],
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
        check: [
          { q: 'When were cars banned?', options: ['Two years ago', 'Twenty years ago', 'A hundred years ago'], answer: 1, sentence: 0 },
          { q: 'How do some children go to school in winter?', options: ['By sledge', 'By ski lift', 'By snowmobile'], answer: 0, sentence: 2 },
          { q: 'What do residents enjoy?', options: ['The shops', 'The silence', 'The nightlife'], answer: 1, sentence: 3 },
        ],
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
        check: [
          { q: 'What did many people predict?', options: ['The village\'s ruin', 'More tourists', 'A new road'], answer: 0, sentence: 0 },
          { q: 'What attracts families now?', options: ['Cheap hotels', 'Calm and pure air', 'Big shops'], answer: 1, sentence: 1 },
          { q: 'Why is the model hard to copy?', options: ['It is too expensive', 'People must give up some comfort', 'There is no snow elsewhere'], answer: 1, sentence: 3 },
        ],
      },
    },
  },
];
