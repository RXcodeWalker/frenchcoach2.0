/**
 * Context respeller (transcription-accuracy plan Phase 4). Rewrites Category A
 * words (`classes.ts`) into the spelling their context calls for, so the marker
 * sees "J'ai un frère. Il mange…" even when both recognisers wrote "ils
 * mangent". It never changes what was SAID:
 *
 *  - the guard only lets a word become another spelling in the SAME sound
 *    class (checked against the word as heard, not just its last state);
 *  - a liaison-sensitive class is only swapped before a consonant or a pause
 *    (il mange ↔ ils mangent yes; il aime ↔ ils aiment no — the [z] is heard);
 *  - the token count, spacing, punctuation and capitalisation are unchanged;
 *  - when a rule is unsure it leaves the word as heard. The marker still gets
 *    the sound-class tables, so an unresolved spelling is excused later rather
 *    than guessed here.
 *
 * Rules, applied in this order (each sees the previous rules' output):
 *  1. subject-number  — il/ils, elle/elles from an audibly singular/plural
 *                       verb, else from context (the same pronoun earlier,
 *                       or the previous sentence's number markers);
 *  2. subject-verb    — the verb ending that matches its subject pronoun;
 *  3. et-est          — et / est / es;
 *  4. a-a             — a / à / as;
 *  5. aux-participle  — after avoir/être: -é; after a modal, preposition or
 *                       liking verb: -er (listed -er verbs only);
 *  6. determiner-plural — the silent -s/-x after a plural determiner.
 *
 * Pure and deterministic. Not wired into the app yet (stage 2).
 */

import { categoryAClass, eSoundStem, soundsIdenticalInContext } from './classes';
import {
  AUDIBLE_PLURAL,
  AUDIBLE_SINGULAR,
  AUX_AVOIR,
  AUX_ETRE,
  A_GRAVE_AFTER,
  A_GRAVE_BEFORE,
  CLITICS,
  CONSONANT_VERB_PAIRS,
  EU_S_PLURALS,
  INFINITIVE_CLITICS,
  INFINITIVE_PREPOSITIONS,
  INFINITIVE_TRIGGERS,
  NOT_IMPERFECT,
  NOT_PLURALISED,
  OU_X_PLURALS,
  PARTICIPLE_NOUNS,
  PLURAL_DETERMINERS,
  PLURAL_NUMBERS,
  POSSESSIVES,
  PRENOMINAL_ADJECTIVES,
  SINGULAR_DETERMINERS,
  SUBJECT_PRONOUNS,
  VERB_ADVERBS,
  erVerbByInfStem,
  isKnownPresentStem,
  type Gender,
} from './lexicon';
import { matchCase, parseToken, startsWithVowelSound, type Token } from './text';

export type RespellRule =
  | 'subject-number'
  | 'subject-verb'
  | 'et-est'
  | 'a-a'
  | 'aux-participle'
  | 'determiner-plural';

export interface RespellChange {
  /** Index of the word in the text (whitespace-separated, 0-based). */
  readonly index: number;
  /** The word as heard (before any rule). */
  readonly from: string;
  /** The word as respelled. */
  readonly to: string;
  readonly rule: RespellRule;
  /** The Category A class shared by `from` and `to`. */
  readonly classId: string;
}

export interface RespellResult {
  readonly text: string;
  readonly changes: readonly RespellChange[];
}

type Person = '1s' | '2s' | '3s' | '2p' | '3p';
type GrammaticalNumber = 'sg' | 'pl';

const PRONOUN_PERSON: Readonly<Record<string, Person>> = {
  je: '1s', tu: '2s', il: '3s', elle: '3s', on: '3s', ils: '3p', elles: '3p',
};

/** Context words before "vous" that make it the subject ("et vous mangez", not "je vous parle"). */
const VOUS_SUBJECT_AFTER = new Set(['et', 'mais', 'si', 'quand', 'que', 'ou', 'où', 'alors', 'puis', 'donc', 'comme']);

