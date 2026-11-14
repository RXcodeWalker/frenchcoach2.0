/**
 * « Le journaliste, c'est toi » and « Et après ? » for editions 15–21
 * (daily-news §7). Henri's answers stay true to each level's story; his
 * prediction is a guess, never news. Covered by the story's `reviewed` flag.
 */
import type { NewsReporterSegments } from '../types';
import { ask, predict, turn } from './reporterHelpers';

export const REPORTER_WEEK3: Record<string, NewsReporterSegments> = {
  'street-art-village': {
    a2: {
      journalist: { targets: [
        ask('Find out how many murals the artists painted.', 'combien', 'Combien de fresques les artistes ont-ils peintes ?', 'Ils ont peint trente grandes fresques.', 'They painted thirty big murals.'),
        ask('Find out who chose the pictures.', 'qui', 'Qui a choisi les dessins ?', 'Les habitants, avec les artistes.', 'The villagers, with the artists.'),
        ask('Find out where the village is.', 'ou', 'Où est le village ?', "C'est un petit village du Sud.", "It's a small village in the South."),
      ] },
      predict: predict(
        turn("Qu'est-ce que les artistes vont peindre après ?", 'What are the artists going to paint next?', ['Après, ils vont…', "Je pense qu'ils vont…"], "Après, ils vont peindre l'école du village. Ils vont faire des animaux et des fleurs."),
        turn('Tu voudrais peindre une fresque ? Pourquoi ?', 'Would you like to paint a mural? Why?', ['Oui, je voudrais…', 'Non, parce que…'], "Oui, je voudrais peindre la mer et des bateaux sur le mur de mon école parce que j'adore dessiner."),
        ["Moi, je pense que d'autres villages vont avoir des murs pleins de couleurs.", 'I think other villages are going to have walls full of colour.'],
      ),
    },
    b1: {
      journalist: { targets: [
        ask('Find out who invited the artists.', 'qui', 'Qui a invité les artistes ?', 'Le maire du village.', 'The village mayor.'),
        ask('Find out what the murals tell.', 'questce', "Qu'est-ce que les fresques racontent ?", "Elles racontent l'histoire du village et de ses habitants.", 'They tell the story of the village and its people.'),
        ask('Find out how many new cafés have opened.', 'combien', 'Combien de nouveaux cafés ont ouvert ?', 'Deux nouveaux cafés ont ouvert.', 'Two new cafés have opened.'),
      ] },
      predict: predict(
        turn('À ton avis, comment sera le village dans cinq ans ?', 'In your opinion, what will the village be like in five years?', ['Dans cinq ans, le village…', 'Je pense que…'], "Dans cinq ans, il y aura plus de familles et une nouvelle école. Les touristes viendront de toute l'Europe."),
        turn("Si tu habitais dans ce village, qu'est-ce que tu ferais pour les touristes ?", 'If you lived in this village, what would you do for the tourists?', ["J'ouvrirais…", 'Je proposerais…'], "J'ouvrirais un petit magasin de glaces près des fresques. Je proposerais aussi des visites guidées."),
        ["Moi, je pense qu'une boulangerie va bientôt rouvrir dans le village.", 'I think a bakery is soon going to reopen in the village.'],
      ),
    },
    b2: {
      journalist: { targets: [
        ask('Find out what the village was like five years ago.', 'comment', 'Comment était le village il y a cinq ans ?', 'Les volets étaient fermés et la boulangerie avait disparu.', 'The shutters were closed and the bakery had gone.'),
        ask('Find out what the villagers gave the artists.', 'questce', "Qu'est-ce que les habitants ont confié aux artistes ?", 'Leurs souvenirs et leurs photos de famille.', 'Their memories and their family photos.'),
        ask('Find out why some people are worried.', 'pourquoi', "Pourquoi certains habitants s'inquiètent-ils ?", 'Ils craignent que le village devienne un simple décor pour les réseaux sociaux.', 'They fear the village will become just a backdrop for social media.'),
      ] },
      predict: predict(
        turn('Selon toi, le village saura-t-il garder son âme ?', 'In your view, will the village manage to keep its soul?', ['À mon avis, il…', 'Je suppose que…'], 'À mon avis, il la gardera si les habitants continuent à participer aux projets. Sinon, il risque de devenir un musée sans vie.'),
        turn('Si tu étais le maire, comment éviterais-tu que le village devienne un simple décor ?', 'If you were the mayor, how would you stop the village becoming just a backdrop?', ["Pour l'éviter, je…", "J'encouragerais…"], "J'encouragerais les jeunes familles à s'installer avec des loyers moins chers. J'organiserais aussi des fêtes pour les habitants, pas seulement pour les touristes."),
        ["Moi, je pense que de jeunes familles viendront s'installer dans le village.", 'I think young families will come to settle in the village.'],
      ),
    },
  },

  'river-clean-up': {
    a2: {
      journalist: { targets: [
        ask('Find out when the pupils cleaned the river.', 'quand', 'Quand les élèves ont-ils nettoyé la rivière ?', 'Samedi.', 'On Saturday.'),
        ask('Find out how much rubbish they collected.', 'combien', 'Combien de déchets ont-ils ramassés ?', 'Trois cents kilos de déchets.', 'Three hundred kilos of rubbish.'),
        ask('Find out what strange things they found.', 'questce', "Qu'est-ce qu'ils ont trouvé de bizarre ?", 'Un vieux vélo et une chaise !', 'An old bike and a chair!'),
      ] },
      predict: predict(
        turn("Qu'est-ce que les élèves vont faire l'année prochaine ?", 'What are the pupils going to do next year?', ["L'année prochaine, ils vont…", "Je pense qu'ils vont…"], "L'année prochaine, ils vont nettoyer une autre rivière. Ils vont trouver moins de déchets."),
        turn('Tu voudrais nettoyer une rivière avec ta classe ? Pourquoi ?', 'Would you like to clean a river with your class? Why?', ['Oui, je voudrais…', 'Non, parce que…'], 'Oui, je voudrais aider parce que la nature est importante.'),
        ["Moi, je pense que la rivière va être plus propre l'année prochaine.", 'I think the river is going to be cleaner next year.'],
      ),
    },
    b1: {
      journalist: { targets: [
        ask('Find out what the pupils worked with.', 'questce', 'Avec quoi les élèves ont-ils travaillé ?', 'Avec des gants et des sacs.', 'With gloves and bags.'),
        ask('Find out which rubbish they mostly found.', 'quel', 'Quels déchets ont-ils surtout trouvés ?', 'Surtout des emballages en plastique.', 'Mostly plastic packaging.'),
        ask('Find out when they will do it again.', 'quand', 'Quand vont-ils recommencer ?', 'Au printemps.', 'In the spring.'),
      ] },
      predict: predict(
        turn("À ton avis, qu'est-ce que les élèves trouveront au printemps ?", 'In your opinion, what will the pupils find in the spring?', ['Au printemps, ils trouveront…', 'Je pense que…'], "Au printemps, ils trouveront moins de plastique, j'espère. Mais il y aura peut-être encore des objets bizarres !"),
        turn('Si tu organisais un nettoyage, où le ferais-tu ?', 'If you organised a clean-up, where would you do it?', ['Je le ferais…', "J'organiserais…"], "Je le ferais dans le parc près de chez moi, parce qu'il y a beaucoup de déchets. J'inviterais mes voisins."),
        ["Moi, je pense que plus d'élèves participeront au nettoyage du printemps.", 'I think more pupils will take part in the spring clean-up.'],
      ),
    },
    b2: {
      journalist: { targets: [
        ask("Find out what the teachers' real aim was.", 'quel', 'Quel était le vrai objectif des professeurs ?', "Faire prendre conscience de l'ampleur du problème.", 'To make the pupils aware of how big the problem is.'),
        ask('Find out what the pupils will do in class.', 'questce', "Qu'est-ce que les élèves feront en classe ?", "Ils analyseront les déchets pour comprendre d'où ils viennent.", 'They will analyse the rubbish to understand where it comes from.'),
        ask('Find out who will hear their conclusions.', 'qui', 'À qui présenteront-ils leurs conclusions ?', 'À la mairie, avec des propositions concrètes.', 'To the town hall, with practical proposals.'),
      ] },
      predict: predict(
        turn('Selon toi, comment la mairie réagira-t-elle aux propositions des élèves ?', "In your view, how will the town hall react to the pupils' proposals?", ['À mon avis, la mairie…', 'Je suppose que…'], 'À mon avis, la mairie installera de nouvelles poubelles près de la rivière. Elle invitera peut-être les élèves à présenter leur projet ailleurs.'),
        turn('Si tu devais présenter ces conclusions, quelle proposition ferais-tu ?', 'If you had to present these findings, what proposal would you make?', ['Je proposerais…', 'Ma proposition serait…'], "Je proposerais de mettre des panneaux pour expliquer d'où viennent les déchets. Je demanderais aussi des amendes pour ceux qui jettent leurs déchets dans la nature."),
        ['Moi, je pense que la mairie acceptera au moins une des propositions des élèves.', "I think the town hall will accept at least one of the pupils' proposals."],
      ),
    },
  },

  'reading-dogs': {
    a2: {
      journalist: { targets: [
        ask('Find out where the dogs help children.', 'ou', 'Où les chiens aident-ils les enfants ?', 'Dans une bibliothèque de Nantes.', 'In a library in Nantes.'),
        ask('Find out what the children do with the dog.', 'questce', "Qu'est-ce que les enfants font avec le chien ?", 'Ils lisent une histoire à voix haute pour le chien.', 'They read a story aloud to the dog.'),
        ask('Find out how the children feel with the dog.', 'comment', 'Comment sont les enfants avec le chien ?', 'Ils sont plus calmes et ils lisent mieux.', 'They are calmer and they read better.'),
      ] },
      predict: predict(
        turn("Qu'est-ce que la bibliothèque va faire après ?", 'What is the library going to do next?', ['La bibliothèque va…', "Je pense qu'elle va…"], "La bibliothèque va avoir plus de chiens. Beaucoup d'enfants vont venir lire."),
        turn('Tu voudrais lire une histoire à un chien ? Pourquoi ?', 'Would you like to read a story to a dog? Why?', ['Oui, je voudrais…', 'Non, je préfère…'], "Oui, je voudrais lire à un chien parce que j'adore les animaux."),
        ["Moi, je pense que d'autres bibliothèques vont inviter des chiens.", 'I think other libraries are going to invite dogs.'],
      ),
    },
    b1: {
      journalist: { targets: [
        ask('Find out when the dogs come.', 'quand', 'Quand les chiens viennent-ils à la bibliothèque ?', 'Chaque mercredi.', 'Every Wednesday.'),
        ask('Find out how long each child reads.', 'combien', 'Combien de temps les enfants lisent-ils ?', 'Pendant vingt minutes.', 'For twenty minutes.'),
        ask('Find out why the children dare to read.', 'pourquoi', 'Pourquoi les enfants osent-ils lire ?', 'Parce que le chien ne corrige pas et ne juge pas.', "Because the dog doesn't correct them or judge them."),
      ] },
      predict: predict(
        turn('À ton avis, comment ces enfants liront-ils dans un an ?', 'In your opinion, how will these children read in a year?', ['Dans un an, ils…', "Je pense qu'ils…"], 'Dans un an, ils liront plus vite et avec plus de confiance. Certains liront peut-être à leurs petits frères.'),
        turn("Si tu avais un chien, est-ce que tu lui lirais des histoires ?", 'If you had a dog, would you read it stories?', ['Oui, je lui lirais…', 'Non, je lui…'], "Oui, je lui lirais des histoires d'aventure le soir. Je pense qu'il dormirait tout de suite !"),
        ['Moi, je pense que la bibliothèque accueillera bientôt un quatrième chien.', 'I think the library will soon welcome a fourth dog.'],
      ),
    },
    b2: {
      journalist: { targets: [
        ask('Find out where the method comes from.', 'ou', "D'où vient cette méthode ?", 'Des États-Unis.', 'From the United States.'),
        ask('Find out who is there with the child.', 'qui', "Qui est présent avec l'enfant ?", 'Le maître du chien reste avec eux.', "The dog's owner stays with them."),
        ask('Find out what the first results show.', 'questce', "Qu'est-ce que montrent les premiers résultats ?", 'Une nette amélioration de la fluidité de lecture.', 'A clear improvement in reading fluency.'),
      ] },
      predict: predict(
        turn('Selon toi, cette méthode se développera-t-elle dans les écoles ?', 'In your view, will this method spread to schools?', ['À mon avis, elle…', 'Je suppose que…'], 'À mon avis, elle se développera si les études confirment les résultats. Il faudra cependant former les chiens et leurs maîtres.'),
        turn('Si tu dirigeais une école, adopterais-tu cette méthode ? Pourquoi ?', 'If you ran a school, would you adopt this method? Why?', ["Oui, je l'adopterais car…", 'Je serais prudent, car…'], "Je l'adopterais pour les élèves qui ont peur de lire devant la classe. Je ferais attention aux enfants allergiques aux chiens."),
        ['Moi, je pense que les écoles françaises essaieront bientôt les chiens lecteurs.', 'I think French schools will soon try reading dogs.'],
      ),
    },
  },

  'school-garden': {
    a2: {
      journalist: { targets: [
        ask('Find out what the pupils plant.', 'questce', "Qu'est-ce que les élèves plantent ?", 'Des carottes, des tomates et des salades.', 'Carrots, tomatoes and lettuces.'),
        ask('Find out who uses the vegetables.', 'qui', 'Qui utilise les légumes ?', 'Le cuisinier, à la cantine.', 'The cook, in the canteen.'),
        ask('Find out which city the school is in.', 'quel', "Dans quelle ville est l'école ?", 'À Rennes.', 'In Rennes.'),
      ] },
      predict: predict(
        turn("Qu'est-ce que les élèves vont planter l'année prochaine ?", 'What are the pupils going to plant next year?', ["L'année prochaine, ils vont planter…", "Je pense qu'ils vont…"], "L'année prochaine, ils vont planter des fraises et des pommes de terre."),
        turn('Tu voudrais un potager dans ton école ? Pourquoi ?', 'Would you like a vegetable garden at your school? Why?', ['Oui, je voudrais…', 'Non, parce que…'], "Oui, je voudrais un potager parce que j'aime être dehors."),
        ["Moi, je pense que d'autres écoles vont faire un potager.", 'I think other schools are going to make a vegetable garden.'],
      ),
    },
    b1: {
      journalist: { targets: [
        ask('Find out how big the garden is.', 'combien', 'Combien de mètres carrés fait le potager ?', 'Il fait cinq cents mètres carrés.', 'It is five hundred square metres.'),
        ask('Find out what each class does.', 'questce', "Qu'est-ce que chaque classe fait ?", 'Elle plante, arrose et récolte ses propres légumes.', 'It plants, waters and harvests its own vegetables.'),
        ask('Find out why the canteen buys less food.', 'pourquoi', 'Pourquoi la cantine achète-t-elle moins ?', 'Parce que les récoltes sont cuisinées à la cantine.', 'Because the harvests are cooked in the canteen.'),
      ] },
      predict: predict(
        turn("À ton avis, qu'est-ce que l'école ajoutera au potager ?", 'In your opinion, what will the school add to the garden?', ["Je pense que l'école ajoutera…", 'Elle installera peut-être…'], "Je pense que l'école ajoutera des arbres fruitiers. Elle installera peut-être des ruches."),
        turn("Si tu avais un potager, qu'est-ce que tu cultiverais ?", 'If you had a vegetable garden, what would you grow?', ['Je cultiverais…', 'Je planterais…'], 'Je cultiverais des tomates et des herbes pour faire des pizzas. Je donnerais les légumes à mes voisins.'),
        ['Moi, je pense que les élèves feront bientôt un marché pour vendre leurs légumes.', 'I think the pupils will soon hold a market to sell their vegetables.'],
      ),
    },
    b2: {
      journalist: { targets: [
        ask('Find out how long ago the project started.', 'combien', 'Il y a combien de temps que le projet a commencé ?', 'Il y a trois ans.', 'Three years ago.'),
        ask('Find out how the teachers use the garden.', 'comment', 'Comment les enseignants utilisent-ils le potager ?', "Pour aborder les sciences, les mathématiques et même l'écriture.", 'To teach science, maths and even writing.'),
        ask('Find out why the children waste less food now.', 'pourquoi', 'Pourquoi les enfants gaspillent-ils moins ?', "Parce qu'ils goûtent plus volontiers ce qu'ils ont fait pousser.", "Because they're keener to taste what they grew themselves."),
      ] },
      predict: predict(
        turn('Selon toi, ce type de potager deviendra-t-il courant dans les écoles ?', 'In your view, will this kind of garden become common in schools?', ['À mon avis, il…', 'Je suppose que…'], "À mon avis, il deviendra courant, car il coûte peu et apprend beaucoup aux enfants. Cependant, toutes les écoles n'ont pas assez d'espace."),
        turn("Si tu pouvais transformer ta cour d'école, que changerais-tu ?", 'If you could transform your school playground, what would you change?', ['Je remplacerais…', 'Je créerais…'], 'Je remplacerais une partie du béton par des arbres et des bancs. Je créerais aussi un coin calme pour lire pendant la récréation.'),
        ['Moi, je pense que la cour deviendra encore plus verte dans les prochaines années.', 'I think the playground will become even greener in the coming years.'],
      ),
    },
  },

  'electric-bikes': {
    a2: {
      journalist: { targets: [
        ask('Find out how much it costs.', 'combien', 'Combien coûte le vélo ?', 'Seulement dix euros.', 'Only ten euros.'),
        ask('Find out where the town is.', 'ou', 'Où est la ville ?', 'Dans les Alpes.', 'In the Alps.'),
        ask('Find out why the bikes are useful.', 'pourquoi', 'Pourquoi les vélos sont-ils utiles ?', 'Parce que monter les rues est beaucoup plus facile.', 'Because going up the streets is much easier.'),
      ] },
      predict: predict(
        turn("Qu'est-ce que les habitants vont faire après un mois ?", 'What are the residents going to do after a month?', ['Après un mois, ils vont…', "Je pense qu'ils vont…"], 'Après un mois, ils vont acheter un vélo électrique. Ils vont laisser la voiture à la maison.'),
        turn('Tu voudrais un vélo électrique ? Pourquoi ?', 'Would you like an electric bike? Why?', ['Oui, je voudrais…', 'Non, je préfère…'], "Non, je préfère un vélo normal parce que j'aime faire du sport."),
        ["Moi, je pense qu'il va y avoir moins de voitures dans la ville.", 'I think there are going to be fewer cars in the town.'],
      ),
    },
    b1: {
      journalist: { targets: [
        ask('Find out who rents out the bikes.', 'qui', 'Qui loue les vélos aux habitants ?', 'La mairie.', 'The town hall.'),
        ask('Find out why people rent before buying.', 'pourquoi', "Pourquoi les habitants louent-ils d'abord un vélo ?", "Pour l'essayer avant d'en acheter un, car ils coûtent cher.", "To try one before buying, because they're expensive."),
        ask('Find out how much the traffic has dropped.', 'combien', 'De combien le nombre de voitures a-t-il baissé ?', 'De quinze pour cent en un an.', 'By fifteen per cent in a year.'),
      ] },
      predict: predict(
        turn('À ton avis, comment sera la ville dans cinq ans ?', 'In your opinion, what will the town be like in five years?', ['Dans cinq ans, la ville…', 'Je pense que…'], 'Dans cinq ans, il y aura beaucoup de pistes cyclables. Les rues seront plus calmes.'),
        turn('Si ta ville louait des vélos électriques, en louerais-tu un ?', 'If your town rented out electric bikes, would you rent one?', ["Oui, j'en louerais un pour…", "Non, je n'en louerais pas car…"], "Oui, j'en louerais un pour aller au collège. Ce serait plus rapide que le bus."),
        ["Moi, je pense que d'autres villes de montagne copieront cette idée.", 'I think other mountain towns will copy this idea.'],
      ),
    },
    b2: {
      journalist: { targets: [
        ask('Find out how many testers bought a bike.', 'combien', 'Combien de testeurs ont acheté leur propre vélo ?', 'Plus de la moitié.', 'More than half.'),
        ask('Find out what is still missing.', 'questce', "Qu'est-ce qui manque encore ?", 'Des pistes cyclables sûres, encore trop rares sur les routes de montagne.', 'Safe cycle lanes, still too rare on mountain roads.'),
        ask('Find out who cycles in town now.', 'qui', 'Qui fait du vélo en ville maintenant ?', 'Des cyclistes de tous âges.', 'Cyclists of all ages.'),
      ] },
      predict: predict(
        turn('Selon toi, la ville réussira-t-elle à construire assez de pistes cyclables ?', 'In your view, will the town manage to build enough cycle lanes?', ['À mon avis, elle…', 'Je suppose que…'], 'À mon avis, elle en construira, mais cela prendra du temps et coûtera cher. Les routes de montagne sont étroites et difficiles à aménager.'),
        turn('Si tu étais chargé des transports, quelle serait ta priorité ?', 'If you were in charge of transport, what would your priority be?', ['Ma priorité serait…', 'Je commencerais par…'], "Ma priorité serait la sécurité des enfants qui vont à l'école à vélo. Je commencerais par des pistes cyclables près des écoles."),
        ['Moi, je pense que les premières pistes cyclables de montagne ouvriront bientôt.', 'I think the first mountain cycle lanes will open soon.'],
      ),
    },
  },

  'teen-chef': {
    a2: {
      journalist: { targets: [
        ask('Find out what Inès won.', 'questce', "Qu'est-ce qu'Inès a gagné ?", 'Elle a gagné un grand concours de cuisine à la télé.', 'She won a big TV cooking competition.'),
        ask('Find out which dish she made.', 'quel', 'Quel plat a-t-elle préparé ?', 'Un poisson avec des légumes de sa grand-mère.', "A fish with her grandmother's vegetables."),
        ask('Find out when she wants to open a restaurant.', 'quand', 'Quand veut-elle ouvrir son restaurant ?', 'Plus tard, quand elle sera grande.', 'Later on, when she is grown up.'),
      ] },
      predict: predict(
        turn("Qu'est-ce qu'Inès va faire plus tard ?", 'What is Inès going to do later on?', ['Plus tard, elle va…', "Je pense qu'elle va…"], 'Plus tard, elle va ouvrir un restaurant avec sa grand-mère.'),
        turn('Tu voudrais participer à un concours de cuisine ? Pourquoi ?', 'Would you like to take part in a cooking competition? Why?', ['Oui, je voudrais…', 'Non, parce que…'], "Non, parce que je ne sais pas cuisiner ! Mais j'adore manger."),
        ["Moi, je pense qu'Inès va écrire un livre de recettes.", 'I think Inès is going to write a recipe book.'],
      ),
    },
    b1: {
      journalist: { targets: [
        ask('Find out how many other contestants there were.', 'combien', "Combien d'autres candidats y avait-il ?", 'Onze autres candidats.', 'Eleven other contestants.'),
        ask('Find out how Inès learned to cook.', 'comment', 'Comment Inès a-t-elle appris à cuisiner ?', 'En regardant sa famille et des vidéos en ligne.', 'By watching her family and videos online.'),
        ask('Find out what her prize is.', 'quel', 'Quel est son prix ?', "Un stage d'une semaine dans un grand restaurant parisien.", "A week's placement in a top Paris restaurant."),
      ] },
      predict: predict(
        turn("À ton avis, qu'est-ce qu'Inès apprendra pendant son stage ?", 'In your opinion, what will Inès learn during her placement?', ['Pendant son stage, elle…', "Je pense qu'elle…"], 'Pendant son stage, elle apprendra à travailler vite et en équipe. Elle découvrira aussi de nouvelles recettes.'),
        turn('Si tu participais à ce concours, quel plat préparerais-tu ?', 'If you entered this competition, what dish would you make?', ['Je préparerais…', 'Je cuisinerais…'], "Je préparerais les pâtes de ma mère avec une sauce tomate maison. C'est simple, mais tout le monde adore."),
        ["Moi, je pense qu'Inès travaillera un jour dans ce grand restaurant.", 'I think Inès will work in that top restaurant one day.'],
      ),
    },
    b2: {
      journalist: { targets: [
        ask('Find out why her win was a surprise.', 'pourquoi', 'Pourquoi sa victoire a-t-elle surpris ?', "Parce que les autres candidats sortaient souvent d'écoles de cuisine.", 'Because the other contestants had often trained at cookery schools.'),
        ask('Find out what the judges liked about her dish.', 'questce', "Qu'est-ce que le jury a aimé dans son plat ?", 'Sa simplicité : un poisson avec des légumes du jardin familial.', "Its simplicity: a fish with vegetables from the family garden."),
        ask('Find out who she first learned from.', 'qui', 'De qui a-t-elle appris en premier ?', "De sa grand-mère, en l'observant.", 'From her grandmother, by watching her.'),
      ] },
      predict: predict(
        turn('Selon toi, quel genre de cheffe Inès deviendra-t-elle ?', 'In your view, what kind of chef will Inès become?', ['À mon avis, elle…', "Je suppose qu'elle…"], 'À mon avis, elle deviendra une cheffe qui cuisine avec des produits locaux. Elle partagera sûrement ses recettes en ligne.'),
        turn('Si tu ouvrais un restaurant, quelle cuisine y servirais-tu ?', 'If you opened a restaurant, what food would you serve there?', ["J'y servirais…", 'Mon restaurant proposerait…'], 'Mon restaurant proposerait des plats du monde entier, mais avec des légumes de saison. Les prix resteraient accessibles aux familles.'),
        ["Moi, je pense qu'Inès ouvrira un restaurant simple et de saison avant ses trente ans.", 'I think Inès will open a simple, seasonal restaurant before she turns thirty.'],
      ),
    },
  },

  'car-free-village': {
    a2: {
      journalist: { targets: [
        ask('Find out where tourists leave their cars.', 'ou', 'Où les touristes laissent-ils leur voiture ?', 'En bas, avant le village.', 'At the bottom, before the village.'),
        ask('Find out how tourists get up to the village.', 'comment', 'Comment les touristes montent-ils au village ?', 'Ils prennent un petit train.', 'They take a little train.'),
        ask('Find out why the air is clean.', 'pourquoi', "Pourquoi l'air est-il propre ?", "Parce qu'il n'y a pas de voitures.", 'Because there are no cars.'),
      ] },
      predict: predict(
        turn("Qu'est-ce que les touristes vont faire dans le village ?", 'What are the tourists going to do in the village?', ['Ils vont…', "Je pense qu'ils vont…"], 'Ils vont marcher dans la montagne et manger au restaurant.'),
        turn('Tu voudrais habiter dans un village sans voitures ? Pourquoi ?', 'Would you like to live in a car-free village? Why?', ['Oui, je voudrais…', 'Non, parce que…'], "Oui, je voudrais habiter là parce que c'est calme."),
        ['Moi, je pense que beaucoup de familles vont visiter le village cet été.', 'I think lots of families are going to visit the village this summer.'],
      ),
    },
    b1: {
      journalist: { targets: [
        ask('Find out when the village banned cars.', 'quand', 'Quand le village a-t-il interdit les voitures ?', 'Il y a vingt ans.', 'Twenty years ago.'),
        ask('Find out how deliveries arrive.', 'comment', 'Comment se font les livraisons ?', 'Avec de petits véhicules électriques.', 'With small electric vehicles.'),
        ask('Find out at what altitude the village is.', 'quel', 'À quelle altitude se trouve le village ?', 'À mille six cents mètres.', 'At one thousand six hundred metres.'),
      ] },
      predict: predict(
        turn('À ton avis, est-ce que le village gardera cette règle dans vingt ans ?', 'In your opinion, will the village keep this rule in twenty years?', ['Je pense que oui, parce que…', 'À mon avis…'], 'Je pense que oui, parce que les habitants aiment le silence. Les touristes viendront pour le calme.'),
        turn("Si tu habitais dans ce village, comment irais-tu à l'école en hiver ?", 'If you lived in this village, how would you get to school in winter?', ["J'irais à l'école…", 'En hiver, je…'], "En hiver, j'irais à l'école en luge, bien sûr ! Ce serait le meilleur moment de la journée."),
        ["Moi, je pense que d'autres villages de montagne interdiront aussi les voitures.", 'I think other mountain villages will ban cars too.'],
      ),
    },
    b2: {
      journalist: { targets: [
        ask('Find out what people predicted at the time.', 'questce', "Qu'est-ce que les gens prédisaient à l'époque ?", 'Beaucoup prédisaient la ruine du village.', 'Many predicted the village would be ruined.'),
        ask('Find out who the village attracts today.', 'qui', "Qui le village attire-t-il aujourd'hui ?", 'Des familles entières, été comme hiver.', 'Whole families, summer and winter.'),
        ask('Find out why the model is hard to copy.', 'pourquoi', 'Pourquoi ce modèle est-il difficile à copier ?', "Parce qu'il faut des habitants prêts à renoncer à une partie de leur confort.", 'Because it needs residents willing to give up some of their comfort.'),
      ] },
      predict: predict(
        turn("Selon toi, d'autres villages adopteront-ils ce modèle à l'avenir ?", 'In your view, will other villages adopt this model in future?', ['À mon avis, certains…', 'Je suppose que…'], "À mon avis, certains villages touristiques l'adopteront, car les visiteurs recherchent le calme. En revanche, ce sera presque impossible dans les grandes villes."),
        turn('Serais-tu prêt à renoncer à la voiture ? À quelles conditions ?', 'Would you be ready to give up the car? On what conditions?', ['Je serais prêt à y renoncer si…', 'Je ne pourrais pas, car…'], 'Je serais prêt à y renoncer si les transports publics étaient fréquents et bon marché. Sinon, ce serait trop compliqué pour ma famille.'),
        ['Moi, je pense que le village fêtera bientôt ses trente ans sans voitures, toujours aussi calme.', 'I think the village will soon celebrate thirty car-free years, as calm as ever.'],
      ),
    },
  },
};
