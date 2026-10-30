import type { BossId } from './bosses';

/**
 * Boss Battle's own question bank: English sentences to put into French, 24 per
 * boss, each with the accepted answers and the one-line rule shown after a miss.
 * It is authored here (not read from `data/scenarios/minigameQuestions.json`,
 * which has 5–11 per category and repeated within a single fight).
 *
 * Marking is `isCorrectAnswer` (`answer.ts`): accents, case, punctuation and
 * hyphens are ignored, and `œ` may be typed `oe`. The first answer is the one
 * shown as the model.
 */
export interface BossQuestion {
  id: string;
  english: string;
  /** Accepted answers; the first is shown as the correct form. */
  french: readonly [string, ...string[]];
  /** The rule behind the answer — shown after a miss. */
  tip: string;
}

const q = (
  id: string,
  english: string,
  french: BossQuestion['french'],
  tip: string,
): BossQuestion => ({ id, english, french, tip });

const GENDER: BossQuestion[] = [
  q('g01', 'I have a sister.', ['J’ai une sœur.'], 'Sœur is feminine, so it takes une.'),
  q('g02', 'I have a brother.', ['J’ai un frère.'], 'Frère is masculine, so it takes un.'),
  q('g03', 'She is happy.', ['Elle est heureuse.'], 'Heureux becomes heureuse for a feminine subject.'),
  q('g04', 'He is happy.', ['Il est heureux.'], 'Heureux stays as it is for a masculine subject.'),
  q('g05', 'The house is big.', ['La maison est grande.'], 'Maison is feminine, so the adjective adds an -e: grande.'),
  q('g06', 'The film is interesting.', ['Le film est intéressant.'], 'Film is masculine, so intéressant takes no extra -e.'),
  q('g07', 'The lesson is interesting.', ['La leçon est intéressante.'], 'Leçon is feminine, so the adjective adds -e.'),
  q('g08', 'My mother is tall.', ['Ma mère est grande.'], 'Use ma before a feminine noun, and add -e to grand.'),
  q('g09', 'My father is tall.', ['Mon père est grand.'], 'Use mon before a masculine noun; grand stays as it is.'),
  q('g10', 'I want a green apple.', ['Je veux une pomme verte.'], 'Pomme is feminine: une pomme, and vert becomes verte.'),
  q('g11', 'I want a white shirt.', ['Je veux une chemise blanche.'], 'Chemise is feminine: une chemise, and blanc becomes blanche.'),
  q('g12', 'She is a student.', ['Elle est étudiante.'], 'A feminine student adds -e: étudiante.'),
  q('g13', 'He is a student.', ['Il est étudiant.'], 'A masculine student is étudiant, with no -e.'),
  q('g14', 'I am going to the station.', ['Je vais à la gare.'], 'Gare is feminine, so it is à la gare.'),
  q('g15', 'I am going to the swimming pool.', ['Je vais à la piscine.'], 'Piscine is feminine, so it is à la piscine.'),
  q('g16', 'I am going to the market.', ['Je vais au marché.'], 'À + le always joins up as au: au marché.'),
  q('g17', 'The new shop is open.', ['Le nouveau magasin est ouvert.'], 'Magasin is masculine: nouveau goes before it and ouvert has no -e.'),
  q('g18', 'The new school is open.', ['La nouvelle école est ouverte.'], 'École is feminine: nouvelle and ouverte both take the feminine form.'),
  q('g19', 'These books are old.', ['Ces livres sont vieux.'], 'Livres is masculine plural: vieux.'),
  q('g20', 'These houses are old.', ['Ces maisons sont vieilles.'], 'Maisons is feminine plural: vieilles.'),
  q('g21', 'I eat some cheese.', ['Je mange du fromage.'], 'Fromage is masculine, so “some” is du.'),
  q('g22', 'I drink some water.', ['Je bois de l’eau.'], 'Before a vowel “some” is de l’: de l’eau.'),
  q('g23', 'We have a small flat.', ['Nous avons un petit appartement.'], 'Appartement is masculine, so un petit appartement.'),
  q('g24', 'I have a pretty skirt.', ['J’ai une jolie jupe.'], 'Jupe is feminine, so une jolie jupe.'),
];

