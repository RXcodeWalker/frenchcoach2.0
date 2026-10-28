import * as Sentry from '@sentry/react';
import type { AIEngine } from '../../types';
import { setStorageErrorReporter } from '../persistence/storage';
import {
  DENY_URLS,
  IGNORE_ERRORS,
  errorStatus,
  isExpectedFailure,
  isNetworkError,
  resolveSentryEnvironment,
  stripBreadcrumbSecrets,
  stripEventSecrets,
  toReportableError,
} from './sentryFilters';
import { captureAnalyticsEvent, initAnalytics } from './posthogClient';

interface SessionCompletedProps {
  mode: 'practice' | 'exam' | 'story';
  /** null when the session has no real assessed score (e.g. exam scoring failed). */
  score: number | null;
  duration_sec: number;
  xp_gain: number;
  topic_key?: string;
}

interface FeedbackReceivedProps {
  engine: AIEngine;
  fallback_used: boolean;
  /** null when this attempt was never graded (offline fallback) — never a fabricated placeholder. */
  score: number | null;
  latency_ms: number;
  response_tier: number;
}

interface DrillCompletedProps {
  node_id: string;
  immediate_success: number;
  correct: number;
  total: number;
  problem_status: 'active' | 'monitoring' | 'resolved';
}

interface AchievementUnlockedProps {
  achievement_id: string;
  mode: string;
  session_count: number;
}

interface AIFailoverProps {
  requested_engine: AIEngine;
  actual_engine: AIEngine;
  reason: string;
  latency_ms: number;
}

interface FeedbackStreamTimingProps {
  engine: AIEngine;
  ttfb_ms: number;
  ttfc_ms: number;
  total_ms: number;
  sections_streamed: boolean;
}

interface PronunciationAssessedProps {
  source: string;
  provider: 'azure' | 'whisper-heuristic';
  /** null when couldNotAssess is true — never a fabricated number. */
  score: number | null;
  couldNotAssess: boolean;
  latency_ms: number;
  /** 'none' | 'full' — Phase 4 (Shadowing Mode). */
  coaching: 'none' | 'full';
  /** null when coaching === 'none' or the response omitted coachingQuota. */
  coachingGranted: boolean | null;
}

interface PronunciationAssessmentFailedProps {
  source: string;
  reason: string;
}

interface PracticeStepShownProps {
  question_id: string;
}

interface PracticeStepCompletedProps {
  question_id: string;
  outcome: 'pass' | 'retry' | 'advance-no-verdict';
  provider: 'azure' | 'whisper-heuristic' | null;
  attempts: number;
}

interface TranscriptConfirmedProps {
  question_id: string;
  /** The student swapped a word for the other recogniser's reading on the confirm screen. */
  edited?: boolean;
  /** Which recogniser the confirmed text came from: Whisper, or the live captions when Whisper wasn't usable. */
  source?: 'whisper' | 'live-captions';
}

interface TranscriptRerecordedProps {
  question_id: string;
}

interface ReviewItemShownProps {
  question_id: string;
  topic_key: string;
}

interface ReviewItemAnsweredProps {
  question_id: string;
  topic_key: string;
  /** null when this attempt was never graded (offline fallback) — never a fabricated placeholder. */
  score: number | null;
  /** The score that caused the original failure, when known — lets "did the score improve" be computed locally. */
  first_fail_score: number | null;
}

/**
 * Exam-mode pronunciation analysis, Batch 3 (dark — no network call exists
 * yet). One event per candidate speech turn at the end of an exam: how much
 * audio there was and how much remains after silence trimming. Durations only;
 * never audio, never a transcript. This is the data that sizes the Azure
 * allowance ("minutes per exam") before any cap is chosen.
 */
interface ExamPronunciationAudioMeasuredProps {
  session_id: string;
  part: 'rolePlay' | 'topic1' | 'topic2';
  turn_key: number;
  /**
   * 'no_audio': the turn had no recording (denied mic / no MediaRecorder);
   * 'no_speech': a recording exists but nothing cleared the silence gate;
   * 'too_short' / 'too_long': outside the normaliser's accepted range;
   * 'decode_failed': the browser could not decode the recording.
   */
  status: 'measured' | 'no_audio' | 'no_speech' | 'too_short' | 'too_long' | 'decode_failed';
  /** Seconds of recorded audio before trimming; null when unknown. */
  raw_s: number | null;
  /** Seconds that would be uploaded after trimming; null when unknown. */
  trimmed_s: number | null;
}


