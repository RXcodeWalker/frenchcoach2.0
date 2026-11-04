import { supabase, supabaseConfigured } from '../../lib/supabase';
import { captureError } from '../telemetry/telemetryService';

/**
 * "Send feedback" — a learner's message to the owner. Written through the
 * Supabase RPC `submit_feedback` (backend migration 20261104090000), which
 * stamps the account from the JWT and rate-limits; guests can send too. The
 * hourly `feedback-notify` workflow emails each new message to the owner.
 */

export type FeedbackKind = 'bug' | 'marking' | 'idea' | 'other';

export const FEEDBACK_MAX_CHARS = 2000;
export const FEEDBACK_MIN_CHARS = 3;

export interface FeedbackInput {
  kind: FeedbackKind;
  message: string;
  /** Where to reply. Optional; a signed-in learner's is prefilled. */
  contactEmail?: string;
  /** The page it was sent from: a pathname only, never a query or hash (auth links carry tokens). */
  route?: string;
}

export type SendFeedbackResult =
  | { ok: true }
  | { ok: false; reason: 'rate_limited' | 'unavailable' | 'failed' };

/** Optional public address shown as the "prefer email?" fallback. Unset = no address shown. */
export function contactEmail(): string | null {
  const value = (import.meta.env.VITE_CONTACT_EMAIL as string | undefined)?.trim();
  return value ? value : null;
}

/** Strips a query string and hash from a path, and caps its length. */
export function safeRoute(path: string | undefined): string | undefined {
  if (!path) return undefined;
  return path.split(/[?#]/)[0].slice(0, 200) || undefined;
}

export function isPlausibleEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export async function sendFeedback(input: FeedbackInput): Promise<SendFeedbackResult> {
  if (!supabaseConfigured) return { ok: false, reason: 'unavailable' };
  const message = input.message.trim().slice(0, FEEDBACK_MAX_CHARS);
  const email = input.contactEmail?.trim();
  try {
    const { error } = await supabase.rpc('submit_feedback', {
      p_kind: input.kind,
      p_message: message,
      p_contact_email: email && isPlausibleEmail(email) ? email : null,
      p_route: safeRoute(input.route) ?? null,
      p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 400) : null,
    });
    if (!error) return { ok: true };
    if (error.message?.includes('feedback_rate_limited')) return { ok: false, reason: 'rate_limited' };
    captureError(error, { area: 'contact', stage: 'submit' });
    return { ok: false, reason: 'failed' };
  } catch (err) {
    captureError(err, { area: 'contact', stage: 'submit' });
    return { ok: false, reason: 'failed' };
  }
}
