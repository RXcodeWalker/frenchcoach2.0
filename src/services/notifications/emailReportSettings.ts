// ── Retention loop: weekly progress email settings (docs/systems/retention-notifications.md §4) ──
// Cloud-only (Supabase `email_report_settings`, own row): the weekly report is
// sent by a server job, so the server copy IS the setting. No row = defaults
// (weekly on, no parent copy). The unsubscribe tokens on that row are never
// readable or writable by the client.

import { supabase, supabaseConfigured } from '../../lib/supabase';

export interface EmailReportSettings {
  weeklyReport: boolean;
  parentEmail: string | null;
}

export const DEFAULT_EMAIL_REPORT_SETTINGS: EmailReportSettings = { weeklyReport: true, parentEmail: null };

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Mirrors the table's CHECK; returns the cleaned address or null when invalid. */
export function normaliseParentEmail(raw: string): string | null {
  const v = raw.trim().toLowerCase();
  return v.length > 0 && v.length <= 254 && EMAIL.test(v) ? v : null;
}

export async function loadEmailReportSettings(userId: string): Promise<EmailReportSettings | null> {
  if (!supabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('email_report_settings')
      .select('weekly_report, parent_email')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      console.warn('[emailReportSettings] load failed:', error.message);
      return null;
    }
    if (!data) return DEFAULT_EMAIL_REPORT_SETTINGS;
    return { weeklyReport: data.weekly_report !== false, parentEmail: data.parent_email ?? null };
  } catch (err) {
    console.warn('[emailReportSettings] load error:', err);
    return null;
  }
}

/** Returns whether the save landed, so the UI never shows a setting the server doesn't have. */
export async function saveEmailReportSettings(userId: string, settings: EmailReportSettings): Promise<boolean> {
  if (!supabaseConfigured) return false;
  try {
    const { error } = await supabase.from('email_report_settings').upsert(
      { user_id: userId, weekly_report: settings.weeklyReport, parent_email: settings.parentEmail },
      { onConflict: 'user_id' },
    );
    if (error) {
      console.warn('[emailReportSettings] save failed:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[emailReportSettings] save error:', err);
    return false;
  }
}

export type UnsubscribeResult = 'student' | 'parent' | 'unknown' | 'error';

/** The weekly email's "Stop these emails" link. Works signed out (anon RPC). */
export async function unsubscribeEmailReport(token: string): Promise<UnsubscribeResult> {
  if (!supabaseConfigured) return 'error';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) return 'unknown';
  try {
    const { data, error } = await supabase.rpc('unsubscribe_email_report', { p_token: token });
    if (error) {
      console.warn('[emailReportSettings] unsubscribe failed:', error.message);
      return 'error';
    }
    return data === 'student' || data === 'parent' ? data : 'unknown';
  } catch (err) {
    console.warn('[emailReportSettings] unsubscribe error:', err);
    return 'error';
  }
}