// ── Product analytics events (PostHog) ───────────────────────────────────────
// Every event and every property is declared here AND in DECLARED_PROPS below;
// track() drops anything else. Properties are ids, enums, counts, durations
// (ms), score numbers, topic keys, booleans and error codes only — never a
// transcript, answer, feedback text, notebook content, prompt, audio or token.

/** No properties. */
type NoProps = Record<string, never>;

export type AuthMethod = 'email' | 'google' | 'azure' | 'other';
export type LandingCta =
  | 'hero_start'
  | 'header_start'
  | 'header_sign_in'
  | 'final_start'
  | 'final_sign_in'
  | 'igcse_page_start'
  | 'roleplay_page_start'
  | 'story_page_start';
export type FeedbackStyle = 'coach' | 'examiner';
export type FailureReason = 'timeout' | '5xx' | 'network' | 'quota' | 'auth' | 'consent' | 'unknown';
export type ExamPartReached = 'roleplay' | 'topic1' | 'topic2';
export type ExamStep = 'greeting' | 'prep' | ExamPartReached | 'review';

interface AppOpenedProps {
  first_visit: boolean;
  /** null on a first visit. */
  days_since_last_visit: number | null;
}

interface LandingCtaClickedProps {
  cta: LandingCta;
}

interface AuthMethodProps {
  method: AuthMethod;
}

interface OnboardingStepViewedProps {
  step: 'exam_board' | 'exam_date' | 'goal_intent';
}

interface OnboardingCompletedProps {
  skipped: boolean;
  /** CoachGoalType (igcse, gcse, delf, conversation_fluency, general_speaking…). */
  goal_type: string;
  learner_track: 'exam' | 'junior';
}

interface PlacementCompletedProps {
  questions_answered: number;
  skipped: boolean;
}

interface AgeBandSetProps {
  age_band: 'under_13' | '13_plus';
}

/** `surface` is the route the gate or notice was shown on (e.g. "/learn"). */
interface SurfaceProps {
  surface: string;
}

interface LearnSessionStartedProps {
  topic_key: string;
  /** Questions in the session. */
  session_length: number;
  filters_used: boolean;
  first_time: boolean;
  style: FeedbackStyle;
}

interface QuestionShownProps {
  topic_key: string;
  /** The question's derived demand level; null for an untagged question. */
  level: 'A1' | 'A2' | 'B1' | 'B2' | null;
  slot: 'warmup' | 'target' | 'review' | 'stretch' | 'choice' | null;
  /** 1-based position in the session. */
  position: number;
}

interface MicPermissionProps {
  result: 'granted' | 'denied' | 'unsupported' | 'error';
}

interface AnswerRecordedProps {
  input: 'speech' | 'text';
  duration_ms: number;
  first_time: boolean;
}

interface TranscriptResultProps {
  source: 'whisper' | 'captions';
  /** no-audio | asr-failed | asr-timeout | asr-rejected | consent | quota; null when Whisper was used. */
  fallback_reason: string | null;
  latency_ms: number;
}

interface FeedbackRequestedProps {
  style: FeedbackStyle;
  is_followup: boolean;
}

interface FeedbackShownProps {
  source: 'ai' | 'offline';
  /** Why the offline evaluator ran; null for AI feedback. */
  offline_reason: 'signed_out' | 'engine_failed' | 'too_short' | 'offline_mode' | null;
  latency_ms: number;
  /** null when the answer was not marked (offline, Examiner style). */
  overall_score: number | null;
  error_count: number | null;
  style: FeedbackStyle;
  first_time: boolean;
}

interface FeedbackFailedProps {
  reason: FailureReason;
  status: number | null;
  style: FeedbackStyle;
}

interface FollowupAnsweredProps {
  style: FeedbackStyle;
}

interface NotebookSavedProps {
  topic_key: string;
}

// Pronunciation Lab (docs/plans/pronunciation-lab.md §8). Counts and enums
// only — never the sentence, a word, a transcript or audio.
interface LabOpenedProps {
  /** Where the Lab was opened from: Learn's practice step, or a Learn answer's "How it sounded" card (Stage 3). */
  entry: 'learn_feedback' | 'how_it_sounded';
}