/** After "il et …": a pronoun, determiner or possessive means a real "and" ("il et elle", "ça et mon frère"). */
const NOT_AFTER_EST = new Set([
  'elle', 'elles', 'moi', 'toi', 'lui', 'eux', 'nous', 'vous', 'il', 'ils', 'je', 'tu', 'on',
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa',
  'ses', 'notre', 'nos', 'votre', 'vos', 'leur', 'leurs', 'ce', 'cet', 'cette', 'ces',
]);

/** Words after which a clause (and so a subject) can start. */
const CLAUSE_STARTERS = new Set(['et', 'mais', 'ou', 'donc', 'car', 'que', "qu'", 'quand', 'si', 'alors', 'puis', 'parce']);
const ALWAYS_SUBJECT = new Set(['il', 'on', 'y', 'tu', 'qui']);

/** Verbs only used impersonally with "il": "il pleuvait" is always singular. */
const IMPERSONAL_ONLY = new Set(['pleut', 'pleuvait', 'neige', 'neigeait', 'faut', 'fallait', 'agit', 'agissait']);
/** Verbs often impersonal ("il faisait beau", "il me semble", "il reste du pain"): context says nothing about "il". */
const OFTEN_IMPERSONAL = new Set([
  'faisait', 'semble', 'semblait', 'reste', 'restait', 'passe', 'passait', 'manque', 'manquait',
  'suffit', 'suffisait', 'vaut', 'valait', 'arrive', 'arrivait', 'paraît', 'parait',
]);

const MAX_CLITICS = 3;
const MAX_ADVERBS = 3;
const CONTEXT_WINDOW = 30;

class Respeller {
  private readonly parts: string[];
  /** parts index of each token. */
  private readonly partIndex: number[] = [];
  private readonly toks: Token[] = [];
  private readonly heard: Token[] = [];
  readonly changes: RespellChange[] = [];

  constructor(text: string) {
    this.parts = text.split(/(\s+)/);
    this.parts.forEach((part, i) => {
      if (part && !/^\s+$/.test(part)) {
        this.partIndex.push(i);
        const t = parseToken(part);
        this.toks.push(t);
        this.heard.push(t);
      }
    });
  }

  get text(): string {
    return this.parts.join('');
  }

  run(): void {
    this.subjectNumber();
    this.subjectVerb();
    this.etEst();
    this.aGrave();
    this.auxParticiple();
    this.determinerPlural();
  }

  // ── guard ────────────────────────────────────────────────────────────────

  /**
   * The single write path. `word` replaces the token's word (its elided
   * prefix is kept). Refused unless the new spelling sounds identical — in
   * place — to both the current spelling and the one heard.
   */
  private swap(i: number, word: string, rule: RespellRule): boolean {
    const t = this.toks[i];
    const lower = t.prefix + word;
    if (!word || /\s/.test(word) || lower === t.lower) return false;
    const next = this.toks[i + 1]?.lower;
    const heard = this.heard[i];
    if (!soundsIdenticalInContext(t.lower, lower, next, t.pauseAfter)) return false;
    if (heard.lower !== lower && !soundsIdenticalInContext(heard.lower, lower, next, t.pauseAfter)) return false;
    const cls = categoryAClass(heard.lower, lower);
    const prefixWritten = t.core.slice(0, t.prefix.length);
    const wordWritten = t.core.slice(t.prefix.length);
    const raw = t.lead + prefixWritten + matchCase(wordWritten, word) + t.trail;
    this.parts[this.partIndex[i]] = raw;
    this.toks[i] = parseToken(raw);
    // Drop an earlier change to this word: the record is heard → final.
    const prior = this.changes.findIndex((c) => c.index === i);
    if (prior >= 0) this.changes.splice(prior, 1);
    if (heard.lower !== lower && cls) {
      this.changes.push({ index: i, from: heard.core, to: this.toks[i].core, rule, classId: cls.id });
    }
    return true;
  }

