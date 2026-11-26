/**
 * Every learner-facing string of the fluency trainer (fluency-trainer §6).
 *
 * Honesty rules (pinned by `fluencyCopy.test.ts`):
 *  - The trainer measures FLOW (speed and pauses), never French. Only
 *    `FLOW_NOT_A_GRADE` may name a mark or grade, and only to say this isn't one.
 *  - The thresholds are UNVALIDATED, so `UNVALIDATED_NOTE` is on every screen
 *    that shows a number.
 *  - No band, level, target or "good" speed. Nothing here is sourced, so we
 *    compare the learner only with themselves.
 *  - "Less smooth" is said plainly and without blame. The drill works over days.
 */

import type { DrillHeadline } from '../../domain/fluency/drill432';
import type { FlowDirection, FlowMeasure } from '../../domain/fluency/flowMeasures';

export const TRAINER_TITLE = 'Fluency trainer';

export const FLOW_NOT_A_GRADE =
  'This measures flow, not French: your speed and your pauses. It is not a mark, and it can’t tell whether what you said was right.';

export const UNVALIDATED_NOTE =
  'These measures are early estimates. They haven’t been checked against examiners yet, so watch your own trend, not the exact numbers.';

export const NO_AI_NOTE = 'No AI marking, and it uses none of your daily answers.';

export const PRIVACY_NOTE = 'The app measures your recordings on this device and doesn’t keep them. Only the numbers are saved.';

export interface MeasureDisplay {
  label: string;
  unit: string;
  help: string;
  /** Plain words for each direction of change. */
  change: Record<FlowDirection, string>;
  /** Decimal places shown. */
  digits: number;
}

export const MEASURE_DISPLAY: Record<FlowMeasure, MeasureDisplay> = {
  wordsPerMinute: {
    label: 'Speed',
    unit: 'words a minute',
    help: 'Words a minute from your first word to your last, pauses included.',
    change: { smoother: 'faster', same: 'about the same', lessSmooth: 'slower' },
    digits: 0,
  },
  pausesPerMinute: {
    label: 'Pauses',
    unit: 'a minute',
    help: 'Silences of half a second or more, per minute of speaking.',
    change: { smoother: 'fewer pauses', same: 'about the same', lessSmooth: 'more pauses' },
    digits: 1,
  },
  wordsPerRun: {
    label: 'Words between pauses',
    unit: 'words',
    help: 'How many words you say, on average, before you stop.',
    change: { smoother: 'longer runs', same: 'about the same', lessSmooth: 'shorter runs' },
    digits: 1,
  },
  longestPauseS: {
    label: 'Longest pause',
    unit: 's',
    help: 'Your longest silence in the middle of an answer.',
    change: { smoother: 'shorter', same: 'about the same', lessSmooth: 'longer' },
    digits: 1,
  },
};

export function formatMeasure(measure: FlowMeasure, value: number | null): string {
  if (value === null) return '–';
  return value.toFixed(MEASURE_DISPLAY[measure].digits);
}

export const START_DELAY_LABEL = 'Time to start';
export const START_DELAY_HELP = 'How long you took to say your first word after pressing record.';

// ── Fluency view ────────────────────────────────────────────────────────────

export const VIEW_INTRO = 'How smoothly you speak in Learn, from every answer you say out loud.';

export const VIEW_EMPTY_TITLE = 'Nothing measured yet';
export const VIEW_EMPTY =
  'Answer a few Learn questions out loud. Each spoken answer adds a point here. Typed answers and very short ones aren’t measured.';

export function nowCaption(answers: number): string {
  return `Middle value of your last ${answers} spoken ${answers === 1 ? 'answer' : 'answers'}.`;
}

export function trendWaiting(measured: number, needed: number): string {
  const more = Math.max(0, needed - measured);
  return `A trend appears after ${needed} spoken answers. ${more === 1 ? 'One more' : `${more} more`} to go.`;
}

export function trendCaption(answers: number): string {
  return `Your last ${answers} answers compared with the ${answers} before them.`;
}

export const NO_WORDS_HEARD =
  'No words were heard in these answers (your browser’s captions were off or unavailable), so speed can’t be measured. Pauses still are.';

export const CHART_TITLE = 'Speed, answer by answer';
export const CHART_EMPTY = 'Speed needs the words you said, and none were heard in these answers.';