interface LabTakeProps {
  /** "N of M words clear" for one whole-sentence take. */
  words_clear: number;
  words_total: number;
  /** 1 = the first take of this sentence in this sitting. */
  take_index: number;
}

interface MonthlyCheckDoneProps {
  /** "N of M words clear" over every sentence that could be measured. */
  words_clear: number;
  words_total: number;
  /** How many of the five benchmark sentences were measured. */
  sentences_measured: number;
  /** True for the learner's first saved check. */
  first_check: boolean;
}

interface LabFocusWordUsedProps {
  /** The first drill result for this focus word. */
  verdict: 'clear' | 'almost' | 'tryAgain' | 'unknown';
}

interface LearnSessionCompletedProps {
  topic_key: string;
  questions_answered: number;
  /** null when no answer in the session was marked. */
  avg_score: number | null;
  duration_ms: number;
  /** The learner tapped End (or Back) before the last question. */
  ended_early: boolean;
}

interface LearnSessionAbandonedProps {
  topic_key: string;
  questions_answered: number;
  last_step: 'question' | 'recording' | 'confirm' | 'feedback';
  elapsed_ms: number;
}

interface ExamStartedProps {
  mode: 'sim' | 'coached';
  entry: 'free' | 'daily_challenge' | 'duel';
}

interface ExamPrepFinishedProps {
  early_start: boolean;
}

interface ExamPartReachedProps {
  part: ExamPartReached;
}

interface ExamCompletedProps {
  mode: 'sim' | 'coached';
  /** Cambridge total /40; null when no envelope came back. */
  total_score: number | null;
  /** From the candidate starting the exam to the mark; null after a reload. */
  duration_ms: number | null;
  /** Spoken answers marked from live captions instead of Whisper. */
  asr_fallback_count: number;
  counts_toward_progress: boolean;
}

interface ExamAbandonedProps {
  last_part: ExamStep;
  elapsed_ms: number;
}

interface ExamScoringFailedProps {
  /** Server code (e.g. weekly_exam_limit, judge_unavailable) or a client-side reason. */
  reason: string;
  status: number | null;
}

interface ExamReportViewedProps {
  has_score: boolean;
}

interface QuotaHitProps {
  feature: 'feedback' | 'transcribe' | 'exam_transcribe' | 'pronunciation' | 'exam_score' | 'exam_report' | 'other';
  /** The server's limit code (daily_quota_reached, weekly_exam_limit…) when it sent one. */
  code: string | null;
}

interface ErrorScreenShownProps {
  area: 'app_root';
}

interface WebVitalsProps {
  lcp_ms: number | null;
  inp_ms: number | null;
  /** Unitless layout-shift score. */
  cls: number | null;
}

interface BackendColdStartProps {
  latency_ms: number;
  attempts: number;
  /** False when the warm-up budget ran out with no answer. */
  reached: boolean;
}

