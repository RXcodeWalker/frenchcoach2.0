import { WORD_TO_TYPE, type DetectiveQuestion, type Topic, type WordId, type WordPosition } from './types';

function tilesOf(prompt: string): string[] {
  const trimmed = prompt.trim();
  const body = trimmed.endsWith('?') ? trimmed.slice(0, -1).trim() : trimmed;
  return [...body.split(/\s+/).filter(Boolean), '?'];
}

function q(
  id: string,
  wordId: WordId,
  prompt: string,
  gloss: string,
  position: WordPosition,
  accepted: readonly string[],
  topic: Topic,
): DetectiveQuestion {
  return {
    id,
    wordId,
    prompt,
    gloss,
    position,
    answerType: WORD_TO_TYPE[wordId],
    accepted,
    model: accepted[0],
    topic,
    tiles: tilesOf(prompt),
  };
}

const QUI: DetectiveQuestion[] = [
  q('qui_01', 'qui', 'Tu parles à qui ?', 'Who are you talking to?', 'end', ['mon ami', 'un ami'], 'school'),
  q('qui_02', 'qui', 'C’est qui ?', 'Who is that?', 'end', ['ma sœur', 'ma soeur'], 'family'),
  q('qui_03', 'qui', 'Tu invites qui ?', 'Who are you inviting?', 'end', ['un copain', 'un ami'], 'hobbies'),
  q('qui_04', 'qui', 'Tu téléphones à qui ?', 'Who are you calling?', 'end', ['papa', 'mon père'], 'family'),
  q('qui_05', 'qui', 'Tu sors avec qui ?', 'Who are you going out with?', 'end', ['mes amis', 'un ami'], 'hobbies'),
  q('qui_06', 'qui', 'C’est pour qui ?', 'Who is this for?', 'end', ['ma mère', 'maman'], 'home'),
  q('qui_07', 'qui', 'Qui habite ici ?', 'Who lives here?', 'front', ['ma mère', 'maman'], 'home'),
  q('qui_08', 'qui', 'Qui enseigne le français ?', 'Who teaches French?', 'front', ['le prof', 'mon prof'], 'school'),
  q('qui_09', 'qui', 'Qui a un chien ?', 'Who has a dog?', 'front', ['mon père', 'papa'], 'animals'),
  q('qui_10', 'qui', 'Qui prépare le dîner ?', 'Who is making dinner?', 'front', ['maman', 'ma mère'], 'food'),
  q('qui_11', 'qui', 'Qui joue au foot ?', 'Who plays football?', 'front', ['Paul'], 'hobbies'),
  q('qui_12', 'qui', 'Qui est absent ?', 'Who is away?', 'front', ['Thomas'], 'school'),
  q('qui_13', 'qui', 'Qui chante bien ?', 'Who sings well?', 'front', ['Léa', 'Lea'], 'hobbies'),
  q('qui_14', 'qui', 'Qui range la chambre ?', 'Who tidies the room?', 'front', ['moi'], 'home'),
  q('qui_15', 'qui', 'Qui est-ce que tu invites ?', 'Who are you inviting?', 'estCeQue', ['Lucas'], 'hobbies'),
  q('qui_16', 'qui', 'Qui est-ce que tu aimes ?', 'Who do you like?', 'estCeQue', ['ma grand-mère', 'mamie'], 'family'),
  q('qui_17', 'qui', 'Qui est-ce qui a un chat ?', 'Who has a cat?', 'estCeQue', ['ma cousine'], 'animals'),
  q('qui_18', 'qui', 'Qui est-ce que tu vois ?', 'Who do you see?', 'estCeQue', ['le prof', 'mon prof'], 'school'),
  q('qui_19', 'qui', 'Qui est-ce qui vient ce soir ?', 'Who is coming tonight?', 'estCeQue', ['ma cousine'], 'family'),
  q('qui_20', 'qui', 'Qui est-ce que tu aides ?', 'Who are you helping?', 'estCeQue', ['mon frère'], 'family'),
];

