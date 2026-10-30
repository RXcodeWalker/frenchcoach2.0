/**
 * The ten grammar bosses and the mixed Gauntlet. Pure data: the fight rules live in `engine.ts`, the
 * questions in `bank.ts`, and the icon and hue (Design System v2 — a hue only
 * ever appears inside the boss's chip) in `bossVisuals.ts`.
 */

export type BossId =
  | 'gender'
  | 'quantity'
  | 'past_tense'
  | 'negation'
  | 'pronouns'
  | 'comparison'
  | 'future'
  | 'conditional'
  | 'time'
  | 'subjunctive';

/** Anything you can fight: a grammar boss, or the Gauntlet that draws from all of them. */
export type FightId = BossId | 'gauntlet';

export type Mechanic = 'fog' | 'stun' | 'timer' | 'poison' | 'lock';

export type BossDifficulty = 'easy' | 'medium' | 'hard';

/** What a boss says, by what just happened. `engine.ts` picks the line by round number, so there is no flicker. */
export interface BossLines {
  intro: string;
  /** The learner answered correctly. */
  hurt: readonly string[];
  /** The learner answered wrongly. */
  gloat: readonly string[];
  /** The boss dropped to half health. */
  enraged: string;
  /** The boss was beaten. */
  beaten: string;
  /** The learner was beaten. */
  wins: string;
}

export interface Boss {
  id: FightId;
  /** French name — the headline. */
  name: string;
  /** English title — the gloss. */
  title: string;
  difficulty: BossDifficulty;
  hp: number;
  /** The grammar topic in one or two words — the tag shown on a Gauntlet question. */
  topic: string;
  /** The grammar the fight drills, in a few words. */
  focus: string;
  /** One line of story for the selection card. */
  blurb: string;
  mechanic: Mechanic;
  /** For a `timer` boss: seconds on the clock before it is enraged (otherwise the clock starts at half health). */
  openingClock?: number;
  mechanicName: string;
  /** What the mechanic does, in one sentence a learner can act on. */
  mechanicRule: string;
  lines: BossLines;
}

/** One of the ten grammar bosses — a `Boss` whose id has its own question bank. */
export type GrammarBoss = Boss & { id: BossId };