export type TelemetryEvent =
  | { name: 'session_completed';       props: SessionCompletedProps }
  | { name: 'feedback_received';       props: FeedbackReceivedProps }
  | { name: 'drill_completed';         props: DrillCompletedProps }
  | { name: 'achievement_unlocked';    props: AchievementUnlockedProps }
  | { name: 'ai_failover';             props: AIFailoverProps }
  | { name: 'feedback_stream_timing';  props: FeedbackStreamTimingProps }
  | { name: 'pronunciation_assessed';           props: PronunciationAssessedProps }
  | { name: 'pronunciation_assessment_failed';  props: PronunciationAssessmentFailedProps }
  | { name: 'practice_step_shown';     props: PracticeStepShownProps }
  | { name: 'practice_step_completed'; props: PracticeStepCompletedProps }
  | { name: 'transcript_confirmed';    props: TranscriptConfirmedProps }
  | { name: 'transcript_rerecorded';   props: TranscriptRerecordedProps }
  | { name: 'review_item_shown';       props: ReviewItemShownProps }
  | { name: 'review_item_answered';    props: ReviewItemAnsweredProps }
  | { name: 'exam_pronunciation_audio_measured'; props: ExamPronunciationAudioMeasuredProps }
  // ── Product analytics (PostHog) ──
  | { name: 'app_opened';              props: AppOpenedProps }
  | { name: 'landing_cta_clicked';     props: LandingCtaClickedProps }
  | { name: 'signup_started';          props: AuthMethodProps }
  | { name: 'signed_up';               props: AuthMethodProps }
  | { name: 'signed_in';               props: AuthMethodProps }
  | { name: 'signed_out';              props: NoProps }
  | { name: 'onboarding_step_viewed';  props: OnboardingStepViewedProps }
  | { name: 'onboarding_completed';    props: OnboardingCompletedProps }
  | { name: 'placement_started';       props: NoProps }
  | { name: 'placement_completed';     props: PlacementCompletedProps }
  | { name: 'age_band_set';            props: AgeBandSetProps }
  | { name: 'consent_blocked';         props: SurfaceProps }
  | { name: 'learn_session_started';   props: LearnSessionStartedProps }
  | { name: 'question_shown';          props: QuestionShownProps }
  | { name: 'mic_permission';          props: MicPermissionProps }
  | { name: 'answer_recorded';         props: AnswerRecordedProps }
  | { name: 'transcript_result';       props: TranscriptResultProps }
  | { name: 'feedback_requested';      props: FeedbackRequestedProps }
  | { name: 'feedback_shown';          props: FeedbackShownProps }
  | { name: 'feedback_failed';         props: FeedbackFailedProps }
  | { name: 'second_take_used';        props: NoProps }
  | { name: 'followup_answered';       props: FollowupAnsweredProps }
  | { name: 'notebook_saved';          props: NotebookSavedProps }
  | { name: 'lab_opened';              props: LabOpenedProps }
  | { name: 'lab_take';                props: LabTakeProps }
  | { name: 'lab_focus_word_used';     props: LabFocusWordUsedProps }
  | { name: 'monthly_check_done';      props: MonthlyCheckDoneProps }
  | { name: 'learn_session_completed'; props: LearnSessionCompletedProps }
  | { name: 'learn_session_abandoned'; props: LearnSessionAbandonedProps }
  | { name: 'exam_started';            props: ExamStartedProps }
  | { name: 'exam_prep_finished';      props: ExamPrepFinishedProps }
  | { name: 'exam_part_reached';       props: ExamPartReachedProps }
  | { name: 'exam_completed';          props: ExamCompletedProps }
  | { name: 'exam_abandoned';          props: ExamAbandonedProps }
  | { name: 'exam_scoring_failed';     props: ExamScoringFailedProps }
  | { name: 'exam_report_viewed';      props: ExamReportViewedProps }
  | { name: 'guest_limit_hit';         props: NoProps }
  | { name: 'quota_hit';               props: QuotaHitProps }
  | { name: 'auth_required_shown';     props: SurfaceProps }
  | { name: 'error_screen_shown';      props: ErrorScreenShownProps }
  | { name: 'progress_viewed';         props: NoProps }
  | { name: 'profile_viewed';          props: NoProps }
  | { name: 'web_vitals';              props: WebVitalsProps }
  | { name: 'backend_cold_start';      props: BackendColdStartProps };

export type TelemetryEventName = TelemetryEvent['name'];
type PropsOf<N extends TelemetryEventName> = Extract<TelemetryEvent, { name: N }>['props'];

/**
 * The property allow-list, one entry per event. TypeScript rejects an
 * undeclared event, a key the event's props don't have, and (via
 * `_allPropsDeclared` below) a declared prop missing from its list — so the
 * union and the runtime filter cannot drift apart.
 */