const PAST_TENSE: BossQuestion[] = [
  q('p01', 'I ate a pizza yesterday.', ['J’ai mangé une pizza hier.', 'J’ai mangé de la pizza hier.'], 'A finished action in the past: passé composé with avoir + mangé.'),
  q('p02', 'She went to Paris.', ['Elle est allée à Paris.'], 'Aller takes être, and the participle agrees with elle: allée.'),
  q('p03', 'He went to Paris.', ['Il est allé à Paris.'], 'Aller takes être. With il the participle stays allé.'),
  q('p04', 'We watched a film.', ['Nous avons regardé un film.', 'On a regardé un film.'], 'Regarder takes avoir: nous avons regardé.'),
  q('p05', 'They arrived late.', ['Ils sont arrivés en retard.', 'Ils sont arrivés tard.'], 'Arriver takes être, and the participle agrees: arrivés.'),
  q('p06', 'I finished my homework.', ['J’ai fini mes devoirs.'], 'Finir is an avoir verb: j’ai fini.'),
  q('p07', 'Last year I visited Spain.', ['L’année dernière, j’ai visité l’Espagne.'], 'A single completed event: passé composé, with visiter taking avoir.'),
  q('p08', 'When I was young, I played football.', ['Quand j’étais jeune, je jouais au football.', 'Quand j’étais jeune, je jouais au foot.'], 'A habit in the past uses the imparfait: j’étais, je jouais.'),
  q('p09', 'It was raining.', ['Il pleuvait.'], 'Weather and background description use the imparfait: pleuvait.'),
  q('p10', 'I was tired.', ['J’étais fatigué.', 'J’étais fatiguée.'], 'A state of being in the past is the imparfait of être: j’étais.'),
  q('p11', 'She was eating when I arrived.', ['Elle mangeait quand je suis arrivé.', 'Elle mangeait quand je suis arrivée.'], 'The action in progress is imparfait; the interruption is passé composé.'),
  q('p12', 'I saw my friend yesterday.', ['J’ai vu mon ami hier.', 'J’ai vu mon amie hier.'], 'Voir takes avoir, and vu is irregular.'),
  q('p13', 'We did our homework.', ['Nous avons fait nos devoirs.'], 'Faire has an irregular participle: fait.'),
  q('p14', 'He got up at seven.', ['Il s’est levé à sept heures.'], 'Reflexive verbs take être in the passé composé: il s’est levé.'),
  q('p15', 'She woke up early.', ['Elle s’est réveillée tôt.', 'Elle s’est réveillée de bonne heure.'], 'Reflexive verbs take être and agree with the subject: réveillée.'),
  q('p16', 'I used to live in Lyon.', ['J’habitais à Lyon.', 'Je vivais à Lyon.'], '“Used to” means the imparfait: j’habitais.'),
  q('p17', 'They bought a car.', ['Ils ont acheté une voiture.'], 'Acheter takes avoir: ils ont acheté.'),
  q('p18', 'I read a book.', ['J’ai lu un livre.'], 'Lire has an irregular participle: lu.'),
  q('p19', 'She was born in 2008.', ['Elle est née en 2008.'], 'Naître takes être, and the participle agrees: née.'),
  q('p20', 'We stayed at home.', ['Nous sommes restés à la maison.', 'Nous sommes restées à la maison.'], 'Rester takes être and agrees with the subject: restés.'),
  q('p21', 'He was very nice.', ['Il était très gentil.'], 'Describing how someone was uses the imparfait: il était.'),
  q('p22', 'I took the bus.', ['J’ai pris le bus.', 'J’ai pris l’autobus.'], 'Prendre has an irregular participle: pris.'),
  q('p23', 'She fell.', ['Elle est tombée.'], 'Tomber takes être, and the participle agrees: tombée.'),
  q('p24', 'Every summer we went to the beach.', ['Chaque été, nous allions à la plage.', 'Chaque été, on allait à la plage.'], 'A repeated past action is the imparfait: nous allions.'),
];

