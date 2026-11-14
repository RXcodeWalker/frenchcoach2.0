/**
 * Daily News bank, editions 8–14. Hand-written (daily-news §1); `reviewed: false`
 * until a French speaker has checked every level (content-authoring §16).
 */
import type { NewsEdition } from '../types';

export const WEEK2: NewsEdition[] = [
  {
    id: 'sea-turtles', topicArea: 'animals', emoji: '🐢', reviewed: false,
    levels: {
      a2: {
        headline: 'Les tortues reviennent en Corse',
        sentences: [
          { fr: 'Des tortues de mer sont revenues sur une plage en Corse.', en: 'Sea turtles have come back to a beach in Corsica.' },
          { fr: 'Une tortue a pondu cent œufs dans le sable.', en: 'One turtle laid a hundred eggs in the sand.' },
          { fr: 'Des volontaires surveillent la plage jour et nuit.', en: 'Volunteers watch the beach day and night.' },
          { fr: 'Les touristes ne peuvent pas marcher près du nid.', en: 'Tourists cannot walk near the nest.' },
        ],
        glossary: [
          { fr: 'tortues de mer', en: 'sea turtles' }, { fr: 'pondu', en: 'laid (eggs)' }, { fr: 'œufs', en: 'eggs' },
          { fr: 'volontaires', en: 'volunteers' }, { fr: 'nid', en: 'nest' },
        ],
        facts: [
          { id: 'back', en: 'Sea turtles came back to a beach in Corsica.', sentence: 0, cues: [['tortue*'], ['corse', 'plage']] },
          { id: 'eggs', en: 'A turtle laid 100 eggs.', sentence: 1, cues: [['oeuf*'], ['cent', 'pondu', 'sable']] },
          { id: 'volunteers', en: 'Volunteers watch the beach day and night.', sentence: 2, cues: [['volontaire*', 'benevole*'], ['surveill*', 'nuit', 'jour']] },
          { id: 'tourists', en: 'Tourists cannot go near the nest.', sentence: 3, cues: [['touriste*'], ['nid', 'pres']] },
        ],
        check: [
          { q: 'Where did the turtles come back to?', options: ['A beach in Corsica', 'A lake in the Alps', 'A beach in Normandy'], answer: 0, sentence: 0 },
          { q: 'How many eggs did the turtle lay?', options: ['Ten', 'A hundred', 'A thousand'], answer: 1, sentence: 1 },
          { q: 'What can tourists not do?', options: ['Swim', 'Walk near the nest', 'Take photos'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Quel animal tu voudrais protéger ? Pourquoi ?', en: 'Which animal would you like to protect? Why?' },
        starters: ['Je voudrais protéger… parce que…', "J'aime beaucoup… car…"],
        modelRetell: 'Des tortues de mer sont revenues sur une plage en Corse. Une tortue a pondu cent œufs. Des volontaires surveillent la plage jour et nuit, et les touristes ne peuvent pas aller près du nid.',
      },
      b1: {
        headline: 'Une plage corse protège ses tortues',
        sentences: [
          { fr: "Pour la première fois depuis dix ans, une tortue marine est venue pondre sur une plage corse.", en: 'For the first time in ten years, a sea turtle has come to lay eggs on a Corsican beach.' },
          { fr: 'Elle a déposé une centaine d\'œufs dans le sable, la nuit, sans être dérangée.', en: 'She laid about a hundred eggs in the sand, at night, without being disturbed.' },
          { fr: 'Depuis, une équipe de volontaires protège le nid avec une petite barrière.', en: 'Since then, a team of volunteers has been protecting the nest with a small fence.' },
          { fr: 'Les bébés tortues devraient sortir dans environ deux mois et rejoindre la mer.', en: 'The baby turtles should come out in about two months and head for the sea.' },
        ],
        glossary: [
          { fr: 'tortue marine', en: 'sea turtle' }, { fr: 'pondre', en: 'to lay eggs' }, { fr: 'dérangée', en: 'disturbed' },
          { fr: 'barrière', en: 'fence' }, { fr: 'rejoindre', en: 'to reach' },
        ],
        facts: [
          { id: 'first', en: 'A sea turtle laid eggs on a Corsican beach, a first in ten years.', sentence: 0, cues: [['tortue*'], ['corse', 'plage'], ['dix ans', 'premiere fois', 'pondre', 'pondu']] },
          { id: 'eggs', en: 'About a hundred eggs, laid at night.', sentence: 1, cues: [['oeuf*'], ['centaine', 'cent', 'nuit']] },
          { id: 'fence', en: 'Volunteers protect the nest with a small fence.', sentence: 2, cues: [['volontaire*', 'benevole*'], ['nid', 'barriere', 'protege*']] },
          { id: 'babies', en: 'The babies should hatch in about two months.', sentence: 3, cues: [['bebe*', 'petit*'], ['deux mois', 'mer']] },
        ],
        check: [
          { q: 'How long since a turtle last laid eggs there?', options: ['Two years', 'Ten years', 'Fifty years'], answer: 1, sentence: 0 },
          { q: 'How do the volunteers protect the nest?', options: ['With a small fence', 'With cameras', 'By moving the eggs'], answer: 0, sentence: 2 },
          { q: 'When should the babies come out?', options: ['In two weeks', 'In about two months', 'Next year'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Les plages devraient-elles être fermées pour protéger les animaux ? Pourquoi ?', en: 'Should beaches be closed to protect animals? Why?' },
        starters: ['Oui, je pense que…', 'Non, mais on pourrait…', "C'est important parce que…"],
        modelRetell: "Pour la première fois depuis dix ans, une tortue est venue pondre sur une plage corse. Elle a déposé une centaine d'œufs la nuit. Des volontaires protègent le nid avec une barrière, et les bébés devraient sortir dans deux mois.",
      },
      b2: {
        headline: 'Le retour des tortues, signe d\'une mer plus chaude',
        sentences: [
          { fr: "Le retour d'une tortue marine sur une plage corse réjouit les biologistes, mais il les interroge aussi.", en: 'The return of a sea turtle to a Corsican beach delights biologists, but it also raises questions for them.' },
          { fr: "Ces animaux pondaient autrefois plus au sud, et leur présence pourrait s'expliquer par le réchauffement de la Méditerranée.", en: 'These animals used to lay eggs further south, and their presence could be explained by the warming of the Mediterranean.' },
          { fr: "Pour protéger la centaine d'œufs enfouis dans le sable, des bénévoles se relaient jour et nuit.", en: 'To protect the hundred or so eggs buried in the sand, volunteers take turns day and night.' },
          { fr: "Ils demandent aussi aux vacanciers d'éteindre les lumières la nuit, car elles désorientent les jeunes tortues.", en: 'They also ask holidaymakers to switch off lights at night, because they confuse the young turtles.' },
        ],
        glossary: [
          { fr: 'réjouit', en: 'delights' }, { fr: 'autrefois', en: 'in the past' }, { fr: 'réchauffement', en: 'warming' },
          { fr: 'enfouis', en: 'buried' }, { fr: 'se relaient', en: 'take turns' }, { fr: 'désorientent', en: 'confuse, disorient' },
        ],
        facts: [
          { id: 'return', en: 'A sea turtle returned to a Corsican beach.', sentence: 0, cues: [['tortue*'], ['corse', 'plage']] },
          { id: 'warming', en: 'This may be because the Mediterranean is warming.', sentence: 1, cues: [['rechauffement', 'chaud*', 'temperature'], ['mediterranee', 'mer']] },
          { id: 'volunteers', en: 'Volunteers guard the hundred or so eggs day and night.', sentence: 2, cues: [['benevole*', 'volontaire*'], ['oeuf*', 'nuit', 'relai*']] },
          { id: 'lights', en: 'Holidaymakers must switch off lights, which confuse the young turtles.', sentence: 3, cues: [['lumiere*'], ['eteindre', 'desoriente*', 'nuit']] },
        ],
        check: [
          { q: 'Why might the turtle have come to Corsica?', options: ['The Mediterranean is warming', 'There are fewer tourists', 'It was lost in a storm'], answer: 0, sentence: 1 },
          { q: 'What do the volunteers do?', options: ['Move the eggs', 'Take turns guarding day and night', 'Feed the turtles'], answer: 1, sentence: 2 },
          { q: 'Why must lights be switched off?', options: ['To save energy', 'They confuse the young turtles', 'They attract insects'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Le tourisme est-il compatible avec la protection de la nature ? Justifie ta réponse.', en: 'Is tourism compatible with protecting nature? Justify your answer.' },
        starters: ['Je crois que oui, à condition que…', 'Le tourisme menace souvent… parce que…', "L'exemple de cette plage montre que…"],
        modelRetell: "Une tortue marine est revenue sur une plage corse, peut-être à cause du réchauffement de la Méditerranée. Des bénévoles protègent la centaine d'œufs jour et nuit. Ils demandent aux vacanciers d'éteindre les lumières, qui désorientent les jeunes tortues.",
      },
    },
  },
  {
    id: 'book-swap-app', topicArea: 'tech', emoji: '📱', reviewed: false,
    levels: {
      a2: {
        headline: 'Une appli pour échanger des livres',
        sentences: [
          { fr: 'Trois lycéens ont créé une application.', en: 'Three high-school students have created an app.' },
          { fr: 'Avec cette appli, les élèves échangent leurs livres de classe.', en: 'With this app, pupils swap their school books.' },
          { fr: "C'est simple et on ne paie rien.", en: "It's simple and you pay nothing." },
          { fr: 'Déjà cinq cents élèves utilisent l\'appli à Toulouse.', en: 'Already five hundred pupils use the app in Toulouse.' },
        ],
        glossary: [
          { fr: 'lycéens', en: 'high-school students' }, { fr: 'application', en: 'app' }, { fr: 'échangent', en: 'swap' },
          { fr: 'livres de classe', en: 'school books' }, { fr: 'paie', en: 'pay' },
        ],
        facts: [
          { id: 'created', en: 'Three students created an app.', sentence: 0, cues: [['lyceen*', 'eleve*', 'trois'], ['appli*']] },
          { id: 'swap', en: 'Pupils swap their school books with it.', sentence: 1, cues: [['echange*', 'donne*'], ['livre*']] },
          { id: 'free', en: "It's simple and free.", sentence: 2, cues: [['rien', 'gratuit*'], ['paie', 'payer', 'simple']] },
          { id: 'users', en: '500 pupils in Toulouse already use it.', sentence: 3, cues: [['cinq cents'], ['toulouse', 'eleve*', 'utilise*']] },
        ],
        check: [
          { q: 'Who created the app?', options: ['Three teachers', 'Three high-school students', 'A big company'], answer: 1, sentence: 0 },
          { q: 'What do pupils swap?', options: ['Clothes', 'School books', 'Video games'], answer: 1, sentence: 1 },
          { q: 'How many pupils use it?', options: ['50', '500', '5,000'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Tu préfères les livres en papier ou sur un écran ? Pourquoi ?', en: 'Do you prefer paper books or books on a screen? Why?' },
        starters: ['Je préfère… parce que…', 'Sur un écran, c\'est…'],
        modelRetell: "Trois lycéens ont créé une application. Avec l'appli, les élèves échangent leurs livres de classe. C'est simple et on ne paie rien. Déjà cinq cents élèves l'utilisent à Toulouse.",
      },
      b1: {
        headline: 'Des lycéens inventent une appli anti-gaspillage',
        sentences: [
          { fr: 'Fatigués de voir des manuels scolaires finir à la poubelle, trois lycéens toulousains ont créé une application.', en: 'Tired of seeing textbooks end up in the bin, three high-school students from Toulouse have created an app.' },
          { fr: 'Elle permet aux élèves de donner ou d\'échanger leurs livres à la fin de l\'année.', en: 'It lets pupils give away or swap their books at the end of the year.' },
          { fr: 'Le service est gratuit et fonctionne grâce à une carte des établissements de la ville.', en: "The service is free and works with a map of the town's schools." },
          { fr: 'En six mois, plus de deux mille livres ont trouvé un nouveau propriétaire.', en: 'In six months, more than two thousand books have found a new owner.' },
        ],
        glossary: [
          { fr: 'manuels scolaires', en: 'textbooks' }, { fr: 'poubelle', en: 'bin' }, { fr: 'toulousains', en: 'from Toulouse' },
          { fr: 'établissements', en: 'schools' }, { fr: 'propriétaire', en: 'owner' },
        ],
        facts: [
          { id: 'app', en: 'Three Toulouse students created an app.', sentence: 0, cues: [['lyceen*', 'eleve*', 'trois'], ['appli*']] },
          { id: 'swap', en: 'Pupils give away or swap their books at the end of the year.', sentence: 1, cues: [['echange*', 'donne*'], ['livre*', 'manuel*']] },
          { id: 'free', en: 'The service is free and uses a map of schools.', sentence: 2, cues: [['gratuit*'], ['carte', 'service']] },
          { id: 'two-thousand', en: 'Over 2,000 books found a new owner in six months.', sentence: 3, cues: [['deux mille'], ['livre*', 'six mois']] },
        ],
        check: [
          { q: 'Why did they create the app?', options: ['Textbooks were ending up in the bin', 'Books were too expensive to print', 'Their school asked them'], answer: 0, sentence: 0 },
          { q: 'What does the app use?', options: ["A map of the town's schools", 'A video chat', 'A points system'], answer: 0, sentence: 2 },
          { q: 'How many books found a new owner?', options: ['About 200', 'Over 2,000', 'Over 20,000'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Est-ce que tu donnes ou vends les choses que tu n\'utilises plus ? Pourquoi ?', en: "Do you give away or sell things you don't use any more? Why?" },
        starters: ["D'habitude, je… parce que…", "Je trouve qu'il vaut mieux… car…", "C'est dommage de jeter…"],
        modelRetell: "Trois lycéens toulousains ont créé une application. Les élèves peuvent donner ou échanger leurs livres à la fin de l'année. Le service est gratuit et utilise une carte des établissements. En six mois, plus de deux mille livres ont trouvé un nouveau propriétaire.",
      },
      b2: {
        headline: 'Une appli lycéenne qui séduit la région',
        sentences: [
          { fr: 'Chaque été, des milliers de manuels scolaires en parfait état sont jetés, alors que d\'autres familles doivent les acheter.', en: 'Every summer, thousands of textbooks in perfect condition are thrown away, while other families have to buy them.' },
          { fr: 'Partis de ce constat, trois lycéens toulousains ont conçu une application gratuite qui met en relation ceux qui donnent et ceux qui cherchent.', en: 'Starting from this observation, three high-school students from Toulouse designed a free app that connects those who give with those who are looking.' },
          { fr: 'Plus de deux mille livres ont déjà changé de main en six mois.', en: 'More than two thousand books have already changed hands in six months.' },
          { fr: 'Séduite, la région envisage désormais de financer le projet pour l\'étendre à tous ses lycées.', en: 'Won over, the region is now considering funding the project to extend it to all its high schools.' },
        ],
        glossary: [
          { fr: 'en parfait état', en: 'in perfect condition' }, { fr: 'constat', en: 'observation' }, { fr: 'conçu', en: 'designed' },
          { fr: 'met en relation', en: 'connects' }, { fr: 'séduite', en: 'won over' }, { fr: "l'étendre", en: 'to extend it' },
        ],
        facts: [
          { id: 'waste', en: 'Thousands of good textbooks are thrown away every summer.', sentence: 0, cues: [['manuel*', 'livre*'], ['jete*', 'poubelle', 'milliers']] },
          { id: 'app', en: 'Three Toulouse students designed a free app.', sentence: 1, cues: [['appli*'], ['lyceen*', 'gratuit*', 'trois']] },
          { id: 'two-thousand', en: 'Over 2,000 books changed hands in six months.', sentence: 2, cues: [['deux mille'], ['livre*', 'six mois']] },
          { id: 'region', en: 'The region may fund it for all its high schools.', sentence: 3, cues: [['region'], ['financer', 'lycees', 'etendre']] },
        ],
        check: [
          { q: 'What is the problem every summer?', options: ['Good textbooks are thrown away', 'Schools close early', 'Books arrive late'], answer: 0, sentence: 0 },
          { q: 'What does the app do?', options: ['Sells books online', 'Connects givers with seekers', 'Prints new books'], answer: 1, sentence: 1 },
          { q: 'What is the region considering?', options: ['Banning the app', 'Funding it for all high schools', 'Buying new textbooks'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Les jeunes peuvent-ils vraiment changer les choses avec la technologie ? Justifie ta réponse.', en: 'Can young people really change things with technology? Justify your answer.' },
        starters: ['Cet exemple prouve que…', 'Cependant, sans aide…', "J'estime que les jeunes…"],
        modelRetell: "Chaque été, des milliers de manuels scolaires sont jetés. Trois lycéens toulousains ont donc conçu une application gratuite pour les donner. Plus de deux mille livres ont changé de main en six mois, et la région envisage de financer le projet dans tous ses lycées.",
      },
    },
  },
  {
    id: 'marathon-grandmother', topicArea: 'people', emoji: '🏃‍♀️', reviewed: false,
    levels: {
      a2: {
        headline: 'Une grand-mère court un marathon',
        sentences: [
          { fr: 'Jeanne a quatre-vingts ans et elle adore courir.', en: 'Jeanne is eighty and she loves running.' },
          { fr: 'Dimanche, elle a fini le marathon de Lyon.', en: 'On Sunday, she finished the Lyon marathon.' },
          { fr: 'Elle a couru pendant six heures.', en: 'She ran for six hours.' },
          { fr: 'Ses petits-enfants l\'ont attendue à l\'arrivée avec des fleurs.', en: 'Her grandchildren waited for her at the finish with flowers.' },
        ],
        glossary: [
          { fr: 'courir', en: 'to run' }, { fr: 'fini', en: 'finished' }, { fr: 'petits-enfants', en: 'grandchildren' }, { fr: 'arrivée', en: 'finish line' },
        ],
        facts: [
          { id: 'age', en: 'Jeanne is 80 and loves running.', sentence: 0, cues: [['jeanne', 'grand mere'], ['quatre vingts', 'ans']] },
          { id: 'marathon', en: 'She finished the Lyon marathon.', sentence: 1, cues: [['marathon'], ['lyon', 'fini']] },
          { id: 'hours', en: 'She ran for six hours.', sentence: 2, cues: [['six'], ['heure*']] },
          { id: 'flowers', en: 'Her grandchildren met her with flowers.', sentence: 3, cues: [['petits enfants', 'famille'], ['fleur*', 'arrivee']] },
        ],
        check: [
          { q: 'How old is Jeanne?', options: ['60', '80', '90'], answer: 1, sentence: 0 },
          { q: 'How long did she run?', options: ['Two hours', 'Four hours', 'Six hours'], answer: 2, sentence: 2 },
          { q: 'Who waited for her?', options: ['Her grandchildren', 'Her doctor', 'A TV crew'], answer: 0, sentence: 3 },
        ],
        opinion: { fr: 'Tu aimes faire du sport ? Quel sport et pourquoi ?', en: 'Do you like doing sport? Which sport and why?' },
        starters: ["J'aime… parce que…", 'Je fais du… car…'],
        modelRetell: "Jeanne a quatre-vingts ans. Elle a fini le marathon de Lyon. Elle a couru pendant six heures, et ses petits-enfants l'ont attendue à l'arrivée avec des fleurs.",
      },
      b1: {
        headline: 'À 80 ans, Jeanne termine son premier marathon',
        sentences: [
          { fr: 'Jeanne, quatre-vingts ans, a terminé le marathon de Lyon sous les applaudissements.', en: 'Jeanne, eighty, finished the Lyon marathon to applause.' },
          { fr: 'Elle a commencé à courir il y a seulement cinq ans, après sa retraite.', en: 'She started running only five years ago, after she retired.' },
          { fr: 'Elle s\'entraîne trois fois par semaine avec un club de son quartier.', en: 'She trains three times a week with a club in her neighbourhood.' },
          { fr: 'Son secret ? « Ne jamais se comparer aux autres et toujours prendre du plaisir. »', en: 'Her secret? "Never compare yourself with others and always enjoy it."' },
        ],
        glossary: [
          { fr: 'applaudissements', en: 'applause' }, { fr: 'retraite', en: 'retirement' }, { fr: "s'entraîne", en: 'trains' },
          { fr: 'se comparer', en: 'to compare oneself' }, { fr: 'plaisir', en: 'enjoyment' },
        ],
        facts: [
          { id: 'finished', en: 'Jeanne, 80, finished the Lyon marathon.', sentence: 0, cues: [['jeanne'], ['marathon'], ['quatre vingts', 'lyon']] },
          { id: 'started', en: 'She started running five years ago, after retiring.', sentence: 1, cues: [['cinq ans'], ['retraite', 'commence*']] },
          { id: 'training', en: 'She trains three times a week with a club.', sentence: 2, cues: [['entraine*', 'club'], ['trois fois', 'semaine']] },
          { id: 'secret', en: 'Her secret: never compare yourself and enjoy it.', sentence: 3, cues: [['compar*', 'autres'], ['plaisir', 'jamais']] },
        ],
        check: [
          { q: 'When did Jeanne start running?', options: ['When she was young', 'Five years ago, after retiring', 'Last year'], answer: 1, sentence: 1 },
          { q: 'How often does she train?', options: ['Every day', 'Three times a week', 'Once a month'], answer: 1, sentence: 2 },
          { q: 'What is her secret?', options: ['Eating pasta', 'Never comparing herself with others', 'Running at night'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: "Penses-tu qu'on peut commencer un nouveau sport à tout âge ? Pourquoi ?", en: 'Do you think you can start a new sport at any age? Why?' },
        starters: ['Oui, je pense que…', "Ça dépend, parce que…", "L'exemple de Jeanne montre que…"],
        modelRetell: "Jeanne, quatre-vingts ans, a terminé le marathon de Lyon. Elle a commencé à courir il y a cinq ans, après sa retraite. Elle s'entraîne trois fois par semaine avec un club. Son secret : ne jamais se comparer aux autres et prendre du plaisir.",
      },
      b2: {
        headline: '« On n\'est jamais trop vieux pour courir »',
        sentences: [
          { fr: 'Six heures d\'effort et quarante-deux kilomètres : à quatre-vingts ans, Jeanne a bouclé le marathon de Lyon, devenant la doyenne de la course.', en: 'Six hours of effort and forty-two kilometres: at eighty, Jeanne completed the Lyon marathon, becoming the oldest runner in the race.' },
          { fr: 'Cette ancienne institutrice ne courait jamais avant sa retraite, qu\'elle a prise il y a cinq ans.', en: 'This former primary teacher never ran before her retirement, which she took five years ago.' },
          { fr: 'Elle affirme que le sport lui a surtout permis de rencontrer des gens et de garder le moral.', en: 'She says that sport has above all allowed her to meet people and stay positive.' },
          { fr: 'Son prochain objectif : convaincre ses amies de la rejoindre pour une course de dix kilomètres.', en: 'Her next goal: to persuade her friends to join her for a ten-kilometre race.' },
        ],
        glossary: [
          { fr: 'bouclé', en: 'completed' }, { fr: 'doyenne', en: 'oldest participant' }, { fr: 'institutrice', en: 'primary-school teacher' },
          { fr: 'garder le moral', en: 'to stay positive' }, { fr: 'convaincre', en: 'to persuade' },
        ],
        facts: [
          { id: 'oldest', en: 'At 80, Jeanne completed the Lyon marathon as its oldest runner.', sentence: 0, cues: [['jeanne'], ['marathon'], ['quatre vingts', 'doyenne']] },
          { id: 'never-ran', en: 'A former teacher, she never ran before retiring five years ago.', sentence: 1, cues: [['retraite', 'institutrice'], ['cinq ans', 'jamais']] },
          { id: 'people', en: 'Sport helped her meet people and stay positive.', sentence: 2, cues: [['rencontr*', 'gens'], ['moral', 'sport']] },
          { id: 'next', en: 'Next she wants her friends to run 10 km with her.', sentence: 3, cues: [['amie*'], ['dix kilometres', 'course', 'convaincre']] },
        ],
        check: [
          { q: 'What was Jeanne\'s job?', options: ['Nurse', 'Primary teacher', 'Baker'], answer: 1, sentence: 1 },
          { q: 'What has sport mainly given her?', options: ['Medals', 'New friends and a good mood', 'Money'], answer: 1, sentence: 2 },
          { q: 'What is her next goal?', options: ['Another marathon', 'A 10 km race with her friends', 'Coaching children'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Le sport est-il plus important pour la santé physique ou pour le moral ? Justifie ta réponse.', en: 'Is sport more important for physical health or for morale? Justify your answer.' },
        starters: ['Selon moi, le plus important, c\'est… car…', 'Les deux sont liés puisque…', 'Pour les personnes âgées en particulier…'],
        modelRetell: "À quatre-vingts ans, Jeanne a bouclé le marathon de Lyon, comme doyenne de la course. Cette ancienne institutrice ne courait jamais avant sa retraite, il y a cinq ans. Le sport l'aide à rencontrer des gens et à garder le moral. Maintenant, elle veut convaincre ses amies de faire une course de dix kilomètres.",
      },
    },
  },
  {
    id: 'night-train', topicArea: 'travel', emoji: '🚆', reviewed: false,
    levels: {
      a2: {
        headline: 'Le train de nuit est de retour',
        sentences: [
          { fr: 'Un train de nuit va de Paris à Berlin.', en: 'A night train goes from Paris to Berlin.' },
          { fr: 'Il part le soir et arrive le matin.', en: 'It leaves in the evening and arrives in the morning.' },
          { fr: 'Les voyageurs dorment dans des petits lits.', en: 'The passengers sleep in small beds.' },
          { fr: 'Le train pollue moins que l\'avion.', en: 'The train pollutes less than the plane.' },
        ],
        glossary: [
          { fr: 'train de nuit', en: 'night train' }, { fr: 'part', en: 'leaves' }, { fr: 'voyageurs', en: 'passengers' },
          { fr: 'dorment', en: 'sleep' }, { fr: 'pollue', en: 'pollutes' },
        ],
        facts: [
          { id: 'route', en: 'A night train goes from Paris to Berlin.', sentence: 0, cues: [['train'], ['berlin', 'paris']] },
          { id: 'times', en: 'It leaves in the evening and arrives in the morning.', sentence: 1, cues: [['soir', 'nuit'], ['matin', 'arrive*']] },
          { id: 'beds', en: 'Passengers sleep in small beds.', sentence: 2, cues: [['lit*', 'dorm*'], ['voyageur*', 'gens', 'petit*']] },
          { id: 'pollution', en: 'It pollutes less than the plane.', sentence: 3, cues: [['pollu*'], ['avion']] },
        ],
        check: [
          { q: 'Where does the train go?', options: ['Paris to Berlin', 'Paris to Rome', 'Lyon to Berlin'], answer: 0, sentence: 0 },
          { q: 'Where do passengers sleep?', options: ['On the floor', 'In small beds', 'In armchairs'], answer: 1, sentence: 2 },
          { q: 'What is better about the train?', options: ['It is faster', 'It pollutes less than the plane', 'It is free'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Tu préfères voyager en train ou en avion ? Pourquoi ?', en: 'Do you prefer travelling by train or by plane? Why?' },
        starters: ['Je préfère le… parce que…', "En train, on peut…"],
        modelRetell: "Un train de nuit va de Paris à Berlin. Il part le soir et arrive le matin. Les voyageurs dorment dans des petits lits, et le train pollue moins que l'avion.",
      },
      b1: {
        headline: 'Paris–Berlin en dormant',
        sentences: [
          { fr: 'Après plusieurs années d\'absence, un train de nuit relie de nouveau Paris et Berlin.', en: 'After several years away, a night train links Paris and Berlin again.' },
          { fr: 'Il quitte la gare de l\'Est vers vingt heures et arrive le lendemain matin.', en: 'It leaves the Gare de l\'Est at around eight in the evening and arrives the next morning.' },
          { fr: 'Les voyageurs peuvent choisir entre des sièges, des couchettes ou des cabines privées.', en: 'Passengers can choose between seats, couchettes or private cabins.' },
          { fr: 'Beaucoup de jeunes le préfèrent à l\'avion, car il pollue beaucoup moins.', en: 'Many young people prefer it to the plane, because it pollutes much less.' },
        ],
        glossary: [
          { fr: 'relie', en: 'links' }, { fr: 'le lendemain', en: 'the next day' }, { fr: 'sièges', en: 'seats' },
          { fr: 'couchettes', en: 'couchettes, bunks' }, { fr: 'cabines privées', en: 'private cabins' },
        ],
        facts: [
          { id: 'back', en: 'A night train links Paris and Berlin again.', sentence: 0, cues: [['train'], ['berlin'], ['nuit', 'nouveau', 'retour']] },
          { id: 'times', en: 'It leaves around 8 p.m. and arrives the next morning.', sentence: 1, cues: [['vingt heures', 'soir'], ['matin', 'lendemain']] },
          { id: 'choice', en: 'You can choose seats, couchettes or cabins.', sentence: 2, cues: [['couchette*', 'cabine*', 'siege*'], ['choisir', 'peuvent', 'privee*']] },
          { id: 'young', en: 'Many young people prefer it to flying because it pollutes less.', sentence: 3, cues: [['avion'], ['pollu*', 'jeune*']] },
        ],
        check: [
          { q: 'What time does the train leave?', options: ['Around 6 p.m.', 'Around 8 p.m.', 'Around midnight'], answer: 1, sentence: 1 },
          { q: 'Which is NOT one of the choices?', options: ['Couchettes', 'Private cabins', 'A restaurant bed'], answer: 2, sentence: 2 },
          { q: 'Why do young people prefer it?', options: ['It is cheaper', 'It pollutes less', 'It is faster'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Faudrait-il plus de trains de nuit en Europe ? Pourquoi ?', en: 'Should there be more night trains in Europe? Why?' },
        starters: ['Oui, parce que…', 'Le problème, c\'est le prix…', 'Pour la planète…'],
        modelRetell: "Un train de nuit relie de nouveau Paris et Berlin. Il part vers vingt heures et arrive le lendemain matin. On peut choisir des sièges, des couchettes ou des cabines privées. Beaucoup de jeunes le préfèrent à l'avion, car il pollue moins.",
      },
      b2: {
        headline: 'Le grand retour des trains de nuit',
        sentences: [
          { fr: 'Jugés trop lents et peu rentables, les trains de nuit avaient presque disparu d\'Europe.', en: 'Judged too slow and unprofitable, night trains had almost disappeared from Europe.' },
          { fr: 'Pourtant, la ligne Paris–Berlin vient de rouvrir et affiche déjà complet pendant les vacances.', en: 'Yet the Paris–Berlin line has just reopened and is already fully booked during the holidays.' },
          { fr: 'Ce succès s\'explique en partie par la prise de conscience écologique : un trajet en train émet bien moins de CO2 qu\'un vol.', en: 'This success is partly explained by growing environmental awareness: a train journey emits far less CO2 than a flight.' },
          { fr: 'Reste un obstacle de taille : le prix des billets, souvent plus élevé que celui des compagnies aériennes à bas coût.', en: 'One major obstacle remains: ticket prices, often higher than those of low-cost airlines.' },
        ],
        glossary: [
          { fr: 'rentables', en: 'profitable' }, { fr: 'affiche déjà complet', en: 'is already fully booked' }, { fr: 'prise de conscience', en: 'awareness' },
          { fr: 'émet', en: 'emits' }, { fr: 'à bas coût', en: 'low-cost' },
        ],
        facts: [
          { id: 'disappeared', en: 'Night trains had almost disappeared from Europe.', sentence: 0, cues: [['train*'], ['disparu*', 'lent*', 'rentable*']] },
          { id: 'full', en: 'The Paris–Berlin line reopened and is fully booked.', sentence: 1, cues: [['berlin'], ['complet', 'rouvert*', 'rouvrir']] },
          { id: 'co2', en: 'A train emits much less CO2 than a flight.', sentence: 2, cues: [['co2', 'ecolog*', 'pollu*'], ['vol', 'avion']] },
          { id: 'price', en: 'Tickets often cost more than low-cost flights.', sentence: 3, cues: [['prix', 'billet*', 'cher'], ['compagnie*', 'bas cout', 'avion']] },
        ],
        check: [
          { q: 'Why had night trains almost disappeared?', options: ['They were too slow and unprofitable', 'Nobody liked sleeping on trains', 'The lines were closed for repairs'], answer: 0, sentence: 0 },
          { q: 'How popular is the new line?', options: ['Almost empty', 'Fully booked in the holidays', 'Only used by tourists'], answer: 1, sentence: 1 },
          { q: 'What is the main obstacle?', options: ['Ticket prices', 'Safety', 'Noise'], answer: 0, sentence: 3 },
        ],
        opinion: { fr: "L'État devrait-il rendre le train moins cher que l'avion ? Justifie ta réponse.", en: 'Should the state make the train cheaper than the plane? Justify your answer.' },
        starters: ['Il serait logique de… puisque…', 'Cela coûterait cher, mais…', "Tant que l'avion restera moins cher…"],
        modelRetell: "Les trains de nuit avaient presque disparu d'Europe, car ils étaient lents et peu rentables. Mais la ligne Paris–Berlin vient de rouvrir et elle est déjà complète. Le train émet moins de CO2 qu'un vol, mais le prix des billets est souvent plus élevé que les compagnies à bas coût.",
      },
    },
  },
  {
    id: 'new-frog', topicArea: 'science', emoji: '🐸', reviewed: false,
    levels: {
      a2: {
        headline: 'Une nouvelle grenouille en Guyane',
        sentences: [
          { fr: 'Des scientifiques ont trouvé une nouvelle grenouille en Guyane.', en: 'Scientists have found a new frog in French Guiana.' },
          { fr: 'Elle est très petite : elle mesure un centimètre.', en: 'It is very small: it measures one centimetre.' },
          { fr: 'Elle est orange et elle vit dans la forêt.', en: 'It is orange and it lives in the forest.' },
          { fr: 'Les scientifiques ont enregistré son chant.', en: 'The scientists recorded its song.' },
        ],
        glossary: [
          { fr: 'scientifiques', en: 'scientists' }, { fr: 'grenouille', en: 'frog' }, { fr: 'forêt', en: 'forest' },
          { fr: 'enregistré', en: 'recorded' }, { fr: 'chant', en: 'song, call' },
        ],
        facts: [
          { id: 'found', en: 'Scientists found a new frog in French Guiana.', sentence: 0, cues: [['grenouille*'], ['guyane', 'nouvelle']] },
          { id: 'size', en: 'It is only one centimetre long.', sentence: 1, cues: [['centimetre*', 'petite'], ['un', 'tres']] },
          { id: 'forest', en: 'It is orange and lives in the forest.', sentence: 2, cues: [['orange'], ['foret']] },
          { id: 'song', en: 'They recorded its song.', sentence: 3, cues: [['chant', 'chante*'], ['enregistr*']] },
        ],
        check: [
          { q: 'How big is the frog?', options: ['One centimetre', 'Ten centimetres', 'One metre'], answer: 0, sentence: 1 },
          { q: 'What colour is it?', options: ['Green', 'Blue', 'Orange'], answer: 2, sentence: 2 },
          { q: 'What did the scientists record?', options: ['Its song', 'Its jumps', 'Its eggs'], answer: 0, sentence: 3 },
        ],
        opinion: { fr: 'Tu aimerais être scientifique ? Pourquoi ?', en: 'Would you like to be a scientist? Why?' },
        starters: ["Oui, j'aimerais parce que…", 'Non, je préfère…'],
        modelRetell: 'Des scientifiques ont trouvé une nouvelle grenouille en Guyane. Elle est très petite, un centimètre, et elle est orange. Elle vit dans la forêt, et ils ont enregistré son chant.',
      },
      b1: {
        headline: 'Une grenouille minuscule découverte en Guyane',
        sentences: [
          { fr: 'En Guyane, une équipe de chercheurs a découvert une espèce de grenouille encore inconnue.', en: 'In French Guiana, a team of researchers has discovered a species of frog that was still unknown.' },
          { fr: 'L\'animal ne mesure qu\'un centimètre et porte des taches orange sur le dos.', en: 'The animal is only one centimetre long and has orange spots on its back.' },
          { fr: 'Les chercheurs l\'ont d\'abord entendue avant de la voir, grâce à son chant très aigu.', en: 'The researchers heard it before they saw it, thanks to its very high-pitched call.' },
          { fr: 'Ils pensent que des dizaines d\'autres espèces attendent encore d\'être découvertes dans cette forêt.', en: 'They think dozens of other species are still waiting to be discovered in this forest.' },
        ],
        glossary: [
          { fr: 'chercheurs', en: 'researchers' }, { fr: 'espèce', en: 'species' }, { fr: 'inconnue', en: 'unknown' },
          { fr: 'taches', en: 'spots' }, { fr: 'aigu', en: 'high-pitched' }, { fr: 'dizaines', en: 'dozens' },
        ],
        facts: [
          { id: 'new-species', en: 'Researchers discovered a new frog species in French Guiana.', sentence: 0, cues: [['grenouille*'], ['espece*', 'inconnue', 'nouvelle', 'decouvert*']] },
          { id: 'size', en: 'It is 1 cm long with orange spots.', sentence: 1, cues: [['centimetre*'], ['orange', 'tache*']] },
          { id: 'heard', en: 'They heard its high-pitched call before seeing it.', sentence: 2, cues: [['chant', 'entendu*'], ['aigu', 'avant', 'voir']] },
          { id: 'more', en: 'Dozens more species may be waiting in the forest.', sentence: 3, cues: [['espece*'], ['dizaines', 'autres', 'foret']] },
        ],
        check: [
          { q: 'What is on its back?', options: ['Orange spots', 'Black stripes', 'Nothing'], answer: 0, sentence: 1 },
          { q: 'How did they first notice it?', options: ['They saw it on a leaf', 'They heard its call', 'A child found it'], answer: 1, sentence: 2 },
          { q: 'What do the researchers think?', options: ['It is the last new species', 'Dozens more are still to be discovered', 'The frog is dangerous'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Pourquoi est-il important de protéger les forêts ? Donne ton avis.', en: 'Why is it important to protect forests? Give your opinion.' },
        starters: ['À mon avis, c\'est important parce que…', 'Les forêts sont utiles pour…', 'Si on ne les protège pas…'],
        modelRetell: "En Guyane, des chercheurs ont découvert une nouvelle espèce de grenouille. Elle mesure un centimètre et elle a des taches orange. Ils ont d'abord entendu son chant aigu. Ils pensent que des dizaines d'autres espèces attendent dans la forêt.",
      },
      b2: {
        headline: 'La forêt guyanaise dévoile une nouvelle espèce',
        sentences: [
          { fr: 'Elle tient sur un ongle et chante plus fort qu\'un oiseau : une nouvelle espèce de grenouille vient d\'être décrite en Guyane.', en: 'It fits on a fingernail and sings louder than a bird: a new species of frog has just been described in French Guiana.' },
          { fr: 'Les chercheurs ont mis trois ans à prouver qu\'il s\'agissait bien d\'une espèce distincte, en comparant son ADN et son chant.', en: 'The researchers took three years to prove it really was a distinct species, by comparing its DNA and its call.' },
          { fr: 'Cette découverte rappelle la richesse exceptionnelle de la forêt amazonienne, encore largement inexplorée.', en: 'This discovery is a reminder of the exceptional richness of the Amazon rainforest, still largely unexplored.' },
          { fr: 'Elle souligne aussi l\'urgence de la protéger, car de nombreuses espèces pourraient disparaître avant même d\'être connues.', en: 'It also highlights the urgency of protecting it, because many species could disappear before they are even known.' },
        ],
        glossary: [
          { fr: 'ongle', en: 'fingernail' }, { fr: 'décrite', en: 'described (scientifically)' }, { fr: 'distincte', en: 'distinct' },
          { fr: 'ADN', en: 'DNA' }, { fr: 'inexplorée', en: 'unexplored' }, { fr: 'souligne', en: 'highlights' },
        ],
        facts: [
          { id: 'tiny', en: 'A tiny new frog species was described in French Guiana.', sentence: 0, cues: [['grenouille*'], ['espece*', 'ongle', 'guyane']] },
          { id: 'proof', en: 'It took three years to prove it, using DNA and its call.', sentence: 1, cues: [['adn', 'chant'], ['trois ans', 'prouv*', 'compar*']] },
          { id: 'rich', en: 'The Amazon forest is rich and largely unexplored.', sentence: 2, cues: [['foret', 'amazonienne'], ['richesse', 'inexplor*']] },
          { id: 'urgent', en: 'Species could disappear before they are even known.', sentence: 3, cues: [['disparaitre', 'proteger'], ['espece*', 'connues', 'urgence']] },
        ],
        check: [
          { q: 'How small is the frog?', options: ['It fits on a fingernail', 'It is the size of a hand', 'It is invisible without a microscope'], answer: 0, sentence: 0 },
          { q: 'How did they prove it was a new species?', options: ['By photographing it', 'By comparing its DNA and call', 'By counting its eggs'], answer: 1, sentence: 1 },
          { q: 'What risk does the article mention?', options: ['Frogs becoming too many', 'Species disappearing before being known', 'Scientists getting lost'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Protéger la biodiversité doit-il passer avant le développement économique ? Justifie ta réponse.', en: 'Should protecting biodiversity come before economic development? Justify your answer.' },
        starters: ['Je suis convaincu que… parce que…', "Il faut trouver un compromis, car…", "Si l'on détruit…, on risque de…"],
        modelRetell: "Une nouvelle espèce de grenouille, qui tient sur un ongle, a été décrite en Guyane. Les chercheurs ont mis trois ans à le prouver en comparant son ADN et son chant. La forêt amazonienne est riche et encore inexplorée, et il est urgent de la protéger, car des espèces pourraient disparaître avant d'être connues.",
      },
    },
  },
  {
    id: 'asteroid-pupil', topicArea: 'space', emoji: '☄️', reviewed: false,
    levels: {
      a2: {
        headline: 'Une collégienne découvre un astéroïde',
        sentences: [
          { fr: 'Léa a quatorze ans et elle adore les étoiles.', en: 'Léa is fourteen and she loves the stars.' },
          { fr: 'Elle a découvert un astéroïde sur son ordinateur.', en: 'She discovered an asteroid on her computer.' },
          { fr: 'Elle a regardé des photos du ciel avec sa classe.', en: 'She looked at photos of the sky with her class.' },
          { fr: "Maintenant, l'astéroïde va peut-être avoir son nom !", en: 'Now the asteroid might be given her name!' },
        ],
        glossary: [
          { fr: 'étoiles', en: 'stars' }, { fr: 'astéroïde', en: 'asteroid' }, { fr: 'ordinateur', en: 'computer' }, { fr: 'ciel', en: 'sky' },
        ],
        facts: [
          { id: 'lea', en: 'Léa, 14, loves the stars.', sentence: 0, cues: [['lea'], ['quatorze', 'etoile*']] },
          { id: 'found', en: 'She discovered an asteroid on her computer.', sentence: 1, cues: [['asteroide*'], ['decouvert*', 'trouve*', 'ordinateur']] },
          { id: 'photos', en: 'She looked at sky photos with her class.', sentence: 2, cues: [['photo*'], ['ciel', 'classe']] },
          { id: 'name', en: 'The asteroid may get her name.', sentence: 3, cues: [['nom'], ['asteroide*', 'avoir']] },
        ],
        check: [
          { q: 'How old is Léa?', options: ['12', '14', '16'], answer: 1, sentence: 0 },
          { q: 'Where did she find the asteroid?', options: ['On her computer', 'In a telescope at home', 'In a book'], answer: 0, sentence: 1 },
          { q: 'What might happen now?', options: ['She will go to space', 'The asteroid may get her name', 'She will win money'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Tu aimes regarder le ciel la nuit ? Pourquoi ?', en: 'Do you like looking at the sky at night? Why?' },
        starters: ["Oui, j'aime parce que…", 'Non, pas vraiment, car…'],
        modelRetell: "Léa a quatorze ans et elle adore les étoiles. Elle a découvert un astéroïde sur son ordinateur, en regardant des photos du ciel avec sa classe. L'astéroïde va peut-être avoir son nom.",
      },
      b1: {
        headline: 'À 14 ans, Léa repère un astéroïde',
        sentences: [
          { fr: 'Léa, quatorze ans, est peut-être la plus jeune découvreuse d\'astéroïde de France.', en: 'Léa, fourteen, may be the youngest person in France to discover an asteroid.' },
          { fr: 'Avec sa classe, elle participait à un programme qui permet aux élèves d\'analyser de vraies photos de télescope.', en: 'With her class, she was taking part in a programme that lets pupils analyse real telescope photos.' },
          { fr: 'En comparant plusieurs images, elle a remarqué un petit point qui bougeait.', en: 'By comparing several images, she noticed a small dot that was moving.' },
          { fr: 'Si la découverte est confirmée, elle pourra choisir le nom de l\'astéroïde.', en: 'If the discovery is confirmed, she will be able to choose the asteroid\'s name.' },
        ],
        glossary: [
          { fr: 'découvreuse', en: 'discoverer (female)' }, { fr: 'analyser', en: 'to analyse' }, { fr: 'télescope', en: 'telescope' },
          { fr: 'remarqué', en: 'noticed' }, { fr: 'bougeait', en: 'was moving' },
        ],
        facts: [
          { id: 'youngest', en: 'Léa, 14, may be the youngest asteroid discoverer in France.', sentence: 0, cues: [['lea'], ['asteroide*'], ['quatorze', 'jeune*']] },
          { id: 'programme', en: 'Her class analyses real telescope photos.', sentence: 1, cues: [['photo*', 'image*'], ['telescope', 'classe', 'programme']] },
          { id: 'dot', en: 'She noticed a small moving dot.', sentence: 2, cues: [['point'], ['bouge*', 'remarque*']] },
          { id: 'name', en: 'If confirmed, she can choose its name.', sentence: 3, cues: [['nom'], ['choisir', 'confirme*']] },
        ],
        check: [
          { q: 'What do pupils analyse in the programme?', options: ['Real telescope photos', 'Moon rocks', 'Weather maps'], answer: 0, sentence: 1 },
          { q: 'What did Léa notice?', options: ['A bright flash', 'A small moving dot', 'A new star'], answer: 1, sentence: 2 },
          { q: 'What can she do if it is confirmed?', options: ['Visit NASA', 'Choose its name', 'Keep the photos'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Comment choisirais-tu le nom d\'un astéroïde ? Pourquoi ?', en: 'How would you choose the name of an asteroid? Why?' },
        starters: ["Je l'appellerais… parce que…", 'Je choisirais le nom de…', "Ce serait drôle de…"],
        modelRetell: "Léa, quatorze ans, est peut-être la plus jeune découvreuse d'astéroïde de France. Avec sa classe, elle analysait des photos de télescope. Elle a remarqué un petit point qui bougeait. Si c'est confirmé, elle pourra choisir le nom de l'astéroïde.",
      },
      b2: {
        headline: 'Quand les élèves deviennent astronomes',
        sentences: [
          { fr: 'Un petit point lumineux qui se déplaçait d\'une image à l\'autre : c\'est ainsi que Léa, quatorze ans, a repéré un astéroïde jusqu\'alors inconnu.', en: 'A small bright dot moving from one image to the next: that is how Léa, fourteen, spotted a previously unknown asteroid.' },
          { fr: 'Sa classe participe à un projet de science participative qui confie aux élèves des milliers de clichés pris par de grands télescopes.', en: 'Her class takes part in a citizen-science project that gives pupils thousands of shots taken by large telescopes.' },
          { fr: 'Les astronomes professionnels n\'ont pas le temps de tout examiner, et l\'œil humain reste très efficace pour repérer ces mouvements.', en: "Professional astronomers don't have time to examine everything, and the human eye is still very good at spotting these movements." },
          { fr: 'Pour son enseignante, l\'essentiel est ailleurs : Léa envisage désormais une carrière scientifique.', en: 'For her teacher, the main point lies elsewhere: Léa is now considering a career in science.' },
        ],
        glossary: [
          { fr: 'lumineux', en: 'bright' }, { fr: 'repéré', en: 'spotted' }, { fr: 'science participative', en: 'citizen science' },
          { fr: 'clichés', en: 'shots, photographs' }, { fr: 'enseignante', en: 'teacher (female)' }, { fr: 'envisage', en: 'is considering' },
        ],
        facts: [
          { id: 'spotted', en: 'Léa, 14, spotted an unknown asteroid as a moving dot.', sentence: 0, cues: [['lea'], ['asteroide*'], ['point', 'repere*', 'inconnu']] },
          { id: 'project', en: 'Her class analyses thousands of telescope shots.', sentence: 1, cues: [['telescope*', 'cliche*', 'photo*'], ['classe', 'projet', 'milliers']] },
          { id: 'human-eye', en: 'Professionals lack time; the human eye is good at it.', sentence: 2, cues: [['oeil', 'humain'], ['temps', 'efficace', 'professionnel*']] },
          { id: 'career', en: 'Léa now wants a science career.', sentence: 3, cues: [['carriere'], ['scientifique', 'science*']] },
        ],
        check: [
          { q: 'What does the project give pupils?', options: ['Thousands of telescope shots', 'Their own telescope', 'A trip to an observatory'], answer: 0, sentence: 1 },
          { q: 'Why do astronomers need help?', options: ['They lack time to examine everything', 'Their computers are broken', 'They cannot see well'], answer: 0, sentence: 2 },
          { q: 'What matters most to her teacher?', options: ['The prize money', 'Léa is now considering a science career', 'The school\'s fame'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Les élèves devraient-ils participer davantage à de vrais projets scientifiques ? Justifie ta réponse.', en: 'Should pupils take part more in real science projects? Justify your answer.' },
        starters: ['Ce serait bénéfique car…', "Cela permettrait de…", 'Toutefois, il faudrait…'],
        modelRetell: "Léa, quatorze ans, a repéré un astéroïde inconnu : un petit point qui se déplaçait. Sa classe participe à un projet où les élèves examinent des milliers de clichés de télescope, car les professionnels n'ont pas le temps et l'œil humain est efficace. Maintenant, Léa envisage une carrière scientifique.",
      },
    },
  },
  {
    id: 'wheelchair-basketball', topicArea: 'sport', emoji: '🏀', reviewed: false,
    levels: {
      a2: {
        headline: 'Un tournoi de basket en fauteuil',
        sentences: [
          { fr: 'Ce week-end, il y a un tournoi de basket en fauteuil roulant à Lyon.', en: 'This weekend, there is a wheelchair basketball tournament in Lyon.' },
          { fr: 'Douze équipes viennent de toute la France.', en: 'Twelve teams are coming from all over France.' },
          { fr: 'Le public peut aussi essayer un fauteuil.', en: 'The public can also try a wheelchair.' },
          { fr: "L'entrée est gratuite pour les enfants.", en: 'Entry is free for children.' },
        ],
        glossary: [
          { fr: 'tournoi', en: 'tournament' }, { fr: 'fauteuil roulant', en: 'wheelchair' }, { fr: 'essayer', en: 'to try' }, { fr: 'entrée', en: 'entry' },
        ],
        facts: [
          { id: 'tournament', en: 'A wheelchair basketball tournament in Lyon.', sentence: 0, cues: [['basket*', 'tournoi'], ['fauteuil*']] },
          { id: 'teams', en: 'Twelve teams from all over France.', sentence: 1, cues: [['douze'], ['equipe*']] },
          { id: 'try', en: 'The public can try a wheelchair.', sentence: 2, cues: [['essaye*', 'tester'], ['fauteuil*', 'public']] },
          { id: 'free', en: 'Entry is free for children.', sentence: 3, cues: [['gratuit*'], ['enfant*', 'entree']] },
        ],
        check: [
          { q: 'How many teams are coming?', options: ['Two', 'Twelve', 'Twenty'], answer: 1, sentence: 1 },
          { q: 'What can the public do?', options: ['Try a wheelchair', 'Play in the final', 'Meet the coach'], answer: 0, sentence: 2 },
          { q: 'Who gets in for free?', options: ['Everyone', 'Children', 'Teachers'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Tu voudrais essayer le basket en fauteuil ? Pourquoi ?', en: 'Would you like to try wheelchair basketball? Why?' },
        starters: ['Oui, je voudrais parce que…', 'Je pense que ce serait difficile car…'],
        modelRetell: "Il y a un tournoi de basket en fauteuil roulant à Lyon. Douze équipes viennent de toute la France. Le public peut essayer un fauteuil, et l'entrée est gratuite pour les enfants.",
      },
      b1: {
        headline: 'Le basket en fauteuil attire les foules',
        sentences: [
          { fr: 'À Lyon, un tournoi de basket en fauteuil roulant a réuni douze équipes et plus de trois mille spectateurs.', en: 'In Lyon, a wheelchair basketball tournament brought together twelve teams and more than three thousand spectators.' },
          { fr: 'Dans certaines équipes, des joueurs valides jouent à côté de joueurs handicapés.', en: 'In some teams, non-disabled players play alongside disabled players.' },
          { fr: 'Les organisateurs avaient installé un terrain où le public pouvait tester un fauteuil de sport.', en: 'The organisers had set up a court where the public could test a sports wheelchair.' },
          { fr: 'Beaucoup d\'enfants ont été surpris par la vitesse et la force des joueurs.', en: 'Many children were surprised by the speed and strength of the players.' },
        ],
        glossary: [
          { fr: 'réuni', en: 'brought together' }, { fr: 'spectateurs', en: 'spectators' }, { fr: 'valides', en: 'non-disabled' },
          { fr: 'handicapés', en: 'disabled' }, { fr: 'vitesse', en: 'speed' },
        ],
        facts: [
          { id: 'crowd', en: 'Twelve teams and over 3,000 spectators in Lyon.', sentence: 0, cues: [['basket*', 'tournoi'], ['trois mille', 'douze', 'spectateur*']] },
          { id: 'mixed', en: 'Some teams mix disabled and non-disabled players.', sentence: 1, cues: [['valide*', 'handicape*'], ['joueur*', 'equipe*']] },
          { id: 'try', en: 'The public could test a sports wheelchair.', sentence: 2, cues: [['teste*', 'essaye*'], ['fauteuil*', 'public']] },
          { id: 'surprised', en: "Children were surprised by the players' speed and strength.", sentence: 3, cues: [['enfant*'], ['vitesse', 'force', 'surpris']] },
        ],
        check: [
          { q: 'How many spectators came?', options: ['About 300', 'Over 3,000', 'Over 30,000'], answer: 1, sentence: 0 },
          { q: 'What is special about some teams?', options: ['They are all children', 'Disabled and non-disabled players play together', 'They have no coach'], answer: 1, sentence: 1 },
          { q: 'What surprised the children?', options: ['The noise', 'The speed and strength of the players', 'The size of the court'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Le handisport devrait-il être plus présent à la télévision ? Pourquoi ?', en: 'Should disability sport be shown more on television? Why?' },
        starters: ['Oui, parce que…', 'Je trouve que…', 'Cela aiderait à…'],
        modelRetell: "À Lyon, un tournoi de basket en fauteuil a réuni douze équipes et trois mille spectateurs. Dans certaines équipes, des joueurs valides jouent avec des joueurs handicapés. Le public pouvait tester un fauteuil, et les enfants ont été surpris par la vitesse des joueurs.",
      },
      b2: {
        headline: 'Le basket fauteuil, un sport pour tous',
        sentences: [
          { fr: 'Plus de trois mille spectateurs ont assisté au tournoi de basket fauteuil de Lyon, un record pour ce sport encore peu médiatisé.', en: 'More than three thousand spectators attended the Lyon wheelchair basketball tournament, a record for this sport that still gets little media coverage.' },
          { fr: 'Sa particularité : il est l\'un des rares sports où des joueurs valides et handicapés peuvent évoluer dans la même équipe.', en: 'What makes it special: it is one of the few sports where non-disabled and disabled players can play in the same team.' },
          { fr: 'Un système de points attribué à chaque joueur, selon sa mobilité, garantit l\'équilibre entre les équipes.', en: 'A points system given to each player, according to their mobility, keeps the teams balanced.' },
          { fr: 'Pour les clubs, ce succès est une chance d\'attirer de nouveaux licenciés et de faire évoluer le regard sur le handicap.', en: 'For clubs, this success is a chance to attract new members and change attitudes to disability.' },
        ],
        glossary: [
          { fr: 'médiatisé', en: 'covered by the media' }, { fr: 'particularité', en: 'special feature' }, { fr: 'évoluer', en: 'to play; to change' },
          { fr: 'mobilité', en: 'mobility' }, { fr: 'licenciés', en: 'registered club members' }, { fr: 'regard', en: 'way of seeing, attitude' },
        ],
        facts: [
          { id: 'record', en: 'A record 3,000+ spectators in Lyon.', sentence: 0, cues: [['trois mille', 'record', 'spectateur*'], ['basket*', 'tournoi', 'lyon']] },
          { id: 'mixed', en: 'Disabled and non-disabled players can be in the same team.', sentence: 1, cues: [['valide*', 'handicape*'], ['meme equipe', 'equipe*', 'ensemble']] },
          { id: 'points', en: 'A points system based on mobility keeps it fair.', sentence: 2, cues: [['point*'], ['mobilite', 'equilibre']] },
          { id: 'attitudes', en: 'Clubs hope to gain members and change attitudes to disability.', sentence: 3, cues: [['club*', 'licencie*'], ['regard', 'handicap*', 'attirer']] },
        ],
        check: [
          { q: 'What is special about this sport?', options: ['It is played outdoors', 'Disabled and non-disabled players share teams', 'It has no rules'], answer: 1, sentence: 1 },
          { q: 'How are teams kept balanced?', options: ['By age', 'A points system based on mobility', 'By drawing lots'], answer: 1, sentence: 2 },
          { q: 'What do clubs hope for?', options: ['More money from TV', 'New members and changed attitudes', 'A new stadium'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Tous les sports devraient-ils devenir plus inclusifs ? Justifie ta réponse.', en: 'Should all sports become more inclusive? Justify your answer.' },
        starters: ['Il me semble essentiel que…', 'Ce n\'est pas toujours possible, car…', "L'exemple du basket fauteuil montre que…"],
        modelRetell: "Plus de trois mille spectateurs ont assisté au tournoi de basket fauteuil de Lyon, un record. Des joueurs valides et handicapés peuvent jouer dans la même équipe, et un système de points selon la mobilité garantit l'équilibre. Les clubs espèrent attirer de nouveaux licenciés et changer le regard sur le handicap.",
      },
    },
  },
];