  // ── navigation ───────────────────────────────────────────────────────────

  private prev(i: number): Token | undefined {
    const p = this.toks[i - 1];
    return p && !p.endsSentence ? p : undefined;
  }

  /** The verb after a subject at `i`, skipping standalone object pronouns / "ne". */
  private verbAfter(i: number): number | null {
    let j = i + 1;
    let skipped = 0;
    while (j < this.toks.length) {
      if (this.toks[j - 1].pauseAfter) return null;
      if (!CLITICS.has(this.toks[j].lower) || skipped >= MAX_CLITICS) return j;
      j += 1;
      skipped += 1;
    }
    return null;
  }

  /**
   * Whether the word at `k` stands where a subject can: at the start of a
   * clause, not after a preposition or a verb ("avec elle", "je fais ça").
   * il / on / y are always subjects, so they are not checked here.
   */
  private atClauseStart(k: number): boolean {
    const p = this.prev(k);
    return !p || p.pauseAfter || CLAUSE_STARTERS.has(p.lower);
  }

  /** A real sentence start: the first word, or after . ! ? — not after an ellipsis, which is often a hesitation. */
  private startsSentence(i: number): boolean {
    if (i === 0) return true;
    const trail = this.toks[i - 1].trail;
    return /[.!?]/.test(trail) && !trail.includes('…') && !trail.includes('..');
  }

  /** A subject before "est" / "a": il / on / y / tu / qui anywhere (not across a pause); elle, ça, cela, ceci, ce only at a clause start. */
  private subjectWordBefore(i: number, allowed: ReadonlySet<string>): string | undefined {
    const p = this.prev(i);
    if (!p || p.pauseAfter || (p.prefix !== '' && p.prefix !== "qu'") || !allowed.has(p.word)) return undefined;
    if (ALWAYS_SUBJECT.has(p.word) || p.prefix === "qu'") return p.word;
    return this.atClauseStart(i - 1) ? p.word : undefined;
  }

  private isSubjectVous(i: number): boolean {
    const t = this.toks[i];
    if (t.lower !== 'vous') return false;
    const p = this.prev(i);
    return !p || p.pauseAfter || VOUS_SUBJECT_AFTER.has(p.word);
  }

  // ── 1. subject number ────────────────────────────────────────────────────

  /** Whether the verb's sound shows its number; 'ambiguous' if it could be either. */
  private verbNumber(v: Token): GrammaticalNumber | 'ambiguous' | null {
    const w = v.word;
    if (AUDIBLE_SINGULAR.has(w)) return 'sg';
    if (AUDIBLE_PLURAL.has(w)) return 'pl';
    if (w.length >= 5 && w.endsWith('ront')) return 'pl';
    if (w.length >= 4 && w.endsWith('ra')) return 'sg';
    const present = /^(.+?)(ent|es|e)$/.exec(w);
    if (present && isKnownPresentStem(present[1])) return 'ambiguous';
    if (this.imperfect(w)) return 'ambiguous';
    return null;
  }

  private subjectNumber(): void {
    /** Pronoun index → its number, where that number is known (heard, or resolved). */
    const known = new Map<number, GrammaticalNumber>();
    this.toks.forEach((t, i) => {
      if (t.prefix !== '' && t.prefix !== "qu'") return;
      if (!['il', 'ils', 'elle', 'elles'].includes(t.word)) return;
      const base = t.word.startsWith('il') ? 'il' : 'elle';
      const v = this.verbAfter(i);
      const verb = v === null ? null : this.toks[v];
      let n = verb ? this.verbNumber(verb) : null;
      if (base === 'il' && verb && IMPERSONAL_ONLY.has(verb.word)) n = 'sg';
      // "il y avait", "il faisait beau": an impersonal "il" has no referent to agree with.
      const impersonal = base === 'il' && verb && (OFTEN_IMPERSONAL.has(verb.word) || this.toks[i + 1]?.lower === 'y');
      const target = n === 'ambiguous' ? (impersonal ? null : this.contextNumber(i, base, known)) : n;
      if (target) this.swap(i, target === 'sg' ? base : `${base}s`, 'subject-number');
      const now = this.toks[i];
      const next = this.toks[i + 1];
      if (target) known.set(i, target);
      // Before a vowel the liaison [z] is heard, so the spelling as heard carries the number.
      else if (next && !now.pauseAfter && startsWithVowelSound(next.lower)) known.set(i, now.word.endsWith('s') ? 'pl' : 'sg');
    });
  }

