import * as Sentry from '@sentry/react';
import type { AIEngine } from '../../types';

interface SessionCompletedProps {
  mode: 'practice' | 'exam' | 'story';
  score: number;
  duration_sec: number;
  xp_gain: number;
  topic_key?: string;
}

interface FeedbackReceivedProps {
  engine: AIEngine;
  fallback_used: boolean;
  score: number;
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

type TelemetryEvent =
  | { name: 'session_completed';    props: SessionCompletedProps }
  | { name: 'feedback_received';    props: FeedbackReceivedProps }
  | { name: 'drill_completed';      props: DrillCompletedProps }
  | { name: 'achievement_unlocked'; props: AchievementUnlockedProps }
  | { name: 'ai_failover';          props: AIFailoverProps };

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