const OU: DetectiveQuestion[] = [
  q('ou_01', 'ou', 'Tu habites où ?', 'Where do you live?', 'end', ['à Paris', 'Paris'], 'home'),
  q('ou_02', 'ou', 'Tu vas où ?', 'Where are you going?', 'end', ['à l’école', "à l'école", 'à l’ecole'], 'school'),
  q('ou_03', 'ou', 'On mange où ?', 'Where are we eating?', 'end', ['à la maison', 'chez moi'], 'food'),
  q('ou_04', 'ou', 'Le chat dort où ?', 'Where does the cat sleep?', 'end', ['dans ma chambre', 'ma chambre'], 'animals'),
  q('ou_05', 'ou', 'Tu joues où ?', 'Where do you play?', 'end', ['au parc', 'le parc'], 'hobbies'),
  q('ou_06', 'ou', 'Les clés sont où ?', 'Where are the keys?', 'end', ['sur la table', 'la table'], 'home'),
  q('ou_07', 'ou', 'Où habites-tu ?', 'Where do you live?', 'front', ['en France', 'France'], 'home'),
  q('ou_08', 'ou', 'Où vas-tu nager ?', 'Where do you go swimming?', 'front', ['à la plage', 'la plage'], 'hobbies'),
  q('ou_09', 'ou', 'Où est le cinéma ?', 'Where is the cinema?', 'front', ['en ville', 'au centre'], 'hobbies'),
  q('ou_10', 'ou', 'Où cours-tu ?', 'Where do you run?', 'front', ['au stade', 'le stade'], 'hobbies'),
  q('ou_11', 'ou', 'Où sont tes livres ?', 'Where are your books?', 'front', ['dans mon sac', 'mon sac'], 'school'),
  q('ou_12', 'ou', 'Où mange le chien ?', 'Where does the dog eat?', 'front', ['dans la cuisine', 'la cuisine'], 'animals'),
  q('ou_13', 'ou', 'Où est-ce que tu habites ?', 'Where do you live?', 'estCeQue', ['à Londres', 'Londres'], 'home'),
  q('ou_14', 'ou', 'Où est-ce que tu étudies ?', 'Where do you study?', 'estCeQue', ['à l’école', "à l'école"], 'school'),
  q('ou_15', 'ou', 'Où est-ce que tu vas le samedi ?', 'Where do you go on Saturday?', 'estCeQue', ['au cinéma', 'le cinéma'], 'hobbies'),
  q('ou_16', 'ou', 'Où est-ce qu’il y a du pain ?', 'Where is there bread?', 'estCeQue', ['à la boulangerie', 'la boulangerie'], 'food'),
  q('ou_17', 'ou', 'Où est-ce que tes parents travaillent ?', 'Where do your parents work?', 'estCeQue', ['en ville'], 'family'),
  q('ou_18', 'ou', 'Où est-ce que tu ranges tes affaires ?', 'Where do you put your things?', 'estCeQue', ['dans l’armoire', "dans l'armoire"], 'home'),
  q('ou_19', 'ou', 'Où est-ce que le hamster vit ?', 'Where does the hamster live?', 'estCeQue', ['dans sa cage', 'sa cage'], 'animals'),
  q('ou_20', 'ou', 'Où est-ce que tu prends le bus ?', 'Where do you catch the bus?', 'estCeQue', ['à l’arrêt', "à l'arrêt"], 'school'),
];

