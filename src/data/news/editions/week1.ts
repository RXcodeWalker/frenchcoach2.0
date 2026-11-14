/**
 * Daily News bank, editions 1–7. Hand-written (daily-news §1); `reviewed: false`
 * until a French speaker has checked every level (content-authoring §16).
 */
import type { NewsEdition } from '../types';

export const WEEK1: NewsEdition[] = [
  {
    id: 'bees-on-roofs', topicArea: 'animals', emoji: '🐝', reviewed: false,
    levels: {
      a2: {
        headline: 'Des abeilles sur les toits de Paris',
        sentences: [
          { fr: 'À Paris, il y a des abeilles sur les toits.', en: 'In Paris, there are bees on the roofs.' },
          { fr: 'Un hôtel a trois ruches sur son toit.', en: 'A hotel has three hives on its roof.' },
          { fr: 'Chaque été, les abeilles font cinquante kilos de miel.', en: 'Every summer, the bees make fifty kilos of honey.' },
          { fr: "Le restaurant de l'hôtel utilise ce miel pour ses desserts.", en: 'The hotel restaurant uses this honey for its desserts.' },
        ],
        glossary: [
          { fr: 'abeilles', en: 'bees' }, { fr: 'toits', en: 'roofs' }, { fr: 'ruches', en: 'beehives' }, { fr: 'miel', en: 'honey' },
        ],
        facts: [
          { id: 'bees', en: 'There are bees on the roofs of Paris.', sentence: 0, cues: [['abeille*'], ['toit*'], ['paris']] },
          { id: 'hives', en: 'A hotel has three hives.', sentence: 1, cues: [['hotel*'], ['ruche*', 'trois']] },
          { id: 'honey', en: 'The bees make 50 kilos of honey every summer.', sentence: 2, cues: [['miel'], ['cinquante', 'kilo*']] },
          { id: 'desserts', en: 'The restaurant uses the honey in desserts.', sentence: 3, cues: [['restaurant'], ['dessert*', 'gateau*']] },
        ],
        check: [
          { q: 'Where are the beehives?', options: ['On a hotel roof', 'In a park', 'In a school garden'], answer: 0, sentence: 1 },
          { q: 'How much honey do the bees make each summer?', options: ['15 kilos', '50 kilos', '500 kilos'], answer: 1, sentence: 2 },
          { q: 'What does the restaurant make with the honey?', options: ['Bread', 'Desserts', 'Drinks'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Tu aimerais avoir des abeilles chez toi ? Pourquoi ?', en: 'Would you like to have bees at home? Why?' },
        starters: ["Oui, j'aimerais bien parce que…", "Non, je n'aimerais pas parce que…"],
        modelRetell: 'À Paris, il y a des abeilles sur les toits. Un hôtel a trois ruches. Chaque été, les abeilles font cinquante kilos de miel. Le restaurant utilise le miel pour les desserts.',
      },
      b1: {
        headline: 'Les hôtels parisiens adoptent les abeilles',
        sentences: [
          { fr: "De plus en plus d'hôtels parisiens installent des ruches sur leurs toits.", en: 'More and more Parisian hotels are putting beehives on their roofs.' },
          { fr: "L'un d'eux, près de l'Opéra, accueille aujourd'hui quatre ruches et environ deux cent mille abeilles.", en: 'One of them, near the Opera, now hosts four hives and around two hundred thousand bees.' },
          { fr: "Un apiculteur vient chaque semaine pour s'occuper d'elles.", en: 'A beekeeper comes every week to look after them.' },
          { fr: 'Grâce aux nombreux parcs et jardins de la ville, les abeilles trouvent beaucoup de fleurs.', en: "Thanks to the city's many parks and gardens, the bees find lots of flowers." },
          { fr: 'Le miel est ensuite servi au petit-déjeuner des clients.', en: "The honey is then served at the guests' breakfast." },
        ],
        glossary: [
          { fr: 'ruches', en: 'beehives' }, { fr: 'apiculteur', en: 'beekeeper' }, { fr: "s'occuper", en: 'to look after' },
          { fr: 'fleurs', en: 'flowers' }, { fr: 'petit-déjeuner', en: 'breakfast' },
        ],
        facts: [
          { id: 'hotels', en: 'Paris hotels are putting hives on their roofs.', sentence: 0, cues: [['hotel*'], ['ruche*', 'abeille*'], ['toit*']] },
          { id: 'four-hives', en: 'One hotel has four hives (about 200,000 bees).', sentence: 1, cues: [['quatre', 'deux cent mille', '200000'], ['ruche*', 'abeille*']] },
          { id: 'beekeeper', en: 'A beekeeper comes every week.', sentence: 2, cues: [['apiculteur*'], ['semaine*']] },
          { id: 'breakfast', en: 'Guests eat the honey at breakfast.', sentence: 4, cues: [['miel'], ['petit dejeuner', 'client*']] },
        ],
        check: [
          { q: 'Where is the hotel?', options: ['Near the Opera', 'Near the Eiffel Tower', 'By the river'], answer: 0, sentence: 1 },
          { q: 'Who comes every week?', options: ['A chef', 'A beekeeper', 'A gardener'], answer: 1, sentence: 2 },
          { q: 'Why do the bees find lots of flowers?', options: ['Because of the parks and gardens', "Because of the hotel's balcony", 'Because of the countryside nearby'], answer: 0, sentence: 3 },
        ],
        opinion: { fr: "À ton avis, est-ce une bonne idée d'avoir des abeilles en ville ? Pourquoi ?", en: 'In your opinion, is it a good idea to have bees in the city? Why?' },
        starters: ["À mon avis, c'est une bonne idée car…", "Je pense que c'est risqué parce que…", "D'un côté…, mais de l'autre…"],
        modelRetell: "Des hôtels parisiens installent des ruches sur leurs toits. Un hôtel près de l'Opéra a quatre ruches. Un apiculteur vient chaque semaine. Les abeilles trouvent des fleurs dans les parcs, et les clients mangent le miel au petit-déjeuner.",
      },
      b2: {
        headline: "L'apiculture urbaine en plein essor",
        sentences: [
          { fr: "Sur les toits de Paris, l'apiculture urbaine connaît un succès étonnant.", en: 'On the rooftops of Paris, urban beekeeping is enjoying surprising success.' },
          { fr: "Aujourd'hui, la capitale compterait plus de mille ruches, installées sur des hôtels, des écoles et même des musées.", en: 'Today, the capital is said to have over a thousand hives, on hotels, schools and even museums.' },
          { fr: 'Contrairement à la campagne, la ville utilise peu de pesticides, ce qui protège les abeilles.', en: 'Unlike the countryside, the city uses few pesticides, which protects the bees.' },
          { fr: "Certains scientifiques s'inquiètent toutefois : trop de ruches pourraient priver les insectes sauvages de nourriture.", en: 'Some scientists are worried, though: too many hives could deprive wild insects of food.' },
          { fr: 'La mairie souhaite donc mieux encadrer ces installations.', en: 'So the town hall wants to regulate these installations better.' },
        ],
        glossary: [
          { fr: 'apiculture urbaine', en: 'urban beekeeping' }, { fr: 'ruches', en: 'hives' }, { fr: "s'inquiètent", en: 'are worried' },
          { fr: 'insectes sauvages', en: 'wild insects' }, { fr: 'mairie', en: 'town hall' }, { fr: 'encadrer', en: 'to regulate' },
        ],
        facts: [
          { id: 'success', en: 'Urban beekeeping is a big success in Paris.', sentence: 0, cues: [['apiculture*', 'abeille*', 'ruche*'], ['paris', 'capitale', 'ville']] },
          { id: 'thousand', en: 'Over a thousand hives, on hotels, schools and museums.', sentence: 1, cues: [['mille'], ['ruche*']] },
          { id: 'pesticides', en: 'Few pesticides in the city protect the bees.', sentence: 2, cues: [['pesticide*'], ['peu', 'moins', 'protege*']] },
          { id: 'wild-insects', en: 'Too many hives could take food from wild insects.', sentence: 3, cues: [['insecte*'], ['nourriture', 'manger', 'trop']] },
        ],
        check: [
          { q: 'Where have hives been installed?', options: ['Only on hotels', 'On hotels, schools and museums', 'Only in parks'], answer: 1, sentence: 1 },
          { q: 'Why is the city good for bees?', options: ['It is warmer', 'It uses few pesticides', 'It has more water'], answer: 1, sentence: 2 },
          { q: 'What worries some scientists?', options: ['Bees stinging tourists', 'Wild insects losing food', 'Honey prices rising'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Faut-il limiter le nombre de ruches en ville ? Justifie ta réponse.', en: 'Should the number of hives in the city be limited? Justify your answer.' },
        starters: ['Il faudrait limiter les ruches parce que…', "Je ne suis pas d'accord, car…", 'Même si…, je pense que…'],
        modelRetell: "L'apiculture urbaine a beaucoup de succès à Paris. Il y a plus de mille ruches sur des hôtels, des écoles et des musées. La ville utilise peu de pesticides, ce qui protège les abeilles. Mais trop de ruches pourraient prendre la nourriture des insectes sauvages.",
      },
    },
  },
  {
    id: 'solar-boat', topicArea: 'tech', emoji: '⛵', reviewed: false,
    levels: {
      a2: {
        headline: "Un bateau solaire traverse l'Atlantique",
        sentences: [
          { fr: "Un bateau solaire a traversé l'océan Atlantique.", en: 'A solar boat has crossed the Atlantic Ocean.' },
          { fr: "Il n'utilise pas d'essence, seulement l'énergie du soleil.", en: "It uses no petrol, only the sun's energy." },
          { fr: 'Le voyage a duré vingt-huit jours.', en: 'The journey lasted twenty-eight days.' },
          { fr: 'Les deux marins sont arrivés en Guadeloupe très contents.', en: 'The two sailors arrived in Guadeloupe very happy.' },
        ],
        glossary: [
          { fr: 'bateau solaire', en: 'solar boat' }, { fr: 'essence', en: 'petrol' }, { fr: 'voyage', en: 'journey' }, { fr: 'marins', en: 'sailors' },
        ],
        facts: [
          { id: 'crossed', en: 'A solar boat crossed the Atlantic.', sentence: 0, cues: [['bateau*'], ['atlantique', 'ocean', 'traverse*']] },
          { id: 'sun', en: "It runs only on the sun's energy.", sentence: 1, cues: [['soleil', 'solaire'], ['essence', 'energie']] },
          { id: 'days', en: 'The trip took 28 days.', sentence: 2, cues: [['vingt huit'], ['jour*']] },
          { id: 'arrived', en: 'Two sailors arrived in Guadeloupe.', sentence: 3, cues: [['marin*', 'deux'], ['guadeloupe', 'arrive*']] },
        ],
        check: [
          { q: 'What powers the boat?', options: ['Petrol', 'The wind', 'The sun'], answer: 2, sentence: 1 },
          { q: 'How long was the journey?', options: ['8 days', '28 days', '82 days'], answer: 1, sentence: 2 },
          { q: 'Where did the sailors arrive?', options: ['Guadeloupe', 'Martinique', 'Brittany'], answer: 0, sentence: 3 },
        ],
        opinion: { fr: 'Tu voudrais faire un long voyage en bateau ? Pourquoi ?', en: 'Would you like to go on a long boat trip? Why?' },
        starters: ['Oui, je voudrais parce que…', 'Non, je ne voudrais pas parce que…'],
        modelRetell: "Un bateau solaire a traversé l'Atlantique. Il utilise l'énergie du soleil, pas d'essence. Le voyage a duré vingt-huit jours et les deux marins sont arrivés en Guadeloupe.",
      },
      b1: {
        headline: "Premier voyage solaire à travers l'Atlantique",
        sentences: [
          { fr: "Pour la première fois, un catamaran fonctionnant uniquement à l'énergie solaire a traversé l'Atlantique.", en: 'For the first time, a catamaran running only on solar energy has crossed the Atlantic.' },
          { fr: 'Parti des îles Canaries, il est arrivé en Guadeloupe après vingt-huit jours de mer.', en: 'Leaving from the Canary Islands, it reached Guadeloupe after twenty-eight days at sea.' },
          { fr: 'Son toit est couvert de panneaux solaires qui chargent de grosses batteries.', en: 'Its roof is covered with solar panels that charge big batteries.' },
          { fr: "La nuit, le bateau avance grâce à l'énergie stockée pendant la journée.", en: 'At night, the boat moves thanks to energy stored during the day.' },
          { fr: "Les deux marins veulent montrer qu'on peut voyager sans polluer.", en: 'The two sailors want to show that you can travel without polluting.' },
        ],
        glossary: [
          { fr: 'îles Canaries', en: 'Canary Islands' }, { fr: 'panneaux solaires', en: 'solar panels' }, { fr: 'batteries', en: 'batteries' },
          { fr: 'stockée', en: 'stored' }, { fr: 'polluer', en: 'to pollute' },
        ],
        facts: [
          { id: 'crossed', en: 'A solar-only catamaran crossed the Atlantic.', sentence: 0, cues: [['catamaran', 'bateau'], ['solaire*', 'soleil'], ['atlantique', 'traverse*']] },
          { id: 'route', en: 'From the Canaries to Guadeloupe in 28 days.', sentence: 1, cues: [['guadeloupe', 'canaries'], ['vingt huit', 'jour*']] },
          { id: 'panels', en: 'Solar panels charge batteries, so it sails at night too.', sentence: 2, cues: [['panneau*', 'batterie*'], ['charge*', 'nuit', 'stocke*']] },
          { id: 'no-pollution', en: 'The sailors want to show you can travel without polluting.', sentence: 4, cues: [['marin*'], ['pollu*']] },
        ],
        check: [
          { q: 'Where did the boat leave from?', options: ['The Canary Islands', 'Guadeloupe', 'Marseille'], answer: 0, sentence: 1 },
          { q: 'How does the boat move at night?', options: ['With a petrol engine', 'With energy stored in batteries', 'With sails only'], answer: 1, sentence: 3 },
          { q: 'What do the sailors want to show?', options: ['That boats are fast', 'That you can travel without polluting', 'That the ocean is dangerous'], answer: 1, sentence: 4 },
        ],
        opinion: { fr: 'Penses-tu que les bateaux solaires pourraient remplacer les bateaux classiques ? Pourquoi ?', en: 'Do you think solar boats could replace ordinary boats? Why?' },
        starters: ['Je pense que oui, car…', "Je n'en suis pas sûr, parce que…", "Le problème, c'est que…"],
        modelRetell: "Un catamaran solaire a traversé l'Atlantique. Il est parti des Canaries et il est arrivé en Guadeloupe après vingt-huit jours. Des panneaux solaires chargent les batteries, donc il avance aussi la nuit. Les marins veulent voyager sans polluer.",
      },
      b2: {
        headline: 'Vingt-huit jours de mer sans carburant',
        sentences: [
          { fr: "Vingt-huit jours de mer, et pas une goutte de carburant : c'est l'exploit que viennent de réaliser deux navigateurs à bord d'un catamaran solaire.", en: 'Twenty-eight days at sea without a drop of fuel: that is the feat two sailors have just achieved aboard a solar catamaran.' },
          { fr: 'Leur bateau, recouvert de panneaux photovoltaïques, a relié les Canaries à la Guadeloupe.', en: 'Their boat, covered in photovoltaic panels, linked the Canary Islands to Guadeloupe.' },
          { fr: "Le principal défi était la météo : plusieurs jours nuageux ont obligé l'équipage à ralentir pour économiser les batteries.", en: 'The main challenge was the weather: several cloudy days forced the crew to slow down to save the batteries.' },
          { fr: "Les deux hommes espèrent que leur aventure inspirera le transport maritime, responsable d'une part importante de la pollution mondiale.", en: 'The two men hope their adventure will inspire shipping, which is responsible for a large share of global pollution.' },
        ],
        glossary: [
          { fr: 'carburant', en: 'fuel' }, { fr: 'exploit', en: 'feat' }, { fr: 'navigateurs', en: 'sailors' },
          { fr: 'nuageux', en: 'cloudy' }, { fr: 'équipage', en: 'crew' }, { fr: 'transport maritime', en: 'shipping' },
        ],
        facts: [
          { id: 'no-fuel', en: 'Two sailors crossed in 28 days with no fuel.', sentence: 0, cues: [['vingt huit'], ['carburant', 'solaire*', 'essence']] },
          { id: 'route', en: 'The boat linked the Canaries to Guadeloupe.', sentence: 1, cues: [['canaries'], ['guadeloupe']] },
          { id: 'weather', en: 'Cloudy weather forced them to slow down to save the batteries.', sentence: 2, cues: [['meteo', 'nuage*'], ['ralenti*', 'batterie*', 'economis*']] },
          { id: 'inspire', en: 'They hope to inspire cleaner shipping.', sentence: 3, cues: [['pollution', 'pollu*'], ['transport*', 'inspire*', 'bateau*']] },
        ],
        check: [
          { q: 'What was the main challenge?', options: ['The waves', 'The weather', 'Food supplies'], answer: 1, sentence: 2 },
          { q: 'Why did the crew slow down?', options: ['To save the batteries', 'To fish', 'To repair the boat'], answer: 0, sentence: 2 },
          { q: 'What do they hope to inspire?', options: ['Tourism', 'Shipping', 'Fishing'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Le transport maritime doit-il changer pour protéger la planète ? Justifie ta réponse.', en: 'Must shipping change to protect the planet? Justify your answer.' },
        starters: ['Il est essentiel que… parce que…', 'Certes…, mais…', 'À mon avis, la priorité serait de…'],
        modelRetell: "Deux navigateurs ont traversé l'océan en vingt-huit jours sans carburant, sur un catamaran solaire. Ils sont partis des Canaries et sont arrivés en Guadeloupe. À cause de la météo nuageuse, ils ont dû ralentir pour économiser les batteries. Ils espèrent inspirer le transport maritime, qui cause beaucoup de pollution.",
      },
    },
  },
  {
    id: 'astronaut-call', topicArea: 'space', emoji: '🛰️', reviewed: false,
    levels: {
      a2: {
        headline: 'Des élèves parlent avec un astronaute',
        sentences: [
          { fr: "Des élèves de Lyon ont parlé avec un astronaute dans l'espace.", en: 'Pupils from Lyon spoke with an astronaut in space.' },
          { fr: 'Il était dans la Station spatiale internationale.', en: 'He was in the International Space Station.' },
          { fr: 'La conversation a duré dix minutes, par radio.', en: 'The conversation lasted ten minutes, by radio.' },
          { fr: 'Les élèves ont posé des questions sur la nourriture et le sommeil.', en: 'The pupils asked questions about food and sleep.' },
        ],
        glossary: [
          { fr: 'élèves', en: 'pupils' }, { fr: 'espace', en: 'space' }, { fr: 'station spatiale', en: 'space station' }, { fr: 'sommeil', en: 'sleep' },
        ],
        facts: [
          { id: 'spoke', en: 'Pupils from Lyon spoke with an astronaut.', sentence: 0, cues: [['eleve*', 'enfant*'], ['astronaute*']] },
          { id: 'station', en: 'He was in the space station.', sentence: 1, cues: [['station'], ['spatiale', 'espace']] },
          { id: 'ten-minutes', en: 'The call lasted ten minutes, by radio.', sentence: 2, cues: [['dix'], ['minute*', 'radio']] },
          { id: 'questions', en: 'They asked about food and sleep.', sentence: 3, cues: [['question*'], ['nourriture', 'manger', 'sommeil', 'dormir']] },
        ],
        check: [
          { q: 'Where was the astronaut?', options: ['On the Moon', 'In the space station', 'In Lyon'], answer: 1, sentence: 1 },
          { q: 'How long was the conversation?', options: ['Ten minutes', 'One hour', 'Two minutes'], answer: 0, sentence: 2 },
          { q: 'What did the pupils ask about?', options: ['Food and sleep', 'Football', 'Homework'], answer: 0, sentence: 3 },
        ],
        opinion: { fr: 'Quelle question tu poserais à un astronaute ? Pourquoi ?', en: 'What question would you ask an astronaut? Why?' },
        starters: ['Je lui demanderais… parce que…', "J'aimerais savoir si…"],
        modelRetell: 'Des élèves de Lyon ont parlé avec un astronaute dans la station spatiale. La conversation a duré dix minutes par radio. Ils ont posé des questions sur la nourriture et le sommeil.',
      },
      b1: {
        headline: 'Un appel en direct avec l\'espace',
        sentences: [
          { fr: 'Une classe de collégiens lyonnais a vécu un moment inoubliable : une discussion en direct avec un astronaute.', en: 'A class of secondary pupils in Lyon had an unforgettable moment: a live conversation with an astronaut.' },
          { fr: 'Grâce à une radio installée au collège, ils ont pu joindre la Station spatiale internationale pendant dix minutes.', en: 'Thanks to a radio set up at the school, they were able to reach the International Space Station for ten minutes.' },
          { fr: 'Les élèves avaient préparé vingt questions.', en: 'The pupils had prepared twenty questions.' },
          { fr: "Ils voulaient surtout savoir comment on dort et ce qu'on mange en apesanteur.", en: 'Above all they wanted to know how you sleep and what you eat in weightlessness.' },
        ],
        glossary: [
          { fr: 'collégiens', en: 'secondary-school pupils' }, { fr: 'inoubliable', en: 'unforgettable' }, { fr: 'en direct', en: 'live' },
          { fr: 'joindre', en: 'to reach' }, { fr: 'apesanteur', en: 'weightlessness' },
        ],
        facts: [
          { id: 'live', en: 'A Lyon class talked live with an astronaut.', sentence: 0, cues: [['collegien*', 'eleve*', 'classe'], ['astronaute*']] },
          { id: 'radio', en: 'By radio, for ten minutes, with the space station.', sentence: 1, cues: [['radio', 'station'], ['dix', 'minute*']] },
          { id: 'twenty', en: 'They had prepared twenty questions.', sentence: 2, cues: [['vingt'], ['question*']] },
          { id: 'weightless', en: 'They asked how you sleep and eat in weightlessness.', sentence: 3, cues: [['dort', 'dormir', 'mange*', 'sommeil'], ['apesanteur', 'espace']] },
        ],
        check: [
          { q: 'How did they contact the astronaut?', options: ['By video call', 'With a radio at school', 'By letter'], answer: 1, sentence: 1 },
          { q: 'How many questions had they prepared?', options: ['Ten', 'Twenty', 'Twelve'], answer: 1, sentence: 2 },
          { q: 'What did they most want to know?', options: ['How to become an astronaut', 'How you sleep and eat in weightlessness', 'How fast the station goes'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: "Aimerais-tu aller dans l'espace un jour ? Pourquoi ?", en: 'Would you like to go into space one day? Why?' },
        starters: ["J'aimerais bien parce que…", "Je n'aimerais pas du tout, car…", "Ce qui me plairait, c'est…"],
        modelRetell: 'Une classe de collégiens lyonnais a parlé en direct avec un astronaute. Avec une radio, ils ont joint la station spatiale pendant dix minutes. Ils avaient préparé vingt questions, surtout sur comment on dort et on mange en apesanteur.',
      },
      b2: {
        headline: 'Un cours de sciences à 400 kilomètres d\'altitude',
        sentences: [
          { fr: "Il est rare qu'un cours de sciences se déroule à quatre cents kilomètres d'altitude.", en: 'It is rare for a science lesson to take place four hundred kilometres up.' },
          { fr: "C'est pourtant ce qu'ont vécu des collégiens lyonnais, qui ont échangé par radio avec un astronaute à bord de la Station spatiale internationale.", en: 'Yet that is what pupils in Lyon experienced, talking by radio with an astronaut aboard the International Space Station.' },
          { fr: "Le contact n'a duré que dix minutes, le temps que la station passe au-dessus de la France.", en: 'The contact lasted only ten minutes, the time it took the station to pass over France.' },
          { fr: "Les élèves ont appris que les astronautes s'attachent pour dormir et que la nourriture perd souvent son goût en apesanteur.", en: 'The pupils learned that astronauts strap themselves in to sleep and that food often loses its taste in weightlessness.' },
        ],
        glossary: [
          { fr: 'altitude', en: 'altitude' }, { fr: 'à bord', en: 'aboard' }, { fr: 'au-dessus', en: 'over / above' },
          { fr: "s'attachent", en: 'strap themselves in' }, { fr: 'goût', en: 'taste' }, { fr: 'apesanteur', en: 'weightlessness' },
        ],
        facts: [
          { id: 'radio', en: 'Lyon pupils spoke by radio with an astronaut on the space station.', sentence: 1, cues: [['radio', 'echange*'], ['astronaute*']] },
          { id: 'altitude', en: 'The station is 400 km up.', sentence: 0, cues: [['quatre cents'], ['kilometre*', 'altitude']] },
          { id: 'ten-minutes', en: 'Only ten minutes, while it passed over France.', sentence: 2, cues: [['dix'], ['minute*', 'france']] },
          { id: 'sleep-food', en: 'Astronauts strap in to sleep, and food loses its taste.', sentence: 3, cues: [['dormir', 'attache*'], ['gout', 'nourriture']] },
        ],
        check: [
          { q: 'How high is the station?', options: ['40 km', '400 km', '4,000 km'], answer: 1, sentence: 0 },
          { q: 'Why did the contact last only ten minutes?', options: ['The radio broke', 'The station passed over France', 'The lesson ended'], answer: 1, sentence: 2 },
          { q: 'What happens to food in weightlessness?', options: ['It floats away', 'It often loses its taste', 'It goes cold'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: "Les voyages spatiaux valent-ils l'argent qu'ils coûtent ? Justifie ta réponse.", en: 'Are space journeys worth the money they cost? Justify your answer.' },
        starters: ['Selon moi, ils en valent la peine car…', 'On pourrait plutôt utiliser cet argent pour…', 'Bien que…, je pense que…'],
        modelRetell: "Des collégiens lyonnais ont échangé par radio avec un astronaute, à quatre cents kilomètres d'altitude. Le contact a duré dix minutes, pendant que la station passait au-dessus de la France. Ils ont appris que les astronautes s'attachent pour dormir et que la nourriture perd son goût.",
      },
    },
  },
  {
    id: 'village-football', topicArea: 'sport', emoji: '⚽', reviewed: false,
    levels: {
      a2: {
        headline: 'Les filles du village gagnent la coupe',
        sentences: [
          { fr: 'Une petite équipe de football a gagné la coupe régionale.', en: 'A small football team has won the regional cup.' },
          { fr: "Les joueuses viennent d'un village de huit cents habitants.", en: 'The players come from a village of eight hundred people.' },
          { fr: 'En finale, elles ont gagné trois à un.', en: 'In the final, they won three-one.' },
          { fr: 'Tout le village a fait la fête sur la place.', en: 'The whole village celebrated in the square.' },
        ],
        glossary: [
          { fr: 'équipe', en: 'team' }, { fr: 'joueuses', en: 'players (female)' }, { fr: 'habitants', en: 'inhabitants' }, { fr: 'finale', en: 'final' },
        ],
        facts: [
          { id: 'cup', en: 'A small team won the regional cup.', sentence: 0, cues: [['equipe*', 'joueuse*'], ['coupe', 'gagne*']] },
          { id: 'village', en: 'The players come from a village of 800 people.', sentence: 1, cues: [['village'], ['huit cents', 'habitant*']] },
          { id: 'score', en: 'They won 3–1 in the final.', sentence: 2, cues: [['finale', 'match'], ['trois a un', 'trois']] },
          { id: 'party', en: 'The village celebrated in the square.', sentence: 3, cues: [['fete'], ['village', 'place']] },
        ],
        check: [
          { q: 'Who won the cup?', options: ["A women's team from a village", "A city boys' team", 'A school team'], answer: 0, sentence: 1 },
          { q: 'What was the score?', options: ['2–1', '3–1', '3–0'], answer: 1, sentence: 2 },
          { q: 'Where did people celebrate?', options: ['In the stadium', 'In the square', 'At the school'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Tu préfères jouer au football ou le regarder ? Pourquoi ?', en: 'Do you prefer playing football or watching it? Why?' },
        starters: ['Je préfère… parce que…', "Pour moi, c'est plus amusant de…"],
        modelRetell: "Une petite équipe de football a gagné la coupe régionale. Les joueuses viennent d'un village de huit cents habitants. En finale, elles ont gagné trois à un, et le village a fait la fête.",
      },
      b1: {
        headline: 'Un petit club breton remporte la coupe',
        sentences: [
          { fr: "C'est une belle histoire de sport : l'équipe féminine d'un petit village breton a remporté la coupe régionale.", en: "It's a lovely sports story: the women's team of a small Breton village has won the regional cup." },
          { fr: "Personne ne s'y attendait, car le club n'existe que depuis trois ans.", en: 'Nobody expected it, because the club has only existed for three years.' },
          { fr: 'En finale, les joueuses ont battu une équipe de Rennes trois buts à un.', en: 'In the final, the players beat a team from Rennes three goals to one.' },
          { fr: 'Le soir même, les habitants ont organisé une grande fête sur la place du village.', en: 'That same evening, the villagers organised a big party in the village square.' },
        ],
        glossary: [
          { fr: 'féminine', en: "women's" }, { fr: 'breton', en: 'Breton (from Brittany)' }, { fr: 'remporté', en: 'won' },
          { fr: 'battu', en: 'beat' }, { fr: 'buts', en: 'goals' },
        ],
        facts: [
          { id: 'cup', en: "A small Breton village's women's team won the regional cup.", sentence: 0, cues: [['equipe*', 'joueuse*', 'feminine'], ['coupe'], ['village', 'breton*']] },
          { id: 'young-club', en: 'The club is only three years old.', sentence: 1, cues: [['club'], ['trois ans']] },
          { id: 'final', en: 'They beat Rennes 3–1 in the final.', sentence: 2, cues: [['rennes'], ['trois', 'but*']] },
          { id: 'party', en: 'The villagers held a big party.', sentence: 3, cues: [['fete'], ['habitant*', 'village', 'place']] },
        ],
        check: [
          { q: 'Why was the win a surprise?', options: ['The club is only three years old', 'The team had no coach', 'They played away'], answer: 0, sentence: 1 },
          { q: 'Who did they beat in the final?', options: ['A team from Nantes', 'A team from Rennes', 'A team from Brest'], answer: 1, sentence: 2 },
          { q: 'What happened that evening?', options: ['A big party in the square', 'A TV interview', 'A training session'], answer: 0, sentence: 3 },
        ],
        opinion: { fr: 'Le football féminin devrait-il passer plus souvent à la télé ? Pourquoi ?', en: "Should women's football be on TV more often? Why?" },
        starters: ['Oui, parce que…', 'À mon avis, ce serait juste car…', 'Je pense que les gens…'],
        modelRetell: "L'équipe féminine d'un village breton a remporté la coupe régionale. Le club n'existe que depuis trois ans. En finale, elles ont battu Rennes trois buts à un, et les habitants ont fait une grande fête.",
      },
      b2: {
        headline: 'Fondé par cinq filles, le club gagne la coupe',
        sentences: [
          { fr: "Dans ce village breton de huit cents habitants, on n'avait jamais vu une telle foule.", en: 'In this Breton village of eight hundred people, such a crowd had never been seen.' },
          { fr: 'Il y a trois ans, cinq jeunes filles ont fondé un club de football faute de place dans les équipes des garçons.', en: "Three years ago, five girls founded a football club because there was no room in the boys' teams." },
          { fr: 'Devant des centaines de supporters, elles viennent de battre les favorites de Rennes trois buts à un en finale de la coupe régionale.', en: 'In front of hundreds of supporters, they have just beaten the favourites from Rennes three goals to one in the regional cup final.' },
          { fr: "La mairie promet désormais un nouveau terrain pour accueillir les nombreuses filles qui veulent s'inscrire.", en: 'The town hall now promises a new pitch for the many girls who want to sign up.' },
        ],
        glossary: [
          { fr: 'foule', en: 'crowd' }, { fr: 'fondé', en: 'founded' }, { fr: 'faute de place', en: 'for lack of room' },
          { fr: 'favorites', en: 'favourites' }, { fr: 'terrain', en: 'pitch' }, { fr: "s'inscrire", en: 'to sign up' },
        ],
        facts: [
          { id: 'founded', en: 'Five girls founded the club three years ago.', sentence: 1, cues: [['cinq', 'fille*', 'jeunes filles'], ['fonde*', 'club', 'cree*']] },
          { id: 'why', en: "There was no room for them in the boys' teams.", sentence: 1, cues: [['garcon*'], ['place', 'equipe*']] },
          { id: 'final', en: 'They beat the favourites, Rennes, 3–1 in the final.', sentence: 2, cues: [['rennes', 'favorite*'], ['finale', 'coupe', 'trois']] },
          { id: 'pitch', en: 'The town hall promises a new pitch.', sentence: 3, cues: [['mairie'], ['terrain']] },
        ],
        check: [
          { q: 'Why did the girls found the club?', options: ["There was no room in the boys' teams", 'Their school asked them', 'A famous player helped'], answer: 0, sentence: 1 },
          { q: 'Who were the favourites?', options: ['The village team', 'The team from Rennes', 'Nobody'], answer: 1, sentence: 2 },
          { q: 'What does the town hall promise?', options: ['A trophy', 'A new pitch', 'A trip to Paris'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Les clubs de sport devraient-ils toujours être mixtes ? Justifie ta réponse.', en: 'Should sports clubs always be mixed? Justify your answer.' },
        starters: ['Je pense que les équipes mixtes…', "D'un côté…, de l'autre…", "Ce qui compte surtout, c'est…"],
        modelRetell: "Il y a trois ans, cinq jeunes filles d'un village breton ont fondé un club de football, parce qu'il n'y avait pas de place dans les équipes des garçons. Elles viennent de battre les favorites de Rennes en finale de la coupe régionale. La mairie promet un nouveau terrain.",
      },
    },
  },
  {
    id: 'beach-library', topicArea: 'culture', emoji: '📚', reviewed: false,
    levels: {
      a2: {
        headline: 'Une bibliothèque sur la plage',
        sentences: [
          { fr: 'Cet été, il y a une bibliothèque sur la plage de Nice.', en: 'This summer, there is a library on the beach in Nice.' },
          { fr: 'On peut emprunter des livres et des bandes dessinées.', en: 'You can borrow books and comics.' },
          { fr: "C'est gratuit pour tout le monde.", en: "It's free for everyone." },
          { fr: 'Les enfants adorent lire sous les parasols.', en: 'Children love reading under the parasols.' },
        ],
        glossary: [
          { fr: 'bibliothèque', en: 'library' }, { fr: 'plage', en: 'beach' }, { fr: 'emprunter', en: 'to borrow' },
          { fr: 'bandes dessinées', en: 'comics' }, { fr: 'gratuit', en: 'free' },
        ],
        facts: [
          { id: 'library', en: "There's a library on the beach in Nice.", sentence: 0, cues: [['bibliotheque*'], ['plage'], ['nice']] },
          { id: 'borrow', en: 'You can borrow books and comics.', sentence: 1, cues: [['emprunte*', 'prendre', 'lire'], ['livre*', 'bandes dessinees', 'bd']] },
          { id: 'free', en: "It's free for everyone.", sentence: 2, cues: [['gratuit*'], ['tout le monde', 'tous']] },
          { id: 'children', en: 'Children read under the parasols.', sentence: 3, cues: [['enfant*'], ['parasol*', 'lire']] },
        ],
        check: [
          { q: 'Where is the library?', options: ['In a park', 'On the beach', 'In a train station'], answer: 1, sentence: 0 },
          { q: 'How much does it cost?', options: ['2 euros', 'Nothing', '5 euros a week'], answer: 1, sentence: 2 },
          { q: 'Where do children read?', options: ['Under parasols', 'In the water', 'On a boat'], answer: 0, sentence: 3 },
        ],
        opinion: { fr: 'Tu aimes lire en vacances ? Pourquoi ?', en: 'Do you like reading on holiday? Why?' },
        starters: ["Oui, j'aime lire parce que…", 'Non, je préfère… parce que…'],
        modelRetell: "Il y a une bibliothèque sur la plage de Nice. On peut emprunter des livres et des bandes dessinées. C'est gratuit pour tout le monde, et les enfants lisent sous les parasols.",
      },
      b1: {
        headline: 'Lire au bord de la mer à Nice',
        sentences: [
          { fr: "Sur une plage de Nice, une bibliothèque en plein air accueille les vacanciers tout l'été.", en: 'On a beach in Nice, an open-air library welcomes holidaymakers all summer.' },
          { fr: 'Installée dans une petite cabane en bois, elle propose plus de deux mille livres, magazines et bandes dessinées.', en: 'Set up in a little wooden hut, it offers over two thousand books, magazines and comics.' },
          { fr: 'Le prêt est gratuit : il suffit de laisser son nom et de rapporter le livre avant de partir.', en: 'Borrowing is free: you just leave your name and bring the book back before you go.' },
          { fr: 'Selon les bibliothécaires, les jeunes y empruntent surtout des mangas.', en: 'According to the librarians, young people mostly borrow manga there.' },
        ],
        glossary: [
          { fr: 'en plein air', en: 'open-air' }, { fr: 'vacanciers', en: 'holidaymakers' }, { fr: 'cabane en bois', en: 'wooden hut' },
          { fr: 'prêt', en: 'loan, borrowing' }, { fr: 'rapporter', en: 'to bring back' },
        ],
        facts: [
          { id: 'library', en: 'An open-air library on a beach in Nice.', sentence: 0, cues: [['bibliotheque*'], ['plage', 'nice']] },
          { id: 'hut', en: 'It is in a wooden hut with over 2,000 books.', sentence: 1, cues: [['cabane', 'bois'], ['deux mille', 'livre*']] },
          { id: 'free', en: 'Free: leave your name and bring the book back.', sentence: 2, cues: [['gratuit*'], ['nom', 'rapporte*']] },
          { id: 'manga', en: 'Young people mostly borrow manga.', sentence: 3, cues: [['manga*'], ['jeune*', 'emprunte*']] },
        ],
        check: [
          { q: 'What is the library in?', options: ['A tent', 'A wooden hut', 'A bus'], answer: 1, sentence: 1 },
          { q: 'What must you do to borrow a book?', options: ['Pay a euro', 'Leave your name', 'Show an ID card'], answer: 1, sentence: 2 },
          { q: 'What do young people borrow most?', options: ['Magazines', 'Manga', 'Novels'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: "Penses-tu que les jeunes lisent assez aujourd'hui ? Pourquoi ?", en: 'Do you think young people read enough today? Why?' },
        starters: ['Je pense que oui, parce que…', 'À mon avis, ils lisent moins car…', 'Les écrans…'],
        modelRetell: 'Sur une plage de Nice, il y a une bibliothèque en plein air dans une cabane en bois, avec plus de deux mille livres. Le prêt est gratuit : on laisse son nom et on rapporte le livre. Les jeunes empruntent surtout des mangas.',
      },
      b2: {
        headline: 'Une bibliothèque fondée sur la confiance',
        sentences: [
          { fr: "Lire les pieds dans le sable : c'est le pari réussi d'une bibliothèque éphémère installée sur une plage niçoise.", en: "Reading with your feet in the sand: that's the successful bet of a pop-up library set up on a beach in Nice." },
          { fr: 'Chaque jour, des centaines de vacanciers viennent choisir un roman, une bande dessinée ou un manga, sans carte ni inscription.', en: 'Every day, hundreds of holidaymakers come to choose a novel, a comic or a manga, with no card and no sign-up.' },
          { fr: 'Le système repose entièrement sur la confiance, et presque tous les livres reviennent.', en: 'The system relies entirely on trust, and almost all the books come back.' },
          { fr: "Pour la ville, l'objectif est de faire découvrir la lecture à ceux qui ne fréquentent jamais les bibliothèques.", en: 'For the town, the aim is to introduce reading to people who never go to libraries.' },
        ],
        glossary: [
          { fr: 'sable', en: 'sand' }, { fr: 'pari', en: 'bet' }, { fr: 'éphémère', en: 'temporary, pop-up' },
          { fr: 'confiance', en: 'trust' }, { fr: 'fréquentent', en: 'go to (regularly)' },
        ],
        facts: [
          { id: 'library', en: 'A pop-up library on a beach in Nice.', sentence: 0, cues: [['bibliotheque*'], ['plage', 'sable', 'nicoise']] },
          { id: 'no-card', en: 'No card or sign-up is needed.', sentence: 1, cues: [['carte', 'inscription'], ['sans', 'pas de']] },
          { id: 'trust', en: 'It runs on trust and almost every book comes back.', sentence: 2, cues: [['confiance'], ['revien*', 'rapporte*', 'livre*']] },
          { id: 'aim', en: 'The aim is to bring reading to people who never go to libraries.', sentence: 3, cues: [['lecture', 'lire'], ['jamais', 'decouvr*']] },
        ],
        check: [
          { q: 'What do you need to borrow a book?', options: ['A library card', 'Nothing at all', 'A deposit'], answer: 1, sentence: 1 },
          { q: 'What does the system rely on?', options: ['Cameras', 'Trust', 'Volunteers'], answer: 1, sentence: 2 },
          { q: "What is the town's aim?", options: ['To attract tourists', 'To get non-readers reading', 'To sell books'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Un système fondé sur la confiance pourrait-il marcher partout ? Justifie ta réponse.', en: 'Could a system based on trust work everywhere? Justify your answer.' },
        starters: ['Je doute que… parce que…', 'Dans mon quartier, cela…', "Ce genre d'initiative montre que…"],
        modelRetell: 'Une bibliothèque éphémère est installée sur une plage niçoise. On choisit un livre sans carte ni inscription. Le système repose sur la confiance et presque tous les livres reviennent. La ville veut faire découvrir la lecture à ceux qui ne vont jamais en bibliothèque.',
      },
    },
  },
  {
    id: 'giant-baguette', topicArea: 'food', emoji: '🥖', reviewed: false,
    levels: {
      a2: {
        headline: 'Une baguette géante',
        sentences: [
          { fr: 'Des boulangers ont fait une baguette géante.', en: 'Some bakers made a giant baguette.' },
          { fr: 'Elle mesure cent quarante mètres !', en: 'It is a hundred and forty metres long!' },
          { fr: 'Ils ont travaillé toute la nuit dans une grande salle.', en: 'They worked all night in a big hall.' },
          { fr: 'Après, ils ont partagé le pain avec les habitants.', en: 'Afterwards, they shared the bread with the locals.' },
        ],
        glossary: [
          { fr: 'boulangers', en: 'bakers' }, { fr: 'géante', en: 'giant' }, { fr: 'mesure', en: 'measures' },
          { fr: 'partagé', en: 'shared' }, { fr: 'pain', en: 'bread' },
        ],
        facts: [
          { id: 'giant', en: 'Bakers made a giant baguette.', sentence: 0, cues: [['baguette*', 'pain'], ['geante', 'grande', 'boulanger*']] },
          { id: 'length', en: 'It is 140 metres long.', sentence: 1, cues: [['cent quarante'], ['metre*']] },
          { id: 'night', en: 'They worked all night.', sentence: 2, cues: [['nuit'], ['travaille*']] },
          { id: 'shared', en: 'They shared it with the locals.', sentence: 3, cues: [['partage*', 'donne*'], ['habitant*', 'gens']] },
        ],
        check: [
          { q: 'How long is the baguette?', options: ['14 metres', '40 metres', '140 metres'], answer: 2, sentence: 1 },
          { q: 'When did they work?', options: ['All night', 'All week', 'In the morning'], answer: 0, sentence: 2 },
          { q: 'What did they do with the bread?', options: ['Sold it', 'Shared it with the locals', 'Kept it in a museum'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Quel est ton plat français préféré ? Pourquoi ?', en: 'What is your favourite French dish? Why?' },
        starters: ["Mon plat préféré, c'est… parce que…", "J'adore… car…"],
        modelRetell: 'Des boulangers ont fait une baguette géante de cent quarante mètres. Ils ont travaillé toute la nuit, puis ils ont partagé le pain avec les habitants.',
      },
      b1: {
        headline: 'Record du monde pour une baguette',
        sentences: [
          { fr: 'Une équipe de boulangers français a battu le record de la plus longue baguette du monde.', en: 'A team of French bakers has broken the record for the longest baguette in the world.' },
          { fr: "Leur pain mesure cent quarante mètres, soit plus qu'un terrain de football.", en: 'Their bread is a hundred and forty metres long, more than a football pitch.' },
          { fr: 'Pour la cuire, ils ont utilisé un four spécial qui avançait lentement le long de la pâte.', en: 'To bake it, they used a special oven that moved slowly along the dough.' },
          { fr: 'Ensuite, la baguette a été coupée en morceaux et distribuée gratuitement.', en: 'Then the baguette was cut into pieces and given out for free.' },
        ],
        glossary: [
          { fr: 'record', en: 'record' }, { fr: 'cuire', en: 'to bake' }, { fr: 'four', en: 'oven' }, { fr: 'pâte', en: 'dough' }, { fr: 'morceaux', en: 'pieces' },
        ],
        facts: [
          { id: 'record', en: 'French bakers broke the longest-baguette record.', sentence: 0, cues: [['record'], ['baguette*', 'pain']] },
          { id: 'length', en: '140 metres, longer than a football pitch.', sentence: 1, cues: [['cent quarante', 'terrain'], ['metre*', 'football']] },
          { id: 'oven', en: 'A special moving oven baked it.', sentence: 2, cues: [['four'], ['special*', 'avance*', 'cuire']] },
          { id: 'free', en: 'It was cut into pieces and given out free.', sentence: 3, cues: [['morceau*', 'coupe*'], ['gratuit*', 'distribu*']] },
        ],
        check: [
          { q: 'What record did they break?', options: ['The heaviest cake', 'The longest baguette', 'The biggest croissant'], answer: 1, sentence: 0 },
          { q: 'How was it baked?', options: ['In a moving oven', 'In many small ovens', 'In the sun'], answer: 0, sentence: 2 },
          { q: 'What happened to the baguette?', options: ['It was sold', 'It was given out free', 'It was thrown away'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Les records comme celui-ci sont-ils utiles ou juste amusants ? Pourquoi ?', en: 'Are records like this useful or just fun? Why?' },
        starters: ['Je trouve que c\'est surtout…', "C'est utile parce que…", 'Ça montre que…'],
        modelRetell: "Des boulangers français ont battu le record de la plus longue baguette du monde : cent quarante mètres. Un four spécial avançait le long de la pâte. Ensuite, on a coupé la baguette en morceaux et on l'a distribuée gratuitement.",
      },
      b2: {
        headline: 'La France reprend le record de la baguette',
        sentences: [
          { fr: "Cent quarante mètres de pain croustillant : des boulangers français viennent de reprendre le record de la plus longue baguette, détenu jusqu'ici par l'Italie.", en: 'A hundred and forty metres of crusty bread: French bakers have just won back the record for the longest baguette, held until now by Italy.' },
          { fr: 'Le défi a demandé des mois de préparation et plus de cent kilos de farine.', en: 'The challenge took months of preparation and over a hundred kilos of flour.' },
          { fr: "Le plus difficile était de cuire la pâte de façon régulière, sans qu'elle se casse.", en: 'The hardest part was baking the dough evenly, without it breaking.' },
          { fr: "Rien n'a été gaspillé : les morceaux ont été offerts à des associations de la région.", en: 'Nothing was wasted: the pieces were given to local charities.' },
        ],
        glossary: [
          { fr: 'croustillant', en: 'crusty' }, { fr: 'détenu', en: 'held' }, { fr: 'farine', en: 'flour' },
          { fr: 'de façon régulière', en: 'evenly' }, { fr: 'gaspillé', en: 'wasted' }, { fr: 'associations', en: 'charities' },
        ],
        facts: [
          { id: 'record', en: 'French bakers won the record back from Italy.', sentence: 0, cues: [['record'], ['italie', 'reprendre', 'baguette*']] },
          { id: 'flour', en: 'Months of preparation and over 100 kilos of flour.', sentence: 1, cues: [['farine', 'mois'], ['cent', 'kilo*', 'preparation']] },
          { id: 'baking', en: 'The hard part was baking it evenly without breaking.', sentence: 2, cues: [['cuire', 'cuisson'], ['casse*', 'reguli*', 'difficile']] },
          { id: 'charities', en: 'Nothing was wasted: the pieces went to charities.', sentence: 3, cues: [['association*', 'offert*', 'donne*'], ['gaspill*', 'morceau*']] },
        ],
        check: [
          { q: 'Who held the record before?', options: ['Spain', 'Italy', 'Germany'], answer: 1, sentence: 0 },
          { q: 'How much flour was used?', options: ['About 10 kilos', 'Over 100 kilos', '1,000 kilos'], answer: 1, sentence: 1 },
          { q: 'What happened to the pieces?', options: ['Given to charities', 'Sold to tourists', 'Fed to animals'], answer: 0, sentence: 3 },
        ],
        opinion: { fr: 'Faut-il interdire le gaspillage alimentaire dans les magasins ? Justifie ta réponse.', en: 'Should food waste be banned in shops? Justify your answer.' },
        starters: ['Il faudrait obliger les magasins à…', 'Le gaspillage est un problème car…', 'Au lieu de jeter, on pourrait…'],
        modelRetell: "Des boulangers français ont repris à l'Italie le record de la plus longue baguette : cent quarante mètres. Il a fallu des mois de préparation et plus de cent kilos de farine. Le plus difficile était de cuire la pâte sans qu'elle se casse. Les morceaux ont été offerts à des associations, donc rien n'a été gaspillé.",
      },
    },
  },
  {
    id: 'car-park-to-park', topicArea: 'environment', emoji: '🌳', reviewed: false,
    levels: {
      a2: {
        headline: 'Un parking devient un parc',
        sentences: [
          { fr: 'À Bordeaux, un grand parking est devenu un parc.', en: 'In Bordeaux, a big car park has become a park.' },
          { fr: 'La ville a planté trois cents arbres.', en: 'The town planted three hundred trees.' },
          { fr: 'Maintenant, il y a des jeux pour les enfants et des bancs.', en: 'Now there are games for children and benches.' },
          { fr: 'Les habitants peuvent venir à pied ou à vélo.', en: 'Local people can come on foot or by bike.' },
        ],
        glossary: [
          { fr: 'parking', en: 'car park' }, { fr: 'parc', en: 'park' }, { fr: 'arbres', en: 'trees' }, { fr: 'bancs', en: 'benches' }, { fr: 'à pied', en: 'on foot' },
        ],
        facts: [
          { id: 'park', en: 'A car park in Bordeaux became a park.', sentence: 0, cues: [['parking'], ['parc']] },
          { id: 'trees', en: '300 trees were planted.', sentence: 1, cues: [['trois cents'], ['arbre*']] },
          { id: 'games', en: 'There are games for children.', sentence: 2, cues: [['jeux', 'jeu'], ['enfant*']] },
          { id: 'bike', en: 'People come on foot or by bike.', sentence: 3, cues: [['pied', 'velo'], ['habitant*', 'venir', 'vien*']] },
        ],
        check: [
          { q: 'What was the place before?', options: ['A school', 'A car park', 'A shop'], answer: 1, sentence: 0 },
          { q: 'How many trees were planted?', options: ['30', '300', '3,000'], answer: 1, sentence: 1 },
          { q: 'How can people get there?', options: ['Only by car', 'On foot or by bike', 'By bus only'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Tu préfères les parcs ou les centres commerciaux ? Pourquoi ?', en: 'Do you prefer parks or shopping centres? Why?' },
        starters: ['Je préfère… parce que…', 'Dans un parc, on peut…'],
        modelRetell: 'À Bordeaux, un parking est devenu un parc. La ville a planté trois cents arbres. Il y a des jeux pour les enfants, et les habitants peuvent venir à pied ou à vélo.',
      },
      b1: {
        headline: 'À Bordeaux, des arbres à la place des voitures',
        sentences: [
          { fr: 'À Bordeaux, un parking de quatre cents places a laissé la place à un grand parc.', en: 'In Bordeaux, a four-hundred-space car park has made way for a big park.' },
          { fr: 'En un an, la ville y a planté trois cents arbres et créé un petit lac.', en: 'In one year, the town planted three hundred trees there and created a small lake.' },
          { fr: 'Le but est de rafraîchir le quartier pendant les étés de plus en plus chauds.', en: 'The aim is to cool the neighbourhood during ever hotter summers.' },
          { fr: 'Certains commerçants avaient peur de perdre des clients, mais ils sont finalement satisfaits.', en: 'Some shopkeepers were afraid of losing customers, but in the end they are satisfied.' },
        ],
        glossary: [
          { fr: 'places', en: 'spaces' }, { fr: 'lac', en: 'lake' }, { fr: 'rafraîchir', en: 'to cool' },
          { fr: 'quartier', en: 'neighbourhood' }, { fr: 'commerçants', en: 'shopkeepers' },
        ],
        facts: [
          { id: 'park', en: 'A 400-space car park became a park.', sentence: 0, cues: [['parking'], ['parc']] },
          { id: 'trees', en: '300 trees and a small lake.', sentence: 1, cues: [['arbre*'], ['trois cents', 'lac']] },
          { id: 'cool', en: 'The aim is to cool the area in hotter summers.', sentence: 2, cues: [['rafraichi*', 'frais', 'chaleur', 'chaud*'], ['quartier', 'ete*']] },
          { id: 'shops', en: 'Shopkeepers were worried but are now satisfied.', sentence: 3, cues: [['commercant*', 'magasin*'], ['satisfait*', 'content*', 'client*', 'peur']] },
        ],
        check: [
          { q: 'What was created as well as planting trees?', options: ['A swimming pool', 'A small lake', 'A skate park'], answer: 1, sentence: 1 },
          { q: 'Why did the town do it?', options: ['To cool the neighbourhood', 'To attract tourists', 'To build houses'], answer: 0, sentence: 2 },
          { q: 'How do the shopkeepers feel now?', options: ['Angry', 'Satisfied', 'Worried'], answer: 1, sentence: 3 },
        ],
        opinion: { fr: 'Faudrait-il moins de voitures dans les centres-villes ? Pourquoi ?', en: 'Should there be fewer cars in town centres? Why?' },
        starters: ['Oui, car…', 'Non, parce que beaucoup de gens…', 'Ce serait mieux pour…'],
        modelRetell: 'À Bordeaux, un parking de quatre cents places est devenu un parc. La ville a planté trois cents arbres et créé un lac, pour rafraîchir le quartier en été. Les commerçants avaient peur, mais ils sont satisfaits.',
      },
      b2: {
        headline: 'Un parc pour résister aux canicules',
        sentences: [
          { fr: "Là où quatre cents voitures se garaient chaque jour, des familles pique-niquent désormais à l'ombre.", en: 'Where four hundred cars used to park every day, families now picnic in the shade.' },
          { fr: "Bordeaux a transformé l'un de ses plus grands parkings en parc urbain, avec trois cents arbres et un lac.", en: 'Bordeaux has turned one of its biggest car parks into an urban park, with three hundred trees and a lake.' },
          { fr: "Selon les mesures, la température y est jusqu'à quatre degrés plus basse qu'autour pendant les canicules.", en: 'According to measurements, the temperature there is up to four degrees lower than around it during heatwaves.' },
          { fr: "Ce projet inspire déjà d'autres villes, même si certains automobilistes regrettent les places disparues.", en: 'The project is already inspiring other towns, even if some drivers miss the lost spaces.' },
        ],
        glossary: [
          { fr: 'se garaient', en: 'used to park' }, { fr: 'ombre', en: 'shade' }, { fr: 'mesures', en: 'measurements' },
          { fr: 'canicules', en: 'heatwaves' }, { fr: 'automobilistes', en: 'drivers' },
        ],
        facts: [
          { id: 'park', en: 'A big car park became an urban park.', sentence: 1, cues: [['parking*'], ['parc']] },
          { id: 'trees', en: 'It has 300 trees and a lake.', sentence: 1, cues: [['arbre*'], ['lac', 'trois cents']] },
          { id: 'cooler', en: 'It is up to 4°C cooler during heatwaves.', sentence: 2, cues: [['quatre', 'degre*'], ['temperature', 'canicule*', 'frais']] },
          { id: 'inspires', en: 'Other towns are inspired, though some drivers are unhappy.', sentence: 3, cues: [['ville*', 'inspire*'], ['automobiliste*', 'voiture*', 'regrett*']] },
        ],
        check: [
          { q: 'What do families do there now?', options: ['Play football', 'Picnic in the shade', 'Swim in the lake'], answer: 1, sentence: 0 },
          { q: 'How much cooler is it during heatwaves?', options: ['Up to 2 degrees', 'Up to 4 degrees', 'Up to 10 degrees'], answer: 1, sentence: 2 },
          { q: 'Who is unhappy?', options: ['Some drivers', 'The families', 'Other towns'], answer: 0, sentence: 3 },
        ],
        opinion: { fr: 'Les villes doivent-elles choisir entre les voitures et la nature ? Justifie ta réponse.', en: 'Must towns choose between cars and nature? Justify your answer.' },
        starters: ['À mon sens, il faut…', 'On peut trouver un équilibre si…', 'Le changement climatique oblige les villes à…'],
        modelRetell: "Bordeaux a transformé un grand parking en parc avec trois cents arbres et un lac. Pendant les canicules, la température y est quatre degrés plus basse. D'autres villes sont inspirées, même si des automobilistes regrettent les places.",
      },
    },
  },
];
