/**
 * « Le journaliste, c'est toi » and « Et après ? » for editions 8–14
 * (daily-news §7). Henri's answers stay true to each level's story; his
 * prediction is a guess, never news. Covered by the story's `reviewed` flag.
 */
import type { NewsReporterSegments } from '../types';
import { ask, predict, turn } from './reporterHelpers';

export const REPORTER_WEEK2: Record<string, NewsReporterSegments> = {
  'sea-turtles': {
    a2: {
      journalist: { targets: [
        ask('Find out where the turtles came back to.', 'ou', 'Où sont revenues les tortues ?', 'Sur une plage en Corse.', 'To a beach in Corsica.'),
        ask('Find out how many eggs the turtle laid.', 'combien', "Combien d'œufs la tortue a-t-elle pondus ?", 'Elle a pondu cent œufs dans le sable.', 'She laid a hundred eggs in the sand.'),
        ask('Find out who watches the beach.', 'qui', 'Qui surveille la plage ?', 'Des volontaires surveillent la plage jour et nuit.', 'Volunteers watch the beach day and night.'),
      ] },
      predict: predict(
        turn("Qu'est-ce qui va se passer bientôt ?", 'What is going to happen soon?', ['Bientôt, les bébés…', 'Je pense que…'], 'Bientôt, les bébés tortues vont sortir du sable. Ils vont aller dans la mer.'),
        turn('Tu voudrais aider les volontaires ? Pourquoi ?', 'Would you like to help the volunteers? Why?', ['Oui, je voudrais…', 'Non, parce que…'], "Oui, je voudrais aider parce que j'adore les animaux. Je voudrais voir les bébés tortues !"),
        ["Moi, je pense que la tortue va revenir sur cette plage l'année prochaine.", 'I think the turtle is going to come back to this beach next year.'],
      ),
    },
    b1: {
      journalist: { targets: [
        ask('Find out when the turtle laid its eggs.', 'quand', 'Quand la tortue a-t-elle pondu ses œufs ?', 'La nuit, sans être dérangée.', 'At night, without being disturbed.'),
        ask('Find out how the volunteers protect the nest.', 'comment', 'Comment les volontaires protègent-ils le nid ?', 'Avec une petite barrière autour du nid.', 'With a little fence around the nest.'),
        ask('Find out how long until the babies hatch.', 'combien', 'Dans combien de temps les bébés vont-ils sortir ?', 'Dans environ deux mois.', 'In about two months.'),
      ] },
      predict: predict(
        turn("À ton avis, qu'est-ce que les bébés tortues feront en sortant du nid ?", 'In your opinion, what will the baby turtles do when they leave the nest?', ['En sortant, ils…', "Je pense qu'ils…"], 'En sortant, ils courront vers la mer pendant la nuit. Les volontaires les regarderont sans les toucher.'),
        turn('Si tu passais tes vacances sur cette plage, comment aiderais-tu les tortues ?', 'If you spent your holidays on this beach, how would you help the turtles?', ["J'aiderais les tortues en…", 'Je ferais attention à…'], 'Je ferais attention à ne pas marcher près du nid. Je ramasserais aussi les déchets sur la plage.'),
        ["Moi, je pense que d'autres tortues viendront pondre sur les plages corses.", 'I think other turtles will come to lay eggs on Corsican beaches.'],
      ),
    },
    b2: {
      journalist: { targets: [
        ask('Find out why the turtle may have come so far north.', 'pourquoi', 'Pourquoi la tortue est-elle venue si loin au nord ?', 'Peut-être à cause du réchauffement de la Méditerranée.', 'Perhaps because the Mediterranean is warming.'),
        ask('Find out what holidaymakers are asked to do.', 'questce', "Qu'est-ce qu'on demande aux vacanciers ?", "D'éteindre les lumières la nuit, car elles désorientent les jeunes tortues.", 'To switch off lights at night, because they confuse the young turtles.'),
        ask('Find out where these turtles used to lay their eggs.', 'ou', 'Où ces tortues pondaient-elles autrefois ?', 'Plus au sud de la Méditerranée.', 'Further south in the Mediterranean.'),
      ] },
      predict: predict(
        turn('Selon toi, que deviendront ces plages si la mer continue de se réchauffer ?', 'In your view, what will become of these beaches if the sea keeps warming?', ['Si la mer se réchauffe, …', 'Je suppose que…'], "Si la mer continue de se réchauffer, d'autres tortues viendront pondre en Corse. Il faudra alors protéger beaucoup plus de nids."),
        turn('Si tu étais maire de la commune, quelles règles imposerais-tu sur la plage ?', 'If you were the local mayor, what rules would you set on the beach?', ["J'imposerais…", 'Je demanderais aux touristes de…'], "J'interdirais les lumières sur la plage la nuit. Je demanderais aussi aux touristes de rester loin des nids pendant l'été."),
        ['Moi, je pense que les tortues reviendront, et que les bénévoles seront encore plus nombreux.', 'I think the turtles will come back, and there will be even more volunteers.'],
      ),
    },
  },

  'book-swap-app': {
    a2: {
      journalist: { targets: [
        ask('Find out who created the app.', 'qui', "Qui a créé l'application ?", "Trois lycéens ont créé l'appli.", 'Three secondary school pupils created the app.'),
        ask('Find out how many pupils use it.', 'combien', "Combien d'élèves utilisent l'appli ?", 'Déjà cinq cents élèves, à Toulouse.', 'Already five hundred pupils, in Toulouse.'),
        ask('Find out which city it is used in.', 'quel', "Dans quelle ville est-ce qu'on utilise l'appli ?", 'À Toulouse.', 'In Toulouse.'),
      ] },
      predict: predict(
        turn("Qu'est-ce que les lycéens vont faire avec leur appli ?", 'What are the pupils going to do with their app?', ['Ils vont…', "Je pense qu'ils vont…"], "Ils vont présenter l'appli dans d'autres villes. Beaucoup d'élèves vont l'utiliser."),
        turn('Tu voudrais utiliser cette appli ? Pourquoi ?', 'Would you like to use this app? Why?', ['Oui, je voudrais…', 'Non, parce que…'], "Oui, je voudrais l'utiliser parce que les livres coûtent cher."),
        ["Moi, je pense que l'appli va arriver dans toute la France.", 'I think the app is going to reach the whole of France.'],
      ),
    },
    b1: {
      journalist: { targets: [
        ask('Find out why they created the app.', 'pourquoi', 'Pourquoi ont-ils créé cette application ?', 'Ils en avaient assez de voir des manuels finir à la poubelle.', 'They were fed up with seeing textbooks end up in the bin.'),
        ask('Find out how the service works.', 'comment', 'Comment fonctionne le service ?', "Grâce à une carte des établissements de la ville, et c'est gratuit.", "With a map of the town's schools, and it's free."),
        ask('Find out when pupils swap their books.', 'quand', 'Quand les élèves échangent-ils leurs livres ?', "À la fin de l'année scolaire.", 'At the end of the school year.'),
      ] },
      predict: predict(
        turn("À ton avis, qu'est-ce que l'appli deviendra dans un an ?", 'In your opinion, what will the app become in a year?', ["Dans un an, l'appli…", 'Je pense que…'], "Dans un an, l'appli sera utilisée dans toute la région. On pourra peut-être échanger aussi des vêtements."),
        turn('Si tu créais une appli, à quoi servirait-elle ?', 'If you created an app, what would it be for?', ['Mon appli servirait à…', 'Je créerais une appli pour…'], "Je créerais une appli pour échanger des jeux vidéo. Ce serait gratuit et ça éviterait le gaspillage."),
        ["Moi, je pense que d'autres villes copieront bientôt cette idée.", 'I think other towns will soon copy this idea.'],
      ),
    },
    b2: {
      journalist: { targets: [
        ask('Find out how many books have changed hands.', 'combien', 'Combien de livres ont changé de main ?', 'Plus de deux mille, en six mois.', 'More than two thousand, in six months.'),
        ask('Find out what the region is thinking of doing.', 'questce', "Qu'est-ce que la région envisage de faire ?", "Elle envisage de financer le projet pour l'étendre à tous ses lycées.", 'It is thinking of funding the project to extend it to all its schools.'),
        ask('Find out what problem the app solves.', 'quel', "Quel problème l'application résout-elle ?", "Des manuels en bon état sont jetés, alors que d'autres familles doivent les acheter.", 'Good textbooks are thrown away while other families have to buy them.'),
      ] },
      predict: predict(
        turn("Selon toi, quels défis l'application rencontrera-t-elle en grandissant ?", 'In your view, what challenges will the app face as it grows?', ['En grandissant, elle devra…', 'Je suppose que…'], "En grandissant, elle devra gérer beaucoup plus d'utilisateurs. Il faudra aussi vérifier l'état des livres échangés."),
        turn('Si la région te demandait conseil, que lui recommanderais-tu ?', 'If the region asked your advice, what would you recommend?', ['Je lui recommanderais de…', 'À sa place, je…'], "Je lui recommanderais de financer le projet, tout en laissant les lycéens le diriger. Cela encouragerait d'autres jeunes à innover."),
        ['Moi, je pense que la région financera le projet avant la prochaine rentrée.', 'I think the region will fund the project before the next school year.'],
      ),
    },
  },

  'marathon-grandmother': {
    a2: {
      journalist: { targets: [
        ask('Find out how old Jeanne is.', 'quel', 'Quel âge a Jeanne ?', 'Elle a quatre-vingts ans.', 'She is eighty.'),
        ask('Find out when she ran the marathon.', 'quand', 'Quand a-t-elle couru le marathon ?', 'Dimanche.', 'On Sunday.'),
        ask('Find out who waited for her at the finish.', 'qui', "Qui l'a attendue à l'arrivée ?", 'Ses petits-enfants, avec des fleurs.', 'Her grandchildren, with flowers.'),
      ] },
      predict: predict(
        turn("Qu'est-ce que Jeanne va faire l'année prochaine ?", 'What is Jeanne going to do next year?', ["L'année prochaine, elle va…", "Je pense qu'elle va…"], "L'année prochaine, elle va courir le marathon de Paris. Ses petits-enfants vont courir avec elle !"),
        turn('Tu voudrais courir un marathon ? Pourquoi ?', 'Would you like to run a marathon? Why?', ['Oui, je voudrais…', "Non, c'est trop…"], "Non, c'est trop long pour moi ! Je préfère nager ou faire du vélo."),
        ["Moi, je pense que Jeanne va courir encore un marathon l'année prochaine.", 'I think Jeanne is going to run another marathon next year.'],
      ),
    },
    b1: {
      journalist: { targets: [
        ask('Find out when Jeanne started running.', 'quand', 'Quand Jeanne a-t-elle commencé à courir ?', 'Il y a seulement cinq ans, après sa retraite.', 'Only five years ago, after she retired.'),
        ask('Find out how often she trains.', 'combien', "Combien de fois par semaine s'entraîne-t-elle ?", 'Trois fois par semaine, avec un club de son quartier.', 'Three times a week, with a local club.'),
        ask('Find out what her secret is.', 'quel', 'Quel est son secret ?', 'Ne jamais se comparer aux autres et toujours prendre du plaisir.', 'Never compare yourself with others, and always enjoy it.'),
      ] },
      predict: predict(
        turn('À ton avis, quel sera le prochain défi de Jeanne ?', "In your opinion, what will Jeanne's next challenge be?", ['Je pense que son prochain défi…', 'Elle essaiera de…'], "Je pense qu'elle essaiera de courir un marathon à l'étranger. Elle encouragera aussi d'autres personnes âgées à courir."),
        turn('Si tu pouvais commencer un nouveau sport, lequel choisirais-tu ?', 'If you could take up a new sport, which would you choose?', ['Je choisirais…', 'Je commencerais…'], "Je choisirais l'escalade parce que ce serait un vrai défi. Je m'entraînerais deux fois par semaine."),
        ['Moi, je pense que le club de Jeanne aura beaucoup de nouveaux membres.', "I think Jeanne's club will get lots of new members."],
      ),
    },
    b2: {
      journalist: { targets: [
        ask('Find out what job Jeanne used to do.', 'quel', 'Quel métier Jeanne faisait-elle ?', "C'était une institutrice.", 'She was a primary school teacher.'),
        ask('Find out what running has given her most.', 'questce', "Qu'est-ce que le sport lui a surtout apporté ?", 'Il lui a permis de rencontrer des gens et de garder le moral.', 'It let her meet people and stay positive.'),
        ask('Find out how long the race took her.', 'combien', 'Combien de temps a-t-elle mis pour finir ?', "Six heures d'effort, pour quarante-deux kilomètres.", 'Six hours of effort, for forty-two kilometres.'),
      ] },
      predict: predict(
        turn('Selon toi, Jeanne réussira-t-elle à convaincre ses amies ?', 'In your view, will Jeanne manage to convince her friends?', ['À mon avis, elle…', 'Je suppose que…'], 'À mon avis, elle réussira, car son histoire est très inspirante. Ses amies voudront sûrement partager ce plaisir avec elle.'),
        turn("Si tu avais l'âge de Jeanne, quel défi aimerais-tu relever ?", "If you were Jeanne's age, what challenge would you like to take on?", ["À son âge, j'aimerais…", 'Je me lancerais…'], "À son âge, j'aimerais apprendre une nouvelle langue et voyager seul. Je voudrais prouver qu'on n'arrête jamais d'apprendre."),
        ['Moi, je pense que Jeanne courra les dix kilomètres avec toutes ses amies.', 'I think Jeanne will run the ten kilometres with all her friends.'],
      ),
    },
  },

  'night-train': {
    a2: {
      journalist: { targets: [
        ask('Find out when the train leaves.', 'quand', "Quand est-ce que le train part ?", 'Il part le soir.', 'It leaves in the evening.'),
        ask('Find out where the train goes.', 'ou', 'Où va le train ?', 'Il va de Paris à Berlin.', 'It goes from Paris to Berlin.'),
        ask('Find out why the train is better than the plane.', 'pourquoi', "Pourquoi le train est-il mieux que l'avion ?", "Parce qu'il pollue moins que l'avion.", 'Because it pollutes less than the plane.'),
      ] },
      predict: predict(
        turn("Qu'est-ce que les voyageurs vont faire à Berlin ?", 'What are the travellers going to do in Berlin?', ['À Berlin, ils vont…', "Je pense qu'ils vont…"], 'À Berlin, ils vont visiter la ville et manger dans des restaurants.'),
        turn('Tu voudrais dormir dans un train ? Pourquoi ?', 'Would you like to sleep on a train? Why?', ['Oui, je voudrais…', 'Non, parce que…'], "Oui, je voudrais dormir dans un train parce que c'est une aventure !"),
        ["Moi, je pense qu'il va y avoir d'autres trains de nuit en Europe.", 'I think there are going to be other night trains in Europe.'],
      ),
    },
    b1: {
      journalist: { targets: [
        ask('Find out what time the train leaves.', 'quand', 'À quelle heure part le train ?', "Il quitte la gare de l'Est vers vingt heures.", "It leaves the Gare de l'Est at about eight in the evening."),
        ask('Find out where in Paris it leaves from.', 'ou', "D'où part le train à Paris ?", "De la gare de l'Est.", "From the Gare de l'Est."),
        ask('Find out what travellers can choose between.', 'questce', "Qu'est-ce que les voyageurs peuvent choisir ?", 'Des sièges, des couchettes ou des cabines privées.', 'Seats, couchettes or private cabins.'),
      ] },
      predict: predict(
        turn('À ton avis, est-ce que plus de gens prendront le train de nuit ? Pourquoi ?', 'In your opinion, will more people take the night train? Why?', ['Je pense que oui, parce que…', 'À mon avis…'], "Je pense que oui, parce que les jeunes veulent moins polluer. Il y aura peut-être des trains vers l'Italie et l'Espagne."),
        turn('Si tu pouvais prendre un train de nuit, où irais-tu ?', 'If you could take a night train, where would you go?', ["J'irais à…", 'Je voudrais aller…'], "J'irais à Vienne avec mes amis. Je choisirais une couchette pour dormir pendant le voyage."),
        ["Moi, je pense qu'on pourra bientôt aller de Paris à Rome en train de nuit.", 'I think we will soon be able to go from Paris to Rome by night train.'],
      ),
    },
    b2: {
      journalist: { targets: [
        ask('Find out why night trains almost disappeared.', 'pourquoi', 'Pourquoi les trains de nuit avaient-ils presque disparu ?', 'On les jugeait trop lents et peu rentables.', 'They were seen as too slow and not profitable.'),
        ask('Find out what the biggest obstacle is.', 'quel', 'Quel est le principal obstacle ?', 'Le prix des billets, souvent plus élevé que celui des compagnies à bas coût.', 'The ticket price, often higher than low-cost airlines.'),
        ask('Find out when the train is fully booked.', 'quand', 'Quand le train affiche-t-il complet ?', 'Pendant les vacances.', 'During the holidays.'),
      ] },
      predict: predict(
        turn("Selon toi, comment l'Europe rendra-t-elle les trains de nuit moins chers ?", 'In your view, how will Europe make night trains cheaper?', ["À mon avis, l'Europe…", 'Je suppose que…'], "À mon avis, l'Europe taxera davantage les vols courts. Cet argent servira ensuite à baisser le prix des billets de train."),
        turn("Si un billet de train coûtait deux fois plus cher qu'un vol, que choisirais-tu ?", 'If a train ticket cost twice as much as a flight, what would you choose?', ['Je choisirais quand même…', 'Honnêtement, je prendrais…'], "Honnêtement, je prendrais peut-être l'avion pour économiser. Mais si je pouvais, je choisirais le train pour protéger la planète."),
        ["Moi, je pense que de nouvelles lignes de nuit ouvriront dans toute l'Europe.", 'I think new night lines will open all over Europe.'],
      ),
    },
  },

  'new-frog': {
    a2: {
      journalist: { targets: [
        ask('Find out where they found the frog.', 'ou', 'Où les scientifiques ont-ils trouvé la grenouille ?', 'En Guyane, dans la forêt.', 'In French Guiana, in the forest.'),
        ask('Find out what colour it is.', 'quel', 'De quelle couleur est la grenouille ?', 'Elle est orange.', 'It is orange.'),
        ask('Find out how big it is.', 'combien', 'Combien mesure la grenouille ?', 'Elle mesure un centimètre.', 'It is one centimetre long.'),
      ] },
      predict: predict(
        turn("Qu'est-ce que les scientifiques vont faire maintenant ?", 'What are the scientists going to do now?', ['Maintenant, ils vont…', "Je pense qu'ils vont…"], "Maintenant, ils vont chercher d'autres animaux dans la forêt."),
        turn('Tu voudrais travailler dans la forêt avec les scientifiques ? Pourquoi ?', 'Would you like to work in the forest with the scientists? Why?', ['Oui, je voudrais…', 'Non, parce que…'], "Oui, je voudrais voir les animaux, mais j'ai un peu peur des insectes !"),
        ["Moi, je pense qu'ils vont trouver encore d'autres grenouilles.", 'I think they are going to find even more frogs.'],
      ),
    },
    b1: {
      journalist: { targets: [
        ask('Find out how the researchers found it.', 'comment', "Comment les chercheurs l'ont-ils trouvée ?", "Ils l'ont d'abord entendue, grâce à son chant très aigu.", 'They heard it first, thanks to its very high-pitched song.'),
        ask('Find out what it has on its back.', 'questce', "Qu'est-ce qu'elle a sur le dos ?", 'Des taches orange.', 'Orange spots.'),
        ask('Find out how many other species may be waiting.', 'combien', "Combien d'autres espèces attendent d'être découvertes ?", 'Des dizaines, selon les chercheurs.', 'Dozens, according to the researchers.'),
      ] },
      predict: predict(
        turn("À ton avis, qu'est-ce que les chercheurs découvriront encore ?", 'In your opinion, what else will the researchers discover?', ["Je pense qu'ils découvriront…", 'Ils trouveront peut-être…'], 'Ils trouveront peut-être des insectes et des oiseaux inconnus. Certains animaux seront encore plus petits que cette grenouille.'),
        turn('Si tu découvrais une nouvelle espèce, quel nom lui donnerais-tu ?', 'If you discovered a new species, what name would you give it?', ["Je l'appellerais…", 'Je lui donnerais le nom…'], "Je l'appellerais « la petite chanteuse » à cause de son chant. Ce serait un nom facile à retenir."),
        ['Moi, je pense que cette forêt cache encore beaucoup de surprises.', 'I think this forest still hides lots of surprises.'],
      ),
    },
    b2: {
      journalist: { targets: [
        ask('Find out how long it took to prove it was a new species.', 'combien', 'Combien de temps a-t-il fallu pour le prouver ?', 'Trois ans.', 'Three years.'),
        ask('Find out how they proved it.', 'comment', "Comment les chercheurs l'ont-ils prouvé ?", "En comparant son ADN et son chant avec ceux d'autres grenouilles.", "By comparing its DNA and song with other frogs'."),
        ask('Find out why the forest must be protected quickly.', 'pourquoi', 'Pourquoi faut-il protéger cette forêt rapidement ?', "Parce que beaucoup d'espèces pourraient disparaître avant même d'être connues.", 'Because many species could vanish before they are even known.'),
      ] },
      predict: predict(
        turn("Selon toi, comment protégera-t-on la forêt amazonienne à l'avenir ?", 'In your view, how will the Amazon forest be protected in the future?', ["À l'avenir, on…", 'Je suppose que…'], "À l'avenir, on créera sans doute plus de zones protégées. Les chercheurs utiliseront aussi des micros pour écouter les animaux à distance."),
        turn('Si tu étais chercheur en Guyane, quelle espèce aimerais-tu étudier ?', 'If you were a researcher in French Guiana, which species would you like to study?', ["J'aimerais étudier…", 'Je me consacrerais…'], "J'aimerais étudier les oiseaux, car leurs chants sont très variés. Je passerais des semaines dans la forêt pour les enregistrer."),
        ["Moi, je pense qu'on décrira d'autres espèces de cette forêt dans les prochaines années.", 'I think more species from this forest will be described in the coming years.'],
      ),
    },
  },

  'asteroid-pupil': {
    a2: {
      journalist: { targets: [
        ask('Find out how old Léa is.', 'quel', 'Quel âge a Léa ?', 'Elle a quatorze ans.', 'She is fourteen.'),
        ask('Find out what Léa discovered.', 'questce', "Qu'est-ce que Léa a découvert ?", 'Elle a découvert un astéroïde.', 'She discovered an asteroid.'),
        ask('Find out who she looked at the photos with.', 'qui', 'Avec qui a-t-elle regardé les photos ?', 'Avec sa classe.', 'With her class.'),
      ] },
      predict: predict(
        turn("Qu'est-ce que Léa va faire plus tard ?", 'What is Léa going to do later on?', ['Plus tard, elle va…', "Je pense qu'elle va…"], 'Plus tard, elle va étudier les étoiles. Elle va peut-être travailler avec des télescopes.'),
        turn('Tu voudrais découvrir un astéroïde ? Pourquoi ?', 'Would you like to discover an asteroid? Why?', ['Oui, je voudrais…', 'Je voudrais lui donner…'], "Oui, je voudrais lui donner le nom de mon chien, Max ! C'est drôle."),
        ["Moi, je pense que l'astéroïde va avoir le nom de Léa.", "I think the asteroid is going to have Léa's name."],
      ),
    },
    b1: {
      journalist: { targets: [
        ask('Find out how Léa spotted the asteroid.', 'comment', "Comment Léa a-t-elle repéré l'astéroïde ?", 'En comparant plusieurs images, elle a vu un petit point qui bougeait.', 'By comparing several images, she saw a little moving dot.'),
        ask('Find out which photos the class looked at.', 'quel', 'Quelles photos la classe analysait-elle ?', 'De vraies photos de télescope.', 'Real telescope photos.'),
        ask('Find out what Léa can do if it is confirmed.', 'questce', "Qu'est-ce que Léa pourra faire si c'est confirmé ?", "Elle pourra choisir le nom de l'astéroïde.", 'She will be able to choose the name of the asteroid.'),
      ] },
      predict: predict(
        turn('À ton avis, quel nom Léa choisira-t-elle ?', 'In your opinion, what name will Léa choose?', ["Je pense qu'elle choisira…", "Elle l'appellera peut-être…"], "Je pense qu'elle choisira le nom de sa classe ou de son collège. Comme ça, tous les élèves seront fiers."),
        turn("Si tu découvrais un astéroïde, comment l'appellerais-tu ?", 'If you discovered an asteroid, what would you call it?', ["Je l'appellerais…", 'Je choisirais…'], "Je l'appellerais comme ma grand-mère, parce qu'elle m'a appris à regarder les étoiles."),
        ["Moi, je pense que d'autres élèves de la classe découvriront aussi un astéroïde.", 'I think other pupils in the class will discover an asteroid too.'],
      ),
    },
    b2: {
      journalist: { targets: [
        ask("Find out why astronomers need the pupils' help.", 'pourquoi', 'Pourquoi les astronomes ont-ils besoin des élèves ?', "Parce qu'ils n'ont pas le temps de tout examiner, et l'œil humain reste très efficace.", "Because they don't have time to check everything, and the human eye is very good at it."),
        ask('Find out how many images the pupils receive.', 'combien', 'Combien de clichés les élèves reçoivent-ils ?', 'Des milliers de clichés pris par de grands télescopes.', 'Thousands of shots taken by big telescopes.'),
        ask('Find out what Léa is now thinking of doing.', 'questce', "Qu'est-ce que Léa envisage maintenant ?", 'Elle envisage une carrière scientifique.', 'She is thinking of a career in science.'),
      ] },
      predict: predict(
        turn('Selon toi, comment la science participative évoluera-t-elle ?', 'In your view, how will citizen science develop?', ['À mon avis, elle…', 'Je suppose que…'], "À mon avis, de plus en plus d'élèves y participeront grâce à internet. Les découvertes faites par des amateurs deviendront plus fréquentes."),
        turn('Si tu pouvais participer à un projet scientifique, lequel choisirais-tu ?', 'If you could take part in a science project, which would you choose?', ['Je choisirais…', 'Je participerais à…'], "Je participerais à un projet sur les océans, car on les connaît encore mal. J'analyserais des photos de poissons rares."),
        ["Moi, je pense que Léa deviendra astronome et qu'elle découvrira bien d'autres astéroïdes.", 'I think Léa will become an astronomer and discover many more asteroids.'],
      ),
    },
  },

  'wheelchair-basketball': {
    a2: {
      journalist: { targets: [
        ask('Find out how many teams are coming.', 'combien', "Combien d'équipes viennent au tournoi ?", 'Douze équipes viennent de toute la France.', 'Twelve teams are coming from all over France.'),
        ask('Find out when the tournament is.', 'quand', 'Quand est le tournoi ?', 'Ce week-end, à Lyon.', 'This weekend, in Lyon.'),
        ask('Find out what the public can try.', 'questce', "Qu'est-ce que le public peut essayer ?", 'Le public peut essayer un fauteuil.', 'The public can try a wheelchair.'),
      ] },
      predict: predict(
        turn("Qu'est-ce que les enfants vont penser du tournoi ?", 'What are the children going to think of the tournament?', ['Ils vont trouver ça…', "Je pense qu'ils vont…"], 'Ils vont trouver ça génial. Ils vont vouloir essayer le basket en fauteuil.'),
        turn('Tu voudrais essayer un fauteuil de sport ? Pourquoi ?', 'Would you like to try a sports wheelchair? Why?', ['Oui, je voudrais…', 'Non, parce que…'], "Oui, je voudrais essayer parce que ça a l'air rapide et amusant."),
        ["Moi, je pense que beaucoup d'enfants vont vouloir jouer au basket en fauteuil.", 'I think lots of children are going to want to play wheelchair basketball.'],
      ),
    },
    b1: {
      journalist: { targets: [
        ask('Find out how many spectators came.', 'combien', 'Combien de spectateurs sont venus ?', 'Plus de trois mille spectateurs.', 'More than three thousand spectators.'),
        ask('Find out who plays together in some teams.', 'qui', 'Qui joue ensemble dans certaines équipes ?', 'Des joueurs valides et des joueurs handicapés.', 'Able-bodied and disabled players.'),
        ask('Find out what surprised the children.', 'questce', "Qu'est-ce qui a surpris les enfants ?", 'La vitesse et la force des joueurs.', 'The speed and strength of the players.'),
      ] },
      predict: predict(
        turn("À ton avis, qu'est-ce que ce tournoi va changer ?", 'In your opinion, what will this tournament change?', ['Je pense que ce tournoi…', 'Grâce au tournoi, …'], 'Grâce au tournoi, plus de jeunes voudront essayer ce sport. Les clubs auront de nouveaux joueurs.'),
        turn('Si ton école organisait un tournoi comme ça, est-ce que tu participerais ?', 'If your school organised a tournament like that, would you take part?', ['Oui, je participerais…', 'Je préférerais…'], 'Oui, je participerais avec mes amis. Je pense que ce serait difficile mais très amusant.'),
        ["Moi, je pense que le tournoi attirera encore plus de spectateurs l'année prochaine.", 'I think the tournament will draw even more spectators next year.'],
      ),
    },
    b2: {
      journalist: { targets: [
        ask('Find out what makes this sport special.', 'quel', 'Quelle est la particularité de ce sport ?', 'Des joueurs valides et handicapés peuvent jouer dans la même équipe.', 'Able-bodied and disabled players can play in the same team.'),
        ask('Find out how the teams are kept balanced.', 'comment', "Comment garde-t-on l'équilibre entre les équipes ?", 'Chaque joueur reçoit des points selon sa mobilité.', 'Each player is given points according to their mobility.'),
        ask('Find out why the clubs are pleased.', 'pourquoi', 'Pourquoi les clubs sont-ils contents ?', 'Ce succès peut attirer de nouveaux licenciés et changer le regard sur le handicap.', 'This success can bring in new members and change how people see disability.'),
      ] },
      predict: predict(
        turn("Selon toi, le basket fauteuil sera-t-il plus médiatisé à l'avenir ?", 'In your view, will wheelchair basketball get more media coverage in future?', ['À mon avis, il…', 'Je suppose que…'], "À mon avis, il le sera, car les gens découvrent à quel point c'est spectaculaire. Les grandes chaînes diffuseront peut-être les matchs."),
        turn("Si tu dirigeais un club de sport, que ferais-tu pour qu'il soit ouvert à tous ?", 'If you ran a sports club, what would you do to make it open to everyone?', ['Je proposerais…', "Pour qu'il soit ouvert à tous, je…"], "Je proposerais des équipes mixtes, comme au basket fauteuil. J'achèterais aussi du matériel adapté pour que chacun puisse jouer."),
        ["Moi, je pense que d'autres sports suivront l'exemple des équipes mixtes.", 'I think other sports will follow the example of mixed teams.'],
      ),
    },
  },
};