const QUAND: DetectiveQuestion[] = [
  q('quand_01', 'quand', 'Tu arrives quand ?', 'When do you arrive?', 'end', ['demain'], 'school'),
  q('quand_02', 'quand', 'On mange quand ?', 'When do we eat?', 'end', ['à midi', 'midi'], 'food'),
  q('quand_03', 'quand', 'Tu sors quand ?', 'When are you going out?', 'end', ['ce soir', 'le soir'], 'hobbies'),
  q('quand_04', 'quand', 'Les devoirs sont pour quand ?', 'When is the homework due?', 'end', ['lundi'], 'school'),
  q('quand_05', 'quand', 'Tu te lèves quand ?', 'When do you get up?', 'end', ['le matin', 'à sept heures'], 'home'),
  q('quand_06', 'quand', 'Le film commence quand ?', 'When does the film start?', 'end', ['à vingt heures', 'ce soir'], 'hobbies'),
  q('quand_07', 'quand', 'Quand pars-tu ?', 'When are you leaving?', 'front', ['aujourd’hui', "aujourd'hui"], 'home'),
  q('quand_08', 'quand', 'Quand joues-tu au foot ?', 'When do you play football?', 'front', ['le weekend', 'samedi'], 'hobbies'),
  q('quand_09', 'quand', 'Quand dînes-tu ?', 'When do you have dinner?', 'front', ['le soir', 'à vingt heures'], 'food'),
  q('quand_10', 'quand', 'Quand es-tu né ?', 'When were you born?', 'front', ['en juillet'], 'family'),
  q('quand_11', 'quand', 'Quand promènes-tu le chien ?', 'When do you walk the dog?', 'front', ['le matin'], 'animals'),
  q('quand_12', 'quand', 'Quand rentres-tu ?', 'When do you get home?', 'front', ['à six heures', 'ce soir'], 'home'),
  q('quand_13', 'quand', 'Quand est-ce que tu arrives ?', 'When do you arrive?', 'estCeQue', ['hier', 'demain'], 'school'),
  q('quand_14', 'quand', 'Quand est-ce que tu visites tes grands-parents ?', 'When do you visit your grandparents?', 'estCeQue', ['dimanche'], 'family'),
  q('quand_15', 'quand', 'Quand est-ce que les cours commencent ?', 'When do lessons start?', 'estCeQue', ['à huit heures'], 'school'),
  q('quand_16', 'quand', 'Quand est-ce que tu manges un gâteau ?', 'When do you eat cake?', 'estCeQue', ['à l’anniversaire', "à l'anniversaire"], 'food'),
  q('quand_17', 'quand', 'Quand est-ce que tu regardes un film ?', 'When do you watch a film?', 'estCeQue', ['le soir'], 'hobbies'),
  q('quand_18', 'quand', 'Quand est-ce que tu fais tes devoirs ?', 'When do you do your homework?', 'estCeQue', ['après l’école', "après l'école"], 'school'),
  q('quand_19', 'quand', 'Quand est-ce que le chat mange ?', 'When does the cat eat?', 'estCeQue', ['le matin'], 'animals'),
  q('quand_20', 'quand', 'Quand est-ce que tu voyages ?', 'When do you travel?', 'estCeQue', ['en été', 'en juillet'], 'hobbies'),
];

