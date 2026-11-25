import { categoryAClass, soundsIdenticalInContext } from '../../domain/igcse/stt/homophones/classes';

/**
 * Dictée's marker: pure, deterministic, no AI. It lines the typed words up with
 * the line that was spoken (a small edit-distance alignment over words) and
 * names what is different about each word:
 *
 *   ok       exactly right (capitals and punctuation are not marked)
 *   punct    right letters, but an apostrophe, hyphen or space is off
 *            (jai / j'ai, peut être / peut-être, jeveux)        — half credit
 *   accent   right letters, accent, cedilla or ligature off
 *            (ecole / école, soeur / sœur)                       — half credit
 *   sound    a different word that sounds the same — a/à, et/est, ses/ces,
 *            mangé/manger. The sound-alike table is the exam marker's own
 *            (`domain/igcse/stt/homophones`): one rule, not a second copy.
 *   spelling close to the word, a letter or two out
 *   wrong    a different word
 *   missing / extra   a word that wasn't typed / a word that wasn't said
 *
 * A liaison-sensitive pair (il/ils, on/ont…) is only "the same sound" where
 * nothing audible tells them apart; before a vowel the liaison does, so the
 * slip is `wrong` with `liaison: true`.
 */

export type MarkKind = 'ok' | 'punct' | 'accent' | 'sound' | 'spelling' | 'wrong' | 'missing' | 'extra';

export interface Mark {
  kind: MarkKind;
  /** The word that was said (absent for an extra word). */
  target?: string;
  /** What was typed (absent for a missing word, and for the second half of a joined pair). */
  typed?: string;
  /** For `sound`, and for a liaison slip: the shared sound-alike class id. */
  soundClass?: string;
  /** The words are told apart by the linking sound before a vowel. */
  liaison?: boolean;
  /** The typed word covered this word and the one before it ("jeveux" for "je veux"). */
  joined?: boolean;
}

export interface Verdict {
  marks: Mark[];
  /** 0–1: the share of the line's words that count, accents and apostrophes at half. */
  credit: number;
  /** Every word exactly right (capitals and punctuation aside). */
  perfect: boolean;
  /** Words in the line that was judged against. */
  words: number;
  /** The spelling this was judged against (the item's line, or one of its alternatives). */
  against: string;
  /** Nothing was typed. */
  empty: boolean;
}

const CREDIT: Record<MarkKind, number> = {
  ok: 1,
  punct: 0.5,
  accent: 0.5,
  sound: 0,
  spelling: 0,
  wrong: 0,
  missing: 0,
  extra: 0,
};
/** Taken off the total for each word typed that wasn't said. */
const EXTRA_PENALTY = 0.5;

// ── words ───────────────────────────────────────────────────────────────────

