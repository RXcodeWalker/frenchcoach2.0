/** Respeller cases shared by the respell tests and the homophone version pin. */

/** [as heard, context-consistent spelling]. */
export const RESPELLED: [string, string][] = [
  // 1. subject number — from an audible verb, or from context.
  ["J'ai un frère. Ils mangent beaucoup.", "J'ai un frère. Il mange beaucoup."],
  ["J'ai deux frères. Il mange beaucoup.", "J'ai deux frères. Ils mangent beaucoup."],
  ["J'ai une sœur. Elles mangent.", "J'ai une sœur. Elle mange."],
  ["J'ai un frère. Il aime le foot. Ils jouent souvent.", "J'ai un frère. Il aime le foot. Il joue souvent."],
  ['il sont gentils', 'ils sont gentils'],
  ['ils fait du sport', 'il fait du sport'],
  // The verb is heard as singular/plural: the pronoun follows it, the verb is never "corrected".
  ['il vendent', 'ils vendent'],
  ['ils vend', 'il vend'],
  ['il prennent', 'ils prennent'],
  // 2. subject ↔ verb ending.
  ['ils mange une pomme', 'ils mangent une pomme'],
  ['il mangent', 'il mange'],
  ['On mangent ensemble', 'On mange ensemble'],
  ['Ils ne mange pas', 'Ils ne mangent pas'],
  ["j'aimes le thé", "j'aime le thé"],
  ['Je m’appelles Paul', 'Je m’appelle Paul'],
  ["Elle s'appellent Marie", "Elle s'appelle Marie"],
  ['je fait mes devoirs', 'je fais mes devoirs'],
  ['il fais du sport', 'il fait du sport'],
  ['je peut venir', 'je peux venir'],
  ['tu veut venir', 'tu veux venir'],
  ['Je mangeait', 'Je mangeais'],
  ['ils mangeait', 'ils mangeaient'],
  ['vous mangé', 'vous mangez'],
  ['Ma sœur achètent', 'Ma sœur achètent'],
  // 3. et / est / es.
  ['Il et grand et il est sympa', 'Il est grand et il est sympa'],
  ['tu est allé', 'tu es allé'],
  ['il es allé', 'il est allé'],
  ["c'et super", "c'est super"],
  ['Ma sœur ? Elle et gentille.', 'Ma sœur ? Elle est gentille.'],
  // 4. a / à / as.
  ['Je vais a la plage', 'Je vais à la plage'],
  ['Il à mangé', 'Il a mangé'],
  ['il y à un parc', 'il y a un parc'],
  ['tu à un chien', 'tu as un chien'],
  ['A mon avis, c’est bien', 'À mon avis, c’est bien'],
  ["c'est a moi", "c'est à moi"],
  ['Mon père travaille a l’hôpital', 'Mon père travaille à l’hôpital'],
  ['le garçon qui à', 'le garçon qui a'],
  // 5. auxiliary ↔ participle / infinitive.
  ["J'ai manger une pomme", "J'ai mangé une pomme"],
  ["Je n'ai pas aimer le film", "Je n'ai pas aimé le film"],
  ['Je lui ai donner un cadeau', 'Je lui ai donné un cadeau'],
  ['Elle est aller au cinéma', 'Elle est allé au cinéma'],
  ['Je me suis lever tôt', 'Je me suis levé tôt'],
  ["j'ai était malade", "j'ai été malade"],
  ['Je vais mangé', 'Je vais manger'],
  ['Je vais visitez Paris', 'Je vais visiter Paris'],
  ['On peut mangé à la cantine', 'On peut manger à la cantine'],
  ['Les élèves doivent porté un uniforme', 'Les élèves doivent porter un uniforme'],
  ['Il faut recyclé', 'Il faut recycler'],
  ["J'ai décidé d'achetais", "J'ai décidé d'acheter"],
  ['je commence a travaillé', 'je commence à travaillé'],
  // 6. determiner ↔ plural.
  ["J'ai des ami et mes parent.", "J'ai des amis et mes parents."],
  ['mes cheveu', 'mes cheveux'],
  ['des petit enfant', 'des petits enfants'],
  ['il y a deux an', 'il y a deux ans'],
  ['Ces chat sont mignons', 'Ces chats sont mignons'],
  ['les chat', 'les chats'],
  ["J'ai acheter des cadeau pour mes ami.", "J'ai acheté des cadeaux pour mes amis."],
];

/** Already right, or not decidable from context: left exactly as heard. */
export const UNCHANGED: string[] = [
  // Liaison: the [z] of "ils aiment" is heard, so il/ils is not a spelling choice.
  'Ils aiment le foot',
  "J'ai un frère. Ils aiment le foot.",
  'il ont un chien',
  // Context is ambiguous or points at an object, not the subject.
  'Il mange des pommes et elle mange une banane',
  'Elle a des frères. Elle les aime.',
  'Ils ont un chien. Il joue.',
  'Mon frère a deux chats. Il mange beaucoup.',
  "J'ai un frère et une sœur. Ils mangent.",
  "j'ai un frère il mange",
  // "c'est + infinitive" and nouns that look like participles.
  "Mon passe-temps préféré, c'est jouer au foot",
  "j'aime le marché", 'je veux le thé', "J'aime le café et le thé",
  // "les" / numbers as pronouns.
  'Je les mange', 'Mes parents les adorent', 'Les deux aiment', 'Je veux les voir',
  // Real "and", real "has".
  'tu et moi', 'il et elle', 'Ma mère a la grippe', 'Mon frère a 15 ans', "c'est toi qui as",
  // Names, hyphenated words, invariable plurals.
  'Paris est beau', 'ces jours-ci', 'J’aime les animal',
  // Correct text.
  'Il a été', 'Ça a été super', 'Tu es allé', 'Où est ta sœur', 'est-ce que tu aimes',
  'La plage est belle et le soleil brille', 'Mes amis et moi, nous aimons',
  // Review findings (Opus, stage 2): weak context must not fire.
  'Cet été a été génial.', 'Mon téléphone a sonné', 'Le reste a été facile', 'Mon père a peu de temps',
  'Ma mère… a quarante ans', 'Je joue avec elle à la plage', 'Je fais ça à la maison',
  'qui, à mon avis, est', 'avec elle et mon frère', "J'aime ça et je veux",
  'le 3 mai', 'Le 14 juillet',
  "J'ai vu mes cousins. Il faisait beau.", "J'ai vu mes cousins. Il pleuvait.",
  "J'ai vu mes cousins. Il me semble que", "J'ai vu mes cousins. Il y avait du monde.",
  "quelqu'un d'organisé", 'quelque chose de cassé', "beaucoup d'invités", "pour l'invité",
  'club de plongée', 'beaucoup de marchés', "J'ai mangé des œuf",
  'Mon père les répare', 'Paul les aime', 'Mon frère est tu sais très sympa', 'est je pense que',
  // Unknown verbs are left alone.
  'ils mangeons', 'il blablate', 'ils blablatent',
  '',
];