const DECLARED_PROPS = {
  session_completed: ['mode', 'score', 'duration_sec', 'xp_gain', 'topic_key'],
  feedback_received: ['engine', 'fallback_used', 'score', 'latency_ms', 'response_tier'],
  drill_completed: ['node_id', 'immediate_success', 'correct', 'total', 'problem_status'],
  achievement_unlocked: ['achievement_id', 'mode', 'session_count'],
  ai_failover: ['requested_engine', 'actual_engine', 'reason', 'latency_ms'],
  feedback_stream_timing: ['engine', 'ttfb_ms', 'ttfc_ms', 'total_ms', 'sections_streamed'],
  pronunciation_assessed: ['source', 'provider', 'score', 'couldNotAssess', 'latency_ms', 'coaching', 'coachingGranted'],
  pronunciation_assessment_failed: ['source', 'reason'],
  practice_step_shown: ['question_id'],
  practice_step_completed: ['question_id', 'outcome', 'provider', 'attempts'],
  transcript_confirmed: ['question_id', 'edited', 'source'],
  transcript_rerecorded: ['question_id'],
  review_item_shown: ['question_id', 'topic_key'],
  review_item_answered: ['question_id', 'topic_key', 'score', 'first_fail_score'],
  exam_pronunciation_audio_measured: ['session_id', 'part', 'turn_key', 'status', 'raw_s', 'trimmed_s'],
  app_opened: ['first_visit', 'days_since_last_visit'],
  landing_cta_clicked: ['cta'],
  signup_started: ['method'],
  signed_up: ['method'],
  signed_in: ['method'],
  signed_out: [],
  onboarding_step_viewed: ['step'],
  onboarding_completed: ['skipped', 'goal_type', 'learner_track'],
  placement_started: [],
  placement_completed: ['questions_answered', 'skipped'],
  age_band_set: ['age_band'],
  consent_blocked: ['surface'],
  learn_session_started: ['topic_key', 'session_length', 'filters_used', 'first_time', 'style'],
  question_shown: ['topic_key', 'level', 'slot', 'position'],
  mic_permission: ['result'],
  answer_recorded: ['input', 'duration_ms', 'first_time'],
  transcript_result: ['source', 'fallback_reason', 'latency_ms'],
  feedback_requested: ['style', 'is_followup'],
  feedback_shown: ['source', 'offline_reason', 'latency_ms', 'overall_score', 'error_count', 'style', 'first_time'],
  feedback_failed: ['reason', 'status', 'style'],
  second_take_used: [],
  followup_answered: ['style'],
  notebook_saved: ['topic_key'],
  lab_opened: ['entry'],
  lab_take: ['words_clear', 'words_total', 'take_index'],
  lab_focus_word_used: ['verdict'],
  monthly_check_done: ['words_clear', 'words_total', 'sentences_measured', 'first_check'],
  learn_session_completed: ['topic_key', 'questions_answered', 'avg_score', 'duration_ms', 'ended_early'],
  learn_session_abandoned: ['topic_key', 'questions_answered', 'last_step', 'elapsed_ms'],
  exam_started: ['mode', 'entry'],
  exam_prep_finished: ['early_start'],
  exam_part_reached: ['part'],
  exam_completed: ['mode', 'total_score', 'duration_ms', 'asr_fallback_count', 'counts_toward_progress'],
  exam_abandoned: ['last_part', 'elapsed_ms'],
  exam_scoring_failed: ['reason', 'status'],
  exam_report_viewed: ['has_score'],
  guest_limit_hit: [],
  quota_hit: ['feature', 'code'],
  auth_required_shown: ['surface'],
  error_screen_shown: ['area'],
  progress_viewed: [],
  profile_viewed: [],
  web_vitals: ['lcp_ms', 'inp_ms', 'cls'],
  backend_cold_start: ['latency_ms', 'attempts', 'reached'],
} as const satisfies { [N in TelemetryEventName]: readonly (keyof PropsOf<N> & string)[] };

type UndeclaredProps = {
  // NoProps (an index signature, keyof = string) declares nothing to list.
  [N in TelemetryEventName]: string extends keyof PropsOf<N> ? never : Exclude<keyof PropsOf<N>, (typeof DECLARED_PROPS)[N][number]>;
}[TelemetryEventName];
// Fails to compile when an event's props interface has a key DECLARED_PROPS doesn't list.
const _allPropsDeclared: [UndeclaredProps] extends [never] ? true : never = true;
void _allPropsDeclared;

/**
 * Events kept out of PostHog (they stay Sentry breadcrumbs) to fit the free
 * tier — ~33 events per heavy learner per day, under 1M/month at 1,000 daily
 * learners. question_shown and onboarding_step_viewed go first (owner's rule);
 * the rest repeat what a PostHog event already says: session_completed and
 * feedback_received (feedback_shown, learn_session_completed, exam_completed),
 * pronunciation_assessed (failures still go via pronunciation_assessment_failed),
 * exam_pronunciation_audio_measured (one per exam turn, admin-only feature),
 * lab_take (one per Pronunciation Lab take — up to four a sitting).
 * Remove a name here to send it again.
 */