  /**
   * The number a context gives an ambiguous il/ils or elle/elles, or null:
   *  1. the same pronoun earlier in this or the previous sentence, where its
   *     number is known — the same person is still being talked about;
   *  2. else the determiners of the PREVIOUS sentence ("J'ai un frère. Il
   *     mange…") whose gender fits the pronoun. All must agree, and a
   *     coordination ("un frère et une sœur") makes it ambiguous.
   * The current sentence's own determiners are not used: they are mostly
   * objects ("Il mange des pommes et elle…"). Without sentence punctuation
   * there is no previous sentence, so only rule 1 can apply.
   */
  private contextNumber(i: number, base: 'il' | 'elle', known: ReadonlyMap<number, GrammaticalNumber>): GrammaticalNumber | null {
    const sentenceStart = (from: number): number => {
      let k = from;
      while (k > 0 && !this.toks[k - 1].endsSentence) k -= 1;
      return k;
    };
    const curStart = sentenceStart(i);
    const prevStart = curStart > 0 ? sentenceStart(curStart - 1) : curStart;
    const from = Math.max(prevStart, i - CONTEXT_WINDOW);

    let continuity: GrammaticalNumber | null = null;
    for (let j = i - 1; j >= from && !continuity; j -= 1) {
      const t = this.toks[j];
      const n = known.get(j);
      if (n && (t.word === base || t.word === `${base}s`)) continuity = n;
    }
    const markers = curStart === 0 ? null : this.previousSentenceNumber(prevStart, curStart, base);
    if (continuity && markers && continuity !== markers) return null;
    return continuity ?? markers;
  }

  private previousSentenceNumber(prevStart: number, curStart: number, base: 'il' | 'elle'): GrammaticalNumber | null {

    const numbers = new Set<GrammaticalNumber>();
    let seenMarker = false;
    for (let j = Math.max(prevStart, curStart - CONTEXT_WINDOW); j < curStart; j += 1) {
      const t = this.toks[j];
      if (t.lower === 'et' && seenMarker && this.markerAt(j + 1)) return null;
      const m = this.markerAt(j);
      if (!m || j + 1 >= curStart) continue;
      seenMarker = true;
      const fits = m.number === 'pl' || m.gender === '?' || m.gender === (base === 'il' ? 'm' : 'f');
      if (fits) numbers.add(m.number);
    }
    return numbers.size === 1 ? [...numbers][0] : null;
  }

  private markerAt(j: number): { number: GrammaticalNumber; gender: Gender } | null {
    const t = this.toks[j];
    if (!t) return null;
    if (t.prefix === "l'") return { number: 'sg', gender: '?' };
    if (t.prefix) return null;
    const g = SINGULAR_DETERMINERS.get(t.word);
    if (g) return { number: 'sg', gender: g };
    if (PLURAL_DETERMINERS.has(t.word) || t.word === 'les') return { number: 'pl', gender: '?' };
    if (/^\d+$/.test(t.word)) return Number(t.word) >= 2 ? { number: 'pl', gender: '?' } : null;
    return null;
  }

  // ── 2. subject ↔ verb ending ─────────────────────────────────────────────

  private imperfect(w: string): { stem: string } | null {
    if (NOT_IMPERFECT.has(w) || w.includes('î')) return null;
    const m = /^(.{2,}?)(aient|ais|ait)$/.exec(w);
    return m ? { stem: m[1] } : null;
  }

