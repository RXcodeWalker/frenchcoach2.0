import { CLOSED_CLASSES, PATTERN_CLASSES } from '../../domain/igcse/stt/homophones/classes';
import type { Mark, Verdict } from './judge';

/**
 * The words Dictée says about an answer. Static text, chosen by the marks the
 * judge found — nothing here is generated. A sound-alike hint is a short rule
 * of thumb for choosing between the spellings; where a class has none, its own
 * description (the exam marker's table) is used.
 */

const SOUND_HINTS: Record<string, string> = {
  a: 'à = to / at / in. a = has (it could be replaced by avait).',
  ou: 'où = where. ou = or (it could be replaced by ou bien).',
  'et-est': 'et = and. est = is (it could be replaced by était).',
  'ces-cest': "ces = these. ses = his / her. c'est = it is. s'est = a reflexive verb in the past.",
  'ce-se': 'ce = this / that. se = himself / herself, before a verb.',
  'ca-sa': 'ça = that. sa = his / her.',
  'on-ont': 'on = we / one. ont = have (it could be replaced by avaient).',
  'son-sont': 'son = his / her. sont = are (it could be replaced by étaient).',
  la: "la = the. là = there. l'a / l'as = him / her / it + has.",
  ma: "ma = my. m'a / m'as = me + has.",
  'mes-mais': 'mes = my (plural). mais = but. met / mets = puts.',
  peu: 'peu = little, few. peut / peux = can.',
  leur: 'leur = their / to them. leurs = their, before a plural noun.',
  quel: "quel / quelle = which, what a. qu'elle = that she.",
  cetait: "c'était = it was. s'était = a reflexive verb in the past.",
  au: 'au = to the (one thing). aux = to the (several things).',
  cet: 'cet / cette = this.',
  sans: 'sans = without. cent = a hundred. sang = blood.',
  dans: 'dans = in.',
  quand: 'quand = when. quant = as for.',
  si: 'si = if / so.',
  'present-e': 'In the present, -e, -es and -ent sound the same: look at who is doing it (il mange, ils mangent).',
  'e-sound': '-é, -er, -ez and -ais / -ait sound the same. Use -er after another verb or à / de / pour, -é for a past participle, -ez for vous.',
  'silent-plural': 'A plural -s or -x is silent: the article (le / les, un / des) shows the number.',
  'silent-agreement': 'A silent -e marks the feminine: check the word it goes with.',
  'silent-consonant': 'A final -s / -t / -x can be silent: check who is doing the action (il fait, tu fais).',
};

const DESCRIPTIONS: ReadonlyMap<string, string> = new Map(
  [...CLOSED_CLASSES, ...PATTERN_CLASSES].map(c => [c.id, c.description]),
);

/** The rule of thumb for a sound-alike class ("" if the class is unknown). */
export function soundHint(classId: string | undefined): string {
  if (!classId) return '';
  return SOUND_HINTS[classId] ?? DESCRIPTIONS.get(classId) ?? '';
}

/**
 * The sentences about a whole answer, in order. A run of missing words (or of
 * extra ones) is one sentence, so an answer that is mostly absent says
 * "Missing: “je mets toujours un pull”" once, not once per word.
 */
export function describeMarks(marks: readonly Mark[]): string[] {
  const notes: string[] = [];
  for (let i = 0; i < marks.length; i++) {
    const m = marks[i];
    if (m.kind === 'missing' || m.kind === 'extra') {
      const run = [m];
      while (i + 1 < marks.length && marks[i + 1].kind === m.kind) run.push(marks[++i]);
      if (run.length === 1) {
        notes.push(describeMark(m));
      } else {
        const words = run.map(r => (m.kind === 'missing' ? r.target : r.typed)).join(' ');
        notes.push(m.kind === 'missing' ? `Missing: “${words}”.` : `“${words}” was not said.`);
      }
      continue;
    }
    const note = describeMark(m);
    if (note) notes.push(note);
  }
  return notes;
}

/** One plain sentence about one mark. "" for a word that was right. */
export function describeMark(mark: Mark): string {
  const { kind, target, typed } = mark;
  switch (kind) {
    case 'ok':
      return '';
    case 'accent':
      return `Check the accent: it is “${target}”.`;
    case 'punct':
      return mark.joined
        ? `“${target}” is a word on its own: leave a space.`
        : `Check the apostrophe, hyphen or space: it is “${target}”.`;
    case 'sound': {
      const hint = soundHint(mark.soundClass);
      return `“${typed}” sounds the same as “${target}”, but it is a different word here.${hint ? ` ${hint}` : ''}`;
    }
    case 'spelling':
      return `Nearly: it is spelt “${target}”, not “${typed}”.`;
    case 'wrong':
      return mark.liaison
        ? `Listen for the linking sound: it is “${target}”, not “${typed}”.`
        : `You wrote “${typed}”; the word is “${target}”.`;
    case 'missing':
      return `Missing: “${target}”.`;
    case 'extra':
      return `“${typed}” was not said.`;
  }
}

export type Tone = 'perfect' | 'close' | 'miss';

export interface Headline {
  tone: Tone;
  text: string;
}

/** The one-line verdict above the corrected answer. */
export function headlineFor(verdict: Verdict, skipped: boolean): Headline {
  if (skipped) return { tone: 'miss', text: 'Here is what was said' };
  if (verdict.perfect) return { tone: 'perfect', text: 'Perfect' };
  const slips = verdict.marks.filter(m => m.kind !== 'ok');
  if (verdict.credit >= 0.5) {
    if (slips.every(m => m.kind === 'accent')) return { tone: 'close', text: 'So close: just the accents' };
    if (slips.every(m => m.kind === 'accent' || m.kind === 'punct')) return { tone: 'close', text: 'So close: check the accents and apostrophes' };
    return { tone: 'close', text: 'Close' };
  }
  if (verdict.credit > 0) return { tone: 'miss', text: 'Part of it' };
  return { tone: 'miss', text: 'Not quite' };
}

/** What the learner should look at next time, for the review list. */
export function slipSummary(verdict: Verdict): string {
  const slips = verdict.marks.filter(m => m.kind !== 'ok');
  if (slips.length === 0) return '';
  const count = (k: Mark['kind']) => slips.filter(m => m.kind === k).length;
  const parts: string[] = [];
  const sound = count('sound');
  const accent = count('accent') + count('punct');
  const other = slips.length - sound - accent;
  if (sound) parts.push(sound === 1 ? 'a sound-alike' : `${sound} sound-alikes`);
  if (accent) parts.push(accent === 1 ? 'an accent or apostrophe' : `${accent} accents or apostrophes`);
  if (other) parts.push(other === 1 ? 'a word' : `${other} words`);
  return parts.join(', ');
}
