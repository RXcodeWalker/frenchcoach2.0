import { track } from './telemetryService';

export type QuotaFeature = 'feedback' | 'transcribe' | 'exam_transcribe' | 'pronunciation' | 'exam_score' | 'exam_report' | 'other';

/** Within this window a repeat 429 for the same feature is the same refusal (a retry, a fallback). */
const DEDUPE_MS = 60_000;
const lastSent = new Map<string, number>();

/** The quota feature a backend path is charged to. */
export function quotaFeatureForPath(path: string): QuotaFeature {
  if (path.startsWith('/api/feedback')) return 'feedback';
  if (path.startsWith('/api/transcribe')) return 'transcribe';
  if (path.startsWith('/api/pronunciation')) return 'pronunciation';
  return 'other';
}

/** The limit code from a 429 body ({detail:{error}} from FastAPI, {error} from the scoring server); never free text. */
export function quotaCodeFromBody(body: string | undefined): string | null {
  if (!body) return null;
  try {
    const parsed = JSON.parse(body) as { error?: unknown; detail?: { error?: unknown } | unknown };
    const detail = parsed.detail as { error?: unknown } | undefined;
    const code = typeof detail?.error === 'string' ? detail.error : parsed.error;
    return typeof code === 'string' && /^[a-z0-9_]{1,48}$/.test(code) ? code : null;
  } catch {
    return null;
  }
}

/** quota_hit for one HTTP response — a no-op unless it was a 429. */
export function trackQuotaHit(status: number, feature: QuotaFeature, code: string | null = null): void {
  if (status !== 429) return;
  const key = `${feature}|${code ?? ''}`;
  const now = Date.now();
  if (now - (lastSent.get(key) ?? -Infinity) < DEDUPE_MS) return;
  lastSent.set(key, now);
  track({ name: 'quota_hit', props: { feature, code } });
}
