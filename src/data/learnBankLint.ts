/**
 * Deterministic lint over the Learn question bank's Learn-only fields
 * (`subTopic`, `coachHint`) and the question wording itself (plan Batch 3).
 * Run by `npm run learn:check`; never at runtime, so a lint finding can never
 * hide a question from a learner.
 *
 * Severity follows patternLint.ts: rules the data contract states are errors
 * (a closed sub-topic list, the shape of a coachHint); heuristic text rules are
 * warnings, because the real check is a human review (content-authoring §16).
 * The yes/no and loaded-negative checks reuse the exam bank's own functions so
 * the two banks cannot drift on what counts as a bare yes/no question.
 *
 * Does not import from src/domain/igcse/ directly; the exam-bank helpers it
 * reuses are pure text predicates.
 */
import type { Question } from '../types';
import { cue, normalizeQuestionText } from '../domain/learn/demand/textCues';
import { isLoadedNegative, isOpenQuestion, opensAsYesNo } from './exam/bank/patternLint';
import { isKnownSubTopic } from './learnSubTopics';

export type BankLintSeverity = 'error' | 'warning';

export interface BankLintIssue {
  code:
    | 'sub-topic-not-in-topic'
    | 'coach-hint-shape'
    | 'coach-hint-restates-question'
    | 'coach-hint-tense-mismatch'
    | 'bare-yes-no-question'
    | 'loaded-negative';
  severity: BankLintSeverity;
  questionId: string;
  message: string;
}

export const COACH_HINT_MIN_IDEAS = 2;
export const COACH_HINT_MAX_IDEAS = 3;
const IDEA_MIN_WORDS = 3;
const IDEA_MAX_CHARS = 120;
/** An idea this close to the legacy `hint` (token Jaccard) is a copy, not a new idea. */
const HINT_COPY_JACCARD = 0.8;
/** A phrase frame this much of the question's own wording is an echo, not a frame. */
const PHRASE_ECHO_MIN_WORDS = 4;

type Frame = 'present' | 'past' | 'future' | 'conditional';

// Cues in the French *phrase frame* (not the question). Deliberately narrow:
// a miss is a warning for a human to confirm, not a block.
const PHRASE_FRAME_CUES: Record<Exclude<Frame, 'present'>, RegExp[]> = {
  past: [
    cue("\\bj'ai\\b|\\bj'avais\\b|\\bj'étais\\b|\\bc'était\\b|\\bil y avait\\b"),
    cue('\\b(on|nous|ils|elles) (a|avons|ont|étions|était)\\b'),
    cue('\\bje suis (allé|allée|resté|restée|parti|partie|venu|venue|né|née|tombé|tombée|rentré|rentrée)\\b'),
    cue('\\bnous sommes (allés|allées|restés|restées|partis|parties|rentrés|rentrées)\\b'),
  ],
  future: [
    cue('\\bje vais\\b|\\bon va\\b|\\bnous allons\\b'),
    cue("\\b(?:je|j'|on|nous|ils)\\s?[\\p{L}]+(?:rai|ras|ra|rons|ront)\\b"),
  ],
  conditional: [
    cue("\\b(?:je|j'|on|nous|ils)\\s?[\\p{L}]+(?:rais|rait|rions|raient)\\b"),
    cue("\\bsi (?:j'|je|on|nous|tu)\\b"),
  ],
};

function phraseCues(fr: string, frame: Exclude<Frame, 'present'>): boolean {
  const text = normalizeQuestionText(fr);
  return PHRASE_FRAME_CUES[frame].some((c) => c.test(text));
}