const NEGATION: BossQuestion[] = [
  q('n01', 'I do not like fish.', ['Je n’aime pas le poisson.'], 'Ne shortens to n’ before a vowel: je n’aime pas.'),
  q('n02', 'I never eat meat.', ['Je ne mange jamais de viande.'], 'After a negative, du / de la / des becomes de: de viande.'),
  q('n03', 'She has no brother.', ['Elle n’a pas de frère.'], 'After ne… pas, un / une becomes de: pas de frère.'),
  q('n04', 'We do not have any bananas.', ['Nous n’avons pas de bananes.'], 'After ne… pas, des becomes de: pas de bananes.'),
  q('n05', 'He does not speak English.', ['Il ne parle pas anglais.', 'Il ne parle pas l’anglais.'], 'Ne goes before the verb and pas after it.'),
  q('n06', 'I see nobody.', ['Je ne vois personne.'], 'Ne… personne wraps the verb: je ne vois personne.'),
  q('n07', 'I know nothing.', ['Je ne sais rien.'], 'Ne… rien wraps the verb: je ne sais rien.'),
  q('n08', 'They no longer live here.', ['Ils n’habitent plus ici.'], 'Ne… plus means “no longer”: ils n’habitent plus.'),
  q('n09', 'I have not finished.', ['Je n’ai pas fini.'], 'In the passé composé, ne… pas wraps the auxiliary: n’ai pas fini.'),
  q('n10', 'I have never been to Paris.', ['Je ne suis jamais allé à Paris.', 'Je ne suis jamais allée à Paris.'], 'Ne… jamais wraps the auxiliary: ne suis jamais allé.'),
  q('n11', 'She did not eat anything.', ['Elle n’a rien mangé.'], 'Rien goes before the participle: n’a rien mangé.'),
  q('n12', 'I have not seen anyone.', ['Je n’ai vu personne.'], 'Personne goes after the participle: n’ai vu personne.'),
  q('n13', 'Nobody came.', ['Personne n’est venu.'], 'When personne is the subject it comes first: personne n’est venu.'),
  q('n14', 'I do not want to go out.', ['Je ne veux pas sortir.'], 'With two verbs, ne… pas wraps the first: ne veux pas sortir.'),
  q('n15', 'Do not eat that!', ['Ne mange pas ça !', 'Ne mangez pas ça !'], 'A negative command is ne + verb + pas.'),
  q('n16', 'I have no time.', ['Je n’ai pas de temps.', 'Je n’ai pas le temps.'], 'After ne… pas, un / du becomes de: pas de temps.'),
  q('n17', 'It is not expensive.', ['Ce n’est pas cher.'], 'C’est becomes ce n’est pas in the negative.'),
  q('n18', 'Nothing is impossible.', ['Rien n’est impossible.'], 'When rien is the subject it comes first: rien n’est.'),
  q('n19', 'She only has one sister.', ['Elle n’a qu’une sœur.'], 'Ne… que means “only”: qu’une sœur.'),
  q('n20', 'We no longer play tennis.', ['Nous ne jouons plus au tennis.'], 'Ne… plus wraps the verb: ne jouons plus.'),
  q('n21', 'He never listens.', ['Il n’écoute jamais.'], 'Ne shortens to n’ before a vowel, then jamais follows the verb.'),
  q('n22', 'I do not have a car.', ['Je n’ai pas de voiture.'], 'After ne… pas, une becomes de: pas de voiture.'),
  q('n23', 'There is no milk.', ['Il n’y a pas de lait.'], 'Il y a becomes il n’y a pas, then de.'),
  q('n24', 'We never go out on Mondays.', ['Nous ne sortons jamais le lundi.', 'On ne sort jamais le lundi.'], 'Ne… jamais wraps the verb; le lundi means “on Mondays”.'),
];