export const BOSSES: readonly GrammarBoss[] = [
  {
    id: 'gender',
    name: 'La Reine du Genre',
    title: 'The Queen of Gender',
    difficulty: 'easy',
    hp: 100,
    topic: 'Gender',
    focus: 'le / la, un / une, adjective agreement',
    blurb: 'She rules every noun in the kingdom and punishes the wrong article.',
    mechanic: 'lock',
    mechanicName: 'Gender Lock',
    mechanicRule: 'A wrong answer locks one of your moves for two rounds.',
    lines: {
      intro: 'Le ou la? Choose wisely, challenger.',
      hurt: ['Hm. A lucky guess.', 'Correct… this time.'],
      gloat: ['Wrong gender! Your grammar crumbles.', 'A masculine noun with a feminine article? Quelle horreur!'],
      enraged: 'Enough! My kingdom will not fall to you.',
      beaten: 'Impossible… you know every noun by heart.',
      wins: 'Back to the nursery, little one.',
    },
  },
  {
    id: 'quantity',
    name: 'La Marchande des Quantités',
    title: 'The Quantity Merchant',
    difficulty: 'easy',
    hp: 100,
    topic: 'Quantities',
    focus: 'du / de la / des, and de after quantities and negatives',
    blurb: 'She weighs every noun by the kilo and will not sell you the wrong “some”.',
    mechanic: 'lock',
    mechanicName: 'Sold Out',
    mechanicRule: 'A wrong answer locks one of your moves for two rounds.',
    lines: {
      intro: 'How much do you want? Du, de la, des… or just de?',
      hurt: ['A fair weight.', 'Correct. I will not charge extra.'],
      gloat: ['Wrong measure! You pay double.', 'Beaucoup de… and then what? Not an article!'],
      enraged: 'The shop is closing. Last orders!',
      beaten: 'The shelves are bare. You took everything.',
      wins: 'Come back when you can count.',
    },
  },
  {
    id: 'past_tense',
    name: 'Le Chevalier du Passé',
    title: 'The Past Tense Knight',
    difficulty: 'medium',
    hp: 120,
    topic: 'Past tenses',
    focus: 'passé composé and imparfait',
    blurb: 'A warrior who never forgets a mistake and never waits for your answer.',
    mechanic: 'timer',
    mechanicName: 'Quickened Time',
    mechanicRule: 'At half health every answer has a 15-second clock.',
    lines: {
      intro: 'I was strong, I am strong, and I have always been strong.',
      hurt: ['A fair strike, on time.', 'You remember well.'],
      gloat: ['Too slow, too wrong. It is already history.', 'Passé composé or imparfait? Decide quickly, or fall!'],
      enraged: 'The clock is mine now. Hurry!',
      beaten: 'My story ends… but yours has only begun.',
      wins: 'Another name for my list of the fallen.',
    },
  },
  {
    id: 'negation',
    name: "L'Ombre de la Négation",
    title: 'The Shadow of Negation',
    difficulty: 'medium',
    hp: 120,
    topic: 'Negation',
    focus: 'ne… pas, jamais, rien, personne, plus',
    blurb: 'A shadow of denial whose venom works on anyone who forgets the second half.',
    mechanic: 'poison',
    mechanicName: 'Venom',
    mechanicRule: 'A wrong answer poisons you: 3 damage a round until you answer two in a row.',
    lines: {
      intro: 'Ne… rien. That is what will remain of you.',
      hurt: ['Hm. Not nothing, then.', 'You found the second half.'],
      gloat: ['Ne… jamais forget that.', 'Your efforts are in vain.'],
      enraged: 'I deny your right to victory!',
      beaten: 'I… was not… here.',
      wins: 'Nothing. Nobody. Nowhere.',
    },
  },
  {
    id: 'pronouns',
    name: 'Le Gardien des Pronoms',
    title: 'The Pronoun Guardian',
    difficulty: 'medium',
    hp: 120,
    topic: 'Pronouns',
    focus: 'le, la, les, lui, leur, y, en and reflexive verbs',
    blurb: 'He stands between every verb and its object, and he moves when you least expect it.',
    mechanic: 'timer',
    mechanicName: 'Snap Judgement',
    mechanicRule: 'At half health every answer has a 15-second clock.',
    lines: {
      intro: 'Where does it go? Before the verb. Always before the verb.',
      hurt: ['It landed in the right place.', 'Hm. Well placed.'],
      gloat: ['Wrong pronoun. Wrong place.', 'Le, la, lui, leur… you are guessing.'],
      enraged: 'No more time to think!',
      beaten: 'I have been… replaced.',
      wins: 'A pronoun is a small word. Losing to it is smaller.',
    },
  },
  {
    id: 'comparison',
    name: 'Le Titan du Comparatif',
    title: 'The Titan of Comparison',
    difficulty: 'medium',
    hp: 120,
    topic: 'Comparisons',
    focus: 'plus… que, moins… que, aussi… que, le plus, meilleur / mieux',
    blurb: 'He measures everyone against everyone, and he is always the biggest.',
    mechanic: 'stun',
    mechanicName: 'Titan’s Stomp',
    mechanicRule: 'A heavy blow you do not block stuns you: your next move can only be Strike.',
    lines: {
      intro: 'I am bigger than you. Plus grand que toi.',
      hurt: ['Smaller than I thought.', 'A good hit. You are still weaker than me.'],
      gloat: ['Moins fort que moi. Always.', 'The best, the biggest, the strongest. And you?'],
      enraged: 'Now I am taller than the mountain!',
      beaten: 'Someone… is better than me.',
      wins: 'Le plus fort gagne. C’est moi.',
    },
  },
  {
    id: 'future',
    name: 'Le Golem du Futur',
    title: 'The Golem of the Future',
    difficulty: 'hard',
    hp: 150,
    topic: 'Future',
    focus: 'futur proche, futur simple and its irregular stems',
    blurb: 'A stone giant from the time ahead. Its slam lands every few rounds, ready or not.',
    mechanic: 'stun',
    mechanicName: 'Stone Slam',
    mechanicRule: 'A heavy blow you do not block stuns you: your next move can only be Strike.',
    lines: {
      intro: 'I have seen the end. You are not in it.',
      hurt: ['A crack. I will mend.', 'You are stronger than you were foretold.'],
      gloat: ['Your destiny is set in stone.', 'The future belongs to the strong.'],
      enraged: 'The ground will shake. Brace yourself!',
      beaten: 'The future… was not written after all.',
      wins: 'It was always going to end this way.',
    },
  },
  {
    id: 'conditional',
    name: 'Le Dragon du Conditionnel',
    title: 'The Conditional Dragon',
    difficulty: 'hard',
    hp: 150,
    topic: 'Conditional',
    focus: 'the conditional, and si + imparfait',
    blurb: 'A dragon of what might be. Everything it says begins with “if”.',
    mechanic: 'poison',
    mechanicName: 'Dragonfire',
    mechanicRule: 'A wrong answer sets you alight: 3 damage a round until you answer two in a row.',
    lines: {
      intro: 'If you were braver, you would have fled already.',
      hurt: ['It would have hurt less had I dodged.', 'A scratch. I would have you know.'],
      gloat: ['If you had studied, you would have won.', 'You would lose. You do lose.'],
      enraged: 'If I were you, I would run.',
      beaten: 'If only I had been faster…',
      wins: 'I would say well fought. But no.',
    },
  },
  {
    id: 'time',
    name: 'Le Maître de l’Horloge',
    title: 'The Clockmaster',
    difficulty: 'hard',
    hp: 150,
    topic: 'Time words',
    focus: 'depuis, pendant, il y a, dans, en',
    blurb: 'He counts every second you have spent and every second you have left.',
    mechanic: 'timer',
    mechanicName: 'Ticking Clock',
    mechanicRule: 'At half health every answer has a 15-second clock.',
    lines: {
      intro: 'Depuis quand êtes-vous ici? Time is running out.',
      hurt: ['A second well spent.', 'You were on time.'],
      gloat: ['Too late. Il y a une seconde, you had a chance.', 'Tick. Tock. Wrong.'],
      enraged: 'Every second counts now.',
      beaten: 'My clock… has stopped.',
      wins: 'Your time is up.',
    },
  },
  {
    id: 'subjunctive',
    name: 'Le Sorcier du Subjonctif',
    title: 'The Subjunctive Sorcerer',
    difficulty: 'hard',
    hp: 150,
    topic: 'Subjunctive',
    focus: 'the subjunctive after il faut que, vouloir que, bien que…',
    blurb: 'Master of doubt, wish and feeling. He hides what he does not want you to read.',
    mechanic: 'fog',
    mechanicName: 'Fog of Doubt',
    mechanicRule: 'At half health half of each prompt is veiled. You can clear it, but that breaks your combo.',
    lines: {
      intro: 'You doubt my power? How… subjunctive of you.',
      hurt: ['Il faut que je sois plus prudent.', 'A clean strike. I doubt it will happen twice.'],
      gloat: ['Il faut que tu perdes!', 'My mood is uncertain; your defeat is not.'],
      enraged: 'Let the fog roll in.',
      beaten: 'I never doubted you… much.',
      wins: 'Perhaps you will win next time. Perhaps.',
    },
  },
] as const;