  private verbFormFor(w: string, person: Person): string | null {
    if (person === '2p') {
      const e = eSoundStem(w);
      if (e && (e.ending === 'é' || e.ending === 'er') && erVerbByInfStem(e.stem)) return `${e.stem}ez`;
      return null;
    }
    const present = /^(.+?)(ent|es|e)$/.exec(w);
    if (present && isKnownPresentStem(present[1])) {
      return present[1] + { '1s': 'e', '2s': 'es', '3s': 'e', '3p': 'ent' }[person];
    }
    const pair = CONSONANT_VERB_PAIRS.find(([a, b]) => a === w || b === w);
    if (pair) return person === '3p' ? null : person === '3s' ? pair[1] : pair[0];
    const imp = this.imperfect(w);
    if (imp) return imp.stem + { '1s': 'ais', '2s': 'ais', '3s': 'ait', '3p': 'aient' }[person];
    return null;
  }

  private subjectVerb(): void {
    this.toks.forEach((t, i) => {
      // "j'aime": the subject is the token's own prefix.
      if (t.prefix === "j'") {
        const form = this.verbFormFor(t.word, '1s');
        if (form) this.swap(i, form, 'subject-verb');
        return;
      }
      if (t.prefix !== '' && t.prefix !== "qu'") return;
      const person: Person | undefined = this.isSubjectVous(i) ? '2p' : PRONOUN_PERSON[t.word];
      if (!person) return;
      const v = this.verbAfter(i);
      if (v === null) return;
      const form = this.verbFormFor(this.toks[v].word, person);
      if (form) this.swap(v, form, 'subject-verb');
    });
  }

  // ── 3. et / est / es ─────────────────────────────────────────────────────

  private etEst(): void {
    const estSubjects = new Set(['il', 'elle', 'on', 'ce', 'ça', 'cela', 'ceci', 'qui']);
    this.toks.forEach((t, i) => {
      if (!['et', 'est', 'es'].includes(t.word)) return;
      if (t.prefix === "c'") {
        this.swap(i, 'est', 'et-est');
        return;
      }
      if (t.prefix) return;
      const subject = this.subjectWordBefore(i, new Set([...estSubjects, 'tu']));
      if (subject === 'tu') {
        // "tu et moi" is a (wrong) "and": only an existing verb form becomes "es".
        if (t.word === 'est') this.swap(i, 'es', 'et-est');
      } else if (subject && t.word !== 'est') {
        const n = this.toks[i + 1];
        if (t.word === 'et' && (t.pauseAfter || !n || NOT_AFTER_EST.has(n.lower) || n.prefix === "j'")) return;
        this.swap(i, 'est', 'et-est');
      }
      // est → et is never inferred: "Mon frère est tu sais très sympa" would break, and a
      // wrong "est" for "et" is a Category A difference the marker excuses anyway.
    });
  }

  // ── 4. a / à / as ────────────────────────────────────────────────────────

  private aGrave(): void {
    const aSubjects = new Set(['il', 'elle', 'on', 'qui', 'ça', 'cela', 'y', 'tu']);
    this.toks.forEach((t, i) => {
      if (!['a', 'à', 'as'].includes(t.word)) return;
      if (t.prefix === "jusqu'") {
        this.swap(i, 'à', 'a-a');
        return;
      }
      if (t.prefix) return;
      const subject = this.subjectWordBefore(i, aSubjects);
      const p = this.prev(i);
      if (subject === 'tu') {
        this.swap(i, 'as', 'a-a');
      } else if (subject) {
        // "c'est toi qui as" is correct: after "qui" only "à" becomes "a".
        if (t.word === 'à' || (t.word === 'as' && subject !== 'qui')) this.swap(i, 'a', 'a-a');
      } else if (t.word === 'a' && !(p && !p.prefix && SUBJECT_PRONOUNS.has(p.word))) {
        const n1 = this.toks[i + 1];
        const n2 = this.toks[i + 2];
        const fixed =
          !t.pauseAfter &&
          !!n1 &&
          (A_GRAVE_BEFORE.has(n1.lower) || (POSSESSIVES.has(n1.lower) && !n1.pauseAfter && n2?.lower === 'avis'));
        const afterVerb = !!p && !p.pauseAfter && A_GRAVE_AFTER.has(p.word);
        if (this.startsSentence(i) || afterVerb || fixed) this.swap(i, 'à', 'a-a');
      }
    });
  }

