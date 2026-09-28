/**
 * Authoring-only pattern lint (D12, 0520 conduct plan Batch 4). Checks one
 * authored set against the *script patterns* the 0520/03 Teacher/Examiner
 * Notes follow (TN pp.16–31) and the audit #13/#14 content problems.
 *
 * Deliberately NOT part of validate.ts: validator errors are fatal at runtime
 * (the loader and server/resolveQuestionSet.ts fall back to the fixture), and
 * these patterns are observed in one exam series, not rules the notes state.
 * A set that is off-pattern but otherwise valid must never be dropped at
 * runtime. Only `scripts/authoring/check.ts` runs this, and fails on its
 * `error`-severity issues; `warning`s are printed, never fatal.
 *
 * Every rule here is deterministic and text-based. The heuristic ones
 * (register-mismatch, yes-no-question, assumed-experience) are warnings
 * because the real check is a human one (content-authoring §16).
 *
 * Imports only types.ts + text/normalize.ts (component-boundary rule, §7).
 */

import { canonicalizeForMatch } from '../../../domain/igcse/text/normalize';
import type { AuthoredContent, AuthoredQuestion, AuthoredTopic } from './types';

export type PatternSeverity = 'error' | 'warning';

export interface PatternIssue {
  code: string;
  severity: PatternSeverity;
  message: string;
  path: string;
}

/** Index of the first question/task that may carry a second part: rp3 / Q3 (TN pp.16–31 pattern). */
const FIRST_TWO_PART_INDEX = 2;
const MIN_ROLEPLAY_TWO_PART = 2;
const MAX_ROLEPLAY_TWO_PART = 3;

/** A closing that "Non merci" or "Oui" fully answers (audit #13). Matched on canonicalized text. */
const TRIVIAL_CLOSING_PHRASES = [
  'autre chose',
  "c'est tout",
  'ce sera tout',
  'rien d\'autre',
  'et avec ceci',
  'ça vous convient',
  'ça te convient',
  'ça vous va',
  'ça te va',
  "c'est bon",
];

/** Keywords that presuppose an experience a 15–16-year-old may not have had (audit #14). Heuristic. */
const ASSUMED_EXPERIENCE_KEYWORDS = [
  "à l'étranger",
  'ton travail',
  'ton job',
  'ton petit boulot',
  'ton stage',
  'déjà travaillé',
  'ton dernier voyage',
  'en avion',
  'ton animal',
  'ton chien',
  'ton chat',
  'ton frère',
  'ta sœur',
  'ton petit ami',
  'ta petite amie',
];

const TU_MARKERS = new Set(['tu', 'ton', 'ta', 'tes', 'te', "t'", 'toi']);
const VOUS_MARKERS = new Set(['vous', 'votre', 'vos']);

/** Question words that make a question open. `que`/`qu'` count only at the start ("Que fais-tu ?"), since mid-sentence `que` is usually a conjunction ("Penses-tu que… ?"). */
const OPEN_QUESTION_WORDS = new Set([
  'quel',
  'quelle',
  'quels',
  'quelles',
  'lequel',
  'laquelle',
  'lesquels',
  'lesquelles',
  'comment',
  'pourquoi',
  'où',
  'quand',
  'combien',
  'quoi',
]);

/**
 * Tokens for marker matching: lowercase, NFC, apostrophes folded to `'` and
 * kept attached to the elided word (`t'appelles` → `t'`, `appelles`), hyphens
 * split (`as-tu` → `as`, `tu`).
 */
