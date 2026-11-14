/**
 * « Le journaliste, c'est toi » and « Et après ? » for editions 22–28
 * (daily-news §7). Henri's answers stay true to each level's story; his
 * prediction is a guess, never news. Covered by the story's `reviewed` flag.
 */
import type { NewsReporterSegments } from '../types';
import { ask, predict, turn } from './reporterHelpers';

export const REPORTER_WEEK4: Record<string, NewsReporterSegments> = {
  'robot-fish': {
    a2: {
      journalist: { targets: [
        ask('Find out where the robot fish swims.', 'ou', 'Où nage le poisson robot ?', 'Dans le port de Marseille.', 'In the port of Marseille.'),
        ask('Find out what the robot measures.', 'questce', "Qu'est-ce que le robot mesure ?", "Il mesure la qualité de l'eau.", 'It measures the water quality.'),
        ask('Find out how long it can swim.', 'combien', "Combien d'heures le robot peut-il nager ?", 'Il nage pendant huit heures.', 'It swims for eight hours.'),
      ] },
      predict: predict(
        turn("Qu'est-ce que les ingénieurs vont faire après ?", 'What are the engineers going to do next?', ['Après, ils vont…', "Je pense qu'ils vont…"], "Après, ils vont fabriquer d'autres poissons robots."),
        turn('Tu voudrais voir le poisson robot ? Pourquoi ?', 'Would you like to see the robot fish? Why?', ['Oui, je voudrais…', 'Non, parce que…'], 'Oui, je voudrais le voir parce que les robots sont fascinants.'),
        ["Moi, je pense qu'il va y avoir des poissons robots dans d'autres ports.", 'I think there are going to be robot fish in other ports.'],
      ),
    },
    b1: {
      journalist: { targets: [
        ask('Find out how long the robot is.', 'combien', 'Combien mesure le robot ?', 'Cinquante centimètres.', 'Fifty centimetres.'),
        ask('Find out how the robot swims.', 'comment', 'Comment le robot nage-t-il ?', "Silencieusement, grâce à sa queue qui bouge comme celle d'un vrai poisson.", "Silently, thanks to a tail that moves like a real fish's."),
        ask('Find out where the results go.', 'ou', 'Où vont les résultats ?', 'Ils arrivent en direct sur un ordinateur.', 'They go live to a computer.'),
      ] },
      predict: predict(
        turn("À ton avis, comment ce robot sera-t-il utilisé plus tard ?", 'In your opinion, how will this robot be used later on?', ["Plus tard, on l'utilisera…", 'Je pense que…'], "Plus tard, on l'utilisera dans les rivières et les lacs. Il aidera aussi les scientifiques à étudier les poissons."),
        turn('Si tu pouvais inventer un robot, que ferait-il ?', 'If you could invent a robot, what would it do?', ['Mon robot…', "J'inventerais un robot qui…"], "J'inventerais un robot qui ramasse le plastique sur les plages. Il travaillerait la nuit pendant que les gens dorment."),
        ['Moi, je pense que le port de Marseille sera bientôt plus propre grâce au robot.', 'I think the port of Marseille will soon be cleaner thanks to the robot.'],
      ),
    },
    b2: {
      journalist: { targets: [
        ask('Find out what the researchers would like to build next.', 'questce', "Qu'est-ce que les chercheurs aimeraient créer ?", 'Un banc entier de robots pour surveiller toute la côte.', 'A whole shoal of robots to watch the entire coast.'),
        ask('Find out how quickly it spots pollution.', 'combien', 'En combien de temps repère-t-il une pollution ?', 'En quelques minutes, au lieu de plusieurs jours.', 'In a few minutes, instead of several days.'),
        ask("Find out why it doesn't frighten the wildlife.", 'pourquoi', "Pourquoi le robot n'effraie-t-il pas la faune ?", "Parce qu'il ne fait presque aucun bruit, contrairement aux bateaux à hélices.", 'Because it makes almost no noise, unlike boats with propellers.'),
      ] },
      predict: predict(
        turn('Selon toi, quelles difficultés les chercheurs rencontreront-ils avec un banc de robots ?', 'In your view, what difficulties will the researchers meet with a shoal of robots?', ['Ils devront…', 'Je suppose que…'], 'Ils devront recharger les batteries de tous les robots. Il faudra aussi vérifier que les animaux marins ne sont pas dérangés.'),
        turn('Si tu étais ingénieur, quel animal imiterais-tu pour créer un robot ?', 'If you were an engineer, which animal would you copy to build a robot?', ["J'imiterais…", "Je m'inspirerais de…"], "Je m'inspirerais de l'oiseau pour créer un drone silencieux. Il pourrait surveiller les forêts sans effrayer les animaux."),
        ['Moi, je pense que des bancs de poissons robots surveilleront bientôt toute la côte.', 'I think shoals of robot fish will soon be watching the whole coast.'],
      ),
    },
  },

  'museum-night': {
    a2: {
      journalist: { targets: [
        ask('Find out until when entry is free.', 'quand', "Jusqu'à quand l'entrée est-elle gratuite ?", "Jusqu'à minuit.", 'Until midnight.'),
        ask('Find out what there is in the rooms.', 'questce', "Qu'est-ce qu'il y a dans les salles ?", 'Il y a de la musique et des jeux.', 'There is music and there are games.'),
        ask('Find out which city the museum is in.', 'quel', 'Dans quelle ville est le musée ?', 'À Strasbourg.', 'In Strasbourg.'),
      ] },
      predict: predict(
        turn("Qu'est-ce que les ados vont faire au musée ?", 'What are the teenagers going to do at the museum?', ['Ils vont…', "Je pense qu'ils vont…"], 'Ils vont écouter de la musique et dessiner avec leurs amis.'),
        turn('Tu voudrais aller au musée la nuit ? Pourquoi ?', 'Would you like to go to the museum at night? Why?', ['Oui, je voudrais…', 'Non, parce que…'], "Oui, je voudrais y aller parce que c'est différent et amusant."),
        ["Moi, je pense que beaucoup d'ados vont revenir au musée.", 'I think lots of teenagers are going to come back to the museum.'],
      ),
    },
    b1: {
      journalist: { targets: [
        ask('Find out how often the museum opens at night.', 'combien', 'Combien de fois par mois le musée ouvre-t-il la nuit ?', 'Une fois par mois.', 'Once a month.'),
        ask('Find out who the guides are.', 'qui', 'Qui sont les guides ?', 'Des étudiants, à peine plus âgés que les visiteurs.', 'Students, barely older than the visitors.'),
        ask('Find out what the museum hopes.', 'questce', "Qu'est-ce que le musée espère ?", 'Que les jeunes reviendront en famille ou avec leurs amis.', 'That the young people will come back with family or friends.'),
      ] },
      predict: predict(
        turn("À ton avis, est-ce que d'autres musées feront la même chose ?", 'In your opinion, will other museums do the same?', ['Je pense que oui, parce que…', 'À mon avis…'], "Je pense que oui, parce que c'est une bonne idée pour attirer les jeunes. Il y aura peut-être des nuits au musée partout en France."),
        turn('Si tu organisais une soirée au musée, quelle activité proposerais-tu ?', 'If you organised an evening at the museum, what activity would you suggest?', ['Je proposerais…', "J'organiserais…"], "Je proposerais un concours de selfies avec les tableaux. J'organiserais aussi un concert de rap."),
        ['Moi, je pense que ces soirées seront bientôt complètes chaque mois.', 'I think these evenings will soon be fully booked every month.'],
      ),
    },
    b2: {
      journalist: { targets: [
        ask('Find out why teenagers avoid museums.', 'pourquoi', 'Pourquoi les adolescents vont-ils peu au musée ?', 'Ils les trouvent souvent ennuyeux ou intimidants.', 'They often find them boring or intimidating.'),
        ask('Find out who the evenings are for.', 'qui', 'À qui ces nocturnes sont-elles réservées ?', 'Aux jeunes de treize à dix-huit ans.', 'To young people aged thirteen to eighteen.'),
        ask('Find out what the result has been.', 'quel', 'Quel est le résultat ?', "La plupart des participants disent qu'ils reviendront, parfois en famille.", 'Most participants say they will come back, sometimes with family.'),
      ] },
      predict: predict(
        turn("Selon toi, ces nocturnes changeront-elles vraiment la relation des jeunes avec l'art ?", "In your view, will these late openings really change young people's relationship with art?", ['À mon avis, elles…', 'Je suppose que…'], "À mon avis, elles la changeront pour certains jeunes, qui découvriront qu'un musée peut être vivant. Mais il faudra continuer pendant des années."),
        turn('Si tu dirigeais un musée, comment attirerais-tu les jeunes ?', 'If you ran a museum, how would you attract young people?', ['Pour attirer les jeunes, je…', "J'utiliserais…"], "J'utiliserais les réseaux sociaux pour montrer les œuvres de façon amusante. Je créerais aussi des visites en réalité virtuelle."),
        ['Moi, je pense que le musée ouvrira bientôt une nocturne spéciale pour les familles.', 'I think the museum will soon hold a special late opening for families.'],
      ),
    },
  },

  'cardboard-boats': {
    a2: {
      journalist: { targets: [
        ask('Find out when the race is.', 'quand', 'Quand est la course ?', 'Dimanche, sur un lac.', 'On Sunday, on a lake.'),
        ask('Find out what the teams build their boats with.', 'questce', 'Avec quoi les équipes fabriquent-elles leur bateau ?', 'Avec du carton et du scotch.', 'With cardboard and sticky tape.'),
        ask('Find out what prize the winner gets.', 'quel', 'Quel prix reçoit le gagnant ?', 'Une coupe en carton, bien sûr !', 'A cardboard cup, of course!'),
      ] },
      predict: predict(
        turn("Qu'est-ce qui va se passer pendant la course ?", 'What is going to happen during the race?', ['Pendant la course, …', 'Je pense que…'], 'Pendant la course, beaucoup de bateaux vont couler. Les gens vont rire.'),
        turn('Tu voudrais participer à la course ? Pourquoi ?', 'Would you like to take part in the race? Why?', ['Oui, je voudrais…', 'Non, parce que…'], "Oui, je voudrais participer avec mes amis parce que c'est drôle. Mais l'eau est froide !"),
        ['Moi, je pense que la course va être très drôle et que beaucoup de bateaux vont couler.', 'I think the race is going to be very funny and lots of boats are going to sink.'],
      ),
    },
    b1: {
      journalist: { targets: [
        ask('Find out how many teams took part.', 'combien', "Combien d'équipes ont participé ?", "Une quarantaine d'équipes.", 'About forty teams.'),
        ask('Find out who won the race.', 'qui', 'Qui a gagné la course ?', 'Une équipe de collégiens.', 'A team of secondary school pupils.'),
        ask('Find out what shape the winning boat was.', 'quel', 'Quelle forme avait le bateau gagnant ?', "La forme d'un requin.", 'The shape of a shark.'),
      ] },
      predict: predict(
        turn("À ton avis, comment sera la course l'année prochaine ?", 'In your opinion, what will the race be like next year?', ["L'année prochaine, il y aura…", 'Je pense que…'], "L'année prochaine, il y aura encore plus d'équipes. Les bateaux seront plus originaux."),
        turn('Si tu participais, quelle forme donnerais-tu à ton bateau ?', 'If you took part, what shape would you give your boat?', ['Je ferais un bateau en forme de…', 'Je choisirais…'], 'Je ferais un bateau en forme de dragon. Je le peindrais en vert et en rouge.'),
        ["Moi, je pense que les collégiens essaieront de gagner encore l'année prochaine.", 'I think the pupils will try to win again next year.'],
      ),
    },
    b2: {
      journalist: { targets: [
        ask('Find out what was not allowed.', 'questce', "Qu'est-ce qui était interdit ?", 'Les moteurs, le bois et le plastique.', 'Engines, wood and plastic.'),
        ask('Find out how far the winning boat went.', 'combien', 'Combien de mètres a parcouru le requin ?', "Deux cents mètres, sans prendre l'eau.", 'Two hundred metres, without letting water in.'),
        ask('Find out why the organisers hold the race.', 'pourquoi', 'Pourquoi les organisateurs font-ils cette course ?', 'Pour sensibiliser au recyclage : tout le carton sera récupéré.', 'To raise awareness of recycling: all the cardboard will be collected.'),
      ] },
      predict: predict(
        turn("Selon toi, comment les équipes amélioreront-elles leurs bateaux l'an prochain ?", 'In your view, how will the teams improve their boats next year?', ["Je suppose qu'elles…", 'À mon avis, elles…'], 'À mon avis, elles testeront leurs bateaux dans une piscine avant la course. Elles utiliseront plusieurs couches de carton pour les rendre plus solides.'),
        turn('Si tu organisais cette course, quelle nouvelle règle ajouterais-tu ?', 'If you organised this race, what new rule would you add?', ["J'ajouterais une règle…", "J'obligerais…"], "J'obligerais chaque équipe à utiliser seulement du carton recyclé. J'ajouterais aussi un prix pour le bateau le plus drôle."),
        ["Moi, je pense que le requin aura de sérieux concurrents l'année prochaine.", 'I think the shark will have serious rivals next year.'],
      ),
    },
  },

  'candlemas-crepes': {
    a2: {
      journalist: { targets: [
        ask('Find out what families eat today.', 'questce', "Qu'est-ce que les familles mangent aujourd'hui ?", 'Elles mangent des crêpes.', 'They eat pancakes.'),
        ask('Find out why people hold a coin.', 'pourquoi', "Pourquoi est-ce qu'on tient une pièce ?", "Pour avoir de la chance toute l'année !", 'To have good luck all year!'),
        ask('Find out how people flip the crêpe.', 'comment', 'Comment fait-on sauter la crêpe ?', 'Dans la poêle, avec une pièce dans la main.', 'In the pan, with a coin in your hand.'),
      ] },
      predict: predict(
        turn("Qu'est-ce que tu vas manger ce soir ?", 'What are you going to eat this evening?', ['Ce soir, je vais manger…', 'Je vais…'], 'Ce soir, je vais manger des crêpes au chocolat avec ma famille.'),
        turn('Tu voudrais faire sauter une crêpe ? Pourquoi ?', 'Would you like to flip a crêpe? Why?', ['Oui, je voudrais…', 'Non, parce que…'], "Oui, je voudrais essayer parce que c'est amusant ! Je la mangerais avec du sucre et du citron."),
        ['Moi, je pense que beaucoup de crêpes vont tomber par terre ce soir !', 'I think lots of crêpes are going to land on the floor tonight!'],
      ),
    },
    b1: {
      journalist: { targets: [
        ask('Find out when Candlemas is.', 'quand', "Quand est-ce qu'on fête la Chandeleur ?", 'Le deux février.', 'On the second of February.'),
        ask('Find out what the festival was originally.', 'quel', "Quelle était la fête à l'origine ?", "C'était une fête religieuse des chandelles.", 'It was a religious festival of candles.'),
        ask('Find out what happens if the crêpe lands well.', 'questce', "Qu'est-ce qui se passe si la crêpe retombe bien ?", "On aura de la chance pendant toute l'année.", 'You will have good luck all year.'),
      ] },
      predict: predict(
        turn('À ton avis, comment les jeunes fêteront-ils la Chandeleur dans vingt ans ?', 'In your opinion, how will young people celebrate Candlemas in twenty years?', ['Dans vingt ans, …', "Je pense qu'ils…"], 'Dans vingt ans, ils feront encore des crêpes, mais avec des recettes nouvelles. Ils partageront peut-être leurs crêpes en vidéo.'),
        turn('Si tu ouvrais un stand de crêpes, quelle crêpe inventerais-tu ?', 'If you opened a crêpe stall, what crêpe would you invent?', ["J'inventerais une crêpe…", 'Ma crêpe spéciale serait…'], "J'inventerais une crêpe à la banane et au caramel. Je l'appellerais « la crêpe du bonheur »."),
        ['Moi, je pense que les ventes de crêpes battront un record cette année.', 'I think crêpe sales will break a record this year.'],
      ),
    },
    b2: {
      journalist: { targets: [
        ask('Find out how many days after Christmas it falls.', 'combien', 'Combien de jours après Noël tombe la Chandeleur ?', 'Quarante jours après Noël.', 'Forty days after Christmas.'),
        ask('Find out what the crêpe used to stand for.', 'questce', "Qu'est-ce que la crêpe symbolisait autrefois ?", "Le soleil qui revient après l'hiver.", 'The sun coming back after winter.'),
        ask('Find out how we know the custom is still alive.', 'comment', 'Comment sait-on que la coutume reste vivante ?', "Les ventes de farine et d'œufs bondissent chaque année à cette période.", 'Sales of flour and eggs jump every year at this time.'),
      ] },
      predict: predict(
        turn("Selon toi, la Chandeleur restera-t-elle aussi populaire à l'avenir ?", 'In your view, will Candlemas stay as popular in future?', ['À mon avis, elle…', 'Je suppose que…'], "À mon avis, elle restera populaire, car c'est une fête simple et gourmande. Les familles continueront à transmettre la tradition aux enfants."),
        turn('Si tu devais expliquer la Chandeleur à un ami étranger, que lui dirais-tu ?', 'If you had to explain Candlemas to a friend from abroad, what would you tell them?', ['Je lui dirais que…', 'Je lui expliquerais…'], "Je lui expliquerais que c'est une fête où l'on mange des crêpes en février. Ensuite, je l'inviterais à en faire sauter une avec une pièce."),
        ['Moi, je pense que de plus en plus de pays découvriront la Chandeleur.', 'I think more and more countries will discover Candlemas.'],
      ),
    },
  },

  'april-fish': {
    a2: {
      journalist: { targets: [
        ask("Find out what children stick on people's backs.", 'questce', "Qu'est-ce que les enfants collent dans le dos des gens ?", 'Des poissons en papier.', 'Paper fish.'),
        ask('Find out when this happens.', 'quand', "Quand est-ce qu'on fait ça ?", 'Le premier avril.', 'On the first of April.'),
        ask('Find out who tells false stories too.', 'qui', 'Qui raconte aussi de fausses histoires ?', 'Les journaux.', 'The newspapers.'),
      ] },
      predict: predict(
        turn("Qu'est-ce que tu vas faire le premier avril ?", 'What are you going to do on the first of April?', ['Le premier avril, je vais…', 'Je vais…'], 'Le premier avril, je vais coller un poisson dans le dos de mon frère.'),
        turn('Tu voudrais faire une farce à ton professeur ? Pourquoi ?', 'Would you like to play a trick on your teacher? Why?', ['Oui, je voudrais…', 'Non, parce que…'], "Oui, je voudrais coller un poisson dans son dos parce que c'est drôle. Il va rire, j'espère !"),
        ["Moi, je pense que quelqu'un va coller un poisson dans mon dos aujourd'hui !", 'I think someone is going to stick a fish on my back today!'],
      ),
    },
    b1: {
      journalist: { targets: [
        ask('Find out how children attach the fish.', 'comment', 'Comment les enfants accrochent-ils le poisson ?', 'Discrètement, sans se faire voir.', 'Discreetly, without being seen.'),
        ask('Find out who invents fake news.', 'qui', 'Qui invente des fausses nouvelles ?', 'Les radios et les journaux.', 'Radio stations and newspapers.'),
        ask('Find out how long the tradition may have existed.', 'quand', 'Depuis quand cette tradition existe-t-elle ?', 'Peut-être depuis le seizième siècle.', 'Perhaps since the sixteenth century.'),
      ] },
      predict: predict(
        turn('À ton avis, quelle fausse nouvelle les journaux inventeront-ils cette année ?', 'In your opinion, what fake story will the papers invent this year?', ["Je pense qu'ils diront que…", 'Cette année, ils inventeront…'], "Je pense qu'ils diront que la tour Eiffel va déménager à Londres. Beaucoup de gens y croiront !"),
        turn('Si tu étais journaliste, quelle fausse nouvelle inventerais-tu ?', 'If you were a journalist, what fake story would you invent?', ["J'inventerais que…", 'Je dirais que…'], "J'inventerais que les écoles fermeront tous les lundis à partir de demain. Tous les élèves seraient contents !"),
        ["Moi, je pense que beaucoup d'auditeurs vont croire une fausse nouvelle aujourd'hui.", 'I think lots of listeners are going to believe a fake story today.'],
      ),
    },
    b2: {
      journalist: { targets: [
        ask('Find out where some fake stories are taken seriously.', 'ou', 'Où certaines fausses nouvelles sont-elles prises au sérieux ?', 'Sur les réseaux sociaux.', 'On social media.'),
        ask('Find out what you should do before sharing.', 'questce', "Qu'est-ce qu'il faut faire avant de partager une information ?", 'Vérifier la source.', 'Check the source.'),
        ask('Find out who ends up with fish on their backs.', 'qui', 'Qui se retrouve avec un poisson dans le dos ?', 'Les élèves, mais aussi les professeurs !', 'The pupils, but the teachers too!'),
      ] },
      predict: predict(
        turn("Selon toi, sera-t-il plus difficile de repérer les fausses informations à l'avenir ?", 'In your view, will it be harder to spot fake news in future?', ['À mon avis, ce sera…', 'Je suppose que…'], "À mon avis, ce sera plus difficile, car les fausses images seront très réalistes. Il faudra apprendre à vérifier les sources dès l'école."),
        turn('Si un ami partageait une fausse nouvelle, que ferais-tu ?', 'If a friend shared a fake story, what would you do?', ['Je lui dirais…', 'Je lui montrerais…'], 'Je lui montrerais gentiment comment vérifier la source. Je ne me moquerais pas de lui, car tout le monde peut se tromper.'),
        ["Moi, je pense qu'une fausse nouvelle très drôle fera le tour des réseaux aujourd'hui.", 'I think a very funny fake story will go round social media today.'],
      ),
    },
  },

  'music-day': {
    a2: {
      journalist: { targets: [
        ask('Find out where the musicians play.', 'ou', 'Où jouent les musiciens ?', 'Dans la rue, dans toutes les villes.', 'In the street, in every town.'),
        ask('Find out how much the concerts cost.', 'combien', 'Combien coûtent les concerts ?', 'Rien : les concerts sont gratuits.', 'Nothing: the concerts are free.'),
        ask('Find out until when people dance.', 'quand', "Jusqu'à quand les gens dansent-ils ?", "Jusqu'à minuit.", 'Until midnight.'),
      ] },
      predict: predict(
        turn("Qu'est-ce que tu vas faire ce soir ?", 'What are you going to do this evening?', ['Ce soir, je vais…', 'Je vais…'], 'Ce soir, je vais écouter des concerts avec mes amis. On va danser !'),
        turn('Tu voudrais jouer dans la rue ? Pourquoi ?', 'Would you like to play in the street? Why?', ['Oui, je voudrais…', 'Non, je préfère…'], "Oui, je voudrais jouer de la guitare avec mon frère parce que j'adore la musique."),
        ['Moi, je pense que les rues vont être pleines de musique ce soir.', 'I think the streets are going to be full of music tonight.'],
      ),
    },
    b1: {
      journalist: { targets: [
        ask('Find out when the festival was created.', 'quand', 'Quand la Fête de la musique a-t-elle été créée ?', 'En mille neuf cent quatre-vingt-deux.', 'In nineteen eighty-two.'),
        ask('Find out who can play.', 'qui', 'Qui peut jouer ?', 'Tous les musiciens, amateurs ou professionnels.', 'All musicians, amateur or professional.'),
        ask('Find out how many countries celebrate it.', 'combien', 'Dans combien de pays la fête existe-t-elle ?', 'Dans plus de cent vingt pays.', 'In more than a hundred and twenty countries.'),
      ] },
      predict: predict(
        turn('À ton avis, comment se passera la fête ce soir dans ta ville ?', 'In your opinion, how will the festival go in your town tonight?', ['Ce soir, il y aura…', 'Je pense que…'], "Ce soir, il y aura des concerts sur la place. Les gens danseront jusqu'à minuit."),
        turn('Si tu pouvais jouer ce soir, quelle musique jouerais-tu ?', 'If you could play tonight, what music would you play?', ['Je jouerais…', 'Je chanterais…'], "Je jouerais du piano, de la musique pop. J'inviterais mes amis à chanter avec moi."),
        ['Moi, je pense que la fête existera bientôt dans encore plus de pays.', 'I think the festival will soon exist in even more countries.'],
      ),
    },
    b2: {
      journalist: { targets: [
        ask('Find out what idea the festival is based on.', 'quel', 'Sur quelle idée repose la fête ?', 'La musique doit sortir des salles de concert et appartenir à tous.', 'Music should leave concert halls and belong to everyone.'),
        ask('Find out where the idea has been copied.', 'ou', 'Où le principe a-t-il été copié ?', 'Dans plus de cent vingt pays, de Tokyo à Buenos Aires.', 'In more than a hundred and twenty countries, from Tokyo to Buenos Aires.'),
        ask('Find out why young musicians like it.', 'pourquoi', 'Pourquoi les jeunes musiciens aiment-ils cette fête ?', "C'est souvent leur première chance de jouer devant un vrai public.", 'It is often their first chance to play to a real audience.'),
      ] },
      predict: predict(
        turn('Selon toi, comment la Fête de la musique évoluera-t-elle ?', 'In your view, how will the Fête de la musique develop?', ['À mon avis, elle…', 'Je suppose que…'], 'À mon avis, elle accueillera de plus en plus de musiques du monde. Certains concerts seront peut-être retransmis en ligne.'),
        turn('Si tu organisais la fête dans ta ville, comment aiderais-tu les jeunes musiciens ?', 'If you organised the festival in your town, how would you help young musicians?', ['Je leur prêterais…', 'Je créerais…'], 'Je créerais une scène réservée aux jeunes groupes. Je leur prêterais aussi du matériel de son.'),
        ["Moi, je pense qu'un jeune groupe découvert ce soir deviendra célèbre.", 'I think a young band discovered tonight will become famous.'],
      ),
    },
  },

  'bastille-day': {
    a2: {
      journalist: { targets: [
        ask('Find out when there are fireworks.', 'quand', "Quand est-ce qu'il y a des feux d'artifice ?", 'Le soir.', 'In the evening.'),
        ask('Find out where people watch them in Paris.', 'ou', "Où regarde-t-on les feux d'artifice à Paris ?", 'Près de la tour Eiffel.', 'Near the Eiffel Tower.'),
        ask('Find out what people do in the villages.', 'questce', "Qu'est-ce qu'on fait dans les villages ?", 'On danse au bal des pompiers.', "People dance at the firefighters' ball."),
      ] },
      predict: predict(
        turn("Qu'est-ce que tu vas faire ce soir ?", 'What are you going to do this evening?', ['Ce soir, je vais…', 'Je vais…'], "Ce soir, je vais regarder le feu d'artifice avec ma famille."),
        turn('Tu voudrais aller au bal des pompiers ? Pourquoi ?', "Would you like to go to the firefighters' ball? Why?", ['Oui, je voudrais…', 'Non, parce que…'], "Oui, je voudrais y aller parce que j'aime danser."),
        ["Moi, je pense que le feu d'artifice de Paris va être magnifique ce soir.", 'I think the Paris fireworks are going to be magnificent tonight.'],
      ),
    },
    b1: {
      journalist: { targets: [
        ask('Find out what the national holiday commemorates.', 'questce', "Qu'est-ce que la fête nationale rappelle ?", 'La prise de la Bastille, en mille sept cent quatre-vingt-neuf.', 'The storming of the Bastille, in seventeen eighty-nine.'),
        ask('Find out which fireworks are the most famous.', 'quel', "Quel feu d'artifice est le plus célèbre ?", 'Celui de la tour Eiffel.', 'The one at the Eiffel Tower.'),
        ask("Find out why most people don't work.", 'pourquoi', 'Pourquoi la plupart des gens ne travaillent-ils pas ?', "Parce que c'est un jour férié.", "Because it's a public holiday."),
      ] },
      predict: predict(
        turn('À ton avis, comment les Français fêteront-ils le quatorze juillet dans cinquante ans ?', 'In your opinion, how will the French celebrate the fourteenth of July in fifty years?', ['Dans cinquante ans, …', "Je pense qu'ils…"], "Dans cinquante ans, il y aura peut-être des spectacles de drones à la place des feux d'artifice. Mais les bals existeront encore."),
        turn("Si tu passais le quatorze juillet en France, qu'est-ce que tu ferais ?", 'If you spent the fourteenth of July in France, what would you do?', ['Je regarderais…', "J'irais…"], "J'irais à Paris pour voir le feu d'artifice près de la tour Eiffel. Ensuite, je danserais au bal des pompiers."),
        ["Moi, je pense que le bal des pompiers va durer jusqu'au matin !", "I think the firefighters' ball is going to go on until morning!"],
      ),
    },
    b2: {
      journalist: { targets: [
        ask('Find out which values the day celebrates.', 'quel', 'Quelles valeurs ce jour célèbre-t-il ?', 'Les valeurs de la République : liberté, égalité, fraternité.', 'The values of the Republic: liberty, equality, fraternity.'),
        ask("Find out where the firefighters' balls take place.", 'ou', 'Où ont lieu les bals des pompiers ?', 'Dans les casernes.', 'In the fire stations.'),
        ask('Find out why the balls matter for firefighters.', 'pourquoi', 'Pourquoi les bals sont-ils importants pour les pompiers ?', 'Ils permettent de financer leurs œuvres sociales.', 'They help fund their charity work.'),
      ] },
      predict: predict(
        turn('Selon toi, le quatorze juillet gardera-t-il la même importance pour les jeunes ?', 'In your view, will the fourteenth of July stay as important for young people?', ['À mon avis, il…', 'Je suppose que…'], "À mon avis, il gardera son importance, car c'est surtout une grande fête populaire. Les jeunes s'intéresseront peut-être moins à l'histoire, mais ils viendront danser."),
        turn("Si tu vivais à l'étranger, comment fêterais-tu ta fête nationale ?", 'If you lived abroad, how would you celebrate your national day?', ['Je la fêterais…', "J'inviterais…"], "J'inviterais des amis pour leur faire goûter des plats de mon pays. Nous regarderions aussi les célébrations en direct sur internet."),
        ["Moi, je pense que des millions de personnes regarderont le feu d'artifice en direct, partout dans le monde.", 'I think millions of people will watch the fireworks live, all over the world.'],
      ),
    },
  },
};
