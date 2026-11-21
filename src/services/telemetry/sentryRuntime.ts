/**
 * What the learner's device and browser can do, attached to every Sentry event
 * as tags (searchable) and one `runtime` context (everything else).
 *
 * This app lives or dies on the microphone, speech recognition and a phone's
 * resources, so "which of those did this device have" is the first thing to
 * know about any failure: a Firefox tab with no SpeechRecognition, an Android
 * Trusted Web Activity, a 2 GB phone on a 3G school network, a browser with
 * storage nearly full. Sentry already adds browser / OS / device model.
 *
 * `describeRuntime` is pure over the window it is given, so it is tested with
 * a stub; `watchRuntime` is the only part that touches the SDK.
 */
import * as Sentry from '@sentry/react';

export type DisplayMode = 'browser' | 'standalone' | 'twa' | 'fullscreen' | 'minimal-ui';

export interface RuntimeDescription {
  /** Low-cardinality, searchable in Sentry (`display_mode:twa`). */
  tags: Record<string, string>;
  /** Everything else, shown on the event's Runtime panel. */
  context: Record<string, string | number | boolean | null>;
}

interface NetworkInformationLike {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  addEventListener?: (type: 'change', listener: () => void) => void;
}

type NavigatorLike = Navigator & {
  deviceMemory?: number;
  connection?: NetworkInformationLike;
};

function matches(win: Window, query: string): boolean {
  try {
    return typeof win.matchMedia === 'function' && win.matchMedia(query).matches;
  } catch {
    return false;
  }
}

/** Browser tab, installed PWA, or the Android app (a Trusted Web Activity reports a standalone-like display mode and an android-app:// referrer). */
function displayModeOf(win: Window): DisplayMode {
  if (typeof document !== 'undefined' && document.referrer.startsWith('android-app://')) return 'twa';
  if (matches(win, '(display-mode: standalone)') || (win.navigator as { standalone?: boolean }).standalone === true) return 'standalone';
  if (matches(win, '(display-mode: fullscreen)')) return 'fullscreen';
  if (matches(win, '(display-mode: minimal-ui)')) return 'minimal-ui';
  return 'browser';
}

const yesNo = (v: boolean): string => (v ? 'yes' : 'no');

export function describeRuntime(win: Window & typeof globalThis = window): RuntimeDescription {
  const nav = win.navigator as NavigatorLike;
  const conn = nav.connection;
  const speech = 'SpeechRecognition' in win || 'webkitSpeechRecognition' in win;
  const recorder = typeof (win as { MediaRecorder?: unknown }).MediaRecorder !== 'undefined';
  const getUserMedia = typeof nav.mediaDevices?.getUserMedia === 'function';

  const tags: Record<string, string> = {
    display_mode: displayModeOf(win),
    speech_recognition: yesNo(speech),
    media_recorder: yesNo(recorder),
    mic_api: yesNo(getUserMedia),
    online: yesNo(nav.onLine !== false),
    color_scheme: matches(win, '(prefers-color-scheme: dark)') ? 'dark' : 'light',
    reduced_motion: yesNo(matches(win, '(prefers-reduced-motion: reduce)')),
    touch: yesNo((nav.maxTouchPoints ?? 0) > 0),
    secure_context: yesNo(win.isSecureContext === true),
  };
  if (conn?.effectiveType) tags.connection = conn.effectiveType;
  if (conn?.saveData !== undefined) tags.save_data = yesNo(conn.saveData);
  if (typeof nav.deviceMemory === 'number') tags.device_memory_gb = String(nav.deviceMemory);
  if (typeof nav.hardwareConcurrency === 'number') tags.cpu_cores = String(nav.hardwareConcurrency);
  if (nav.language) tags.language = nav.language;

  let timeZone: string | null = null;
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    timeZone = null;
  }

  return {
    tags,
    context: {
      display_mode: tags.display_mode,
      languages: (nav.languages ?? []).slice(0, 4).join(','),
      time_zone: timeZone,
      viewport: `${win.innerWidth}x${win.innerHeight}`,
      screen: `${win.screen?.width ?? 0}x${win.screen?.height ?? 0}`,
      pixel_ratio: win.devicePixelRatio ?? 1,
      device_memory_gb: nav.deviceMemory ?? null,
      cpu_cores: nav.hardwareConcurrency ?? null,
      connection: conn?.effectiveType ?? null,
      downlink_mbps: conn?.downlink ?? null,
      rtt_ms: conn?.rtt ?? null,
      save_data: conn?.saveData ?? null,
      speech_recognition: speech,
      media_recorder: recorder,
      mic_api: getUserMedia,
      service_worker: 'serviceWorker' in nav,
      service_worker_controlled: !!nav.serviceWorker?.controller,
      notifications: typeof win.Notification !== 'undefined' ? win.Notification.permission : 'unsupported',
    },
  };
}

function apply(description: RuntimeDescription): void {
  Sentry.setTags(description.tags);
  Sentry.setContext('runtime', description.context);
}

/**
 * Describes the runtime now and keeps it current: connectivity flips and
 * network-quality changes update the tags and leave a breadcrumb, and the tab
 * being hidden/shown (a learner leaving mid-answer) is a breadcrumb too. Also
 * adds what only async APIs know — how many microphones exist and how much
 * storage is left — once. Call once, after Sentry.init.
 */
export function watchRuntime(win: Window & typeof globalThis = window): void {
  apply(describeRuntime(win));

  const refresh = () => apply(describeRuntime(win));

  win.addEventListener('online', () => {
    refresh();
    Sentry.addBreadcrumb({ category: 'connectivity', level: 'info', message: 'online' });
  });
  win.addEventListener('offline', () => {
    refresh();
    Sentry.addBreadcrumb({ category: 'connectivity', level: 'warning', message: 'offline' });
  });
  (win.navigator as NavigatorLike).connection?.addEventListener?.('change', () => {
    refresh();
    const c = (win.navigator as NavigatorLike).connection;
    Sentry.addBreadcrumb({
      category: 'connectivity',
      level: 'info',
      message: 'network quality changed',
      data: { effectiveType: c?.effectiveType, downlink: c?.downlink, rtt: c?.rtt },
    });
  });
  win.document.addEventListener('visibilitychange', () => {
    Sentry.addBreadcrumb({ category: 'lifecycle', level: 'info', message: win.document.visibilityState });
  });

  const extra: Record<string, number | string> = {};
  const publish = () => Sentry.setContext('device_capacity', { ...extra });
  const nav = win.navigator;
  void nav.storage?.estimate?.().then((e) => {
    if (typeof e.quota === 'number') extra.storage_quota_mb = Math.round(e.quota / 1_048_576);
    if (typeof e.usage === 'number') extra.storage_used_mb = Math.round(e.usage / 1_048_576);
    publish();
  }).catch(() => undefined);
  void nav.mediaDevices?.enumerateDevices?.().then((devices) => {
    extra.audio_inputs = devices.filter((d) => d.kind === 'audioinput').length;
    extra.audio_outputs = devices.filter((d) => d.kind === 'audiooutput').length;
    publish();
  }).catch(() => undefined);
}