const FUTURE: BossQuestion[] = [
  q('f01', 'I am going to visit Paris.', ['Je vais visiter Paris.'], 'The near future is aller + infinitive: je vais visiter.'),
  q('f02', 'I will visit Paris.', ['Je visiterai Paris.'], 'The future simple is the infinitive + -ai: je visiterai.'),
  q('f03', 'We will go to Spain.', ['Nous irons en Espagne.'], 'Aller has an irregular stem in the future: ir-.'),
  q('f04', 'She will be happy.', ['Elle sera heureuse.'], 'Être has an irregular stem in the future: ser-.'),
  q('f05', 'They will have a dog.', ['Ils auront un chien.'], 'Avoir has an irregular stem in the future: aur-.'),
  q('f06', 'I will do my homework.', ['Je ferai mes devoirs.'], 'Faire has an irregular stem in the future: fer-.'),
  q('f07', 'He will come tomorrow.', ['Il viendra demain.'], 'Venir has an irregular stem in the future: viendr-.'),
  q('f08', 'You will see.', ['Tu verras.', 'Vous verrez.'], 'Voir has an irregular stem in the future: verr-.'),
  q('f09', 'It will be sunny.', ['Il fera beau.'], 'Weather with faire uses the stem fer-: il fera beau.'),
  q('f10', 'I will be able to help you.', ['Je pourrai t’aider.', 'Je pourrai vous aider.'], 'Pouvoir has an irregular stem in the future: pourr-.'),
  q('f11', 'We will have to leave.', ['Nous devrons partir.'], 'Devoir has an irregular stem in the future: devr-.'),
  q('f12', 'She will know the answer.', ['Elle saura la réponse.'], 'Savoir has an irregular stem in the future: saur-.'),
  q('f13', 'I will send an email.', ['J’enverrai un e-mail.', 'J’enverrai un mail.', 'J’enverrai un courriel.'], 'Envoyer has an irregular stem in the future: enverr-.'),
  q('f14', 'Next year I will study French at university.', ['L’année prochaine, j’étudierai le français à l’université.'], 'A regular -er verb: the infinitive + -ai.'),
  q('f15', 'Tomorrow it is going to rain.', ['Demain, il va pleuvoir.'], 'The near future is aller + infinitive: il va pleuvoir.'),
  q('f16', 'When I am older, I will travel.', ['Quand je serai grand, je voyagerai.', 'Quand je serai grande, je voyagerai.'], 'After quand, French uses the future when the meaning is future: quand je serai.'),
  q('f17', 'We are going to leave at eight.', ['Nous allons partir à huit heures.'], 'The near future is aller + infinitive: nous allons partir.'),
  q('f18', 'I will buy a present.', ['J’achèterai un cadeau.'], 'Acheter changes e to è before the ending: j’achèterai.'),
  q('f19', 'They will arrive at noon.', ['Ils arriveront à midi.'], 'Regular future: the infinitive + -ont for ils: arriveront.'),
  q('f20', 'She will take the train.', ['Elle prendra le train.'], 'Prendre drops its e in the future: prendr-.'),
  q('f21', 'I will call you tonight.', ['Je t’appellerai ce soir.', 'Je vous appellerai ce soir.'], 'Appeler doubles its l in the future: appeller-.'),
  q('f22', 'We will not forget.', ['Nous n’oublierons pas.'], 'Negative future: ne… pas wraps the verb, and oublier keeps its stem.'),
  q('f23', 'In ten years I will be a doctor.', ['Dans dix ans, je serai médecin.', 'Dans dix ans, je serai docteur.'], 'Être has an irregular stem in the future: ser-. No article before a job.'),
  q('f24', 'I will go out if it does not rain.', ['Je sortirai s’il ne pleut pas.'], 'After si, the verb is in the present; the main clause is in the future.'),
];