function tokens(text: string): string[] {
  return canonicalizeForMatch(text)
    .replace(/'/g, "' ")
    .split(/[^\p{L}']+/u)
    .filter(Boolean);
}

function hasAny(text: string, markers: Set<string>): string | undefined {
  return tokens(text).find((t) => markers.has(t));
}

function isOpenQuestion(text: string): boolean {
  const toks = tokens(text);
  if (toks.length === 0) return false;
  if (toks[0] === 'que' || toks[0] === "qu'") return true;
  // "Qui…", "Avec qui…", "À qui…": qui opening the question, not a relative pronoun.
  if (toks[0] === 'qui' || toks[1] === 'qui') return true;
  return toks.some((t) => OPEN_QUESTION_WORDS.has(t));
}

/** A bare inversion ("Aimes-tu… ?", "Y a-t-il… ?") or an "Est-ce que…" opener. */
function opensAsYesNo(text: string): boolean {
  const c = canonicalizeForMatch(text);
  if (/^est-ce qu/u.test(c)) return true;
  if (/^y a-t-il\b/u.test(c)) return true;
  const first = c.split(' ')[0] ?? '';
  return /^[\p{L}]+(-t)?-(tu|vous|il|elle|on)$/u.test(first);
}

/** "Ne penses-tu pas… ?", "N'as-tu pas… ?", "Est-ce que tu ne… pas ?", "Tu ne trouves pas… ?" (audit #14). */
function isLoadedNegative(text: string): boolean {
  const c = canonicalizeForMatch(text);
  if (/^(ne |n')[\p{L}]+(-t)?-(tu|vous|il|elle|on)\b/u.test(c)) return true;
  if (/^est-ce que (tu|vous) (ne |n')/u.test(c)) return true;
  if (/^(tu|vous) (ne |n')\S+.*\b(pas|jamais)\b/u.test(c) && text.trim().endsWith('?')) return true;
  return false;
}

/** A pure choice: an "X ou Y ?" question (unaccented `ou`, not `où`). */
function isChoice(text: string): boolean {
  return tokens(text).includes('ou');
}

interface TextRef {
  path: string;
  text: string;
}

function questionTexts(q: AuthoredQuestion, path: string): TextRef[] {
  const refs: TextRef[] = [{ path: `${path}.mainText`, text: q.mainText }];
  if (q.secondPartText) refs.push({ path: `${path}.secondPartText`, text: q.secondPartText });
  q.alternativeTexts.forEach((alt, i) => refs.push({ path: `${path}.alternativeTexts[${i}]`, text: alt }));
  return refs;
}

function topicTexts(topic: AuthoredTopic, topicPath: string): TextRef[] {
  return [
    ...topic.questions.flatMap((q, i) => questionTexts(q, `${topicPath}.questions[${i}]`)),
    { path: `${topicPath}.furtherQuestions[0]`, text: topic.furtherQuestions[0] },
    { path: `${topicPath}.furtherQuestions[1]`, text: topic.furtherQuestions[1] },
  ];
}

function lintRolePlay(content: AuthoredContent, issues: PatternIssue[]): void {
  const { rolePlay } = content;

  // two-part-position: never on rp1–rp2.
  rolePlay.tasks.forEach((task, i) => {
    if (i < FIRST_TWO_PART_INDEX && task.partsExpected === 2) {
      issues.push({
        code: 'two-part-position',
        severity: 'error',
        message: `rp${i + 1} is two-part; second parts belong on rp3–rp5 only (TN pp.16–24 pattern)`,
        path: `rolePlay.tasks[${i}]`,
      });
    }
  });

  // roleplay-two-part-count: 2–3 two-part tasks.
  const twoPart = rolePlay.tasks.filter((t) => t.partsExpected === 2).length;
  if (twoPart < MIN_ROLEPLAY_TWO_PART || twoPart > MAX_ROLEPLAY_TWO_PART) {
    issues.push({
      code: 'roleplay-two-part-count',
      severity: 'error',
      message: `role play has ${twoPart} two-part task(s); the notes' cards have ${MIN_ROLEPLAY_TWO_PART}–${MAX_ROLEPLAY_TWO_PART} (TN pp.16–24 pattern)`,
      path: 'rolePlay.tasks',
    });
  }

  rolePlay.tasks.forEach((task, i) => {
    const path = `rolePlay.tasks[${i}]`;
    // echo-choice: a bare "X ou Y ?" is answerable by repeating one option.
    if (isChoice(task.mainText) && (task.partsExpected === 1 || (task.secondPartText && isChoice(task.secondPartText)))) {
      issues.push({
        code: 'echo-choice',
        severity: 'error',
        message: `${path} is an "X ou Y ?" choice the candidate can answer by repeating a word of the question; add a second part that asks for more, or ask an open question (audit #13)`,
        path,
      });
    }
  });

  // trivial-closing: rp5 must ask for real content.
  const last = rolePlay.tasks[rolePlay.tasks.length - 1];
  if (last) {
    for (const ref of questionTexts(last, `rolePlay.tasks[${rolePlay.tasks.length - 1}]`)) {
      const c = canonicalizeForMatch(ref.text);
      const phrase = TRIVIAL_CLOSING_PHRASES.find((p) => c.includes(canonicalizeForMatch(p)));
      if (phrase) {
        issues.push({
          code: 'trivial-closing',
          severity: 'error',
          message: `${ref.path} is a closing ("${phrase}") that "Non merci" fully answers; the last task must ask for real content (audit #13)`,
          path: ref.path,
        });
      }
    }
  }

  // register-mismatch (warning). The scenario is always read to the candidate
  // in vous, whatever role the examiner then plays (every card in TN pp.16–24);
  // the tasks follow the declared examinerRegister.
  const setupTu = hasAny(rolePlay.setup, TU_MARKERS);
  if (setupTu) {
    issues.push({
      code: 'register-mismatch',
      severity: 'warning',
      message: `rolePlay.setup uses "${setupTu}"; the scenario is always read in vous (TN pp.16–24 pattern)`,
      path: 'rolePlay.setup',
    });
  }
  const rpTexts: TextRef[] = rolePlay.tasks.flatMap((t, i) => questionTexts(t, `rolePlay.tasks[${i}]`));
  const wrongMarkers = rolePlay.examinerRegister === 'vous' ? TU_MARKERS : VOUS_MARKERS;
  for (const ref of rpTexts) {
    const found = hasAny(ref.text, wrongMarkers);
    if (found) {
      issues.push({
        code: 'register-mismatch',
        severity: 'warning',
        message: `${ref.path} uses "${found}" but rolePlay.examinerRegister is "${rolePlay.examinerRegister}"`,
        path: ref.path,
      });
    }
  }
}

function lintTopic(topic: AuthoredTopic, topicPath: 'topic1' | 'topic2', issues: PatternIssue[]): void {
  topic.questions.forEach((q, i) => {
    if (i < FIRST_TWO_PART_INDEX && q.partsExpected === 2) {
      issues.push({
        code: 'two-part-position',
        severity: 'error',
        message: `${topicPath} Q${i + 1} is two-part; Q1–Q2 are single, short questions (TN pp.25–31 pattern)`,
        path: `${topicPath}.questions[${i}]`,
      });
    }
  });

  // q3-q5-time-frames: a past and a future-or-conditional question among Q3–Q5.
  const laterFrames = topic.questions.slice(FIRST_TWO_PART_INDEX).map((q) => q.expectedTimeFrame);
  const hasPast = laterFrames.includes('past');
  const hasForward = laterFrames.includes('future') || laterFrames.includes('conditional');
  if (!hasPast || !hasForward) {
    const missing = [!hasPast ? 'past' : null, !hasForward ? 'future/conditional' : null].filter(Boolean).join(' and ');
    issues.push({
      code: 'q3-q5-time-frames',
      severity: 'error',
      message: `${topicPath} Q3–Q5 have no ${missing} question (TN pp.25–31 pattern)`,
      path: topicPath,
    });
  }

  // register-mismatch (warning): topic questions always use tu.
  for (const ref of topicTexts(topic, topicPath)) {
    const found = hasAny(ref.text, VOUS_MARKERS);
    if (found) {
      issues.push({
        code: 'register-mismatch',
        severity: 'warning',
        message: `${ref.path} uses "${found}"; topic conversations use tu`,
        path: ref.path,
      });
    }
  }

  // yes-no-question (warning): a yes/no opener with no second part.
  topic.questions.forEach((q, i) => {
    if (q.partsExpected === 1 && opensAsYesNo(q.mainText) && !isOpenQuestion(q.mainText)) {
      issues.push({
        code: 'yes-no-question',
        severity: 'warning',
        message: `${topicPath} Q${i + 1} is a bare yes/no question; give it a second part or make it open (audit #14)`,
        path: `${topicPath}.questions[${i}].mainText`,
      });
    }
  });
  topic.furtherQuestions.forEach((fq, i) => {
    if (opensAsYesNo(fq) && !isOpenQuestion(fq)) {
      issues.push({
        code: 'yes-no-question',
        severity: 'warning',
        message: `${topicPath} further question ${i + 1} is a bare yes/no question (audit #14)`,
        path: `${topicPath}.furtherQuestions[${i}]`,
      });
    }
  });

  // assumed-experience (warning): past-tense questions presupposing an experience.
  topic.questions.forEach((q, i) => {
    if (q.expectedTimeFrame !== 'past') return;
    for (const ref of questionTexts(q, `${topicPath}.questions[${i}]`)) {
      const c = canonicalizeForMatch(ref.text);
      const kw = ASSUMED_EXPERIENCE_KEYWORDS.find((k) => c.includes(canonicalizeForMatch(k)));
      if (kw) {
        issues.push({
          code: 'assumed-experience',
          severity: 'warning',
          message: `${ref.path} ("${kw}") may assume an experience a 15–16-year-old hasn't had; offer a way in (audit #14)`,
          path: ref.path,
        });
      }
    }
  });
}

/** Every text in the set, for rules that apply everywhere. */
function allTexts(content: AuthoredContent): TextRef[] {
  return [
    ...content.rolePlay.tasks.flatMap((t, i) => questionTexts(t, `rolePlay.tasks[${i}]`)),
    ...topicTexts(content.topic1, 'topic1'),
    ...topicTexts(content.topic2, 'topic2'),
  ];
}

/** Authoring-only script-pattern lint over one set. Never throws. */
export function lintPatterns(content: AuthoredContent): PatternIssue[] {
  const issues: PatternIssue[] = [];
  lintRolePlay(content, issues);
  lintTopic(content.topic1, 'topic1', issues);
  lintTopic(content.topic2, 'topic2', issues);

  // loaded-negative: a question that leads the answer (audit #14).
  for (const ref of allTexts(content)) {
    if (isLoadedNegative(ref.text)) {
      issues.push({
        code: 'loaded-negative',
        severity: 'error',
        message: `${ref.path} is a loaded negative question that leads the answer (audit #14)`,
        path: ref.path,
      });
    }
  }

  return issues;
}