const COMBIEN: DetectiveQuestion[] = [
  q('cb_01', 'combien', 'Tu as combien de frères ?', 'How many brothers do you have?', 'end', ['deux', 'deux frères'], 'family'),
  q('cb_02', 'combien', 'Ça coûte combien ?', 'How much does it cost?', 'end', ['cinq euros', 'cinq'], 'food'),
  q('cb_03', 'combien', 'Tu as combien de chats ?', 'How many cats do you have?', 'end', ['un'], 'animals'),
  q('cb_04', 'combien', 'Il y a combien d’élèves ?', 'How many pupils are there?', 'end', ['vingt', 'trente'], 'school'),
  q('cb_05', 'combien', 'Tu veux combien de pommes ?', 'How many apples do you want?', 'end', ['trois', 'trois pommes'], 'food'),
  q('cb_06', 'combien', 'Tu as combien de stylos ?', 'How many pens do you have?', 'end', ['quatre'], 'school'),
  q('cb_07', 'combien', 'Combien de sœurs as-tu ?', 'How many sisters do you have?', 'front', ['une', 'une sœur', 'une soeur'], 'family'),
  q('cb_08', 'combien', 'Combien ça coûte ?', 'How much is it?', 'front', ['dix euros', 'dix'], 'hobbies'),
  q('cb_09', 'combien', 'Combien de livres lis-tu ?', 'How many books do you read?', 'front', ['deux', 'deux livres'], 'school'),
  q('cb_10', 'combien', 'Combien de chiens as-tu ?', 'How many dogs do you have?', 'front', ['zéro', 'aucun'], 'animals'),
  q('cb_11', 'combien', 'Combien d’heures dors-tu ?', 'How many hours do you sleep?', 'front', ['huit', 'huit heures'], 'home'),
  q('cb_12', 'combien', 'Combien de buts as-tu marqués ?', 'How many goals did you score?', 'front', ['trois'], 'hobbies'),
  q('cb_13', 'combien', 'Combien est-ce que ça coûte ?', 'How much does it cost?', 'estCeQue', ['deux euros', 'deux'], 'food'),
  q('cb_14', 'combien', 'Combien est-ce que tu as de cousins ?', 'How many cousins do you have?', 'estCeQue', ['six'], 'family'),
  q('cb_15', 'combien', 'Combien est-ce qu’il y a de chambres ?', 'How many rooms are there?', 'estCeQue', ['trois', 'trois chambres'], 'home'),
  q('cb_16', 'combien', 'Combien est-ce que tu veux de croissants ?', 'How many croissants do you want?', 'estCeQue', ['deux'], 'food'),
  q('cb_17', 'combien', 'Combien est-ce que tu as de crayons ?', 'How many pencils do you have?', 'estCeQue', ['cinq'], 'school'),
  q('cb_18', 'combien', 'Combien est-ce que tu as d’animaux ?', 'How many pets do you have?', 'estCeQue', ['deux'], 'animals'),
  q('cb_19', 'combien', 'Combien est-ce que tu joues d’heures ?', 'How many hours do you play?', 'estCeQue', ['une', 'une heure'], 'hobbies'),
  q('cb_20', 'combien', 'Combien est-ce que tu as de fenêtres ?', 'How many windows do you have?', 'estCeQue', ['quatre'], 'home'),
];

const COMMENT: DetectiveQuestion[] = [
  q('com_01', 'comment', 'Tu vas à l’école comment ?', 'How do you get to school?', 'end', ['en bus', 'le bus'], 'school'),
  q('com_02', 'comment', 'Tu voyages comment ?', 'How do you travel?', 'end', ['en train', 'le train'], 'hobbies'),
  q('com_03', 'comment', 'Tu vas au parc comment ?', 'How do you get to the park?', 'end', ['à pied'], 'hobbies'),
  q('com_04', 'comment', 'Tu parles comment ?', 'How do you speak?', 'end', ['lentement', 'doucement'], 'school'),
  q('com_05', 'comment', 'Le gâteau est comment ?', 'How is the cake?', 'end', ['délicieux', 'bon'], 'food'),
  q('com_06', 'comment', 'Tu te sens comment ?', 'How do you feel?', 'end', ['bien', 'fatigué'], 'home'),
  q('com_07', 'comment', 'Comment vas-tu à l’école ?', 'How do you get to school?', 'front', ['en voiture', 'la voiture'], 'school'),
  q('com_08', 'comment', 'Comment vas-tu au stade ?', 'How do you get to the stadium?', 'front', ['à vélo', 'en vélo'], 'hobbies'),
  q('com_09', 'comment', 'Comment écris-tu à tes amis ?', 'How do you write to your friends?', 'front', ['par email', 'par texto'], 'family'),
  q('com_10', 'comment', 'Comment est ton chien ?', 'What is your dog like?', 'front', ['gentil', 'calme'], 'animals'),
  q('com_11', 'comment', 'Comment cuisines-tu les pâtes ?', 'How do you cook pasta?', 'front', ['à l’eau', "à l'eau"], 'food'),
  q('com_12', 'comment', 'Comment ranges-tu ta chambre ?', 'How do you tidy your room?', 'front', ['vite', 'lentement'], 'home'),
  q('com_13', 'comment', 'Comment est-ce que tu y vas ?', 'How do you get there?', 'estCeQue', ['en bus'], 'school'),
  q('com_14', 'comment', 'Comment est-ce que tu apprends le français ?', 'How do you learn French?', 'estCeQue', ['en parlant'], 'school'),
  q('com_15', 'comment', 'Comment est-ce que tu vas chez tes grands-parents ?', 'How do you get to your grandparents’?', 'estCeQue', ['en voiture'], 'family'),
  q('com_16', 'comment', 'Comment est-ce que tu manges la soupe ?', 'How do you eat the soup?', 'estCeQue', ['avec une cuillère', 'à la cuillère'], 'food'),
  q('com_17', 'comment', 'Comment est-ce que tu joues ?', 'How do you play?', 'estCeQue', ['ensemble', 'en équipe'], 'hobbies'),
  q('com_18', 'comment', 'Comment est-ce que le chat entre ?', 'How does the cat come in?', 'estCeQue', ['par la fenêtre'], 'animals'),
  q('com_19', 'comment', 'Comment est-ce que tu ouvres la porte ?', 'How do you open the door?', 'estCeQue', ['avec la clé'], 'home'),
  q('com_20', 'comment', 'Comment est-ce que tu écoutes de la musique ?', 'How do you listen to music?', 'estCeQue', ['avec des écouteurs'], 'hobbies'),
];

