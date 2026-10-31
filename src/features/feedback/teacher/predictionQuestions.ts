import type { QuestionDemands } from '../../../domain/learn/demand/types';
import { findMarker, type MarkerHit } from '../../../services/coaching/diagnosticEngine';
import type { FeedbackPointGroup } from '../components/FeedbackPointList';

/**
 * "Predict your feedback" (Learn feedback Batch 6b; reworked after the owner's
 * report of 2026-10-31): while the feedback is generated, up to three one-tap
 * yes/no self-checks. No AI call.
 *
 *  - Up to two are drawn from what THIS question asks for (`Question.demands`):
 *    the time frame it asks about, a reason when it asks to explain or justify,
 *    a comparison, an opinion. A question that asks for none of these (a plain
 *    describe-in-the-present) gets the two things every IGCSE answer is
 *    rewarded for developing: a reason and linked ideas. These are checked by
 *    the deterministic markers in the answer itself.
 *  - The last asks whether the learner thinks they made a mistake, and is
 *    checked against the fixes the (already filtered) feedback actually lists.
 *
 * Every answered check gets a verdict line when the feedback lands — the
 * learner always learns whether their read of their own answer was right. A
 * marker line quotes what it found, verbatim. When a marker finds nothing the
 * line says "I couldn't spot", never "you didn't": the markers are
 * presence-reliable only, so "not detected" is not "absent".
 *
 * Pure. Predictions are session state: never stored, never a belief input.
 */

export type PredictionCheckId = 'tense' | 'conditional' | 'reason' | 'comparison' | 'opinion' | 'linking' | 'mistakes';
export type PredictionAnswer = 'yes' | 'no';
type Frame = 'past' | 'future';

export interface PredictionCheck {
  id: PredictionCheckId;
  prompt: string;
  /** For `tense`: which time frames the question asks about (never empty). */
  frames?: Frame[];
}

/** Whether the learner's prediction matched. `unsure`: they said yes, and the markers could not confirm it. */
export type PredictionVerdict = 'right' | 'wrong' | 'unsure';

export interface CalibrationLine {
  id: PredictionCheckId;
  answer: PredictionAnswer;
  verdict: PredictionVerdict;
  text: string;
  /** The words found, verbatim from the answer (or the first fix's quote). */
  quote?: string;
}

/** What the filtered feedback says about mistakes, for the `mistakes` check. */
export interface FeedbackFixes {
  /** The quote of each fix the learner is shown, most important first. */
  quotes: readonly string[];
}

/** The fixes the learner is shown, from the display groups (coach or examiner). */
export function fixesFromGroups(groups: readonly FeedbackPointGroup[]): FeedbackFixes {
  return { quotes: groups.flatMap((g) => g.points.flatMap((p) => (p.kind === 'fix' ? [p.quote] : []))) };
}

const MAX_SPECIFIC = 2;

const FRAME_LABEL: Record<Frame, string> = { past: 'the past', future: 'the future' };

type Demands = Pick<QuestionDemands, 'cognitiveDemand' | 'timeFrames'> & Partial<Pick<QuestionDemands, 'structures'>>;

const CHECKS: Record<Exclude<PredictionCheckId, 'tense'>, PredictionCheck> = {
  conditional: { id: 'conditional', prompt: 'Did you say what you would do (« je voudrais », « ce serait »)?' },
  reason: { id: 'reason', prompt: 'Did you explain why, with « parce que » or « car »?' },
  comparison: { id: 'comparison', prompt: 'Did you compare (« plus … que », « mieux »)?' },
  opinion: { id: 'opinion', prompt: 'Did you give your opinion (« à mon avis », « je pense que »)?' },
  linking: { id: 'linking', prompt: 'Did you link your ideas (« de plus », « ensuite », « aussi »)?' },
  mistakes: { id: 'mistakes', prompt: 'Do you think you made a grammar mistake?' },
};

/** What to try next time when a marker found nothing. */
const TRY_NEXT: Record<Exclude<PredictionCheckId, 'mistakes'>, string> = {
  tense: '« c’était … » or « je vais … »',
  conditional: '« je voudrais … » or « ce serait … »',
  reason: '« … parce que c’est … »',
  comparison: '« … plus … que … »',
  opinion: '« à mon avis, … »',
  linking: '« de plus », « ensuite » or « par contre »',
};

const PAST_TRY = '« c’était … » or « j’ai … »';
const FUTURE_TRY = '« je vais … » or « je voudrais … »';

const NOT_FOUND_LABEL: Record<Exclude<PredictionCheckId, 'mistakes' | 'tense'>, string> = {
  conditional: 'a « would » sentence',
  reason: 'a reason',
  comparison: 'a comparison',
  opinion: 'an opinion phrase',
  linking: 'a linking word',
};

function tenseCheck(frames: Frame[]): PredictionCheck {
  const label = frames.length === 2 ? 'the past or the future' : FRAME_LABEL[frames[0]];
  return { id: 'tense', prompt: `Did you talk about ${label}?`, frames };
}

/**
 * The checks to offer: at most two drawn from the question, most specific
 * first, then the mistakes check. A question with no specific demand gets a
 * reason and linking.
 */