  // ── 5. auxiliary ↔ participle / infinitive ───────────────────────────────

  /** Walks back from a verb at `i` to its governing word, skipping adverbs (and, before an infinitive, object pronouns). */
  private governor(i: number): { kind: 'avoir' | 'etre' | 'infinitive' | 'preposition'; index: number } | null {
    let adverbs = 0;
    let sawClitic = false;
    for (let j = i - 1; j >= 0; j -= 1) {
      const p = this.toks[j];
      if (p.endsSentence || p.pauseAfter) return null;
      if (VERB_ADVERBS.has(p.lower) && adverbs < MAX_ADVERBS) {
        adverbs += 1;
        continue;
      }
      if (INFINITIVE_CLITICS.has(p.lower) && adverbs === 0) {
        sawClitic = true;
        continue;
      }
      if (!sawClitic && AUX_AVOIR.has(p.word)) return { kind: 'avoir', index: j };
      if (!sawClitic && AUX_ETRE.has(p.word)) return { kind: 'etre', index: j };
      if (INFINITIVE_PREPOSITIONS.has(p.word) && p.prefix === '') return { kind: 'preposition', index: j };
      if (INFINITIVE_TRIGGERS.has(p.word) && p.prefix === '') return { kind: 'infinitive', index: j };
      return null;
    }
    return null;
  }

  /** "a"/"as" is only the auxiliary straight after a subject pronoun, "qui", "y" or "ça". */
  private isAuxA(j: number): boolean {
    const p = this.prev(j);
    return !!p && (SUBJECT_PRONOUNS.has(p.word) || ['qui', 'y', 'ça', 'cela'].includes(p.word));
  }

  /** "est"/"sont"… take a participle for "-er" only after a subject pronoun: "c'est nager" is an infinitive. */
  private etreTakesParticiple(j: number): boolean {
    const aux = this.toks[j];
    if (aux.prefix === "c'") return false;
    if (["s'", "m'", "t'"].includes(aux.prefix)) return true;
    let k = j - 1;
    while (k >= 0 && !this.toks[k].pauseAfter && (CLITICS.has(this.toks[k].lower) || this.toks[k].lower === 'ne')) k -= 1;
    const s = this.toks[k];
    return !!s && !s.pauseAfter && (s.prefix === '' || s.prefix === "qu'") && SUBJECT_PRONOUNS.has(s.word);
  }

  private auxParticiple(): void {
    this.toks.forEach((t, i) => {
      const e = eSoundStem(t.word);
      if (!e) return;
      const isEtre = e.stem === 'ét';
      const verb = erVerbByInfStem(e.stem);
      if (!verb && !isEtre) return;
      const g = t.prefix === "d'" ? { kind: 'preposition' as const, index: i } : this.governor(i);
      if (!g) return;
      const participle = isEtre ? 'été' : `${e.stem}é`;
      if (g.kind === 'avoir') {
        if (['a', 'as'].includes(this.toks[g.index].word) && !this.isAuxA(g.index)) return;
        if (!['é', 'ée', 'és', 'ées'].includes(e.ending)) this.swap(i, participle, 'aux-participle');
      } else if (g.kind === 'etre') {
        if (isEtre || ['é', 'ée', 'és', 'ées'].includes(e.ending)) return;
        if (e.ending === 'er' && !this.etreTakesParticiple(g.index)) return;
        this.swap(i, participle, 'aux-participle');
      } else if (verb && e.ending !== 'er' && !PARTICIPLE_NOUNS.has(t.word) && t.prefix !== "l'") {
        // After de / à / pour / sans an -é form is often an adjective or a noun
        // ("quelqu'un d'organisé", "beaucoup d'invités"): only a verb ending is fixed there.
        if (g.kind === 'preposition' && !['ez', 'ais', 'ait', 'aient'].includes(e.ending)) return;
        this.swap(i, `${verb.infStem}er`, 'aux-participle');
      }
    });
  }

