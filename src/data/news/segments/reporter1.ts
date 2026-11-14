/**
 * « Le journaliste, c'est toi » and « Et après ? » for editions 1–7
 * (daily-news §7). Henri's answers stay true to each level's story; his
 * prediction is a guess, never news. Covered by the story's `reviewed` flag.
 */
import type { NewsReporterSegments } from '../types';
import { ask, predict, turn } from './reporterHelpers';

export const REPORTER_WEEK1: Record<string, NewsReporterSegments> = {
  'bees-on-roofs': {
    a2: {
      journalist: { targets: [
        ask('Find out how many hives the hotel has.', 'combien', "Combien de ruches est-ce que l'hôtel a ?", "L'hôtel a trois ruches sur son toit.", 'The hotel has three hives on its roof.'),
        ask('Find out where the bees live.', 'ou', 'Où habitent les abeilles ?', 'Elles habitent sur les toits de Paris.', 'They live on the roofs of Paris.'),
        ask('Find out what the restaurant does with the honey.', 'questce', "Qu'est-ce que le restaurant fait avec le miel ?", 'Le restaurant utilise le miel pour ses desserts.', 'The restaurant uses the honey for its desserts.'),
      ] },
      predict: predict(
        turn("Qu'est-ce que l'hôtel va faire l'année prochaine ?", 'What is the hotel going to do next year?', ["L'année prochaine, l'hôtel va…", 'Je pense que…'], "L'année prochaine, l'hôtel va avoir cinq ruches. Les abeilles vont faire plus de miel."),
        turn('Tu voudrais avoir des abeilles chez toi ? Pourquoi ?', 'Would you like to have bees at home? Why?', ['Oui, je voudrais…', "Non, je n'aimerais pas…"], "Oui, je voudrais des abeilles dans mon jardin parce que j'adore le miel."),
        ["Moi, je pense que d'autres hôtels vont avoir des ruches sur leur toit.", 'I think other hotels are going to have hives on their roofs.'],
      ),
    },
    b1: {
      journalist: { targets: [
        ask('Find out when the beekeeper comes.', 'quand', "Quand est-ce que l'apiculteur vient ?", "Il vient chaque semaine pour s'occuper des abeilles.", 'He comes every week to look after the bees.'),
        ask('Find out why the bees find so many flowers.', 'pourquoi', 'Pourquoi est-ce que les abeilles trouvent beaucoup de fleurs ?', "Parce qu'il y a beaucoup de parcs et de jardins à Paris.", 'Because there are lots of parks and gardens in Paris.'),
        ask('Find out at which meal the honey is served.', 'quel', "À quel repas est-ce qu'on sert le miel ?", 'On le sert au petit-déjeuner des clients.', "It's served at the guests' breakfast."),
      ] },
      predict: predict(
        turn("À ton avis, qu'est-ce qui va se passer dans les prochaines années ?", 'In your opinion, what will happen in the next few years?', ['Je pense que…', 'Dans quelques années, il y aura…'], "Je pense qu'il y aura des ruches sur beaucoup d'hôtels. Les clients voudront acheter le miel."),
        turn('Si tu dirigeais un hôtel, est-ce que tu installerais des ruches ?', 'If you ran a hotel, would you put in hives?', ["Oui, j'installerais…", "Non, je n'installerais pas…"], "Oui, j'installerais des ruches parce que ce serait original. Je vendrais aussi le miel aux clients."),
        ["Moi, je pense que l'hôtel vendra bientôt son miel dans une petite boutique.", 'I think the hotel will soon sell its honey in a little shop.'],
      ),
    },
    b2: {
      journalist: { targets: [
        ask('Find out how many hives Paris may have.', 'combien', 'Combien de ruches y a-t-il à Paris ?', 'Paris compterait plus de mille ruches.', 'Paris may have more than a thousand hives.'),
        ask('Find out why the city protects the bees.', 'pourquoi', 'Pourquoi la ville protège-t-elle les abeilles ?', "Parce qu'on y utilise peu de pesticides, contrairement à la campagne.", 'Because few pesticides are used there, unlike in the countryside.'),
        ask('Find out who is worried about the hives.', 'qui', "Qui s'inquiète de ces ruches ?", 'Certains scientifiques : les insectes sauvages pourraient manquer de nourriture.', 'Some scientists: wild insects could run short of food.'),
      ] },
      predict: predict(
        turn('Selon toi, comment la mairie va-t-elle encadrer les ruches ?', 'In your view, how will the city hall regulate the hives?', ['À mon avis, la mairie va…', "Je suppose qu'elle limitera…"], 'À mon avis, la mairie limitera le nombre de ruches dans chaque quartier. Elle plantera aussi plus de fleurs pour nourrir tous les insectes.'),
        turn("Si tu étais maire de Paris, qu'est-ce que tu ferais ?", 'If you were mayor of Paris, what would you do?', ["Si j'étais maire, je…", 'À sa place, je…'], "Si j'étais maire, j'autoriserais les ruches, mais seulement près des parcs. En plus, je créerais des jardins pour les insectes sauvages."),
        ['Moi, je pense que la ville créera des jardins pour nourrir les abeilles et les insectes sauvages.', 'I think the city will create gardens to feed the bees and the wild insects.'],
      ),
    },
  },

  'solar-boat': {
    a2: {
      journalist: { targets: [
        ask('Find out how long the trip lasted.', 'combien', 'Combien de jours a duré le voyage ?', 'Le voyage a duré vingt-huit jours.', 'The trip lasted twenty-eight days.'),
        ask('Find out where the sailors arrived.', 'ou', 'Où sont arrivés les marins ?', 'Ils sont arrivés en Guadeloupe.', 'They arrived in Guadeloupe.'),
        ask('Find out how the boat moves.', 'comment', 'Comment avance le bateau ?', "Il avance avec l'énergie du soleil, sans essence.", 'It moves with energy from the sun, without petrol.'),
      ] },
      predict: predict(
        turn("Qu'est-ce que les marins vont faire maintenant ?", 'What are the sailors going to do now?', ['Maintenant, ils vont…', "Je pense qu'ils vont…"], 'Maintenant, ils vont se reposer à la plage. Après, ils vont rentrer en bateau.'),
        turn('Tu voudrais faire ce voyage ? Pourquoi ?', 'Would you like to make this trip? Why?', ['Oui, je voudrais…', 'Non, parce que…'], "Non, parce que vingt-huit jours en mer, c'est trop long pour moi !"),
        ["Moi, je pense qu'ils vont faire un autre voyage l'année prochaine.", 'I think they are going to make another trip next year.'],
      ),
    },
    b1: {
      journalist: { targets: [
        ask('Find out where the boat set off from.', 'ou', "D'où est parti le bateau ?", 'Il est parti des îles Canaries.', 'It set off from the Canary Islands.'),
        ask('Find out how the boat moves at night.', 'comment', 'Comment le bateau avance-t-il la nuit ?', "Il utilise l'énergie stockée dans ses batteries pendant la journée.", 'It uses the energy stored in its batteries during the day.'),
        ask('Find out why the sailors made this trip.', 'pourquoi', 'Pourquoi les marins ont-ils fait ce voyage ?', "Ils veulent montrer qu'on peut voyager sans polluer.", 'They want to show that you can travel without polluting.'),
      ] },
      predict: predict(
        turn("À ton avis, qu'est-ce que les marins feront ensuite ?", 'In your opinion, what will the sailors do next?', ["Je pense qu'ils…", 'Ensuite, ils…'], "Je pense qu'ils feront le tour du monde. Ils parleront aussi de leur voyage dans les écoles."),
        turn('Si tu pouvais faire ce voyage, est-ce que tu partirais ?', 'If you could make this trip, would you go?', ['Oui, je partirais parce que…', 'Non, je ne partirais pas car…'], "Oui, je partirais parce que ce serait une grande aventure. Mais j'aurais peur des tempêtes."),
        ["Moi, je pense que d'autres bateaux solaires traverseront bientôt l'océan.", 'I think other solar boats will soon cross the ocean.'],
      ),
    },
    b2: {
      journalist: { targets: [
        ask('Find out what the main challenge was.', 'quel', 'Quel était le principal défi ?', "C'était la météo : les jours nuageux les ont obligés à ralentir.", 'It was the weather: cloudy days forced them to slow down.'),
        ask('Find out how long they were at sea.', 'combien', 'Combien de temps sont-ils restés en mer ?', 'Vingt-huit jours, sans une goutte de carburant.', 'Twenty-eight days, without a drop of fuel.'),
        ask('Find out why the trip matters for shipping.', 'pourquoi', 'Pourquoi ce voyage est-il important pour le transport maritime ?', "Parce que le transport maritime est responsable d'une part importante de la pollution mondiale.", "Because shipping causes a large share of the world's pollution."),
      ] },
      predict: predict(
        turn('Selon toi, comment le transport maritime changera-t-il dans vingt ans ?', 'In your view, how will shipping change in twenty years?', ['Dans vingt ans, les navires…', 'Je suppose que…'], "Dans vingt ans, les grands navires utiliseront sans doute le soleil et le vent. Ils pollueront beaucoup moins qu'aujourd'hui."),
        turn('Si tu dirigeais une grande compagnie maritime, que ferais-tu ?', 'If you ran a big shipping company, what would you do?', ['Si je dirigeais une compagnie, je…', 'À leur place, je…'], "Si je dirigeais une compagnie, j'installerais des panneaux solaires sur tous les bateaux, même si cela coûtait cher au début."),
        ['Moi, je pense que les cargos auront bientôt des voiles et des panneaux solaires.', 'I think cargo ships will soon have sails and solar panels.'],
      ),
    },
  },

  'astronaut-call': {
    a2: {
      journalist: { targets: [
        ask('Find out who the pupils spoke to.', 'qui', 'Avec qui les élèves ont-ils parlé ?', "Ils ont parlé avec un astronaute dans l'espace.", 'They spoke with an astronaut in space.'),
        ask('Find out how long the conversation lasted.', 'combien', 'Combien de minutes a duré la conversation ?', 'Elle a duré dix minutes.', 'It lasted ten minutes.'),
        ask('Find out how they talked to him.', 'comment', "Comment ont-ils parlé avec l'astronaute ?", 'Ils ont parlé par radio.', 'They talked by radio.'),
      ] },
      predict: predict(
        turn("Qu'est-ce que les élèves vont faire après cet appel ?", 'What are the pupils going to do after this call?', ['Après, ils vont…', "Je pense qu'ils vont…"], "Après, ils vont faire un exposé sur l'espace. Ils vont peut-être écrire à l'astronaute."),
        turn('Toi, tu voudrais parler avec un astronaute ? Pourquoi ?', 'Would you like to talk to an astronaut? Why?', ['Oui, je voudrais…', 'Je voudrais lui demander…'], 'Oui, je voudrais lui demander comment il mange. Je voudrais aussi voir la Terre !'),
        ["Moi, je pense qu'un élève de la classe va devenir astronaute un jour.", 'I think a pupil from the class is going to become an astronaut one day.'],
      ),
    },
    b1: {
      journalist: { targets: [
        ask('Find out how many questions the pupils prepared.', 'combien', 'Combien de questions les élèves avaient-ils préparées ?', 'Ils avaient préparé vingt questions.', 'They had prepared twenty questions.'),
        ask('Find out how they reached the space station.', 'comment', 'Comment ont-ils pu joindre la Station spatiale ?', 'Grâce à une radio installée au collège.', 'Thanks to a radio set up at the school.'),
        ask('Find out what the pupils mostly wanted to know.', 'questce', "Qu'est-ce que les élèves voulaient surtout savoir ?", "Comment on dort et ce qu'on mange en apesanteur.", 'How you sleep and what you eat when weightless.'),
      ] },
      predict: predict(
        turn("À ton avis, qu'est-ce que ces élèves feront plus tard ?", 'In your opinion, what will these pupils do later on?', ['Je pense que certains…', 'Plus tard, ils…'], "Je pense que certains élèves étudieront les sciences. Peut-être qu'une élève travaillera un jour pour une agence spatiale."),
        turn('Si tu pouvais poser une question à un astronaute, laquelle choisirais-tu ?', 'If you could ask an astronaut one question, which would you choose?', ['Je lui demanderais…', 'Je voudrais savoir…'], "Je lui demanderais s'il a peur dans l'espace. Je voudrais aussi savoir ce qui lui manque le plus."),
        ["Moi, je pense que le collège organisera un autre appel l'année prochaine.", 'I think the school will organise another call next year.'],
      ),
    },
    b2: {
      journalist: { targets: [
        ask('Find out why the call only lasted ten minutes.', 'pourquoi', "Pourquoi le contact n'a-t-il duré que dix minutes ?", "Parce que c'était le temps que la station passe au-dessus de la France.", 'Because that was how long the station took to pass over France.'),
        ask('Find out how astronauts sleep.', 'comment', 'Comment les astronautes dorment-ils ?', "Ils s'attachent pour dormir.", 'They strap themselves in to sleep.'),
        ask('Find out at what altitude the station is.', 'quel', 'À quelle altitude se trouve la station ?', "À environ quatre cents kilomètres d'altitude.", 'About four hundred kilometres up.'),
      ] },
      predict: predict(
        turn('Selon toi, comment cet appel influencera-t-il ces élèves ?', 'In your view, how will this call influence these pupils?', ['Cet appel leur donnera…', 'Je suppose que…'], "Cet appel leur donnera sans doute envie d'étudier les sciences. Certains choisiront peut-être un métier lié à l'espace."),
        turn('Si tu pouvais passer une semaine dans la station, accepterais-tu ?', 'If you could spend a week on the station, would you accept?', ["Oui, j'accepterais parce que…", 'Non, je refuserais car…'], "J'accepterais sans hésiter, car voir la Terre depuis l'espace serait inoubliable. En revanche, la nourriture sans goût me dérangerait !"),
        ["Moi, je pense que d'autres collèges voudront aussi parler avec la station.", 'I think other schools will want to talk to the station too.'],
      ),
    },
  },

  'village-football': {
    a2: {
      journalist: { targets: [
        ask('Find out how many people live in the village.', 'combien', "Combien d'habitants a le village ?", 'Le village a huit cents habitants.', 'The village has eight hundred people.'),
        ask('Find out what the final score was.', 'quel', 'Quel était le score de la finale ?', 'Elles ont gagné trois à un.', 'They won three–one.'),
        ask('Find out where the village celebrated.', 'ou', 'Où le village a-t-il fait la fête ?', 'Sur la place du village.', 'On the village square.'),
      ] },
      predict: predict(
        turn("Qu'est-ce que l'équipe va faire la saison prochaine ?", 'What is the team going to do next season?', ['La saison prochaine, elles vont…', 'Je pense que…'], 'La saison prochaine, elles vont jouer contre des équipes plus fortes. Elles vont encore gagner !'),
        turn('Tu voudrais jouer dans cette équipe ? Pourquoi ?', 'Would you like to play in this team? Why?', ['Oui, je voudrais…', 'Non, je préfère…'], "Oui, je voudrais jouer avec elles parce que j'adore le football."),
        ['Moi, je pense que beaucoup de filles vont vouloir jouer au foot dans le village.', 'I think lots of girls are going to want to play football in the village.'],
      ),
    },
    b1: {
      journalist: { targets: [
        ask('Find out why nobody expected the win.', 'pourquoi', "Pourquoi personne ne s'attendait-il à cette victoire ?", "Parce que le club n'existe que depuis trois ans.", 'Because the club has only existed for three years.'),
        ask('Find out which team they beat in the final.', 'quel', 'Quelle équipe ont-elles battue en finale ?', 'Une équipe de Rennes, trois buts à un.', 'A team from Rennes, three goals to one.'),
        ask('Find out when the villagers had their party.', 'quand', 'Quand les habitants ont-ils fait la fête ?', 'Le soir même, sur la place du village.', 'That same evening, on the village square.'),
      ] },
      predict: predict(
        turn("À ton avis, qu'est-ce qui va changer pour le club ?", 'In your opinion, what will change for the club?', ['Je pense que le club…', 'Bientôt, il y aura…'], "Je pense que le club aura plus de joueuses. Il faudra peut-être un nouvel entraîneur."),
        turn("Si tu étais la capitaine, qu'est-ce que tu dirais à ton équipe ?", 'If you were the captain, what would you say to your team?', ['Je dirais…', 'Je leur demanderais…'], "Je dirais à mon équipe qu'elle a été géniale. Ensuite, je leur demanderais de continuer à travailler dur."),
        ['Moi, je pense que le club créera bientôt une équipe pour les plus jeunes.', 'I think the club will soon start a team for younger players.'],
      ),
    },
    b2: {
      journalist: { targets: [
        ask('Find out who founded the club.', 'qui', 'Qui a fondé ce club ?', 'Cinq jeunes filles, il y a trois ans.', 'Five girls, three years ago.'),
        ask('Find out why they founded it.', 'pourquoi', 'Pourquoi ont-elles créé le club ?', "Parce qu'il n'y avait pas de place pour elles dans les équipes des garçons.", "Because there was no room for them in the boys' teams."),
        ask('Find out what the town hall is promising.', 'questce', "Qu'est-ce que la mairie promet ?", "Un nouveau terrain pour accueillir toutes les filles qui veulent s'inscrire.", 'A new pitch for all the girls who want to sign up.'),
      ] },
      predict: predict(
        turn('Selon toi, quel avenir attend ce club ?', 'In your view, what future awaits this club?', ['À mon avis, ce club…', 'Je suppose que…'], "À mon avis, ce club deviendra l'un des meilleurs de Bretagne. D'autres villages s'inspireront sans doute de son histoire."),
        turn('Si tu avais été à leur place, aurais-tu créé ton propre club ?', 'If you had been in their place, would you have started your own club?', ["Oui, j'aurais…", 'À leur place, je…'], "Oui, j'aurais fait la même chose, car il est injuste de ne pas pouvoir jouer. Il faut du courage pour créer un club."),
        ["Moi, je pense que le nouveau terrain sera plein de jeunes joueuses dès l'année prochaine.", 'I think the new pitch will be full of young players from next year.'],
      ),
    },
  },

  'beach-library': {
    a2: {
      journalist: { targets: [
        ask('Find out where the library is.', 'ou', 'Où est la bibliothèque ?', 'Elle est sur la plage de Nice.', 'It is on the beach in Nice.'),
        ask('Find out what you can borrow.', 'questce', "Qu'est-ce qu'on peut emprunter ?", 'Des livres et des bandes dessinées.', 'Books and comics.'),
        ask('Find out how much it costs.', 'combien', 'Combien ça coûte ?', "C'est gratuit pour tout le monde.", "It's free for everyone."),
      ] },
      predict: predict(
        turn("Qu'est-ce que la ville va faire l'été prochain ?", 'What is the town going to do next summer?', ["L'été prochain, la ville va…", 'Je pense que…'], "L'été prochain, la ville va ouvrir une deuxième bibliothèque sur une autre plage."),
        turn('Tu voudrais lire à la plage ? Pourquoi ?', 'Would you like to read on the beach? Why?', ['Oui, je voudrais…', 'Non, je préfère…'], "Oui, je voudrais lire des bandes dessinées sous un parasol. C'est parfait en vacances !"),
        ["Moi, je pense que d'autres villes vont avoir des bibliothèques sur la plage.", 'I think other towns are going to have libraries on the beach.'],
      ),
    },
    b1: {
      journalist: { targets: [
        ask('Find out how many books there are.', 'combien', 'Combien de livres y a-t-il ?', 'Plus de deux mille livres, magazines et bandes dessinées.', 'More than two thousand books, magazines and comics.'),
        ask('Find out how borrowing works.', 'comment', "Comment est-ce qu'on emprunte un livre ?", 'Il suffit de laisser son nom et de rapporter le livre avant de partir.', 'You just leave your name and bring the book back before you go.'),
        ask('Find out what young people borrow most.', 'questce', "Qu'est-ce que les jeunes empruntent surtout ?", 'Surtout des mangas, selon les bibliothécaires.', 'Mostly manga, according to the librarians.'),
      ] },
      predict: predict(
        turn("À ton avis, est-ce que la bibliothèque reviendra l'été prochain ? Pourquoi ?", 'In your opinion, will the library come back next summer? Why?', ["Je pense qu'elle reviendra parce que…", 'À mon avis…'], "Je pense qu'elle reviendra parce que les vacanciers l'adorent. Il y aura peut-être encore plus de mangas."),
        turn('Si tu créais une bibliothèque de plage, quels livres choisirais-tu ?', 'If you set up a beach library, which books would you choose?', ['Je choisirais…', 'Il y aurait…'], "Je choisirais des romans d'aventure et des bandes dessinées. Il y aurait aussi des livres en plusieurs langues pour les touristes."),
        ['Moi, je pense que la cabane aura bientôt un coin pour les tout-petits.', 'I think the hut will soon have a corner for toddlers.'],
      ),
    },
    b2: {
      journalist: { targets: [
        ask('Find out how many holidaymakers come each day.', 'combien', 'Combien de vacanciers viennent chaque jour ?', 'Des centaines de vacanciers viennent chaque jour.', 'Hundreds of holidaymakers come every day.'),
        ask('Find out what the system relies on.', 'questce', 'Sur quoi repose le système ?', "Il repose entièrement sur la confiance : pas de carte, pas d'inscription.", 'It relies entirely on trust: no card, no sign-up.'),
        ask('Find out why the town set it up.', 'pourquoi', 'Pourquoi la ville a-t-elle créé cette bibliothèque ?', 'Pour faire découvrir la lecture à ceux qui ne vont jamais dans les bibliothèques.', 'To bring reading to people who never go to libraries.'),
      ] },
      predict: predict(
        turn('Selon toi, ce système de confiance pourrait-il fonctionner ailleurs ?', 'In your view, could this trust system work elsewhere?', ['Je pense que oui, car…', 'Je crains que non, car…'], 'Je pense que oui, car la plupart des gens sont honnêtes. Cependant, dans une grande ville, quelques livres disparaîtraient sans doute.'),
        turn('Si tu étais responsable de la bibliothèque, que changerais-tu ?', 'If you were in charge of the library, what would you change?', ["Si j'en étais responsable, je…", 'Je proposerais…'], "Je proposerais des lectures à voix haute pour les enfants le soir. J'ajouterais aussi des livres audio pour ceux qui n'aiment pas lire."),
        ["Moi, je pense que l'idée sera copiée dans les parcs, pendant toute l'année.", 'I think the idea will be copied in parks, all year round.'],
      ),
    },
  },

  'giant-baguette': {
    a2: {
      journalist: { targets: [
        ask('Find out how long the baguette is.', 'combien', 'Combien mesure la baguette ?', 'Elle mesure cent quarante mètres !', "It's a hundred and forty metres long!"),
        ask('Find out when the bakers worked.', 'quand', 'Quand les boulangers ont-ils travaillé ?', 'Ils ont travaillé toute la nuit.', 'They worked all night.'),
        ask('Find out what they did with the bread.', 'questce', "Qu'est-ce qu'ils ont fait avec le pain ?", "Ils l'ont partagé avec les habitants.", 'They shared it with the local people.'),
      ] },
      predict: predict(
        turn("Qu'est-ce que les boulangers vont faire maintenant ?", 'What are the bakers going to do now?', ['Maintenant, ils vont…', "Je pense qu'ils vont…"], 'Maintenant, ils vont dormir ! Après, ils vont faire un croissant géant.'),
        turn('Tu voudrais manger un morceau de la baguette ? Pourquoi ?', 'Would you like to eat a piece of the baguette? Why?', ['Oui, je voudrais…', 'Je voudrais la manger avec…'], "Oui, je voudrais un grand morceau avec du beurre et de la confiture parce que j'adore le pain."),
        ["Moi, je pense qu'une autre ville va faire une baguette encore plus longue.", 'I think another town is going to make an even longer baguette.'],
      ),
    },
    b1: {
      journalist: { targets: [
        ask('Find out how they baked it.', 'comment', 'Comment ont-ils fait cuire la baguette ?', 'Avec un four spécial qui avançait lentement le long de la pâte.', 'With a special oven that moved slowly along the dough.'),
        ask('Find out which record they beat.', 'quel', 'Quel record ont-ils battu ?', 'Le record de la plus longue baguette du monde.', "The record for the world's longest baguette."),
        ask('Find out what happened to the baguette afterwards.', 'questce', "Qu'est-ce qu'on a fait de la baguette ensuite ?", "On l'a coupée en morceaux et distribuée gratuitement.", 'It was cut into pieces and given away for free.'),
      ] },
      predict: predict(
        turn('À ton avis, combien de temps ce record va-t-il durer ?', 'In your opinion, how long will this record last?', ['Je pense que ce record…', 'À mon avis, une autre équipe…'], 'À mon avis, une autre équipe battra ce record dans quelques années. Les boulangers français devront recommencer !'),
        turn('Si tu pouvais battre un record, lequel choisirais-tu ?', 'If you could break a record, which would you choose?', ['Je choisirais…', "J'essaierais de…"], "J'essaierais de faire la plus grande pizza du monde avec mes amis. Ce serait drôle et délicieux."),
        ["Moi, je pense que l'équipe essaiera bientôt de faire le plus grand croissant du monde.", "I think the team will soon try to make the world's biggest croissant."],
      ),
    },
    b2: {
      journalist: { targets: [
        ask('Find out which country held the record before.', 'quel', 'Quel pays détenait le record avant ?', "C'était l'Italie.", 'It was Italy.'),
        ask('Find out how much flour they needed.', 'combien', 'Combien de farine a-t-il fallu ?', 'Plus de cent kilos de farine.', 'More than a hundred kilos of flour.'),
        ask('Find out who was given the pieces.', 'qui', 'À qui a-t-on offert les morceaux ?', "À des associations de la région : rien n'a été gaspillé.", 'To local charities: nothing was wasted.'),
      ] },
      predict: predict(
        turn("Selon toi, comment l'Italie réagira-t-elle ?", 'In your view, how will Italy react?', ["À mon avis, l'Italie…", 'Je suppose que…'], "À mon avis, l'Italie voudra reprendre son record très vite. Cette compétition amicale pourrait durer des années."),
        turn('Si tu organisais un tel défi, comment éviterais-tu le gaspillage ?', 'If you organised a challenge like this, how would you avoid waste?', ['Pour éviter le gaspillage, je…', 'Je donnerais…'], 'Je donnerais le pain à des associations, comme eux. Je préparerais aussi un grand repas gratuit pour les habitants du quartier.'),
        ['Moi, je pense que les deux pays finiront par organiser un défi ensemble.', 'I think the two countries will end up organising a challenge together.'],
      ),
    },
  },

  'car-park-to-park': {
    a2: {
      journalist: { targets: [
        ask('Find out which city the park is in.', 'quel', 'Dans quelle ville est le parc ?', 'À Bordeaux.', 'In Bordeaux.'),
        ask('Find out how many trees the city planted.', 'combien', "Combien d'arbres la ville a-t-elle plantés ?", 'Elle a planté trois cents arbres.', 'It planted three hundred trees.'),
        ask('Find out how people can get there.', 'comment', 'Comment les habitants peuvent-ils venir ?', 'Ils peuvent venir à pied ou à vélo.', 'They can come on foot or by bike.'),
      ] },
      predict: predict(
        turn("Qu'est-ce que la ville va faire avec d'autres parkings ?", 'What is the city going to do with other car parks?', ['La ville va…', 'Je pense que…'], "La ville va transformer d'autres parkings en parcs. Il y aura plus d'arbres."),
        turn('Tu voudrais un parc comme ça près de chez toi ? Pourquoi ?', 'Would you like a park like that near your home? Why?', ['Oui, je voudrais…', 'Non, je préfère…'], 'Oui, je voudrais un parc près de chez moi pour jouer au foot avec mes amis.'),
        ['Moi, je pense que les enfants du quartier vont jouer dans le parc tous les jours.', 'I think the local children are going to play in the park every day.'],
      ),
    },
    b1: {
      journalist: { targets: [
        ask('Find out how many spaces the car park had.', 'combien', 'Combien de places avait le parking ?', 'Il avait quatre cents places.', 'It had four hundred spaces.'),
        ask('Find out why the city made the park.', 'pourquoi', 'Pourquoi la ville a-t-elle créé ce parc ?', 'Pour rafraîchir le quartier pendant les étés de plus en plus chauds.', 'To cool the area during ever hotter summers.'),
        ask('Find out who was worried at first.', 'qui', 'Qui avait peur au début ?', 'Certains commerçants avaient peur de perdre des clients.', 'Some shopkeepers were afraid of losing customers.'),
      ] },
      predict: predict(
        turn('À ton avis, comment sera le quartier dans dix ans ?', 'In your opinion, what will the area be like in ten years?', ['Dans dix ans, le quartier…', 'Je pense que…'], 'Dans dix ans, les arbres seront grands et il fera plus frais. Plus de familles voudront habiter dans le quartier.'),
        turn("Si ta ville voulait supprimer un parking, serais-tu d'accord ?", 'If your town wanted to get rid of a car park, would you agree?', ["Oui, je serais d'accord parce que…", "Non, je ne serais pas d'accord car…"], "Oui, je serais d'accord parce qu'il y a trop de voitures. Mais il faudrait plus de bus pour les gens."),
        ['Moi, je pense que le petit lac deviendra le lieu préféré des familles en été.', "I think the little lake will become families' favourite spot in summer."],
      ),
    },
    b2: {
      journalist: { targets: [
        ask('Find out how much cooler it is.', 'combien', 'De combien de degrés la température baisse-t-elle ?', "Elle peut être jusqu'à quatre degrés plus basse pendant les canicules.", 'It can be up to four degrees lower during heatwaves.'),
        ask('Find out what families do there now.', 'questce', "Qu'est-ce que les familles y font maintenant ?", "Elles pique-niquent à l'ombre des arbres.", 'They picnic in the shade of the trees.'),
        ask('Find out who misses the old car park.', 'qui', "Qui regrette l'ancien parking ?", 'Certains automobilistes regrettent les places disparues.', 'Some drivers miss the lost parking spaces.'),
      ] },
      predict: predict(
        turn("Selon toi, d'autres villes suivront-elles l'exemple de Bordeaux ?", "In your view, will other cities follow Bordeaux's example?", ['À mon avis, elles…', 'Je suppose que…'], "À mon avis, beaucoup de villes suivront cet exemple, car les canicules deviendront plus fréquentes. Elles devront cependant proposer d'autres solutions aux automobilistes."),
        turn("Si tu étais architecte, que construirais-tu à la place d'un parking ?", 'If you were an architect, what would you build instead of a car park?', ["À la place d'un parking, je…", 'Je construirais…'], "Je construirais un jardin partagé où les habitants cultiveraient des légumes. J'ajouterais aussi une piscine naturelle pour l'été."),
        ['Moi, je pense que Bordeaux transformera bientôt un deuxième parking en parc.', 'I think Bordeaux will soon turn a second car park into a park.'],
      ),
    },
  },
};
