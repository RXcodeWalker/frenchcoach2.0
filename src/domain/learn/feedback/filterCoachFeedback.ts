/**
 * Coach-voice feedback filters (Learn overhaul Batch 4, D9).
 *
 * Runs once, at normalisation (apiClient.ts's normalizeBackendFeedback), so
 * what the learner sees and what reaches belief evidence are the same list: an
 * error dropped here never counts as a failure in evidenceProjection.ts.
 *
 * Reuses the examiner voice's shared helpers (domain/examFeedback/shared/,
 * ADR 0009) and, like them, only ever drops a claim — it never rewrites one.
 * Rules kept, chosen from the Batch 4 fixture evidence (verification-log.md):
 *  - grounding: an error whose quote is not in the transcript is dropped
 *    (isGroundedQuote, the audited scorer's primitive). A quote-less error is
 *    left to the backend's own evidence gate and kept;
 *  - identical correction: the correction is the quote again, so there is no
 *    error to show;
 *  - sound-alike, on a spoken answer only: the quote and its correction differ
 *    only in spelling the learner cannot have said (Learn transcripts are Web
 *    Speech text). Unknown input mode keeps the error;
 *  - strength: best_moment is dropped when a phrase it quotes is not in the
 *    transcript, or overlaps an error this same feedback reports. Each
 *    strengths[] item (learn-prompt-v6) gets the same rule over its quote and
 *    any phrase its why quotes, and is dropped when it has no quote at all;
 *  - opening (Batch 6a): the encouragement opening line must quote the
 *    learner — it is dropped when it quotes nothing, or when a phrase it
 *    quotes fails the strength rule.
 * Rules NOT used for the coach voice: the examiner minimum quote lengths
 * (meetsErrorQuoteMinimum / meetsClaimQuoteMinimum). On the recorded fixtures
 * they would drop 4 of 4 corrections and 2 of 3 strengths — real one-word
 * fixes like « allé » → « je suis allé ».
 */
import { isGroundedQuote, quotesOverlap } from '../../examFeedback/shared/quoteRules';
import { isCorrectionIdentical, shouldDropSpellingOnlyError } from '../../examFeedback/shared/spellingOnly';
import type { FeedbackV2 } from '../../../types';

export type CoachInputMode = 'speech' | 'text';

export type CoachDropRule = 'grounding' | 'identical' | 'sound-alike' | 'strength' | 'opening';

export interface CoachFilterResult {
  feedback: FeedbackV2;
  /** One entry per dropped claim, for logging and tests. */
  dropped: CoachDropRule[];
}

/** Why an error should be dropped, or null to keep it. */
export function coachErrorDropRule(
  quote: string | undefined,
  correction: string | undefined,
  transcript: string,
  inputMode: CoachInputMode | undefined,
): CoachDropRule | null {
  const q = (quote ?? '').trim();
  if (q === '') return null;
  if (!isGroundedQuote(q, transcript)) return 'grounding';
  const c = (correction ?? '').trim();
  if (c === '') return null;
  if (!shouldDropSpellingOnlyError(q, c, inputMode)) return null;
  return isCorrectionIdentical(q, c) ? 'identical' : 'sound-alike';
}

const STRENGTH_QUOTE = /«\s*([^»]+?)\s*»|<<\s*(.+?)\s*>>/g;

/** The phrases a best_moment quotes, in « » (or the prompt's << >> spelling). */
export function strengthQuotes(text: string): string[] {
  return [...text.matchAll(STRENGTH_QUOTE)].map((m) => (m[1] ?? m[2]).trim()).filter(Boolean);
}

type GrammarItem = FeedbackV2['grammar']['critical'][number] & { quote?: string };

export function filterCoachFeedback(
  feedback: FeedbackV2,
  transcript: string,
  inputMode: CoachInputMode | undefined,
): CoachFilterResult {
  if (!transcript.trim()) return { feedback, dropped: [] };
  const dropped: CoachDropRule[] = [];
  const keepError = (quote: string | undefined, correction: string | undefined): boolean => {
    const rule = coachErrorDropRule(quote, correction, transcript, inputMode);
    if (rule) dropped.push(rule);
    return rule === null;
  };

  const issues = feedback.issues?.filter((i) => keepError(i.quote, i.correction));
  const keptIssueIds = new Set((issues ?? []).map((i) => i.id));
  const grammar = {
    critical: (feedback.grammar?.critical ?? []).filter((g: GrammarItem) => keepError(g.quote, g.correction)),
    polish: (feedback.grammar?.polish ?? []).filter((g: GrammarItem) => keepError(g.quote, g.correction)),
  };

  const errorQuotes = [
    ...(issues ?? []).map((i) => i.quote),
    ...[...grammar.critical, ...grammar.polish].map((g: GrammarItem) => g.quote ?? ''),
  ].filter((q) => q.trim() !== '');

  /** A quoted phrase that is in the transcript and praises nothing reported as an error. */
  const praisable = (q: string) =>
    isGroundedQuote(q, transcript) && !errorQuotes.some((e) => quotesOverlap(q, e, transcript));

  let bestMoment = feedback.best_moment;
  if (bestMoment && !strengthQuotes(bestMoment).every(praisable)) {
    dropped.push('strength');
    bestMoment = undefined;
  }

  const strengths = feedback.strengths?.filter((s) => {
    const keep = praisable(s.quote.trim()) && strengthQuotes(s.why).every(praisable);
    if (!keep) dropped.push('strength');
    return keep;
  });

  let encouragement = feedback.encouragement;
  if (encouragement?.trim()) {
    const quotes = strengthQuotes(encouragement);
    if (quotes.length === 0 || !quotes.every(praisable)) {
      dropped.push('opening');
      encouragement = undefined;
    }
  }

  if (dropped.length === 0) return { feedback, dropped };

  return {
    dropped,
    feedback: {
      ...feedback,
      grammar,
      ...(feedback.issues ? { issues } : {}),
      ...(feedback.transcriptAnnotations
        ? {
            transcriptAnnotations: feedback.transcriptAnnotations.filter(
              (s) => !s.issueId || keptIssueIds.has(s.issueId),
            ),
          }
        : {}),
      ...(feedback.topPriorityIssueId && !keptIssueIds.has(feedback.topPriorityIssueId)
        ? { topPriorityIssueId: undefined }
        : {}),
      best_moment: bestMoment,
      ...(feedback.strengths ? { strengths } : {}),
      ...(feedback.encouragement !== undefined ? { encouragement } : {}),
    },
  };
}