function tokenSet(text: string): Set<string> {
  return new Set(
    normalizeQuestionText(text)
      .replace(/[^\p{L}\p{N}']+/gu, ' ')
      .split(' ')
      .filter(Boolean),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared += 1;
  return shared / (a.size + b.size - shared);
}

function wordCount(text: string): number {
  return tokenSet(text).size === 0 ? 0 : text.trim().split(/\s+/).length;
}

function lintSubTopic(q: Question, out: BankLintIssue[]): void {
  if (q.subTopic === undefined) return;
  if (!isKnownSubTopic(q.topicKey, q.subTopic)) {
    out.push({
      code: 'sub-topic-not-in-topic',
      severity: 'error',
      questionId: q.id,
      message: `${q.id}: subTopic "${q.subTopic}" is not in the closed list for topic "${q.topicKey}" (src/data/learnSubTopics.ts)`,
    });
  }
}

function lintCoachHint(q: Question, out: BankLintIssue[]): void {
  const hint = q.coachHint;
  if (hint === undefined) return;
  const shape = (message: string) =>
    out.push({ code: 'coach-hint-shape', severity: 'error', questionId: q.id, message: `${q.id}: coachHint ${message}` });

  const ideas = Array.isArray(hint.ideas) ? hint.ideas : [];
  if (ideas.length < COACH_HINT_MIN_IDEAS || ideas.length > COACH_HINT_MAX_IDEAS) {
    shape(`needs ${COACH_HINT_MIN_IDEAS}–${COACH_HINT_MAX_IDEAS} ideas, has ${ideas.length}`);
  }
  ideas.forEach((idea, i) => {
    if (typeof idea !== 'string' || wordCount(idea) < IDEA_MIN_WORDS) {
      shape(`idea ${i + 1} must be at least ${IDEA_MIN_WORDS} words`);
    } else if (idea.length > IDEA_MAX_CHARS) {
      shape(`idea ${i + 1} is over ${IDEA_MAX_CHARS} characters`);
    }
  });
  const fr = hint.phrase?.fr?.trim() ?? '';
  const en = hint.phrase?.en?.trim() ?? '';
  if (fr === '' || en === '') shape('phrase needs both a French frame (fr) and an English gloss (en)');

  // restates-question (warning): copies the legacy hint or echoes the question.
  const hintTokens = tokenSet(q.hint);
  for (const idea of ideas) {
    if (typeof idea === 'string' && jaccard(tokenSet(idea), hintTokens) >= HINT_COPY_JACCARD) {
      out.push({
        code: 'coach-hint-restates-question',
        severity: 'warning',
        questionId: q.id,
        message: `${q.id}: coachHint idea "${idea}" copies the legacy hint — give a question-specific idea`,
      });
    }
  }
  const frTokens = tokenSet(fr);
  const questionTokens = tokenSet(q.text);
  if (frTokens.size >= PHRASE_ECHO_MIN_WORDS && frTokens.size > 0) {
    let inQuestion = 0;
    for (const t of frTokens) if (questionTokens.has(t)) inQuestion += 1;
    if (inQuestion / frTokens.size >= HINT_COPY_JACCARD) {
      out.push({
        code: 'coach-hint-restates-question',
        severity: 'warning',
        questionId: q.id,
        message: `${q.id}: coachHint phrase "${fr}" repeats the question's own wording instead of giving a frame to answer with`,
      });
    }
  }

  // tense-mismatch (warning): the frame must be in the tense(s) the question demands.
  const frames = q.demands?.timeFrames;
  if (frames && fr !== '') {
    const wanted = frames.filter((f): f is Exclude<Frame, 'present'> => f !== 'present');
    if (wanted.length > 0) {
      if (!wanted.some((f) => phraseCues(fr, f))) {
        out.push({
          code: 'coach-hint-tense-mismatch',
          severity: 'warning',
          questionId: q.id,
          message: `${q.id}: coachHint phrase "${fr}" shows no ${wanted.join('/')} cue, but the question is tagged ${frames.join('+')}`,
        });
      }
    } else {
      const stray = (['past', 'future', 'conditional'] as const).find((f) => phraseCues(fr, f));
      if (stray) {
        out.push({
          code: 'coach-hint-tense-mismatch',
          severity: 'warning',
          questionId: q.id,
          message: `${q.id}: coachHint phrase "${fr}" cues ${stray}, but the question is tagged present only`,
        });
      }
    }
  }
}

function lintWording(q: Question, out: BankLintIssue[]): void {
  const text = q.text.trim();
  const questionMarks = (text.match(/\?/g) ?? []).length;
  // A second "?" is a second part ("… ? Pourquoi ?"), which is what makes it open.
  if (questionMarks === 1 && text.endsWith('?') && opensAsYesNo(text) && !isOpenQuestion(text)) {
    out.push({
      code: 'bare-yes-no-question',
      severity: 'warning',
      questionId: q.id,
      message: `${q.id}: bare yes/no question — add a second part or make it open (plan D8)`,
    });
  }
  if (isLoadedNegative(text)) {
    out.push({
      code: 'loaded-negative',
      severity: 'warning',
      questionId: q.id,
      message: `${q.id}: loaded negative question that leads the answer`,
    });
  }
}

/** Lint every question's Learn-only fields and wording. Pure; order follows `questions`. */
export function lintLearnBank(questions: readonly Question[]): BankLintIssue[] {
  const out: BankLintIssue[] = [];
  for (const q of questions) {
    lintSubTopic(q, out);
    lintCoachHint(q, out);
    lintWording(q, out);
  }
  return out;
}
