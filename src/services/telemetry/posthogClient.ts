/**
 * The PostHog transport behind telemetryService's track(). Nothing else in the
 * app talks to PostHog: screens call track(), and the identity / page-view
 * wiring lives in AnalyticsTracker.tsx.
 *
 * Off unless this is a production browser build with VITE_POSTHOG_KEY set —
 * tests, `npm run dev` and the prerender (scripts/seo/prerender.ts, Node) never
 * load the SDK. posthog-js is loaded with a dynamic import, so a build without
 * the key ships none of it in the main bundle; events fired while it loads are
 * queued (bounded) and sent once it is ready.
 *
 * What it collects (school-trial setup, owner decision 2026-11-22):
 *   - every named event from track() (allow-listed ids, enums and counts);
 *   - page views and time on each page ($pageleave);
 *   - behaviour: session replay with ALL text and inputs masked, autocapture
 *     of clicks (no element text), heatmaps, rage and dead clicks — only where
 *     analyticsPolicy.ts allows it (never under-13 / consent-pending / Junior
 *     accounts, never on sign-in, teacher, parent, admin or Junior screens).
 *
 * Still never: exception capture (Sentry owns errors), network payloads or
 * console logs in replays, surveys, flags, and any URL hash or non-UTM query
 * string (auth links carry tokens; the join code in /join/<code> is redacted).
 *
 * Traffic goes through our own origin (`/ingest`, a Vercel rewrite): school web
 * filters and ad blockers drop posthog.com requests, and the SDK's recorder and
 * remote config load from the same path.
 */
import * as Sentry from '@sentry/react';
import type { PostHog, PostHogConfig, CaptureResult, Properties } from 'posthog-js';
import {
  AUTOCAPTURE_URL_IGNORELIST,
  behaviourCaptureAllowed,
  isBehaviourEvent,
  redactSecretPath,
  type CaptureLevel,
} from './analyticsPolicy';

/** Our own origin forwards this path to PostHog (vercel.json rewrites; the service worker never caches it). */
export const INGEST_PROXY_PATH = '/ingest';
/** Where PostHog's app lives — links and the toolbar, when ingestion goes through the proxy. */
const POSTHOG_UI_HOST = 'https://us.posthog.com';
/** Events kept while the SDK loads; anything beyond is dropped rather than held forever. */
const MAX_QUEUED = 100;

/** The slice of the PostHog client this module uses — what a test fake implements. */
export type AnalyticsClient = Pick<
  PostHog,
  'capture' | 'identify' | 'reset' | 'register' | 'setPersonProperties' | 'get_distinct_id' | 'group' | 'set_config'
>;

let client: AnalyticsClient | null = null;
let ingestHost: string = INGEST_PROXY_PATH;
let projectKey = '';
/** The super-properties registered so far, mirrored for sendExitEvent. */
const context: Record<string, string | boolean> = {};
let loading = false;
const queue: Array<(c: AnalyticsClient) => void> = [];

export function analyticsEnabled(): boolean {
  return typeof window !== 'undefined' && import.meta.env?.PROD === true && !!import.meta.env?.VITE_POSTHOG_KEY;
}

const URL_KEYS = ['$current_url', '$referrer', '$initial_current_url', '$initial_referrer'];

/**
 * A URL without its hash and without any query parameter except utm_* —
 * Supabase auth/reset links carry tokens in both. Non-URL strings pass through.
 */
export function sanitizeUrl(value: unknown): unknown {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return value;
  try {
    const url = new URL(value);
    url.pathname = redactSecretPath(url.pathname);
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (!key.toLowerCase().startsWith('utm_')) url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return value;
  }
}

function sanitizeUrlProps(props: Properties | undefined): void {
  if (!props) return;
  for (const key of URL_KEYS) {
    if (key in props) props[key] = sanitizeUrl(props[key]);
  }
}

// ── Behaviour capture state ────────────────────────────────────────────────
// What analyticsPolicy.ts decided for this account; replay and the autocapture
// family are on only while behaviourCaptureAllowed(level, route) holds.
let captureLevel: CaptureLevel = 'events_only';
let recordingOn = false;

function currentPathname(): string {
  return typeof window === 'undefined' ? '/' : window.location.pathname;
}

/** Replay follows the account's level and the screen: starts and stops with either changing. */
function syncRecording(): void {
  const allowed = behaviourCaptureAllowed(captureLevel, currentPathname());
  if (allowed === recordingOn) return;
  recordingOn = allowed;
  withClient((c) => c.set_config({ disable_session_recording: !allowed }));
}

/** The account's capture level (analyticsPolicy.captureLevelFor), set once its age band and consent are known. */
export function applyCaptureLevel(level: CaptureLevel): void {
  captureLevel = level;
  syncRecording();
}