/**
 * The Gauntlet: one fight that deals questions from all ten bosses, one topic
 * after another. Its only trick is the clock, which runs from the first round.
 * It is not in `BOSSES` (the list of grammar bosses, each with its own bank).
 */
export const GAUNTLET: Boss = {
  id: 'gauntlet',
  name: 'Le Maître du Défi',
  title: 'The Gauntlet Master',
  difficulty: 'hard',
  hp: 180,
  topic: 'Mixed',
  focus: 'all ten topics, shuffled',
  blurb: 'Ten masters send one question each, round after round. You never know which grammar is next.',
  mechanic: 'timer',
  openingClock: 25,
  mechanicName: 'Against the Clock',
  mechanicRule: 'Every answer has a 25-second clock, and 15 seconds once the Gauntlet is at half health.',
  lines: {
    intro: 'Ten masters, one test. Ready?',
    hurt: ['One down. The next master is waiting.', 'Well answered. Now something different.'],
    gloat: ['The masters thank you for the points.', 'Which grammar was that? Think harder.'],
    enraged: 'Faster! The masters grow impatient.',
    beaten: 'You have bested all ten.',
    wins: 'The masters send their regards.',
  },
};

export function getBoss(id: string): Boss | undefined {
  return id === GAUNTLET.id ? GAUNTLET : BOSSES.find((b) => b.id === id);
}

/** The boss's spoken line for a moment in the fight. `round` makes the pick deterministic. */
export function bossLine(boss: Boss, moment: 'intro' | 'hurt' | 'gloat' | 'enraged' | 'beaten' | 'wins', round: number): string {
  const line = boss.lines[moment];
  if (typeof line === 'string') return line;
  return line[Math.abs(round) % line.length];
}