const SUBJUNCTIVE: BossQuestion[] = [
  q('s01', 'I want you to come.', ['Je veux que tu viennes.', 'Je veux que vous veniez.'], 'Vouloir que is followed by the subjunctive: que tu viennes.'),
  q('s02', 'It is necessary that we leave.', ['Il faut que nous partions.'], 'Il faut que is followed by the subjunctive: que nous partions.'),
  q('s03', 'I am afraid that he is late.', ['J’ai peur qu’il soit en retard.'], 'A feeling of fear takes the subjunctive; être becomes soit.'),
  q('s04', 'I am happy that you are here.', ['Je suis content que tu sois ici.', 'Je suis content que vous soyez ici.', 'Je suis heureux que tu sois ici.', 'Je suis heureux que vous soyez ici.'], 'A feeling takes the subjunctive; être becomes sois / soyez.'),
  q('s05', 'It is important that you work.', ['Il est important que tu travailles.', 'Il est important que vous travailliez.'], 'Il est important que is followed by the subjunctive.'),
  q('s06', 'I doubt that he is right.', ['Je doute qu’il ait raison.'], 'Doubt takes the subjunctive; avoir becomes ait.'),
  q('s07', 'Although it is raining, I am going out.', ['Bien qu’il pleuve, je sors.'], 'Bien que is always followed by the subjunctive: pleuve.'),
  q('s08', 'I want him to help me.', ['Je veux qu’il m’aide.'], 'When the subject changes, vouloir needs que + subjunctive: qu’il m’aide.'),
  q('s09', 'It is a shame that she cannot come.', ['C’est dommage qu’elle ne puisse pas venir.'], 'C’est dommage que is followed by the subjunctive; pouvoir becomes puisse.'),
  q('s10', 'Before you leave, call me.', ['Avant que tu partes, appelle-moi.', 'Avant que vous partiez, appelez-moi.'], 'Avant que is always followed by the subjunctive: que tu partes.'),
  q('s11', 'I would like you to do your homework.', ['Je voudrais que tu fasses tes devoirs.', 'Je voudrais que vous fassiez vos devoirs.'], 'Wishes take the subjunctive; faire becomes fasse-.'),
  q('s12', 'It is possible that he knows.', ['Il est possible qu’il sache.'], 'Il est possible que is followed by the subjunctive; savoir becomes sache.'),
  q('s13', 'I do not think that it is true.', ['Je ne pense pas que ce soit vrai.'], 'Ne pas penser que takes the subjunctive; être becomes soit.'),
  q('s14', 'She wants us to go out.', ['Elle veut que nous sortions.'], 'Vouloir que is followed by the subjunctive: que nous sortions.'),
  q('s15', 'It is better that you stay.', ['Il vaut mieux que tu restes.', 'Il vaut mieux que vous restiez.'], 'Il vaut mieux que is followed by the subjunctive.'),
  q('s16', 'I am waiting for him to arrive.', ['J’attends qu’il arrive.'], 'Attendre que is followed by the subjunctive: qu’il arrive.'),
  q('s17', 'We must be careful.', ['Il faut que nous soyons prudents.', 'Il faut que nous soyons prudentes.'], 'Il faut que needs the subjunctive; être becomes soyons.'),
  q('s18', 'I prefer that you choose.', ['Je préfère que tu choisisses.', 'Je préfère que vous choisissiez.'], 'Préférer que is followed by the subjunctive: que tu choisisses.'),
  q('s19', 'It is necessary that I have time.', ['Il faut que j’aie du temps.'], 'Il faut que needs the subjunctive; avoir becomes aie.'),
  q('s20', 'I am sorry that you are ill.', ['Je suis désolé que tu sois malade.', 'Je suis désolée que tu sois malade.', 'Je suis désolé que vous soyez malade.', 'Je suis désolée que vous soyez malade.'], 'A feeling of regret takes the subjunctive; être becomes sois / soyez.'),
  q('s21', 'It is necessary that he does the shopping.', ['Il faut qu’il fasse les courses.'], 'Il faut que needs the subjunctive; faire becomes fasse.'),
  q('s22', 'I want you to be happy.', ['Je veux que tu sois heureux.', 'Je veux que tu sois heureuse.', 'Je veux que vous soyez heureux.', 'Je veux que vous soyez heureuse.', 'Je veux que vous soyez heureuses.'], 'Vouloir que is followed by the subjunctive; être becomes sois / soyez.'),
  q('s23', 'I am going out so that you can rest.', ['Je sors pour que tu puisses te reposer.', 'Je sors pour que vous puissiez vous reposer.'], 'Pour que (so that) is followed by the subjunctive; pouvoir becomes puisses.'),
  q('s24', 'It is essential that she understands.', ['Il est essentiel qu’elle comprenne.'], 'Il est essentiel que is followed by the subjunctive: comprenne.'),
];

export const BOSS_BANK: Record<BossId, readonly BossQuestion[]> = {
  gender: GENDER,
  past_tense: PAST_TENSE,
  negation: NEGATION,
  future: FUTURE,
  subjunctive: SUBJUNCTIVE,
};