/** Call on every route change: a sensitive screen pauses replay, leaving it resumes. */
export function noteAnalyticsRoute(): void {
  syncRecording();
}

/** before_send: strips tokens from every URL the SDK attaches, on the event and on the person. */
export function sanitizeCapture(result: CaptureResult | null): CaptureResult | null {
  if (!result) return result;
  sanitizeUrlProps(result.properties);
  sanitizeUrlProps(result.$set);
  sanitizeUrlProps(result.$set_once);
  return result;
}

/** before_send: clicks, rage/dead clicks and heatmap points leave the page only where behaviour capture is allowed. */
export function gateBehaviour(result: CaptureResult | null): CaptureResult | null {
  if (!result) return result;
  if (isBehaviourEvent(result.event) && !behaviourCaptureAllowed(captureLevel, currentPathname())) return null;
  return result;
}

/**
 * The ingestion host: our own `/ingest` proxy unless VITE_POSTHOG_HOST names a
 * non-PostHog server (self-hosted). A posthog.com value (the old setting) is
 * treated as "use the proxy" so a stale env var can't silently switch it off.
 */
export function resolveIngestHost(envHost: string | undefined): { apiHost: string; uiHost?: string } {
  const raw = (envHost ?? '').trim().replace(/\/+$/, '');
  if (!raw) return { apiHost: INGEST_PROXY_PATH, uiHost: POSTHOG_UI_HOST };
  if (raw.startsWith('/')) return { apiHost: raw, uiHost: POSTHOG_UI_HOST };
  try {
    if (/(^|\.)posthog\.com$/i.test(new URL(raw).hostname)) return { apiHost: INGEST_PROXY_PATH, uiHost: POSTHOG_UI_HOST };
  } catch {
    return { apiHost: INGEST_PROXY_PATH, uiHost: POSTHOG_UI_HOST };
  }
  return { apiHost: raw };
}

/**
 * Attributes autocapture never reads off a clicked element: anything that can
 * hold words the learner or the app wrote (labels, titles, alt text, values).
 * What is left — tag, classes, id, href, role, data-testid, position in the
 * page — says *which control* without saying what it contained.
 */
const AUTOCAPTURE_IGNORED_ATTRIBUTES = [
  'aria-label',
  'aria-description',
  'aria-valuetext',
  'title',
  'alt',
  'placeholder',
  'value',
  'data-text',
  'data-transcript',
];

/** The SDK options, exported so a test can pin the privacy floor. */
export function posthogOptions(host: string, uiHost?: string, showReplayText = false): Partial<PostHogConfig> {
  return {
    api_host: host,
    ...(uiHost ? { ui_host: uiHost } : {}),
    // Clicks only, with no element text and none of the attributes above.
    autocapture: {
      dom_event_allowlist: ['click'],
      capture_copied_text: false,
      url_ignorelist: AUTOCAPTURE_URL_IGNORELIST,
      element_attribute_ignorelist: AUTOCAPTURE_IGNORED_ATTRIBUTES,
    },
    capture_pageview: false, // AnalyticsTracker sends $pageview on each route change
    capture_pageleave: true, // time on each page ($prev_pageview_duration) and how far they scrolled
    capture_dead_clicks: true,
    capture_heatmaps: true,
    rageclick: true,
    capture_exceptions: false, // Sentry owns errors
    capture_performance: false, // web vitals go through track('web_vitals'); no network timing or payloads in replays
    // Replay is started by applyCaptureLevel(), never by the SDK on its own.
    disable_session_recording: true,
    enable_recording_console_log: false,
    session_recording: {
      maskAllInputs: true,
      // Every piece of on-screen text is masked unless the owner flips VITE_POSTHOG_REPLAY_SHOW_TEXT:
      // answers, transcripts, feedback and names are all rendered text.
      ...(showReplayText ? {} : { maskTextSelector: '*' }),
      recordCrossOriginIframes: false,
    },
    disable_surveys: true,
    disable_product_tours: true,
    disable_conversations: true,
    disable_web_experiments: true,
    // The remote config and the recorder are fetched through `/ingest/array` and `/ingest/static` (our own origin).
    disable_external_dependency_loading: false,
    // Replay needs the SDK's remote config (the recorder script, sampling), which it only loads when flags are
    // not fully disabled; feature-flag *evaluation* stays off (the app has its own flags), so nothing is billed as a flag call.
    advanced_disable_flags: false,
    advanced_disable_feature_flags: true,
    advanced_disable_feature_flags_on_first_load: true,
    mask_all_text: true,
    mask_all_element_attributes: false,
    // Guests are a real audience here (Learn without an account): give them a person too.
    person_profiles: 'always',
    persistence: 'localStorage+cookie',
    save_referrer: true,
    before_send: (result) => gateBehaviour(sanitizeCapture(result)),
  };
}

