// ── Turn a lost-marks reason into the coach's sentence and its drill ──────────────
//
// Pure data and wording. The sentence only restates numbers copied from the
// persisted marking (counts, a mark out of its maximum, a category); the drill is
// one of the coach's existing moves, so the outcome log measures it like any other.

import { ERROR_CATEGORY_LABELS, type ErrorCategory } from '../examFeedback/shared/errorCategories';
import type { LossReason, LossReasonCode } from './types';

/** UNVALIDATED. A gap smaller than this (a 14/15 area, one half-credited task) isn't worth a move of its own. */
export const LOSS_MIN_MARKS = 2;

/** Where a reason sends the learner: one of the coach's move kinds, with the Learn setup it opens. */
export interface LossRoute {
  kind: 'role_play' | 'develop_answers' | 'weak_skill';
  /** Learn's grammar-focus chip to open on (`?focus=`), when the drill is a Learn session. */
  focus?: 'past' | 'opinion';
  /** weak_skill only: the coach skill the drill practises. */
  skillId?: string;
}

/**
 * UNVALIDATED mapping (the closed error categories → the coach skill that
 * practises them). A category with no clear drill (verb forms, word order,
 * "other") is deliberately absent: it names a reason but not a route, so the coach
 * moves on to the next reason rather than send you somewhere that won't help.
 */
const CATEGORY_ROUTE: Partial<Record<ErrorCategory, LossRoute>> = {
  tense: { kind: 'weak_skill', skillId: 'tense_past', focus: 'past' },
  auxiliary: { kind: 'weak_skill', skillId: 'etre_avoir', focus: 'past' },
  agreement: { kind: 'weak_skill', skillId: 'gender' },
  gender: { kind: 'weak_skill', skillId: 'gender' },
  preposition: { kind: 'weak_skill', skillId: 'preposition' },
  vocabulary: { kind: 'weak_skill', skillId: 'vocab_range' },
};

/** The drill for a reason, or null when nothing in the app practises it directly. */
export function routeForLoss(reason: LossReason): LossRoute | null {
  switch (reason.code) {
    case 'rp_silent':
    case 'rp_errors_impede':
    case 'rp_partly_communicated':
    case 'rp_below_full':
      return { kind: 'role_play' };
    case 'comm_develop':
    case 'comm_justify':
      return { kind: 'develop_answers', focus: 'opinion' };
    case 'comm_responds':
    case 'comm_relevant':
    case 'comm_below_top':
      return { kind: 'develop_answers' };
    case 'qol_errors':
      return reason.category ? CATEGORY_ROUTE[reason.category] ?? null : null;
    case 'qol_vocabulary':
      return { kind: 'weak_skill', skillId: 'vocab_range' };
    case 'qol_structures':
    case 'qol_fluency':
    case 'qol_below_top':
      return null;
  }
}

/** The biggest routable gap — the coach's "why" for the attempt. Null when nothing is worth a move. */
export function pickTopLoss(reasons: LossReason[]): LossReason | null {
  const order = { rolePlay: 0, communication: 1, qualityOfLanguage: 2 } as const;
  return [...reasons]
    .filter((r) => r.marksBelowMax >= LOSS_MIN_MARKS && routeForLoss(r) !== null)
    .sort((a, b) => b.marksBelowMax - a.marksBelowMax || order[a.area] - order[b.area])[0] ?? null;
}

function tasks(n: number): string {
  return `${n} role-play task${n === 1 ? '' : 's'}`;
}

/** What the report's next step asked for, as a phrase after "the next step was …". */
const NEXT_STEP: Partial<Record<LossReasonCode, string>> = {
  comm_responds: 'to answer each question straight away without it being repeated or rephrased',
  comm_relevant: 'to keep every answer relevant to the question asked',
  comm_develop: 'to develop your ideas and opinions',
  comm_justify: 'to give reasons and explanations for your answers',
  qol_structures: 'to use a wider range of structures',
  qol_vocabulary: 'to use a wider range of vocabulary',
  qol_fluency: 'to speak more fluently and clearly',
};

/** One or two sentences in the coach's voice, grounded in the numbers the results screen showed. */
export function lossSentence(r: LossReason): string {
  switch (r.code) {
    case 'rp_silent':
      return `In your last Exam Sim you said nothing on ${tasks(r.count)}, so ${r.count === 1 ? 'it' : 'they'} earned no marks.`;
    case 'rp_errors_impede':
      return `${cap(tasks(r.count))} in your last Exam Sim earned ${r.mark} of ${r.max} marks because mistakes got in the way of the message.`;
    case 'rp_partly_communicated':
      return `${cap(tasks(r.count))} in your last Exam Sim only partly got the information across, earning ${r.mark} of ${r.max} marks.`;
    case 'rp_below_full':
      return `${cap(tasks(r.count))} in your last Exam Sim earned ${r.mark} of ${r.max} marks.`;
    case 'comm_below_top':
      return `Communication was ${r.mark}/${r.max} in your last Exam Sim.`;
    case 'qol_below_top':
      return `Quality of language was ${r.mark}/${r.max} in your last Exam Sim.`;
    case 'qol_errors': {
      const label = r.category ? ERROR_CATEGORY_LABELS[r.category].toLowerCase() : null;
      return label
        ? `Quality of language was ${r.mark}/${r.max} in your last Exam Sim, and ${r.count} of the ${r.total ?? r.count} mistakes marked were ${label} mistakes.`
        : `Quality of language was ${r.mark}/${r.max} in your last Exam Sim, with ${r.count} mistakes marked.`;
    }
    default: {
      const area = r.area === 'communication' ? 'Communication' : 'Quality of language';
      return `${area} was ${r.mark}/${r.max} in your last Exam Sim, and its next step was ${NEXT_STEP[r.code] ?? 'to say more'}.`;
    }
  }
}

/** What the drill asks of the learner, after the sentence above. */
export function lossAction(r: LossReason): string {
  switch (r.code) {
    case 'rp_silent':
      return 'Even a short, imperfect answer earns something — drilling the cards builds the habit of attempting every task.';
    case 'rp_errors_impede':
      return 'Drilling the role-play cards practises saying each point clearly and simply.';
    case 'rp_partly_communicated':
    case 'rp_below_full':
      return 'Each task wants a full answer to every part — drilling the cards is the fastest fix.';
    case 'comm_develop':
    case 'comm_justify':
      return 'Give an opinion, say why, and add a past or future example.';
    case 'comm_relevant':
      return 'Answer what the question asks first, then add detail.';
    case 'comm_responds':
      return 'Answer the question you hear straight away, then build on it.';
    case 'comm_below_top':
      return 'Those marks come from developed answers: give an opinion, say why, and add a past or future example.';
    default:
      return '';
  }
}

/** A short chip for the coach's evidence row ("2 role-play tasks partly answered"). */
export function lossChip(r: LossReason): string {
  switch (r.code) {
    case 'rp_silent': return `${tasks(r.count)} left silent`;
    case 'rp_errors_impede': return `${tasks(r.count)} with errors in the way`;
    case 'rp_partly_communicated': return `${tasks(r.count)} only partly answered`;
    case 'rp_below_full': return `${tasks(r.count)} below full marks`;
    case 'qol_errors': return r.category ? `Mostly ${ERROR_CATEGORY_LABELS[r.category].toLowerCase()} mistakes` : `${r.count} mistakes marked`;
    default: return r.area === 'communication' ? `Communication ${r.mark}/${r.max}` : `Quality of language ${r.mark}/${r.max}`;
  }
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