  // ── 6. determiner ↔ plural ───────────────────────────────────────────────

  private pluralOf(word: string): string | null {
    if (!/^\p{L}+$/u.test(word) || NOT_PLURALISED.has(word) || /[sxz]$/.test(word)) return null;
    if (word.endsWith('al') || word.endsWith('ail')) return null;
    if (word.endsWith('eau') || (word.endsWith('eu') && !EU_S_PLURALS.has(word)) || OU_X_PLURALS.has(word)) {
      return `${word}x`;
    }
    return `${word}s`;
  }

  /** "les" is a determiner unless it follows a subject, "ne", or a word taking an infinitive ("je veux les voir"). */
  private lesIsDeterminer(i: number): boolean {
    const p = this.prev(i);
    if (!p) return true;
    if (p.prefix === "n'" || ['ne', 'en'].includes(p.word)) return false;
    // "Mon père les répare", "Paul les aime": a noun subject, so "les" is the object pronoun.
    if (this.markerAt(i - 2) || p.core.charAt(0) !== p.core.charAt(0).toLowerCase()) return false;
    return !SUBJECT_PRONOUNS.has(p.word) && !CLITICS.has(p.word) && !INFINITIVE_TRIGGERS.has(p.word);
  }

  /** A form that may be a verb: "les" and numbers can be pronouns ("je veux les voir", "les deux aiment"). */
  private mayBeVerb(word: string): boolean {
    if (/(?:er|ir|oir|ent|ons|ez|ais|ait)$/.test(word)) return true;
    const present = /^(.+?)(es|e)$/.exec(word);
    if (present && isKnownPresentStem(present[1])) return true;
    return CONSONANT_VERB_PAIRS.some(([a, b]) => a === word || b === word);
  }

  private pluraliseAt(j: number, mayBePronoun: boolean): void {
    const t = this.toks[j];
    if (!t || t.prefix) return;
    if (mayBePronoun && this.mayBeVerb(t.word)) return;
    // A capital mid-sentence is a name.
    if (this.prev(j) && t.core.charAt(0) !== t.core.charAt(0).toLowerCase()) return;
    const plural = this.pluralOf(t.word);
    if (plural) this.swap(j, plural, 'determiner-plural');
  }

  private determinerPlural(): void {
    this.toks.forEach((t, i) => {
      if (t.prefix || t.pauseAfter) return;
      const isLes = t.word === 'les';
      const isNumber = (/^\d+$/.test(t.word) && Number(t.word) >= 2) || PLURAL_NUMBERS.has(t.word);
      if (!isNumber && !PLURAL_DETERMINERS.has(t.word) && !(isLes && this.lesIsDeterminer(i))) return;
      // "le 3 mai", "le 14 juillet": a date, not a plural.
      if (isNumber && this.prev(i)?.lower === 'le') return;
      const first = this.toks[i + 1];
      if (!first) return;
      const mayBePronoun = isLes || isNumber;
      const adjective = PRENOMINAL_ADJECTIVES.has(first.word);
      this.pluraliseAt(i + 1, mayBePronoun);
      if (adjective && !this.toks[i + 1].pauseAfter) this.pluraliseAt(i + 2, mayBePronoun);
    });
  }
}

/** Respells Category A words to their context-consistent spelling. Returns the text and every change made. */
export function respell(text: string): RespellResult {
  const r = new Respeller(text);
  r.run();
  return { text: r.text, changes: [...r.changes].sort((a, b) => a.index - b.index) };
}