export function predictionChecks(demands: Demands | null | undefined): PredictionCheck[] {
  const specific: PredictionCheck[] = [];
  const structures = demands?.structures ?? [];
  const frames = (['past', 'future'] as const).filter((f) => demands?.timeFrames.includes(f));
  if (frames.length > 0) specific.push(tenseCheck(frames));
  if (demands?.timeFrames.includes('conditional') || demands?.cognitiveDemand === 'hypothesize') specific.push(CHECKS.conditional);
  if (demands && (demands.cognitiveDemand === 'explain' || demands.cognitiveDemand === 'justify' || structures.includes('justification'))) {
    specific.push(CHECKS.reason);
  }
  if (demands?.cognitiveDemand === 'compare' || structures.includes('comparison')) specific.push(CHECKS.comparison);
  if (structures.includes('opinion')) specific.push(CHECKS.opinion);
  // Every IGCSE answer is developed with a reason and linked ideas, so they fill the gap.
  for (const filler of [CHECKS.reason, CHECKS.linking]) {
    if (specific.length >= MAX_SPECIFIC) break;
    if (!specific.some((c) => c.id === filler.id)) specific.push(filler);
  }
  return [...specific.slice(0, MAX_SPECIFIC), CHECKS.mistakes];
}

// Linking words beyond the diagnostic engine's `connectors` marker (which only
// holds the B1 ones): the A2 sequencers an IGCSE answer is expected to use.
const LINKING = /(?<![\p{L}'’])(?:d[’']abord|ensuite|puis|de plus|en plus|aussi|par contre|cependant|pourtant|donc|finalement|enfin|en effet|d[’']ailleurs|ainsi|mais)(?![\p{L}])/iu;
const COMPARISON = [
  /(?<![\p{L}])(?:plus|moins|aussi|autant)(?:\s+\S+){1,3}?\s+qu(?:e|[’'])(?![\p{L}])/iu,
  /(?<![\p{L}])(?:mieux|meilleure?s?|pire|par rapport à|comparé à|alors que|tandis que)(?![\p{L}])/iu,
];

function findFirst(transcript: string, patterns: readonly RegExp[]): MarkerHit | null {
  let best: { index: number; quote: string } | null = null;
  for (const re of patterns) {
    const m = re.exec(transcript);
    if (m && (best === null || m.index < best.index)) best = { index: m.index, quote: m[0] };
  }
  return best ? { quote: best.quote.trim() } : null;
}

const quoted = (q: string) => `« ${q} »`;

function markerLine(check: PredictionCheck, answer: PredictionAnswer, transcript: string): CalibrationLine {
  let hit: MarkerHit | null = null;
  let label = '';
  let tryNext = '';
  if (check.id === 'tense') {
    const frames = check.frames ?? [];
    for (const frame of frames) {
      hit = findMarker(transcript, frame);
      if (hit) {
        label = FRAME_LABEL[frame];
        break;
      }
    }
    label ||= frames.length === 2 ? 'the past or the future' : FRAME_LABEL[frames[0] ?? 'past'];
    tryNext = frames.length === 1 ? (frames[0] === 'past' ? PAST_TRY : FUTURE_TRY) : TRY_NEXT.tense;
  } else {
    const id = check.id as keyof typeof NOT_FOUND_LABEL;
    hit =
      id === 'reason'
        ? findMarker(transcript, 'justification')
        : id === 'conditional'
          ? findMarker(transcript, 'conditional')
          : id === 'opinion'
            ? findMarker(transcript, 'opinion')
            : id === 'comparison'
              ? findFirst(transcript, COMPARISON)
              : findFirst(transcript, [LINKING]);
    label = NOT_FOUND_LABEL[id];
    tryNext = TRY_NEXT[id];
  }

  if (hit) {
    const found =
      check.id === 'tense' ? `you talked about ${label}: ${quoted(hit.quote)}` : `here it is: ${quoted(hit.quote)}`;
    return answer === 'yes'
      ? { id: check.id, answer, verdict: 'right', quote: hit.quote, text: `Right, ${found}.` }
      : { id: check.id, answer, verdict: 'wrong', quote: hit.quote, text: `You did better than you thought, ${found}.` };
  }
  const missing = check.id === 'tense' ? `you talking about ${label}` : label;
  return answer === 'yes'
    ? {
        id: check.id,
        answer,
        verdict: 'unsure',
        text: `You thought so, but I couldn't spot ${missing}. Make it unmistakable next time: ${tryNext}.`,
      }
    : {
        id: check.id,
        answer,
        verdict: 'right',
        text: `Agreed, I couldn't spot ${missing} either. Add one next time: ${tryNext}.`,
      };
}

function mistakesLine(answer: PredictionAnswer, fixes: FeedbackFixes): CalibrationLine {
  const n = fixes.quotes.length;
  const first = fixes.quotes[0];
  const count = n === 1 ? 'one thing to fix' : `${n} things to fix`;
  if (n === 0) {
    return answer === 'no'
      ? { id: 'mistakes', answer, verdict: 'right', text: "Spot on: I didn't find a mistake." }
      : { id: 'mistakes', answer, verdict: 'wrong', text: "You were harder on yourself than you needed to be: I didn't find a mistake." };
  }
  return answer === 'yes'
    ? { id: 'mistakes', answer, verdict: 'right', quote: first, text: `Good ear: there's ${count}, starting with ${quoted(first)}.` }
    : {
        id: 'mistakes',
        answer,
        verdict: 'wrong',
        quote: first,
        text: `You thought it was mistake-free, but there's ${count}, starting with ${quoted(first)}. Listen out for it next time.`,
      };
}

/**
 * One verdict line per answered check, in the order the checks were offered.
 * An unanswered check earns nothing.
 */
export function calibrationLines(
  checks: readonly PredictionCheck[],
  answers: Partial<Record<PredictionCheckId, PredictionAnswer>>,
  transcript: string,
  fixes: FeedbackFixes,
): CalibrationLine[] {
  const lines: CalibrationLine[] = [];
  for (const check of checks) {
    const answer = answers[check.id];
    if (!answer) continue;
    lines.push(check.id === 'mistakes' ? mistakesLine(answer, fixes) : markerLine(check, answer, transcript));
  }
  return lines;
}