const POURQUOI: DetectiveQuestion[] = [
  q('pq_01', 'pourquoi', 'Tu souris pourquoi ?', 'Why are you smiling?', 'end', ['c’est drôle', "c'est drôle", 'c’est drole'], 'hobbies'),
  q('pq_02', 'pourquoi', 'Tu manges pourquoi ?', 'Why are you eating?', 'end', ['j’ai faim', "j'ai faim"], 'food'),
  q('pq_03', 'pourquoi', 'Tu restes ici pourquoi ?', 'Why are you staying here?', 'end', ['il pleut'], 'home'),
  q('pq_04', 'pourquoi', 'Tu cours pourquoi ?', 'Why are you running?', 'end', ['en retard'], 'school'),
  q('pq_05', 'pourquoi', 'Le chien aboie pourquoi ?', 'Why is the dog barking?', 'end', ['il a peur'], 'animals'),
  q('pq_06', 'pourquoi', 'Tu bois pourquoi ?', 'Why are you drinking?', 'end', ['j’ai soif', "j'ai soif"], 'food'),
  q('pq_07', 'pourquoi', 'Pourquoi es-tu fatigué ?', 'Why are you tired?', 'front', ['je suis fatigué', "j'ai sommeil"], 'home'),
  q('pq_08', 'pourquoi', 'Pourquoi aimes-tu le foot ?', 'Why do you like football?', 'front', ['c’est super', "c'est super"], 'hobbies'),
  q('pq_09', 'pourquoi', 'Pourquoi étudies-tu ?', 'Why do you study?', 'front', ['j’aime ça', "j'aime ça"], 'school'),
  q('pq_10', 'pourquoi', 'Pourquoi n’achètes-tu pas ça ?', 'Why aren’t you buying that?', 'front', ['trop cher'], 'food'),
  q('pq_11', 'pourquoi', 'Pourquoi le chat miaule ?', 'Why is the cat meowing?', 'front', ['il a faim'], 'animals'),
  q('pq_12', 'pourquoi', 'Pourquoi tes parents sont contents ?', 'Why are your parents happy?', 'front', ['c’est l’anniversaire', "c'est l'anniversaire"], 'family'),
  q('pq_13', 'pourquoi', 'Pourquoi est-ce que tu souris ?', 'Why are you smiling?', 'estCeQue', ['parce que', 'c’est drôle', "c'est drôle"], 'hobbies'),
  q('pq_14', 'pourquoi', 'Pourquoi est-ce que tu portes un manteau ?', 'Why are you wearing a coat?', 'estCeQue', ['il fait froid'], 'home'),
  q('pq_15', 'pourquoi', 'Pourquoi est-ce que tu aimes l’école ?', 'Why do you like school?', 'estCeQue', ['c’est intéressant', "c'est intéressant"], 'school'),
  q('pq_16', 'pourquoi', 'Pourquoi est-ce que tu manges une pomme ?', 'Why are you eating an apple?', 'estCeQue', ['c’est bon', "c'est bon"], 'food'),
  q('pq_17', 'pourquoi', 'Pourquoi est-ce que tu aides ton frère ?', 'Why are you helping your brother?', 'estCeQue', ['il est petit'], 'family'),
  q('pq_18', 'pourquoi', 'Pourquoi est-ce que le hamster dort ?', 'Why is the hamster asleep?', 'estCeQue', ['il est fatigué'], 'animals'),
  q('pq_19', 'pourquoi', 'Pourquoi est-ce que tu restes à la maison ?', 'Why are you staying at home?', 'estCeQue', ['je suis malade'], 'home'),
  q('pq_20', 'pourquoi', 'Pourquoi est-ce que tu joues du piano ?', 'Why do you play the piano?', 'estCeQue', ['j’aime ça', "j'aime ça"], 'hobbies'),
];

