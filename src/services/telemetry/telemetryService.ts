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

type TelemetryEvent =
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
  | { name: 'exam_pronunciation_audio_measured'; props: ExamPronunciationAudioMeasuredProps };

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

  // Make silent localStorage-write failures (quota exceeded, storage
  // unavailable) visible — otherwise a full analytics blob just stops
  // persisting sessions/streak/XP with no signal (Phase 1.5).
  setStorageErrorReporter((err, context) => {
    captureError(err, { area: 'storage', stage: context.op, store: context.key });
  });
}

export function track(event: TelemetryEvent): void {
  if (!import.meta.env.PROD) {
    console.debug('[telemetry]', event.name, event.props);
    return;
  }
  Sentry.addBreadcrumb({ category: 'product', message: event.name, data: event.props });
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