const BREADCRUMB_ONLY: ReadonlySet<TelemetryEventName> = new Set<TelemetryEventName>([
  'question_shown',
  'onboarding_step_viewed',
  'session_completed',
  'feedback_received',
  'pronunciation_assessed',
  'exam_pronunciation_audio_measured',
  'lab_take',
]);

/** A string property longer than this is dropped (a transcript or answer must never ride along). */
export const MAX_STRING_PROP_LENGTH = 64;

export type AnalyticsProps = Record<string, string | number | boolean | null>;

/**
 * The privacy allow-list every event passes through before it leaves the
 * page: keeps only the keys declared for that event, and only primitive
 * values — a string longer than MAX_STRING_PROP_LENGTH, an object, an array or
 * a non-finite number is dropped.
 */
export function filterEventProps(name: string, props: unknown): AnalyticsProps {
  const allowed: readonly string[] | undefined = (DECLARED_PROPS as Record<string, readonly string[]>)[name];
  const out: AnalyticsProps = {};
  if (!allowed || typeof props !== 'object' || props === null) return out;
  const record = props as Record<string, unknown>;
  for (const key of allowed) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) continue;
    const value = record[key];
    if (value === null || typeof value === 'boolean') out[key] = value;
    else if (typeof value === 'number' && Number.isFinite(value)) out[key] = value;
    else if (typeof value === 'string' && value.length <= MAX_STRING_PROP_LENGTH) out[key] = value;
  }
  return out;
}

/** Event name → the declared keys, for tests and the volume report. */
export function declaredEventNames(): TelemetryEventName[] {
  return Object.keys(DECLARED_PROPS) as TelemetryEventName[];
}

declare const __SENTRY_RELEASE__: string | undefined;
declare const __SENTRY_ENVIRONMENT__: string | undefined;

/** Product areas a captured failure is tagged with — filter on `area` in Sentry. */
export type FailureArea =
  | 'learn_feedback'
  | 'learn_stream'
  | 'examiner_feedback'
  | 'transcription'
  | 'exam_transcription'
  | 'exam_scoring'
  | 'exam_report'
  | 'exam_session'
  | 'pronunciation'
  | 'auth'
  | 'sync'
  | 'storage';

export interface ErrorContext {
  /** Becomes a searchable Sentry tag. */
  area?: FailureArea;
  /** Becomes a tag too: which step inside the area failed. */
  stage?: string;
  /** HTTP status, when the failure was a response. Defaults to the error's own status. */
  status?: number;
  /** Anything else goes into the event's `extra`. */
  [key: string]: unknown;
}

/** At most this many identical failures (same area/stage/message) are sent per page load — protects the free tier from a loop. */
const MAX_SAME_FAILURE_PER_PAGE = 3;
const sentCounts = new Map<string, number>();

function sentryEnabled(): boolean {
  // Prerender (scripts/seo/prerender.ts) and tests import this module under
  // Node: never initialise a browser SDK there.
  return typeof window !== 'undefined' && import.meta.env?.PROD === true && !!import.meta.env?.VITE_SENTRY_DSN;
}