const QUEL: DetectiveQuestion[] = [
  q('ql_01', 'quel', 'Tu aimes quelle couleur ?', 'Which colour do you like?', 'end', ['le bleu', 'bleu'], 'hobbies'),
  q('ql_02', 'quel', 'Tu prends quel fruit ?', 'Which fruit are you taking?', 'end', ['une banane', 'la banane'], 'food'),
  q('ql_03', 'quel', 'Tu as quel animal ?', 'Which pet do you have?', 'end', ['un chat', 'le chat'], 'animals'),
  q('ql_04', 'quel', 'Tu visites quelle pièce ?', 'Which room are you visiting?', 'end', ['le garage'], 'home'),
  q('ql_05', 'quel', 'Tu choisis quel sport ?', 'Which sport do you pick?', 'end', ['le tennis', 'tennis'], 'hobbies'),
  q('ql_06', 'quel', 'Tu parles quelle langue ?', 'Which language do you speak?', 'end', ['l’anglais', "l'anglais", 'anglais'], 'school'),
  q('ql_07', 'quel', 'Quelle couleur aimes-tu ?', 'Which colour do you like?', 'front', ['le rouge', 'rouge'], 'hobbies'),
  q('ql_08', 'quel', 'Quel plat préfères-tu ?', 'Which dish do you prefer?', 'front', ['la pizza', 'pizza'], 'food'),
  q('ql_09', 'quel', 'Quel animal préfères-tu ?', 'Which animal do you prefer?', 'front', ['le chien', 'un chien'], 'animals'),
  q('ql_10', 'quel', 'Quelle matière aimes-tu ?', 'Which subject do you like?', 'front', ['les maths', 'maths'], 'school'),
  q('ql_11', 'quel', 'Quel jour est-ce aujourd’hui ?', 'What day is it today?', 'front', ['vendredi'], 'school'),
  q('ql_12', 'quel', 'Quelle boisson veux-tu ?', 'Which drink do you want?', 'front', ['un jus'], 'food'),
  q('ql_13', 'quel', 'Quelle couleur est-ce que tu aimes ?', 'Which colour do you like?', 'estCeQue', ['le vert', 'vert'], 'hobbies'),
  q('ql_14', 'quel', 'Quel film est-ce que tu regardes ?', 'Which film are you watching?', 'estCeQue', ['un dessin animé'], 'hobbies'),
  q('ql_15', 'quel', 'Quel sandwich est-ce que tu prends ?', 'Which sandwich are you having?', 'estCeQue', ['au fromage'], 'food'),
  q('ql_16', 'quel', 'Quelle pièce est-ce que tu ranges ?', 'Which room are you tidying?', 'estCeQue', ['le salon'], 'home'),
  q('ql_17', 'quel', 'Quel cousin est-ce que tu vois ?', 'Which cousin are you seeing?', 'estCeQue', ['Hugo'], 'family'),
  q('ql_18', 'quel', 'Quel livre est-ce que tu lis ?', 'Which book are you reading?', 'estCeQue', ['un roman'], 'school'),
  q('ql_19', 'quel', 'Quel oiseau est-ce que tu regardes ?', 'Which bird are you looking at?', 'estCeQue', ['un oiseau rouge'], 'animals'),
  q('ql_20', 'quel', 'Quel jeu est-ce que tu aimes ?', 'Which game do you like?', 'estCeQue', ['les cartes'], 'hobbies'),
];