export const TOPICS_TITLE = 'Speed by topic';
export const TOPICS_HELP = 'Topics with at least three spoken answers. Slower isn’t worse French. It shows where the words come less easily.';

export function drillSuggestion(topicLabel: string): string {
  return `You speak most slowly in ${topicLabel}. A 4-3-2 drill there is a good next step.`;
}

// ── The 4-3-2 drill ─────────────────────────────────────────────────────────

export const DRILL_TITLE = '4-3-2 drill';
export const DRILL_CARD_NOTE = 'One answer, three times: 60 s, 45 s, 30 s.';
export const DRILL_INTRO =
  'Say the same answer three times: in 60 seconds, then 45, then 30. Each time the words come more easily, so you can work on saying them without stopping.';

export const PICK_RECENT_TITLE = 'Questions you’ve answered in Learn';
export const PICK_TOPIC_TITLE = 'Or pick a topic';
export const ANOTHER_QUESTION = 'Another question';
export const START_DRILL = 'Start the drill';

export const ROUND_INSTRUCTION: readonly string[] = [
  'Answer the question. Take your time and say everything you want to say.',
  'Same answer again, in 45 seconds. Keep every point. Just say it with fewer stops.',
  'Last time, in 30 seconds. Same points, as smoothly as you can.',
];

export function roundLabel(index: number, total: number): string {
  return `Round ${index + 1} of ${total}`;
}

export const GET_READY = 'Get ready…';
export const RECORD_LABEL = 'Start speaking';
export const STOP_LABEL = 'Stop';
export const MEASURING = 'Measuring…';
export const NEXT_ROUND = 'Next round';
export const SEE_RESULTS = 'See what changed';
export const TRY_AGAIN_ROUND = 'Record this round again';
export const DRILL_AGAIN = 'Same question again';
export const NEW_QUESTION = 'Pick another question';
export const BACK_TO_FLUENCY = 'Back to your fluency';

export const ROUND_NO_SPEECH = 'I didn’t hear any speech in that round. Check the microphone and record it again.';
export const ROUND_TOO_SHORT = 'That was only a few seconds of speech, too short to show your flow. Record the round again and keep talking.';
export const ROUND_UNMEASURED = 'I couldn’t measure that recording. You can record the round again.';
export const ROUND_NO_WORDS = 'Your browser’s captions didn’t catch any words, so only pauses were measured.';
export const NO_STT_NOTE = 'This browser can’t show live captions, so the drill measures pauses only (no speed).';

export const DRILL_HEADLINE: Record<DrillHeadline, string> = {
  smoother: 'Your last round flowed more smoothly than your first.',
  mixed: 'Some things got smoother and some didn’t. That’s a normal first go.',
  same: 'Your flow stayed about the same across the rounds.',
  lessSmooth: 'The shorter rounds were less smooth. That happens under time pressure. The drill works over several days, not in one go.',
  notEnough: 'I couldn’t measure two rounds, so there’s nothing to compare this time.',
};

export function saidMuchLessLine(before: number, after: number): string {
  return `You said much less in the last round (${after} words, down from ${before}). Speed only counts what you said, so next time keep every point and just say it faster.`;
}

export function wordsLine(before: number, after: number): string {
  return `${before} words in the first round, ${after} in the last.`;
}

export function compareCaption(fromLimitS: number, toLimitS: number): string {
  return `Your ${fromLimitS}-second round compared with your ${toLimitS}-second round.`;
}

export const HISTORY_TITLE = 'Your drills';
export const HISTORY_EMPTY = 'No drills yet. Your first one takes about three minutes.';
export const FIRST_TAKE_TITLE = 'Your first take over time';

export function firstTakeLine(direction: FlowDirection, drills: number): string {
  const which = `your last ${drills} drills compared with the ${drills} before`;
  if (direction === 'smoother') return `Your first, unrehearsed round is getting faster (${which}). That’s the progress that carries over to the exam.`;
  if (direction === 'lessSmooth') return `Your first round has been slower lately (${which}). Harder questions can do that. Keep going.`;
  return `Your first round is about the same speed as before (${which}).`;
}

export function firstTakeWaiting(needed: number): string {
  return `After ${needed * 2} drills, this shows whether your first, unrehearsed round is getting smoother.`;
}