/** The browser SDK options, exported so a test can run them against a recording transport. */
export function sentryBrowserOptions(dsn: string, release: string | undefined, environment: string): Sentry.BrowserOptions {
  return {
    dsn,
    release: release || undefined,
    environment,
    // Free tier: every error, 10% of page-load/navigation traces, no replay, no profiling.
    sampleRate: 1.0,
    tracesSampleRate: 0.1,
    // Traces only for our own same-origin API calls — keeps the sentry-trace
    // header off third-party requests (Supabase, the scoring host, etc.).
    tracePropagationTargets: [/^\/api\//, /^\/health/],
    integrations: [Sentry.browserTracingIntegration()],
    ignoreErrors: IGNORE_ERRORS,
    denyUrls: DENY_URLS,
    beforeSend: (event) => stripEventSecrets(event),
    beforeBreadcrumb: (crumb) => stripBreadcrumbSecrets(crumb),
  };
}

export function initTelemetry(): void {
  if (sentryEnabled()) {
    const env = import.meta.env;
    Sentry.init(
      sentryBrowserOptions(
        env.VITE_SENTRY_DSN as string,
        typeof __SENTRY_RELEASE__ === 'string' ? __SENTRY_RELEASE__ : undefined,
        resolveSentryEnvironment(typeof __SENTRY_ENVIRONMENT__ === 'string' ? __SENTRY_ENVIRONMENT__ : undefined, env.MODE),
      ),
    );
  }

  // Product analytics: a no-op unless this is a production browser build with
  // VITE_POSTHOG_KEY set (see posthogClient.ts).
  initAnalytics(typeof __SENTRY_RELEASE__ === 'string' && __SENTRY_RELEASE__ ? __SENTRY_RELEASE__ : 'dev');

  // Make silent localStorage-write failures (quota exceeded, storage
  // unavailable) visible — otherwise a full analytics blob just stops
  // persisting sessions/streak/XP with no signal (Phase 1.5).
  setStorageErrorReporter((err, context) => {
    captureError(err, { area: 'storage', stage: context.op, store: context.key });
  });
}

/** Options for one event. `beacon`: the page may be unloading (a link away, tab close) — send it now with sendBeacon. */
export interface TrackOptions {
  beacon?: boolean;
}

/**
 * Records one product event: a Sentry breadcrumb (context for the next
 * captured error) and, in production with VITE_POSTHOG_KEY set, a PostHog
 * event (unless BREADCRUMB_ONLY). Both receive only the allow-listed properties (filterEventProps).
 */
export function track(event: TelemetryEvent, options: TrackOptions = {}): void {
  const props = filterEventProps(event.name, event.props);
  if (!import.meta.env.PROD) {
    console.debug('[telemetry]', event.name, props);
    return;
  }
  Sentry.addBreadcrumb({ category: 'product', message: event.name, data: props });
  if (!BREADCRUMB_ONLY.has(event.name)) captureAnalyticsEvent(event.name, props, options.beacon === true);
}

/**
 * The FailureReason for a failed request, for feedback_failed and similar:
 * read from the error's name and HTTP status only — never its message body.
 */
export function failureReason(err: unknown): FailureReason {
  const name = err instanceof Error ? err.name : '';
  const status = errorStatus(err);
  if (name === 'LearnDailyLimitError' || name === 'ExaminerQuotaExceededError' || status === 429) return 'quota';
  if (name === 'ConsentRequiredError') return 'consent';
  if (name === 'AuthRequiredError' || status === 401 || status === 403) return 'auth';
  if (name === 'TranscribeTimeoutError' || name === 'TimeoutError' || (err instanceof Error && /timed out|timeout/i.test(err.message))) return 'timeout';
  if (status !== undefined && status >= 500) return '5xx';
  if (isNetworkError(err)) return 'network';
  return 'unknown';
}

/**
 * Reports a real failure to Sentry, tagged with its `area`/`stage`/`status`.
 * Expected states (guest limit, sign-in needed, consent pending, quota 429,
 * already_generated 409, 422, user cancelled, mic denied — see
 * sentryFilters.ts) are left as a breadcrumb instead, as are network errors
 * while the device is offline.
 */
export function captureError(err: unknown, context: ErrorContext = {}): void {
  const { area, stage, status: explicitStatus, ...extra } = context;
  const status = explicitStatus ?? errorStatus(err);
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (isExpectedFailure(err) || (offline && isNetworkError(err))) {
    Sentry.addBreadcrumb({
      category: 'expected-failure',
      level: 'info',
      message: `${area ?? 'unknown'}${stage ? `/${stage}` : ''}: ${err instanceof Error ? err.name : typeof err}`,
      data: status !== undefined ? { status } : undefined,
    });
    return;
  }

  const error = toReportableError(err);
  const fingerprintKey = `${area}|${stage}|${error.name}|${error.message}`;
  const sent = sentCounts.get(fingerprintKey) ?? 0;
  if (sent >= MAX_SAME_FAILURE_PER_PAGE) return;
  sentCounts.set(fingerprintKey, sent + 1);

  const tags: Record<string, string> = {};
  if (area) tags.area = area;
  if (stage) tags.stage = stage;
  if (status !== undefined) tags.status = String(status);
  Sentry.captureException(error, {
    tags,
    ...(Object.keys(extra).length > 0 ? { extra } : {}),
  });
}