function flush(c: AnalyticsClient): void {
  client = c;
  for (const op of queue.splice(0)) op(c);
}

/** Starts the SDK once. A failed load (an ad blocker) leaves analytics off for this page. */
export function initAnalytics(appVersion: string): void {
  if (client || loading || !analyticsEnabled()) return;
  loading = true;
  const env = import.meta.env;
  const { apiHost, uiHost } = resolveIngestHost(env.VITE_POSTHOG_HOST as string | undefined);
  ingestHost = apiHost;
  projectKey = env.VITE_POSTHOG_KEY as string;
  const showReplayText = env.VITE_POSTHOG_REPLAY_SHOW_TEXT === '1';
  context.app_version = appVersion;
  void import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(projectKey, posthogOptions(apiHost, uiHost, showReplayText));
      posthog.register({ app_version: appVersion });
      // Errors in Sentry carry the PostHog session id, so a failure opens the replay of the minutes before it.
      const tagSession = (id: string | undefined) => {
        if (id) Sentry.setTag('posthog_session_id', id);
      };
      tagSession(posthog.get_session_id());
      posthog.onSessionId((id) => tagSession(id));
      flush(posthog);
      // The account's level may have been decided while the SDK was loading.
      recordingOn = false;
      syncRecording();
    })
    .catch(() => {
      loading = false;
      queue.length = 0;
    });
}

function withClient(op: (c: AnalyticsClient) => void): void {
  if (client) op(client);
  else if (loading && queue.length < MAX_QUEUED) queue.push(op);
}

export function captureAnalyticsEvent(name: string, props: Record<string, unknown>, beacon = false): void {
  if (beacon && client && sendExitEvent(client, name, props)) return;
  withClient((c) => c.capture(name, props));
}

function base64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/**
 * One event sent synchronously with navigator.sendBeacon, for a page that may
 * be unloading (a link away, a closed tab, leaving mid-session). The SDK's
 * own queue can't be trusted there: it gzips asynchronously, and a capture
 * that lands during its pagehide drain is never sent (verified in Chromium).
 * Uses the SDK's own fallback wire format — a base64 `data=` form body, which
 * a cross-origin beacon may carry — under the SDK's distinct id.
 */
function sendExitEvent(c: AnalyticsClient, name: string, props: Record<string, unknown>): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function' || !projectKey) return false;
  try {
    const payload = {
      api_key: projectKey,
      event: name,
      timestamp: new Date().toISOString(),
      properties: {
        ...context,
        ...props,
        token: projectKey,
        distinct_id: c.get_distinct_id(),
        $lib: 'web',
        $current_url: sanitizeUrl(window.location.href),
      },
    };
    const body = new Blob([`data=${encodeURIComponent(base64Utf8(JSON.stringify(payload)))}`], {
      type: 'application/x-www-form-urlencoded',
    });
    return navigator.sendBeacon(`${ingestHost}/e/?compression=base64`, body);
  } catch {
    return false;
  }
}

export function captureAnalyticsPageview(): void {
  withClient((c) => c.capture('$pageview'));
}

/** Links this browser's (possibly anonymous) history to the Supabase user id. Never an email or name. */
export function identifyAnalyticsUser(userId: string): void {
  withClient((c) => c.identify(userId));
}

/** After sign-out: a fresh anonymous id, so the next person on this device isn't merged into the last. */
export function resetAnalyticsUser(): void {
  withClient((c) => c.reset());
}

/** Super-properties sent with every later event (is_guest, route). */
export function registerAnalyticsContext(props: Record<string, string | boolean>): void {
  Object.assign(context, props);
  withClient((c) => c.register(props));
}

/** Puts this person in a group (e.g. their class) so every later event can be broken down by it. */
export function setAnalyticsGroup(type: string, key: string, properties?: Record<string, string | number | boolean>): void {
  withClient((c) => c.group(type, key, properties));
}

export function setAnalyticsPersonProperties(set: Record<string, unknown>, setOnce?: Record<string, unknown>): void {
  withClient((c) => c.setPersonProperties(set, setOnce));
}

/** Tests: swap in a fake client (or null to turn the transport off again). */
export function setAnalyticsClientForTests(fake: AnalyticsClient | null, key = 'phc_test'): void {
  client = fake;
  projectKey = fake ? key : '';
  loading = false;
  queue.length = 0;
  captureLevel = 'events_only';
  recordingOn = false;
}
