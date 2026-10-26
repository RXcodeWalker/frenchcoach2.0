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
 * Privacy floor (never relax): no autocapture, no session recording, no
 * heatmaps or dead-click capture, no extra scripts from PostHog's CDN, and every
 * URL is sent without its hash or non-UTM query string (auth links carry tokens).
 */
import type { PostHog, PostHogConfig, CaptureResult, Properties } from 'posthog-js';

const DEFAULT_HOST = 'https://us.i.posthog.com';
/** Events kept while the SDK loads; anything beyond is dropped rather than held forever. */
const MAX_QUEUED = 100;

/** The slice of the PostHog client this module uses — what a test fake implements. */
export type AnalyticsClient = Pick<PostHog, 'capture' | 'identify' | 'reset' | 'register' | 'setPersonProperties' | 'get_distinct_id'>;

let client: AnalyticsClient | null = null;
let ingestHost = DEFAULT_HOST;
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

/** before_send: strips tokens from every URL the SDK attaches, on the event and on the person. */
export function sanitizeCapture(result: CaptureResult | null): CaptureResult | null {
  if (!result) return result;
  sanitizeUrlProps(result.properties);
  sanitizeUrlProps(result.$set);
  sanitizeUrlProps(result.$set_once);
  return result;
}

/** The SDK options, exported so a test can pin the privacy floor. */
export function posthogOptions(host: string): Partial<PostHogConfig> {
  return {
    api_host: host,
    // Nothing is captured that we didn't name in telemetryService's union.
    autocapture: false,
    capture_pageview: false, // AnalyticsTracker sends $pageview on each route change
    capture_pageleave: false,
    capture_dead_clicks: false,
    capture_heatmaps: false,
    enable_heatmaps: false,
    capture_exceptions: false, // Sentry owns errors
    capture_performance: false, // web vitals go through track('web_vitals')
    rageclick: false,
    disable_session_recording: true,
    disable_surveys: true,
    disable_product_tours: true,
    disable_conversations: true,
    disable_web_experiments: true,
    disable_external_dependency_loading: true,
    advanced_disable_flags: true,
    mask_all_text: true,
    mask_all_element_attributes: true,
    // Guests are a real audience here (Learn without an account): give them a person too.
    person_profiles: 'always',
    persistence: 'localStorage+cookie',
    save_referrer: true,
    before_send: sanitizeCapture,
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
  const host = (env.VITE_POSTHOG_HOST as string | undefined) || DEFAULT_HOST;
  ingestHost = host.replace(/\/+$/, '');
  projectKey = env.VITE_POSTHOG_KEY as string;
  context.app_version = appVersion;
  void import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(projectKey, posthogOptions(host));
      posthog.register({ app_version: appVersion });
      flush(posthog);
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

export function setAnalyticsPersonProperties(set: Record<string, unknown>, setOnce?: Record<string, unknown>): void {
  withClient((c) => c.setPersonProperties(set, setOnce));
}

/** Tests: swap in a fake client (or null to turn the transport off again). */
export function setAnalyticsClientForTests(fake: AnalyticsClient | null, key = 'phc_test'): void {
  client = fake;
  projectKey = fake ? key : '';
  loading = false;
  queue.length = 0;
}
