/**
 * Data export & account deletion (Phase 1.6 Part B). Wraps the two
 * SECURITY DEFINER RPCs (export_my_data, delete_my_account) following the
 * .rpc() error-handling shape used across src/services/social/ and
 * shopService.ts: no throw across a raw PostgrestError, map known codes.
 *
 * exportMyData() merges the cloud RPC payload with the local half — the
 * existing analyticsService.exportData() (previously dead code, no caller)
 * and a dump of this identity's own `*::identity` localStorage keys — into
 * one JSON file, then triggers a client-side download. Guest/offline users
 * (no Supabase session) still get a local-only export.
 */

import { supabase, supabaseConfigured } from '../../lib/supabase';
import { exportData as exportLocalAnalytics } from '../analytics/analyticsService';
import { getStorageScope } from '../persistence/storage';

export type AccountErrorCode = 'not_authenticated' | 'network_error' | 'unknown';

export class AccountError extends Error {
  code: AccountErrorCode;
  constructor(code: AccountErrorCode, message: string) {
    super(message);
    this.name = 'AccountError';
    this.code = code;
  }
}

function mapRpcError(message: string): AccountError {
  if (message.includes('not_authenticated') || message.includes('28000')) {
    return new AccountError('not_authenticated', message);
  }
  return new AccountError('unknown', message);
}

/** Every `base::identity` localStorage entry for the current scope, keyed by base. */
function dumpScopedLocalStorage(): Record<string, unknown> {
  const identity = getStorageScope();
  if (identity === null || typeof localStorage === 'undefined') return {};
  const suffix = `::${identity}`;
  const dump: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.endsWith(suffix)) continue;
    const base = key.slice(0, -suffix.length);
    const raw = localStorage.getItem(key);
    if (raw === null) continue;
    try {
      dump[base] = JSON.parse(raw);
    } catch {
      dump[base] = raw;
    }
  }
  return dump;
}

export interface ExportedAccountData {
  exportedAt: string;
  cloud: unknown;
  localAnalytics: unknown;
  localStorage: Record<string, unknown>;
}

/**
 * Builds the full export payload and triggers a browser download of it as
 * a JSON file. Returns the payload too, mainly so tests/callers can inspect
 * it without re-parsing the downloaded file.
 */
export async function exportMyData(): Promise<ExportedAccountData> {
  let cloud: unknown = null;
  if (supabaseConfigured) {
    const { data, error } = await supabase.rpc('export_my_data');
    if (error) throw mapRpcError(error.message);
    cloud = data;
  }

  const payload: ExportedAccountData = {
    exportedAt: new Date().toISOString(),
    cloud,
    localAnalytics: JSON.parse(exportLocalAnalytics()),
    localStorage: dumpScopedLocalStorage(),
  };

  if (typeof document !== 'undefined') {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `francais-ai-export-${payload.exportedAt.slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return payload;
}

/**
 * Erases the caller's cloud account (profiles row + every FK-cascaded child
 * row) via delete_my_account(). Does NOT sign the caller out or remove the
 * auth.users row itself (see the migration's header) — callers must still
 * call signOut() and navigate away.
 */
export async function deleteMyAccount(): Promise<void> {
  if (!supabaseConfigured) throw new AccountError('network_error', 'offline');
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw mapRpcError(error.message);
}