const APOSTROPHES = /[‘’ʼ`´]/g;
const DASHES = /[‐‑‒–—]/g;
const EDGE = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;
const HAS_LETTER = /[\p{L}\p{N}]/u;

interface Word {
  /** The word as written, edge punctuation removed. */
  text: string;
  /** Punctuation followed it (a pause: no liaison across it). */
  pause: boolean;
}

/** Words of a line: punctuation at a word's edge goes, a lone « ? » is not a word. */
export function toWords(text: string): Word[] {
  return text
    .normalize('NFC')
    .replace(APOSTROPHES, "'")
    .replace(DASHES, '-')
    .split(/\s+/)
    .filter(t => HAS_LETTER.test(t))
    .map(t => {
      const clean = t.replace(EDGE, '');
      return { text: clean, pause: /[.,;:!?…»”)]$/.test(t) };
    })
    .filter(w => w.text.length > 0);
}

const lower = (w: string) => w.toLowerCase();
/** Apostrophes and hyphens ignored. */
const loose = (w: string) => lower(w).replace(/['-]/g, '');
/** Accents, cedilla and ligatures ignored too. */
const plain = (w: string) =>
  loose(w)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae');

/** Optimal string alignment distance: a swap of two neighbours is one slip. */
function distance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, (_, i) => [i, ...new Array<number>(cols - 1).fill(0)]);
  for (let j = 1; j < cols; j++) d[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[rows - 1][cols - 1];
}

// ── comparing two words ─────────────────────────────────────────────────────

interface Pair {
  kind: Exclude<MarkKind, 'missing' | 'extra'>;
  cost: number;
  soundClass?: string;
  liaison?: boolean;
}

const COST = { ok: 0, punct: 0.15, accent: 0.2, sound: 0.45, spelling: 0.6, wrong: 1 } as const;
/** A missing or an extra word. A different word costs the same, so it is one slip, not two. */
const INDEL = 1;
/** Typed words run together or split apart, with the right letters. */
const JOIN_COST = 0.4;

function comparePair(target: Word, typed: string, next: Word | undefined): Pair {
  const t = lower(target.text);
  const u = lower(typed);
  if (t === u) return { kind: 'ok', cost: COST.ok };

  const cls = categoryAClass(t, u);
  if (cls) {
    if (soundsIdenticalInContext(t, u, next ? lower(next.text) : undefined, target.pause)) {
      return { kind: 'sound', cost: COST.sound, soundClass: cls.id };
    }
    return { kind: 'wrong', cost: COST.wrong - 0.1, soundClass: cls.id, liaison: true };
  }
  if (loose(t) === loose(u)) return { kind: 'punct', cost: COST.punct };
  if (plain(t) === plain(u)) return { kind: 'accent', cost: COST.accent };

  const pt = plain(t);
  const pu = plain(u);
  if (pt.length >= 4 && distance(pt, pu) <= (pt.length >= 8 ? 2 : 1)) return { kind: 'spelling', cost: COST.spelling };
  return { kind: 'wrong', cost: COST.wrong };
}

/** Whether two spellings are the same letters, once spaces, apostrophes, hyphens (and then accents) are set aside. */
function sameLetters(a: string, b: string): 'punct' | 'accent' | null {
  if (loose(a) === loose(b)) return 'punct';
  if (plain(a) === plain(b)) return 'accent';
  return null;
}

// ── alignment ───────────────────────────────────────────────────────────────

type Step = 'sub' | 'missing' | 'extra' | 'merge' | 'split';

function align(targets: Word[], typed: string[]): Mark[] {
  const n = targets.length;
  const m = typed.length;
  const INF = Number.POSITIVE_INFINITY;
  const cost: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(INF));
  const step: (Step | null)[][] = Array.from({ length: n + 1 }, () => new Array<Step | null>(m + 1).fill(null));
  cost[0][0] = 0;

  const relax = (i: number, j: number, c: number, s: Step) => {
    if (c < cost[i][j]) {
      cost[i][j] = c;
      step[i][j] = s;
    }
  };

  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= m; j++) {
      if (i === 0 && j === 0) continue;
      // Order is the tie-break: a substitution beats a join beats a gap.
      if (i >= 1 && j >= 1) relax(i, j, cost[i - 1][j - 1] + comparePair(targets[i - 1], typed[j - 1], targets[i]).cost, 'sub');
      if (i >= 1 && j >= 2 && sameLetters(targets[i - 1].text, typed[j - 2] + typed[j - 1])) {
        relax(i, j, cost[i - 1][j - 2] + JOIN_COST, 'merge');
      }
      if (i >= 2 && j >= 1 && sameLetters(targets[i - 2].text + targets[i - 1].text, typed[j - 1])) {
        relax(i, j, cost[i - 2][j - 1] + JOIN_COST, 'split');
      }
      if (i >= 1) relax(i, j, cost[i - 1][j] + INDEL, 'missing');
      if (j >= 1) relax(i, j, cost[i][j - 1] + INDEL, 'extra');
    }
  }

  const marks: Mark[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const s = step[i][j];
    if (s === 'sub') {
      const p = comparePair(targets[i - 1], typed[j - 1], targets[i]);
      marks.push({ kind: p.kind, target: targets[i - 1].text, typed: typed[j - 1], soundClass: p.soundClass, liaison: p.liaison });
      i -= 1;
      j -= 1;
    } else if (s === 'merge') {
      const joined = `${typed[j - 2]} ${typed[j - 1]}`;
      const kind = sameLetters(targets[i - 1].text, typed[j - 2] + typed[j - 1]) ?? 'punct';
      marks.push({ kind, target: targets[i - 1].text, typed: joined });
      i -= 1;
      j -= 2;
    } else if (s === 'split') {
      const kind = sameLetters(targets[i - 2].text + targets[i - 1].text, typed[j - 1]) ?? 'punct';
      marks.push({ kind, target: targets[i - 1].text, joined: true });
      marks.push({ kind, target: targets[i - 2].text, typed: typed[j - 1] });
      i -= 2;
      j -= 1;
    } else if (s === 'missing') {
      marks.push({ kind: 'missing', target: targets[i - 1].text });
      i -= 1;
    } else {
      marks.push({ kind: 'extra', typed: typed[j - 1] });
      j -= 1;
    }
  }
  return marks.reverse().map(compact);
}

/** Drops the keys that carry nothing, so marks compare cleanly. */
function compact(mark: Mark): Mark {
  const out: Mark = { kind: mark.kind };
  if (mark.target !== undefined) out.target = mark.target;
  if (mark.typed !== undefined) out.typed = mark.typed;
  if (mark.soundClass !== undefined) out.soundClass = mark.soundClass;
  if (mark.liaison) out.liaison = true;
  if (mark.joined) out.joined = true;
  return out;
}

// ── verdicts ────────────────────────────────────────────────────────────────

/** Marks `typedText` against one spelling of the line. */
export function judgeText(target: string, typedText: string): Verdict {
  const targets = toWords(target);
  const typed = toWords(typedText).map(w => w.text);
  const marks = align(targets, typed);
  const earned = marks.reduce((sum, m) => sum + CREDIT[m.kind], 0);
  const extras = marks.filter(m => m.kind === 'extra').length;
  const words = targets.length;
  const credit = words === 0 ? 0 : Math.max(0, Math.min(1, (earned - EXTRA_PENALTY * extras) / words));
  return {
    marks,
    credit,
    perfect: marks.length > 0 && marks.every(m => m.kind === 'ok'),
    words,
    against: target,
    empty: typed.length === 0,
  };
}

/** Marks `typedText` against a line and its alternatives, keeping whichever it matches best. */
export function judgeLine(spellings: readonly string[], typedText: string): Verdict {
  let best: Verdict | null = null;
  for (const spelling of spellings) {
    const v = judgeText(spelling, typedText);
    if (!best || v.credit > best.credit || (v.credit === best.credit && v.perfect && !best.perfect)) best = v;
  }
  return best ?? judgeText('', typedText);
}
