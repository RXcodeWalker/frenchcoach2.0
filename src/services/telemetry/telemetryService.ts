import * as Sentry from '@sentry/react';
import type { AIEngine } from '../../types';

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
  | { name: 'review_item_answered';    props: ReviewItemAnsweredProps };

export function initTelemetry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  Sentry.init({
    dsn,
    enabled: import.meta.env.PROD && !!dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  });
}

export function track(event: TelemetryEvent): void {
  if (!import.meta.env.PROD) {
    console.debug('[telemetry]', event.name, event.props);
    return;
  }
  Sentry.addBreadcrumb({ category: 'product', message: event.name, data: event.props });
}

export function captureError(err: unknown, context?: Record<string, unknown>): void {
  Sentry.captureException(err, context ? { extra: context } : undefined);
}