const QUESTCE: DetectiveQuestion[] = [
  q('qq_01', 'questce', 'Tu manges quoi ?', 'What are you eating?', 'end', ['un sandwich'], 'food'),
  q('qq_02', 'questce', 'Tu fais quoi ?', 'What are you doing?', 'end', ['mes devoirs'], 'school'),
  q('qq_03', 'questce', 'Tu bois quoi ?', 'What are you drinking?', 'end', ['du chocolat'], 'food'),
  q('qq_04', 'questce', 'Tu regardes quoi ?', 'What are you watching?', 'end', ['un film'], 'hobbies'),
  q('qq_05', 'questce', 'Tu portes quoi ?', 'What are you wearing?', 'end', ['un manteau'], 'home'),
  q('qq_06', 'questce', 'Le chien mange quoi ?', 'What is the dog eating?', 'end', ['des croquettes'], 'animals'),
  q('qq_07', 'questce', 'Qu’est-ce que tu manges ?', 'What are you eating?', 'front', ['une pomme'], 'food'),
  q('qq_08', 'questce', 'Qu’est-ce que tu fais ?', 'What are you doing?', 'front', ['du foot'], 'hobbies'),
  q('qq_09', 'questce', 'Qu’est-ce que tu lis ?', 'What are you reading?', 'front', ['un livre'], 'school'),
  q('qq_10', 'questce', 'Qu’est-ce que tu bois ?', 'What are you drinking?', 'front', ['de l’eau', "de l'eau"], 'food'),
  q('qq_11', 'questce', 'Qu’est-ce que tu cherches ?', 'What are you looking for?', 'front', ['mes clés'], 'home'),
  q('qq_12', 'questce', 'Qu’est-ce que le chat voit ?', 'What does the cat see?', 'front', ['un oiseau'], 'animals'),
  q('qq_13', 'questce', 'Qu’est-ce que tu prépares ?', 'What are you making?', 'estCeQue', ['un gâteau'], 'food'),
  q('qq_14', 'questce', 'Qu’est-ce que tu étudies ?', 'What are you studying?', 'estCeQue', ['le français'], 'school'),
  q('qq_15', 'questce', 'Qu’est-ce que tu offres ?', 'What are you giving?', 'estCeQue', ['un cadeau'], 'family'),
  q('qq_16', 'questce', 'Qu’est-ce que tu écoutes ?', 'What are you listening to?', 'estCeQue', ['de la musique'], 'hobbies'),
  q('qq_17', 'questce', 'Qu’est-ce que tu ranges ?', 'What are you tidying?', 'estCeQue', ['mes affaires'], 'home'),
  q('qq_18', 'questce', 'Qu’est-ce que tu dessines ?', 'What are you drawing?', 'estCeQue', ['un cheval'], 'animals'),
  q('qq_19', 'questce', 'Qu’est-ce que tu collectionnes ?', 'What do you collect?', 'estCeQue', ['des cartes'], 'hobbies'),
  q('qq_20', 'questce', 'Qu’est-ce que tu prends au petit-déjeuner ?', 'What do you have for breakfast?', 'estCeQue', ['du pain'], 'food'),
];

export const DETECTIVE_BANK: readonly DetectiveQuestion[] = [
  ...QUI,
  ...OU,
  ...QUAND,
  ...COMBIEN,
  ...COMMENT,
  ...POURQUOI,
  ...QUEL,
  ...QUESTCE,
];

export function questionsFor(wordId: WordId): DetectiveQuestion[] {
  return DETECTIVE_BANK.filter(q => q.wordId === wordId);
}

export function questionById(id: string): DetectiveQuestion | undefined {
  return DETECTIVE_BANK.find(q => q.id === id);
}
