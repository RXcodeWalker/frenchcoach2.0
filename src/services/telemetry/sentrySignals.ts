/**
 * How a product event (telemetryService's track()) becomes Sentry data, apart
 * from the breadcrumb it always was: a structured **log** line (searchable in
 * Sentry Logs, linked to the trace/replay it happened in) and **metrics** (a
 * counter per event, a distribution per numeric property — latencies, scores,
 * counts).
 *
 * Pure on purpose (no Sentry import): the decisions are unit-tested here and
 * telemetryService only calls the SDK with the result. Everything it is given
 * has already passed the analytics allow-list (`filterEventProps`: declared
 * keys, primitives, strings ≤ 64 chars), so no transcript, answer or token can
 * reach Sentry through this path either.
 */

export type SentryLogLevel = 'info' | 'warn' | 'error';

/** Events that mean something went wrong for the learner, even though the app handled it. */
const ERROR_EVENTS = new Set(['error_screen_shown', 'exam_scoring_failed']);
const WARN_EVENTS = new Set([
  'feedback_failed',
  'ai_failover',
  'pronunciation_assessment_failed',
  'quota_hit',
  'guest_limit_hit',
  'auth_required_shown',
  'consent_blocked',
  'exam_abandoned',
  'learn_session_abandoned',
  'backend_cold_start',
]);

export function logLevelFor(name: string, props: Record<string, unknown>): SentryLogLevel {
  if (ERROR_EVENTS.has(name)) return 'error';
  if (WARN_EVENTS.has(name)) return 'warn';
  if (name === 'mic_permission' && props.result !== 'granted') return 'warn';
  if (name === 'transcript_result' && props.source === 'captions' && props.fallback_reason) return 'warn';
  if (name === 'feedback_shown' && props.source === 'offline') return 'warn';
  return 'info';
}

/**
 * Properties that identify one record rather than describe a kind of event.
 * They stay on the log line (where one-off values are fine) but are never a
 * metric attribute, which would create one time series per value.
 */
const HIGH_CARDINALITY = new Set(['question_id', 'session_id', 'turn_key', 'node_id', 'achievement_id']);

/** Numeric props that are categories (an HTTP status), not measurements. */
const NUMERIC_ATTRIBUTES = new Set(['status', 'position', 'take_index']);

export interface MetricPlan {
  /** The counter's name: one per product event. */
  counter: string;
  /** Low-cardinality dimensions to slice the counter by. */
  attributes: Record<string, string | number | boolean>;
  /** One distribution per numeric measurement on the event. */
  distributions: { name: string; value: number; unit?: string }[];
}

function unitFor(key: string): string | undefined {
  if (key.endsWith('_ms')) return 'millisecond';
  if (key.endsWith('_sec') || key.endsWith('_s')) return 'second';
  return undefined;
}

export function planMetrics(name: string, props: Record<string, string | number | boolean | null>): MetricPlan {
  const attributes: MetricPlan['attributes'] = {};
  const distributions: MetricPlan['distributions'] = [];
  for (const [key, value] of Object.entries(props)) {
    if (value === null) continue;
    if (typeof value === 'number') {
      if (NUMERIC_ATTRIBUTES.has(key)) attributes[key] = value;
      else if (!HIGH_CARDINALITY.has(key)) {
        const unit = unitFor(key);
        distributions.push({ name: `app.${name}.${key}`, value, ...(unit ? { unit } : {}) });
      }
    } else if (!HIGH_CARDINALITY.has(key)) {
      attributes[key] = value;
    }
  }
  return { counter: `app.${name}`, attributes, distributions };
}
